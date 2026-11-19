import {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  dialog,
  shell,
  session,
  Menu,
} from "electron";
import { autoUpdater } from "electron-updater";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { join, resolve, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { randomBytes, randomUUID } from "node:crypto";
import { LocalStore, LocalBucket } from "./local-store.mjs";
import { NativeVideo } from "./native-video.mjs";
import { readVault, writeVault } from "./vault.mjs";
import * as sdk from "./publik.ts";
import * as webPublik from "../lib/server/publik.ts";
import { createApi } from "../lib/server/api.ts";
import { hash, encrypt } from "../lib/server/security.ts";
import { validate } from "../lib/editor/model.ts";
const sourceRoot = dirname(fileURLToPath(import.meta.url));
const bundledRoot = sourceRoot;
const renderer = join(bundledRoot, "renderer");
const binaries = app.isPackaged
  ? join(process.resourcesPath, "bin")
  : resolve(sourceRoot, "../bin");
const binary = (name) =>
  join(binaries, name + (process.platform === "win32" ? ".exe" : ""));
const appOrigin = "editai://app";
// Desktop credentials must always use the real OS vault, including when a test
// driver injects Chromium's mock-keychain switches.
app.commandLine.removeSwitch("use-mock-keychain");
if (app.commandLine.getSwitchValue("password-store") === "basic")
  app.commandLine.removeSwitch("password-store");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "editai",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
let window,
  store,
  video,
  handler,
  apiCookie = "",
  ready = false,
  screen = null,
  gateResolve;
let lastActivity = Date.now();
const trusted = (event) => {
  if (
    event.sender !== window?.webContents ||
    !event.senderFrame?.url.startsWith(appOrigin + "/")
  )
    throw Error("Untrusted desktop request.");
};
const expose = (name, fn) =>
  ipcMain.handle(name, async (event, ...args) => {
    trusted(event);
    if (!ready) throw Error("Sign in with publik before opening the editor.");
    return fn(...args);
  });
const safeExternal = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      ["publikhq.com", "github.com"].includes(u.hostname) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
};
const gateUI = {
  show(value, signal) {
    screen = value;
    window.webContents.send("gate:screen", value);
    return new Promise((resolve) => {
      gateResolve = resolve;
      signal.addEventListener(
        "abort",
        () => {
          gateResolve = null;
        },
        { once: true },
      );
    });
  },
  openUrl(url) {
    const allowed = safeExternal(url);
    if (allowed) void shell.openExternal(allowed);
  },
};
async function unlockEditor() {
  ready = false;
  await window.loadURL(appOrigin + "/gate.html");
  try {
    const connected = await sdk.ensureSignedIn(gateUI);
    await sdk.flushCredentialStore();
    const vaultFile = join(app.getPath("userData"), "backend.vault.json");
    let state = await readVault(vaultFile);
    if (!state) {
      state = {
        encryptionKey: randomBytes(32).toString("base64"),
        cookie: randomUUID(),
      };
      await writeVault(vaultFile, state);
    }
    apiCookie = "editai_session=" + state.cookie;
    const id = await hash(state.cookie),
      credential = sdk.readCredential();
    const owner = await hash(
      "publik:" + webPublik.walletIdentity(connected.wallet).reference,
    );
    store.database
      .prepare(
        "INSERT INTO sessions (id,install_id,credential,choice,owner,created_at,expires_at,last_event,consent,telemetry) VALUES (?,?,?,?,?,?,?,0,0,1) ON CONFLICT(id) DO UPDATE SET credential=excluded.credential,choice=excluded.choice,expires_at=excluded.expires_at,own_key=CASE WHEN sessions.owner=excluded.owner THEN sessions.own_key ELSE NULL END,consent=CASE WHEN sessions.owner=excluded.owner THEN sessions.consent ELSE 0 END,install_id=excluded.install_id,owner=excluded.owner",
      )
      .run(
        id,
        credential.install_id,
        await encrypt(connected.key, state.encryptionKey),
        connected.choice,
        owner,
        Date.now(),
        Date.now() + 365 * 86400000,
      );
    const preference = store.database
      .prepare("SELECT telemetry FROM sessions WHERE id=?")
      .get(id);
    if (preference?.telemetry === 0) process.env.PUBLIK_TELEMETRY = "false";
    const provider = {
      ...webPublik,
      APP_SLUG: sdk.APP_SLUG,
      provision: async () => ({
        ...sdk.readCredential(),
        browser_install_id: sdk.readCredential().install_id,
      }),
      sendEvent: async () => false,
    };
    handler = createApi(
      {
        DB: store,
        BUCKET: new LocalBucket(join(app.getPath("userData"), "backups")),
        SESSION_ENCRYPTION_KEY: state.encryptionKey,
        PUBLIK_APP_TOKEN: process.env.PUBLIK_APP_TOKEN,
      },
      provider,
    );
    ready = true;
    await window.loadURL(appOrigin + "/");
    window.show();
    window.focus();
  } catch (error) {
    screen = {
      id: "unreachable",
      title: "Sign in with publik",
      body: String(error.message).replace(
        /\b(?:pk_|pbt_|pat_|sk-)[A-Za-z0-9_.-]+/g,
        "[redacted]",
      ),
      buttons: [{ action: "restart", label: "Retry" }],
    };
    window.webContents.send("gate:screen", screen);
  }
}
app.setName("EditAI");
app.setPath("userData", join(app.getPath("appData"), "EditAI Desktop"));
async function startDesktop() {
  try {
    process.env.PUBLIK_APP_TOKEN =
      process.env.PUBLIK_DESKTOP_APP_TOKEN ||
      (await readFile(join(sourceRoot, "publik-app-token.txt"), "utf8")).trim();
  } catch {
    delete process.env.PUBLIK_APP_TOKEN;
  }
  const credentialFile = sdk.credentialPath();
  await sdk.configureCredentialStore(
    () => readVault(credentialFile),
    (value) => writeVault(credentialFile, value),
  );
  if (process.env.PUBLIK_SELF_TEST) {
    await sdk.ensureSignedIn();
    await app.quit();
  } else {
    const migrations = await Promise.all(
      [
        "0000_furry_phil_sheldon.sql",
        "0001_massive_expediter.sql",
        "0002_optimal_the_anarchist.sql",
      ].map((name) => readFile(join(bundledRoot, "migrations", name), "utf8")),
    );
    store = new LocalStore(app.getPath("userData"), migrations);
    if (
      store.database
        .prepare(
          "SELECT telemetry FROM sessions ORDER BY created_at DESC LIMIT 1",
        )
        .get()?.telemetry === 0
    )
      process.env.PUBLIK_TELEMETRY = "false";
    window = new BrowserWindow({
      width: 1440,
      height: 1000,
      minWidth: 900,
      minHeight: 650,
      show: false,
      title: "EditAI",
      webPreferences: {
        preload: join(bundledRoot, "preload.cjs"),
        backgroundThrottling: false,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        partition: "persist:editai",
      },
    });
    window.once("ready-to-show", () => window.show());
    window.webContents.setWindowOpenHandler(({ url }) => {
      const allowed = safeExternal(url);
      if (allowed) void shell.openExternal(allowed);
      return { action: "deny" };
    });
    window.webContents.on("will-navigate", (event, url) => {
      if (![appOrigin + "/", appOrigin + "/gate.html"].includes(url))
        event.preventDefault();
    });
    const ses = window.webContents.session;
    ses.setPermissionRequestHandler((contents, permission, callback) =>
      callback(
        contents === window.webContents &&
          contents.getURL() === appOrigin + "/" &&
          ["media", "clipboard-sanitized-write"].includes(permission),
      ),
    );
    ses.setPermissionCheckHandler(
      (contents, permission) =>
        contents === window.webContents &&
        ["media", "clipboard-sanitized-write"].includes(permission),
    );
    const csp =
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'";
    ses.protocol.handle("editai", async (req) => {
      const url = new URL(req.url);
      if (
        url.host !== "app" ||
        (req.initiatorOrigin && req.initiatorOrigin !== appOrigin)
      )
        return new Response(null, { status: 403 });
      if (url.pathname.startsWith("/api/")) {
        if (!ready)
          return Response.json(
            { error: "Sign in with publik to continue." },
            { status: 401 },
          );
        const headers = new Headers(req.headers);
        headers.set("origin", "https://editai.local");
        headers.set("cookie", apiCookie);
        const mutation =
          ["/api/choice", "/api/settings"].includes(url.pathname) &&
          req.method === "POST"
            ? await req.clone().json()
            : null;
        const local = new Request(
          "https://editai.local" + url.pathname + url.search,
          {
            method: req.method,
            headers,
            ...(!["GET", "HEAD"].includes(req.method)
              ? { body: req.body, duplex: "half" }
              : {}),
          },
        );
        const response = await handler(local);
        const out = new Headers(response.headers);
        out.delete("set-cookie");
        if (
          response.ok &&
          url.pathname === "/api/choice" &&
          req.method === "POST"
        ) {
          const b = mutation;
          sdk.setChoice(b.choice);
          await sdk.flushCredentialStore();
        }
        if (
          response.ok &&
          url.pathname === "/api/settings" &&
          req.method === "POST"
        ) {
          const b = mutation;
          if (b.ownKey) {
            sdk.setChoice("own_key");
            await sdk.flushCredentialStore();
          }
          process.env.PUBLIK_TELEMETRY = b.telemetry ? "true" : "false";
        }
        return new Response(response.body, {
          status: response.status,
          headers: out,
        });
      }
      if (url.pathname.startsWith("/media/")) {
        if (!ready) return new Response(null, { status: 401 });
        try {
          return store.response(url.pathname.split("/").at(-1), req);
        } catch {
          return new Response(null, { status: 404 });
        }
      }
      const file = resolve(
          renderer,
          "." +
            decodeURIComponent(
              url.pathname === "/" ? "/index.html" : url.pathname,
            ),
        ),
        rel = relative(renderer, file);
      if (rel.startsWith("..") || !existsSync(file))
        return new Response(null, { status: 404 });
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ttf": "font/ttf",
        ".bin": "application/octet-stream",
      };
      return new Response(Readable.toWeb(createReadStream(file)), {
        headers: {
          "content-type": types[extname(file)] || "application/octet-stream",
          "content-security-policy": csp,
        },
      });
    });
    video = new NativeVideo({
      ffmpeg: binary("ffmpeg"),
      ffprobe: binary("ffprobe"),
      store,
      chooseDestination: async () => {
        const result = await dialog.showSaveDialog(window, {
          title: "Export video",
          defaultPath: "EditAI video.mp4",
          filters: [{ name: "MP4 video", extensions: ["mp4"] }],
        });
        return result.canceled ? null : result.filePath;
      },
    });
    expose("account:sign-out", async () => {
      ready = false;
      for (const id of video.jobs.keys()) await video.cancel(id);
      sdk.forgetCredential();
      await sdk.flushCredentialStore();
      apiCookie = "";
      handler = null;
      void unlockEditor();
    });
    expose("media:retain", (id, path, type) => store.retain(id, path, type));
    expose("media:write", (id, bytes, type) => store.save(id, bytes, type));
    expose("media:get", (id) => store.media(id));
    expose("media:delete", (ids) => store.remove(ids));
    expose("video:normalize", (bytes) => video.normalize(bytes));
    expose("video:audio", (id, start, length) =>
      video.audio(id, start, length),
    );
    expose("video:begin", (document, w, h, fps) => {
      validate(document);
      return video.begin(document, w, h, fps);
    });
    expose("video:frame", (id, bytes) => video.frame(id, bytes));
    expose("video:finish", (id) => video.finish(id));
    expose("video:cancel", (id) => video.cancel(id));
    ipcMain.handle("gate:ready", (event) => {
      trusted(event);
      return screen;
    });
    ipcMain.handle("gate:action", (event, action) => {
      trusted(event);
      if (action === "restart" && !gateResolve) return unlockEditor();
      if (!screen?.buttons.some((b) => b.action === action))
        throw Error("Invalid gate action.");
      gateResolve?.(action);
      gateResolve = null;
    });
    ipcMain.on("activity", (event) => {
      trusted(event);
      lastActivity = Date.now();
    });
    sdk.setActivityCheck(
      () =>
        !!window &&
        !window.isDestroyed() &&
        window.isVisible() &&
        window.isFocused() &&
        !window.isMinimized() &&
        Date.now() - lastActivity < 1800000,
    );
    configureUpdates();
    await unlockEditor();
  }
}
function configureUpdates() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on("error", () => {
    /* Manual check reports a redacted error. */
  });
  autoUpdater.on("update-downloaded", async () => {
    const { response } = await dialog.showMessageBox(window, {
      type: "info",
      buttons: ["Restart and install", "Later"],
      defaultId: 1,
      message: "An EditAI update is ready.",
      detail: "Save your work before restarting.",
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  const check = async () => {
    try {
      if (!app.isPackaged)
        throw Error("Updates are available in the installed release.");
      const result = await autoUpdater.checkForUpdates();
      if (!result?.isUpdateAvailable) {
        await dialog.showMessageBox(window, {
          message: "EditAI is up to date.",
        });
        return;
      }
      const { response } = await dialog.showMessageBox(window, {
        message: "A new EditAI version is available.",
        buttons: ["Download update", "Later"],
        defaultId: 1,
      });
      if (response === 0) await autoUpdater.downloadUpdate();
    } catch {
      await dialog.showMessageBox(window, {
        type: "info",
        message: "No verified update is available right now.",
        detail: "Try again later. Your current installation is unchanged.",
      });
    }
  };
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      {
        label: "File",
        submenu: [
          { label: "Check for updates…", click: check },
          { type: "separator" },
          { role: process.platform === "darwin" ? "close" : "quit" },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
      {
        role: "help",
        submenu: [
          {
            label: "Third-party licenses",
            click: () => shell.openPath(join(bundledRoot, "notices")),
          },
        ],
      },
    ]),
  );
}
if (!process.env.PUBLIK_SELF_TEST && !app.requestSingleInstanceLock())
  app.exit(0);
app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
});
app
  .whenReady()
  .then(startDesktop)
  .catch((error) => {
    console.error(
      "Desktop startup failed:",
      String(error.message).replace(
        /\b(?:pk_|pbt_|pat_|sk-)[A-Za-z0-9_.-]+/g,
        "[redacted]",
      ),
    );
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
let quitAfterCleanup = false;
app.on("before-quit", (event) => {
  if (quitAfterCleanup || !video?.jobs.size) return;
  event.preventDefault();
  quitAfterCleanup = true;
  Promise.all(
    [...video.jobs.keys()].map((id) => video.cancel(id).catch(() => {})),
  ).finally(() => app.quit());
});
