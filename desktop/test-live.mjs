// Real desktop acceptance. This drives the normal gate and real services.
// DNT prevents automated verification from counting as fellowship engagement.
import { _electron as electron, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const app = await electron.launch({
  ...(process.env.EDITAI_EXECUTABLE
    ? { executablePath: process.env.EDITAI_EXECUTABLE, args: [] }
    : { args: ["desktop/dist"] }),
  env: {
    ...process.env,
    PUBLIK_SELF_TEST: "",
    DNT: "1",
    DO_NOT_TRACK: "1",
    PUBLIK_TELEMETRY: "false",
  },
});
const report = { date: new Date().toISOString(), fixtures: false, errors: [] };
app.process().stderr.on("data", (b) => {
  const text = String(b);
  if (/startup failed/i.test(text))
    console.log(
      text.replace(/\b(?:pk_|pbt_|pat_|sk-)[A-Za-z0-9_.-]+/g, "[redacted]"),
    );
});
try {
  const page = await app.firstWindow();
  const testProjects = new Set();
  page.on("request", (request) => {
    if (
      process.env.EDITAI_EXPORT_ONLY &&
      !process.env.EDITAI_RESUME_TEST &&
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/projects"
    ) {
      const body = request.postDataJSON();
      if (body?.title?.includes("synthetic-speech")) testProjects.add(body.id);
    }
  });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  const home = page.getByRole("heading", {
    name: "Upload your raw takes here",
  });
  const signIn = page.getByRole("button", {
    name: "Sign in with publik",
    exact: true,
  });
  const connect = page.getByRole("button", {
    name: /^(Connect your plan|Open studio for free|Use Publik balance)$/,
  });
  const ownKeySetup = page.getByLabel("Own OpenAI API key", { exact: true });
  const welcome = page.getByRole("heading", {
    name: "Who’s behind the camera?",
  });
  await Promise.race([
    home.waitFor(),
    signIn.waitFor(),
    connect.waitFor(),
    ownKeySetup.waitFor(),
    welcome.waitFor(),
  ]);
  if (await welcome.isVisible()) {
    for (let step = 0; step < 5; step++)
      await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page.getByRole("button", { name: "Build my studio" }).click();
    await page.getByRole("button", { name: "Continue to sign in" }).click();
  }
  if (await ownKeySetup.isVisible())
    await page.getByRole("button", { name: "Home", exact: true }).click();
  if (await signIn.isVisible()) {
    await app.evaluate(({ shell }) => {
      const original = shell.openExternal;
      shell.openExternal = (url) => {
        globalThis.__testClaimURL = url;
        return original(url);
      };
    });
    await signIn.click();
    console.log(
      "Desktop claim opened:",
      await app.evaluate(() => globalThis.__testClaimURL),
    );
    await connect.waitFor({ timeout: 180000 });
  }
  if (await connect.isVisible()) await connect.click();
  await expect(home).toBeVisible({ timeout: 30000 });
  report.authentication = true;
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  // Export-only release checks must preserve the person’s AI privacy choice.
  if (!process.env.EDITAI_EXPORT_ONLY)
    await page.getByRole("checkbox", { name: /Allow AI processing/ }).check();
  if (!process.env.EDITAI_EXPORT_ONLY) {
    await page
      .getByRole("checkbox", { name: /Share official usage events/ })
      .uncheck();
    await page
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Preferences saved");
  }
  await page.getByRole("button", { name: "Home", exact: true }).click();
  if (process.env.EDITAI_EXPORT_ONLY && !process.env.EDITAI_RESUME_TEST) {
    await page.getByRole("button", { name: /^Batch edit/ }).click();
    const inputs = page.locator(".batch-box input[type=file]");
    await inputs.nth(0).setInputFiles(resolve("outputs/synthetic-speech.mp4"));
    await inputs.nth(1).setInputFiles(resolve("outputs/synthetic-speech.mp4"));
    await page
      .getByRole("checkbox", { name: /Run AI editing for each project/ })
      .uncheck();
    await page.getByRole("button", { name: /Create 2 projects/ }).click();
    await page
      .locator(".project-card-title")
      .filter({ hasText: "synthetic-speech" })
      .first()
      .click();
  } else if (process.env.EDITAI_RESUME_TEST) {
    await page.getByRole("button", { name: "Edits", exact: true }).click();
    await page
      .locator(".project-card-title")
      .filter({ hasText: "synthetic-speech" })
      .first()
      .click();
  } else
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles(resolve("outputs/synthetic-speech.mp4"));
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible();
  const { archivePath, ...sources } = await app.evaluate(
    ({ app, BrowserWindow }) => ({
      packaged: app.isPackaged,
      archivePath: app.isPackaged ? app.getAppPath() : null,
      version: app.getVersion(),
      sandbox:
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
          .sandbox,
      contextIsolation:
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
          .contextIsolation,
      nodeIntegration:
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
          .nodeIntegration,
      node: process.versions.node,
      electron: process.versions.electron,
      gpu: app.getGPUFeatureStatus(),
    }),
  );
  sources.archiveSha256 = archivePath
    ? createHash("sha256")
        .update(await readFile(archivePath))
        .digest("hex")
    : null;
  report.runtime = sources;
  if (!process.env.EDITAI_RESUME_TEST && !process.env.EDITAI_EXPORT_ONLY)
    await page
      .getByRole("button", { name: "Generate captions", exact: true })
      .click();
  else await page.getByRole("button", { name: "Text", exact: true }).click();
  if (!process.env.EDITAI_EXPORT_ONLY) {
    await page
      .locator(".text-layer-list>button")
      .first()
      .waitFor({ timeout: 240000 });
    report.captions = await page.locator(".text-layer-list>button").count();
    console.log("Desktop real native-audio/Publik captions:", report.captions);
  } else report.captions = "Not exercised; export-only acceptance";
  if (!process.env.EDITAI_RESUME_TEST && !process.env.EDITAI_EXPORT_ONLY) {
    await page.getByRole("button", { name: "EditAI", exact: true }).click();
    await page
      .getByLabel("Message EditAI")
      .fill(
        "Apply the Warm filter to every main clip. Preserve all captions and cuts.",
      );
    const reply = page.waitForResponse(
      (r) => r.url().endsWith("/api/ai/chat"),
      { timeout: 120000 },
    );
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const response = await reply;
    if (!response.ok()) throw Error((await response.json()).error);
    await expect(page.locator(".message.assistant")).toBeVisible();
    report.chat = true;
  } else
    report.chat = process.env.EDITAI_EXPORT_ONLY
      ? "Not exercised; export-only acceptance"
      : "Previously verified; no repeated inference";
  const destination = resolve("outputs/desktop-real-export.mp4");
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
  }, destination);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Export resolution/ })
    .selectOption("854");
  const start = Date.now();
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await Promise.race([
    expect(page.getByRole("status")).toContainText("MP4 exported", {
      timeout: 240000,
    }),
    page
      .getByRole("alert")
      .waitFor({ timeout: 240000 })
      .then(async () => {
        throw Error(await page.getByRole("alert").innerText());
      }),
  ]);
  report.exportSeconds = (Date.now() - start) / 1000;
  report.export = true;
  await page.screenshot({
    path: "outputs/desktop-real-editor.png",
    fullPage: true,
  });
  console.log("Desktop real export passed:", report.exportSeconds, "seconds");
  for (const id of testProjects) {
    const status = await page.evaluate(
      async (id) =>
        (await fetch("/api/projects/" + id, { method: "DELETE" })).status,
      id,
    );
    if (status !== 200)
      throw Error("Could not remove an acceptance-test project.");
  }
  report.testProjectsRemoved = testProjects.size;
  report.aiExercised = !process.env.EDITAI_EXPORT_ONLY;
} catch (error) {
  report.error = error.message;
  console.log("Desktop test:", error.message);
  process.exitCode = 1;
} finally {
  await writeFile(
    "outputs/desktop-live-verification.json",
    JSON.stringify(report, null, 2),
  );
  await app.close();
}
