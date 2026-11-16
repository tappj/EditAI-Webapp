import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = "outputs/marketing";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1000 },
    extraHTTPHeaders: { DNT: "1" },
  });
  // Only test the public presentation. No provider requests or app activity telemetry.
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        screen: {
          id: "sign_in",
          title: "Sign in with publik",
          body: "Continue with your Publik account.",
          buttons: [{ action: "sign_in", label: "Sign in with publik" }],
        },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5190/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "true",
  );
  await page.mouse.move(180, 350, { steps: 15 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${output}/hero-pointer-left.png` });
  await page.mouse.move(1200, 280, { steps: 35 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${output}/hero-pointer-right.png` });
  const samples = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let last = 0;
        const tick = (time) => {
          if (last) deltas.push(time - last);
          last = time;
          if (deltas.length < 90) requestAnimationFrame(tick);
          else {
            deltas.sort((a, b) => a - b);
            resolve({
              samples: deltas.length,
              medianMs: deltas[45],
              p95Ms: deltas[85],
            });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [name, selector] of [
    ["hero", ".marketing-hero"],
    ["values", ".proof-section"],
    ["comparison", "#how-it-works"],
    ["demos", ".demo-cards"],
    ["features", ".features-section"],
    ["workflow", ".review-section"],
    ["gallery", "#creators"],
    ["pricing", "#pricing"],
    ["faq", "#faq"],
    ["footer", ".closing-section"],
  ]) {
    const region = page.locator(selector);
    await region.scrollIntoViewIfNeeded();
    await region.screenshot({ path: `${output}/section-${name}.png` });
  }
  await writeFile(
    `${output}/visual-check.json`,
    JSON.stringify(
      { viewport: { width: 1536, height: 1000 }, frameTiming: samples, errors },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ output, frameTiming: samples, errors }));
} finally {
  await browser.close();
}
