import { test, expect } from "@playwright/test";
import { build } from "esbuild";
// Exercise the actual shared layout with browser font metrics, including the
// bundled variable font, rather than substituting character-count estimates.
let layoutCode = "";
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["lib/editor/text-layout.ts"],
    bundle: true,
    format: "iife",
    globalName: "TextFit",
    write: false,
  });
  layoutCode = result.outputFiles[0].text;
});
test("long caption and manual-text words keep their natural font width with padding", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ DNT: "1" });
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: { id: "sign_in", buttons: [] },
        profile: { telemetry: false, consent: false },
      },
    }),
  );
  await page.goto("/");
  await page.addScriptTag({ content: layoutCode });
  const results = await page.evaluate(async () => {
    await document.fonts.load('700 60px "TikTok Sans"');
    const ctx = document.createElement("canvas").getContext("2d")!;
    const output = [];
    for (const font of ["TikTok Sans", "Arial"])
      for (const text of [
        "without",
        "semester",
        "WWW",
        "without semester",
        "without\u00a0semester",
        "W".repeat(100),
      ]) {
        const layer = {
          text,
          size: 0.08,
          boxWidth: 0.05,
          font,
          fontWeight: 700,
          background: "transparent",
          outline: true,
        };
        const fit = (window as any).TextFit.textLayout(ctx, layer, 1080, 1920);
        output.push({
          text,
          lines: fit.lines,
          width: fit.boxWidth * fit.fit,
          fits: fit.lines.every(
            (line: string) =>
              ctx.measureText(line).width <= fit.contentWidth + 0.01,
          ),
          padding: fit.padding,
          size: fit.size,
          uniformFit: fit.fit,
        });
      }
    return output;
  });
  for (const result of results) {
    expect(result.fits).toBe(true);
    expect(result.width).toBeLessThanOrEqual(1080 * 0.96 + 0.01);
    expect(result.padding).toBeGreaterThanOrEqual(result.size * 0.18);
    expect(result.lines.join(" ").replace(/ /g, "")).toBe(
      result.text.replace(/ /g, ""),
    );
    if (result.text.length < 100) expect(result.uniformFit).toBe(1);
  }
});
