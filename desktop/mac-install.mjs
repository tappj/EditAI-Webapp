import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const exec = promisify(execFile);
const command = async (file, args) =>
  (await exec(file, args, { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }))
    .stdout;

// Only a local mounted EditAI image with this exact app identity/version may
// be offered for cleanup. Never infer an installer from the Downloads folder.
export function installerCandidates(info) {
  return (info.images ?? []).flatMap((image) => {
    const path = image["image-path"];
    if (
      typeof path !== "string" ||
      !isAbsolute(path) ||
      !/^EditAI(?:[- ].*)?\.dmg$/i.test(basename(path))
    )
      return [];
    return (image["system-entities"] ?? []).flatMap((entity) => {
      const mount = entity["mount-point"];
      return typeof mount === "string" &&
        dirname(mount) === "/Volumes" &&
        mount === resolve(mount)
        ? [{ path, mount }]
        : [];
    });
  });
}

export async function findInstaller(version, run = command) {
  const plist = await run("/usr/bin/hdiutil", ["info", "-plist"]);
  // Use stdin, rather than shell interpolation, for the system plist converter.
  const info = await new Promise((done, reject) => {
    const child = execFile(
      "/usr/bin/plutil",
      ["-convert", "json", "-o", "-", "-"],
      { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
      (error, stdout) => (error ? reject(error) : done(stdout)),
    );
    child.stdin.end(plist);
  });
  const matches = [];
  for (const item of installerCandidates(JSON.parse(info))) {
    try {
      const metadata = JSON.parse(
        await run("/usr/bin/plutil", [
          "-convert",
          "json",
          "-o",
          "-",
          join(item.mount, "EditAI.app/Contents/Info.plist"),
        ]),
      );
      if (
        metadata.CFBundleIdentifier === "com.editai.desktop" &&
        metadata.CFBundleShortVersionString === version
      )
        matches.push(item);
    } catch {
      /* Another mounted volume is not an EditAI installer. */
    }
  }
  // Ambiguity is a reason to leave every image alone.
  return matches.length === 1 ? matches[0] : null;
}

export async function prepareMacInstallation({
  app,
  dialog,
  shell,
  platform = process.platform,
  discover = findInstaller,
  run = command,
  read = readFile,
  write = writeFile,
  ensureDirectory = mkdir,
}) {
  if (platform !== "darwin" || !app.isPackaged) return true;
  if (!app.isInApplicationsFolder()) {
    const { response } = await dialog.showMessageBox({
      type: "question",
      title: "Install EditAI",
      message: "Install and open EditAI?",
      detail:
        "EditAI will move to Applications and open automatically. Your existing projects and settings stay in place.",
      buttons: ["Install and Open", "Not Now"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response !== 0) return true;
    try {
      const moved = app.moveToApplicationsFolder({
        conflictHandler: (kind) =>
          dialog.showMessageBoxSync({
            type: "question",
            title: "EditAI is already installed",
            message:
              kind === "existsAndRunning"
                ? "Open your installed EditAI?"
                : "Replace the installed copy of EditAI?",
            detail: "Your projects and account settings will be kept.",
            buttons: [
              "Cancel",
              kind === "existsAndRunning" ? "Open EditAI" : "Replace and Open",
            ],
            defaultId: 1,
            cancelId: 0,
          }) === 1,
      });
      if (moved) return false; // Electron quits and relaunches the installed app.
    } catch {
      /* Permission/copy failures keep the existing install untouched. */
    }
    await dialog.showMessageBox({
      type: "info",
      title: "Finish installing EditAI",
      message: "EditAI wasn’t moved to Applications.",
      detail:
        "You can drag EditAI into Applications, then open it from there. Your projects are safe.",
      buttons: ["OK"],
    });
    return true;
  }

  const marker = join(app.getPath("userData"), "installer-welcome.json");
  try {
    if (JSON.parse(await read(marker, "utf8")).version === app.getVersion())
      return true;
  } catch {}
  const installer = await discover(app.getVersion()).catch(() => null);
  if (!installer) return true;
  const { response, checkboxChecked } = await dialog.showMessageBox({
    type: "info",
    title: "EditAI is installed",
    message: "EditAI is ready in Applications.",
    detail: `You can now eject the installer disk.\n\n${basename(installer.path)}`,
    buttons: ["Eject Installer", "Keep Installer Open"],
    defaultId: 0,
    cancelId: 1,
    checkboxLabel: "Also move the downloaded installer to Trash",
    checkboxChecked: false,
  });
  if (response === 0) {
    try {
      // Recheck the mounted image after the dialog before touching anything.
      const current = await discover(app.getVersion());
      if (
        !current ||
        current.mount !== installer.mount ||
        current.path !== installer.path
      )
        throw Error("Installer changed");
      await run("/usr/bin/hdiutil", ["detach", installer.mount]);
      if (checkboxChecked) await shell.trashItem(installer.path);
    } catch {
      await dialog.showMessageBox({
        type: "info",
        title: "Installer kept",
        message: "The installer couldn’t be fully cleaned up.",
        detail:
          "EditAI is installed and ready. You can eject the disk in Finder and move the downloaded disk image to Trash later.",
        buttons: ["Continue to EditAI"],
      });
    }
  }
  // This is installation UI state only, never an account or onboarding bypass.
  try {
    await ensureDirectory(dirname(marker), { recursive: true });
    await write(marker, JSON.stringify({ version: app.getVersion() }), {
      mode: 0o600,
    });
  } catch {
    /* A read-only preference location must not prevent app startup. */
  }
  return true;
}
