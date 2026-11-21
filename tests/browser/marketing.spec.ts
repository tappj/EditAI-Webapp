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
      "EditAI cuts out the empty space, finds the best takes, and adds captions.",
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
  await expect(page.locator(".workflow-authentic-image")).toHaveCount(4);
  await expect(page.locator(".workflow-screen")).toHaveCount(0);
  await expect(page.locator(".feature-card")).toHaveCount(7);
  await expect(page.locator(".ribbon-item")).toHaveCount(8);
  await expect(page.locator(".marketing-video")).toHaveCount(3);
  await expect(page.locator("#creators video")).toHaveCount(3);
  await expect(page.locator(".review-stars")).toHaveCount(0);
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
    page.getByRole("button", { name: "Continue", exact: true }),
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
  ).toHaveText("AI Edit");
  await page
    .locator(".workflow-switcher")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(page.locator(".workflow-step.active")).toContainText(
    "02 · SEND",
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
test("web and desktop pricing offers free editing, Publik plans and own-key entry", async ({
  page,
}) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(pricing.locator(".pricing-card")).toHaveCount(3);
  await expect(pricing.locator(".plan-heading")).toHaveText([
    "EditAI Editor",
    "Publik Basic",
    "Publik Pro",
  ]);
  await expect(pricing.locator(".plan-price")).toHaveText([
    "Free",
    "$8",
    "$20",
  ]);
  await expect(
    pricing.getByRole("button", { name: "Annual", exact: true }),
  ).toHaveCount(0);
  await expect(pricing).toContainText(
    "No Publik subscription is required for the own-key option",
  );
  await expect(pricing).toContainText("iOS subscriptions are separate");
  await expect(
    pricing.getByRole("link", { name: "View current Publik plans" }),
  ).toHaveAttribute("href", "https://publikhq.com/pricing");
  for (const link of await pricing.locator(".pricing-card .m-button").all())
    await expect(link).toHaveAttribute("href", "/sign-in");
  await pricing
    .getByRole("link", { name: "Use my own OpenAI API key" })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
});
test("calculator follows volume with the requested labels and explicit configured assumptions", async ({
  page,
}) => {
  await page.goto("/");
  const calculator = page.locator(".time-calculator");
  await calculator.scrollIntoViewIfNeeded();
  await expect(calculator.locator(".calculator-results")).toContainText(
    "7.5 hrs",
  );
  await page.getByRole("slider", { name: "Videos a week" }).fill("20");
  await expect(calculator.locator(".calculator-results")).toContainText(
    "15 hrs",
  );
  await expect(calculator.locator(".calculator-results")).toContainText(
    "60 hrs",
  );
  await expect(calculator.getByRole("img")).toHaveAttribute(
    "aria-label",
    /80 without EditAI, 20 for EditAI Users/,
  );
  await expect(calculator.locator(".chart-end-label")).toHaveText([
    "Without EditAI",
    "EditAI Users",
  ]);
  await expect(
    calculator.locator(
      ".chart-legend,.calculator-assumptions,input[type=number]",
    ),
  ).toHaveCount(0);
  await expect(calculator.locator(".calculator-results")).toContainText(
    "back every week",
  );
  await expect(calculator.locator(".calculator-results")).toContainText(
    "back every month",
  );
  await expect(calculator.locator(".calculator-disclaimer")).toContainText(
    "not a measured EditAI user result",
  );
  await expect(calculator.locator(".calculator-disclaimer")).toContainText(
    "Monthly estimates use four weeks",
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
    .getByRole("button", { name: "Do I need an EditAI subscription?" })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Do I need an EditAI subscription?",
    }),
  ).toContainText("No EditAI subscription is required for Web or Desktop");
  await page
    .getByRole("button", { name: "Privacy & data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("browser strips stay still and reviews remain horizontally reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  for (const track of await page.locator(".marquee-track,.feature-ribbon-track").all()) {
    expect(await track.evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  }
  const reviews = page.locator(".marquee-viewport").first();
  expect(await reviews.evaluate(node => {
    node.scrollLeft = node.scrollWidth;
    return node.scrollLeft > 0;
  })).toBe(true);
  await expect(page.locator(".ambient-hero")).toBeHidden();
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
    page.getByRole("button", { name: "Continue", exact: true }),
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

test("ruler drag, keyboard bounds and interruptible numbers stay in sync", async ({
  page,
}) => {
  await page.goto("/");
  const calculator = page.locator(".time-calculator");
  await calculator.scrollIntoViewIfNeeded();
  const slider = page.getByRole("slider", { name: "Videos a week" });
  await slider.press("Home");
  await expect(slider).toHaveValue("1");
  await expect(calculator.locator(".range-value")).toHaveText("1 videos");
  // Begin sampling at the input event, before a slow browser automation round-trip
  // can allow the animation to settle. This observes the actual user interaction.
  await calculator.locator(".range-value").evaluate((el) => {
    const input = el.closest(".calculator-range")!.querySelector("input")!;
    input.addEventListener(
      "input",
      () => {
        const values: number[] = [];
        const sample = () => {
          values.push(Number.parseFloat(el.textContent || "0"));
          if (values.length < 16) requestAnimationFrame(sample);
          else el.setAttribute("data-samples", JSON.stringify(values));
        };
        requestAnimationFrame(sample);
      },
      { once: true },
    );
  });
  await slider.press("End");
  await expect(slider).toHaveValue("50");
  await expect(calculator.locator(".range-value")).toHaveAttribute(
    "data-samples",
    /^\[/,
  );
  const frames: number[] = JSON.parse(
    (await calculator.locator(".range-value").getAttribute("data-samples"))!,
  );
  expect(new Set(frames).size).toBeGreaterThan(3);
  expect(frames.some((value) => value > 1 && value < 50)).toBe(true);
  await expect(calculator.locator(".range-value")).toHaveText("50 videos");
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width - 13, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.32, box.y + box.height / 2, {
    steps: 20,
  });
  await page.mouse.up();
  const value = Number(await slider.inputValue());
  expect(value).toBeGreaterThan(12);
  expect(value).toBeLessThan(20);
  await expect(calculator.locator(".range-value")).toHaveText(
    `${value} videos`,
  );
  await expect(slider).toHaveAttribute(
    "aria-valuetext",
    `${value} videos per week`,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await slider.press("Home");
  await expect(calculator.locator(".range-value")).toHaveText("1 videos");
  await expect(calculator.locator(".calculator-results")).toContainText(
    "0.8 hrs",
  );
});

test("browser hero stays calm during pointer movement", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".ambient-hero")).toBeHidden();
  await page.mouse.move(100, 450);
  await page.mouse.move(600, 490, { steps: 28 });
  await expect(page.locator(".ambient-hero")).toHaveAttribute("data-running", "false");
  await expect(page.locator(".hero-primary-actions .m-button")).toHaveCSS("color", "rgb(255, 255, 255)");
});

test("hero badges, matching install actions, ombre stars and the raised EditAI column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".hero-proof-badge")).toBeVisible();
  await expect(page.locator(".hero-proof-badge")).toHaveText(
    "saved 250+ hours of editing",
  );
  await expect(page.locator(".hero-proof-badge strong")).toHaveText(
    "250+ hours",
  );
  const portraits = page.locator(".hero-avatar img");
  await expect(portraits).toHaveCount(4);
  await expect
    .poll(() =>
      portraits.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            (node as HTMLImageElement).complete &&
            (node as HTMLImageElement).naturalWidth === 1080,
        ),
      ),
    )
    .toBe(true);
  const circles = await page.locator(".hero-avatar").evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, width: r.width, height: r.height };
    }),
  );
  for (let i = 0; i < circles.length; i++) {
    expect(circles[i].width).toBe(circles[i].height);
    if (i > 0) {
      expect(circles[i].x).toBeGreaterThan(circles[i - 1].x);
      expect(circles[i].x).toBeLessThan(
        circles[i - 1].x + circles[i - 1].width,
      );
    }
  }
  await expect(page.locator(".platform-badge")).toHaveText("Web + macOS");
  await expect(page.locator(".platform-badge svg")).toBeVisible();
  const web = page.locator(".hero-primary-actions .m-button");
  const install = page.locator(".hero-primary-actions .hero-mac-install");
  await expect(install).toBeVisible();
  const wb = (await web.boundingBox())!,
    ib = (await install.boundingBox())!;
  expect(Math.abs(wb.width - ib.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(wb.height - ib.height)).toBeLessThanOrEqual(1);
  const watch = (await page.locator(".hero-watch").boundingBox())!;
  expect(watch.y).toBeGreaterThan(wb.y + wb.height);
  await expect(
    page.locator(".review-card").first().locator(".ombre-stars path"),
  ).toHaveCount(5);
  await expect(
    page.locator(".review-card").first().locator(".ombre-stars"),
  ).toHaveAttribute("aria-hidden", "true");
  const starColors = await page
    .locator(".review-card .ombre-stars")
    .first()
    .evaluate(async (svg) => {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 108;
      canvas.height = 20;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, 108, 20).data;
      let gold = 0,
        lavender = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 200) continue;
        if (pixels[i] > pixels[i + 2] + 15) gold++;
        if (pixels[i + 2] > pixels[i + 1] + 15 && pixels[i] > 160) lavender++;
      }
      return { gold, lavender };
    });
  expect(starColors.gold).toBeGreaterThan(5);
  expect(starColors.lavender).toBeGreaterThan(5);
  await expect(page.locator("body")).not.toContainText("EDITAI WORKFLOW");
  await expect(page.locator("body")).not.toContainText(
    "EDIT · CAPTION · TRANSCRIBE · EXPORT",
  );
  await expect(page.locator("body")).not.toContainText(
    "CREATOR SHOWCASE COMING SOON",
  );
  await expect(page.locator("body")).not.toContainText("Adjust editing time");
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(
    page.locator(".workflow-switcher button[data-featured=true]"),
  ).toHaveText("AI Edit");
  await expect(
    page.locator(".workflow-switcher button[data-featured=true]"),
  ).toHaveCSS("background-image", "none");
  await page.locator(".workflow-table-wrap").scrollIntoViewIfNeeded();
  await expect(page.locator(".workflow-table thead th")).toHaveText([
    "Workflow",
    "EDIT IT YOURSELF",
    "HIRE AN EDITOR",
    "EDITAI",
  ]);
  const highlight = (await page
    .locator(".comparison-highlight")
    .boundingBox())!;
  const cell = (await page
    .locator(".workflow-table tbody tr")
    .first()
    .locator("td")
    .last()
    .boundingBox())!;
  expect(Math.abs(highlight.x - cell.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(highlight.width - cell.width)).toBeLessThanOrEqual(2);
  await expect(page.locator(".comparison-highlight")).toHaveCSS(
    "box-shadow",
    "none",
  );
});

