import { verifyReferenceMascot } from "./mascot-acceptance";
import { test, expect } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
const session = {
  screen: { id: "ready" },
  profile: {
    handle: "browser_test_fixture",
    choice: "own_key",
    consent: true,
    telemetry: false,
    plan: "Test fixture",
    hasOwnKey: true,
    aiProviders: [],
  },
};
async function selectPreviewText(page: import("@playwright/test").Page) {
  await page.locator(".preview-text-hit").first().click();
  await page
    .getByLabel("Edit text on video", { exact: true })
    .press("Control+Enter");
}
test.beforeEach(async ({ page }) => {
  // Send starts the automatic first cut. Keep every provider boundary explicit in
  // fixture tests; targeted cases register their more specific responses later.
  await page.route("**/api/ai/**", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "AI is unavailable in this isolated browser fixture." },
    }),
  );
  await page.route("**/api/ai/edit-job/*", (r) =>
    r.fulfill({ json: { state: "missing" } }),
  );
  await page.route("**/api/assets/*", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ json: { ok: true } })
      : route.fulfill({ status: 404 }),
  );
});
async function resumeAtAccount(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "editai-studio-onboarding-v1",
      JSON.stringify({ step: "account", answers: {} }),
    );
  });
}
async function authenticated(page: import("@playwright/test").Page) {
  await page.route("**/api/session", (r) => r.fulfill({ json: session }));
  await page.route("**/api/projects", (r) =>
    r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    }),
  );
  await page.route("**/api/telemetry", (r) =>
    r.fulfill({ json: { ok: true } }),
  );
}
async function openStudio(page: import("@playwright/test").Page) {
  await page.goto("/");
  // File inputs exist before the async sign-in gate finishes. Wait for the
  // visible studio that a real user reaches before choosing their media.
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
}

async function sendUpload(page: import("@playwright/test").Page) {
  const send = page.getByRole("button", { name: "Send", exact: true });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.locator(".upload-processing")).toHaveCount(0, {
    timeout: 120000,
  });
  await expect(page.locator(".upload-review")).toHaveCount(0);
}

test("upload preview can start from a tap when automatic buffering readiness is withheld", async ({ page }) => {
  await authenticated(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    // Mobile preload policies may expose metadata before buffering a playable
    // frame. Withhold only the review's readiness notification; decoding/playback
    // still use the real video and browser, and the import probe is unaffected.
    document.addEventListener("canplay", (event) => {
      if (event.target instanceof HTMLVideoElement && event.target.closest(".upload-review"))
        event.stopImmediatePropagation();
    }, true);
  });
  await openStudio(page);
  await page.locator("input[type=file]").first().setInputFiles("outputs/fixture.mp4");
  const review = page.getByRole("region", { name: "Preview your upload" });
  const preview = review.locator("video");
  await expect(review).toBeVisible();
  await expect.poll(() => preview.evaluate(video => (video as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await expect(review.getByRole("button", { name: "Play upload preview" })).toBeEnabled();
  await expect(review.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Play upload preview" }).click();
  await expect(preview).toHaveJSProperty("paused", false);
  await expect.poll(() => preview.evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0.1);
  await preview.click();
  await expect(preview).toHaveJSProperty("paused", true);
  await preview.focus();
  await preview.press("Space");
  await expect(preview).toHaveJSProperty("paused", false);
  await expect(page.locator(".upload-processing")).toHaveCount(0);
  await page.getByRole("button", { name: "Exit upload", exact: true }).click();
});

test("native upload review waits for Send, previews multiple clips, and circles the image during one first cut", async ({
  page,
}) => {
  await authenticated(page);
  let speech = 0,
    edits = 0;
  let releaseEdit!: () => void;
  const editReady = new Promise<void>((resolve) => {
    releaseEdit = resolve;
  });
  await page.route("**/api/ai/transcribe", (route) => {
    speech++;
    return route.fulfill({
      json: {
        words: [
          { word: "Hello", start: 0.2, end: 0.6 },
          { word: "story.", start: 1, end: 1.4 },
        ],
      },
    });
  });
  await page.route("**/api/ai/edit", async (route) => {
    edits++;
    await editReady;
    await route.fulfill({ json: { cuts: [] } }).catch(() => {});
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page);
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    "outputs/fixture.mp4",
    "-vf",
    "transpose=1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "outputs/review-portrait.mp4",
  ]);
  const portrait = await readFile("outputs/review-portrait.mp4");
  const buffer = await readFile("outputs/fixture.mp4");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "One.mp4", mimeType: "video/mp4", buffer },
      { name: "Two.mp4", mimeType: "video/mp4", buffer: portrait },
    ]);
  const review = page.getByRole("region", { name: "Preview your upload" });
  await expect(review).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeEnabled();
  expect(speech).toBe(0);
  expect(edits).toBe(0);
  await expect(page.locator(".timeline-clip")).toHaveCount(0);
  await expect(review.getByText("2 videos", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Video 2", exact: true }).click();
  await expect(page.getByLabel("Video 2 of 2 preview")).toHaveJSProperty(
    "readyState",
    4,
  );
  await expect(page.getByLabel("Video 2 of 2 preview")).toHaveCSS(
    "object-fit",
    "contain",
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const card = (await page.locator(".upload-review-player").boundingBox())!;
    expect(card.width).toBeLessThanOrEqual(240);
    expect(card.height).toBeLessThan(844 * 0.5);
    expect(Math.abs(card.x + card.width / 2 - width / 2)).toBeLessThan(2);
    const send = (await page
      .getByRole("button", { name: "Send", exact: true })
      .boundingBox())!;
    expect(send.y).toBeGreaterThan(card.y + card.height);
    await page.screenshot({ path: `outputs/centered-review-${width}.png` });
  }
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await expect(review).toHaveCSS("background-color", "rgb(16, 18, 22)");
  await page.screenshot({ path: "outputs/centered-review-dark.png" });
  await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
  await page.getByRole("button", { name: "Play upload preview" }).click();
  await expect(page.getByLabel("Video 2 of 2 preview")).toHaveJSProperty(
    "paused",
    false,
  );
  await page.getByLabel("Video 2 of 2 preview").click();
  await expect(
    page.getByRole("button", { name: "Play upload preview" }),
  ).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Retake", exact: true }).click();
  await (await chooser).setFiles([]);
  await expect(review.getByText("2 videos", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "outputs/upload-review-mobile.png" });
  // Reproduce the real Mac title-bar drag surface, which previously covered X.
  await page.evaluate(() => {
    document.documentElement.dataset.desktopPlatform = "darwin";
    const drag = document.createElement("div");
    drag.className = "desktop-window-drag";
    document.body.appendChild(drag);
  });
  await expect(page.getByRole("button", { name: "Exit upload" })).toBeVisible();
  await page
    .getByRole("button", { name: "Exit upload" })
    .click({ trial: true });
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const processing = page.getByRole("region", {
    name: "Creating your first cut",
  });
  await expect(processing).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel editing and return" })
    .click({ trial: true });
  await expect(page.locator(".upload-processing-image video")).toHaveJSProperty(
    "readyState",
    4,
  );
  await expect(page.locator(".upload-processing-image")).toHaveCSS(
    "border-radius",
    "24px",
  );
  // SVG user units must remain CSS pixels on narrow screens so its 24px
  // corners follow the photograph instead of shrinking with a fixed viewBox.
  expect(
    await page
      .locator(".upload-image-orbit rect")
      .evaluate((rect: SVGRectElement) => ({
        radius: rect.rx.baseVal.value,
        scale: rect.getScreenCTM()!.a,
      })),
  ).toEqual({ radius: 24, scale: 1 });
  await expect(page.locator(".progress-modal")).toHaveCount(0);
  await expect.poll(() => edits).toBe(1);
  expect(speech).toBe(2);
  await expect(
    page.locator('.upload-task-list [data-stage="transcribe"]'),
  ).toHaveAttribute("data-complete", "true");
  await expect(
    page.locator('.upload-task-list [data-stage="cut"]'),
  ).toHaveAttribute("data-complete", "false");
  await expect(
    page.locator('.upload-task-list [data-stage="captions"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "outputs/upload-processing-mobile.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".upload-image-orbit rect")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await expect(processing).toHaveCSS("background-color", "rgb(16, 18, 22)");
  await page.screenshot({ path: "outputs/upload-processing-dark.png" });
  releaseEdit();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await expect(processing).toHaveCount(0);
  expect(edits).toBe(1);
  await expect(
    page.getByRole("status").filter({ hasText: "first cut is ready" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
});

test("cancel first-cut processing returns Home with recoverable originals and no late editor entry", async ({
  page,
}) => {
  await authenticated(page);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/api/ai/transcribe", async (route) => {
    requested = true;
    await blocked;
    await route
      .fulfill({
        json: { words: [{ word: "Original.", start: 0.2, end: 0.6 }] },
      })
      .catch(() => {});
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Cancel editing and return" }).click();
  await expect(page.locator(".upload-processing")).toHaveCount(0);
  release();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.locator(".upload-review")).toHaveCount(0);
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await page
    .locator(".project-card")
    .getByRole("button", { name: "fixture", exact: true })
    .click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".source-card")).toHaveCount(1);
});

test("Retake validates the entire replacement and consent-disabled Send preserves the full original", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        ...session,
        profile: { ...session.profile, consent: false, consentDecided: true },
      },
    }),
  );
  let aiCalls = 0;
  await page.route("**/api/ai/**", (route) => {
    aiCalls++;
    return route.fulfill({ status: 500 });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeEnabled();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(
      Array.from({ length: 51 }, (_, i) => ({
        name: `${i}.mp4`,
        mimeType: "video/mp4",
        buffer: Buffer.from([0]),
      })),
    );
  await expect(page.locator(".upload-review-error")).toContainText(
    "Choose up to 50 files",
  );
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Video 1 of 1 preview")).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  expect(aiCalls).toBe(0);
});

test("text appearance controls change real pixels, restore timeline selections, persist and export", async ({
  page,
  browserName,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", (route) => {
    if (route.request().method() === "POST")
      saved = route.request().postDataJSON();
    return route.fulfill({
      json:
        route.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await sendUpload(page);
  await expect(page.locator(".timeline-clip.selected")).toHaveCSS(
    "border-top-width",
    "2px",
  );
  await expect(
    page.locator(".timeline-clip.selected .trim-grip").first(),
  ).toHaveCSS("width", "12px");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.locator(".motion-controls > summary").click();
  await expect(
    page.getByRole("button", { name: "Replay previews", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text", { exact: true }).fill("STYLE");
  await expect(
    page.getByRole("heading", { name: "Style previews", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".text-row .sequence-item.selected")).toHaveCSS(
    "border-top-width",
    "2px",
  );
  await expect(
    page.locator(".text-row .sequence-item.selected .trim-grip").first(),
  ).toHaveCSS("background-color", "rgb(89, 143, 217)");
  await expect(page.getByLabel("Font weight", { exact: true })).toHaveValue(
    "500",
  );
  await page.getByLabel("Font weight", { exact: true }).selectOption("700");
  await expect(page.getByLabel("Text start time", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Text end time", { exact: true })).toHaveCount(
    0,
  );
  const palette = page.getByRole("group", {
    name: "Text color palette",
    exact: true,
  });
  expect(await palette.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(
    true,
  );
  await palette
    .getByRole("button", { name: "Text color #00c853", exact: true })
    .click();
  await expect(page.getByLabel("Text color hex", { exact: true })).toHaveValue(
    "#00c853",
  );
  await page.getByLabel("Choose custom text color", { exact: true }).click();
  const wheel = page.getByRole("slider", {
    name: "Text color wheel",
    exact: true,
  });
  await expect(wheel).toBeVisible();
  await page.screenshot({
    path: `outputs/text-wheel-${browserName}.png`,
    fullPage: true,
  });
  await wheel.press("ArrowRight");
  await expect(
    page.getByLabel("Text color hex", { exact: true }),
  ).not.toHaveValue("#00c853");
  await page.getByLabel("Choose custom text color", { exact: true }).click();
  // Exercise the preview sampler used where the screen EyeDropper API is absent.
  await page.evaluate(() =>
    Object.defineProperty(window, "EyeDropper", {
      value: undefined,
      configurable: true,
    }),
  );
  const canvas = page.getByLabel("Video preview", { exact: true });
  const expectedSample = await canvas.evaluate((c: HTMLCanvasElement) => {
    const p = c
      .getContext("2d")!
      .getImageData(
        Math.floor(c.width * 0.1),
        Math.floor(c.height * 0.1),
        1,
        1,
      ).data;
    return (
      "#" +
      Array.from(p.slice(0, 3))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
    );
  });
  await page
    .getByRole("button", { name: "Sample text color", exact: true })
    .click();
  const sampler = page.getByRole("button", {
    name: "Sample text color from preview",
    exact: true,
  });
  const sb = (await sampler.boundingBox())!;
  await sampler.click({ position: { x: sb.width * 0.1, y: sb.height * 0.1 } });
  await expect(page.getByLabel("Text color hex", { exact: true })).toHaveValue(
    expectedSample,
  );
  await page
    .getByRole("button", { name: "Sample text color", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(sampler).toHaveCount(0);
  await page.getByLabel("Text color hex", { exact: true }).fill("#00ff00");
  await page
    .getByRole("button", { name: "Text border white", exact: true })
    .click();
  await page.getByLabel("Outline color hex", { exact: true }).fill("#0000ff");
  const number = async (name: string, value: string) => {
    const field = page.getByRole("spinbutton", {
      name: name + " value",
      exact: true,
    });
    await field.fill(value);
    await field.press("Enter");
  };
  await number("Outline width", "6");
  await page
    .getByRole("button", { name: "Text background white", exact: true })
    .click();
  await number("Background opacity", "90");
  await number("Background padding", "18");
  await number("Background radius", "12");
  await number("Shadow opacity", "75");
  await page.getByLabel("Shadow color hex", { exact: true }).fill("#ff0000");
  await number("Shadow blur", "8");
  await number("Shadow offset", "8");
  await expect
    .poll(() => saved?.document?.texts?.[0]?.shadowOpacity)
    .toBe(0.75);
  expect(saved.document.texts[0].background).toBe("#ffffff");
  expect(saved.document.texts[0].fontWeight).toBe(700);
  expect(saved.document.texts[0].outlineWidth).toBeCloseTo(6 / 1080);
  expect(saved.document.texts[0].backgroundPadding).toBeCloseTo(18 / 1080);
  const coloredPixels = () =>
    page
      .locator("canvas")
      .first()
      .evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        let green = 0,
          blue = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (
            pixels[i + 1] > pixels[i] + 50 &&
            pixels[i + 1] > pixels[i + 2] + 50
          )
            green++;
          if (
            pixels[i + 2] > pixels[i] + 50 &&
            pixels[i + 2] > pixels[i + 1] + 50
          )
            blue++;
        }
        return { green, blue };
      });
  await expect
    .poll(async () => (await coloredPixels()).green)
    .toBeGreaterThan(20);
  await expect
    .poll(async () => (await coloredPixels()).blue)
    .toBeGreaterThan(20);
  await page.screenshot({
    path: `outputs/text-appearance-${browserName}.png`,
    fullPage: true,
  });
  await number("Background radius", "24");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Background radius value",
      exact: true,
    }),
  ).toHaveValue("12");
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await page.locator(".project-card-title").first().click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.locator(".text-row .sequence-item").click();
  await expect(page.getByLabel("Text color hex", { exact: true })).toHaveValue(
    "#00ff00",
  );
  await expect(
    page.getByRole("spinbutton", {
      name: "Background radius value",
      exact: true,
    }),
  ).toHaveValue("12");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Export resolution|Resolution/ })
    .selectOption("854");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const result = await download,
    path = join(tmpdir(), `editai-text-appearance-${browserName}.mp4`);
  await result.saveAs(path);
  const frame = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      "1",
      "-i",
      path,
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
  let green = 0,
    blue = 0;
  for (let i = 0; i < frame.length; i += 3) {
    if (frame[i + 1] > frame[i] + 40 && frame[i + 1] > frame[i + 2] + 40)
      green++;
    if (frame[i + 2] > frame[i] + 40 && frame[i + 2] > frame[i + 1] + 40)
      blue++;
  }
  expect(green).toBeGreaterThan(20);
  expect(blue).toBeGreaterThan(20);
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=1",
    "outputs/text-style-audio.wav",
  ]);
  await page
    .getByRole("button", { name: "Audio workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Import audio", exact: true }).click();
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles("outputs/text-style-audio.wav");
  await expect(page.locator(".audio-row .sequence-item.selected")).toHaveCSS(
    "border-top-width",
    "2px",
  );
  await expect(
    page.locator(".audio-row .sequence-item.selected .trim-grip").first(),
  ).toHaveCSS("background-color", "rgb(89, 143, 217)");

  // Older saved boxes omitted these optional fields. Read the renderer's
  // original defaults without changing the saved appearance on panel open.
  const legacy = structuredClone(saved);
  legacy.title = "Legacy styled caption";
  delete legacy.document.texts[0].backgroundOpacity;
  delete legacy.document.texts[0].backgroundRadius;
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? {
              projects: [
                {
                  id: legacy.id,
                  title: legacy.title,
                  document: JSON.stringify(legacy.document),
                  updated_at: Date.now() + 5000,
                },
              ],
            }
          : { ok: true },
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await page
    .locator(".project-card-title")
    .filter({ hasText: "Legacy styled caption" })
    .click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.locator(".text-row .sequence-item").click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Background opacity value",
      exact: true,
    }),
  ).toHaveValue("100");
  await expect(
    page.getByRole("spinbutton", {
      name: "Background radius value",
      exact: true,
    }),
  ).toHaveValue("0");
});

