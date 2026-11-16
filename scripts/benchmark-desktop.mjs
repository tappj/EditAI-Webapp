// Processing benchmark only. Browser API fixtures suppress all AI/telemetry;
// desktop uses its real persisted gate, with official telemetry opted out.
import { chromium, _electron as electron, expect } from "@playwright/test";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { cpus, totalmem, platform, release } from "node:os";
const report = {
  date: new Date().toISOString(),
  machine: {
    cpu: cpus()[0].model,
    memoryGB: Math.round(totalmem() / 1024 ** 3),
    os: platform() + " " + release(),
  },
  source: "outputs/fixture.mp4",
  resolution: 854,
  fps: 30,
  runs: [],
};
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5180";
for (const target of ["browser", "desktop"]) {
  let app, browser, context;
  try {
    let page;
    const startup = Date.now();
    if (target === "browser") {
      browser = await chromium.launch({
        args: ["--autoplay-policy=no-user-gesture-required"],
      });
      context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        extraHTTPHeaders: { DNT: "1" },
        acceptDownloads: true,
      });
      page = await context.newPage();
      await page.route("**/api/**", (r) => {
        const path = new URL(r.request().url()).pathname;
        return r.fulfill({
          json:
            path === "/api/session"
              ? {
                  screen: { id: "ready" },
                  profile: {
                    choice: "own_key",
                    consent: false,
                    telemetry: false,
                    plan: "Benchmark fixture",
                  },
                }
              : path === "/api/projects" && r.request().method() === "GET"
                ? { projects: [] }
                : { ok: true },
        });
      });
      await page.goto(base);
    } else {
      app = await electron.launch({
        args: ["desktop/dist"],
        env: { ...process.env, DO_NOT_TRACK: "1", PUBLIK_TELEMETRY: "false" },
      });
      page = await app.firstWindow();
    }
    await page
      .getByRole("heading", { name: "What will you create today?" })
      .waitFor();
    const startupMs = Date.now() - startup;
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles(resolve("outputs/fixture.mp4"));
    await page
      .getByRole("button", { name: "Split clip at playhead" })
      .waitFor();
    for (const variant of ["clean", "composited"]) {
      if (variant === "composited") {
        await page.getByRole("button", { name: "Warm", exact: true }).click();
        await page.getByRole("button", { name: "Text", exact: true }).click();
        await page
          .getByRole("button", { name: "Add text", exact: true })
          .click();
        await page.getByLabel("Caption text").fill("EditAI benchmark");
      }
      const destination = resolve(`outputs/benchmark-${target}-${variant}.mp4`);
      if (app)
        await app.evaluate(({ dialog }, path) => {
          dialog.showSaveDialog = async () => ({
            canceled: false,
            filePath: path,
          });
        }, destination);
      await page.getByRole("button", { name: "Export", exact: true }).click();
      await page
        .getByRole("combobox", { name: /Export resolution/ })
        .selectOption("854");
      const downloaded = !app ? page.waitForEvent("download") : null,
        start = Date.now();
      await page
        .getByRole("button", { name: "Export video", exact: true })
        .click();
      await Promise.race([
        expect(page.getByRole("status")).toContainText("MP4 exported", {
          timeout: 120000,
        }),
        page
          .getByRole("alert")
          .waitFor({ timeout: 120000 })
          .then(async () => {
            throw Error(await page.getByRole("alert").innerText());
          }),
      ]);
      const seconds = (Date.now() - start) / 1000;
      if (downloaded) await (await downloaded).saveAs(destination);
      const row = { target, variant, seconds, startupMs };
      report.runs.push(row);
      console.log(row);
      await page.getByRole("button", { name: "Dismiss notification" }).click();
    }
  } finally {
    await app?.close();
    await browser?.close();
  }
}
await writeFile(
  "outputs/desktop-benchmark.json",
  JSON.stringify(report, null, 2),
);
