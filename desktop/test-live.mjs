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
    console.log("Desktop sign-in opened in the official browser window.");
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
    const source = resolve("outputs/synthetic-speech.mp4");
    const sources = process.env.EDITAI_VERIFY_EDITOR_UI
      ? [source, source]
      : source;
    await inputs.nth(0).setInputFiles(sources);
    await inputs.nth(1).setInputFiles(sources);
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
    page.getByRole("button", { name: /^(Split|Split clip at playhead)$/ }),
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
  if (process.env.EDITAI_VERIFY_EDITOR_UI) {
    await expect(
      page.getByRole("button", { name: "Adjust workspace" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filters workspace" }),
    ).toHaveCount(0);
    await expect(page.getByText("Precision trim", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Overlays workspace", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Crop", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("spinbutton", { name: "Volume value", exact: true }),
    ).toHaveValue("100");
    await expect(page.locator(".range-wedge")).toHaveCount(1);
    const volumeBox = await page
      .getByRole("slider", { name: "Volume", exact: true })
      .boundingBox();
    const speedBox = await page
      .getByRole("slider", { name: "Speed", exact: true })
      .boundingBox();
    expect(volumeBox.y).toBeLessThan(speedBox.y);
    await page.getByRole("button", { name: "Adjust workspace" }).click();
    await expect(
      page.getByRole("button", { name: "Filter", exact: true }),
    ).toHaveClass("selected");
    await expect(page.locator(".advanced-adjustments > summary")).toBeVisible();
    await expect(page.locator(".preview-controls-top select")).toHaveCount(0);
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: "Opacity value", exact: true }),
    ).toHaveValue("100");
    await page.getByRole("button", { name: "Auto captions workspace" }).click();
    await expect(page.locator(".caption-generate-card")).toHaveCSS(
      "border-top-width",
      "0px",
    );
    await expect(
      page
        .getByRole("combobox", { name: "Caption grouping" })
        .locator("option"),
    ).toHaveCount(3);
    await expect(
      page.locator(".inspector [aria-label='Caption grouping']"),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add text", exact: true }),
    ).toHaveCSS("color", "rgb(17, 24, 32)");
    await page.getByRole("button", { name: "Media workspace" }).click();
    await expect
      .poll(() => page.locator(".source-card .frame-samples > span").count(), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
    const libraryPreview = await page
      .locator(".source-preview")
      .first()
      .boundingBox();
    expect(libraryPreview.width).toBeLessThanOrEqual(136);
    await page.locator(".timeline-clip").nth(1).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deletion = page.waitForResponse(
      (r) =>
        r.url().includes("/api/assets/") && r.request().method() === "DELETE",
    );
    await page.locator(".source-remove:not(:disabled)").first().click();
    expect((await deletion).ok()).toBe(true);
    await expect(page.locator(".source-card")).toHaveCount(1);
    report.mediaRemoval = true;
    await page.getByRole("button", { name: "Open EditAI chat" }).click();
    for (const name of [
      "Add captions",
      "Give it a warmer look",
      "Make the cuts more relaxed",
    ])
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open EditAI chat" }),
    ).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
    await page.getByRole("button", { name: "Clip", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: "Volume value", exact: true }),
    ).toHaveAttribute("step", "1");
    await expect(
      page.getByRole("button", { name: "Open EditAI chat" }),
    ).toHaveCSS("background-image", /168, 207, 255/);
    await page.screenshot({
      path: "outputs/desktop027-editor-controls.png",
      fullPage: true,
    });
    report.editorUI = {
      sharedControls: true,
      captionGrouping: true,
      quickPrompts: true,
      referenceUpload: "UI only; no external AI request",
    };
  }
  if (!process.env.EDITAI_RESUME_TEST && !process.env.EDITAI_EXPORT_ONLY)
    await page
      .getByRole("button", { name: "Generate captions", exact: true })
      .click();
  else if (!process.env.EDITAI_EXPORT_ONLY)
    await page.getByRole("button", { name: "Text", exact: true }).click();
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
    expect(
      page.getByRole("status").filter({ hasText: "MP4 exported" }),
    ).toContainText("MP4 exported", {
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
  // Remove these synthetic QA projects through the UI so both account storage
  // and the local IndexedDB library/media are cleaned up.
  let removed = 0;
  if (process.env.EDITAI_EXPORT_ONLY && !process.env.EDITAI_RESUME_TEST) {
    page.on("dialog", (dialog) => {
      if (
        dialog.type() === "confirm" &&
        /^Delete “Batch [12] — synthetic-speech”/.test(dialog.message())
      )
        void dialog.accept();
      else void dialog.dismiss();
    });
    const back = page.getByRole("button", {
      name: /^My (creations|Edits)$/,
      exact: true,
    });
    if (await back.isVisible()) await back.click();
    else
      await page
        .getByRole("button", { name: "Edits", exact: true })
        .filter({ visible: true })
        .first()
        .click();
    await expect(
      page.getByRole("heading", { name: "Edits", exact: true }),
    ).toBeVisible();
    const deletes = page.getByRole("button", {
      name: /^Delete Batch [12] — synthetic-speech$/,
    });
    while (await deletes.count()) {
      const previous = await deletes.count();
      await deletes.first().click();
      await expect(deletes).toHaveCount(previous - 1);
      removed++;
    }
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Upload your raw takes here" }),
    ).toBeVisible();
    await expect(
      page
        .locator(".project-card-title")
        .filter({ hasText: /^Batch [12] — synthetic-speech$/ }),
    ).toHaveCount(0);
  }
  report.testProjectsRemoved = removed;
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
