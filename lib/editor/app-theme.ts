import { avatarPresets, type AvatarPreset } from "./profile";

// Native ProfileUploadTheme.swift palettes. Brand themes never change editor controls.
export type AppColorTheme = AvatarPreset;
type Palette = {
  logo: readonly string[];
  brand: readonly string[];
  tiles: readonly string[];
};
const native: Record<string, { light: Palette; dark: Palette }> = {
  editAI: {
    light: {
      logo: ["#90dce8", "#c9bdf2", "#f8e894"],
      brand: ["#d1f2f7", "#e6e0ff", "#ffe3d9"],
      tiles: ["#ddf1f6", "#eae6f8", "#f7eacb", "#dff2e4"],
    },
    dark: {
      logo: ["#8ccfdc", "#b0a4de", "#e5ad9b"],
      brand: ["#8ccfdc", "#b0a4de", "#e5ad9b"],
      tiles: ["#85c8d8", "#b4a4e3", "#e4b95d", "#8bcfa9"],
    },
  },
  aurora: {
    light: {
      logo: avatarPresets.aurora.colors,
      brand: avatarPresets.aurora.colors,
      tiles: ["#b8f0de", "#b5dff5", "#d9c7f7", "#b5e5e5"],
    },
    dark: {
      logo: ["#65cfa9", "#68b9e6", "#b39ae7"],
      brand: ["#65cfa9", "#68b9e6", "#b39ae7"],
      tiles: ["#62c7a2", "#67b7e3", "#b09ae8", "#65c7d0"],
    },
  },
  sunset: {
    light: {
      logo: avatarPresets.sunset.colors,
      brand: avatarPresets.sunset.colors,
      tiles: ["#f9d4af", "#f6b8c4", "#e0c4f3", "#f1c2a0"],
    },
    dark: {
      logo: ["#f4a55e", "#ef849b", "#be9ae7"],
      brand: ["#f4a55e", "#ef849b", "#be9ae7"],
      tiles: ["#eea45e", "#ef8298", "#be9ae7", "#e88f6d"],
    },
  },
  midnight: {
    light: {
      logo: avatarPresets.midnight.colors,
      brand: avatarPresets.midnight.colors,
      tiles: ["#172d48", "#4b426f", "#795274", "#263c60"],
    },
    dark: {
      logo: ["#7c9fcc", "#a797d1", "#cb9cc1"],
      brand: avatarPresets.midnight.colors,
      tiles: ["#172d48", "#4b426f", "#795274", "#263c60"],
    },
  },
};

export function appPalette(theme: AppColorTheme, dark: boolean): Palette {
  if (native[theme]) return native[theme][dark ? "dark" : "light"];
  const colors = avatarPresets[theme].colors;
  return { logo: colors, brand: colors, tiles: [...colors, colors[0]] };
}

export function appThemeStyle(theme: AppColorTheme, dark: boolean) {
  const palette = appPalette(theme, dark);
  return {
    "--app-logo": `linear-gradient(135deg, ${palette.logo.join(", ")})`,
    "--app-brand": `linear-gradient(135deg, ${palette.brand.join(", ")})`,
    "--app-brand-ink": theme === "midnight" ? "#fff" : "#111",
    "--app-tile-muted":
      theme === "midnight" ? "#ffffffd1" : dark ? "#111" : "#606770",
    ...Object.fromEntries(
      ["record", "batch", "analyze", "transcribe"].map((name, i) => [
        `--app-tile-${name}`,
        palette.tiles[i],
      ]),
    ),
  };
}