test("header retains a readable surface while scrolling", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.locator(".m-header");
  await expect(header).toHaveAttribute("data-scrolled", "false");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => scrollTo(0, 300));
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(header).toHaveAttribute("data-scrolled", "false");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("authentic Upload, Send, AI Edit and Export screenshots remain visible through repeated selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  await page.getByRole("link", { name: "See it in action" }).click();
  const cards = page.locator(".workflow-step");
  const images = page.locator(".workflow-authentic-image");
  await expect(page.locator(".workflow-switcher button")).toHaveText([
    "Upload",
    "Send",
    "AI Edit",
    "Export",
  ]);
  await expect
    .poll(() =>
      cards.evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).opacity === "1"),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      images.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            (node as HTMLImageElement).complete &&
            (node as HTMLImageElement).naturalWidth === 1170 &&
            (node as HTMLImageElement).naturalHeight === 2532,
        ),
      ),
    )
    .toBe(true);
  expect(
    await images.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("src")),
    ),
  ).toEqual([
    "/marketing/workflow/upload.png",
    "/marketing/workflow/send.png",
    "/marketing/workflow/ai-edit.png",
    "/marketing/workflow/export.png",
  ]);
  const featured = page.locator(
    ".workflow-switcher button[data-featured=true]",
  );
  await expect(featured).toHaveText("AI Edit");
  await expect(featured).toHaveCSS("background-clip", "border-box");
  await expect(featured).toHaveCSS("box-shadow", "none");
  await expect(featured).toHaveCSS("border-top-width", "0px");
  for (const title of [
    "Send",
    "Export",
    "Upload",
    "AI Edit",
    "Send",
    "AI Edit",
  ]) {
    await page
      .locator(".workflow-switcher")
      .getByRole("button", { name: title, exact: true })
      .click();
    await expect(
      page.locator(".workflow-switcher button[aria-pressed=true]"),
    ).toHaveText(title);
    const minOpacity = await cards.evaluateAll(async (nodes) => {
      let minimum = 1;
      // Include the longest reveal stagger: a clobbered class used to fade after 195ms.
      for (let i = 0; i < 18; i++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        for (const node of nodes)
          minimum = Math.min(minimum, Number(getComputedStyle(node).opacity));
      }
      return minimum;
    });
    expect(minOpacity, `images faded after selecting ${title}`).toBe(1);
    await expect(images).toHaveCount(4);
  }
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      cards.evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).opacity === "1"),
      ),
    )
    .toBe(true);
  const geometry = await images.evaluateAll((nodes) =>
    nodes.map((node) => ({
      displayed: node.clientWidth / node.clientHeight,
      natural:
        (node as HTMLImageElement).naturalWidth /
        (node as HTMLImageElement).naturalHeight,
      fit: getComputedStyle(node).objectFit,
    })),
  );
  for (const image of geometry) {
    expect(Math.abs(image.displayed - image.natural)).toBeLessThan(0.005);
    expect(image.fit).toBe("contain");
  }
});

test("pricing cards remain visible after focus and scrolling", async ({
  page,
}) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      pricing
        .locator(".pricing-card")
        .evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).opacity === "1"),
        ),
    )
    .toBe(true);
  await pricing.getByRole("link", { name: "Open EditAI", exact: true }).focus();
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await pricing.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      pricing
        .locator(".pricing-card")
        .evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).opacity === "1"),
        ),
    )
    .toBe(true);
});
