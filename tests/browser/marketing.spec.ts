import { test, expect } from "@playwright/test";
const gate = {
  screen: {
    id: "sign_in",
    title: "Sign in with publik",
    body: "Continue with your Publik account.",
    buttons: [{ action: "sign_in", label: "Sign in with publik" }],
  },
  profile: { consent: false, telemetry: false },
};
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ DNT: "1" });
  await page.route("**/api/session", (route) => route.fulfill({ json: gate }));
});
test("new reference layout, removed old sections, real logo and genuine app entry", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("EditAI: #1 Video Editor");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Turn your raw footage into",
  );
  await expect(
    page.getByText(
      "We find your best takes, add captions, and make every frame yours.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page
      .locator("main > section")
      .evaluateAll((nodes) => nodes.map((node) => node.className)),
  ).toEqual([
    "marketing-hero",
    "workflow-section",
    "features-section",
    "gallery-section",
    "comparison-section",
    "pricing-section",
    "faq-section",
    "closing-section",
  ]);
  await expect(
    page.locator(
      ".metric-card,.award-card,.creator-profile,.proof-section,.demo-cards,.review-wall,.product-section",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".workflow-screen")).toHaveCount(4);
  await expect(page.locator(".feature-card")).toHaveCount(7);
  await expect(page.locator(".ribbon-item")).toHaveCount(8);
  await expect(page.locator(".marketing-video")).toHaveCount(3);
  await expect(page.locator("video,.review-stars")).toHaveCount(0);
  await expect(page.locator(".m-header .m-brand img")).toHaveAttribute(
    "src",
    "/brand/editai-icon-192.png",
  );
  await expect(
    page.locator('link[rel="icon"][href="/favicon.ico"]'),
  ).toHaveCount(1);
  expect(await page.locator("body").innerText()).not.toMatch(
    /YOUR FOOTAGE\. YOUR VOICE\.|\bCutAI\b|\bCut AI\b|Codex|App Store rating|free trial|34 hours|40K\+/i,
  );
  await expect(page.locator(".nav-cta")).toContainText("iOS coming soon");
  await page
    .getByRole("link", { name: "Open EditAI Web", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page).toHaveTitle("EditAI: #1 Video Editor");
  await expect(
    page.getByRole("button", { name: "Sign in with publik", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("workflow exploration and full-width active navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See it in action" }).click();
  await expect(
    page.locator(".workflow-switcher button[aria-pressed=true]"),
  ).toHaveText("AI first cut");
  await page
    .locator(".workflow-switcher")
    .getByRole("button", { name: "Review", exact: true })
    .click();
  await expect(page.locator(".workflow-step.active")).toContainText(
    "03 · REVIEW",
  );
  await page
    .locator(".m-nav")
    .getByRole("link", { name: "Creators", exact: true })
    .click();
  await expect(page.locator(".m-nav a[href='#creators']")).toHaveAttribute(
    "aria-current",
    "location",
  );
  expect(
    await page.locator(".m-header").evaluate((node) => ({
      top: node.getBoundingClientRect().top,
      left: node.getBoundingClientRect().left,
      width: node.getBoundingClientRect().width === innerWidth,
    })),
  ).toEqual({ top: 0, left: 0, width: true });
});
test("three plan cards retain real cadence/plan selection without invented checkout", async ({
  page,
}) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(pricing.locator(".pricing-card")).toHaveCount(3);
  await expect(pricing.getByRole("radio", { name: /Creator/ })).toBeChecked();
  await pricing.getByRole("button", { name: "Annual", exact: true }).click();
  await pricing.getByRole("radio", { name: /Studio/ }).check();
  await expect(pricing.locator(".billing-summary")).toContainText(
    "Studio · Annual pricing to be announced",
  );
  await expect(
    pricing.getByRole("button", { name: "Plans coming soon" }),
  ).toHaveCount(3);
  for (const button of await pricing
    .getByRole("button", { name: "Plans coming soon" })
    .all())
    await expect(button).toBeDisabled();
  await pricing.getByRole("radio", { name: /Starter/ }).check();
  await pricing.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(pricing.locator(".billing-summary")).toContainText(
    "Starter · Monthly",
  );
  await expect(pricing.locator("a[href*='checkout']")).toHaveCount(0);
});
test("calculator responds to user assumptions and never promises measured savings", async ({
  page,
}) => {
  await page.goto("/");
  const calculator = page.locator(".time-calculator");
  await calculator.scrollIntoViewIfNeeded();
  await expect(calculator.locator(".calculator-results")).toContainText(
    "7.5 hrs",
  );
  await page.getByRole("slider", { name: "Videos a week" }).fill("20");
  await page
    .getByRole("spinbutton", { name: "Current minutes per video" })
    .fill("30");
  await page
    .getByRole("spinbutton", { name: "Target minutes per video" })
    .fill("15");
  await expect(calculator.locator(".calculator-results")).toContainText(
    "5 hrs",
  );
  await expect(calculator.locator(".calculator-results")).toContainText(
    "20 hrs",
  );
  await expect(calculator.getByRole("img")).toHaveAttribute(
    "aria-label",
    /40 current, 20 at your target/,
  );
  await page
    .getByRole("spinbutton", { name: "Target minutes per video" })
    .fill("45");
  await expect(calculator.locator(".calculator-results")).toHaveText(
    /0 hrs.*0 hrs/,
  );
  await expect(calculator.locator(".calculator-disclaimer")).toContainText(
    "not a measured EditAI result",
  );
});
test("categorized FAQ, keyboard answers and real privacy disclosure", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".m-nav")
    .getByRole("link", { name: "FAQ", exact: true })
    .click();
  await expect(page.locator(".faq-row")).toHaveCount(4);
  const first = page.getByRole("button", {
    name: "Can I fine-tune the AI edit?",
  });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "The app", exact: true }).click();
  await page.getByRole("button", { name: "Where can I use EditAI?" }).click();
  await expect(
    page.getByRole("region", { name: "Where can I use EditAI?" }),
  ).toContainText("iOS is coming soon");
  await page
    .getByRole("button", { name: "Getting started", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Are EditAI subscription prices available?" })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Are EditAI subscription prices available?",
    }),
  ).toContainText("have not been announced");
  await page
    .getByRole("button", { name: "Privacy & data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("opposing strips, retained icon motion, focus pause and offscreen suspension", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  const rows = page.locator(".marquee-track");
  expect(
    await rows.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationDirection),
    ),
  ).toEqual(["normal", "reverse"]);
  const transform = await rows
    .first()
    .evaluate((node) => getComputedStyle(node).transform);
  await expect
    .poll(() =>
      rows.first().evaluate((node) => getComputedStyle(node).transform),
    )
    .not.toBe(transform);
  await page.locator(".marquee-viewport").first().hover();
  await expect
    .poll(() =>
      rows
        .first()
        .evaluate((node) => getComputedStyle(node).animationPlayState),
    )
    .toBe("paused");
  await page.mouse.move(1, 1);
  await page.locator(".feature-ribbon").scrollIntoViewIfNeeded();
  const ribbon = page.locator(".feature-ribbon-track");
  const position = await ribbon.evaluate(
    (node) => getComputedStyle(node).transform,
  );
  await expect
    .poll(() => ribbon.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(position);
  await page.locator(".feature-ribbon").focus();
  await expect
    .poll(() =>
      ribbon.evaluate((node) => getComputedStyle(node).animationPlayState),
    )
    .toBe("paused");
  await expect
    .poll(() =>
      rows
        .first()
        .evaluate((node) => getComputedStyle(node).animationPlayState),
    )
    .toBe("paused");
});
test("responsive references, reduced motion, mobile menu, real logo and sign-in screenshots", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".marquee-track")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  for (const width of [1536, 1440, 1280, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBe(true);
    expect(
      await page
        .locator("h1")
        .evaluate((node) => node.scrollWidth <= node.clientWidth),
      `headline at ${width}`,
    ).toBe(true);
    await page.screenshot({
      path: `outputs/new-design/${browserName}-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator(".m-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".m-nav")).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .locator(".m-nav")
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(page.locator(".m-nav")).toBeHidden();
  await expect(page.locator(".m-nav a[href='#pricing']")).toHaveAttribute(
    "aria-current",
    "location",
  );
  await page.goto("/sign-in");
  await expect(
    page.getByRole("button", { name: "Sign in with publik", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `outputs/new-design/${browserName}-sign-in-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.screenshot({
    path: `outputs/new-design/${browserName}-sign-in-desktop.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