test("restored selection, collapsed Canvas, stable fonts and native-style fades/motion survive real export and reload", async ({
  page,
  browserName,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  expect(
    await page
      .locator(".timeline-edit-actions button")
      .evaluateAll((buttons) =>
        buttons.map((b) => b.getAttribute("aria-label")),
      ),
  ).toEqual(["Split", "Overlay", "Crop", "Duplicate", "Delete"]);
  await expect(page.locator(".timeline-clip.selected")).toHaveCSS(
    "border-top-width",
    "2px",
  );
  const canvasOptions = page.locator(".preview-canvas-options");
  await expect(canvasOptions).not.toHaveAttribute("open", "");
  await expect(page.getByLabel("Canvas aspect ratio")).not.toBeVisible();
  await canvasOptions.locator("summary").click();
  await page.getByLabel("Canvas aspect ratio").selectOption("1:1");
  await page.getByLabel("Framing", { exact: true }).selectOption("fill");
  await canvasOptions.locator("summary").click();
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
    await input.fill("3");
    await input.press("Enter");
  }
  await expect(page.locator(".audio-fade-envelope")).toHaveCount(0);
  await expect.poll(() => saved?.document?.audio[0]?.fadeOut).toBe(3);
  await page.locator(".timeline-clip").first().click();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.locator(".motion-controls > summary").click();
  await page
    .getByRole("button", { name: "Clip entrance animation: fade", exact: true })
    .click();
  await expect(
    page.locator(".media-animation-picker .frame-samples").first(),
  ).toBeVisible();
  await page.locator(".motion-directions button").nth(1).click();
  await page
    .getByRole("button", { name: "Clip exit animation: fade", exact: true })
    .click();
  await expect
    .poll(() => saved?.document?.segments[0].appearance.animationOut)
    .toBe("fade");
  const playhead = page.getByLabel("Timeline playhead", { exact: true });
  const brightness = () =>
    page
      .locator('canvas[aria-label="Video preview"]')
      .evaluate((canvas: HTMLCanvasElement) => {
        const c = canvas.getContext("2d")!;
        const p = c.getImageData(
          Math.floor(canvas.width / 3),
          Math.floor(canvas.height / 3),
          1,
          1,
        ).data;
        return p[0] + p[1] + p[2];
      });
  await playhead.fill("0");
  await expect.poll(brightness).toBeLessThan(80);
  await playhead.fill("1");
  await expect.poll(brightness).toBeGreaterThan(200);
  await page.screenshot({
    path: `outputs/motion/${browserName}-filter.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Resolution|Export resolution/ })
    .selectOption("854");
  const download = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const exported = await download;
  const path = join(tmpdir(), `editai-motion-${browserName}.mp4`);
  await exported.saveAs(path);
  const level = (start: number, end: number) => {
    const result = spawnSync(
      "ffmpeg",
      [
        "-v",
        "info",
        "-i",
        path,
        "-vn",
        "-af",
        `atrim=start=${start}:end=${end},volumedetect`,
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    const match = /mean_volume: (-?[\d.]+) dB/.exec(result.stderr);
    expect(match).not.toBeNull();
    return Number(match![1]);
  };
  expect(level(1.9, 2.1) - level(0.03, 0.2)).toBeGreaterThan(12);
  expect(level(1.9, 2.1) - level(3.95, 4.1)).toBeGreaterThan(10);
  // Decode exported pixels; source and opacity animation must match the monitor.
  const pixel = (time: string) =>
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-ss",
      time,
      "-i",
      path,
      "-frames:v",
      "1",
      "-vf",
      "scale=1:1",
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "-",
    ]);
  const early = pixel("0.03"),
    middle = pixel("1");
  expect([...middle].reduce((a, b) => a + b, 0)).toBeGreaterThan(
    [...early].reduce((a, b) => a + b, 0) + 70,
  );
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByLabel("Caption text", { exact: true })
    .fill("Clean selection");
  const fonts = page.locator(".font-preview-grid").first().locator("button");
  const order = await fonts.evaluateAll((buttons) =>
    buttons.map((b) => b.getAttribute("aria-label")),
  );
  await fonts.nth(5).click();
  expect(
    await fonts.evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute("aria-label")),
    ),
  ).toEqual(order);
  await expect(fonts.nth(5)).toHaveAttribute("aria-pressed", "true");
  await selectPreviewText(page);
  await expect(page.locator(".preview-selection")).toHaveCSS(
    "border-top-width",
    "1px",
  );
  await expect(page.locator(".preview-selection")).toHaveCSS(
    "outline-style",
    "none",
  );
  await expect(page.locator(".preview-selection")).toHaveCSS(
    "border-radius",
    "0px",
  );
  const grips = await page
    .locator(".preview-selection .preview-handle")
    .evaluateAll((handles) =>
      handles.map((handle) => {
        const grip = getComputedStyle(handle, "::after");
        return [grip.width, grip.height, grip.transform, grip.opacity];
      }),
    );
  expect(grips).toHaveLength(8);
  expect(
    grips.filter(
      ([w, h, , opacity]) => w === "7px" && h === "7px" && opacity === "1",
    ),
  ).toHaveLength(4);
  expect(grips.every(([, , transform]) => transform === "none")).toBe(true);
  const handle = page.getByRole("button", {
    name: "Resize e edge of selected layer",
    exact: true,
  });
  await expect(handle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 25, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.locator(".motion-controls > summary").click();
  await page
    .getByRole("button", { name: "Animation: pop", exact: true })
    .click();
  await page.locator(".motion-directions button").nth(1).click();
  await page
    .getByRole("button", { name: "Exit animation: slide", exact: true })
    .click();
  await expect
    .poll(() => saved?.document?.texts[0]?.animationOut)
    .toBe("slide");
  await page.screenshot({
    path: `outputs/motion/${browserName}-text.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await page.locator(".project-card-title").first().click();
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Fade in value", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.locator(".motion-controls > summary").click();
  await expect(
    page.getByRole("button", {
      name: "Clip entrance animation: fade",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  await page.locator(".audio-row .sequence-item").first().click();
  await expect(page.locator(".audio-row .layer-clip")).toHaveCount(1);
  await expect(
    page.getByRole("spinbutton", { name: "Fade in value", exact: true }),
  ).toHaveValue("3");
  await expect.poll(() => saved?.document?.audio[0]?.fadeOut).toBe(3);
  const fadeOut = page.getByRole("spinbutton", {
    name: "Fade out value",
    exact: true,
  });
  await fadeOut.fill("0.6");
  await fadeOut.press("Enter");
  await expect.poll(() => saved?.document?.audio[0]?.fadeOut).toBe(0.6);
  const fadeBody = page.locator(".audio-row .audio-fade-body");
  await expect(fadeBody).toHaveAttribute("data-fade-out", "0.6");
  await expect(fadeBody).toHaveAttribute("data-fade-in", "3");
  await expect(fadeBody).toHaveCSS("clip-path", "none");
  await expect(page.locator(".audio-fade-overlay path")).toHaveCount(2);
  expect(
    await page.locator(".audio-fade-overlay .audio-fade-in").getAttribute("d"),
  ).toContain("C");
  await expect(page.locator(".audio-fade-envelope")).toHaveCount(0);
  await expect(
    page.getByText("Seconds. Long fades shorten together to fit this clip.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".audio-row .sequence-item.selected")).toHaveCSS(
    "border-top-width",
    "2px",
  );

  await page.screenshot({
    path: `outputs/motion/${browserName}-audio.png`,
    fullPage: true,
  });
});
test("public first page requires Publik sign-in; responsive and no secret exposure", async ({
  page,
}) => {
  await resumeAtAccount(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn your raw footage into edited videos in minutes.",
    }),
  ).toBeVisible();
  await page
    .locator(".m-header")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Sign in with publik", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  await page.screenshot({ path: "outputs/gate-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "outputs/gate-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("real browser upload, split, undo, speed, text, canvas, MP4 export and saved reopen", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await page.screenshot({ path: "outputs/studio-home.png", fullPage: true });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.getByRole("button", { name: "Split" })).toBeVisible();
  await page.getByLabel("Timeline playhead").fill("1.5");
  await page.getByRole("button", { name: "Split" }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("slider", { name: /^Exposure/ }).fill("0.25");
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  await page.locator(".preview-canvas-options > summary").click();
  await page.getByLabel("Canvas aspect ratio").selectOption("1:1");
  await page.locator(".preview-canvas-options > summary").click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text").fill("Browser export test");
  await expect
    .poll(() => page.evaluate(() => document.fonts.status))
    .toBe("loaded");
  await page.screenshot({ path: "outputs/editor-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Resolution|Export resolution/i })
    .selectOption("854");
  const download = page.waitForEvent("download", { timeout: 150000 });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const file = await Promise.race([
    download,
    page
      .getByRole("alert")
      .waitFor({ timeout: 150000 })
      .then(async () => {
        throw Error(await page.getByRole("alert").innerText());
      }),
  ]);
  await file.saveAs("outputs/verified-export.mp4");
  await expect(page.getByRole("status")).toContainText("MP4 exported");
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.locator(".project-card-title").click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "outputs/editor-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("AI failure preserves timeline and explains recovery", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/ai/**", (r) =>
    r.fulfill({
      status: 402,
      json: {
        error: "Not enough publik API balance.",
        url: "https://publikhq.com/wallet",
      },
    }),
  );
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.getByRole("button", { name: "Split" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Not enough publik API balance.",
    { timeout: 120000 },
  );
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
});

test("large local media survives a browser reload and deletion removes its storage", async ({
  page,
}) => {
  await authenticated(page);
  let rejectDelete = true;
  await page.route("**/api/projects/*", (r) =>
    r.fulfill(
      r.request().method() === "DELETE" && rejectDelete
        ? { status: 503, json: { error: "Fixture delete failed" } }
        : { json: { ok: true } },
    ),
  );
  await openStudio(page);
  // Valid short MP4 plus trailing padding crosses the fallback chunk boundary
  // without changing the decoded fixture or requiring a long recording.
  const video = await readFile("outputs/fixture.mp4");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "storage-recovery.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.concat([video, Buffer.alloc(5 * 1024 * 1024)]),
    });
  await sendUpload(page);
  await expect(page.getByRole("button", { name: "Split" })).toBeVisible();
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: /^Edits/ })
    .first()
    .click();
  await page.locator(".project-card-title").click();
  await expect(page.getByRole("button", { name: "Split" })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Timeline playhead").inputValue()),
    )
    .toBeGreaterThan(0.2);
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  const deletion = page.getByRole("dialog", {
    name: "Delete this edit?",
    exact: true,
  });
  const deleteButton = page.getByRole("button", {
    name: "Delete storage-recovery",
    exact: true,
  });
  await deleteButton.hover();
  await expect(deleteButton).toHaveCSS("background-color", "rgb(23, 32, 42)");
  await deleteButton.click();
  await expect(deletion).toContainText("storage-recovery");
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await deleteButton.click();
  await deletion.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(deletion.getByRole("alert")).toContainText(
    "Fixture delete failed",
  );
  await expect(page.locator(".project-card")).toHaveCount(1);
  rejectDelete = false;
  await deletion.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(0);
  const remaining = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("editai-studio");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const keys = database
            .transaction("media")
            .objectStore("media")
            .getAllKeys();
          keys.onsuccess = () => {
            resolve(keys.result.length);
            database.close();
          };
          keys.onerror = () => reject(keys.error);
        };
      }),
  );
  expect(remaining).toBe(0);
});

test("MediaRecorder takes with generated camera source, teleprompter and playable import", async ({
  page,
}) => {
  await authenticated(page);
  // The test uses real browser MediaRecorder/canvas/audio, with a generated camera
  // source. OS-level camera/microphone permission remains a physical-device check.
  await page.addInitScript(() => {
    // Retain the fixture object across WebKit's navigation/GC lifecycle.
    const devices = navigator.mediaDevices;
    Object.defineProperty(navigator, "mediaDevices", { value: devices });
    devices.getUserMedia = async () => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 180;
      const ctx = c.getContext("2d")!;
      let frame = 0;
      setInterval(() => {
        ctx.fillStyle = frame++ % 2 ? "#a8f0f0" : "#598fd9";
        ctx.fillRect(0, 0, 320, 180);
      }, 50);
      const stream = c.captureStream(24);
      const audio = new AudioContext({
          sinkId: { type: "none" },
        } as AudioContextOptions),
        osc = audio.createOscillator(),
        dest = audio.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      void audio.resume();
      stream.addTrack(dest.stream.getAudioTracks()[0]);
      return stream;
    };
  });
  await openStudio(page);
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
  const speed = page.getByRole("slider", { name: "Scroll speed", exact: true });
  await speed.focus();
  await speed.press("ArrowRight");
  await expect(
    page.getByRole("spinbutton", { name: "Scroll speed value" }),
  ).toHaveValue("31");
  const numberBox = await page
    .getByRole("spinbutton", { name: "Scroll speed value" })
    .boundingBox();
  expect(numberBox!.width).toBeGreaterThan(25);
  await expect(
    page.getByRole("combobox", { name: "Recording shape" }),
  ).toHaveValue("9:16");
  await expect(page.locator(".camera-card")).toHaveCSS(
    "aspect-ratio",
    "9 / 16",
  );
  await page
    .getByRole("combobox", { name: "Recording shape" })
    .selectOption("1:1");
  await expect(page.locator(".camera-card")).toHaveCSS("aspect-ratio", "1 / 1");
  await page
    .getByRole("combobox", { name: "Recording shape" })
    .selectOption("9:16");
  await page
    .getByRole("button", { name: "Enable camera & microphone" })
    .click();
  await expect(
    page.getByRole("button", { name: "Start recording" }),
  ).toBeEnabled();
  await page
    .getByPlaceholder("Paste your script. It stays out of the recording.")
    .fill("This script should not be burned into the footage.");
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(
    page.getByRole("heading", { name: "1 recorded takes" }),
  ).toBeVisible();
  await expect(page.locator(".recorded-take video")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".recorded-take video")
        .evaluate((v: HTMLVideoElement) => v.videoWidth / v.videoHeight),
    )
    .toBeCloseTo(9 / 16, 2);
  const firstProgress = await page
    .locator(".record-timer-progress")
    .getAttribute("stroke-dasharray");
  expect(Number(firstProgress!.split(" ")[0])).toBeGreaterThan(0.04);
  for (let take = 0; take < 2; take++) {
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.waitForTimeout(850);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.locator(".recorded-take")).toHaveCount(take + 2);
  }
  await page
    .getByRole("button", { name: "Remove Take 2.webm", exact: true })
    .click();
  await expect(page.locator(".recorded-take")).toHaveCount(2);
  await expect(page.getByText("Take 1.webm", { exact: true })).toBeVisible();
  await expect(page.getByText("Take 3.webm", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "outputs/workflow-record.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Use these takes" }).click();
  await expect(page.locator(".upload-review-clips button")).toHaveCount(2);
  await page.getByRole("checkbox", { name: "Auto Cut", exact: true }).uncheck();
  await sendUpload(page);
  await expect(page.getByRole("button", { name: "Split" })).toBeVisible({
    timeout: 120000,
  });
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
});

test("overlay and imported audio appear in actual exported media", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await expect(
    page.getByRole("button", { name: "Upload clips", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page
    .getByRole("button", { name: "Overlays workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import overlay", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(page.locator(".overlay-row .sequence-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Audio workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import audio", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/music.wav"));
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Replace audio", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "replacement.wav",
      mimeType: "audio/wav",
      buffer: await readFile(join(process.cwd(), "outputs/music.wav")),
    });
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await expect(page.locator(".audio-row")).toContainText("replacement.wav");
  await page.getByRole("checkbox", { name: "Mute audio", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Mute audio", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Resolution|Export resolution/i })
    .selectOption("854");
  const d = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await (await d).saveAs("outputs/layers-export.mp4");
  await expect(page.getByRole("status")).toContainText("MP4 exported");
});

test("batch creates separate persistent editable projects", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await page.getByRole("button", { name: /^Batch\b/ }).click();
  await page
    .locator(".batch-box input")
    .nth(0)
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator(".batch-box input")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await expect(page.locator(".batch-thumbnail")).toHaveCount(2);
  await page.screenshot({ path: "outputs/workflow-batch.png", fullPage: true });
  await expect
    .poll(() =>
      page
        .locator(".batch-thumbnail")
        .first()
        .evaluate((v: HTMLVideoElement) => v.videoWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("checkbox", { name: /Auto Cut/ }).uncheck();
  await page.getByRole("button", { name: "Create 2 projects" }).click();
  await expect(page.locator(".project-card")).toHaveCount(2);
});

test("mutation routes reject requests from another origin", async ({
  request,
}) => {
  const r = await request.post("/api/projects", {
    headers: { origin: "https://untrusted.invalid" },
    data: { id: "invalid" },
  });
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({
    error: "This request must come from EditAI.",
  });
});

test("Publik Chirp upload flow creates one resumable word-timestamp job per source", async ({
  page,
}) => {
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: { ...session, profile: { ...session.profile, choice: "publik" } },
    }),
  );
  await page.route("**/api/projects", (r) =>
    r.fulfill({ json: { projects: [] } }),
  );
  await page.route("**/api/telemetry", (r) =>
    r.fulfill({ json: { ok: true } }),
  );
  let jobs = 0,
    uploads = 0;
  await page.route("**/api/ai/speech-source/*", (r) =>
    r.fulfill({ json: { id: null, pending: false } }),
  );
  await page.route("**/api/ai/audio-upload", (r) => {
    uploads++;
    return r.fulfill({
      json: {
        id: "upl_fixture",
        uploadTicket: "encrypted-fixture-ticket",
      },
    });
  });
  await page.route("**/api/ai/audio-put", async (r) => {
    expect(r.request().headers()["authorization"]).toBeUndefined();
    expect(r.request().headers()["x-upload-ticket"]).toBe(
      "encrypted-fixture-ticket",
    );
    await r.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/ai/transcription-job", (r) => {
    jobs++;
    expect(r.request().postDataJSON().sourceId).toBeTruthy();
    return r.fulfill({ json: { id: "trx_fixture", status: "queued" } });
  });
  await page.route("**/api/ai/transcription-job/trx_fixture", (r) =>
    r.fulfill({
      json: {
        id: "trx_fixture",
        status: "completed",
        words: [
          { word: "A", start: 0.3, end: 0.3 },
          { word: "real", start: 0.3, end: 0.8 },
          { word: "caption.", start: 0.9, end: 1.3 },
        ],
      },
    }),
  );
  await openStudio(page);
  await expect(
    page.getByRole("button", { name: "Upload clips", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page
    .getByRole("button", { name: "Auto captions workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(1);
  expect(jobs).toBe(1);
  expect(uploads).toBe(1);
  await page
    .getByRole("button", { name: "Auto captions workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(1);
  expect(jobs).toBe(1);
});

test("EditAI chat generates captions from recoverable ASR timing and supports terminal-style keys", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await sendUpload(page);
  let transcriptions = 0;
  await page.route("**/api/ai/transcribe", (r) => {
    transcriptions++;
    return r.fulfill({
      json: {
        words: [
          { word: "Basic", start: 0, end: 0 },
          { word: "captions", start: 0, end: 0.9 },
          { word: ".", start: 0.9, end: 0.9 },
        ],
        text: "Basic captions.",
      },
    });
  });
  const sent: string[] = [];
  await page.route("**/api/ai/chat", (r) => {
    sent.push(r.request().postDataJSON().prompt);
    return r.fulfill({
      json: {
        message: "Fixture: requested action applied.",
        generateCaptions: sent.length === 1,
        captionFormat: null,
        operations: [],
      },
    });
  });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text", { exact: true }).fill("Manual title");
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await expect(page.locator(".editai-tool.selected svg").first()).toHaveCSS(
    "stroke",
    "rgb(17, 17, 17)",
  );
  await expect(page.locator(".editai-tool.selected svg").first()).toHaveCSS(
    "fill",
    "rgb(196, 224, 255)",
  );
  const input = page.getByLabel("Message EditAI", { exact: true });
  await input.fill("Give me basic captions");
  await input.press("Enter");
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(2);
  await expect(
    page
      .locator(".text-row .sequence-item")
      .filter({ hasText: "Basic captions." }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".text-row .sequence-item")
      .filter({ hasText: "Manual title" }),
  ).toHaveCount(1);
  await expect(page.locator(".message.assistant")).toHaveCount(1);
  expect(transcriptions).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await input.fill("Second request");
  await input.press("Enter");
  await expect(page.locator(".message.assistant")).toHaveCount(2);
  expect(sent).toEqual(["Give me basic captions", "Second request"]);
  await input.fill("unsent draft");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("Second request");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("Give me basic captions");
  await input.press("ArrowDown");
  await expect(input).toHaveValue("Second request");
  await input.press("ArrowDown");
  await expect(input).toHaveValue("unsent draft");
  await input.fill("line one");
  await input.press("Shift+Enter");
  await input.pressSequentially("line two");
  await expect(input).toHaveValue("line one\nline two");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("line one\nline two");
  expect(sent).toHaveLength(2);
  await page
    .getByRole("button", { name: "Auto captions workspace", exact: true })
    .click();
  await expect(page.getByText(/Manual text stays in place/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(2);
  expect(transcriptions).toBe(1);
});

test("caption requests on a video without an audio track show only the concise no-audio message", async ({
  page,
}) => {
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    "outputs/fixture.mp4",
    "-c:v",
    "copy",
    "-an",
    "outputs/no-audio-fixture.mp4",
  ]);
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/no-audio-fixture.mp4");
  await sendUpload(page);
  let transcriptions = 0;
  await page.route("**/api/ai/transcribe", (r) => {
    transcriptions++;
    return r.fulfill({
      status: 500,
      json: { error: "This route must not be called for missing audio." },
    });
  });
  await page.route("**/api/ai/chat", (r) =>
    r.fulfill({
      json: {
        message: "Fixture: caption request.",
        generateCaptions: true,
        captionFormat: null,
        operations: [],
      },
    }),
  );
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page.getByLabel("Message EditAI", { exact: true }).fill("Add captions");
  await page.getByLabel("Message EditAI", { exact: true }).press("Enter");
  await expect(page.getByRole("alert")).toHaveText("No audio detected.");
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(0);
  expect(transcriptions).toBe(0);
});

test("visual style references attach actual browser-decoded image frames to chat", async ({
  page,
}) => {
  await authenticated(page);
  let reference: any;
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({ json: { words: [{ word: "Fixture", start: 0.2, end: 0.6 }] } }),
  );
  await page.route("**/api/ai/chat", (r) => {
    reference = r.request().postDataJSON().reference;
    return r.fulfill({
      json: {
        message: "Fixture response: reference received; no edits applied.",
        generateCaptions: false,
        captionFormat: null,
        operations: [],
      },
    });
  });
  await openStudio(page);
  await expect(
    page.getByRole("button", { name: "Upload clips", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a style reference" }).click();
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(
    page.getByRole("button", { name: "Remove reference" }),
  ).toBeVisible();
  await page.getByLabel("Message EditAI").fill("Match this reference style");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "reference received",
  );
  expect(reference.kind).toBe("image");
  expect(reference.frames[0].base64JPEG.startsWith("/9j/")).toBe(true);
});

test("Publik popup remains official, has no opener, and approval opens the studio", async ({
  page,
  context,
}) => {
  let linked = false;
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: linked
        ? session
        : {
            screen: {
              id: "sign_in",
              title: "Sign in with publik",
              body: "Continue with your Publik account.",
              buttons: [{ action: "sign_in", label: "Sign in with publik" }],
            },
            claimURL: "https://publikhq.com/claim/EDITAI-TEST",
            profile: { consent: false, telemetry: false },
          },
    }),
  );
  await page.route("**/api/projects", (r) =>
    r.fulfill({ json: { projects: [] } }),
  );
  await page.route("**/api/telemetry", (r) =>
    r.fulfill({ json: { ok: true } }),
  );
  await context.route("https://publikhq.com/claim/EDITAI-TEST", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<title>Isolated transport fixture</title><p>Publik sign-in fixture; no real account or telemetry.</p>",
    }),
  );
  await resumeAtAccount(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  await page
    .getByRole("link", { name: "Open EditAI Web", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in with publik", exact: true }),
  ).toBeVisible();
  const created = context.waitForEvent("page");
  await page
    .getByRole("button", { name: "Sign in with publik", exact: true })
    .click();
  const popup = await created;
  await popup.waitForURL("https://publikhq.com/claim/EDITAI-TEST");
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  linked = true;
  await page.bringToFront();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible({
    timeout: 15000,
  });
  if (!popup.isClosed()) await popup.close();
  // The authenticated dashboard still offers supported desktop downloads.
  // Verify the marketing/sign-in surface was completely replaced instead.
  await expect(page.locator(".marketing")).toHaveCount(0);
});

test("blocked sign-in popups expose a direct official recovery link", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: {
          id: "sign_in",
          title: "Sign in with publik",
          body: "Continue with Publik.",
          buttons: [{ action: "sign_in", label: "Sign in with publik" }],
        },
        claimURL: "https://publikhq.com/claim/EDITAI-TEST",
        profile: { consent: false, telemetry: false },
      },
    }),
  );
  await resumeAtAccount(page);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Sign in with publik", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open Publik sign-in" }),
  ).toHaveAttribute("href", "https://publikhq.com/claim/EDITAI-TEST");
  await expect(page.getByRole("status")).toContainText("return here");
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
});

