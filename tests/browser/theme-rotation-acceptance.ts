import { expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { appPalette, evaMaterialColors } from "../../lib/editor/app-theme.ts";
import { avatarPresets, type AvatarPreset } from "../../lib/editor/profile.ts";
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16)).join(", ")})`;

/** Uses normal settings controls; caller owns any fixture session and restores real preferences. */
export async function verifyEvaThemes(page: Page) {
  await mkdir("outputs/eva-gesture", { recursive: true });
  const hashes: Record<string, string[]> = {},
    samples: Record<string, number[][]> = {};
  for (const mode of ["Light", "Dark"]) {
    for (const [key, preset] of Object.entries(avatarPresets)) {
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("radio", { name: mode, exact: true }).check();
      await page
        .getByRole("radio", { name: preset.label, exact: true })
        .check();
      await page.getByRole("button", { name: "Home", exact: true }).click();
      const actor = page.locator(".home-mascot .editai-mascot");
      await expect(actor).toHaveAttribute("data-ready", "true");
      await expect(actor).toHaveAttribute("data-eva-theme", key);
      const expected = appPalette(key as AvatarPreset, mode === "Dark");
      const tiles = await page
        .locator(".tool-card")
        .evaluateAll((nodes) =>
          nodes.map((n) => getComputedStyle(n).backgroundColor),
        );
      expect(tiles).toEqual(expected.tiles.map(rgb));
      if (key === "editAI") {
        await expect(actor.locator(".eva-theme-definitions")).toHaveCount(0);
        await expect(actor.locator(".mascot-body-open")).toHaveCSS(
          "filter",
          "none",
        );
      } else {
        const material = evaMaterialColors(key as AvatarPreset)!;
        const floods = await actor
          .locator("feFlood")
          .evaluateAll((nodes) =>
            nodes.map((n) => n.getAttribute("flood-color")),
          );
        expect(new Set(floods)).toEqual(new Set([...material, "white"]));
        await expect(actor.locator(".mascot-body-open")).toHaveCSS(
          "filter",
          /url/,
        );
      }
      const materials = await actor
        .locator(".mascot-body,.mascot-arm")
        .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).filter));
      expect(new Set(materials).size).toBe(1);
      await page.mouse.move(1439, 959);
      await actor.evaluate((el) => {
        el.style.setProperty("--mascot-size", "240px");
        el.style.background = "#20252b";
        Object.assign(el.style, {
          position: "fixed",
          left: "20px",
          top: "20px",
          zIndex: "100",
        });
        el.querySelectorAll("*").forEach((n) =>
          n.getAnimations().forEach((a) => {
            a.pause();
            a.currentTime = 0;
          }),
        );
      });
      // Let runtime filter paints settle after the five raster load events.
      await page.waitForTimeout(120);
      const bytes = await actor.screenshot();
      await writeFile(`outputs/eva-gesture/qa-${mode}-${key}.png`, bytes);
      await actor.evaluate((el) => {
        for (const key of ["position", "left", "top", "z-index"])
          el.style.removeProperty(key);
      });
      const hash = createHash("sha256").update(bytes).digest("hex");
      (hashes[key] ||= []).push(hash);
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const pixel = [
        ...data.subarray(
          (Math.round(info.height * 0.73) * info.width +
            Math.round(info.width * 0.66)) *
            4,
          (Math.round(info.height * 0.73) * info.width +
            Math.round(info.width * 0.66)) *
            4 +
            3,
        ),
      ].slice(0, 3);
      (samples[key] ||= []).push(pixel);
    }
  }
  for (const key of Object.keys(hashes)) {
    expect(hashes[key][0], key + " stays on its light logo palette").toBe(
      hashes[key][1],
    );
    expect(samples[key][0]).toEqual(samples[key][1]);
  }
  expect(new Set(Object.values(hashes).map((x) => x[0])).size).toBe(8);
  expect(
    new Set(Object.values(samples).map((x) => x[0].join(","))).size,
  ).toBeGreaterThanOrEqual(7);
  return {
    vibrantMapping: true,
    allEightThemes: true,
    nativeDarkTiles: true,
    lightLogoOnly: true,
    defaultPreserved: true,
    appearanceIndependent: true,
  };
}

/** Assumes a newly imported overlay is selected at a visible time. */
export async function verifyOverlayRotation(page: Page) {
  await mkdir("outputs/eva-gesture", { recursive: true });
  const selection = page.locator(".preview-selection");
  const corner = page.getByRole("button", {
    name: "Resize ne edge of selected layer",
    exact: true,
  });
  const readAngle = () =>
    selection.evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    });
  const grip = async () => {
    const box = (await corner.boundingBox())!,
      bounds = (await selection.boundingBox())!;
    return {
      start: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      center: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      },
    };
  };
  const pointAt = (
    p: { x: number; y: number },
    center: { x: number; y: number },
    degrees: number,
  ) => {
    const a = (degrees * Math.PI) / 180,
      x = p.x - center.x,
      y = p.y - center.y;
    return {
      x: center.x + x * Math.cos(a) - y * Math.sin(a),
      y: center.y + x * Math.sin(a) + y * Math.cos(a),
    };
  };
  const mouseTo = (p: { x: number; y: number }, steps = 1) =>
    page.mouse.move(p.x, p.y, { steps });
  await expect(corner).toBeVisible();
  await corner.hover();
  await expect(corner).not.toHaveCSS("cursor", /rotate\.svg/);
  await expect(page.locator(".preview-rotate")).toHaveCount(0);
  // Clicking away clears selection; the actual visible overlay selects it again.
  const canvas = (await page
    .getByLabel("Video preview", { exact: true })
    .boundingBox())!;
  await page.mouse.click(canvas.x + 5, canvas.y + 5);
  await expect(selection).toHaveCount(0);
  await page.locator(".preview-overlay-hit").click();
  await expect(corner).toBeVisible();
  await expect(page.locator(".overlay-row .sequence-item")).toHaveClass(
    /selected/,
  );
  // A diagonal pull resizes, and normal jitter does not unlock tilt.
  let { start, center } = await grip();
  const width = (await selection.boundingBox())!.width;
  await mouseTo(start);
  await page.mouse.down();
  await mouseTo(
    {
      x: start.x + (start.x - center.x) * 0.15,
      y: start.y + (start.y - center.y) * 0.15 + 2,
    },
    8,
  );
  await expect(selection).toHaveAttribute("data-transform-mode", "resize");
  expect(await readAngle()).toBeCloseTo(0, 0);
  await page.mouse.up();
  expect((await selection.boundingBox())!.width).toBeGreaterThan(width);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  // A deliberate vertical pull breaks the diagonal lock. Rotation continues from
  // that exact pointer/geometry, with the opposing-arrow cursor only in this mode.
  ({ start, center } = await grip());
  await mouseTo(start);
  await page.mouse.down();
  const broken = { x: start.x, y: start.y + 45 };
  await mouseTo(broken);
  await expect(selection).toHaveAttribute("data-transform-mode", "rotate");
  await expect(corner).toHaveCSS("cursor", /rotate\.svg/);
  expect(await readAngle()).toBeCloseTo(0, 0);
  const originalSize = await selection.evaluate((e) => ({
    width: e.clientWidth,
    height: e.clientHeight,
  }));
  const radialPoint = (scale: number) => ({
    x: center.x + (broken.x - center.x) * scale,
    y: center.y + (broken.y - center.y) * scale,
  });
  await mouseTo(radialPoint(1.18), 5);
  expect(await selection.evaluate((e) => e.clientWidth)).toBeGreaterThan(
    originalSize.width * 1.1,
  );
  await mouseTo(radialPoint(0.84), 5);
  expect(await selection.evaluate((e) => e.clientWidth)).toBeLessThan(
    originalSize.width * 0.94,
  );
  await mouseTo(broken, 5);
  await expect(selection).toHaveAttribute("data-transform-mode", "rotate");
  await mouseTo(pointAt(broken, center, 36), 10);
  await page.mouse.up();
  expect(Math.abs((await readAngle()) - 36)).toBeLessThan(1.5);
  const saved = await readAngle();
  await expect(page.locator("html")).not.toHaveClass(/preview-rotating/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await readAngle()).toBeCloseTo(0, 0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(await readAngle()).toBeCloseTo(saved, 3);
  // Actual pointer snap to upright, hold inside hysteresis, then release.
  ({ start, center } = await grip());
  await mouseTo(start);
  await page.mouse.down();
  const radius = { x: start.x - center.x, y: start.y - center.y },
    length = Math.hypot(radius.x, radius.y);
  const tilt = {
    x: start.x - (radius.y / length) * 45,
    y: start.y + (radius.x / length) * 45,
  };
  await mouseTo(tilt);
  await mouseTo(pointAt(tilt, center, 1 - saved), 8);
  expect(await readAngle()).toBeCloseTo(0, 0);
  await mouseTo(pointAt(tilt, center, 4 - saved));
  expect(await readAngle()).toBeCloseTo(0, 0);
  await mouseTo(pointAt(tilt, center, 7 - saved));
  expect(Math.abs((await readAngle()) - 7)).toBeLessThan(1.5);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await readAngle()).toBeCloseTo(saved, 3);
  await expect(page.locator("html")).not.toHaveClass(/preview-rotating/);
  await corner.focus();
  await corner.press("Home");
  await corner.press("ArrowRight");
  await corner.press("ArrowRight");
  expect(await readAngle()).toBeCloseTo(10, 0);
  ({ start, center } = await grip());
  await mouseTo(start);
  await page.mouse.down();
  await mouseTo(
    {
      x: start.x + (start.x - center.x) * 0.12,
      y: start.y + (start.y - center.y) * 0.12,
    },
    5,
  );
  await page.mouse.up();
  expect(await readAngle()).toBeCloseTo(10, 0);
  await page.getByRole("button", { name: "Reset crop", exact: true }).click();
  expect(await readAngle()).toBeCloseTo(0, 0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await readAngle()).toBeCloseTo(10, 0);
  return {
    simultaneousResize: true,
    breakaway: true,
    uprightSnap: true,
    previewSelection: true,
    activeCursorOnly: true,
    continuousRotation: true,
    undoRedo: true,
    cancel: true,
    keyboard: true,
    rotatedResize: true,
    reset: true,
  };
}

/** Verify actual encoded pixels, not only that an MP4 file was created. */
export async function verifyExportedRotation(file: string, expected: number) {
  const png = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-ss",
      "1",
      "-i",
      file,
      "-frames:v",
      "1",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "pipe:1",
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows = new Map<number, number[]>();
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] > 180 && data[i + 1] < 80 && data[i + 2] < 80) {
        const row = rows.get(y) || [];
        row.push(x);
        rows.set(y, row);
      }
    }
  const ys = [...rows.keys()];
  expect(ys.length).toBeGreaterThan(30);
  const top = Math.min(...ys),
    bottom = Math.max(...ys);
  const y0 = Math.round(top + (bottom - top) * 0.3),
    y1 = Math.round(top + (bottom - top) * 0.7);
  const angle =
    (Math.atan(
      (Math.min(...rows.get(y0)!) - Math.min(...rows.get(y1)!)) / (y1 - y0),
    ) *
      180) /
    Math.PI;
  expect(Math.abs(angle - expected), "encoded overlay rotation").toBeLessThan(
    2,
  );
  return angle;
}
