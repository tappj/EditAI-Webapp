import test from "node:test";
import assert from "node:assert/strict";
import {
  appPalette,
  evaLogoColors,
  evaMaterialColors,
} from "../lib/editor/app-theme.ts";
import { avatarPresets, type AvatarPreset } from "../lib/editor/profile.ts";

test("native dark Home tile palettes match ProfileUploadTheme exactly", () => {
  const tiles = {
    editAI: ["#85c8d8", "#b4a4e3", "#e4b95d", "#8bcfa9"],
    aurora: ["#62c7a2", "#67b7e3", "#b09ae8", "#65c7d0"],
    sunset: ["#eea45e", "#ef8298", "#be9ae7", "#e88f6d"],
    midnight: ["#172d48", "#4b426f", "#795274", "#263c60"],
  };
  for (const [theme, values] of Object.entries(tiles))
    assert.deepEqual(appPalette(theme as AvatarPreset, true).tiles, values);
});

test("Eva material mapping preserves every logo hue with distinct vibrant highlights", () => {
  assert.equal(evaMaterialColors("editAI"), null);
  for (const theme of Object.keys(avatarPresets) as AvatarPreset[]) {
    if (theme === "editAI") continue;
    const source = evaLogoColors(theme)!,
      mapped = evaMaterialColors(theme)!;
    assert.equal(new Set(mapped).size, 3);
    source.forEach((hex, i) => {
      const rgb = (h: string) =>
        [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16) / 255);
      const original = rgb(hex),
        output = rgb(mapped[i]);
      const high = Math.max(...output),
        low = Math.min(...output);
      assert.ok(
        (high - low) / high >= 0.35,
        theme + " has saturated materials",
      );
      assert.ok(high > 0.89, theme + " stays bright even in dark appearance");
      const hue = (v: number[]) =>
        v.map((c) => (c - Math.min(...v)) / (Math.max(...v) - Math.min(...v)));
      hue(original).forEach((v, j) =>
        assert.ok(Math.abs(v - hue(output)[j]) < 0.02),
      );
    });
  }
});

test("Eva uses only light logo palettes while EditAI keeps her original artwork", () => {
  for (const theme of Object.keys(avatarPresets) as AvatarPreset[]) {
    const colors = evaLogoColors(theme);
    if (theme === "editAI") assert.equal(colors, null);
    else assert.deepEqual(colors, appPalette(theme, false).logo);
  }
  assert.notDeepEqual(evaLogoColors("sunset"), appPalette("sunset", true).logo);
  assert.notDeepEqual(
    evaLogoColors("midnight"),
    appPalette("midnight", true).logo,
  );
});
