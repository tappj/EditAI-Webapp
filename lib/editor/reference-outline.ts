/** Estimate a dark outline around light glyphs using local pixel rings. Subtract
 * distant background darkness, and ignore enclosed counters. Uncertain scenes
 * retain visual-model estimates instead of treating dark footage as a stroke. */
export function measuredOutline(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  box: { x0: number; y0: number; x1: number; y1: number },
): number | undefined {
  const rings = Math.max(6, Math.min(20, Math.round(width * 0.018))),
    pad = rings + 2;
  const x0 = Math.max(0, box.x0 - pad),
    y0 = Math.max(0, box.y0 - pad),
    x1 = Math.min(width, box.x1 + pad),
    y1 = Math.min(height, box.y1 + pad),
    w = x1 - x0,
    h = y1 - y0,
    n = w * h;
  if (w < 4 || h < 4) return;
  const glyph = new Uint8Array(n),
    exterior = new Uint8Array(n),
    dark = new Uint8Array(n),
    queue = new Int32Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const at = y * w + x,
        p = ((y + y0) * width + x + x0) * 4,
        a = rgba[p],
        b = rgba[p + 1],
        c = rgba[p + 2];
      glyph[at] = Number(
        Math.min(a, b, c) > 210 && Math.max(a, b, c) - Math.min(a, b, c) < 50,
      );
      dark[at] = Number((a + b + c) / 3 < 80);
    }
  let head = 0,
    tail = 0;
  const enqueue = (p: number) => {
    if (p >= 0 && p < n && !glyph[p] && !exterior[p]) {
      exterior[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    enqueue(y * w);
    enqueue(y * w + w - 1);
  }
  while (head < tail) {
    const p = queue[head++],
      x = p % w;
    if (x) enqueue(p - 1);
    if (x < w - 1) enqueue(p + 1);
    enqueue(p - w);
    enqueue(p + w);
  }
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = exterior[i] ? 10000 : 0;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x) d[p] = Math.min(d[p], d[p - 1] + 1);
      if (y) {
        d[p] = Math.min(d[p], d[p - w] + 1);
        if (x) d[p] = Math.min(d[p], d[p - w - 1] + diagonal);
        if (x < w - 1) d[p] = Math.min(d[p], d[p - w + 1] + diagonal);
      }
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (x < w - 1) d[p] = Math.min(d[p], d[p + 1] + 1);
      if (y < h - 1) {
        d[p] = Math.min(d[p], d[p + w] + 1);
        if (x) d[p] = Math.min(d[p], d[p + w - 1] + diagonal);
        if (x < w - 1) d[p] = Math.min(d[p], d[p + w + 1] + diagonal);
      }
    }
  const total = new Float32Array(rings + 1),
    black = new Float32Array(rings + 1);
  for (let i = 0; i < n; i++) {
    const r = Math.ceil(d[i]);
    if (r > 0 && r <= rings) {
      total[r]++;
      black[r] += dark[i];
    }
  }
  const ratios = Array.from(
    { length: rings },
    (_, i) => black[i + 1] / Math.max(1, total[i + 1]),
  );
  const distant = ratios.slice(-3).sort((a, b) => a - b)[1];
  let peak = 1;
  for (let i = 2; i < Math.floor(rings / 2); i++)
    if (ratios[i] > ratios[peak]) peak = i;
  if (ratios[peak] < 0.65 || ratios[peak] - distant < 0.2) return;
  const threshold = (ratios[peak] + distant) / 2;
  for (let i = peak + 1; i < rings; i++)
    if (ratios[i] < threshold) {
      const radius =
        i +
        (ratios[i - 1] - threshold) /
          Math.max(0.001, ratios[i - 1] - ratios[i]);
      const stroke = ((radius - 0.5) * 2) / width;
      return stroke >= 0.0005 && stroke <= 0.02 ? stroke : undefined;
    }
}
