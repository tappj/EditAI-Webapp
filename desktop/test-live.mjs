// Real desktop acceptance. This drives the normal gate and real services.
// DNT prevents automated verification from counting as fellowship engagement.
import { _electron as electron, expect } from "@playwright/test";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdtemp,
  readdir,
  copyFile,
} from "node:fs/promises";
async function selectPreviewText(page) {
  await page.locator(".preview-text-hit").first().click();
  await page
    .getByLabel("Edit text on video", { exact: true })
    .press("Control+Enter");
}
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
  // Silence speaker output only. Real playback, capture and exported audio remain tested.
  await app.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows())
      window.webContents.setAudioMuted(true);
  });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  const home = page.getByRole("heading", {
    name: "Welcome",
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
  const nameStep = page.getByRole("heading", {
    name: "Who runs this studio?",
    exact: true,
  });
  await Promise.race([
    nameStep.waitFor(),
    home.waitFor(),
    signIn.waitFor(),
    connect.waitFor(),
    ownKeySetup.waitFor(),
    welcome.waitFor(),
  ]);
  if (await welcome.isVisible()) {
    for (let step = 0; step < 5; step++)
      await page.getByRole("button", { name: "Skip", exact: true }).click();
    const savings = page.getByRole("button", {
      name: "Show how much time I will save",
      exact: true,
    });
    if (await savings.isVisible()) await savings.click();
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
  await Promise.race([home.waitFor(), nameStep.waitFor()]);
  if (await nameStep.isVisible()) {
    const suppliedName = process.env.EDITAI_ONBOARDING_FIRST_NAME;
    if (!suppliedName)
      throw Error(
        "A real first name is required to finish onboarding; do not invent a profile name.",
      );
    const first = page.getByRole("textbox", { name: "First name Required" });
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeDisabled();
    await expect(first).toHaveAttribute("maxlength", "40");
    await first.fill(suppliedName);
    await first.press("Enter");
    await expect(home).toBeVisible();
    await page.reload();
    await expect(home).toBeVisible();
    report.nameOnboarding = {
      required: true,
      bounded: true,
      saved: true,
      restoredAfterReload: true,
    };
  }
  await expect(home).toBeVisible({ timeout: 30000 });
  // Exercise the actual authenticated IPC and native close handler without
  // consuming AI credits. A background task must retain its hidden renderer.
  await page.evaluate(() => window.editaiDesktop.setBackgroundWork(true));
  const hidden = await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.close();
    return !window.isDestroyed() && !window.isVisible();
  });
  expect(hidden).toBe(true);
  await page.evaluate(() => window.editaiDesktop.setBackgroundWork(false));
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].show(),
  );
  report.backgroundWindowClose = true;
  const nameProfile = await page.evaluate(async () => {
    const s = await (await fetch("/api/session")).json();
    return {
      saved: !!s.profile?.displayName?.trim(),
      needsName: !!s.profile?.needsName,
    };
  });
  expect(nameProfile.saved).toBe(true);
  expect(nameProfile.needsName).toBe(false);
  report.nameProfile = { persisted: true, onboardingComplete: true };

  report.authentication = true;
  if (process.env.EDITAI_VERIFY_EDITOR_UI) {
    // Load the independent audit harness through DevTools evaluation; packaged
    // model/module/WASM requests still run under the normal production CSP.
    await page.evaluate(
      (await readFile(
        resolve("node_modules/onnxruntime-web/dist/ort.wasm.min.js"),
        "utf8",
      )) + ";globalThis.ort=ort;",
    );
    await page.evaluate(
      await readFile(
        resolve("node_modules/@ricky0123/vad-web/dist/bundle.min.js"),
        "utf8",
      ),
    );
    report.localSpeechDetection = await page.evaluate(async () => {
      const detector = await window.vad.NonRealTimeVAD.new({
        modelURL: location.origin + "/speech/silero_vad_legacy.onnx",
        ortConfig: (ort) => {
          ort.env.wasm.wasmPaths = location.origin + "/speech/";
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.proxy = false;
        },
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        redemptionMs: 120,
        preSpeechPadMs: 60,
        minSpeechMs: 500,
      });
      let segments = 0;
      for await (const segment of detector.run(new Float32Array(16000), 16000))
        segments++;
      return segments === 0;
    });
    expect(report.localSpeechDetection).toBe(true);
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Upload photo|Replace photo/ }),
  ).toBeVisible();
  await expect(page.locator(".app-theme-options input")).toHaveCount(8);
  await expect(page.locator(".appearance-options input")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: /^Save (profile|preferences)$/ }),
  ).toHaveCount(0);
  await expect(page.locator(".app-footer")).toHaveCount(0);
  // Export-only release checks must preserve the person’s AI privacy choice.
  if (!process.env.EDITAI_EXPORT_ONLY)
    await page.getByRole("checkbox", { name: /Allow AI processing/ }).check();
  if (!process.env.EDITAI_EXPORT_ONLY) {
    await page
      .getByRole("checkbox", { name: /Share official usage events/ })
      .uncheck();
    await page.getByRole("heading", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("All changes saved");
  }
  await page.getByRole("button", { name: "Home", exact: true }).click();
  if (process.env.EDITAI_VERIFY_ACTION_MOTION) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".quick-tools .ice")).toContainText(
      "Record your ideas",
    );
    const expected = [
      [".lavender", 3],
      [".mint", 6],
      [".peach", 3],
    ];
    for (const [selector, count] of expected) {
      const card = page.locator(".quick-tools " + selector);
      await card.hover();
      await expect(card.locator("svg")).toHaveCSS("animation-name", "none");
      await expect.poll(() => card.locator("svg").evaluate(
        (svg) => svg.getAnimations({ subtree: true }).length,
      )).toBe(count);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [selector] of expected) {
      const card = page.locator(".quick-tools " + selector);
      await card.hover();
      expect(
        await card
          .locator("svg")
          .evaluate((svg) => svg.getAnimations({ subtree: true }).length),
      ).toBe(0);
    }
    report.actionMotion = {
      batchLayers: true,
      waveformBars: true,
      twinklingStars: true,
      reducedMotion: true,
    };
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  if (process.env.EDITAI_VERIFY_WORKFLOW_UI) {
    await page.getByRole("button", { name: /^Record\b/ }).click();
    await expect(
      page.getByRole("heading", { name: "Record", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Flip camera" })).toHaveCount(
      0,
    );
    const limits = page.getByRole("group", { name: "Recording limit" });
    await expect(
      limits.getByRole("button", { name: "1:00", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await limits.getByRole("button", { name: "0:30", exact: true }).click();
    await expect(
      limits.getByRole("button", { name: "0:30", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".record-timer-progress")).toHaveAttribute(
      "stroke-dasharray",
      "0 1",
    );
    const speed = page.getByRole("slider", {
      name: "Scroll speed",
      exact: true,
    });
    await speed.focus();
    await speed.press("ArrowRight");
    await expect(
      page.getByRole("spinbutton", { name: "Scroll speed value" }),
    ).toHaveValue("31");
    await page.screenshot({ path: "outputs/desktop-workflow-record.png" });
    await page.getByRole("button", { name: "Home", exact: true }).click();
    report.workflowUI = {
      recorderPills: true,
      durationRing: true,
      visibleScrollSpeed: true,
      desktopFlipHidden: true,
    };
  }
  if (process.env.EDITAI_VERIFY_UPLOAD_REVIEW) {
    let aiRequests = 0;
    const observe = (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/ai/")) aiRequests++;
    };
    page.on("request", observe);
    const uploadTitle = `Release upload review ${Date.now()}`;
    const buffer = await readFile("outputs/synthetic-speech.mp4");
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles([
        { name: uploadTitle + ".mp4", mimeType: "video/mp4", buffer },
        { name: "Second review clip.mp4", mimeType: "video/mp4", buffer },
      ]);
    await expect(
      page.getByRole("button", { name: "Send", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("region", { name: "Preview your upload" }),
    ).toBeVisible();
    await expect(page.getByText("2 videos", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "Auto Cut", exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Add Captions", exact: true }),
    ).not.toBeChecked();
    if (report.workflowUI) report.workflowUI.sendDefaults = true;
    await page.getByRole("button", { name: "Video 2", exact: true }).click();
    const preview = page.getByLabel("Video 2 of 2 preview");
    await expect(preview).toHaveJSProperty("readyState", 4);
    await expect(preview).toHaveCSS("object-fit", "contain");
    const card = await page.locator(".upload-review-player").boundingBox();
    expect(card.width).toBeLessThanOrEqual(480);
    expect(
      Math.abs(
        card.x + card.width / 2 - (await page.evaluate(() => innerWidth)) / 2,
      ),
    ).toBeLessThan(2);
    expect(
      (
        await page
          .getByRole("button", { name: "Send", exact: true })
          .boundingBox()
      ).y,
    ).toBeGreaterThan(card.y + card.height);

    await page.getByRole("button", { name: "Play upload preview" }).click();
    await expect
      .poll(() => preview.evaluate((video) => video.currentTime))
      .toBeGreaterThan(0.05);
    await preview.click();
    await expect(preview).toHaveJSProperty("paused", true);
    await page.screenshot({ path: "outputs/desktop-upload-review.png" });
    await page.getByRole("button", { name: "Exit upload" }).click();
    await expect(home).toBeVisible();
    expect(aiRequests).toBe(0);
    page.off("request", observe);
    await page.getByRole("button", { name: "Edits", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Delete " + uploadTitle,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog", { name: "Delete this edit?", exact: true })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Delete " + uploadTitle,
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Home", exact: true }).click();
    report.uploadReview = {
      centeredPreview: true,
      multipleClips: true,
      nativePlayback: true,
      explicitSend: true,
      noAIBeforeSend: true,
      cancelledDraftRemoved: true,
    };
  }
  if (process.env.EDITAI_EXPORT_ONLY && !process.env.EDITAI_RESUME_TEST) {
    await page
      .locator(".quick-tools")
      .getByRole("button", { name: /^Batch\b/ })
      .click();
    const inputs = page.locator(".batch-box input[type=file]");
    const source = resolve("outputs/synthetic-speech.mp4");
    const sources = process.env.EDITAI_VERIFY_EDITOR_UI
      ? [source, source]
      : source;
    await inputs.nth(0).setInputFiles(sources);
    await inputs.nth(1).setInputFiles(sources);
    await expect(page.locator(".batch-thumbnail")).toHaveCount(2);
    if (report.workflowUI) report.workflowUI.batchThumbnails = true;
    await page.getByRole("checkbox", { name: /Auto Cut/ }).uncheck();
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
  } else {
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles(resolve("outputs/synthetic-speech.mp4"));
    await page.getByRole("button", { name: "Send", exact: true }).click();
  }
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
    const adjustSection = page.locator('[data-section="adjust"]');
    await expect
      .poll(() =>
        adjustSection.evaluate((el) =>
          el.getAnimations().some((a) => a.id === "adjust-feedback"),
        ),
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          adjustSection.evaluate((el) =>
            el.getAnimations().some((a) => a.id === "adjust-feedback"),
          ),
        { timeout: 1500 },
      )
      .toBe(false);

    await expect(
      page.getByRole("button", { name: "Filter", exact: true }),
    ).toHaveClass("selected");
    await expect(page.locator(".advanced-adjustments > summary")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Canvas aspect ratio" }),
    ).not.toBeVisible();
    await page.locator(".preview-canvas-options > summary").click();
    await expect(
      page.getByRole("combobox", { name: "Canvas aspect ratio" }),
    ).toBeVisible();
    await page.locator(".preview-canvas-options > summary").click();
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
    await expect(page.locator(".source-append, .source-used")).toHaveCount(0);
    const media = page.locator(".source-preview").first();
    const mediaBox = await media.boundingBox();
    const kindBox = await media.locator(".source-kind").boundingBox();
    const timeBox = await media.locator(".source-duration").boundingBox();
    const trashBox = await media.locator(".source-remove").boundingBox();
    expect(kindBox.y).toBeLessThan(mediaBox.y + mediaBox.height / 2);
    expect(timeBox.y).toBeGreaterThan(mediaBox.y + mediaBox.height / 2);
    expect(trashBox.y).toBeGreaterThan(mediaBox.y + mediaBox.height / 2);
    report.mediaRemoval = true;
    await page.getByRole("button", { name: "Open EditAI chat" }).click();
    await expect(page.locator(".editai-tool.selected svg").first()).toHaveCSS(
      "fill",
      "rgb(196, 224, 255)",
    );
    await expect(page.locator(".editai-tool.selected svg").first()).toHaveCSS(
      "stroke",
      "rgb(17, 17, 17)",
    );
    const message = page.getByLabel("Message EditAI", { exact: true });
    await message.fill("First line");
    await message.press("Shift+Enter");
    await message.pressSequentially("Second line");
    await expect(message).toHaveValue("First line\nSecond line");
    await message.fill("");
    await page
      .locator("input[type=file]")
      .nth(2)
      .setInputFiles(resolve("outputs/synthetic-speech.mp4"));
    await expect(
      page.getByRole("button", { name: "Remove reference" }),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.locator(".reference-details")).toHaveCount(0);
    await expect(
      page.getByLabel("Keep text clear of social controls"),
    ).toHaveCount(0);
    await expect(page.locator(".reference-thumbnail")).toBeVisible();
    await page.getByRole("button", { name: "Remove reference" }).click();
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
    ).toHaveCSS("background-image", /linear-gradient/);
    await page.screenshot({
      path: "outputs/desktop027-editor-controls.png",
      fullPage: true,
    });
    report.editorUI = {
      sharedControls: true,
      adjustFeedback: true,
      blackSparkle: true,
      shiftEnter: true,
      captionGrouping: true,
      quickPrompts: true,
      referenceUpload:
        "Real local video sampling and audio measurements; no external AI request",
      referenceAnalysis: true,
      referenceCleanUI: true,
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
  if (process.env.EDITAI_VERIFY_MOTION) {
    expect(
      await page
        .locator(".timeline-edit-actions button")
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("aria-label")),
        ),
    ).toEqual(["Split", "Overlay", "Crop", "Duplicate", "Delete"]);
    await page.getByRole("button", { name: "Clip", exact: true }).click();
    await expect(
      page.getByRole("spinbutton", { name: "Fade in value", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Extract audio", exact: true })
      .click();
    for (const name of ["Fade in", "Fade out"]) {
      const input = page.getByRole("spinbutton", {
        name: name + " value",
        exact: true,
      });
      await input.fill("0.6");
      await input.press("Enter");
    }
    await expect(page.locator(".audio-fade-envelope")).toHaveCount(0);
    await page.locator(".timeline-clip").first().click();
    await page.getByLabel("Timeline playhead", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.locator(".motion-controls > summary").click();
    await page
      .getByRole("button", {
        name: "Clip entrance animation: fade",
        exact: true,
      })
      .click();
    await page.locator(".motion-directions button").nth(1).click();
    await page
      .getByRole("button", { name: "Clip exit animation: pop", exact: true })
      .click();
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("button", { name: "Add text", exact: true }).click();
    await page
      .getByLabel("Caption text", { exact: true })
      .fill("EditAI motion check");

    await expect(
      page
        .getByRole("button", { name: "Use Abril Fatface font", exact: true })
        .locator("span"),
    ).toHaveText("Splendid");
    const textSize = page.getByRole("spinbutton", {
      name: "Size value",
      exact: true,
    });
    await textSize.fill("0.2");
    await textSize.press("Enter");
    const canvas = page.getByLabel("Video preview", { exact: true });
    await expect(page.locator(".preview-selection")).toHaveCount(0);
    await page.locator(".text-row .sequence-item").first().click();
    await expect(page.locator(".preview-selection")).toHaveCount(0);
    await selectPreviewText(page);
    const frame = await page.locator(".preview-selection").boundingBox();
    const south = await page
      .getByRole("button", {
        name: "Resize s edge of selected layer",
        exact: true,
      })
      .boundingBox();
    const videoBox = await canvas.boundingBox();
    await page.mouse.move(
      south.x + south.width / 2,
      south.y + south.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      south.x + south.width / 2,
      south.y + south.height / 2 + videoBox.height * 0.18 - frame.height,
      { steps: 5 },
    );
    await page.mouse.up();
    await page.mouse.move(10, 60);
    const beforeTyping = await canvas.screenshot({ caret: "hide" });
    const pixels = await canvas.evaluate((c) => c.toDataURL());
    await page
      .getByRole("button", { name: "Move selected layer", exact: true })
      .click();
    const typing = page.getByLabel("Edit text on video", { exact: true });
    await expect(typing).toBeFocused();
    expect(
      await typing.evaluate(
        (el) => new DOMMatrix(getComputedStyle(el).transform).a,
      ),
    ).toBeLessThan(0.8);
    await expect(typing).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    expect(
      Buffer.compare(beforeTyping, await canvas.screenshot({ caret: "hide" })),
    ).toBe(0);
    await typing.fill("Draft on the preview");
    await expect
      .poll(() => canvas.evaluate((c) => c.toDataURL()))
      .not.toBe(pixels);
    await typing.press("Escape");
    await expect.poll(() => canvas.evaluate((c) => c.toDataURL())).toBe(pixels);
    await page.locator(".preview-text-hit").first().click();
    await typing.fill("EditAI typed on preview");
    await typing.press("Control+Enter");
    await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
      "EditAI typed on preview",
    );
    await canvas.click({ position: { x: 3, y: 3 } });
    await expect(page.locator(".preview-selection")).toHaveCount(0);
    await expect(page.locator(".text-row .sequence-item.selected")).toHaveCount(
      1,
    );
    await expect(page.getByLabel("Font weight", { exact: true })).toHaveValue(
      "500",
    );
    await page.getByLabel("Font weight", { exact: true }).selectOption("700");
    await page
      .getByRole("group", { name: "Text color palette", exact: true })
      .getByRole("button", { name: "Text color #00c853", exact: true })
      .click();
    await expect(
      page.getByLabel("Text color hex", { exact: true }),
    ).toHaveValue("#00c853");
    await page.getByLabel("Choose custom text color", { exact: true }).click();
    await page
      .getByRole("slider", { name: "Text color wheel", exact: true })
      .press("ArrowRight");
    await expect(
      page.getByLabel("Text color hex", { exact: true }),
    ).not.toHaveValue("#00c853");
    await page.getByLabel("Choose custom text color", { exact: true }).click();
    await expect(
      page.getByLabel("Text start time", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Text end time", { exact: true })).toHaveCount(
      0,
    );
    const fonts = page.locator(".font-preview-grid").first().locator("button");
    const order = await fonts.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
    await fonts.nth(2).click();
    expect(
      await fonts.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("aria-label")),
      ),
    ).toEqual(order);
    await page.getByLabel("Search fonts", { exact: true }).fill("TikTok");
    await page
      .getByRole("button", { name: "Use TikTok Sans font", exact: true })
      .click();
    await expect(page.getByLabel("Font weight", { exact: true })).toHaveValue(
      "700",
    );
    await page.getByLabel("Search fonts", { exact: true }).fill("");

    await expect(
      page.getByRole("button", { name: "Replay previews", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Style previews", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".text-row .sequence-item.selected")).toHaveCSS(
      "border-top-width",
      "2px",
    );
    await page.getByLabel("Text color hex", { exact: true }).fill("#00ff00");
    await page
      .getByRole("button", { name: "Text background white", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Text border white", exact: true })
      .click();
    await page.getByLabel("Outline color hex", { exact: true }).fill("#0000ff");
    for (const [label, value] of [
      ["Outline width", "6"],
      ["Background opacity", "90"],
      ["Background padding", "18"],
      ["Background radius", "12"],
      ["Shadow opacity", "75"],
      ["Shadow blur", "8"],
      ["Shadow offset", "8"],
    ]) {
      const input = page.getByRole("spinbutton", {
        name: label + " value",
        exact: true,
      });
      await input.fill(value);
      await input.press("Enter");
    }
    await page.screenshot({
      path: "outputs/desktop-text-appearance.png",
      fullPage: true,
    });
    await page.locator(".motion-controls > summary").click();
    await page
      .getByRole("button", { name: "Animation: pop", exact: true })
      .click();
    await page.locator(".motion-directions button").nth(1).click();
    await page
      .getByRole("button", { name: "Exit animation: slide", exact: true })
      .click();
    await selectPreviewText(page);
    const previewLine = await page
      .locator(".preview-selection")
      .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
    expect(previewLine).toBeGreaterThan(0);
    expect(previewLine).toBeLessThanOrEqual(1);
    await expect(page.locator(".preview-selection")).toHaveCSS(
      "outline-style",
      "none",
    );
    const grips = await page
      .locator(".preview-selection .preview-handle")
      .evaluateAll((handles) =>
        handles.map((handle) => {
          const grip = getComputedStyle(handle, "::after");
          return [grip.width, grip.height, grip.transform, grip.opacity];
        }),
      );
    expect(
      grips.filter(
        ([w, h, , opacity]) => w === "7px" && h === "7px" && opacity === "1",
      ),
    ).toHaveLength(4);
    expect(grips.every(([, , transform]) => transform === "none")).toBe(true);
    await page.getByLabel("Timeline playhead", { exact: true }).fill("1");
    report.motionUI = {
      audioFades: true,
      audioOnlyFades: true,
      clipAnimation: true,
      textAnimation: true,
      stableFontOrder: true,
      compositorExportRequired: true,
    };
  }
  const destination = resolve("outputs/desktop-real-export.mp4");
  const downloadFolder = await mkdtemp(
    resolve("outputs", "desktop-downloads-"),
  );
  await app.evaluate(
    ({ app }, folder) => app.setPath("downloads", folder),
    downloadFolder,
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Export resolution/ })
    .selectOption("854");
  await expect
    .poll(() =>
      page
        .locator('video[aria-hidden="true"]')
        .evaluateAll(
          (videos) =>
            videos.length > 0 &&
            videos.every((video) => video.readyState >= 2 && !video.seeking),
        ),
    )
    .toBe(true);
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Video preview"]');
    const sample = () =>
      Array.from(
        canvas
          .getContext("2d")
          .getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data,
      ).join(",");
    const before = sample();
    window.exportPreviewChanges = 0;
    window.exportPreviewTimer = setInterval(() => {
      if (sample() !== before) window.exportPreviewChanges++;
    }, 50);
  });
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
  expect(
    await page.evaluate(() => {
      clearInterval(window.exportPreviewTimer);
      return window.exportPreviewChanges;
    }),
  ).toBe(0);
  report.previewStillDuringExport = true;
  const downloads = (await readdir(downloadFolder)).filter((name) =>
    name.endsWith(".mp4"),
  );
  expect(downloads).toHaveLength(1);
  await copyFile(resolve(downloadFolder, downloads[0]), destination);
  report.downloads = true;
  report.exportSeconds = (Date.now() - start) / 1000;
  if (process.env.EDITAI_VERIFY_MOTION) {
    const frame = execFileSync(
      archivePath ? resolve(archivePath, "..", "bin", "ffmpeg") : "ffmpeg",
      [
        "-v",
        "error",
        "-ss",
        "1",
        "-i",
        destination,
        "-frames:v",
        "1",
        "-pix_fmt",
        "rgb24",
        "-f",
        "rawvideo",
        "-",
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    let green = 0;
    for (let i = 0; i < frame.length; i += 3)
      if (frame[i + 1] > frame[i] + 40 && frame[i + 1] > frame[i + 2] + 40)
        green++;
    expect(green).toBeGreaterThan(20);
    report.textAppearance = {
      directControls: true,
      inlineEditing: true,
      previewSelectionIndependent: true,
      fontSpecimens: true,
      restoredTimeline: true,
      previewHandles: true,
      exportedPixels: true,
    };
  }

  if (process.env.EDITAI_VERIFY_MOTION) {
    await page.getByRole("button", { name: "Clip", exact: true }).click();
    await page.locator(".audio-row .sequence-item").first().click();
    await expect(
      page.locator(".audio-row .audio-fade-body").first(),
    ).toHaveAttribute("data-fade-in", "0.6");
    expect(
      await page
        .locator(".audio-fade-overlay .audio-fade-in")
        .first()
        .getAttribute("d"),
    ).toContain("C");
    await expect(page.locator(".audio-row .sequence-item.selected")).toHaveCSS(
      "border-top-width",
      "2px",
    );
    report.textAppearance.palette = true;
    report.textAppearance.variableFont = true;
    await expect(page.locator(".audio-fade-body").first()).toHaveCSS(
      "clip-path",
      "none",
    );
    report.textAppearance.timelineFades = true;
  }
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
      await page
        .getByRole("dialog", { name: "Delete this edit?", exact: true })
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(deletes).toHaveCount(previous - 1);
      removed++;
    }
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
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
