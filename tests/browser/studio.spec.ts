import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
const session = {
  screen: { id: "ready" },
  profile: {
    handle: "browser_test_fixture",
    choice: "own_key",
    consent: true,
    telemetry: false,
    plan: "Test fixture",
    hasOwnKey: false,
    aiProviders: [],
  },
};
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
  await expect(
    page.getByRole("heading", { name: "What will you create today?" }),
  ).toBeVisible();
}
test("public first page requires Publik sign-in; responsive and no secret exposure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Film freely. Let EditAI do the editing.",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Open EditAI Web", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Sign in with publik", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create a video" }),
  ).toHaveCount(0);
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
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible();
  await page.getByLabel("Timeline playhead").fill("1.5");
  await page.getByRole("button", { name: "Split clip at playhead" }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page.getByText("More adjustments", { exact: true }).click();
  await page.getByRole("slider", { name: /^Exposure/ }).fill("0.25");
  await page.getByLabel("Canvas aspect ratio").selectOption("1:1");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Caption text").fill("Browser export test");
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
  await page
    .getByRole("button", { name: "My creations", exact: true })
    .first()
    .click();
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
  await page.getByRole("button", { name: "Find my best takes" }).click();
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
  await page.route("**/api/projects/*", (r) =>
    r.fulfill({ json: { ok: true } }),
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
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "My creations", exact: true })
    .first()
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: /^My creations/ })
    .first()
    .click();
  await page.locator(".project-card-title").click();
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Timeline playhead").inputValue()),
    )
    .toBeGreaterThan(0.2);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "My creations", exact: true })
    .first()
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete storage-recovery", exact: true })
    .click();
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
  await page
    .getByRole("button", { name: "Record", exact: true })
    .first()
    .click();
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
  await page.getByRole("button", { name: "Use these takes" }).click();
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible({ timeout: 120000 });
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
});

test("overlay and imported audio appear in actual exported media", async ({
  page,
}) => {
  await authenticated(page);
  await openStudio(page);
  await expect(
    page.getByRole("button", { name: "Create a video", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page
    .getByRole("button", { name: "Add image / video" })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/overlay.png"));
  await expect(page.locator(".layer-settings")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add audio", exact: true })
    .click({ noWaitAfter: true });
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/music.wav"));
  await expect(page.locator(".layer-settings")).toHaveCount(2);
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
  await page.getByRole("button", { name: /Batch edit/ }).click();
  await page
    .locator(".batch-box input")
    .nth(0)
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .locator(".batch-box input")
    .nth(1)
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("checkbox", { name: /Run AI editing/ }).uncheck();
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
          { word: "A", start: 0.3, end: 0.5 },
          { word: "real", start: 0.5, end: 0.8 },
          { word: "caption.", start: 0.9, end: 1.3 },
        ],
      },
    }),
  );
  await openStudio(page);
  await expect(
    page.getByRole("button", { name: "Create a video", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-layer-list>button")).toHaveCount(1);
  expect(jobs).toBe(1);
  expect(uploads).toBe(1);
  await page
    .getByRole("button", { name: "Generate speech captions", exact: true })
    .click();
  await expect(page.locator(".text-layer-list>button")).toHaveCount(1);
  expect(jobs).toBe(1);
});

test("visual style references attach actual browser-decoded image frames to chat", async ({
  page,
}) => {
  await authenticated(page);
  let reference: any;
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
    page.getByRole("button", { name: "Create a video", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
  await page.getByRole("button", { name: "EditAI", exact: true }).click();
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
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Create a video" }),
  ).toHaveCount(0);
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
  await expect(
    page.getByRole("heading", { name: "What will you create today?" }),
  ).toBeVisible({ timeout: 15000 });
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
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Sign in with publik", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open Publik sign-in" }),
  ).toHaveAttribute("href", "https://publikhq.com/claim/EDITAI-TEST");
  await expect(page.getByRole("status")).toContainText("return here");
  await expect(
    page.getByRole("button", { name: "Create a video" }),
  ).toHaveCount(0);
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
        page.getByRole("link", { name: /Download for macOS/ }),
      ).toHaveCount(device.downloads ? 1 : 0);
    } finally {
      await context.close();
    }
  });
}
