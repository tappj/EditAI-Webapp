// Real deployed requests using the normal, previously linked browser session.
// No route fixtures, injected credentials, or production authentication bypass.
import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const baseURL = "https://editai-web.givingarmadillo8.chatgpt.site";
const browser = await chromium.launch({
  channel: "chromium",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  storageState: "outputs/live-test-session.json",
  extraHTTPHeaders: { DNT: "1" },
  acceptDownloads: true,
});
const page = await context.newPage();
let verificationProject = null;
const report = {
  origin: baseURL,
  fixtures: false,
  browserErrors: [],
  date: new Date().toISOString(),
};
page.on("pageerror", (e) => report.browserErrors.push(e.message));
async function json(path, options) {
  const r = await context.request.fetch(baseURL + "/api/" + path, {
    ...options,
    headers: { origin: baseURL, ...options?.headers },
    timeout: 180000,
  });
  const b = await r.json();
  if (!r.ok())
    throw Error(`${path}: ${r.status()} ${b.error || "Request failed"}`);
  return b;
}
try {
  const session = await json("session");
  if (session.screen.id !== "ready")
    throw Error("Finish the normal live sign-in flow first.");
  report.authentication = true;
  const all = await json("projects");
  let saved = all.projects.find((p) => {
    const d = JSON.parse(p.document);
    return (
      d.sources.length === 1 &&
      d.sources[0].name === "synthetic-speech.mp4" &&
      d.words.length > 0
    );
  });
  if (!saved)
    throw Error(
      "No prior synthetic test project found. No real user project was modified.",
    );
  const document = JSON.parse(saved.document),
    source = document.sources[0];
  // Use an isolated copy so a prior Warm edit cannot turn the requested edit
  // into a correct no-op, and preserve the existing project during acceptance.
  verificationProject = crypto.randomUUID();
  saved = {
    ...saved,
    id: verificationProject,
    title: "Migration verification " + Date.now(),
  };
  for (const clip of document.segments) clip.appearance.filter = "Clear";
  await json("projects", {
    method: "POST",
    data: { id: saved.id, title: saved.title, document },
  });
  report.persistedWords = document.words.length;
  report.persistedCaptions = document.texts.length;
  const sourceFile = await readFile("outputs/synthetic-speech.mp4");
  await json("assets/" + source.id, {
    method: "PUT",
    headers: {
      "content-type": "video/mp4",
      "x-file-name": "synthetic-speech.mp4",
    },
    data: sourceFile,
  });
  const restored = await context.request.get(
    baseURL + "/api/assets/" + source.id,
  );
  if (!restored.ok() || !(await restored.body()).equals(sourceFile))
    throw Error("Private cloud source did not round-trip intact.");
  report.cloudBackup = true;
  console.log(
    "Real deployed authentication, transcript/caption persistence, and private R2 backup passed.",
  );
  await page.goto(baseURL);
  await page
    .getByRole("button", { name: /^My Edits/ })
    .first()
    .click();
  await page
    .locator(".project-card-title")
    .filter({ hasText: saved.title })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Split clip at playhead" }),
  ).toBeVisible({ timeout: 30000 });
  report.restoreInNewBrowser = true;
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
  const reply = await chatResponse,
    body = await reply.json();
  if (!reply.ok()) throw Error(`Real chat: ${reply.status()} ${body.error}`);
  await expect(page.locator(".message.assistant")).toBeVisible();
  if (!body.operations.some((op) => op.kind === "filter" && op.text === "Warm"))
    throw Error("Chat did not emit the requested actual filter operation.");
  report.chat = true;
  console.log("Real deployed editor chat passed:", body.message);
  const summary = await json("ai/summary", {
    method: "POST",
    data: { words: document.words },
  });
  if (!summary.summary || !summary.highlights.length)
    throw Error("Invalid real summary.");
  report.summary = true;
  await page.getByRole("button", { name: "Media", exact: true }).click();
  const editResponse = page.waitForResponse(
    (r) => r.url() === baseURL + "/api/ai/edit",
    { timeout: 180000 },
  );
  await page
    .getByRole("button", { name: "Find my best takes", exact: true })
    .click();
  const edit = await editResponse;
  if (!edit.ok())
    throw Error(
      `Real editorial request: ${edit.status()} ${(await edit.json()).error}`,
    );
  await expect(page.getByRole("status")).toContainText("AI edit applied", {
    timeout: 15000,
  });
  report.editorialSelection = true;
  console.log("Real deployed summary and editorial selection passed.");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: /Export resolution/ })
    .selectOption("854");
  const download = page.waitForEvent("download", { timeout: 180000 });
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const file = await Promise.race([
    download,
    page
      .getByRole("alert")
      .waitFor({ timeout: 180000 })
      .then(async () => {
        throw Error(await page.getByRole("alert").innerText());
      }),
  ]);
  await file.saveAs("outputs/deployed-real-ai-export.mp4");
  report.export = true;
  await page.screenshot({
    path: "outputs/deployed-real-ai-editor.png",
    fullPage: true,
  });
  console.log("Real deployed AI-edited MP4 export passed.");
} catch (e) {
  report.error = e.message;
  await page
    .screenshot({
      path: "outputs/deployed-real-flow-error.png",
      fullPage: true,
    })
    .catch(() => {});
  process.exitCode = 1;
  console.log("Deployed verification:", e.message);
} finally {
  if (verificationProject) {
    await page.goto(baseURL).catch(() => {});
    await json("projects/" + verificationProject, { method: "DELETE" }).catch(
      () => {},
    );
  }
  await writeFile(
    "outputs/deployed-real-verification.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
