import type { TextLayer } from "./model.ts";

// One layout for canvas preview, export, typing and selection handles. Expand a
// narrow box for whole words; never squeeze glyphs horizontally to fit a box.
export function textLayout(
  ctx: CanvasRenderingContext2D,
  t: TextLayer,
  width: number,
  height: number,
) {
  const size = t.size * width;
  ctx.font = `${t.fontWeight ?? 600} ${size}px "${t.font}"`;
  if ("letterSpacing" in ctx)
    ctx.letterSpacing = (t.letterSpacing ?? 0) * size + "px";
  const measure = (text: string) => {
    const m = ctx.measureText(text);
    return Math.max(
      m.width,
      (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0),
    );
  };
  const text = t.text || "Text";
  const padding = Math.max(
    size * 0.18,
    (t.backgroundPadding ?? 0.012) * width,
    t.outline ? (t.outlineWidth ?? 0.00495) * width : 0,
  );
  const paragraphs = text.split("\n").map((paragraph) => paragraph.split(" "));
  const widestWord = Math.max(...paragraphs.flat().map(measure));
  const boxWidth = Math.max(
    (t.boxWidth ?? 0.86) * width,
    widestWord + padding * 2,
  );
  const contentWidth = boxWidth - padding * 2;
  const lines: string[] = [];
  for (const words of paragraphs) {
    let line = "";
    for (const word of words) {
      if (line && measure(line + " " + word) > contentWidth) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    lines.push(line);
  }
  const lineHeight = size * (1.2 + (t.lineSpacing ?? 0));
  // Exceptionally long single words scale uniformly to the frame, preserving
  // their proportions. Height-constrained boxes use the same uniform fit.
  const occupiedHeight = lines.length * lineHeight + padding * 2;
  const fit = Math.min(
    1,
    (width * 0.96) / boxWidth,
    (height * 0.96) / occupiedHeight,
    t.boxHeight ? (t.boxHeight * height) / occupiedHeight : 1,
  );
  return { size, boxWidth, contentWidth, padding, lines, lineHeight, fit };
}
