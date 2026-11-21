import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
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
    hasOwnKey: true,
    aiProviders: [],
  },
};
test.beforeEach(async ({ page }) => {
  // Upload now starts AI automatically. Keep every provider boundary explicit in
  // fixture tests; targeted cases register their more specific responses later.
  await page.route("**/api/ai/**", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "AI is unavailable in this isolated browser fixture." },
    }),
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
  await expect(
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
  ).toBeVisible();
}
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
  await page.getByLabel("Canvas aspect ratio").selectOption("1:1");
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
  await page.getByRole("button", { name: /^Record a take/ }).click();
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
  await page.getByRole("button", { name: "Use these takes" }).click();
  await expect(page.getByRole("button", { name: "Split" })).toBeVisible({
    timeout: 120000,
  });
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
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
    page.getByRole("button", { name: "Upload clips", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
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
    page.getByRole("button", { name: "Upload clips", exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(join(process.cwd(), "outputs/fixture.mp4"));
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
  await expect(
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
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
    name: "Good footage. Great possibilities.",
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
  await expect(
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
  ).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
  ).toBeVisible();
  await expect(page.locator(".sidebar-note")).toHaveText("iOS coming soon");
  await expect(page.locator(".sidebar-note a")).toHaveCount(0);
  await expect(
    page.locator(".upload-card input[type=checkbox], .corner-arrow"),
  ).toHaveCount(0);
  const uploadCard = page.locator(".upload-card");
  await expect(uploadCard.getByText("YOUR CREATIVE SHORTCUT")).toBeVisible();
  await expect(
    uploadCard.getByRole("heading", {
      name: /Good footage.*Great possibilities/,
    }),
  ).toBeVisible();
  await expect(uploadCard).toContainText(
    "Drop in your clips. Keep the good takes.",
  );
  await expect(uploadCard).toContainText(
    "We’ll help with everything in between.",
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
  await expect(
    page.getByRole("button", { name: /Record a take/ }),
  ).toBeVisible();
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
        profile: { ...session.profile, choice },
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
  const theme = page.locator(".onboarding-theme");
  await expect(theme).toHaveAttribute("data-onboarding-theme", "light");
  await expect(theme).toHaveCSS("color-scheme", "light");
  await expect(
    funnel.getByRole("heading", { name: "Who’s behind the camera?" }),
  ).toBeVisible();
  await expect(funnel.getByRole("heading")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  await expect(funnel.locator("video")).toHaveCount(0);
  await expect(
    funnel.getByRole("progressbar", { name: "Onboarding progress" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await expect(funnel.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "8",
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
  await expect(theme).toHaveAttribute("data-onboarding-theme", "light");
  await expect(funnel.getByRole("heading")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
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
  await page.getByRole("button", { name: "Build my studio" }).click();
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await expect(
    funnel.getByRole("heading", { name: "Save your progress." }),
  ).toBeVisible();
  const popupOpened = context.waitForEvent("page");
  await page
    .getByRole("button", { name: "Continue with Google via Publik" })
    .click();
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
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
  ).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
  ).toBeVisible();
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
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  expect(edits).toBe(1);
  expect(speech).toBe(1);
  await expect(page.getByRole("status")).toContainText("first cut is ready");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(1);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Move to overlay", exact: true })
    .click();
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
  await page
    .getByRole("button", { name: "Move to overlay", exact: true })
    .click();
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
    await expect(
      page.getByRole("heading", { name: "Good footage. Great possibilities." }),
    ).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: "Good footage. Great possibilities." }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Editor help and shortcuts" }).click();
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
  await page
    .getByRole("button", { name: "Move selected layer", exact: true })
    .click();
  const editor = page.getByLabel("Edit text on video", { exact: true });
  await editor.fill("Written on the preview");
  await page.screenshot({
    path: "outputs/editor-direct-text-edit.png",
    fullPage: true,
  });
  await editor.press("Control+Enter");
  await expect(page.getByLabel("Caption text", { exact: true })).toHaveValue(
    "Written on the preview",
  );
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
  await page.getByRole("button", { name: "Editor help and shortcuts" }).click();
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
  await page
    .getByRole("button", { name: "Move to overlay", exact: true })
    .click();
  await expect(page.locator(".selected-media-settings")).toHaveCount(1);
  await expect(
    page.locator(".selected-media-settings .range-label"),
  ).toHaveCount(2);
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
  await expect(page.locator(".range-ticks .major").first()).toBeVisible();
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
  ).toBeVisible();
  await expect(page.locator(".preview-controls-top select")).toHaveCount(0);
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
  await expect(
    page.getByRole("button", { name: "Filters workspace" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Overlays workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Overlay media", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adjust workspace" }).click();
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
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
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
  await expect(page.locator(".film-strip.front")).toHaveCSS(
    "color",
    "rgb(22, 52, 62)",
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
  await page.getByLabel("Spoken language").selectOption("es");
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
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Midnight", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Spoken language")).toHaveValue("es");
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
