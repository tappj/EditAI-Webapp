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
  await expect(page.locator(".workflow-authentic-image")).toHaveCount(4);
  await expect(page.locator(".workflow-screen")).toHaveCount(0);
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
test("pricing matches the iOS app tiers, allowances and billing without web checkout", async ({
  page,
}) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(pricing.locator(".pricing-card")).toHaveCount(3);
  await expect(pricing.locator(".plan-price")).toHaveText(["$9.99", "$19.95", "$49.99"]);
  await expect(pricing.locator(".pricing-card").nth(0)).toContainText("10 AI edit starts per month");
  await expect(pricing.locator(".pricing-card").nth(1)).toContainText("100 AI edit starts per month");
  await expect(pricing.locator(".pricing-card").nth(2)).toContainText("Unlimited AI edits per month");
  await expect(pricing.getByRole("radio", { name: /^Pro$/ })).toBeChecked();
  await pricing.getByRole("button", { name: "Annual", exact: true }).click();
  await expect(pricing.locator(".plan-price")).toHaveText(["$6.65", "$13.25", "$33.25"]);
  await expect(pricing.locator(".plan-cadence")).toHaveText([
    "per month, billed $79.90 annually",
    "per month, billed $159.00 annually",
    "per month, billed $399.00 annually",
  ]);
  await pricing.getByRole("radio", { name: /Ultimate/ }).check();
  await expect(pricing.locator(".billing-summary")).toContainText(
    "Ultimate · Annual · $399.00",
  );
  await expect(
    pricing.getByRole("button", { name: "iOS coming soon" }),
  ).toHaveCount(3);
  for (const button of await pricing
    .getByRole("button", { name: "iOS coming soon" })
    .all())
    await expect(button).toBeDisabled();
  await pricing.getByRole("radio", { name: /Starter/ }).check();
  await pricing.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(pricing.locator(".billing-summary")).toContainText(
    "Starter · Monthly",
  );
  await expect(pricing.locator("a[href*='checkout']")).toHaveCount(0);
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

test("Codex glyph field reacts to pointer only in the hero and suspends when hidden", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  const ambient = page.locator(".ambient-hero");
  await expect(page.locator(".ambient-hero")).toHaveCount(1);
  await expect(page.locator(".marketing-hero .ambient-hero")).toHaveCount(1);
  await expect(ambient).toHaveAttribute("data-running", "true");
  const canvas = ambient.locator("canvas");
  const pixels = () =>
    canvas.evaluate((el: HTMLCanvasElement) => {
      const data = el
        .getContext("2d")!
        .getImageData(0, 0, el.width, el.height).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 5) count++;
      return count;
    });
  const before = await pixels();
  await page.mouse.move(100, 450);
  await page.mouse.move(600, 490, { steps: 28 });
  await page.mouse.move(280, 600, { steps: 20 });
  await expect.poll(pixels).toBeGreaterThan(before * 2 + 100);
  const bounds = await canvas.evaluate((el: HTMLCanvasElement) => ({
    width: el.width,
    css: el.clientWidth,
    height: el.height,
    cssHeight: el.clientHeight,
  }));
  expect(bounds.width).toBeLessThanOrEqual(bounds.css * 1.5 + 1);
  expect(bounds.height).toBeLessThanOrEqual(bounds.cssHeight * 1.5 + 1);
  await page.locator(".comparison-section").scrollIntoViewIfNeeded();
  await expect(ambient).toHaveAttribute("data-running", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => scrollTo(0, 0));
  await expect(ambient).toHaveAttribute("data-running", "false");
  await expect.poll(pixels).toBe(0);
});

