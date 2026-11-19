export const avatarPresets = {
  editAI: { label: "EditAI", colors: ["#d1f2f7", "#e6e0ff", "#ffe3d9"] },
  aurora: { label: "Aurora", colors: ["#b8f0de", "#b5dff5", "#d9c7f7"] },
  sunset: { label: "Sunset", colors: ["#f9d4af", "#f6b8c4", "#e0c4f3"] },
  rose: { label: "Rose", colors: ["#f3c6df", "#f8d8ce", "#dcc9f0"] },
  ocean: { label: "Ocean", colors: ["#a9ddeb", "#bfd0f5", "#dddffa"] },
  forest: { label: "Forest", colors: ["#b8d8c2", "#d3e6b4", "#eff0cf"] },
  citrus: { label: "Citrus", colors: ["#fae5a7", "#fad5af", "#dcebc1"] },
  midnight: { label: "Midnight", colors: ["#172d48", "#4b426f", "#795274"] },
} as const;

export type AvatarPreset = keyof typeof avatarPresets;
export const appearances = ["system", "light", "dark"] as const;
export type ProfileAppearance = (typeof appearances)[number];
export const validPreset = (value: unknown): value is AvatarPreset =>
  typeof value === "string" && Object.hasOwn(avatarPresets, value);
export const validAppearance = (value: unknown): value is ProfileAppearance =>
  appearances.some((appearance) => appearance === value);

export function avatarStyle(preset: AvatarPreset) {
  return {
    background: `linear-gradient(135deg, ${avatarPresets[preset].colors.join(", ")})`,
    color: preset === "midnight" ? "#fff" : "#111",
  };
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0] || "")
      .join("")
      .toUpperCase() || "E"
  );
}
