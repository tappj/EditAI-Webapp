import { measuredOutline } from "./reference-outline.ts";
export type TextObservation = {
  time: number | null;
  lines: string[];
  left: number;
  top: number;
  right: number;
  bottom: number;
  confidence: number;
  strokeWidth?: number;
};
type Line = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};
/** Geometry evidence, not an instruction or target transcript. OCR is local and
 * optional; unsupported scripts/uncertain detections retain the vision fallback. */
export function observedTextGroups(
  lines: Line[],
  width: number,
  height: number,
  time: number | null,
): TextObservation[] {
  const groups: Line[][] = [];
  for (const line of lines
    .filter(
      (l) =>
        l.confidence >= 70 &&
        (l.text.match(/\p{L}/gu)?.length || 0) >= 3 &&
        l.text.length <= 120,
    )
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const p = groups.at(-1)?.at(-1),
      h = line.bbox.y1 - line.bbox.y0;
    if (h < height * 0.009 || h > height * 0.18) continue;
    const overlap = p
      ? Math.min(p.bbox.x1, line.bbox.x1) - Math.max(p.bbox.x0, line.bbox.x0)
      : 0;
    if (
      p &&
      line.bbox.y0 >= p.bbox.y1 &&
      line.bbox.y0 - p.bbox.y1 <= Math.max(h, p.bbox.y1 - p.bbox.y0) * 0.9 &&
      overlap >
        Math.min(line.bbox.x1 - line.bbox.x0, p.bbox.x1 - p.bbox.x0) * 0.3 &&
      groups.at(-1)!.length < 4
    )
      groups.at(-1)!.push(line);
    else groups.push([line]);
  }
  return groups.map((g) => ({
    time,
    lines: g.map((l) => l.text.trim()),
    left: Math.min(...g.map((l) => l.bbox.x0)) / width,
    top: Math.min(...g.map((l) => l.bbox.y0)) / height,
    right: Math.max(...g.map((l) => l.bbox.x1)) / width,
    bottom: Math.max(...g.map((l) => l.bbox.y1)) / height,
    confidence: Math.min(...g.map((l) => l.confidence)),
  }));
}
export async function referenceTextObservations(
  frames: { base64JPEG: string; timeSeconds: number | null; role?: string }[],
) {
  const details = frames.filter(
    (f) => f.role !== "motion" && f.role !== "fontGuide",
  );
  if (!details.length) return [];
  const selected = [
    ...new Set(
      Array.from(
        { length: Math.min(4, details.length) },
        (_, i) =>
          details[
            Math.round(
              (i * (details.length - 1)) /
                Math.max(1, Math.min(4, details.length) - 1),
            )
          ],
      ),
    ),
  ];
  let worker: import("tesseract.js").Worker | undefined;
  try {
    const { createWorker, PSM } = await import("tesseract.js");
    worker = await createWorker("eng", 1, {
      workerPath: location.origin + "/ocr/worker.min.js",
      corePath: location.origin + "/ocr",
      langPath: location.origin + "/ocr",
      workerBlobURL: false,
      cacheMethod: "none",
      errorHandler: () => {},
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const observations: TextObservation[] = [];
    for (const frame of selected) {
      const image = new Image();
      image.src = "data:image/jpeg;base64," + frame.base64JPEG;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const original = data.data.slice();
      // Isolate light lettering from its dark stroke/background. This prevents
      // outlined social text being merged into the filmed scene by OCR.
      for (let i = 0; i < data.data.length; i += 4) {
        const a = data.data[i],
          b = data.data[i + 1],
          c = data.data[i + 2];
        const value =
          Math.min(a, b, c) > 210 && Math.max(a, b, c) - Math.min(a, b, c) < 50
            ? 0
            : 255;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = value;
      }
      ctx.putImageData(data, 0, 0);
      const read = async () => {
        const { data } = await worker!.recognize(
          canvas.toDataURL("image/png"),
          {},
          { blocks: true, text: true },
        );
        return observedTextGroups(
          data.blocks?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) ||
            [],
          canvas.width,
          canvas.height,
          frame.timeSeconds,
        );
      };
      let groups = await read();
      if (!groups.length) {
        ctx.drawImage(image, 0, 0);
        groups = await read();
      }
      observations.push(
        ...groups.map((g) => ({
          ...g,
          strokeWidth: measuredOutline(original, canvas.width, canvas.height, {
            x0: Math.floor(g.left * canvas.width),
            x1: Math.ceil(g.right * canvas.width),
            y0: Math.floor(g.top * canvas.height),
            y1: Math.ceil(g.bottom * canvas.height),
          }),
        })),
      );
    }
    return observations.slice(0, 32);
  } catch {
    return [];
  } finally {
    await worker?.terminate().catch(() => {});
  }
}
