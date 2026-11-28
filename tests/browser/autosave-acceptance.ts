import { expect, type Page } from "@playwright/test";

/** Delay only owned test-project writes; release them to the normal persistence path. */
export async function verifyAutosaveFeedback(page: Page) {
  const originalReducedMotion = await page.evaluate(() =>
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".timeline-clip").first().click();
  await page.getByRole("button", { name: "Clip", exact: true }).click();
  const volume = page.getByLabel("Volume value", { exact: true });
  const originalVolume = await volume.inputValue();
  const state = page.locator(".autosave");
  await expect(state).toHaveAttribute("data-state", "saved");
  await page.evaluate(() => {
    const original = window.fetch;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fixture = { original, release, writes: 0, holding: true };
    (window as any).__autosaveFixture = fixture;
    window.fetch = async (input, init) => {
      const path = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        location.href,
      ).pathname;
      if (
        path === "/api/projects" &&
        init?.method === "POST" &&
        fixture.holding
      ) {
        fixture.writes++;
        await gate;
      }
      return original(input, init);
    };
  });
  try {
    await volume.fill("73");
    await volume.press("Enter");
    await expect(state).toHaveAttribute("data-state", "saving");
    await expect(state.locator("svg")).toHaveAttribute("width", "13");
    await expect(state.locator("svg")).toHaveCSS(
      "animation-name",
      "autosave-turn",
    );
    const colors = await state.evaluate((el) => [
      getComputedStyle(el).color,
      getComputedStyle(el.querySelector("svg")!).color,
    ]);
    expect(colors[1]).toBe(colors[0]);
    await expect
      .poll(() => page.evaluate(() => (window as any).__autosaveFixture.writes))
      .toBe(1);
    await volume.fill("64");
    await volume.press("Enter");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(state.locator("svg")).toHaveCSS("animation-name", "none");
    await expect(state).toHaveAttribute("data-state", "saving");
    await page.evaluate(() => {
      const f = (window as any).__autosaveFixture;
      f.holding = false;
      f.release();
    });
    await expect(state).toHaveAttribute("data-state", "saved");
    await expect(state).toHaveText("Autosaved");
    await expect(state.locator("svg")).not.toHaveClass(/autosave-refresh/);
    await expect(
      page.getByRole("button", { name: "Support", exact: true }),
    ).toHaveAttribute("title", "Support");
    await page.getByRole("button", { name: "Help", exact: true }).hover();
    await expect(page.locator(".editor-control-tooltip")).toHaveText("Help");
    return {
      pending: true,
      backgroundWrites: true,
      completedCheck: true,
      smallMutedIcon: true,
      reducedMotion: true,
      tooltips: true,
    };
  } finally {
    await page.evaluate(() => {
      const f = (window as any).__autosaveFixture;
      if (f) {
        f.holding = false;
        f.release();
        window.fetch = f.original;
        delete (window as any).__autosaveFixture;
      }
    });
    await volume.fill(originalVolume);
    await volume.press("Enter");
    await expect(state).toHaveAttribute("data-state", "saved");
    await page.emulateMedia({
      reducedMotion: originalReducedMotion ? "reduce" : "no-preference",
    });
    await page.mouse.move(0, 0);
  }
}
