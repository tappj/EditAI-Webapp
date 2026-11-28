import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ DNT: "1" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
});
test("short feature descriptions fit two desktop lines without shifting the gallery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await page.locator(".feature-orbit").scrollIntoViewIfNeeded();
  const gallery = page.locator("#creators");
  const before = await gallery.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY,
  );
  for (const key of [
    "batch",
    "record",
    "cut",
    "audio",
    "sparkles",
    "captions",
  ]) {
    await page.locator(`.orbit-feature[data-feature=${key}]`).focus();
    const p = page.locator(".feature-orbit-detail p");
    await expect(p).toBeVisible();
    await expect(p).not.toContainText(/temporary|before leaving/);
    const lines = await p.evaluate(
      (el) =>
        el.getBoundingClientRect().height /
        parseFloat(getComputedStyle(el).lineHeight),
    );
    expect(lines, `${key} description`).toBeLessThanOrEqual(2.05);
    const after = await gallery.evaluate(
      (el) => el.getBoundingClientRect().top + scrollY,
    );
    expect(
      Math.abs(after - before),
      `${key} gallery position`,
    ).toBeLessThanOrEqual(1);
  }
  await page
    .locator(".feature-orbit-detail")
    .screenshot({ path: "outputs/trim203/feature-detail.png" });
});
test("workflow frames crop the iPhone status and home bars while retaining original screenshots", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const frames = page.locator(".workflow-image-crop");
  await expect(frames).toHaveCount(4);
  await frames.first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      frames
        .locator("img")
        .evaluateAll((es) =>
          es.every(
            (e) =>
              (e as HTMLImageElement).complete &&
              (e as HTMLImageElement).naturalHeight === 2532,
          ),
        ),
    )
    .toBe(true);
  for (const f of await frames.all()) {
    const crop = await f.evaluate((el) => {
      const frame = el.getBoundingClientRect(),
        img = el.querySelector("img")!.getBoundingClientRect();
      return {
        top: (frame.top - img.top) / img.height,
        bottom: (img.bottom - frame.bottom) / img.height,
        overflow: getComputedStyle(el).overflow,
      };
    });
    expect(crop.top).toBeGreaterThan(0.05);
    expect(crop.bottom).toBeGreaterThan(0.03);
    expect(crop.overflow).toBe("hidden");
  }
  await page
    .locator(".workflow-grid")
    .screenshot({ path: "outputs/trim203/cropped-workflow.png" });
});