for (const device of [
  {
    name: "iPhone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    touch: 5,
    downloads: false,
  },
  {
    name: "Android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    touch: 5,
    downloads: false,
  },
  {
    name: "iPad desktop mode",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    platform: "MacIntel",
    touch: 5,
    downloads: false,
  },
  {
    name: "Mac narrow window",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    platform: "MacIntel",
    touch: 0,
    downloads: true,
  },
]) {
  test(`desktop installers respect device on login and home: ${device.name}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent: device.userAgent,
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(({ platform, touch }) => {
      Object.defineProperty(navigator, "platform", { get: () => platform });
      Object.defineProperty(navigator, "maxTouchPoints", { get: () => touch });
    }, device);
    const page = await context.newPage();
    try {
      await page.route("**/api/session", (r) =>
        r.fulfill({
          json: {
            profile: { consent: false, telemetry: false },
            screen: {
              id: "sign_in",
              title: "Sign in with publik",
              body: "Continue with Publik.",
              buttons: [{ action: "sign_in", label: "Sign in with publik" }],
            },
          },
        }),
      );
      await page.goto("/");
      await expect(page.locator(".marketing-hero")).toBeVisible();
      const install = page.getByRole("link", { name: /Install for Mac/ });
      await expect(install).toHaveCount(device.downloads ? 1 : 0);
      if (device.downloads) {
        await expect(install).toBeVisible();
        await expect(install).toHaveAttribute(
          "href",
          JSON.parse(
            await readFile(
              join(process.cwd(), "lib/desktop-releases.json"),
              "utf8",
            ),
          )[0].url,
        );
        await expect(install).toContainText("Apple silicon");
      }
      await resumeAtAccount(page);
      await page.goto("/sign-in");
      await expect(
        page.getByRole("button", { name: "Sign in with publik", exact: true }),
      ).toBeVisible();
      await expect(page).toHaveTitle("EditAI: #1 Video Editor");
      await expect(
        page.getByRole("link", { name: /Download for macOS/ }),
      ).toHaveCount(device.downloads ? 1 : 0);
      await authenticated(page);
      await openStudio(page);
      await expect(
        page.locator(".topbar").getByRole("link", { name: /Download for Mac/ }),
      ).toHaveCount(device.downloads ? 1 : 0);
    } finally {
      await context.close();
    }
  });
}

test("own-key users land on Home and can open secure settings without a Publik subscription", async ({
  page,
}) => {
  let saved = false;
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        ...session,
        profile: { ...session.profile, plan: "No plan", hasOwnKey: saved },
      },
    }),
  );
  await page.route("**/api/projects", (r) =>
    r.fulfill({ json: { projects: [] } }),
  );
  await page.route("**/api/settings", async (r) => {
    const body = r.request().postDataJSON();
    expect(body.ownKey).toBe("fixture-only-openai-key");
    saved = true;
    await r.fulfill({ json: { ok: true } });
  });
  await page.goto("/sign-in");
  const home = page.getByRole("heading", {
    name: "Welcome",
  });
  await expect(home).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.reload();
  await expect(home).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const input = page.getByLabel("Own OpenAI API key", { exact: true });
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("type", "password");
  await expect(page.locator("main")).toContainText(
    "No Publik subscription is needed",
  );
  await input.fill("fixture-only-openai-key");
  await input.blur();
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("placeholder", "A key is securely saved");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("first-run Allow persists and Edits shows a frame, size and a rename action", async ({
  page,
  browserName,
}) => {
  let choice: boolean | null = null;
  let profile: Record<string, unknown> = {};
  let savedId = "";
  let backedUp = false;
  let renamed = "";
  const fixture = await readFile("outputs/fixture.mp4");
  await authenticated(page);
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        ...session,
        profile: {
          ...session.profile,
          ...profile,
          consent: choice === true,
          consentDecided: choice !== null,
        },
      },
    }),
  );
  await page.route("**/api/consent", (r) => {
    choice = r.request().postDataJSON().allow;
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/settings", (r) => {
    const body = r.request().postDataJSON();
    expect(body).not.toHaveProperty("telemetry");
    profile = { ...profile, ...body };
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      savedId = body.id;
      expect(body.document.sources[0].bytes).toBe(fixture.length);
    }
    return r.fulfill({ json: { projects: [] } });
  });
  await page.route("**/api/assets/*", (r) => {
    expect(savedId).toBeTruthy();
    expect(r.request().method()).toBe("PUT");
    expect(r.request().headers()["content-type"]).toBe("video/mp4");
    // WebKit's request interception omits File payloads.
    if (browserName === "chromium")
      expect(r.request().postDataBuffer()).toEqual(fixture);
    backedUp = true;
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/projects/*", (r) => {
    expect(r.request().method()).toBe("PATCH");
    expect(r.request().url()).toContain(savedId);
    renamed = r.request().postDataJSON().title;
    return r.fulfill({ json: { updatedAt: Date.now() } });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Allow AI processing?" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Allow", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.locator(".sidebar-note")).toHaveCount(0);
  await expect(page.locator(".sidebar-note a")).toHaveCount(0);
  await expect(
    page.locator(".upload-card input[type=checkbox], .corner-arrow"),
  ).toHaveCount(0);
  const uploadCard = page.locator(".upload-card");
  await expect(uploadCard.getByText("YOUR CREATIVE SHORTCUT")).toBeVisible();
  await expect(
    uploadCard.getByRole("heading", {
      name: /^Welcome/,
    }),
  ).toBeVisible();
  await expect(uploadCard).toContainText(
    "Upload your clips here, we do the rest",
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  expect((await uploadCard.boundingBox())?.height).toBe(460);
  const toolCards = page.locator(".tool-card");
  await expect(toolCards).toHaveCount(4);
  for (const tile of await toolCards.all()) {
    expect((await tile.boundingBox())?.height).toBe(222);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    uploadCard.getByRole("button", { name: "Upload clips" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  const topbar = page.locator(".topbar");
  await expect(
    topbar.getByRole("button", { name: "Record", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Record\b/ })).toBeVisible();
  await expect(
    page.locator(".sidebar nav").getByRole("button", { name: "Record" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".sidebar nav")
      .getByRole("button", { name: "Customize profile" }),
  ).toHaveCount(0);
  await page.reload();
  await topbar.getByRole("button", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Your Publik sign-in identifies your saved edits/),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Allow AI processing/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Share official usage/ }),
  ).not.toBeChecked();

  await expect(
    page.getByRole("heading", { name: "General", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Save (profile|preferences)$/ }),
  ).toHaveCount(0);
  await expect(page.locator(".app-footer")).toHaveCount(0);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Open profile customization" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Display name").fill("Taylor Editor");
  await page.getByRole("radio", { name: /Midnight/ }).check();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  await expect(page.locator(".progress-modal")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const profileButton = page.getByRole("button", {
    name: "Open profile customization",
  });
  await expect(profileButton).toContainText("Taylor Editor");
  await expect(profileButton.locator(".avatar")).toHaveText("TE");

  await page
    .getByRole("button", { name: "Upload clips", exact: true })
    .first()
    .waitFor();
  await page.screenshot({
    path: `outputs/studio-refresh/${browserName}-dark-home.png`,
  });
  await page.locator("input[type=file]").first().setInputFiles({
    name: "original.mp4",
    mimeType: "video/mp4",
    buffer: fixture,
  });
  await sendUpload(page);
  await expect.poll(() => backedUp).toBe(true);
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  const card = page.locator(".project-card");
  await expect(card.locator("video.frame-ready")).toBeVisible();
  await expect(card.locator("small")).toContainText(/\d.+KB · /);
  await page.getByRole("button", { name: "Rename original" }).click();
  await page.getByLabel("Edit name").fill("Final take");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(
    card.getByRole("button", { name: "Final take", exact: true }),
  ).toBeVisible();
  expect(renamed).toBe("Final take");
  await page.reload();
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Final take", exact: true }),
  ).toBeVisible();
});

test("first-time onboarding resumes, hands Google sign-in to Publik, and opens the free studio", async ({
  page,
  context,
}) => {
  const claim = "https://publikhq.com/claim/EDITAI-ONBOARDING";
  let savedName = "";
  let nameFailures = 1;
  await page.route("**/api/onboarding/name", (route) => {
    if (nameFailures-- > 0)
      return route.fulfill({
        status: 503,
        json: { error: "Name save is temporarily unavailable." },
      });
    const body = route.request().postDataJSON();
    expect(body.firstName).toBe("Jadon");
    expect(body.lastName).toBe("");
    savedName = body.firstName;
    return route.fulfill({ json: { displayName: savedName } });
  });
  let claimed = false;
  let choice: string | null = null;
  await context.route(claim, (route) =>
    route.fulfill({ body: "Publik sign-in fixture" }),
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        screen: !claimed
          ? {
              id: "sign_in",
              title: "Sign in with publik",
              buttons: [{ action: "sign_in", label: "Sign in with publik" }],
            }
          : !choice
            ? {
                id: "choose",
                title: "Your account is ready",
                body: "Start editing and saving projects for free.",
                buttons: [{ action: "free", label: "Open studio for free" }],
              }
            : { id: "ready" },
        profile: {
          ...session.profile,
          choice,
          displayName: savedName,
          needsName: !savedName,
        },
        claimURL: claim,
      },
    }),
  );
  await page.route("**/api/choice", (route) => {
    expect(claimed).toBe(true);
    choice = route.request().postDataJSON().choice;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/projects", (route) =>
    route.fulfill({ json: { projects: [] } }),
  );
  await page.route("**/api/telemetry", (route) =>
    route.fulfill({ json: { ok: true } }),
  );

  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/sign-in");
  const funnel = page.getByRole("region", { name: "EditAI onboarding" });
  const theme = page.locator("html");
  await expect(theme).toHaveAttribute("data-theme", "dark");
  await expect(theme).toHaveCSS("color-scheme", "dark");
  await expect(funnel).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(funnel).toHaveCSS("border-top-width", "0px");
  await expect(
    funnel.getByRole("heading", { name: "Who’s behind the camera?" }),
  ).toBeVisible();
  await expect(funnel.getByRole("heading")).toHaveCSS(
    "color",
    "rgb(243, 245, 247)",
  );
  await expect(funnel.locator("video")).toHaveCount(0);
  await expect(
    funnel.getByRole("progressbar", { name: "Onboarding progress" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await expect(funnel.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "9",
  );
  await expect(
    funnel.getByRole("button", { name: "Back", exact: true }),
  ).toBeDisabled();
  await expect(
    funnel.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Continue with Google/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "UGC creator" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Fashion" }).click();
  await page.getByRole("button", { name: "Business" }).click();
  await page.evaluate(() =>
    localStorage.setItem(
      "editai-preferences",
      JSON.stringify({ theme: "dark" }),
    ),
  );
  await page.reload();
  await expect(theme).toHaveAttribute("data-theme", "dark");
  await expect(funnel.getByRole("heading")).toHaveCSS(
    "color",
    "rgb(243, 245, 247)",
  );
  await expect(page.getByRole("button", { name: "Fashion" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Business" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "3 to 6 hours" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(funnel).toContainText("About 20 hours a month");
  await expect(
    funnel.locator(".studio-onboarding-hour-grid .marked"),
  ).toHaveCount(20);
  await page
    .getByRole("button", { name: "Show how much time I will save" })
    .click();
  await page.getByRole("button", { name: "Build my studio" }).click();
  await expect(page.locator(".studio-onboarding-building")).toContainText(
    "Preparing your studio…",
  );
  await expect(
    page.getByRole("heading", { name: "Your studio is ready.", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await expect(
    funnel.getByRole("heading", { name: "Save your progress." }),
  ).toBeVisible();
  await expect(funnel.locator(".studio-account")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(funnel.locator(".studio-account")).toHaveCSS(
    "box-shadow",
    "none",
  );
  const popupOpened = context.waitForEvent("page");
  await expect(funnel.getByRole("button", { name: /Google/ })).toHaveCount(0);
  const signIn = page.getByRole("button", {
    name: "Sign in with publik",
    exact: true,
  });
  await expect(signIn).toHaveCount(1);
  await signIn.click();
  const popup = await popupOpened;
  await popup.waitForURL(claim);
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  claimed = true;
  await popup.close();
  await page.getByRole("button", { name: "Open studio for free" }).click();
  expect(choice).toBe("publik");
  await expect(
    page.getByRole("heading", { name: "Who runs this studio?" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  const first = page.getByRole("textbox", { name: "First name Required" });
  const last = page.getByRole("textbox", { name: "Last name Optional" });
  await expect(first).toHaveAttribute("required", "");
  await expect(first).toHaveAttribute("maxlength", "40");
  await expect(last).toHaveAttribute("maxlength", "39");
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await expect(next).toBeDisabled();
  await first.fill("   ");
  await expect(next).toBeDisabled();
  await first.fill("Jadon");
  await next.click();
  await expect(page.getByRole("alert")).toContainText(
    "Name save is temporarily unavailable",
  );
  await expect(first).toHaveValue("Jadon");
  await first.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Welcome, Jadon", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, Jadon", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "First name Required" }),
  ).toHaveCount(0);
});

test("legacy demo drafts resume at questions and monthly hours animate into a filled grid", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await resumeAtAccount(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "editai-studio-onboarding-v1",
      JSON.stringify({ step: "demo", answers: {} }),
    ),
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: {},
      },
    }),
  );
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Who’s behind the camera?" }),
  ).toBeVisible();
  await expect(page.locator(".studio-onboarding video")).toHaveCount(0);
  await page.getByRole("button", { name: "UGC creator" }).click();
  await expect(
    page.getByRole("button", { name: "UGC creator" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What niches do you create for?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "UGC creator" }),
  ).toHaveAttribute("aria-pressed", "true");
  for (let step = 0; step < 4; step++)
    await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "3 to 6 hours" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const ticker = page.locator(".studio-onboarding-estimate b");
  await expect(ticker).toBeVisible();
  const readings: number[] = [];
  for (let i = 0; i < 4; i++) {
    readings.push(Number(await ticker.innerText()));
    await page.waitForTimeout(100);
  }
  expect(readings.some((value) => value > 0 && value < 20)).toBe(true);
  await expect(ticker).toHaveText("20");
  await expect(page.locator(".studio-onboarding-hour-grid span")).toHaveCount(
    720,
  );
  await expect(
    page.locator('.studio-onboarding-hour-grid [data-activity="sleep"]'),
  ).toHaveCount(240);
  await expect(
    page.locator(".studio-onboarding-hour-grid .marked"),
  ).toHaveCount(20);
  const counts = await page
    .locator(".monthly-time-legend strong")
    .allTextContents();
  expect(
    counts.reduce((sum, count) => sum + Number(count.replace("h", "")), 0),
  ).toBe(720);
});

test("signing out from the web studio returns to the public homepage", async ({
  page,
}) => {
  let signedIn = true;
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: signedIn
        ? session
        : {
            screen: {
              id: "sign_in",
              buttons: [{ action: "sign_in", label: "Sign in with publik" }],
            },
            profile: {},
          },
    }),
  );
  await page.route("**/api/projects", (route) =>
    route.fulfill({ json: { projects: [] } }),
  );
  await page.route("**/api/telemetry", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/logout", (route) => {
    signedIn = false;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".marketing-hero")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "EditAI onboarding" }),
  ).toHaveCount(0);
  await expect(page.locator(".app-shell")).toHaveCount(0);
});

test("upload creates an automatic first cut before editor entry, preserves originals, and EditAI receives real layers", async ({
  page,
}) => {
  await authenticated(page);
  let edits = 0,
    speech = 0;
  await page.route("**/api/ai/transcribe", (r) => {
    speech++;
    return r.fulfill({
      json: {
        words: [
          { word: "Keep", start: 0.2, end: 0.5 },
          { word: "restart", start: 1, end: 1.3 },
          { word: "this.", start: 2, end: 2.4 },
        ],
      },
    });
  });
  await page.route("**/api/ai/edit", (r) => {
    edits++;
    const words = r.request().postDataJSON().words;
    return r.fulfill({
      json: { cuts: [{ firstWord: words[1].id, lastWord: words[1].id }] },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  expect(edits).toBe(1);
  expect(speech).toBe(1);
  await expect(page.getByRole("status")).toContainText("first cut is ready");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect(page.locator(".overlay-row .sequence-item")).toHaveCount(1);
  await page.route("**/api/ai/chat", async (r) => {
    const body = r.request().postDataJSON();
    expect(body.document.overlays).toHaveLength(1);
    expect(body.supportedOperations).toContain("overlayLayout");
    await r.fulfill({
      json: {
        message: "Moved the overlay.",
        operations: [
          {
            kind: "overlayLayout",
            target: body.document.overlays[0].segment.id,
            media: { centerX: 0.25 },
          },
        ],
      },
    });
  });
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page.getByLabel("Message EditAI").fill("Move the overlay to the left");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "Moved the overlay",
  );
  await page.screenshot({
    path: "outputs/editor-first-cut.png",
    fullPage: true,
  });
});

test("visible playhead, grouped edge trim, selection without seeking, layer drag, and image append", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/ai/**", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Fixture: automatic AI unavailable." },
    }),
  );
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByLabel("Timeline playhead").fill("1.5");
  const cursor = await page.locator(".sequence-playhead").boundingBox();
  expect(cursor!.width).toBeGreaterThanOrEqual(2);
  const clip = page.locator(".timeline-clip");
  await clip.click({ position: { x: 50, y: 30 } });
  expect(
    Number(await page.getByLabel("Timeline playhead").inputValue()),
  ).toBeLessThan(1.5);
  const original = (await clip.boundingBox())!.width;
  const grip = clip.locator(".trim-grip.end");
  const b = (await grip.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + 15);
  await page.mouse.down();
  await page.mouse.move(b.x - 65, b.y + 15, { steps: 8 });
  await page.mouse.up();
  expect((await clip.boundingBox())!.width).toBeLessThan(original - 30);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await clip.boundingBox())!.width).toBeCloseTo(original, 0);
  await clip.scrollIntoViewIfNeeded();
  const beforeLeft = (await clip.boundingBox())!;
  const leftGrip = (await clip.locator(".trim-grip.start").boundingBox())!;
  await page.mouse.move(leftGrip.x + 6, leftGrip.y + 18);
  await page.mouse.down();
  await page.mouse.move(leftGrip.x + 30, leftGrip.y + 18, { steps: 5 });
  const duringLeft = (await clip.boundingBox())!;
  expect(duringLeft.x + duringLeft.width).toBeCloseTo(
    beforeLeft.x + beforeLeft.width,
    0,
  );
  expect(duringLeft.x).toBeGreaterThan(beforeLeft.x + 10);
  await page.mouse.up();
  expect((await clip.boundingBox())!.x).toBeCloseTo(beforeLeft.x, 0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByLabel("Timeline playhead").fill("1.5");
  await page.getByRole("button", { name: "Split" }).click();
  await page.locator(".timeline-clip").first().click();
  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  const overlay = page.locator(".overlay-row .sequence-item");
  await overlay.click();
  await page.getByLabel("Timeline playhead").fill("1.3");
  await expect(
    page.getByRole("button", { name: "Move selected layer" }),
  ).toBeVisible();
  const box = (await page
    .getByRole("button", { name: "Move selected layer" })
    .boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Append media" })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await expect(page.locator(".sequence-playhead")).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Search fonts").fill("Montserrat");
  await page
    .getByRole("button", { name: "Use Montserrat font", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use Montserrat font", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Use Montserrat font", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "outputs/editor-drag-layers.png",
    fullPage: true,
  });
});

test("same account resumes consent and playable local footage after repeated sign-out; another account stays isolated", async ({
  page,
}) => {
  let signedIn = true,
    otherAccount = false;
  await authenticated(page);
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: signedIn
        ? {
            ...session,
            profile: {
              ...session.profile,
              ownerId: otherAccount
                ? "different-account-fixture"
                : "returning-account-fixture",
              consentDecided: true,
            },
          }
        : {
            screen: {
              id: "remembered",
              title: "Welcome back",
              body: "Resume your saved Publik connection.",
              buttons: [
                {
                  action: "resume",
                  label: "Continue with your Publik account",
                },
                {
                  action: "switch_account",
                  label: "Use another Publik account",
                },
              ],
            },
            profile: {},
            claimURL: null,
          },
    }),
  );
  await page.route("**/api/logout", (r) => {
    signedIn = false;
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/resume", (r) => {
    signedIn = true;
    otherAccount = r.request().postDataJSON().forget === true;
    return r.fulfill({ json: { ok: true } });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByLabel("Timeline playhead").fill("0.9");
  await page.getByRole("button", { name: "Split" }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "My Edits", exact: true }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.locator(".m-header")).toBeVisible();
    await page.locator(".m-header .nav-sign-in").click();
    await expect(
      page.getByRole("heading", { name: "Welcome back", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continue with your Publik account" })
      .click();
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Allow AI processing?" }),
    ).toHaveCount(0);
    await expect(page.locator(".project-card")).toHaveCount(1);
    await page.locator(".project-card-title").click();
    await expect(page.locator(".timeline-clip")).toHaveCount(2);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect
      .poll(async () =>
        Number(await page.getByLabel("Timeline playhead").inputValue()),
      )
      .toBeGreaterThan(0.2);
  }
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.locator(".m-header .nav-sign-in").click();
  await page
    .getByRole("button", { name: "Use another Publik account" })
    .click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(0);
});

test("reference studio layout keeps monitor, source cards, caption lanes and audio within the desktop workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticated(page);
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({
      json: {
        words: [
          { word: "Hello.", start: 0.2, end: 0.6 },
          { word: "Keep", start: 1, end: 1.3 },
          { word: "creating.", start: 1.4, end: 1.8 },
          { word: "Today.", start: 2.5, end: 3 },
        ],
      },
    }),
  );
  await page.route("**/api/ai/edit", (r) => r.fulfill({ json: { cuts: [] } }));
  await openStudio(page);
  const buffer = await readFile(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "First take.mp4", mimeType: "video/mp4", buffer },
      { name: "Second take.mp4", mimeType: "video/mp4", buffer },
    ]);
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await expect(page.locator(".source-card")).toHaveCount(2);
  await expect(
    page.locator(".source-card .clip-frames span").first(),
  ).toBeVisible();
  await page.getByLabel("Search source media").fill("Second");
  await expect(page.locator(".source-card")).toHaveCount(1);
  await page.getByLabel("Search source media").fill("");
  await page
    .getByRole("button", { name: "Auto captions workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(6);
  await expect(page.locator(".text-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Audio workspace" }).click();
  await page
    .getByRole("button", { name: "Import audio", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/music.wav"));
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await expect(
    page.locator(".audio-row .source-waveform path"),
  ).toHaveAttribute("d", /^M/);
  await page.getByRole("button", { name: "Overlays workspace" }).click();
  await page
    .getByRole("button", { name: "Import overlay", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(page.locator(".overlay-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Media workspace" }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.locator(".text-row .sequence-item").first().click();
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      )
      .toBe(true);
    const left = (await page
      .getByRole("region", { name: "Media and tools" })
      .boundingBox())!;
    const monitor = (await page
      .getByRole("region", { name: "Video monitor" })
      .boundingBox())!;
    const inspector = (await page
      .getByRole("region", { name: "Editing inspector" })
      .boundingBox())!;
    const timeline = (await page
      .getByRole("region", { name: "Editing timeline" })
      .boundingBox())!;
    expect(left.x + left.width).toBeLessThanOrEqual(monitor.x);
    expect(monitor.x + monitor.width).toBeLessThanOrEqual(inspector.x);
    expect(timeline.y + timeline.height).toBeLessThanOrEqual(height + 1);
    expect(timeline.y).toBeGreaterThanOrEqual(monitor.y + monitor.height);
    const canvas = (await page
      .getByLabel("Video preview", { exact: true })
      .boundingBox())!;
    expect(canvas.height).toBeLessThan(monitor.height);
    expect(canvas.height).toBeGreaterThan(150);
    await page.screenshot({
      path: `outputs/studio-reference-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Auto captions workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Auto captions", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "outputs/studio-reference-mobile.png",
    fullPage: true,
  });
});

