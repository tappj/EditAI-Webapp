import { test, expect } from "@playwright/test";

for (const [theme, system, expected] of [
  ["dark", "light", "dark"],
  ["light", "dark", "light"],
  ["system", "dark", "dark"],
] as const) {
  test(`opening screen keeps ${theme} appearance before hydration and on refresh`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: system, reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem(
        "editai-studio-onboarding-v1",
        JSON.stringify({ step: "account", answers: {} }),
      );
      localStorage.setItem(
        "editai-preferences",
        JSON.stringify({ theme, language: "auto", appTheme: "ocean" }),
      );
    }, theme);
    let resume!: () => void;
    const scripts = new Promise<void>((resolve) => {
      resume = resolve;
    });
    let finish!: () => void;
    const session = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await page.route(/\.js(?:\?|$)/, async (route) => {
      if (!new URL(route.request().url()).pathname.endsWith("/appearance.js"))
        await scripts;
      await route.continue();
    });
    await page.route("**/api/session", async (route) => {
      await session;
      await route.fulfill({
        status: 503,
        json: { error: "Isolated loading-screen fixture" },
      });
    });
    try {
      await page.goto("/sign-in", { waitUntil: "commit" });
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        expected,
      );
      // The bootstrap must work before the application bundles execute.
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        expected === "dark" ? "rgb(23, 27, 33)" : "rgb(246, 247, 248)",
      );
      resume();
      const loading = page.locator(".studio-loading");
      await expect(
        loading.getByRole("heading", { name: "Opening your studio…" }),
      ).toBeVisible();
      await expect(loading.locator(".editai-mascot")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await expect(loading.locator(".editai-mascot")).toHaveAttribute(
        "data-interacting",
        "true",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(loading.locator(".mascot-wave")).toHaveCSS(
        "animation-name",
        "mascot-wave-step",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(loading.locator(".mascot-wave")).toHaveCSS(
        "animation-name",
        "none",
      );
      await expect(
        page.locator(
          ".sign-in-card, .sign-in-header, .sign-in-platforms, .marketing-sign-in > footer",
        ),
      ).toHaveCount(0);
      await expect(page.locator(".marketing-sign-in")).toHaveCSS(
        "background-color",
        expected === "dark" ? "rgb(23, 27, 33)" : "rgb(246, 247, 248)",
      );
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("editai-preferences")!).theme,
        ),
      ).toBe(theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const box = await loading.boundingBox();
        expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
        expect(Math.abs(box!.y + box!.height / 2 - 450)).toBeLessThan(2);
      }
      await page.screenshot({ path: `outputs/wave55/loading-${theme}.png` });
      await page.reload({ waitUntil: "commit" });
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        expected,
      );
      await expect(
        page.locator(".studio-loading .editai-mascot"),
      ).toHaveAttribute("data-ready", "true");
      finish();
      await expect(page.getByRole("alert")).toContainText(
        "Isolated loading-screen fixture",
      );
      await expect(page.locator(".marketing-sign-in")).toHaveCSS(
        "background-color",
        expected === "dark" ? "rgb(23, 27, 33)" : "rgb(246, 247, 248)",
      );
    } finally {
      resume();
      finish();
    }
  });
}
