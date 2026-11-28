import { expect, type Page } from "@playwright/test";

/** Shared browser and installed-renderer checks; no AI requests or auth shortcuts. */
export async function verifyEvaStudio(page: Page) {
  await page
    .getByRole("button", { name: "Open EditAI chat", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit with Eva", exact: true }),
  ).toBeVisible();
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await expect(undo).toBeDisabled();
  await page.getByLabel("Timeline playhead", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Split", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await undo.click();
    await expect(page.locator(".timeline-clip")).toHaveCount(1);
    await redo.click();
    await expect(page.locator(".timeline-clip")).toHaveCount(2);
  }
  await page.getByLabel("Timeline playhead", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Split", exact: true }).click();
  await expect(page.locator(".timeline-clip")).toHaveCount(3);
  for (const [label, count] of [
    ["Undo", 1],
    ["Redo", 3],
  ] as const) {
    await page.evaluate((label) => {
      const button = document.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`,
      )!;
      button.click();
      button.click();
    }, label);
    await expect(page.locator(".timeline-clip")).toHaveCount(count);
  }
  await undo.click();
  for (const icon of [undo, redo]) {
    await page.mouse.move(0, 0);
    await icon.hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toBeVisible();
    const a = await icon.boundingBox(),
      b = await tip.boundingBox();
    expect(Math.abs(b!.x + b!.width / 2 - a!.x - a!.width / 2)).toBeLessThan(3);
    expect(b!.y + b!.height).toBeLessThan(a!.y);
    expect(b!.x).toBeGreaterThanOrEqual(7);
  }
  await page.locator(".timeline-clip").first().click();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Brightness", exact: true });
  await expect(slider).toHaveValue("0");
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  const edited = await slider.inputValue();
  expect(Number(edited)).toBeGreaterThan(0.2);
  await undo.click();
  await expect(slider).toHaveValue("0");
  await redo.click();
  await expect(slider).toHaveValue(edited);
  const resetFilter = page.getByRole("button", {
    name: "Reset filter",
    exact: true,
  });
  const resetAdjust = page.getByRole("button", {
    name: "Reset adjustments",
    exact: true,
  });
  const motion = page.locator(".motion-controls");
  await motion.locator("summary").click();
  const resetAnimation = page.getByRole("button", {
    name: "Reset clip animation",
    exact: true,
  });
  const header = await motion.locator("summary").boundingBox(),
    reset = await resetAnimation.boundingBox();
  expect(
    Math.abs(reset!.y + reset!.height / 2 - header!.y - header!.height / 2),
  ).toBeLessThan(4);
  expect(reset!.x).toBeGreaterThan(header!.x + header!.width / 2);
  const colors = await Promise.all(
    [resetFilter, resetAdjust, resetAnimation].map((x) =>
      x.evaluate((e) => getComputedStyle(e).color),
    ),
  );
  expect(new Set(colors).size).toBe(1);
  await page
    .getByRole("button", { name: "Clip entrance animation: fade", exact: true })
    .click();
  await resetAnimation.click();
  await expect(
    page.getByRole("button", {
      name: "Clip entrance animation: none",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  const timeline = page.getByRole("region", {
    name: "Editing timeline",
    exact: true,
  });
  const handle = page.getByRole("separator", {
    name: "Resize timeline",
    exact: true,
  });
  const initial = await timeline.boundingBox();
  const grip = await handle.boundingBox();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y - 100, { steps: 8 });
  await page.mouse.up();
  const enlarged = await timeline.boundingBox();
  expect(enlarged!.height).toBeGreaterThan(initial!.height + 50);
  await handle.press("End");
  const max = Number(await handle.getAttribute("aria-valuemax"));
  expect((await timeline.boundingBox())!.height).toBeLessThanOrEqual(max + 1);
  await handle.press("Home");
  expect(
    Math.abs((await timeline.boundingBox())!.height - initial!.height),
  ).toBeLessThan(2);
  await handle.press("ArrowDown");
  expect((await timeline.boundingBox())!.height).toBeGreaterThanOrEqual(
    initial!.height - 1,
  );
  const root = await page.locator(".editor").boundingBox(),
    preview = await page.locator(".editor-workspace").boundingBox();
  expect((await timeline.boundingBox())!.y).toBeGreaterThanOrEqual(
    preview!.y + preview!.height - 1,
  );
  expect(
    (await timeline.boundingBox())!.y + (await timeline.boundingBox())!.height,
  ).toBeLessThanOrEqual(root!.y + root!.height + 1);
  await undo.click();
  await expect(
    page.getByRole("button", {
      name: "Clip entrance animation: fade",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await redo.click();
  return {
    evaName: true,
    undoRedo: true,
    sliderUndo: true,
    anchoredTooltips: true,
    headerResets: true,
    neutralResets: true,
    boundedTimelineResize: true,
  };
}
