import type { Document, TextLayer } from "./model.ts";
import { textLayout } from "./text-layout.ts";
// Preserve measured reference layout; these are frame-edge margins, not
// platform ad-safe insets. Titles and captions retain their independent heights.
export const SOCIAL_TEXT_AREA = {
  left: 0.05,
  right: 0.95,
  top: 0.07,
  bottom: 0.88,
};
export function fitReferenceText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
) {
  const t = { ...layer };
  const area = SOCIAL_TEXT_AREA;
  const availableWidth = (area.right - area.left) * width;
  const availableHeight = (area.bottom - area.top) * height;
  t.boxWidth = Math.min(t.boxWidth ?? 0.86, area.right - area.left);
  const bounds = () => {
    const layout = textLayout(ctx, t, width, height);
    const glyphWidth =
      Math.max(...layout.lines.map((line) => ctx.measureText(line).width)) *
      layout.fit;
    const pad =
      t.background !== "transparent"
        ? (t.backgroundPadding ?? 0.012) * width
        : 0;
    const stroke = t.outline ? (t.outlineWidth ?? 0.00495) * width : 0;
    const shadow =
      (t.shadowOpacity ?? 0) > 0
        ? ((t.shadowBlur ?? 0.005) + Math.abs(t.shadowOffset ?? 0.003)) *
          width *
          2
        : 0;
    const inset = pad + stroke + shadow + 2;
    // Renderer aligns lines within a centered box. Treat its full box as occupied
    // for left/right aligned text; centered text can use measured glyph width.
    return {
      width:
        (t.alignment && t.alignment !== "center"
          ? layout.boxWidth
          : glyphWidth) +
        inset * 2,
      height: layout.lines.length * layout.lineHeight * layout.fit + inset * 2,
    };
  };
  let box = bounds();
  // Wrapping can add lines, so remeasure after each size change. Keep the native
  // minimum font size; unusually long text is rejected rather than cut off.
  for (
    let i = 0;
    i < 12 && (box.width > availableWidth || box.height > availableHeight);
    i++
  ) {
    t.size = Math.max(
      0.02,
      t.size *
        Math.min(availableWidth / box.width, availableHeight / box.height) *
        0.98,
    );
    if (t.alignment && t.alignment !== "center")
      t.boxWidth = Math.max(0.15, (t.boxWidth ?? 0.61) * 0.96);
    box = bounds();
  }
  if (box.width > availableWidth + 0.1 || box.height > availableHeight + 0.1)
    throw Error(
      "This reference text is too large for the frame. Shorten the text. Your edit was kept.",
    );
  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n));
  t.x = clamp(
    t.x,
    area.left + box.width / width / 2,
    area.right - box.width / width / 2,
  );
  t.y = clamp(
    t.y,
    area.top + box.height / height / 2,
    area.bottom - box.height / height / 2,
  );
  return t;
}
export async function protectReferenceText(
  before: Document,
  after: Document,
  width: number,
  height: number,
) {
  if (width / height > 0.8) return { document: after, adjusted: false };
  const ctx = document.createElement("canvas").getContext("2d")!;
  const changed = after.texts.filter(
    (t) =>
      JSON.stringify(t) !==
      JSON.stringify(before.texts.find((old) => old.id === t.id)),
  );
  await Promise.all(
    [...new Set(changed.map((t) => t.font))].map((font) =>
      document.fonts.load(`600 32px "${font}"`),
    ),
  );
  const ids = new Set(changed.map((t) => t.id));
  let adjusted = false;
  const texts = after.texts.map((t) => {
    if (!ids.has(t.id)) return t;
    const fitted = fitReferenceText(ctx, t, width, height);
    if (JSON.stringify(fitted) !== JSON.stringify(t)) adjusted = true;
    return fitted;
  });
  return { document: { ...after, texts }, adjusted };
}
