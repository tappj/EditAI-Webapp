import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFile, chmod } from "node:fs/promises";
const baseURL =
  process.env.TEST_BASE_URL ||
  "https://editai-web.givingarmadillo8.chatgpt.site";
const statePath =
  process.env.LIVE_SESSION_STATE || "outputs/live-test-session.json";
const browser = await chromium.launch({
  channel: "chromium",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const { existsSync } = await import("node:fs");
const context = await browser.newContext({
  extraHTTPHeaders: { DNT: "1" },
  acceptDownloads: true,
  ...(existsSync(statePath) ? { storageState: statePath } : {}),
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) =>
  console.log(
    "Request failed:",
    new URL(r.url()).origin,
    new URL(r.url()).pathname.slice(0, 75),
    r.failure()?.errorText,
  ),
);
page.on("console", (m) => {
  if (m.type() === "error")
    console.log(
      "Browser error:",
      m
        .text()
        .replace(
          /https:\/\/storage.googleapis.com\/\S+/g,
          "[signed upload URL]",
        ),
    );
});
page.on("response", async (r) => {
  if (r.url().includes("/api/") && !r.ok()) {
    const b = await r.json().catch(() => ({}));
    console.log(
      "API error:",
      new URL(r.url()).pathname,
      r.status(),
      String(b.error || "").replace(
        /\b(?:pk_|pbt_|pat_|sk-)[A-Za-z0-9_.-]+/g,
        "[redacted]",
      ),
    );
  }
});
const initialResponse = page.waitForResponse(
  (r) => r.url() === baseURL + "/api/session",
);
await page.goto(baseURL + "/");
await initialResponse;
await context.storageState({ path: statePath });
await chmod(statePath, 0o600);
let session;
for (let i = 0; i < 10; i++) {
  session = await (await context.request.get(baseURL + "/api/session")).json();
  if (session.screen) break;
  await new Promise((r) => setTimeout(r, 1000));
}
if (!session?.screen) {
  console.log("Live session failed:", session?.error || "No gate response");
  await browser.close();
  process.exit(1);
}
console.log("Live gate:", session.screen.id);
await page.screenshot({
  path: "outputs/live-sign-in-gate.png",
  fullPage: true,
});
if (session.screen.id === "sign_in" && session.claimURL) {
  console.log(
    "Open the browser page to connect the live test session:",
    session.claimURL,
  );
  execFileSync("open", [session.claimURL]);
}
for (let i = 0; i < 200; i++) {
  session = await (await context.request.get(baseURL + "/api/session")).json();
  if (session.screen?.id === "choose" || session.screen?.id === "ready") break;
  await new Promise((r) => setTimeout(r, 3000));
}
console.log("After sign-in:", session.screen?.id || session.error);
if (!["choose", "ready"].includes(session.screen?.id)) {
  await browser.close();
  process.exit(2);
}
if (session.screen.id === "choose") {
  const hasConnect = session.screen.buttons.some((b) => b.action === "connect");
  if (!hasConnect) {
    console.log(
      "Account has no connected AI use. Manual plan/credit setup required.",
    );
    await browser.close();
    process.exit(3);
  }
  const r = await context.request.post(baseURL + "/api/choice", {
    headers: { origin: baseURL },
    data: { choice: "publik" },
  });
  if (!r.ok()) throw Error("Plan connection failed.");
}
await page.reload();
await page.getByRole("button", { name: "Settings", exact: true }).click();
await page.getByRole("checkbox", { name: /Allow AI processing/ }).check();
await page
  .getByRole("checkbox", { name: /Share official usage events/ })
  .uncheck();
await page
  .getByRole("button", { name: "Save preferences", exact: true })
  .click();
await page.getByRole("status").waitFor();
await context.storageState({ path: statePath });
await chmod(statePath, 0o600);
console.log("Live authentication, plan connection and consent verified.");
await page.getByRole("button", { name: "Home", exact: true }).click();
await page
  .locator("input[type=file]")
  .first()
  .setInputFiles("outputs/synthetic-speech.mp4");
await page
  .getByRole("button", { name: "Generate captions", exact: true })
  .click();
const diagnostic = setInterval(async () => {
  console.log(
    "Browser progress:",
    (await page.locator(".busy-overlay, [role=alert]").allTextContents()).join(
      " | ",
    ),
  );
  await page
    .screenshot({ path: "outputs/live-progress.png", fullPage: true })
    .catch(() => {});
}, 15000);
await Promise.race([
  page.locator(".text-layer-list>button").first().waitFor({ timeout: 240000 }),
  page
    .getByRole("alert")
    .waitFor({ timeout: 240000 })
    .then(async () => {
      await page.screenshot({ path: "outputs/live-error.png", fullPage: true });
      throw Error(await page.getByRole("alert").innerText());
    }),
]);
clearInterval(diagnostic);
console.log(
  "Real Publik transcription and caption generation passed:",
  await page.locator(".text-layer-list>button").count(),
  "phrases",
);
await page.getByRole("button", { name: "EditAI", exact: true }).click();
await page
  .getByLabel("Message EditAI")
  .fill(
    "Apply the Warm filter to every main clip. Keep all cuts and text unchanged.",
  );
const chatResponse = page.waitForResponse(
  (r) => r.url() === baseURL + "/api/ai/chat",
  { timeout: 120000 },
);
await page.getByRole("button", { name: "Send message", exact: true }).click();
const chatResult = await chatResponse;
if (!chatResult.ok())
  throw Error((await chatResult.json()).error || "Editor chat failed.");
await page.locator(".message.assistant").waitFor({ timeout: 120000 });
console.log(
  "Real Publik editor chat passed:",
  await page.locator(".message.assistant").last().innerText(),
);
await page.screenshot({ path: "outputs/live-ai-editor.png", fullPage: true });
await context.storageState({ path: statePath });
await chmod(statePath, 0o600);
await writeFile(
  "outputs/live-verification.json",
  JSON.stringify(
    {
      authentication: true,
      plan: true,
      consent: true,
      transcription: true,
      captions: true,
      chat: true,
      browserErrors: errors,
      date: new Date().toISOString(),
    },
    null,
    2,
  ),
);
await browser.close();
