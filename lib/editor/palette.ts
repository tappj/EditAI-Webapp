// Compact neutral/hue/tint palette, inspired by the supplied CapCut references.
export const TEXT_COLORS = [
  "#ffffff",
  "#bfbfbf",
  "#808080",
  "#404040",
  "#000000",
  "#ffd600",
  "#ff9f1c",
  "#ff4d4f",
  "#ff007f",
  "#cc00ff",
  "#7c3aed",
  "#2563eb",
  "#00a6ff",
  "#00d4d4",
  "#00b894",
  "#00c853",
  "#fff2b3",
  "#ffd6a5",
  "#ffb3c6",
  "#f9a8d4",
  "#e9b3ff",
  "#c4b5fd",
  "#b3d4ff",
  "#b3e5ff",
  "#b8f4f4",
  "#b8ead6",
  "#c8e6b0",
  "#b88600",
  "#b85b00",
  "#b71c1c",
  "#990052",
  "#7900a8",
  "#4c1d95",
  "#153e75",
  "#006080",
  "#006e6e",
  "#006644",
  "#186331",
];
export function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return (
    "#" +
    [f(5), f(3), f(1)]
      .map((n) =>
        Math.round(n * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function hexToHsv(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const v = Math.max(r, g, b),
    d = v - Math.min(r, g, b);
  const h =
    d === 0
      ? 0
      : v === r
        ? ((g - b) / d + 6) % 6
        : v === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return { h: h * 60, s: v === 0 ? 0 : d / v, v };
}
