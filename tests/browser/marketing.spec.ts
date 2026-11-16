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

test("marketing copy, section order, honest placeholders and real app entry", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("EditAI: #1 Video Editor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Film freely.Let EditAI do the editing.",
  );
  await expect(
    page.getByText(
      "We find your best takes, add captions, and make every frame yours.",
      { exact: true },
    ),
  ).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(
    /YOUR FOOTAGE\. YOUR VOICE\.|Cut\s?AI|Codex|OpenAI|App Store rating|free trial|1\.7M|40K\+/i,
  );
  expect(text).toContain("iOS coming soon");
  expect(
    await page
      .locator("main > section")
      .evaluateAll((sections) =>
        sections.map((section) => section.className.split(" ")[0]),
      ),
  ).toEqual([
    "marketing-hero",
    "proof-section",
    "product-section",
    "features-section",
    "review-section",
    "gallery-section",
    "marketing-section",
    "faq-section",
    "closing-section",
  ]);
  await expect(page.locator(".feature-card")).toHaveCount(7);
  await expect(page.locator(".ribbon-item")).toHaveCount(8);
  await expect(page.locator(".marketing-video")).toHaveCount(5);
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator(".review-stars")).toHaveCount(0);
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

test("pricing selectors update plan/cadence and keep unannounced checkout disabled", async ({
  page,
}) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(pricing.getByRole("radio", { name: /Creator/ })).toBeChecked();
  await pricing.getByRole("button", { name: "Annual", exact: true }).click();
  await pricing
    .getByRole("button", { name: "Lots to create", exact: true })
    .click();
  await expect(pricing.getByRole("radio", { name: /Studio/ })).toBeChecked();
  await expect(
    pricing.getByRole("button", { name: "Annual", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(pricing.locator(".billing-summary")).toContainText(
    "Studio · Annual pricing to be announced",
  );
  await expect(
    pricing.getByRole("button", { name: "Plans coming soon" }),
  ).toBeDisabled();
  await pricing.getByRole("radio", { name: /Starter/ }).check();
  await expect(pricing.locator(".pricing-benefits")).toContainText(
    "Starter WORKFLOW PREVIEW",
  );
  await pricing.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(pricing.locator(".billing-summary")).toContainText(
    "Starter · Monthly",
  );
  await expect(pricing.locator("a[href*='checkout']")).toHaveCount(0);
});

test("anchor nav, fixed header, keyboard FAQ, expanded questions and privacy", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".m-nav")
    .getByRole("link", { name: "How it works" })
    .click();
  await expect(page.locator(".m-nav a[href='#how-it-works']")).toHaveAttribute(
    "aria-current",
    "location",
  );
  expect(
    await page
      .locator(".m-header")
      .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
  ).toBe(24);
  await page
    .locator(".m-nav")
    .getByRole("link", { name: "FAQ", exact: true })
    .click();
  const first = page.getByRole("button", { name: "Where can I use EditAI?" });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("region", { name: "Where can I use EditAI?" }),
  ).toContainText("iOS is coming soon");
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "See all 12 questions" }).click();
  await expect(page.locator(".faq-row")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Are EditAI subscription prices available?" })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Are EditAI subscription prices available?",
    }),
  ).toContainText("have not been announced");
  await page.getByRole("button", { name: "Show fewer questions" }).click();
  await expect(page.locator(".faq-row")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Privacy & data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("ambient pointer, opposing loops, hover pause, icon movement, offscreen suspension", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "true",
  );
  await page.mouse.move(250, 280);
  await page.mouse.move(450, 350, { steps: 12 });
  await expect
    .poll(() =>
      page
        .locator(".ambient-hero")
        .evaluate((node) => node.style.getPropertyValue("--pointer-x")),
    )
    .not.toBe("");
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
  await page.mouse.move(10, 10);
  await expect
    .poll(() =>
      rows
        .first()
        .evaluate((node) => getComputedStyle(node).animationPlayState),
    )
    .toBe("running");
  await page.locator(".features-section").scrollIntoViewIfNeeded();
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "false",
  );
  const ribbon = page.locator(".feature-ribbon-track");
  const position = await ribbon.evaluate(
    (node) => getComputedStyle(node).transform,
  );
  await expect
    .poll(() => ribbon.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(position);
  await expect
    .poll(() =>
      rows
        .first()
        .evaluate((node) => getComputedStyle(node).animationPlayState),
    )
    .toBe("paused");
});

test("responsive widths, mobile menu, reduced motion and visual evidence", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "false",
  );
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
      `page overflow at ${width}`,
    ).toBe(true);
    expect(
      await page
        .locator("h1")
        .evaluate((node) => node.scrollWidth <= node.clientWidth),
      `headline overflow at ${width}`,
    ).toBe(true);
    await page.screenshot({
      path: `outputs/marketing/${browserName}-${width}.png`,
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
    path: `outputs/marketing/${browserName}-sign-in-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.screenshot({
    path: `outputs/marketing/${browserName}-sign-in-desktop.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
