import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ DNT: "1" });
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
});
test("calculator introduces 4 to 15 once and leaves subsequent choices alone", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const slider = page.getByRole("slider", {
    name: "Videos a week",
    exact: true,
  });
  await expect(slider).toHaveValue("4");
  const host = page.locator(".time-calculator");
  await host.scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-demo", "playing");
  await page.waitForTimeout(1500);
  expect(Number(await slider.inputValue())).toBeLessThan(15);
  await expect(host).toHaveAttribute("data-demo", "complete");
  await expect(slider).toHaveValue("15");
  await slider.fill("7");
  await page.evaluate(() => scrollTo(0, 0));
  await host.scrollIntoViewIfNeeded();
  await expect(slider).toHaveValue("7");
  await expect(host).toHaveAttribute("data-demo", "interrupted");
});
test("manual input interrupts the intro before it finishes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const slider = page.getByRole("slider", {
    name: "Videos a week",
    exact: true,
  });
  await slider.scrollIntoViewIfNeeded();
  await slider.fill("6");
  await page.waitForTimeout(3500);
  await expect(slider).toHaveValue("6");
});
test("both graph lines and the Alone pill support dragging and keyboard changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const host = page.locator(".time-calculator");
  await host.scrollIntoViewIfNeeded();
  const slider = page.getByRole("slider", {
    name: "Videos a week",
    exact: true,
  });
  await expect(slider).toHaveValue("15");
  const pill = host.locator(".chart-control-alone .chart-end-label");
  const box = (await pill.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 55, {
    steps: 15,
  });
  await page.mouse.up();
  const afterAlone = Number(await slider.inputValue());
  expect(afterAlone).toBeLessThan(15);
  expect(afterAlone).toBeGreaterThan(1);
  const endpoint = (await host.locator(".chart-target-dot").boundingBox())!;
  await page.mouse.move(
    endpoint.x + endpoint.width / 2,
    endpoint.y + endpoint.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(endpoint.x + endpoint.width / 2, endpoint.y - 10, {
    steps: 10,
  });
  await page.mouse.up();
  expect(Number(await slider.inputValue())).toBeGreaterThan(afterAlone);
  const alone = page.getByRole("slider", {
    name: "Alone estimate",
    exact: true,
  });
  await alone.focus();
  await alone.press("End");
  await expect(slider).toHaveValue("20");
  await alone.press("Home");
  await expect(slider).toHaveValue("1");
  await alone.press("ArrowUp");
  await expect(slider).toHaveValue("2");
  await expect(
    page.getByRole("slider", { name: "EditAI estimate", exact: true }),
  ).toHaveAttribute("aria-valuenow", "2");
});
test("Compact EditAI wordmark and resting happy Eva accompany the subtle footnote", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  const host = page.locator(".time-calculator");
  await host.scrollIntoViewIfNeeded();
  await expect(host.locator(".chart-editai-brand image")).toHaveCount(0);
  await expect(host.locator(".chart-brand-label")).toHaveText(
    "15h with EditAI",
  );
  await expect(host.locator(".chart-brand-wordmark")).toHaveCSS("fill", /url/);
  await expect(host.locator(".calculator-eva-hint")).toContainText(
    "Drag the slider or graph",
  );
  await expect(host.locator(".mascot-wave")).toHaveCSS("display", "none");
  await expect(host.locator(".mascot-arm-rest")).toHaveCSS("opacity", "1");
  await expect(host.locator(".mascot-eyes-happy")).toHaveCSS(
    "display",
    "inline",
  );
  const note = host.locator(".calculator-disclaimer");
  await expect(note).toHaveCSS("font-family", /Inter/);
  const lines = await note.evaluate(
    (e) =>
      e.getBoundingClientRect().height /
      parseFloat(getComputedStyle(e).lineHeight),
  );
  expect(Math.round(lines)).toBe(2);
  await host.screenshot({
    path: "outputs/calculator64/calculator-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await host.screenshot({ path: "outputs/calculator64/calculator-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole("slider", { name: "Videos a week", exact: true })
      .fill("9");
    await expect(
      host.locator(".chart-control-alone .chart-end-label"),
    ).toHaveText("36h alone");
    const brand = (await host.locator(".chart-editai-brand").boundingBox())!;
    const difference = (await host.locator(".chart-difference").boundingBox())!;
    const overlaps =
      difference.x < brand.x + brand.width &&
      difference.x + difference.width > brand.x &&
      difference.y < brand.y + brand.height &&
      difference.y + difference.height > brand.y;
    expect(overlaps, `endpoint and difference at ${width}px`).toBe(false);
  }
});
