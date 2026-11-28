import type { TextObservation } from "./reference-observations.ts";
import type { Document, TextLayer } from "./model.ts";
export type ReferenceLayout = {
  scope: "text" | "captions";
  lines: string[];
  left: number;
  top: number;
  right: number;
  bottom: number;
  strokeWidth: number;
};
const words = (s: string) =>
  s
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.join(" ");
export function referenceLineBreaks(text: string, lines: string[]) {
  if (text.includes("\n")) return text;
  const joined = lines.join("\n");
  const emoji =
    text.match(
      /[\p{Extended_Pictographic}\p{Regional_Indicator}](?:[\uFE0F\u200D\p{Emoji_Modifier}\p{Extended_Pictographic}])*/gu,
    ) || [];
  return joined + emoji.filter((e) => !joined.includes(e)).join("");
}
/** Calibrate against observed reference ink, not an estimated CSS font size.
 * Reference words are measurement samples only. Only whitespace may transfer
 * when a title already contains the exact same source-grounded words. */
export function calibratedText(
  ctx: CanvasRenderingContext2D,
  t: TextLayer,
  m: ReferenceLayout,
  width: number,
  height: number,
): TextLayer {
  if (
    !m.lines?.length ||
    m.lines.length > 5 ||
    ![m.left, m.top, m.right, m.bottom, m.strokeWidth].every(Number.isFinite) ||
    m.left < 0 ||
    m.right > 1 ||
    m.top < 0 ||
    m.bottom > 1 ||
    m.right <= m.left ||
    m.bottom <= m.top ||
    m.strokeWidth < 0 ||
    m.strokeWidth > 0.02
  )
    return t;
  const inkWidth = (m.right - m.left) * width,
    inkHeight = (m.bottom - m.top) * height;
  if (
    inkWidth < width * 0.08 ||
    inkHeight < height * 0.01 ||
    inkHeight > height * 0.4
  )
    return t;
  const stroke = m.strokeWidth * width;
  const measure = (size: number) => {
    ctx.font = `${t.fontWeight ?? 500} ${size}px "${t.font}"`;
    ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx)
      ctx.letterSpacing = (t.letterSpacing ?? 0) * size + "px";
    return m.lines.map((line) => ctx.measureText(line));
  };
  // Solve the font's actual advance width, including the reference's outline.
  let lo = width * 0.02,
    hi = width * 0.2;
  for (let i = 0; i < 20; i++) {
    const size = (lo + hi) / 2;
    if (Math.max(...measure(size).map((x) => x.width)) + stroke > inkWidth)
      hi = size;
    else lo = size;
  }
  const size = (lo + hi) / 2,
    metrics = measure(size);
  const ascent = Math.max(...metrics.map((x) => x.actualBoundingBoxAscent)),
    descent = Math.max(...metrics.map((x) => x.actualBoundingBoxDescent));
  const spacing =
    m.lines.length > 1
      ? Math.max(
          0,
          Math.min(
            1,
            (inkHeight - stroke - ascent - descent) /
              (m.lines.length - 1) /
              size -
              1.2,
          ),
        )
      : Math.min(0.2, t.lineSpacing ?? 0);
  const title = t.kind === "text" && !t.anchor;
  const text =
    title && words(t.text) === words(m.lines.join(" "))
      ? referenceLineBreaks(t.text, m.lines)
      : t.text;
  return {
    ...t,
    text,
    size: size / width,
    x: (m.left + m.right) / 2,
    // Canvas middle baseline is not the center of visible glyph ink.
    y: (m.top + m.bottom) / 2 + (ascent - descent) / 2 / height,
    boxWidth: Math.min(
      0.94,
      Math.max(0.15, (inkWidth - stroke) / width + 0.012),
    ),
    lineSpacing: spacing,
    outline: m.strokeWidth > 0,
    outlineWidth: m.strokeWidth || t.outlineWidth,
  };
}
export async function calibrateReferenceText(
  before: Document,
  after: Document,
  layouts: ReferenceLayout[] | undefined,
  width: number,
  height: number,
  observations?: TextObservation[],
) {
  if (!layouts?.length) return after;
  const ctx = document.createElement("canvas").getContext("2d")!;
  const changed = after.texts.filter(
    (t) =>
      JSON.stringify(t) !==
      JSON.stringify(before.texts.find((p) => p.id === t.id)),
  );
  await Promise.all(
    changed.map((t) =>
      document.fonts.load(`${t.fontWeight ?? 500} 48px "${t.font}"`),
    ),
  );
  const ids = new Set(changed.map((t) => t.id));
  return {
    ...after,
    texts: after.texts.map((t) => {
      if (!ids.has(t.id)) return t;
      const scope = t.kind === "caption" || t.anchor ? "captions" : "text";
      let m = layouts.find((m) => m.scope === scope);
      if (m && observations?.length) {
        const target = new Set(words(m.lines.join(" "))?.split(" ") || []);
        const candidates = observations
          .filter(
            (o) =>
              Math.abs((o.top + o.bottom) / 2 - (m!.top + m!.bottom) / 2) <
              0.12,
          )
          .map((o) => ({
            o,
            score:
              (words(o.lines.join(" "))
                ?.split(" ")
                .filter((s) => target.has(s)).length || 0) /
              Math.max(1, target.size),
          }))
          .sort((a, b) => b.score - a.score || b.o.confidence - a.o.confidence);
        const matched = candidates.find((c) => c.score >= 0.65)?.o;
        if (matched) {
          const strokeWidth = matched.strokeWidth ?? m.strokeWidth;
          const rim = strokeWidth / 2;
          m = {
            ...m,
            strokeWidth,
            lines: matched.lines,
            left: Math.max(0, matched.left - rim),
            right: Math.min(1, matched.right + rim),
            top: Math.max(0, matched.top - (rim * width) / height),
            bottom: Math.min(1, matched.bottom + (rim * width) / height),
          };
        }
      }
      if (!m) return t;
      const fitted = calibratedText(ctx, t, m, width, height);
      if (scope !== "captions" || !observations?.length) return fitted;
      const region = observations.filter(
        (o) =>
          Math.abs((o.top + o.bottom) / 2 - (m!.top + m!.bottom) / 2) < 0.12,
      );
      // A short phrase's ink width is not the caption box width. Infer the
      // available line width from the other captions in that same screen region.
      fitted.boxWidth = Math.min(
        0.9,
        Math.max(
          fitted.boxWidth ?? 0.15,
          ...region.map((o) => o.right - o.left + 0.02),
        ),
      );
      const exact = region.find(
        (o) => words(o.lines.join(" ")) === words(t.text),
      );
      if (exact) fitted.text = referenceLineBreaks(t.text, exact.lines);
      else if (m.lines.length === 2 && !t.text.includes("\n")) {
        const tokens = t.text.split(/\s+/);
        if (tokens.length >= 4) {
          ctx.font = `${fitted.fontWeight ?? 500} ${fitted.size * width}px "${fitted.font}"`;
          let best = Infinity,
            split = 0;
          for (let i = 2; i <= tokens.length - 2; i++) {
            const a = ctx.measureText(tokens.slice(0, i).join(" ")).width,
              b = ctx.measureText(tokens.slice(i).join(" ")).width;
            const score =
              Math.abs(a - b) +
              Math.max(0, Math.max(a, b) - fitted.boxWidth * width) * 4;
            if (score < best) {
              best = score;
              split = i;
            }
          }
          if (split)
            fitted.text =
              tokens.slice(0, split).join(" ") +
              "\n" +
              tokens.slice(split).join(" ");
        }
      }
      return fitted;
    }),
  };
}