test("cursor streak stays narrow and clears completely while the pointer remains still", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pending = new Set<number>();
    const schedule = requestAnimationFrame.bind(window),
      cancel = cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = schedule((time) => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
    Object.defineProperty(window, "__cursorFrames", {
      get: () => pending.size,
    });
  });
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");
  const canvas = page.locator(".ambient-hero canvas");
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "true",
  );
  const initial = await canvas.evaluate((el: HTMLCanvasElement) =>
    el
      .getContext("2d")!
      .getImageData(0, 0, el.width, el.height)
      .data.some((n, i) => i % 4 === 3 && n > 0),
  );
  expect(initial).toBe(false);
  await page.mouse.move(150, 450);
  await page.mouse.move(680, 450, { steps: 32 });
  const bounds = await canvas.evaluate((el: HTMLCanvasElement) => {
    const data = el
      .getContext("2d")!
      .getImageData(0, 0, el.width, el.height).data;
    let minY = el.height,
      maxY = 0,
      minX = el.width,
      maxX = 0;
    for (let y = 0; y < el.height; y++)
      for (let x = 0; x < el.width; x++) {
        if (data[(y * el.width + x) * 4 + 3] <= 5) continue;
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    const dpr = el.width / el.clientWidth;
    return { width: (maxX - minX) / dpr, height: (maxY - minY) / dpr };
  });
  expect(bounds.width).toBeGreaterThan(100);
  expect(bounds.height).toBeLessThan(40);
  const samples = await canvas.evaluate(async (el: HTMLCanvasElement) => {
    const hero = el.closest(".marketing-hero")!;
    const mass = () => {
      const data = el
        .getContext("2d")!
        .getImageData(0, 0, el.width, el.height).data;
      let alpha = 0;
      for (let i = 3; i < data.length; i += 4) alpha += data[i];
      return alpha;
    };
    // Repeated move events at the SAME coordinates must not refresh emission.
    const still = setInterval(
      () =>
        hero.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: 680,
            clientY: 450,
            pointerType: "mouse",
            bubbles: true,
          }),
        ),
      30,
    );
    try {
      const values = [mass()];
      await new Promise((resolve) => setTimeout(resolve, 250));
      values.push(mass());
      await new Promise((resolve) => setTimeout(resolve, 650));
      values.push(mass());
      await new Promise((resolve) => setTimeout(resolve, 250));
      values.push(mass());
      return values;
    } finally {
      clearInterval(still);
    }
  });
  expect(samples[0]).toBeGreaterThan(0);
  expect(samples[1]).toBeLessThan(samples[0]);
  expect(samples[2]).toBe(0);
  expect(samples[3]).toBe(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { __cursorFrames: number }).__cursorFrames,
    ),
  ).toBe(0);
  await page.mouse.move(720, 470);
  await page.mouse.move(920, 470, { steps: 12 });
  await expect
    .poll(() =>
      canvas.evaluate((el: HTMLCanvasElement) =>
        el
          .getContext("2d")!
          .getImageData(0, 0, el.width, el.height)
          .data.some((n, i) => i % 4 === 3 && n > 5),
      ),
    )
    .toBe(true);
  await page.mouse.move(1, 1);
  await expect
    .poll(
      () =>
        canvas.evaluate((el: HTMLCanvasElement) =>
          el
            .getContext("2d")!
            .getImageData(0, 0, el.width, el.height)
            .data.some((n, i) => i % 4 === 3 && n > 0),
        ),
      { timeout: 1600 },
    )
    .toBe(false);
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
    page.locator(".capability-card").first().locator(".ombre-stars path"),
  ).toHaveCount(5);
  await expect(
    page.locator(".capability-card").first().locator(".ombre-stars"),
  ).toHaveAttribute("aria-hidden", "true");
  const starColors = await page
    .locator(".capability-card .ombre-stars")
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
  ).toHaveCSS("background-image", /linear-gradient/);
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
  await expect(page.locator(".comparison-highlight")).not.toHaveCSS(
    "box-shadow",
    "none",
  );
});

test("header blends into the hero at the top and gains a surface while scrolling", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.locator(".m-header");
  await expect(header).toHaveAttribute("data-scrolled", "false");
  await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => scrollTo(0, 300));
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(header).toHaveAttribute("data-scrolled", "false");
  await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
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
  await expect(featured).toHaveCSS("background-clip", "text");
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

test("pricing selection keeps previously revealed cards visible", async ({
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
  for (const plan of ["Ultimate", "Starter", "Pro"]) {
    await pricing.getByRole("radio", { name: new RegExp(plan) }).check();
    const opacity = await pricing
      .locator(".pricing-card")
      .evaluateAll(async (nodes) => {
        let minimum = 1;
        for (let i = 0; i < 18; i++) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
          for (const node of nodes)
            minimum = Math.min(minimum, Number(getComputedStyle(node).opacity));
        }
        return minimum;
      });
    expect(opacity).toBe(1);
  }
});