test("clip audio extraction preserves trim and speed, undo redo, reload and real export; pinch and help work", async ({
  page,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", async (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    await r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".timeline-clip .source-waveform")).toHaveCount(0);
  await expect(page.getByLabel("Timeline zoom", { exact: true })).toHaveCount(
    0,
  );
  const before = await page
    .locator(".timeline-clip")
    .evaluate((el) => el.getBoundingClientRect().width);
  await page.locator(".sequence-viewport").dispatchEvent("wheel", {
    deltaY: 30,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect
    .poll(() =>
      page
        .locator(".timeline-clip")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBeLessThan(before);
  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("dialog")).toContainText("Split");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const startGrip = page.getByRole("button", { name: /^Trim start of/ });
  const endGrip = page.getByRole("button", { name: /^Trim end of/ });
  for (let i = 0; i < 5; i++) await startGrip.press("ArrowRight");
  for (let i = 0; i < 10; i++) await endGrip.press("ArrowLeft");
  await expect.poll(() => saved?.document?.segments[0].start).toBeCloseTo(0.5);
  const trimmed = structuredClone(saved.document.segments[0]);
  await page.getByRole("slider", { name: /^Speed/ }).fill("1.5");
  await page
    .getByRole("button", { name: "Extract audio", exact: true })
    .click();
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1, {
    timeout: 30000,
  });
  await expect(
    page.locator(".audio-row .source-waveform path"),
  ).toHaveAttribute("d", /^M0 28/, { timeout: 10000 });
  await expect.poll(() => saved?.document?.audio?.length).toBe(1);
  const document = saved.document;
  expect(document.segments[0].volume).toBe(0);
  expect(document.audio[0].speed).toBe(1.5);
  expect(document.audio[0].sourceStart).toBeCloseTo(0.5);
  expect(document.audio[0].end).toBeCloseTo(
    (trimmed.end - trimmed.start) / 1.5,
    2,
  );
  expect(document.sources[document.audio[0].sourceIndex].kind).toBe("video");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(0);
  await page.keyboard.press("Control+Shift+Z");
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.locator(".project-card-title").click();
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("Export resolution").selectOption("854");
  const download = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await (await download).saveAs("outputs/extracted-audio-export.mp4");
  await expect(page.getByRole("status")).toContainText("MP4 exported");
});

test("portrait thumbnails retain their aspect ratio and fill video clips; playback is centered and tools have hover descriptions", async ({
  page,
}) => {
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=180x320:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440",
    "-t",
    "2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "outputs/portrait-fixture.mp4",
  ]);
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/portrait-fixture.mp4"));
  await sendUpload(page);
  for (const selector of [
    ".source-card .clip-frames span",
    ".timeline-clip .clip-frames span",
  ]) {
    await expect(page.locator(selector).first()).toBeVisible();
    const ratio = await page
      .locator(selector)
      .first()
      .evaluate(async (el) => {
        const image = new Image();
        image.src = getComputedStyle(el).backgroundImage.slice(5, -2);
        await image.decode();
        return {
          ratio: image.naturalWidth / image.naturalHeight,
          height: image.naturalHeight,
        };
      });
    expect(ratio.ratio).toBeCloseTo(180 / 320, 1);
    expect(ratio.height).toBeGreaterThanOrEqual(
      selector.startsWith(".source-card") ? 300 : 160,
    );
  }
  const clip = (await page.locator(".timeline-clip").boundingBox())!;
  const frames = (await page
    .locator(".timeline-clip .clip-frames")
    .boundingBox())!;
  expect(Math.abs(frames.height - clip.height)).toBeLessThanOrEqual(4);
  const monitor = (await page
    .getByRole("region", { name: "Video monitor" })
    .boundingBox())!;
  const play = (await page
    .getByRole("button", { name: "Play", exact: true })
    .boundingBox())!;
  expect(
    Math.abs(play.x + play.width / 2 - monitor.x - monitor.width / 2),
  ).toBeLessThan(2);
  await expect(
    page.getByRole("button", {
      name: /Back 5 seconds|Forward 5 seconds|Move clip left|Move clip right/,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".suite-tools")).toHaveCount(0);
  const rail = (await page.locator(".studio-tool-rail").boundingBox())!;
  const aiTool = (await page
    .getByRole("button", { name: "Open EditAI chat" })
    .boundingBox())!;
  expect(aiTool.x + aiTool.width).toBeLessThanOrEqual(rail.x + rail.width);

  await page.getByRole("button", { name: "Duplicate", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Duplicate");
  await page.mouse.move(600, 400);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.screenshot({
    path: "outputs/editor-refined-portrait.png",
    fullPage: true,
  });
});

test("Delete and Backspace remove selected clips, text and audio without deleting while typing", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  const buffer = await readFile(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "first.mp4", mimeType: "video/mp4", buffer },
      { name: "second.mp4", mimeType: "video/mp4", buffer },
    ]);
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text").fill("Typing stays safe");
  await page.getByLabel("Caption text").press("Backspace");
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(1);
  await page.locator(".text-row .sequence-item").click();
  await page.keyboard.press("Delete");
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Audio workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import audio", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/music.wav"));
  await page.locator(".audio-row .sequence-item").click();
  await page.keyboard.press("Backspace");
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(0);
  const lastClip = (await page.locator(".timeline-clip").last().boundingBox())!;
  await page.mouse.move(lastClip.x + 40, lastClip.y + 30);
  await page.mouse.down();
  await page.mouse.move(lastClip.x - 30, lastClip.y + 30, { steps: 5 });
  await expect(page.locator(".clip-drag-ghost")).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(page.locator(".clip-drag-ghost")).toHaveCount(0);
  await page.mouse.up();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.locator(".timeline-clip").click();
  await page.keyboard.press("Delete");
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
});

test("timeline drops import actual files and library sources; lifted reorder commits only inside and trim keeps frames fixed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticated(page);
  await openStudio(page);
  const buffer = await readFile(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "first.mp4", mimeType: "video/mp4", buffer },
      { name: "second.mp4", mimeType: "video/mp4", buffer },
    ]);
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  const names = () => page.locator(".timeline-clip > strong").allTextContents();
  const first = (await page.locator(".timeline-clip").first().boundingBox())!;
  const second = (await page.locator(".timeline-clip").last().boundingBox())!;
  const beginDrag = async () => {
    await page.mouse.move(first.x + 40, first.y + 35);
    await page.mouse.down();
    await page.mouse.move(second.x + second.width - 30, second.y + 35, {
      steps: 8,
    });
    await expect(page.locator(".clip-drag-ghost")).toContainText("first.mp4");
    await expect(page.locator(".timeline-drop-marker")).toBeVisible();
    expect(await names()).toEqual(["first.mp4", "second.mp4"]);
    await page.screenshot({
      path: "outputs/editor-drag-lifted.png",
      fullPage: true,
    });
  };
  await beginDrag();
  await page.mouse.move(700, 40);
  await page.mouse.up();
  await expect(page.locator(".clip-drag-ghost")).toHaveCount(0);
  expect(await names()).toEqual(["first.mp4", "second.mp4"]);
  await beginDrag();
  await page.mouse.up();
  await expect.poll(names).toEqual(["second.mp4", "first.mp4"]);
  const clip = page.locator(".timeline-clip").first();
  await clip.click({ position: { x: 40, y: 30 } });
  await expect(clip.locator(".clip-frames span").first()).toBeVisible();
  const filmWidth = await clip
    .locator(".frame-samples")
    .evaluate((el) => el.getBoundingClientRect().width);
  const grip = (await clip.locator(".trim-grip.end").boundingBox())!;
  await page.mouse.move(grip.x + 4, grip.y + 35);
  await page.mouse.down();
  await page.mouse.move(grip.x - 35, grip.y + 35, { steps: 6 });
  expect(
    await clip
      .locator(".frame-samples")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeCloseTo(filmWidth, 1);
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Media workspace", exact: true })
    .click();
  const row = page.locator(".main-row");
  await page
    .locator(".source-card")
    .first()
    .dragTo(row, { targetPosition: { x: 125, y: 35 } });
  await expect(page.locator(".timeline-clip")).toHaveCount(3);
  const data = await page.evaluateHandle(
    ({ bytes }) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File([new Uint8Array(bytes)], "desktop-import.mp4", {
          type: "video/mp4",
        }),
      );
      return dt;
    },
    { bytes: [...buffer] },
  );
  const bounds = (await row.boundingBox())!;
  await row.dispatchEvent("dragover", {
    dataTransfer: data,
    clientX: bounds.x + 125,
    clientY: bounds.y + 30,
  });
  await expect(page.locator(".timeline-drop-marker")).toBeVisible();
  await row.dispatchEvent("drop", {
    dataTransfer: data,
    clientX: bounds.x + 125,
    clientY: bounds.y + 30,
  });
  await expect(page.locator(".timeline-clip")).toHaveCount(4);
  await expect(page.locator(".source-card")).toHaveCount(3);
  expect(await names()).toContain("desktop-import.mp4");
  await expect(page.locator(".source-card > small").first()).toHaveText(
    /\d+(\.\d)? (KB|MB|B)/,
  );
  const audioBytes = await readFile(join(process.cwd(), "outputs/music.wav"));
  const audioData = await page.evaluateHandle(
    ({ bytes }) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File([new Uint8Array(bytes)], "desktop-sound.wav", {
          type: "audio/wav",
        }),
      );
      return dt;
    },
    { bytes: [...audioBytes] },
  );
  const audioRow = page.locator(".audio-row").first();
  const audioBounds = (await audioRow.boundingBox())!;
  await audioRow.dispatchEvent("drop", {
    dataTransfer: audioData,
    clientX: audioBounds.x + 125,
    clientY: audioBounds.y + 20,
  });
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await expect(page.locator(".audio-row .sequence-item")).toContainText(
    "desktop-sound.wav",
  );
  await expect(page.locator(".sequence-options")).toHaveCount(0);
  await expect(page.locator(".library-note")).toHaveCount(0);
  await page.screenshot({
    path: "outputs/editor-media-drop.png",
    fullPage: true,
  });
});

test("playback cursor moves at animation frame cadence and captions tool stays aligned on one line", async ({
  page,
}) => {
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-stream_loop",
    "15",
    "-i",
    "outputs/fixture.mp4",
    "-t",
    "60",
    "-c",
    "copy",
    "outputs/cursor-fixture.mp4",
  ]);
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/cursor-fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".timeline-clip .clip-frames span")).toHaveCount(
    12,
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const positions = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const positions: string[] = [];
        function tick() {
          positions.push(
            (document.querySelector(".sequence-playhead") as HTMLElement).style
              .transform,
          );
          if (positions.length >= 12) resolve(positions);
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }),
  );

  expect(new Set(positions).size).toBeGreaterThan(3);
  expect(
    new Set(positions).size,
    `cursor advances across ${positions.length} browser animation frames`,
  ).toBeGreaterThanOrEqual(Math.ceil(positions.length * 0.75));
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const cursor = (await page
    .locator(".sequence-playhead > span")
    .boundingBox())!;
  const oldTime = Number(
    await page.getByLabel("Timeline playhead", { exact: true }).inputValue(),
  );
  await page.mouse.move(cursor.x + cursor.width / 2, cursor.y + 3);
  await page.mouse.down();
  await page.mouse.move(cursor.x + 70, cursor.y + 3, { steps: 8 });
  await page.mouse.up();
  expect(
    Number(
      await page.getByLabel("Timeline playhead", { exact: true }).inputValue(),
    ),
  ).toBeGreaterThan(oldTime);
  const captions = page.getByRole("button", {
    name: "Auto captions workspace",
    exact: true,
  });
  await expect(captions.locator("span").last()).toHaveText("Auto");
  await expect(captions.locator(".premium-sparkle")).toHaveCount(0);
  const align = await page
    .locator(".studio-tool-rail .tool-icon")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(Math.max(...align) - Math.min(...align)).toBeLessThan(2);
});

test("clean selection, on-video text editing and edge resizing, immediate extraction, detailed zoom waveforms and transient notices", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticated(page);
  await openStudio(page);
  const buffer = await readFile(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "first.mp4", mimeType: "video/mp4", buffer },
      { name: "second.mp4", mimeType: "video/mp4", buffer },
    ]);
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await expect(
    page.locator(".timeline-clip").last().locator(".trim-grip"),
  ).toHaveCount(0);
  await page
    .locator(".timeline-clip")
    .last()
    .click({ position: { x: 50, y: 30 } });
  await expect(
    page.locator(".timeline-clip").last().locator(".trim-grip").first(),
  ).toHaveCSS("opacity", "1");
  expect(
    Number(
      await page.getByLabel("Timeline playhead", { exact: true }).inputValue(),
    ),
  ).toBeGreaterThan(4);
  await page.locator(".text-row").click({ position: { x: 400, y: 15 } });
  const position = Number(
    await page.getByLabel("Timeline playhead", { exact: true }).inputValue(),
  );
  expect(position).toBeGreaterThan(0);
  expect(position).toBeLessThan(4);
  await expect(page.locator(".preview-controls-top")).not.toContainText(
    "PREVIEW",
  );
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text", { exact: true }).fill("Tik tok sans");
  await expect(page.locator(".preview-selection")).toHaveCount(0);
  await page.locator(".text-row .sequence-item").click();
  await expect(page.locator(".preview-selection")).toHaveCount(0);
  const search = page.getByLabel("Search fonts", { exact: true });
  await search.fill("Bangers");
  await expect(
    page
      .getByRole("button", { name: "Use Bangers font", exact: true })
      .locator("span"),
  ).toHaveText("KAPOW!");
  await search.fill("TikTok");
  await expect(
    page
      .getByRole("button", { name: "Use TikTok Sans font", exact: true })
      .locator("span"),
  ).toHaveText("Storytime");
  await expect(
    page.getByRole("button", { name: "Use TikTok Sans font", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await search.fill("");
  const size = page.getByRole("spinbutton", {
    name: "Size value",
    exact: true,
  });
  await size.fill("0.2");
  await size.press("Enter");
  await selectPreviewText(page);
  // Reproduce an oversized font fitted into a short box, as in the owner's image.
  const selection = page.locator(".preview-selection");
  const frame = (await selection.boundingBox())!;
  const south = (await page
    .getByRole("button", {
      name: "Resize s edge of selected layer",
      exact: true,
    })
    .boundingBox())!;
  const canvas = page.getByLabel("Video preview", { exact: true });
  const videoBox = (await canvas.boundingBox())!;
  await page.mouse.move(south.x + south.width / 2, south.y + south.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    south.x + south.width / 2,
    south.y + south.height / 2 + videoBox.height * 0.18 - frame.height,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.mouse.move(10, 10);
  await page.evaluate(() => document.fonts.ready);
  const beforePixels = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  const beforeEdit = await canvas.screenshot({ caret: "hide" });
  const frameBefore = (await selection.boundingBox())!;
  await page
    .getByRole("button", { name: "Move selected layer", exact: true })
    .click();
  const editor = page.getByLabel("Edit text on video", { exact: true });
  await expect(editor).toBeFocused();
  expect(
    await editor.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).a,
    ),
  ).toBeLessThan(0.8);
  await expect(editor).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(editor).toHaveCSS("box-shadow", "none");
  expect((await editor.boundingBox())!.height).toBeLessThanOrEqual(
    frameBefore.height + 1,
  );
  expect(await selection.boundingBox()).toEqual(frameBefore);
  const duringEdit = await canvas.screenshot({ caret: "hide" });
  expect(
    Buffer.compare(beforeEdit, duringEdit),
    "entering typing must not change rendered text pixels",
  ).toBe(0);
  await editor.fill("Draft on the preview");
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .not.toBe(beforePixels);
  await editor.press("Escape");
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(beforePixels);
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "Tik tok sans",
  );
  await page.locator(".preview-text-hit").first().click();
  await editor.fill("Written on the preview");
  await page.screenshot({
    path: "outputs/editor-direct-text-edit.png",
    fullPage: true,
    caret: "hide",
  });
  await editor.press("Control+Enter");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "Written on the preview",
  );
  await canvas.click({ position: { x: 3, y: 3 } });
  await expect(selection).toHaveCount(0);
  await expect(page.locator(".text-row .sequence-item.selected")).toHaveCount(
    1,
  );
  await page.locator(".text-row .sequence-item").click();
  await expect(selection).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "Tik tok sans",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "Written on the preview",
  );
  await page.locator(".preview-text-hit").first().click();
  await editor.fill("Written on the preview live");
  await canvas.click({ position: { x: 3, y: 3 } });
  await expect(selection).toHaveCount(0);
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "Written on the preview live",
  );
  await selectPreviewText(page);
  await expect(page.locator(".preview-resize")).toHaveCount(0);
  const before = (await page.locator(".preview-selection").boundingBox())!;
  const corner = (await page
    .getByRole("button", { name: "Resize selected layer", exact: true })
    .boundingBox())!;
  await page.mouse.move(corner.x + 3, corner.y + 3);
  await page.mouse.down();
  await page.mouse.move(corner.x + 28, corner.y + 18, { steps: 5 });
  await page.mouse.up();
  expect(
    (await page.locator(".preview-selection").boundingBox())!.height,
  ).toBeGreaterThan(before.height);
  const edge = (await page
    .getByRole("button", {
      name: "Resize e edge of selected layer",
      exact: true,
    })
    .boundingBox())!;
  const oldWidth = (await page.locator(".preview-selection").boundingBox())!
    .width;
  await page.mouse.move(edge.x + 2, edge.y + 8);
  await page.mouse.down();
  await page.mouse.move(edge.x + 30, edge.y + 8, { steps: 5 });
  await page.mouse.up();
  expect(
    (await page.locator(".preview-selection").boundingBox())!.width,
  ).toBeGreaterThan(oldWidth);
  await page.screenshot({
    path: "outputs/editor-text-resize-handles.png",
    fullPage: true,
  });
  await page
    .locator(".timeline-clip")
    .first()
    .click({ position: { x: 100, y: 30 } });
  await page
    .getByRole("button", { name: "Extract audio", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".audio-row .sequence-item")).toHaveCount(1);
  await expect(page.locator(".audio-row .source-waveform")).toBeVisible();
  const initialPoints = Number(
    await page
      .locator(".audio-row .source-waveform")
      .getAttribute("data-points"),
  );
  await page.locator(".sequence-viewport").dispatchEvent("wheel", {
    ctrlKey: true,
    deltaY: 100,
    bubbles: true,
    cancelable: true,
  });
  const wave = page.locator(".audio-row .source-waveform");
  await expect
    .poll(async () => Number(await wave.getAttribute("data-points")))
    .toBeLessThan(initialPoints);
  const low = Number(await wave.getAttribute("data-points"));
  await page.locator(".sequence-viewport").dispatchEvent("wheel", {
    ctrlKey: true,
    deltaY: -100,
    bubbles: true,
    cancelable: true,
  });
  await expect
    .poll(async () => Number(await wave.getAttribute("data-points")))
    .toBeGreaterThan(low);
  await page.locator(".timeline-clip").last().click();
  await page.keyboard.press("Delete");
  await page.locator(".timeline-clip").click();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("status")).toContainText("Keep at least one");
  await expect(
    page.getByRole("button", { name: "Dismiss notification", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0, { timeout: 7000 });
});

