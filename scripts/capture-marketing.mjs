import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = "outputs/new-design";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1000 },
    extraHTTPHeaders: { DNT: "1" },
    reducedMotion: "reduce",
  });
  await page.route("**/api/session", (r) =>
    r.fulfill({
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
  await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  await page.screenshot({ path: `${output}/hero.png` });
  const hide = await page.addStyleTag({
    content: ".m-header{visibility:hidden}",
  });
  for (const [name, selector] of [
    ["workflow", ".workflow-section"],
    ["features", ".features-section"],
    ["gallery", "#creators"],
    ["comparison", ".comparison-section"],
    ["pricing", "#pricing"],
    ["faq", "#faq"],
    ["closing", ".closing-section"],
    ["footer", ".m-footer"],
  ]) {
    const el = page.locator(selector);
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: `${output}/section-${name}.png` });
  }
  await hide.evaluate((el) => el.remove());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  await writeFile(
    `${output}/visual-check.json`,
    JSON.stringify({ widths: [1536, 390], errors }, null, 2),
  );
  console.log(JSON.stringify({ output, errors }));
} finally {
  await browser.close();
}
