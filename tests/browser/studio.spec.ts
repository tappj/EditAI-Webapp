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
    .getByRole("button", { name: "Edits", exact: true })
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
    .getByRole("button", { name: "Edits", exact: true })
    .first()
    .click();
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
  await page
    .getByRole("button", { name: "Edits", exact: true })
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

test("own-key onboarding opens secure settings without a Publik subscription", async ({
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
  await page.getByRole("button", { name: "Edits", exact: true }).click();
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
  const welcome = funnel.getByRole("heading", { name: "Film it messy." });
  await expect(welcome).toBeVisible();
  await expect(welcome).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(funnel.getByRole("button", { name: "See it happen" })).toHaveCSS(
    "color",
    "rgb(17, 35, 45)",
  );
  await expect(funnel.locator("video")).not.toHaveAttribute("controls", "");
  await expect(
    funnel.getByRole("button", { name: "Play sample" }),
  ).toBeVisible();
  await expect(funnel.locator("video")).toHaveAttribute(
    "src",
    "/onboarding/raw.mp4",
  );
  await expect
    .poll(() =>
      funnel
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Upload clips" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Continue with Google/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "See it happen" }).click();
  await expect(funnel.locator("video")).toHaveAttribute(
    "src",
    "/onboarding/edited.mp4",
  );
  await expect
    .poll(() =>
      funnel
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Make it mine" }).click();
  await expect(
    funnel.getByRole("progressbar", { name: "Onboarding progress" }),
  ).toHaveText("3/10");
  await expect(funnel.getByRole("heading")).toHaveCSS(
    "color",
    "rgb(17, 17, 17)",
  );
  await expect(
    page.getByRole("button", { name: "TikTok Shop seller" }),
  ).toHaveCSS("background-color", "rgb(232, 245, 247)");
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

test("sample cut animation joins retained clips and monthly hours count into a filled grid", async ({
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
  const simulation = page.getByLabel("EditAI sample cut simulation");
  await expect(simulation).toHaveAttribute("data-stage", "Cutting retakes");
  await expect(page.locator(".studio-onboarding-demo video")).toHaveAttribute(
    "src",
    "/onboarding/raw.mp4",
  );
  await page.getByRole("button", { name: "Pause sample" }).click();
  const paused = await simulation
    .locator(".cut-piece")
    .evaluateAll((elements) => elements.map((el) => el.getAttribute("style")));
  await page.waitForTimeout(250);
  expect(
    await simulation
      .locator(".cut-piece")
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("style")),
      ),
  ).toEqual(paused);
  await page.getByRole("button", { name: "Play sample" }).click();
  await expect(simulation).toHaveAttribute("data-stage", "Cut ready");
  await expect(page.locator(".studio-onboarding-demo video")).toHaveAttribute(
    "src",
    "/onboarding/edited.mp4",
  );
  const discarded = simulation.locator(".discarded");
  for (const piece of await discarded.all())
    await expect(piece).toHaveCSS("opacity", "0");
  await expect(simulation.locator(".kept")).toHaveCount(5);
  await page.getByRole("button", { name: "Replay the cut" }).click();
  await expect(simulation).toHaveAttribute("data-stage", "Finding cuts");

  await page.getByRole("button", { name: "Make it mine" }).click();
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