test("selected inspector tabs, filter previews, safe section scrolling, slider resets, manual crop and overlay edge stretching", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await openStudio(page);
  const buffer = await readFile(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "one.mp4", mimeType: "video/mp4", buffer },
      { name: "two.mp4", mimeType: "video/mp4", buffer },
    ]);
  await sendUpload(page);
  await expect(
    page.getByRole("button", { name: "Layers", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Auto captions workspace" }),
  ).toHaveText("Auto");
  await expect(page.locator(".premium-sparkle")).toHaveCount(0);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await expect(
    page.locator(".visual-filters .filter-preview .clip-frames span").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Warm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Warm", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clear", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    const heading = page.locator(".advanced-adjustments > summary");
    await heading.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const h = (await heading.boundingBox())!,
          tabs = (await page.locator(".inspector-tabs").boundingBox())!,
          panel = (await page.locator(".inspector").boundingBox())!;
        return (
          h.y >= tabs.y + tabs.height + 5 &&
          h.y + h.height <= panel.y + panel.height
        );
      })
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  const exposure = page.getByRole("slider", { name: /^Exposure/ });
  await exposure.fill("0.4");
  await exposure.press("r");
  await expect(exposure).toHaveValue("0");
  const brilliance = page.getByRole("slider", { name: /^Brilliance/ });
  await brilliance.fill("0.5");
  await page.getByRole("button", { name: "Filter", exact: true }).focus();
  await brilliance.locator("..").hover();
  await page.keyboard.press("r");
  await expect(brilliance).toHaveValue("0");
  await page.getByRole("slider", { name: /^Contrast/ }).fill("1.5");
  await page
    .getByRole("button", { name: "Reset adjustments", exact: true })
    .click();
  await expect(page.getByRole("slider", { name: /^Contrast/ })).toHaveValue(
    "1",
  );
  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("dialog")).toContainText("Reset a slider");
  await expect(
    page
      .getByRole("dialog")
      .locator("dt")
      .filter({ hasText: /^Split$/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  const volume = (await page
      .getByRole("slider", { name: /^Volume/ })
      .boundingBox())!,
    extract = (await page
      .getByRole("button", { name: "Extract audio", exact: true })
      .boundingBox())!;
  expect(extract.y).toBeGreaterThan(volume.y);
  await page
    .getByRole("button", { name: "Crop on video", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await page.locator(".crop-selection").boundingBox())?.width ?? 0,
    )
    .toBeGreaterThan(100);
  const before = (await page.locator(".crop-selection").boundingBox())!;
  const corner = (await page
    .getByRole("button", { name: "Crop nw edge", exact: true })
    .boundingBox())!;
  await page.mouse.move(corner.x + 3, corner.y + 3);
  await page.mouse.down();
  await page.mouse.move(corner.x + 50, corner.y + 25, { steps: 5 });
  await page.mouse.up();
  expect(
    (await page.locator(".crop-selection").boundingBox())!.width,
  ).toBeLessThan(before.width);
  await page.locator(".crop-surface").dispatchEvent("wheel", {
    ctrlKey: true,
    deltaY: -50,
    cancelable: true,
    bubbles: true,
  });
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  await expect
    .poll(() => saved?.document?.segments[0].appearance.crop.width)
    .toBeLessThan(0.95);
  await page.getByRole("button", { name: "Reset crop", exact: true }).click();
  await expect
    .poll(() => saved?.document?.segments[0].appearance.crop.width)
    .toBe(1);
  await page.getByRole("button", { name: "Rotate 90°", exact: true }).click();
  await expect
    .poll(() => saved?.document?.segments[0].appearance.rotation)
    .toBe(1);
  await page.getByRole("button", { name: "Reset crop", exact: true }).click();
  await page.getByRole("button", { name: "Overlay", exact: true }).click();
  await expect(page.locator(".selected-media-settings")).toHaveCount(1);
  await expect(
    page.locator(".selected-media-settings .range-label"),
  ).toHaveCount(2);
  await expect(
    page.getByRole("spinbutton", { name: "Fade in value", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await expect(page.getByRole("slider", { name: /^Opacity/ })).toBeVisible();
  await page.getByRole("slider", { name: /^Opacity/ }).fill("0.6");
  await page.getByRole("slider", { name: /^Opacity/ }).press("r");
  await expect(page.getByRole("slider", { name: /^Opacity/ })).toHaveValue("1");
  const edge = (await page
    .getByRole("button", {
      name: "Resize e edge of selected layer",
      exact: true,
    })
    .boundingBox())!;
  const rect = (await page.locator(".preview-selection").boundingBox())!;
  await page.mouse.move(edge.x + 2, edge.y + 8);
  await page.mouse.down();
  await page.mouse.move(edge.x + 32, edge.y + 8, { steps: 5 });
  await page.mouse.up();
  const after = (await page.locator(".preview-selection").boundingBox())!;
  expect(after.width).toBeGreaterThan(rect.width);
  expect(after.height).toBeCloseTo(rect.height, 0);
  await page.screenshot({
    path: "outputs/editor-selected-inspector.png",
    fullPage: true,
  });
});

test("timeline toolbar, centered rename and inline microphone recording preserve real audio and current edits", async ({
  page,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", async (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    await r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.addInitScript(() => {
    let calls = 0;
    const devices = navigator.mediaDevices;
    Object.defineProperty(navigator, "mediaDevices", { value: devices });
    Object.defineProperty(devices, "getUserMedia", {
      value: async () => {
        if (calls++ === 0) throw new DOMException("Denied", "NotAllowedError");
        const c = new AudioContext();
        await c.resume();
        const oscillator = c.createOscillator();
        oscillator.frequency.value = 440;
        const target = c.createMediaStreamDestination();
        oscillator.connect(target);
        oscillator.start();
        return target.stream;
      },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      {
        name: "voice-base-one.mp4",
        mimeType: "video/mp4",
        buffer: await readFile(join(process.cwd(), "outputs/fixture.mp4")),
      },
      {
        name: "voice-base-two.mp4",
        mimeType: "video/mp4",
        buffer: await readFile(join(process.cwd(), "outputs/fixture.mp4")),
      },
    ]);
  await sendUpload(page);
  await expect(
    page.getByRole("button", { name: "Add media", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".editor-top")
      .getByRole("button", { name: "Undo", exact: true }),
  ).toHaveCount(0);
  const undo = (await page
    .getByRole("button", { name: "Undo", exact: true })
    .boundingBox())!;
  const split = (await page
    .getByRole("button", { name: "Split", exact: true })
    .boundingBox())!;
  expect(split.x).toBeGreaterThan(undo.x + 200);
  const title = page.locator(".project-title-button");
  const box = (await title.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
  await title.click();
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("My voice edit");
  await page.getByRole("textbox", { name: "Project name" }).press("Enter");
  await expect(title).toHaveText("My voice edit");
  await title.click();
  await page.getByRole("textbox", { name: "Project name" }).fill("cancel me");
  await page.getByRole("textbox", { name: "Project name" }).press("Escape");
  await expect(title).toHaveText("My voice edit");
  await page.getByLabel("Timeline playhead").fill("1");
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Microphone access was denied",
  );
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(page.locator(".voice-recorder")).toHaveClass(/is-recording/);
  await page.waitForTimeout(1100);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Caption text" })
    .fill("Keep this edit while recording");
  await page.waitForTimeout(1100);
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Record voice", exact: true }),
  ).toBeEnabled();
  await expect.poll(() => saved?.document?.audio.length).toBe(1);
  expect(saved.document.audio[0].start).toBeCloseTo(1, 1);
  expect(saved.document.texts[0].text).toBe("Keep this edit while recording");
  const source = saved.document.sources.at(-1);
  expect(source.kind).toBe("audio");
  expect(source.mime).toBe("audio/wav");
  expect(source.duration).toBeGreaterThan(1);
  await expect(page.locator(".audio-row .source-waveform")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".audio-row .layer-clip")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(() => saved?.document?.audio.length).toBe(1);
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "outputs/editor-voice-toolbar.png",
    fullPage: true,
  });
});

test("compact stepped sliders, display-only text, visual animations, custom colors, copy paste and void cleanup", async ({
  page,
}) => {
  await authenticated(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const heading = document
          .querySelector(".advanced-adjustments > summary")!
          .getBoundingClientRect();
        const reset = document
          .querySelector(".adjust-reset button")!
          .getBoundingClientRect();
        return Math.abs(
          heading.y + heading.height / 2 - reset.y - reset.height / 2,
        );
      }),
    )
    .toBeLessThan(15);
  const exposure = page.getByRole("slider", { name: /^Exposure/ });
  await expect(exposure).toHaveAttribute("step", "any");
  await expect(
    page.getByRole("spinbutton", { name: "Exposure value", exact: true }),
  ).toHaveCSS("border-top-width", "0px");
  await exposure.fill("0.12345");
  await expect(exposure).toHaveValue("0.12345");
  await exposure.fill("0.001");
  await exposure.dispatchEvent("pointerup", { altKey: false });
  await expect(exposure).toHaveValue("0");
  await exposure.fill("0.001");
  await exposure.dispatchEvent("pointerup", { altKey: true });
  await expect(exposure).toHaveValue("0.001");
  await expect(
    page.locator(".advanced-adjustments .range-ticks .major").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "outputs/editor-slider-increments.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const text = page.getByRole("textbox", { name: "Caption text", exact: true });
  await expect(text).toHaveValue("");
  await expect(text).toHaveAttribute("placeholder", "Text");
  await text.pressSequentially("Hello");
  await expect(text).toHaveValue("Hello");
  await page.locator(".motion-controls > summary").click();
  await page
    .getByRole("button", { name: "Animation: pop", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Animation: pop", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".animation-pop").first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "Text color hex", exact: true })
    .fill("#a12bf3");
  await expect(
    page.getByLabel("Custom text color", { exact: true }),
  ).toHaveValue("#a12bf3");
  await page.getByLabel("Timeline playhead", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect(page.locator(".text-row .layer-clip")).toHaveCount(2);
  await page.keyboard.press("Delete");
  await expect(page.locator(".text-row .layer-clip")).toHaveCount(1);
  await page.locator(".timeline-clip").click({ position: { x: 40, y: 30 } });
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  const layer = (await page.locator(".text-row .layer-clip").boundingBox())!;
  const video = (await page.locator(".timeline-clip").boundingBox())!;
  await page.mouse.move(layer.x + 20, layer.y + 16);
  await page.mouse.down();
  await page.mouse.move(video.x + video.width + 80, layer.y + 16, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.locator(".text-row .layer-clip")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".text-row .layer-clip")).toHaveCount(1);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  if ((await page.locator(".motion-controls").getAttribute("open")) === null)
    await page.locator(".motion-controls > summary").click();
  await page
    .getByRole("button", { name: "Animation: pop", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "outputs/editor-text-slider-polish.png",
    fullPage: true,
  });
});

test("editable numeric drafts, percentage units, magnetic sliders and independent overlay library", async ({
  page,
}) => {
  await authenticated(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(
    page.getByRole("button", { name: "Adjust workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters workspace" }),
  ).toHaveCount(0);
  await expect(page.getByText("Precision trim", { exact: true })).toHaveCount(
    0,
  );
  const volume = page.getByRole("spinbutton", {
    name: "Volume value",
    exact: true,
  });
  await expect(volume).toHaveValue("100");
  await volume.fill("");
  await expect(volume).toHaveValue("");
  await volume.fill("37");
  await volume.press("Enter");
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toHaveValue("0.37");
  await volume.fill("101");
  await volume.press("Tab");
  await expect(volume).toHaveValue("37");
  await volume.fill("");
  await volume.press("Tab");
  await expect(volume).toHaveValue("37");
  await volume.fill("18");
  await volume.press("Escape");
  await expect(volume).toHaveValue("37");
  const speed = page.getByRole("spinbutton", {
    name: "Speed value",
    exact: true,
  });
  await expect(speed.locator("..")).toContainText("x");
  await speed.fill("1.25");
  await speed.press("Enter");
  await expect(
    page.getByRole("slider", { name: "Speed", exact: true }),
  ).toHaveValue("1.25");
  await expect(page.locator(".range-wedge")).toHaveCount(1);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  const opacity = page.getByRole("spinbutton", {
    name: "Opacity value",
    exact: true,
  });
  await expect(opacity).toHaveValue("100");
  await opacity.fill("62.5");
  await opacity.press("Enter");
  await expect(
    page.getByRole("slider", { name: "Opacity", exact: true }),
  ).toHaveValue("0.625");
  const exposure = page.getByRole("slider", { name: "Exposure", exact: true });
  await exposure.scrollIntoViewIfNeeded();
  const box = (await exposure.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2, {
    steps: 3,
  });
  await expect(exposure).toHaveValue("0");
  await page.mouse.up();
  const exact = page.getByRole("spinbutton", {
    name: "Exposure value",
    exact: true,
  });
  await exact.fill("0.013");
  await exact.press("Enter");
  await expect(exposure).toHaveValue("0.013");
  await page
    .getByRole("button", { name: "Overlays workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Filter", exact: true }),
  ).toHaveClass("selected");
  await expect(
    page.getByRole("heading", { name: "Overlay media", exact: true }),
  ).toBeVisible();
  const search = page.getByRole("textbox", { name: "Search source media" });
  await search.focus();
  await expect(search).toHaveCSS("outline-style", "none");
  await expect(search).toHaveCSS("box-shadow", "none");
  await page
    .locator(".source-card")
    .first()
    .dragTo(page.locator("[data-track=overlays]").first());
  await expect(
    page.locator("[data-track=overlays] .sequence-item"),
  ).toHaveCount(1);
  await page
    .locator(".source-card")
    .first()
    .dragTo(page.locator("[data-track=segments]").first());
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  await page.screenshot({
    path: "outputs/editor-wedge-controls.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Crop", exact: true }).click();
  await expect(page.locator(".crop-selection")).toBeVisible();
});

test("caption-only grouping, source reference previews, relaxed-cut restoration and persistent Edits layouts", async ({
  page,
}) => {
  await authenticated(page);
  // Video-reference pacing now plans with measured target words before chat.
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({
      json: {
        words: [
          { word: "Recorded", start: 0.2, end: 0.5 },
          { word: "source", start: 0.6, end: 1 },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  let saved: any;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.route("**/api/ai/chat", (r) => {
    const request = r.request().postDataJSON();
    expect(request.prompt).toBe("Make the cuts more relaxed");
    return r.fulfill({
      json: {
        message: "Fixture: restored the source range.",
        generateCaptions: false,
        captionFormat: null,
        operations: [
          {
            kind: "trim",
            target: request.selectedClipID,
            start: 0,
            end: request.sourceDurations[0],
          },
        ],
      },
    });
  });
  await openStudio(page);
  await page.evaluate(() => {
    (window as any).loadingTitles = [];
    new MutationObserver(() => {
      const title = document.querySelector(".progress-modal h2")?.textContent;
      if (title) (window as any).loadingTitles.push(title);
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Caption grouping" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add text", exact: true }),
  ).toHaveCSS("color", "rgb(17, 24, 32)");
  await page.getByRole("button", { name: "Auto captions workspace" }).click();
  await expect(page.locator(".caption-generate-card")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await page
    .getByRole("combobox", { name: "Caption grouping" })
    .selectOption("single");
  await expect.poll(() => saved?.document?.captionFormat).toBe("single");
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Canvas aspect ratio" }),
  ).not.toBeVisible();
  await page.locator(".preview-canvas-options > summary").click();
  await expect(
    page.getByRole("combobox", { name: "Canvas aspect ratio" }),
  ).toBeVisible();
  await expect(page.locator(".preview-controls-top select")).toHaveCount(2);
  await page.locator(".preview-canvas-options > summary").click();
  const startGrip = page.getByRole("button", { name: /^Trim start of/ });
  for (let i = 0; i < 5; i++) await startGrip.press("ArrowRight");
  await expect.poll(() => saved?.document?.segments[0].start).toBeCloseTo(0.5);
  await page.getByRole("button", { name: "Open EditAI chat" }).click();
  const ai = page.getByRole("button", { name: "Open EditAI chat" });
  await expect(ai).toHaveCSS("margin-left", "0px");
  await expect(ai).toHaveCSS("box-shadow", "none");
  await expect(
    page.getByRole("button", { name: "Add captions", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("unsupported"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Choose an image or video reference",
  );
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(
    page.getByRole("img", { name: "overlay.png preview" }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await expect(
    page.getByRole("img", { name: "fixture.mp4 preview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Make the cuts more relaxed", exact: true })
    .click();
  await page.screenshot({
    path: "outputs/editor-ai-reference-polish.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "restored the source range",
  );
  await expect.poll(() => saved?.document?.segments[0].start).toBe(0);
  const loadingTitles = await page.evaluate(
    () => (window as any).loadingTitles as string[],
  );
  expect(
    loadingTitles.some((title) =>
      /Adding media|Opening|Importing|Saving|style reference/.test(title),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await expect(page.locator(".project-preview").first()).toHaveCSS(
    "aspect-ratio",
    "1 / 1",
  );
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".project-grid")).toHaveClass(/project-list/);
  await page.reload();
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "List view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  await expect(page.locator(".project-grid")).not.toHaveClass(/project-list/);
  await page.screenshot({
    path: "outputs/portrait-edits-grid.png",
    fullPage: true,
  });
});

test("nonmodal media import preserves text added while the source is decoding", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Media workspace" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await chooser;
  const bytes = [
    ...(await readFile(join(process.cwd(), "outputs/fixture.mp4"))),
  ];
  await page.evaluate((bytes) => {
    const input =
      document.querySelectorAll<HTMLInputElement>("input[type=file]")[1];
    const data = new DataTransfer();
    data.items.add(
      new File([new Uint8Array(bytes)], "second.mp4", { type: "video/mp4" }),
    );
    input.files = data.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    document
      .querySelector<HTMLButtonElement>('[aria-label="Add text"]')!
      .click();
  }, bytes);
  await expect(page.locator(".progress-modal")).toHaveCount(0);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(1);
});

test("restored rail shortcuts, volume-first controls, aligned ticks and compact square Edits", async ({
  page,
}) => {
  await authenticated(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(
    page.getByRole("button", { name: "Filters workspace" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Overlays workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Overlay media", exact: true }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Adjust workspace" }).click();
  await expect
    .poll(() =>
      adjustSection.evaluate((el) =>
        el.getAnimations().some((a) => a.id === "adjust-feedback"),
      ),
    )
    .toBe(true);

  const heading = page.locator(".advanced-adjustments > summary");
  await expect
    .poll(async () => {
      const h = (await heading.boundingBox())!,
        tabs = (await page.locator(".inspector-tabs").boundingBox())!;
      return h.y >= tabs.y + tabs.height && h.y < tabs.y + tabs.height + 60;
    })
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Filter", exact: true }),
  ).toHaveClass("selected");
  await expect(
    page.getByRole("heading", { name: "Overlay media", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  const volume = page.getByRole("slider", { name: "Volume", exact: true });
  const speed = page.getByRole("slider", { name: "Speed", exact: true });
  expect((await volume.boundingBox())!.y).toBeLessThan(
    (await speed.boundingBox())!.y,
  );
  await expect(volume.locator("../..")).toHaveClass(/range-wedge/);
  await expect(speed.locator("../..")).not.toHaveClass(/range-wedge/);
  const value = page.getByRole("spinbutton", {
    name: "Speed value",
    exact: true,
  });
  await value.fill("1.23");
  await value.press("Enter");
  await expect(speed).toHaveValue("1.23");
  await speed.press("ArrowRight");
  await expect(speed).toHaveValue("1.28");
  const geometry = await volume.evaluate((input) => {
    const control = input.parentElement!;
    const box = input.getBoundingClientRect();
    const axis = control.querySelector(".range-ticks")!.getBoundingClientRect();
    const marks = [
      ...control.querySelectorAll<HTMLElement>(".range-ticks .major"),
    ].map((mark) => {
      const rect = mark.getBoundingClientRect();
      return {
        fraction: parseFloat(mark.style.left) / 100,
        center: rect.x + rect.width / 2,
      };
    });
    const track = getComputedStyle(control, "::before");
    return {
      start: box.x + 4,
      width: box.width - 8,
      axisStart: axis.x,
      axisWidth: axis.width,
      trackLeft: track.left,
      trackRight: track.right,
      marks,
    };
  });
  expect(Math.abs(geometry.axisStart - geometry.start)).toBeLessThan(0.1);
  expect(
    Math.abs(geometry.axisWidth - geometry.width),
    JSON.stringify(geometry),
  ).toBeLessThan(0.1);
  expect(geometry.trackLeft).toBe("4px");
  expect(geometry.trackRight).toBe("4px");
  for (const mark of geometry.marks)
    expect(
      Math.abs(mark.center - geometry.start - mark.fraction * geometry.width),
    ).toBeLessThan(0.1);
  await page
    .getByRole("spinbutton", { name: "Volume value", exact: true })
    .fill("50");
  await page
    .getByRole("spinbutton", { name: "Volume value", exact: true })
    .press("Enter");
  await expect(volume).toHaveValue("0.5");
  await page.screenshot({
    path: "outputs/release027-aligned-sliders.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Upload clips", exact: true }),
  ).toHaveCount(0);
  const preview = page.locator(".project-preview").first();
  let box = (await preview.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(176);
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  await expect(preview.locator("video")).toHaveClass("frame-ready");
  await page.screenshot({
    path: "outputs/release027-compact-edits.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  box = (await preview.boundingBox())!;
  expect(box.width).toBeLessThan(125);
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  expect(
    await page
      .locator(".project-grid")
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(3);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  box = (await preview.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Upload clips", exact: true }).first(),
  ).toBeVisible();
});

test("compact shaped media, integer volume, row-local drops and permanent unused media removal", async ({
  page,
}) => {
  await authenticated(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  let saved: any;
  const deleted: string[] = [];
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.route("**/api/assets/*", (r) => {
    if (r.request().method() === "DELETE")
      deleted.push(r.request().url().split("/").at(-1)!);
    return r.fulfill({
      status: ["PUT", "DELETE"].includes(r.request().method()) ? 200 : 404,
      json: { ok: true },
    });
  });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      "outputs/fixture.mp4",
      "-vf",
      "scale=-2:480,crop=270:480",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "outputs/compact-portrait.mp4",
    ],
    { stdio: "ignore" },
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=1",
      "outputs/compact-audio.wav",
    ],
    { stdio: "ignore" },
  );
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      join(process.cwd(), "outputs/fixture.mp4"),
      join(process.cwd(), "outputs/compact-portrait.mp4"),
    ]);
  await sendUpload(page);
  await expect(page.locator(".source-card")).toHaveCount(2);
  const landscape = (await page
    .locator(".source-preview.video")
    .nth(0)
    .boundingBox())!;
  const portrait = (await page
    .locator(".source-preview.video")
    .nth(1)
    .boundingBox())!;
  expect(landscape.width).toBeLessThanOrEqual(136);
  expect(landscape.width).toBeGreaterThan(landscape.height);
  expect(portrait.height).toBeGreaterThan(portrait.width);
  expect(portrait.height).toBeLessThanOrEqual(210);
  const volumeValue = page.getByRole("spinbutton", {
    name: "Volume value",
    exact: true,
  });
  await volumeValue.fill("51.4");
  await volumeValue.press("Enter");
  await expect(volumeValue).toHaveValue("51");
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toHaveValue("0.51");
  await page.getByRole("button", { name: "Audio workspace" }).click();
  await page.getByRole("button", { name: "Import audio", exact: true }).click();
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/compact-audio.wav"));
  await expect(page.locator(".source-preview.audio")).toBeVisible();
  const audioBox = (await page.locator(".source-preview.audio").boundingBox())!;
  expect(audioBox.width).toBe(94);
  expect(audioBox.height).toBe(94);
  await page.getByRole("button", { name: "Media workspace" }).click();
  await expect.poll(() => saved?.document?.sources.length).toBe(3);
  await expect(page.locator(".source-append, .source-used")).toHaveCount(0);
  for (const preview of await page.locator(".source-preview").all()) {
    const box = (await preview.boundingBox())!;
    const kind = (await preview.locator(".source-kind").boundingBox())!;
    const time = (await preview.locator(".source-duration").boundingBox())!;
    const trash = (await preview.locator(".source-remove").boundingBox())!;
    expect(kind.x).toBeLessThan(box.x + box.width / 2);
    expect(kind.y).toBeLessThan(box.y + box.height / 2);
    expect(time.x).toBeLessThan(box.x + box.width / 2);
    expect(time.y).toBeGreaterThan(box.y + box.height / 2);
    expect(trash.x).toBeGreaterThan(box.x + box.width / 2);
    expect(trash.y).toBeGreaterThan(box.y + box.height / 2);
    await expect(preview.locator(".source-remove svg")).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
  }
  await page.getByRole("button", { name: "Open EditAI chat" }).click();
  await expect(page.locator(".editai-tool.selected svg").first()).toHaveCSS(
    "fill",
    "rgb(196, 224, 255)",
  );
  await page.getByRole("button", { name: "Media workspace" }).click();
  await expect(page.locator(".editai-tool.selected")).toHaveCount(0);
  const videoId = saved.document.sources[0].id;
  const transfer = await page.evaluateHandle((id) => {
    const data = new DataTransfer();
    data.setData("application/x-editai-source", id);
    data.setData("application/x-editai-kind-video", "1");
    return data;
  }, videoId);
  for (const track of ["overlays", "audio", "segments"]) {
    const row = page.locator(`.sequence-row[data-track="${track}"]`).first();
    const box = (await row.boundingBox())!;
    await row.dispatchEvent("dragover", {
      dataTransfer: transfer,
      clientX: box.x + 180,
      clientY: box.y + box.height / 2,
    });
    const marker = page.locator(".timeline-drop-marker");
    await expect(marker).toHaveAttribute("data-drop-track", track);
    const markerBox = (await marker.boundingBox())!;
    expect(markerBox.y).toBeGreaterThanOrEqual(box.y);
    expect(markerBox.height).toBeLessThanOrEqual(box.height);
    expect(markerBox.y + markerBox.height).toBeLessThanOrEqual(
      box.y + box.height,
    );
  }
  await page
    .locator(".sequence-viewport")
    .dispatchEvent("dragleave", { relatedTarget: null });
  await page.locator(".timeline-clip").nth(1).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".source-card")).toHaveCount(3);
  const sourceId = saved.document.sources.find(
    (s: any) => s.name === "compact-portrait.mp4",
  ).id;
  for (const label of ["Dismiss error", "Dismiss notification"])
    if (await page.getByRole("button", { name: label, exact: true }).count())
      await page.getByRole("button", { name: label, exact: true }).click();
  let dialogs = 0;
  page.on("dialog", (d) => {
    dialogs++;
    void d.dismiss();
  });
  await page
    .getByRole("button", {
      name: "Delete media compact-portrait.mp4",
      exact: true,
    })
    .click();
  await expect(page.locator(".source-card")).toHaveCount(2);
  await expect.poll(() => deleted).toContain(sourceId);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".toast")).toHaveCount(0);
  expect(dialogs).toBe(0);
  await expect(
    page.getByRole("button", { name: "Delete media fixture.mp4", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Timeline playhead", { exact: true }).fill("0");
  await expect
    .poll(() =>
      page
        .locator('canvas[aria-label="Video preview"]')
        .evaluate((node: HTMLCanvasElement) => {
          const pixel = node
            .getContext("2d")!
            .getImageData(
              Math.floor(node.width / 4),
              Math.floor(node.height / 4),
              1,
              1,
            ).data;
          return pixel[0] + pixel[1] + pixel[2];
        }),
    )
    .toBeGreaterThan(300);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".app-shell")).toHaveCSS("--lavender", "#2d2b40");
  await page.screenshot({
    path: "outputs/media-blue-library-drops.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".tool-card.lavender")).toHaveCSS(
    "background-color",
    "rgb(180, 164, 227)",
  );
  await expect(page.locator(".tool-card.lavender h3")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  await page.screenshot({
    path: "outputs/media-blue-home-dark.png",
    fullPage: true,
  });
});

test("automatic settings retain latest name and photo, retry failures, and scope all brand themes", async ({
  page,
  browserName,
}) => {
  await authenticated(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  let profile: Record<string, unknown> = {};
  let failNext = false;
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        ...session,
        profile: { ...session.profile, consentDecided: true, ...profile },
      },
    }),
  );
  await page.route("**/api/settings", async (r) => {
    const body = r.request().postDataJSON();
    writes.push(body);
    if (failNext) {
      failNext = false;
      return r.fulfill({
        status: 503,
        json: { error: "Settings temporarily unavailable" },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    profile = { ...profile, ...body };
    return r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/choice", (r) => {
    profile = { ...profile, choice: r.request().postDataJSON().choice };
    return r.fulfill({ json: { ok: true } });
  });
  await openStudio(page);
  await expect(
    page.getByText("Upload your raw takes here", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your edits", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".section-heading").getByRole("button", { name: "View" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Save (profile|preferences)$/ }),
  ).toHaveCount(0);
  await expect(page.getByText("Avatar color", { exact: true })).toHaveCount(0);
  const name = page.getByLabel("Display name");
  await name.fill("First draft");
  await expect.poll(() => writes.length).toBe(1);
  await name.fill("Latest name");
  await expect(page.getByRole("status")).toContainText("All changes saved");
  expect(profile.displayName).toBe("Latest name");
  await name.fill("Latest provider name");
  await page
    .getByRole("combobox", { name: /AI provider/ })
    .selectOption("publik");
  await expect(page.getByRole("combobox", { name: /AI provider/ })).toHaveValue(
    "publik",
  );
  await expect(name).toHaveValue("Latest provider name");
  await expect(page.getByRole("status")).toContainText("All changes saved");
  expect(profile.displayName).toBe("Latest provider name");

  await page.evaluate(() => {
    const decode = window.createImageBitmap;
    window.createImageBitmap = (async (
      ...args: Parameters<typeof createImageBitmap>
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return decode(...args);
    }) as typeof createImageBitmap;
  });
  await page
    .locator('input[type=file][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles("outputs/overlay.png");
  await name.fill("Name during photo upload");
  await expect(page.locator(".avatar-editor img")).toBeVisible();
  await expect.poll(() => typeof profile.avatar).toBe("string");
  expect(profile.displayName).toBe("Name during photo upload");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(name).toHaveValue("Name during photo upload");
  await expect(page.locator(".avatar-editor img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  expect(profile.avatar).toBeNull();
  failNext = true;
  await name.fill("Retry this name");
  await expect(page.getByRole("alert")).toContainText("couldn't be saved");
  await expect(name).toHaveValue("Retry this name");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  expect(profile.displayName).toBe("Retry this name");
  await page.getByRole("checkbox", { name: /Allow AI processing/ }).uncheck();
  await page.getByRole("checkbox", { name: /Share official usage/ }).check();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  expect(profile.consent).toBe(false);
  expect(profile.telemetry).toBe(true);
  for (const mode of ["Light", "Dark"]) {
    await page.getByRole("radio", { name: mode, exact: true }).check();
    await expect(page.getByRole("status")).toContainText("All changes saved");
    const unthemed = await page.locator(".app-shell").evaluate((el) => {
      const c = getComputedStyle(el);
      return [
        c.getPropertyValue("--action-gradient"),
        c.getPropertyValue("--control"),
        c.getPropertyValue("--canvas"),
      ];
    });
    for (const theme of [
      "EditAI",
      "Aurora",
      "Sunset",
      "Rose",
      "Ocean",
      "Forest",
      "Citrus",
      "Midnight",
    ]) {
      await page.getByRole("radio", { name: theme, exact: true }).check();
      const selected = await page.locator(".app-shell").evaluate((el) => {
        const c = getComputedStyle(el);
        return [
          c.getPropertyValue("--action-gradient"),
          c.getPropertyValue("--control"),
          c.getPropertyValue("--canvas"),
        ];
      });
      expect(selected).toEqual(unthemed);
      await page.getByRole("button", { name: "Home", exact: true }).click();
      const colors = await page.locator(".tool-card").evaluateAll((cards) =>
        cards.map((el) => ({
          bg: getComputedStyle(el).backgroundColor,
          fg: getComputedStyle(el.querySelector("h3")!).color,
        })),
      );
      expect(
        colors.every(
          ({ fg }) =>
            fg ===
            (theme === "Midnight" ? "rgb(255, 255, 255)" : "rgb(17, 17, 17)"),
        ),
      ).toBe(true);
      await page.screenshot({
        path: `outputs/settings-themes/${browserName}-${mode}-${theme}.png`,
      });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
    }
  }
  await page.locator("#app-language").selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.reload();
  await page.locator("[data-nav=settings]").click();
  await expect(page.locator("#app-language")).toHaveValue("es");
  await page.locator("#app-language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("radio", { name: "Midnight", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("App language")).toHaveValue("en");
  await expect(page.locator(".app-footer")).toHaveCount(0);
  await page.getByRole("radio", { name: "EditAI", exact: true }).check();
  await page.screenshot({
    path: `outputs/settings-themes/${browserName}-general-dark.png`,
  });
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.getByRole("status")).toContainText("All changes saved");
  await page.screenshot({
    path: `outputs/settings-themes/${browserName}-general-light.png`,
  });
});

test("video reference measures motion and audio locally, matches styled safe captions and localized speed beats in one undo", async ({
  page,
}) => {
  test.setTimeout(90000);
  await authenticated(page);
  let saved: any,
    request: any,
    speech = 0;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page.locator(".preview-canvas-options > summary").click();
  await page
    .getByRole("combobox", { name: "Canvas aspect ratio" })
    .selectOption("9:16");
  await page.locator(".preview-canvas-options > summary").click();
  await page.route("**/api/ai/transcribe", (r) => {
    speech++;
    return r.fulfill({
      json: {
        words: [
          { word: "Measured", start: 0.2, end: 0.7 },
          { word: "reference", start: 0.8, end: 1.3 },
          { word: "style", start: 1.5, end: 2 },
        ],
      },
    });
  });
  await page.route("**/api/ai/chat", (r) => {
    request = r.request().postDataJSON();
    return r.fulfill({
      json: {
        message: "Fixture: matched captions and brief emphasis.",
        generateCaptions: true,
        captionFormat: "single",
        operations: [
          {
            kind: "zoomRange",
            target: request.document.segments[0].id,
            start: 1.5,
            end: 2.5,
            value: 1.2,
            text: "pulse",
          },
          {
            kind: "speedRange",
            target: request.document.segments[0].id,
            start: 0.15,
            end: 1.4,
            value: 0.75,
          },
          {
            kind: "captionStyle",
            target: null,
            scope: "captions",
            style: {
              font: "tiktokClassic",
              fontWeight: 700,
              size: 0.08,
              horizontalPosition: 0.8,
              verticalPosition: 0.88,
              textBoxWidth: 0.8,
              background: "white",
              backgroundColor: { red: 1, green: 1, blue: 1 },
              backgroundPadding: 0.01,
              outline: "black",
              outlineWidth: 0.002,
              shadowOpacity: 0.4,
              shadowBlur: 0.002,
              shadowOffset: 0.001,
            },
          },
        ],
      },
    });
  });
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a style reference" }).click();
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await expect(
    page.getByRole("button", { name: "Remove reference" }),
  ).toBeVisible({ timeout: 45000 });
  expect(speech).toBe(0);
  await expect(page.locator(".reference-details")).toHaveCount(0);
  await expect(
    page.getByText("Text & placement · Pacing & cuts", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Keep text clear of social controls"),
  ).toHaveCount(0);
  await expect(page.locator(".reference-thumbnail")).toBeVisible();
  await expect(page.getByLabel("Message EditAI")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "Fixture: matched captions and brief emphasis.",
  );
  expect(speech).toBe(1);
  expect(request.document.words).toHaveLength(3);
  expect(request.prompt).toContain(
    "never copy the reference’s title or spoken words",
  );
  expect(request.prompt).toContain("slowdowns and zooms");
  expect(request.reference.kind).toBe("video");
  expect(
    request.reference.textObservations.some((o: any) =>
      /EditA[Il] browser test/.test(o.lines.join(" ")),
    ),
    JSON.stringify(request.reference.textObservations),
  ).toBe(true);
  expect(
    request.reference.frames.filter((f: any) => f.role === "motion").length,
  ).toBeGreaterThanOrEqual(7);
  expect(
    request.reference.frames.filter((f: any) => f.role === "fontGuide"),
  ).toHaveLength(1);
  expect(request.reference.frames.length).toBeLessThanOrEqual(18);
  expect(
    request.reference.frames.filter((f: any) => f.role === "detail").length,
  ).toBeGreaterThanOrEqual(8);
  expect(
    request.reference.frames.every((f: any) => f.base64JPEG.startsWith("/9j/")),
  ).toBe(true);
  expect(request.reference.temporal.sampleInterval).toBeLessThan(0.2);
  expect(["measured", "unavailable"]).toContain(request.reference.audio.status);
  expect(
    request.reference.frames.find((f: any) => f.role === "motion").times,
  ).toHaveLength(6);
  await expect
    .poll(() => saved?.document.segments.map((s: any) => s.speed))
    .toEqual([1, 0.75, 1, 1, 1]);
  expect(saved.document.segments[3].appearance.cameraZoom).toEqual({
    start: 1.5,
    end: 2.5,
    scale: 1.2,
    mode: "pulse",
  });
  expect(saved.document.words.map((w: any) => w.id)).toEqual(
    request.document.words.map((w: any) => w.id),
  );
  expect(
    saved.document.texts.every(
      (t: any) =>
        t.font === "TikTok Sans" &&
        t.fontWeight === 700 &&
        t.x < 0.95 &&
        t.y < 0.88 &&
        t.boxWidth <= 0.9,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".text-row .sequence-item")).toHaveCount(0);
});

test("Publik invalid timing recovers for first-cut and captions without recreating the completed job", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: { ...session, profile: { ...session.profile, choice: "publik" } },
    }),
  );
  let jobReads = 0,
    jobStarts = 0,
    alignments = 0,
    edits = 0,
    saved: any;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.route("**/api/ai/speech-source/*", (r) =>
    r.fulfill({ json: { id: "trx_existing_timing", pending: false } }),
  );
  await page.route("**/api/ai/transcription-job", (r) => {
    jobStarts++;
    return r.fulfill({
      status: 500,
      json: { error: "No new job should be started" },
    });
  });
  await page.route("**/api/ai/transcription-job/trx_existing_timing", (r) => {
    jobReads++;
    return r.fulfill({
      json: {
        id: "trx_existing_timing",
        status: "completed",
        words: [
          { word: "Speech", start: 0, end: 0 },
          { word: "exists", start: 2, end: 2 },
        ],
        text: "Speech exists",
      },
    });
  });
  await page.route("**/api/ai/transcribe", (r) => {
    alignments++;
    const form = r.request().postDataBuffer()!.toString("latin1");
    expect(form).toContain('name="alignmentJob"');
    expect(form).toContain("trx_existing_timing");
    expect(form).toContain('name="sourceId"');
    return r.fulfill({
      json: {
        words: [
          { word: "Measured", start: 0.2, end: 0.7 },
          { word: "speech", start: 0.8, end: 1.3 },
          { word: "ready", start: 1.6, end: 2 },
        ],
      },
    });
  });
  await page.route("**/api/ai/edit", (r) => {
    edits++;
    const words = r.request().postDataJSON().words;
    expect(words.map((w: any) => w.text)).toEqual([
      "Measured",
      "speech",
      "ready",
    ]);
    return r.fulfill({
      json: { cuts: [{ firstWord: words[1].id, lastWord: words[1].id }] },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  expect(jobStarts).toBe(0);
  expect(jobReads).toBe(1);
  expect(alignments).toBe(1);
  expect(edits).toBe(1);
  await page
    .getByRole("button", { name: "Auto captions workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-row .sequence-item")).not.toHaveCount(0);
  expect(alignments).toBe(1);
  expect(jobReads).toBe(1);
  await expect.poll(() => saved?.document.sources[0].transcribed).toBe(true);
  const ids = saved.document.words.map((w: any) => w.id);
  await page.reload();
  expect(new Set(ids).size).toBe(3);
});

test("Publik speech recovery resumes after a later section fails and keeps accepted word IDs", async ({
  page,
}) => {
  test.setTimeout(120000);
  const recoveryFile = join(
    process.cwd(),
    "outputs",
    `recovery-long-${process.pid}.mp4`,
  );
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-stream_loop",
    "-1",
    "-i",
    "outputs/fixture.mp4",
    "-t",
    "125",
    "-c",
    "copy",
    recoveryFile,
  ]);
  await authenticated(page);
  await openStudio(page);
  await page.locator("input[type=file]").first().setInputFiles(recoveryFile);
  await sendUpload(page);
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: { ...session, profile: { ...session.profile, choice: "publik" } },
    }),
  );
  // Refresh the provider choice through the existing authenticated session route.
  await page.reload();
  await page.locator(".project-card-title").first().click();
  let reads = 0,
    failed = false,
    saved: any;
  const offsets: number[] = [];
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await page.route("**/api/ai/speech-source/*", (r) =>
    r.fulfill({ json: { id: "trx_resume_timing", pending: false } }),
  );
  await page.route("**/api/ai/transcription-job/trx_resume_timing", (r) => {
    reads++;
    return r.fulfill({
      json: {
        status: "completed",
        words: [{ word: "Unaligned", start: 0, end: 0 }],
        text: "Unaligned",
      },
    });
  });
  await page.route("**/api/ai/transcribe", (r) => {
    const form = r.request().postDataBuffer()!.toString("latin1");
    const offset = Number(/name="offset"\r\n\r\n([^\r]+)/.exec(form)?.[1]);
    offsets.push(offset);
    if (offset === 100 && !failed) {
      failed = true;
      return r.fulfill({
        status: 503,
        json: { error: "Fixture: later section interrupted" },
      });
    }
    return r.fulfill({
      json: {
        words: [
          { word: offset === 0 ? "First" : "Last", start: 0.2, end: 0.6 },
          { word: "section", start: 0.7, end: 1.2 },
        ],
      },
    });
  });
  await page
    .getByRole("button", { name: "Auto captions workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "later section interrupted",
    { timeout: 60000 },
  );
  await expect
    .poll(() => saved?.document.sources[0].speechAlignment?.until)
    .toBe(100);
  const firstIDs = saved.document.words.map((w: any) => w.id);
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-row .sequence-item")).not.toHaveCount(0, {
    timeout: 60000,
  });
  await expect.poll(() => saved?.document.sources[0].transcribed).toBe(true);
  expect(offsets).toEqual([0, 100, 100]);
  expect(reads).toBe(1);
  expect(saved.document.words.slice(0, 2).map((w: any) => w.id)).toEqual(
    firstIDs,
  );
  expect(saved.document.words[2].start).toBeCloseTo(100.2);
  expect(saved.document.words).toHaveLength(4);
});

test("reference titles keep inline outlines and separate heights while brief chat and sequential captions use distinct rows", async ({
  page,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() === "POST") saved = r.request().postDataJSON();
    return r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page.locator(".preview-canvas-options > summary").click();
  await page
    .getByRole("combobox", { name: "Canvas aspect ratio" })
    .selectOption("9:16");
  await page.locator(".preview-canvas-options > summary").click();
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({
      json: {
        words: Array.from({ length: 10 }, (_, i) => ({
          word: "Word",
          start: 0.2 + i * 0.2,
          end: 0.4 + i * 0.2,
        })),
      },
    }),
  );
  await page.route("**/api/ai/chat", (r) =>
    r.fulfill({
      json: {
        message:
          "Matched the reference title and captions. " +
          "Unnecessary internal analysis. ".repeat(40),
        generateCaptions: true,
        captionFormat: "single",
        operations: [
          {
            kind: "addText",
            text: "Community College\nHorror Story",
            start: 0,
            end: 3,
            style: {
              font: "tiktokClassic",
              fontWeight: 600,
              size: 0.075,
              horizontalPosition: 0.5,
              verticalPosition: 0.29,
              textBoxWidth: 0.85,
              outline: "black",
              outlineWidth: 0.006,
              shadowOpacity: 0,
            },
          },
          {
            kind: "captionStyle",
            scope: "captions",
            style: {
              font: "tiktokClassic",
              fontWeight: 500,
              size: 0.05,
              horizontalPosition: 0.5,
              verticalPosition: 0.77,
              textBoxWidth: 0.8,
              outline: "black",
              outlineWidth: 0.003,
              shadowOpacity: 0,
            },
          },
        ],
      },
    }),
  );
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .nth(2)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(
    page.getByRole("button", { name: "Remove reference" }),
  ).toBeVisible();
  await page
    .getByLabel("Message EditAI")
    .fill("Match this reference title and captions");
  await page.getByLabel("Message EditAI").press("Enter");
  await expect(page.locator(".message.assistant")).toHaveText(
    "Matched the reference title and captions.",
  );
  await expect(page.locator(".auto-caption-row")).toHaveCount(1);
  await expect(page.locator(".manual-text-row")).toHaveCount(1);
  await expect(page.locator(".auto-caption-row .sequence-item")).toHaveCount(
    10,
  );
  await expect(page.locator(".manual-text-row")).toContainText(
    "Community College",
  );
  await expect
    .poll(
      () =>
        saved?.document.texts.filter((t: any) => t.kind === "caption").length,
    )
    .toBe(10);
  const title = saved.document.texts.find((t: any) => t.kind === "text");
  expect(title.y).toBeCloseTo(0.29);
  expect(title.outlineWidth).toBe(0.006);
  expect(title.outline).toBe(true);
  expect(title.font).toBe("TikTok Sans");
  expect(
    saved.document.texts
      .filter((t: any) => t.kind === "caption")
      .every((t: any) => Math.abs(t.y - 0.77) < 0.0001),
  ).toBe(true);
  await expect(page.locator(".message.user")).toHaveCSS(
    "align-self",
    /(?:flex|flow)-end/,
  );
  await expect(page.locator(".message.assistant")).toHaveCSS(
    "align-self",
    /(?:flex|flow)-start/,
  );
  const panel = (await page.locator(".chat-panel").boundingBox())!;
  const sendButton = (await page
    .getByRole("button", { name: "Send message", exact: true })
    .boundingBox())!;
  expect(sendButton.y + sendButton.height).toBeLessThanOrEqual(
    panel.y + panel.height + 2,
  );
  await page.getByLabel("Timeline playhead", { exact: true }).fill("0.3");
  await page.screenshot({
    path: "outputs/reference-title-captions-separated.png",
    fullPage: true,
  }); // The real bundled font is measured against observed reference ink; calibration
  // fixes guessed sizing without changing target wording or unrelated captions.
  await page.route("**/api/ai/chat", (r) =>
    r.fulfill({
      json: {
        message: "Matched the measured layout.",
        generateCaptions: false,
        captionFormat: null,
        referenceLayouts: [
          {
            scope: "text",
            lines: ["Community College", "Horror Story"],
            left: 0.18,
            top: 0.18,
            right: 0.82,
            bottom: 0.28,
            strokeWidth: 0.012,
          },
        ],
        operations: [
          {
            kind: "captionStyle",
            target: title.id,
            style: { size: 0.04, outlineWidth: 0.002 },
          },
        ],
      },
    }),
  );
  await page
    .getByLabel("Message EditAI")
    .fill("Match the measured title layout");
  await page.getByLabel("Message EditAI").press("Enter");
  await expect(page.locator(".message.assistant").last()).toHaveText(
    "Matched the measured layout.",
  );
  await expect
    .poll(
      () =>
        saved.document.texts.find((t: any) => t.id === title.id)?.outlineWidth,
    )
    .toBe(0.012);
  const measured = saved.document.texts.find((t: any) => t.id === title.id);
  expect(measured.size).toBeGreaterThan(0.06);
  expect(measured.x).toBeCloseTo(0.5);
  expect(measured.y).toBeCloseTo(0.23, 1);
  expect(measured.text).toBe("Community College\nHorror Story");
  expect(
    saved.document.texts
      .filter((t: any) => t.kind === "caption")
      .every((t: any) => Math.abs(t.y - 0.77) < 0.0001),
  ).toBe(true);
});

test("same-source hard cuts keep decoded color frames and export without animation-frame callbacks", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    // Deterministic export must not depend on recording the live preview.
    window.MediaRecorder = class {
      constructor() {
        throw Error("Playback capture must not be used for export");
      }
    } as any;
  });
  const fixture = join(
    process.cwd(),
    "outputs",
    `cuts-colors-${process.pid}.mp4`,
  );
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=red:s=320x180:r=30:d=1",
    "-f",
    "lavfi",
    "-i",
    "color=green:s=320x180:r=30:d=1",
    "-f",
    "lavfi",
    "-i",
    "color=blue:s=320x180:r=30:d=1",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=3",
    "-filter_complex",
    "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]",
    "-map",
    "[v]",
    "-map",
    "3:a",
    "-c:v",
    "libx264",
    "-g",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    fixture,
  ]);
  await authenticated(page);
  await openStudio(page);
  const bytes = await readFile(fixture);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "Color A.mp4", mimeType: "video/mp4", buffer: bytes },
      { name: "Color B.mp4", mimeType: "video/mp4", buffer: bytes },
    ]);
  await sendUpload(page);
  await page.route("**/api/ai/chat", (r) => {
    const d = r.request().postDataJSON().document;
    return r.fulfill({
      json: {
        message: "Fixture: cut sequence.",
        generateCaptions: false,
        captionFormat: null,
        operations: [
          { kind: "trim", target: d.segments[0].id, start: 0, end: 0.7 },
          { kind: "delete", target: d.segments[1].id },
          ...[2, 1, 0, 2, 1].map((start, index) => ({
            kind: "addClip",
            start,
            end: start + 0.7,
            media: { source: [0, 1, 0, 1, 1][index] },
          })),
        ],
      },
    });
  });
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page.getByLabel("Message EditAI").fill("Fixture cut sequence");
  await page.getByLabel("Message EditAI").press("Enter");
  await expect(page.locator(".timeline-clip")).toHaveCount(6);
  await expect
    .poll(() =>
      page
        .getByLabel("Video preview", { exact: true })
        .evaluate((c: HTMLCanvasElement) => {
          const p = c
            .getContext("2d")!
            .getImageData(c.width / 2, c.height / 2, 1, 1).data;
          return p[0];
        }),
    )
    .toBeGreaterThan(180);
  await page.evaluate(() => {
    const c = document.querySelector(
      'canvas[aria-label="Video preview"]',
    ) as HTMLCanvasElement;
    (window as any).cutPixels = [];
    (window as any).cutTimer = setInterval(() => {
      const p = c
        .getContext("2d")!
        .getImageData(c.width / 2, c.height / 2, 1, 1).data;
      (window as any).cutPixels.push([...p]);
    }, 20);
  });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  const pixels = await page.evaluate(() => {
    clearInterval((window as any).cutTimer);
    return (window as any).cutPixels as number[][];
  });
  expect(pixels.length).toBeGreaterThan(50);
  const order = pixels
    .map((p) => p.slice(0, 3).indexOf(Math.max(...p.slice(0, 3))))
    .filter((c, i, all) => i === 0 || c !== all[i - 1]);
  expect(order).toEqual([0, 2, 1, 0, 2, 1]);
  expect(pixels.filter((p) => Math.max(...p.slice(0, 3)) < 60)).toHaveLength(0);
  for (let channel = 0; channel < 3; channel++)
    expect(
      pixels.some(
        (p) =>
          p[channel] > 100 &&
          p[channel] > p[(channel + 1) % 3] * 1.5 &&
          p[channel] > p[(channel + 2) % 3] * 1.5,
      ),
    ).toBe(true);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Export resolution|Resolution/ })
    .selectOption("854");
  // Changing export resolution rebuilds the monitor decoder; wait until the
  // same paused green end-frame is decoded before observing export itself.
  await expect
    .poll(() =>
      page
        .getByLabel("Video preview", { exact: true })
        .evaluate((c: HTMLCanvasElement) => {
          const p = c
            .getContext("2d")!
            .getImageData(c.width / 2, c.height / 2, 1, 1).data;
          return p[1] > p[0] * 1.5 && p[1] > p[2] * 1.5;
        }),
    )
    .toBe(true);
  await page.evaluate(() => {
    (window as any).savedRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
  });
  const download = page.waitForEvent("download", { timeout: 60000 });
  await page.evaluate(() => {
    const canvas = document.querySelector(
      'canvas[aria-label="Video preview"]',
    ) as HTMLCanvasElement;
    const pixel = () =>
      Array.from(
        canvas
          .getContext("2d")!
          .getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data,
      ).join(",");
    const before = pixel();
    (window as any).exportPreviewChanges = 0;
    (window as any).exportPreviewWatch = setInterval(() => {
      if (pixel() !== before) (window as any).exportPreviewChanges++;
    }, 20);
  });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    (window as any).exportHidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => Boolean((window as any).exportHidden),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    (window as any).exportHidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const file = await download;
  const changes = await page.evaluate(() => {
    clearInterval((window as any).exportPreviewWatch);
    return (window as any).exportPreviewChanges;
  });
  expect(changes).toBe(0);
  const output = join(
    process.cwd(),
    "outputs",
    `cuts-export-${process.pid}.mp4`,
  );
  await file.saveAs(output);
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name",
        "-of",
        "json",
        output,
      ],
      { encoding: "utf8" },
    ),
  );
  expect(Math.abs(Number(probe.format.duration) - 4.2)).toBeLessThan(0.35);
  expect(probe.streams.some((s: any) => s.codec_name === "aac")).toBe(true);
  const raw = execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    output,
    "-vf",
    "scale=1:1",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-",
  ]);
  const frames = Array.from({ length: raw.length / 3 }, (_, i) => [
    raw[i * 3],
    raw[i * 3 + 1],
    raw[i * 3 + 2],
  ]);
  expect(frames.filter((p) => Math.max(...p) < 60)).toHaveLength(0);
  await page.evaluate(() => {
    window.requestAnimationFrame = (window as any).savedRAF;
  });
});

