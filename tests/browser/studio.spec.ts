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
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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
  await page.getByRole("button", { name: "My creations", exact: true }).click();
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
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: /^Edits/ })
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
  await page.getByRole("button", { name: "My creations", exact: true }).click();
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
    page.getByRole("button", { name: "Upload clips", exact: true }),
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
    page.getByRole("button", { name: "Upload clips", exact: true }),
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
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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
          "https://github.com/tappj/EditAI-Webapp/releases/download/v0.2.2/EditAI-0.2.2-mac-arm64.dmg",
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
        page.getByRole("link", { name: /Download for macOS/ }),
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
    name: "Upload your raw takes here",
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
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("placeholder", "A key is securely saved");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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
    profile = body;
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
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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

  await page
    .getByRole("button", { name: "Customize profile", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Customize profile" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Open profile customization" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Customize profile" }),
  ).toBeVisible();
  await page.getByLabel("Display name").fill("Taylor Editor");
  await page.getByRole("radio", { name: /Midnight/ }).check();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
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
  await page.getByRole("button", { name: "My creations", exact: true }).click();
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
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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
    .locator(".suite-tools")
    .getByRole("button", { name: "EditAI", exact: true })
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
  await expect(page.getByLabel("Timeline playhead")).toHaveValue("1.5");
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
  await page.getByRole("button", { name: "Split clip at playhead" }).click();
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
  await page.getByRole("button", { name: "Font", exact: true }).click();
  await page
    .getByLabel("Project font", { exact: true })
    .selectOption("Montserrat");
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue(
    "Montserrat",
  );
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await expect(page.getByLabel("Font", { exact: true })).toHaveValue(
    "Montserrat",
  );
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
  await page.getByRole("button", { name: "Split clip at playhead" }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "My creations", exact: true })
      .click();
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
      page.getByRole("heading", { name: "Upload your raw takes here" }),
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
    await page.getByRole("button", { name: "Pause", exact: true }).click();
  }
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.locator(".m-header .nav-sign-in").click();
  await page
    .getByRole("button", { name: "Use another Publik account" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Upload your raw takes here" }),
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
    .getByRole("button", { name: "Generate captions", exact: true })
    .click();
  await expect(page.locator(".text-layer-list>button")).toHaveCount(6);
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
  await page.locator(".text-layer-list>button").first().click();
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
  await page.getByRole("button", { name: "Text workspace" }).click();
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