test("blank timeline deselects clips and new text starts with Medium TikTok Sans first", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await sendUpload(page);
  await page.locator(".timeline-clip").first().click();
  await expect(page.locator(".timeline-clip.selected")).toHaveCount(1);
  await page
    .locator(".overlay-row")
    .first()
    .click({ position: { x: 250, y: 20 } });
  await expect(page.locator(".timeline-clip.selected")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await expect(
    page.locator(".font-preview-grid").first().locator("button").first(),
  ).toHaveAttribute("aria-label", "Use TikTok Sans font");
  await expect(page.getByLabel("Font weight", { exact: true })).toHaveValue(
    "500",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(
    page.getByText(
      "Exports save to your browser’s download location. Export speed depends on your device. Export is SDR.",
      { exact: true },
    ),
  ).toHaveCount(0);
});

test("first cut keeps clean monotonic progress and finishes after leaving processing", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({
      json: {
        words: [
          { word: "Hello", start: 0.2, end: 0.6 },
          { word: "story.", start: 1, end: 1.4 },
        ],
      },
    }),
  );
  let release!: () => void;
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  let requests = 0;
  await page.route("**/api/ai/edit", async (r) => {
    requests++;
    await waiting;
    await r.fulfill({ json: { cuts: [] } });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  const activity = page.locator(".upload-activity");
  await expect(activity).toHaveAttribute("role", "progressbar");
  await expect(activity).toHaveAttribute("aria-valuenow", /^\d+$/);
  await expect(page.locator(".upload-completed-tasks,.upload-elapsed")).toHaveCount(0);
  await expect(page.locator(".upload-percentage")).toContainText("Estimated progress");
  await page.evaluate(() => {
    const values: number[] = [];
    (window as any).uploadPercentages = values;
    new MutationObserver(() => {
      const value = Number(document.querySelector(".upload-activity")?.getAttribute("aria-valuenow"));
      if (Number.isFinite(value) && values.at(-1) !== value) values.push(value);
    }).observe(document.querySelector(".upload-activity")!, { attributes: true, attributeFilter: ["aria-valuenow"] });
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).uploadPercentages.length))
    .toBeGreaterThan(6);
  const percentages: number[] = await page.evaluate(() => (window as any).uploadPercentages);
  expect(percentages.every((value, index) => value > 0 && value < 100 && (!index || value === percentages[index - 1] + 1))).toBe(true);
  await page.screenshot({ path: "outputs/progress-percentage.png" });
  await page
    .getByRole("button", { name: "Continue editing in background" })
    .click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  release();
  await expect(
    page.getByText("Your first cut is ready.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await page.getByRole("button", { name: "View edit", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await expect(page.locator(".topbar strong")).toHaveText("fixture");
  expect(requests).toBe(1);
});

test("reopening the browser recovers a completed automatic edit without another paid submission", async ({
  page,
}) => {
  await authenticated(page);
  let transcriptions = 0,
    edits = 0,
    complete = false;
  await page.route("**/api/ai/transcribe", (r) => {
    transcriptions++;
    return r.fulfill({
      json: {
        words: [
          { word: "Hello", start: 0.2, end: 0.6 },
          { word: "story.", start: 1, end: 1.4 },
        ],
      },
    });
  });
  await page.route("**/api/ai/edit-job/*", (r) =>
    r.fulfill({
      json: complete
        ? { state: "complete", result: { cuts: [] } }
        : { state: "missing" },
    }),
  );
  let release!: () => void;
  const blocked = new Promise<void>((r) => (release = r));
  await page.route("**/api/ai/edit", async (r) => {
    edits++;
    await blocked;
    await r.fulfill({ json: { cuts: [] } }).catch(() => {});
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => edits).toBe(1);
  complete = true;
  await page.reload();
  release();
  try {
    await expect(
      page.getByText("Your first cut is ready.", { exact: false }),
    ).toBeVisible({ timeout: 30000 });
  } catch (error) {
    console.log(
      "Synthetic reload task state",
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const opening = indexedDB.open("editai-studio");
            opening.onsuccess = () => {
              const request = opening.result
                .transaction("projects")
                .objectStore("projects")
                .getAll();
              request.onsuccess = () => {
                resolve(request.result.map((p) => p.firstCutTask));
                opening.result.close();
              };
            };
          }),
      ),
    );
    throw error;
  }
  expect(transcriptions).toBe(1);
  expect(edits).toBe(1);
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await page.getByRole("button", { name: "Open fixture", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
});

test("background EditAI returns Home and saves its validated edit before reopening", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({ json: { words: [{ word: "Hello", start: 0.2, end: 0.6 }] } }),
  );
  await page.route("**/api/ai/edit", (r) => r.fulfill({ json: { cuts: [] } }));
  let release!: () => void,
    requested = false;
  const blocked = new Promise<void>((r) => (release = r));
  await page.route("**/api/ai/chat", async (r) => {
    const body = r.request().postDataJSON();
    requested = true;
    await blocked;
    await r.fulfill({
      json: {
        message: "Trimmed the ending.",
        generateCaptions: false,
        captionFormat: null,
        operations: [
          {
            kind: "trim",
            target: body.document.segments[0].id,
            start: 0,
            end: 2,
          },
        ],
      },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await sendUpload(page);
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await page
    .getByLabel("Message EditAI", { exact: true })
    .fill("Trim the ending");
  await page.getByLabel("Message EditAI", { exact: true }).press("Enter");
  await expect.poll(() => requested).toBe(true);
  await expect(page.locator(".typing-bubble")).toBeVisible();
  await expect(page.locator(".progress-modal")).toHaveCount(0);
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.locator(".timeline-clip")).toHaveCount(0);
  const status = page.locator(".operation-status");
  await expect(status).toBeVisible();
  const mascotBox = await status.locator(".editai-mascot").boundingBox();
  const copyBox = await status.locator("p").boundingBox();
  expect(copyBox!.x).toBeGreaterThan(mascotBox!.x + mascotBox!.width);
  release();
  await expect(
    page.getByText("EditAI finished. Your changes are saved in Edits.", {
      exact: true,
    }),
  ).toBeVisible();
  const end = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const opening = indexedDB.open("editai-studio");
        opening.onsuccess = () => {
          const request = opening.result
            .transaction("projects")
            .objectStore("projects")
            .getAll();
          request.onsuccess = () => {
            resolve(request.result[0].document.segments[0].end);
            opening.result.close();
          };
        };
      }),
  );
  expect(end).toBe(2);
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await page.getByRole("button", { name: "Open fixture", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
});

for (const autoCut of [true, false])
  for (const addCaptions of [false, true]) {
    test(`Send options independently apply cut=${autoCut}, captions=${addCaptions}`, async ({
      page,
    }) => {
      await authenticated(page);
      let speech = 0,
        cuts = 0;
      await page.route("**/api/ai/transcribe", (r) => {
        speech++;
        return r.fulfill({
          json: {
            words: [
              { word: "Clear", start: 0.4, end: 1 },
              { word: "speech", start: 1.1, end: 1.8 },
            ],
            text: "Clear speech",
          },
        });
      });
      await page.route("**/api/ai/edit", (r) => {
        cuts++;
        return r.fulfill({ json: { cuts: [] } });
      });
      await openStudio(page);
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles("outputs/fixture.mp4");
      await expect(
        page.getByRole("checkbox", { name: "Auto Cut", exact: true }),
      ).toBeChecked();
      await expect(
        page.getByRole("checkbox", { name: "Add Captions" }),
      ).not.toBeChecked();
      const option = page.getByRole("checkbox", {
        name: "Auto Cut",
        exact: true,
      });
      const optionBox = await option.boundingBox();
      const sendBox = await page
        .getByRole("button", { name: "Send", exact: true })
        .boundingBox();
      expect(optionBox!.y).toBeGreaterThan(sendBox!.y + sendBox!.height);
      expect(optionBox!.width).toBeGreaterThanOrEqual(28);
      await expect(option).toHaveCSS("border-radius", "50%");
      await option.setChecked(autoCut);
      await page
        .getByRole("checkbox", { name: "Add Captions" })
        .setChecked(addCaptions);
      await sendUpload(page);
      await expect(
        page.getByRole("button", { name: "Split", exact: true }),
      ).toBeVisible();
      expect(speech).toBe(autoCut || addCaptions ? 1 : 0);
      expect(cuts).toBe(autoCut ? 1 : 0);
      await expect(
        page.locator(".auto-caption-row .sequence-item"),
      ).toHaveCount(addCaptions ? 1 : 0);
    });
  }

test("Analyze and Transcribe run on upload, retain results on Stay, and discard temporary media on exit", async ({
  page,
  browserName,
}) => {
  await authenticated(page);
  let releaseSpeech!: () => void;
  const heldSpeech = new Promise<void>((resolve) => {
    releaseSpeech = resolve;
  });
  let speech = 0,
    summaries = 0,
    writes = 0;
  await page.route("**/api/projects", (r) => {
    if (r.request().method() !== "GET") writes++;
    return r.fulfill({ json: { projects: [] } });
  });
  await page.route("**/api/ai/transcribe", async (r) => {
    speech++;
    if (speech === 1) await heldSpeech;
    return r.fulfill({
      json: {
        words: [
          { word: "A", start: 0.2, end: 0.4 },
          { word: "clear", start: 0.5, end: 0.9 },
          { word: "message", start: 1, end: 1.5 },
        ],
        text: "A clear message",
      },
    });
  });
  await page.route("**/api/ai/summary", (r) => {
    summaries++;
    return r.fulfill({
      json: {
        summary: "A useful summary",
        hook: "A clear hook",
        highlights: ["A key moment"],
      },
    });
  });
  const portrait = `outputs/workflow-tool-portrait-${browserName}.mp4`;
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    "outputs/fixture.mp4",
    "-vf",
    "transpose=1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    portrait,
  ]);
  await openStudio(page);
  await page.getByRole("button", { name: /^Analyze\b/ }).click();
  await page.locator('input[type="file"]').first().setInputFiles(portrait);
  const processing = page.locator(".progress-modal");
  await expect(
    processing.getByRole("heading", { name: "Analyzing video", exact: true }),
  ).toBeVisible();
  await expect(processing.locator(".processing-filename")).toContainText(
    "workflow-tool-portrait",
  );
  await expect(
    processing.getByRole("button", {
      name: "Continue in background",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(processing.getByRole("progressbar")).toHaveCSS(
    "border-radius",
    "999px",
  );
  await expect(processing).not.toContainText("original footage stays safe");
  await page.locator(".modal-backdrop").click({ position: { x: 5, y: 5 } });
  await expect(
    page.getByRole("dialog", { name: "Leave this page?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(processing).toBeVisible();
  releaseSpeech();
  await expect(page.getByText("A useful summary", { exact: true })).toBeVisible(
    { timeout: 120000 },
  );
  await expect(
    page.getByRole("heading", { name: "Analyze", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open in editor" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Analyze video", exact: true }),
  ).toHaveCount(0);
  expect(speech).toBe(1);
  expect(summaries).toBe(1);
  expect(writes).toBe(0);
  const media = await page
    .locator(".analysis-video")
    .evaluate((v: HTMLVideoElement) => ({
      width: v.getBoundingClientRect().width,
      height: v.getBoundingClientRect().height,
      ratio: v.videoWidth / v.videoHeight,
    }));
  expect(media.width / media.height).toBeCloseTo(media.ratio, 2);
  expect(media.ratio).toBeCloseTo(9 / 16, 2);
  const videoBox = await page.locator(".analysis-video").boundingBox(),
    summaryBox = await page.locator(".summary-card").boundingBox();
  expect(summaryBox!.x).toBeGreaterThan(videoBox!.x + videoBox!.width);
  await page.screenshot({
    path: "outputs/workflow-analyze.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Leave this page?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(
    page.getByText("A useful summary", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("checkbox", { name: "Don’t show again" }).check();
  await page.getByRole("button", { name: "Leave page", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(0);
  await page.getByRole("button", { name: /^Transcribe\b/ }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await expect(
    page.getByRole("button", { name: "Copy transcript", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  expect(speech).toBe(2);
  expect(summaries).toBe(1);
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const count = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("editai-studio");
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    if (!db.objectStoreNames.contains("media")) return -1;
    return new Promise<number>((resolve) => {
      const r = db.transaction("media").objectStore("media").count();
      r.onsuccess = () => resolve(r.result);
    });
  });
  expect(count).toBe(0);
});

test("Home welcomes the first name, uses compact cards, and exposes Flip camera only on mobile", async ({
  page,
}) => {
  await authenticated(page);
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        ...session,
        profile: { ...session.profile, displayName: "Alex Rivera" },
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome, Alex", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Upload your clips here, we do the rest", { exact: true }),
  ).toBeVisible();
  for (const title of ["Record", "Batch", "Analyze", "Transcribe"]) {
    const tile = page
      .locator(".tool-card")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    const icon = await tile.locator(".tool-card-icon").boundingBox(),
      heading = await tile.getByRole("heading").boundingBox();
    expect(heading!.x).toBeGreaterThan(icon!.x + icon!.width);
    expect(
      Math.abs(heading!.y + heading!.height / 2 - icon!.y - icon!.height / 2),
    ).toBeLessThan(2);
  }
  await page.screenshot({ path: "outputs/workflow-home.png", fullPage: true });
  await page.getByRole("button", { name: /^Record\b/ }).click();
  await expect(page.getByRole("button", { name: "Flip camera" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile",
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, Alex", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Record\b/ }).click();
  await expect(page.getByRole("button", { name: "Flip camera" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Flip camera" })).toHaveText(
    "",
  );
});

test("saved profile names skip onboarding, survive reload and update Home from Settings without allowing an empty name", async ({
  page,
}) => {
  await authenticated(page);
  let displayName = "Jadon";
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        ...session,
        profile: { ...session.profile, displayName, needsName: false },
      },
    }),
  );
  await page.route("**/api/settings", (r) => {
    const body = r.request().postDataJSON();
    if (typeof body.displayName === "string") {
      if (!body.displayName.trim() || body.displayName.length > 80)
        return r.fulfill({
          status: 400,
          json: { error: "Name is required (80 characters maximum)." },
        });
      displayName = body.displayName.trim();
    }
    return r.fulfill({ json: { ok: true } });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome, Jadon", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Who runs this studio?" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const field = page.getByRole("textbox", {
    name: "Display name",
    exact: true,
  });
  await expect(field).toHaveAttribute("required", "");
  await expect(field).toHaveAttribute("maxlength", "80");
  await field.fill("Jade Creator");
  await expect(page.locator(".settings-save-state")).toContainText(
    "All changes saved",
  );
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Jade", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, Jade", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await field.clear();
  await expect(page.locator(".settings-save-state")).toContainText(
    "Name is required",
  );
  expect(displayName).toBe("Jade Creator");
  await field.fill("Jadon");
  await expect(page.locator(".settings-save-state")).toContainText(
    "All changes saved",
  );
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Jadon", exact: true }),
  ).toBeVisible();
});

test("Home icons stack like the website, pulse separate waveform bars and twinkle stationary stars", async ({
  page,
  context,
}) => {
  await authenticated(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStudio(page);
  await expect(page.locator(".quick-tools .ice")).toContainText(
    "Record your ideas",
  );
  const batch = page.locator(".quick-tools .lavender");
  await batch.hover();
  const choreography = await batch.locator("svg").evaluate((svg) => ({
    root: getComputedStyle(svg).animationName,
    layers: [...svg.querySelectorAll("path")].map((path) => {
      const animation = path.getAnimations()[0];
      animation.pause();
      const timing = animation.effect!.getTiming();
      animation.currentTime = Number(timing.delay) + Number(timing.duration);
      return {
        duration: timing.duration,
        delay: timing.delay,
        easing: timing.easing,
        finalOpacity: getComputedStyle(path).opacity,
      };
    }),
  }));
  expect(choreography.root).toBe("none");
  expect(choreography.layers).toHaveLength(3);
  expect(choreography.layers.map((layer) => layer.finalOpacity)).toEqual([
    "1",
    "1",
    "1",
  ]);
  const marketing = await context.newPage();
  await marketing.setExtraHTTPHeaders({ DNT: "1" });
  await marketing.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
  await marketing.emulateMedia({ reducedMotion: "no-preference" });
  await marketing.goto("/");
  const reference = marketing.locator('.orbit-feature[data-feature="batch"]');
  await reference.hover();
  await expect(marketing.locator(".feature-orbit-detail")).toContainText(
    "Queue up to 10",
  );
  await expect(marketing.locator(".feature-orbit")).toHaveAttribute(
    "data-paused",
    "true",
  );
  await marketing.close();

  const wave = page.locator(".quick-tools .mint");
  await wave.hover();
  const amplitude = await wave.locator("svg").evaluate((svg) => ({
    root: getComputedStyle(svg).animationName,
    bars: [...svg.querySelectorAll("path")].map((path) => {
      const animation = path.getAnimations()[0];
      animation.pause();
      const timing = animation.effect!.getTiming(),
        delay = Number(timing.delay),
        duration = Number(timing.duration);
      animation.currentTime = delay + duration * 0.45;
      const low = new DOMMatrixReadOnly(getComputedStyle(path).transform);
      animation.currentTime = delay + duration * 0.72;
      const high = new DOMMatrixReadOnly(getComputedStyle(path).transform);
      return {
        x: high.a,
        low: low.d,
        high: high.d,
        rotation: high.b,
        horizontalShift: high.e,
      };
    }),
  }));
  expect(amplitude.root).toBe("none");
  expect(amplitude.bars).toHaveLength(6);
  for (const bar of amplitude.bars) {
    expect(bar.x).toBe(1);
    expect(bar.low).toBeCloseTo(0.55, 2);
    expect(bar.high).toBeCloseTo(1.25, 2);
    expect(bar.rotation).toBe(0);
    expect(bar.horizontalShift).toBe(0);
  }
  const analyze = page.locator(".quick-tools .peach");
  await analyze.hover();
  const twinkle = await analyze.locator("svg").evaluate((svg) => ({
    root: getComputedStyle(svg).animationName,
    stars: [...svg.querySelectorAll(".action-star")].map((path) => {
      const animation = path.getAnimations()[0];
      animation.pause();
      const timing = animation.effect!.getTiming();
      animation.currentTime =
        Number(timing.delay) + Number(timing.duration) * 0.17;
      const peak = new DOMMatrixReadOnly(getComputedStyle(path).transform);
      animation.currentTime =
        Number(timing.delay) + Number(timing.duration) * 0.42;
      const rest = new DOMMatrixReadOnly(getComputedStyle(path).transform);
      return {
        x: peak.a,
        y: peak.d,
        rotation: peak.b,
        shift: peak.e,
        rest: rest.a,
      };
    }),
  }));
  expect(twinkle.root).toBe("none");
  expect(twinkle.stars).toHaveLength(3);
  for (const star of twinkle.stars) {
    expect(star.x).toBeGreaterThan(1.1);
    expect(star.x).toBeLessThan(1.3);
    expect(star.x).toBeCloseTo(star.y, 3);
    expect(star.rotation).toBe(0);
    expect(star.shift).toBe(0);
    expect(star.rest).toBeCloseTo(1, 3);
  }
  await page.screenshot({ path: "outputs/action-star-preview.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const card of [batch, wave, analyze]) {
    await card.hover();
    await expect
      .poll(() =>
        card
          .locator("svg")
          .evaluate((svg) => svg.getAnimations({ subtree: true }).length),
      )
      .toBe(0);
  }
});

test("blue time-savings action converts editing into free time using five minutes per video without changing the rest of the month", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    localStorage.setItem(
      "editai-studio-onboarding-v1",
      JSON.stringify({
        step: "estimate",
        answers: { editingTime: ["3 to 6 hours"], volume: ["3 to 5 a week"] },
      }),
    ),
  );
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Back to EditAI" })).toHaveCount(
    0,
  );
  await expect(
    page.locator(".sign-in-header").getByRole("link", { name: "EditAI home" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replay animation" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Estimated time you currently spend editing, based on your weekly answer.",
    ),
  ).toHaveCount(0);
  const button = page.getByRole("button", {
    name: "Show how much time I will save",
    exact: true,
  });
  await expect(button).toBeEnabled();
  await expect(button).toHaveCSS("background-image", /linear-gradient/);
  await expect(page.locator(".studio-onboarding-hour-grid span")).toHaveCount(
    720,
  );
  await button.click();
  await expect(
    page.locator(".monthly-time-legend [data-activity=saved] strong"),
  ).toHaveAttribute("data-minutes", "1115");
  await expect(
    page.locator(".monthly-time-legend [data-activity=editing] strong"),
  ).toHaveAttribute("data-minutes", "85");
  await expect(
    page.locator(".monthly-time-legend [data-activity=editing] small"),
  ).toHaveCount(0);
  const allocations = await page
    .locator(".monthly-time-legend strong")
    .evaluateAll((nodes) =>
      nodes.reduce(
        (total, node) => total + Number((node as HTMLElement).dataset.minutes),
        0,
      ),
    );
  expect(allocations).toBe(720 * 60);
  await expect(
    page.locator(".monthly-time-legend [data-activity=editing] i"),
  ).toHaveCSS("background-color", "rgb(108, 187, 147)");
  const painted = await page
    .locator(".studio-onboarding-hour-grid span")
    .evaluateAll((cells) => ({
      editing: cells.reduce(
        (total, node) =>
          total + Number((node as HTMLElement).dataset.editingMinutes || 0),
        0,
      ),
      saved: cells.reduce(
        (total, node) =>
          total + Number((node as HTMLElement).dataset.savedMinutes || 0),
        0,
      ),
    }));
  expect(painted).toEqual({ editing: 85, saved: 1115 });
  await expect(
    page.locator('.studio-onboarding-hour-grid [data-activity="sleep"]'),
  ).toHaveCount(240);
  await page.screenshot({
    path: "outputs/time-savings-graph.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Show current time", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Personal care", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Build my studio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue to sign in", exact: true }),
  ).toBeVisible();
});

test("mascot chat uses the saved photo, inline cancellable typing and reduced motion without blocking playback", async ({
  page,
  browserName,
}) => {
  await authenticated(page);
  const photo =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#4b9ed8"/></svg>',
    );
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        ...session,
        profile: {
          ...session.profile,
          displayName: "Casey",
          avatar: photo,
          consentDecided: true,
        },
      },
    }),
  );
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({ json: { words: [{ word: "Hello", start: 0.2, end: 0.6 }] } }),
  );
  await page.route("**/api/ai/edit", (r) => r.fulfill({ json: { cuts: [] } }));
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  let calls = 0;
  await page.route("**/api/ai/chat", async (r) => {
    calls++;
    if (calls === 1) {
      await held;
      await r
        .fulfill({
          json: {
            message: "Cancelled fixture",
            generateCaptions: false,
            operations: [],
          },
        })
        .catch(() => {});
    } else if (calls === 2)
      await r.fulfill({
        status: 503,
        json: { error: "Fixture request failed" },
      });
    else
      await r.fulfill({
        json: {
          message: "Made it warmer.",
          generateCaptions: false,
          captionFormat: null,
          operations: [],
        },
      });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStudio(page);
  const home = page.getByRole("button", { name: "Meet Eva", exact: true });
  await expect(home.locator(".mascot-eyes")).toHaveCSS(
    "animation-name",
    "mascot-blink",
  );
  await home.hover();
  await expect(home.locator(".mascot-eyes")).toHaveCSS(
    "animation-name",
    "mascot-blink",
  );
  await home.click();
  await expect(home).toHaveAttribute("data-greeting", "true");
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `outputs/mascot/home-${browserName}.png` });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await sendUpload(page);
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  const input = page.getByLabel("Message EditAI", { exact: true });
  await input.fill("Make it warmer");
  await input.press("Enter");
  await expect(page.locator(".typing-bubble")).toBeVisible();
  await expect(page.locator(".progress-modal")).toHaveCount(0);
  await expect(
    page.locator(".chat-message-row.user .avatar img"),
  ).toHaveAttribute("src", photo);
  await expect(page.locator(".typing-row .editai-mascot")).toHaveAttribute(
    "data-state",
    "working",
  );
  await expect(page.locator(".typing-dots i")).toHaveCount(3);
  await expect(page.locator(".typing-dots i").first()).toHaveCSS(
    "animation-name",
    "chat-typing",
  );
  await expect(page.locator(".typing-row .mascot-eyes")).toHaveCSS(
    "animation-name",
    "mascot-blink",
  );
  await expect(page.locator(".typing-row .mascot-sparkles")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.screenshot({
    path: `outputs/mascot/chat-working-${browserName}.png`,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".typing-row .mascot-eyes")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".typing-dots i").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "Cancel EditAI request", exact: true })
    .click();
  await expect(page.locator(".typing-bubble")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  release();
  await input.press("ArrowUp");
  await expect(input).toHaveValue("Make it warmer");
  await input.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Fixture request failed");
  await expect(page.locator(".typing-bubble")).toHaveCount(0);
  await input.fill("Try again");
  await input.press("Enter");
  await expect(page.locator(".message.assistant")).toHaveText(
    "Made it warmer.",
  );
  await expect(
    page.locator(".chat-message-row.assistant .editai-mascot"),
  ).toHaveCount(1);
  await expect(page.locator(".typing-bubble")).toHaveCount(0);
});

test("reference mascot uses two-frame waving, quick expressions, streak blush, headphone plays and Home shadow", async ({
  page,
}) => {
  await authenticated(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStudio(page);
  await verifyReferenceMascot(
    page,
    page.locator(".home-mascot .editai-mascot"),
  );
});

test("Eva studio groups slider undo, anchors tooltips, aligns resets and bounds timeline resizing", async ({
  page,
}) => {
  const { verifyEvaStudio } = await import("./eva-acceptance");
  await page.setViewportSize({ width: 1440, height: 960 });
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("checkbox", { name: "Auto Cut", exact: true }).uncheck();
  await sendUpload(page);
  await verifyEvaStudio(page);
  await page.screenshot({ path: "outputs/eva-studio/editor.png" });
  await page.setViewportSize({ width: 1440, height: 640 });
  const handle = page.getByRole("separator", {
    name: "Resize timeline",
    exact: true,
  });
  await expect
    .poll(async () => Number(await handle.getAttribute("aria-valuemax")))
    .toBeLessThanOrEqual(404);
  await handle.press("End");
  expect(
    Number(await handle.getAttribute("aria-valuenow")),
  ).toBeLessThanOrEqual(404);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(handle).toBeHidden();
});

test("theme palettes color dark Home tiles and Eva stays on light logo colors in every mode", async ({
  page,
}) => {
  const { verifyEvaThemes } = await import("./theme-rotation-acceptance");
  await page.setViewportSize({ width: 1440, height: 960 });
  await authenticated(page);
  await page.route("**/api/settings", (r) => r.fulfill({ json: { ok: true } }));
  await openStudio(page);
  await verifyEvaThemes(page);
});

test("overlay breakaway corner rotation previews, undoes and survives an actual compositor export", async ({
  page,
  browserName,
}) => {
  const { verifyOverlayRotation } = await import("./theme-rotation-acceptance");
  await page.setViewportSize({ width: 1440, height: 960 });
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("checkbox", { name: "Auto Cut", exact: true }).uncheck();
  await sendUpload(page);
  await page
    .getByRole("button", { name: "Overlays workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import overlay", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(page.locator(".overlay-row .sequence-item")).toHaveCount(1);
  await verifyOverlayRotation(page);
  await page.getByLabel("Timeline playhead", { exact: true }).fill("1");
  await page.screenshot({
    path: `outputs/eva-gesture/${browserName}-rotation.png`,
  });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Resolution|Export resolution/i })
    .selectOption("854");
  const download = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await (
    await download
  ).saveAs(`outputs/eva-gesture/${browserName}-rotation.mp4`);
  await expect(page.getByRole("status")).toContainText("MP4 exported");
  const { verifyExportedRotation } =
    await import("./theme-rotation-acceptance");
  await verifyExportedRotation(
    `outputs/eva-gesture/${browserName}-rotation.mp4`,
    10,
  );
  await page.getByRole("button", { name: "My Edits", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open fixture", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open fixture", exact: true }).click();
  await page.locator(".overlay-row .sequence-item").click();
  const selection = page.locator(".preview-selection");
  const angle = await selection.evaluate((e) => {
    const m = new DOMMatrix(getComputedStyle(e).transform);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  });
  expect(angle).toBeCloseTo(10, 0);
});

test("settings show compact columns, live non-waving Eva and account deletion", async ({
  page,
  browserName,
}) => {
  await authenticated(page);
  await page.route("**/api/settings", (r) => r.fulfill({ json: { ok: true } }));
  let deleted = 0;
  await page.route("**/api/account", (r) => {
    expect(r.request().method()).toBe("DELETE");
    deleted++;
    return r.fulfill({ json: { ok: true } });
  });
  await openStudio(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByText("Projects & storage", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download project metadata" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("App language")).toHaveValue("auto");
  await expect(
    page.getByLabel("App language").locator("option:checked"),
  ).toHaveText("Detected automatically (English)");
  const eva = page.locator(".settings-eva-preview .editai-mascot");
  await expect(eva).toHaveAttribute("data-ready", "true");
  await eva.hover();
  await expect(eva).not.toHaveAttribute("data-interacting", "true");
  for (const theme of [
    "EditAI",
    "Aurora",
    "Sunset",
    "Rose",
    "Ocean",
    "Forest",
    "Citrus",
    "Midnight",
  ]) {
    await page.getByRole("radio", { name: theme, exact: true }).check();
    await expect(eva).toHaveAttribute(
      "data-eva-theme",
      theme === "EditAI" ? "editAI" : theme.toLowerCase(),
    );
    await expect(
      page.getByRole("radio", { name: theme, exact: true }),
    ).toBeInViewport();
  }
  const columns = await page.locator(".settings-column").count();
  expect(columns).toBe(2);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const mode of ["Light", "Dark", "System"]) {
      await page.getByRole("radio", { name: mode, exact: true }).check();
      await expect(
        page.getByRole("radio", { name: mode, exact: true }),
      ).toBeChecked();
    }
    const bounds = await page
      .locator(".settings-column")
      .nth(1)
      .locator(".settings-card")
      .evaluateAll((cards) =>
        cards.map((c) => {
          const b = c.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom };
        }),
      );
    expect(Math.round(bounds[1].top - bounds[0].bottom)).toBe(20);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `outputs/settings-refresh/${browserName}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const code of ["es", "fr", "de", "it", "pt", "zh", "ja", "ko", "en"]) {
    await page.locator("#app-language").selectOption(code);
    await expect(page.locator("html")).toHaveAttribute("lang", code);
    if (code !== "en") {
      const locale = JSON.parse(
        await readFile(`lib/editor/locales/${code}.json`, "utf8"),
      );
      await expect(page.locator(".appearance-card h2")).toHaveText(
        locale.Appearance,
      );
      await expect(
        page.locator(".general-account-actions .danger-link"),
      ).toHaveText(locale["Delete my account"]);
    }
  }
  await page.locator("#app-language").selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.reload();
  await page.locator("[data-nav=settings]").click();
  await expect(page.locator("#app-language")).toHaveValue("es");
  await page.locator("#app-language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const feedback = page.getByRole("button", {
    name: "Feedback & help",
    exact: true,
  });
  await expect(feedback).toHaveClass(/button secondary/);
  const actionBounds = await Promise.all([
    feedback.boundingBox(),
    page
      .getByRole("button", { name: "Delete my account", exact: true })
      .boundingBox(),
  ]);
  expect(actionBounds[0]!.x).toBe(actionBounds[1]!.x);
  await feedback.click();
  await expect(
    page.getByRole("dialog", { name: "Contact support", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close support", exact: true })
    .click();
  const deletion = page.getByRole("dialog", {
    name: "Delete your EditAI account?",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  await expect(deletion).toContainText(
    "Publik account and plan will remain active",
  );
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(deleted).toBe(0);
  await page
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  const reloaded = page.waitForEvent("framenavigated", {
    predicate: (frame) => frame === page.mainFrame(),
  });
  await deletion
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  await reloaded;
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect.poll(() => deleted).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("editai-preferences") || "{}")
            .language || "auto",
      ),
    )
    .toBe("auto");
});

test("automatic interface language follows source content and manual choice preserves project names", async ({
  page,
}) => {
  await authenticated(page);
  const spanish =
    "Hoy vamos a explicar cómo preparar este proyecto y compartir una historia sobre nuestras vacaciones con toda la familia.";
  const words = spanish.split(" ").map((text, i) => ({
    id: `0:${i}`,
    clip: 0,
    start: i,
    end: i + 0.8,
    text,
  }));
  await page.route("**/api/projects", (r) =>
    r.fulfill({
      json: {
        projects: [
          {
            id: "language-test-project",
            title: "Settings",
            updated_at: Date.now(),
            document: JSON.stringify({
              sources: [],
              segments: [],
              text: [],
              overlays: [],
              audio: [],
              words,
              canvas: "original",
              framing: "fit",
              captionFormat: "standard",
            }),
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.locator("[data-nav=settings]").click();
  await expect(page.locator("#app-language")).toHaveValue("auto");
  await expect(page.locator("#app-language option:checked")).toContainText(
    "Español",
  );
  await expect(page.locator(".appearance-card h2")).toHaveText("Apariencia");
  await page.locator("#app-language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator("[data-nav=library]").click();
  await expect(
    page.getByRole("button", { name: "Open Settings", exact: true }),
  ).toBeVisible();
  await page.locator("[data-nav=settings]").click();
  await page.locator("#app-language").selectOption("auto");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("support reports stay in-app, retain failed drafts, and the compact timeline toolbar is balanced", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("checkbox", { name: "Auto Cut", exact: true }).uncheck();
  await sendUpload(page);
  const { verifySupportDialog } = await import("./support-acceptance");
  await verifySupportDialog(page);
});

test("small muted autosave feedback follows pending edits and delayed background writes", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await page.getByRole("checkbox", { name: "Auto Cut", exact: true }).uncheck();
  await sendUpload(page);
  const { verifyAutosaveFeedback } = await import("./autosave-acceptance");
  await verifyAutosaveFeedback(page);
});

test("first-cut notifications open live progress and the completed editor while final sync is delayed", async ({
  page,
}) => {
  await authenticated(page);
  let releaseEdit!: () => void, releaseSync!: () => void;
  const editing = new Promise<void>((resolve) => {
      releaseEdit = resolve;
    }),
    syncing = new Promise<void>((resolve) => {
      releaseSync = resolve;
    });
  let edits = 0,
    syncStarted = false;
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({
      json: {
        words: [
          { word: "Hello", start: 0.2, end: 0.6 },
          { word: "story", start: 1, end: 1.4 },
        ],
      },
    }),
  );
  await page.route("**/api/ai/edit", async (r) => {
    edits++;
    await editing;
    await r.fulfill({ json: { cuts: [] } });
  });
  await page.route("**/api/projects", async (r) => {
    if (
      r.request().method() === "POST" &&
      r.request().postDataJSON().document?.words?.length
    ) {
      syncStarted = true;
      await syncing;
    }
    await r.fulfill({
      json: r.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  try {
    await openStudio(page);
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles("outputs/fixture.mp4");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => edits).toBe(1);
    await expect(page.locator(".upload-completed-tasks")).toHaveCount(0);
    await expect(page.locator(".upload-percentage")).toContainText("%");
    await page
      .getByRole("button", {
        name: "Continue editing in background",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "View progress", exact: true })
      .click();
    await expect(
      page.locator(".upload-task-list [data-stage=cut]"),
    ).toContainText("Cutting");
    await page
      .getByRole("button", {
        name: "Continue editing in background",
        exact: true,
      })
      .click();
    releaseEdit();
    await expect.poll(() => syncStarted).toBe(true);
    await expect(
      page.getByRole("button", { name: "View progress", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "View edit", exact: true }).click();
    await expect(page.locator(".timeline-clip")).toHaveCount(1);
    await expect(page.locator(".topbar strong")).toHaveText("fixture");
    releaseSync();
    await expect(page.locator(".operation-status")).toHaveCount(0);
    await expect(page.locator(".upload-review,.upload-processing")).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "My Edits", exact: true }).click();
    await page
      .getByRole("button", { name: "Open fixture", exact: true })
      .click();
    await expect(page.locator(".timeline-clip")).toHaveCount(1);
    expect(edits).toBe(1);
  } finally {
    releaseEdit();
    releaseSync();
  }
});

test("caption work paints its actual stage and the finished Eva notice stays compact on mobile", async ({
  page,
}) => {
  await authenticated(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/ai/transcribe", (r) =>
    r.fulfill({
      json: {
        words: [
          { word: "Hello", start: 0.2, end: 0.6 },
          { word: "story", start: 1, end: 1.4 },
        ],
      },
    }),
  );
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let edits = 0;
  await page.route("**/api/ai/edit", async (r) => {
    edits++;
    await held;
    await r.fulfill({ json: { cuts: [] } });
  });
  try {
    await openStudio(page);
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles("outputs/fixture.mp4");
    await expect(page.locator(".upload-review-count")).toHaveCount(0);
    await page
      .getByRole("checkbox", { name: "Add Captions", exact: true })
      .check();
    await page.evaluate(() => {
      (window as any).captionStagePainted = false;
      new MutationObserver(() => {
        if (
          document.querySelector(
            '.upload-task-list [data-stage="captions"][data-complete="false"]',
          )
        )
          (window as any).captionStagePainted = true;
      }).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
      });
    });
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => edits).toBe(1);
    await expect(page.locator(".upload-activity")).toHaveAttribute("aria-valuenow", /^\d+$/);
    release();
    await expect(page.locator(".timeline-clip")).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => (window as any).captionStagePainted))
      .toBe(true);
    const notice = page.locator(".cut-complete-notice");
    await expect(notice).toContainText("Your cut and captions are ready.");
    await expect(notice.locator(".editai-mascot")).toBeVisible();
    await expect(
      notice.getByRole("button", { name: "View edit", exact: true }),
    ).toHaveCount(0);
    const boxes = await Promise.all([
      notice.boundingBox(),
      notice.locator("p").boundingBox(),
      notice
        .getByRole("button", { name: "Dismiss notification", exact: true })
        .boundingBox(),
    ]);
    for (const box of boxes.slice(1)) {
      expect(box!.x).toBeGreaterThanOrEqual(boxes[0]!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        boxes[0]!.x + boxes[0]!.width,
      );
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        boxes[0]!.y + boxes[0]!.height,
      );
    }
    await page.screenshot({ path: "outputs/workflow60/completion-mobile.png" });
    await notice
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .click();
    await expect(notice).toHaveCount(0);
  } finally {
    release();
  }
});

test("narrow text boxes expand for long words and keep resize handles around the visible text", async ({
  page,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", (route) => {
    if (route.request().method() === "POST")
      saved = route.request().postDataJSON();
    return route.fulfill({
      json:
        route.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await sendUpload(page);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text", { exact: true }).fill("semester");
  await page.locator(".text-timing-layout > summary").click();
  const width = page.getByRole("spinbutton", {
    name: "Text box width value",
    exact: true,
  });
  await width.fill("0.15");
  await width.press("Enter");
  await expect.poll(() => saved?.document?.texts?.[0]?.boxWidth).toBe(0.15);
  for (const word of ["semester", "without"]) {
    await page.getByLabel("Caption text", { exact: true }).fill(word);
    await expect.poll(() => saved?.document?.texts?.[0]?.text).toBe(word);
    const layer = saved.document.texts[0];
    await selectPreviewText(page);
    const measured = await page
      .locator("canvas")
      .first()
      .evaluate(async (canvas: HTMLCanvasElement, t) => {
        await document.fonts.load(`${t.fontWeight ?? 600} 60px "${t.font}"`);
        const ctx = document.createElement("canvas").getContext("2d")!;
        const rect = canvas.getBoundingClientRect();
        ctx.font = `${t.fontWeight ?? 600} ${t.size * rect.width}px "${t.font}"`;
        return ctx.measureText(t.text).width;
      }, layer);
    const box = await page.locator(".preview-selection").boundingBox();
    expect(box!.width).toBeGreaterThan(measured + 3);
    await page.screenshot({ path: `outputs/text-fit-${word}.png` });
  }
});

test("preview text drags directly and text/video trim endpoints snap reciprocally", async ({
  page,
}) => {
  await authenticated(page);
  let saved: any;
  await page.route("**/api/projects", (route) => {
    if (route.request().method() === "POST")
      saved = route.request().postDataJSON();
    return route.fulfill({
      json:
        route.request().method() === "GET" ? { projects: [] } : { ok: true },
    });
  });
  await openStudio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("outputs/fixture.mp4");
  await page.getByRole("checkbox", { name: "Auto Cut", exact: true }).uncheck();
  await sendUpload(page);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text", { exact: true }).fill("Drag this text");
  await expect
    .poll(() => saved?.document?.texts?.[0]?.text)
    .toBe("Drag this text");
  const before = structuredClone(saved.document.texts[0]);
  const total =
    saved.document.segments[0].end - saved.document.segments[0].start;
  const hit = (await page.locator(".preview-text-hit").first().boundingBox())!;
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    hit.x + hit.width / 2 + 30,
    hit.y + hit.height / 2 + 20,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(() => saved.document.texts[0].x)
    .toBeGreaterThan(before.x + 0.02);
  expect(saved.document.texts[0].y).toBeGreaterThan(before.y + 0.02);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => saved.document.texts[0].x).toBe(before.x);
  await page.locator(".preview-text-hit").first().click();
  await expect(
    page.getByLabel("Edit text on video", { exact: true }),
  ).toBeVisible();
  const moveHandle = (await page.locator(".preview-text-drag").boundingBox())!;
  await page.mouse.move(moveHandle.x + 13, moveHandle.y + 13);
  await page.mouse.down();
  await page.mouse.move(moveHandle.x + 33, moveHandle.y + 3, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(() => saved.document.texts[0].x)
    .toBeGreaterThan(before.x + 0.02);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => saved.document.texts[0].x).toBe(before.x);
  const textClip = page.locator(".text-row .sequence-item").first();
  await textClip.click();
  const video = page.locator(".timeline-clip").first();
  const vb = (await video.boundingBox())!;
  const grip = textClip.locator(".trim-grip.end");
  const gb = (await grip.boundingBox())!;
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down();
  await page.mouse.move(vb.x + vb.width - 3, gb.y + gb.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect.poll(() => saved.document.texts[0].end).toBeCloseTo(total, 3);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => saved.document.texts[0].end).toBe(before.end);
  await video.click();
  const vg = (await video.locator(".trim-grip.end").boundingBox())!;
  const textEnd = vb.x + (vb.width * before.end) / total;
  await page.mouse.move(vg.x + vg.width / 2, vg.y + vg.height / 2);
  await page.mouse.down();
  await page.mouse.move(textEnd - 3, vg.y + vg.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() => saved.document.segments[0].end)
    .toBeCloseTo(before.end, 3);
});
