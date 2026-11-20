import { assignLanes, LANE_LIMITS } from "./lanes.ts";
import { FONTS } from "./fonts.ts";
export type Word = {
  id: string;
  clip: number;
  start: number;
  end: number;
  text: string;
};
export type Source = {
  id: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  kind: "video" | "image" | "audio";
  mime: string;
  bytes?: number;
  transcribed?: boolean;
  speechJob?: string;
};
export type Appearance = {
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  crop: { x: number; y: number; width: number; height: number };
  opacity: number;
  adjustments?: Record<string, number>;
};
export type Segment = {
  id: string;
  sourceIndex: number;
  start: number;
  end: number;
  speed: number;
  volume: number;
  appearance: Appearance;
};
export type TextLayer = {
  lane?: number;
  boxHeight?: number;
  id: string;
  text: string;
  start: number;
  end: number;
  x: number;
  y: number;
  size: number;
  color: string;
  background: string;
  font: string;
  outline: boolean;
  animation: string;
  animationOut?: string;
  animationDuration?: number;
  opacity?: number;
  outlineWidth?: number;
  outlineColor?: string;
  boxWidth?: number;
  alignment?: "left" | "center" | "right";
  letterSpacing?: number;
  lineSpacing?: number;
  shadowOpacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffset?: number;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  backgroundRadius?: number;
  anchor?: { segmentId: string; start: number; end: number };
};
export type Overlay = {
  height?: number;
  lane?: number;
  speed?: number;
  volume?: number;
  appearance?: Appearance;
  id: string;
  sourceIndex: number;
  start: number;
  end: number;
  sourceStart: number;
  x: number;
  y: number;
  width: number;
  opacity: number;
};
export type AudioLayer = {
  muted?: boolean;
  speed?: number;
  id: string;
  sourceIndex: number;
  start: number;
  end: number;
  sourceStart: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  lane: number;
};
export type Document = {
  segments: Segment[];
  sources: Source[];
  texts: TextLayer[];
  overlays: Overlay[];
  audio: AudioLayer[];
  words: Word[];
  quietCuts?: { clip: number; start: number; end: number }[];
  canvas: "original" | "9:16" | "16:9" | "1:1";
  framing: "fit" | "fill";
  captionStyle?: Partial<
    Omit<TextLayer, "id" | "text" | "anchor" | "start" | "end">
  >;
  captionFormat: "standard" | "boxed" | "single";
};
export type Project = {
  id: string;
  title: string;
  document: Document;
  updatedAt: number;
  thumbnail?: string;
};
export const appearance = (): Appearance => ({
  filter: "Clear",
  brightness: 0,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  opacity: 1,
  adjustments: {},
});
export const newDocument = (): Document => ({
  segments: [],
  sources: [],
  texts: [],
  overlays: [],
  audio: [],
  words: [],
  canvas: "original",
  framing: "fit",
  captionFormat: "standard",
});
export const newSegment = (i: number, duration: number): Segment => ({
  id: crypto.randomUUID(),
  sourceIndex: i,
  start: 0,
  end: duration,
  speed: 1,
  volume: 1,
  appearance: appearance(),
});
export const segmentDuration = (s: Segment) => (s.end - s.start) / s.speed;
export const duration = (d: Document) =>
  d.segments.reduce((a, s) => a + segmentDuration(s), 0);
export function atTime(d: Document, t: number) {
  let cursor = 0;
  for (let i = 0; i < d.segments.length; i++) {
    const s = d.segments[i],
      n = segmentDuration(s);
    if (t < cursor + n || i === d.segments.length - 1)
      return {
        segment: s,
        index: i,
        offset: cursor,
        sourceTime: s.start + Math.min(n, Math.max(0, t - cursor)) * s.speed,
      };
    cursor += n;
  }
  return null;
}
export function validate(d: Document) {
  const finite = (n: number, a: number, b: number) =>
    Number.isFinite(n) && n >= a && n <= b;
  if (
    !d ||
    !Array.isArray(d.segments) ||
    !d.segments.length ||
    d.segments.length > 500 ||
    d.sources.length > 100 ||
    d.texts.length > 3000 ||
    d.overlays.length > 100 ||
    d.audio.length > 100
  )
    throw Error("This project exceeds the editor limits.");
  const ids = new Set();
  for (const s of d.segments) {
    const src = d.sources[s.sourceIndex],
      a = s.appearance,
      c = a?.crop;
    if (
      ids.has(s.id) ||
      !src ||
      src.kind === "audio" ||
      !finite(s.start, 0, src.duration) ||
      !finite(s.end, 0.1, src.duration + 0.01) ||
      s.end - s.start < 0.099 ||
      !finite(s.speed, 0.25, 4) ||
      !finite(s.volume, 0, 1) ||
      !a ||
      !c ||
      !finite(c.x, 0, 0.95) ||
      !finite(c.y, 0, 0.95) ||
      !finite(c.width, 0.05, 1) ||
      !finite(c.height, 0.05, 1) ||
      c.x + c.width > 1.001 ||
      c.y + c.height > 1.001 ||
      !finite(a.opacity, 0, 1) ||
      !Number.isInteger(a.rotation) ||
      !finite(a.rotation, 0, 3) ||
      !finite(a.brightness, -0.9, 1) ||
      !finite(a.contrast, 0, 3) ||
      !finite(a.saturation, 0, 3) ||
      !filters.includes(a.filter)
    )
      throw Error("This edit would create an invalid clip.");
    if (Object.values(a.adjustments || {}).some((v) => !finite(v, -1, 1)))
      throw Error("Invalid color adjustment.");
    ids.add(s.id);
  }
  const len = duration(d);
  if (len < 0.3 || len > 7200)
    throw Error("Keep between 0.3 seconds and two hours of video.");
  for (const t of d.texts) {
    if (
      typeof t.text !== "string" ||
      t.text.length > 2000 ||
      !finite(t.x, 0, 1) ||
      !finite(t.y, 0, 1) ||
      !finite(t.size, 0.01, 0.3) ||
      !finite(t.start, 0, 7200) ||
      !finite(t.end, 0, 7200) ||
      t.end <= t.start ||
      (t.boxHeight != null && !finite(t.boxHeight, 0.03, 1)) ||
      (t.boxWidth != null && !finite(t.boxWidth, 0.05, 1)) ||
      !/^#[a-f0-9]{6}$/i.test(t.color)
    )
      throw Error("Invalid text layer.");
  }
  for (const o of d.overlays) {
    if (
      !d.sources[o.sourceIndex] ||
      d.sources[o.sourceIndex].kind === "audio" ||
      !finite(o.start, 0, len) ||
      !finite(o.end, o.start + 0.01, len) ||
      !finite(o.sourceStart, 0, d.sources[o.sourceIndex].duration) ||
      (d.sources[o.sourceIndex].kind !== "image" &&
        o.sourceStart + (o.end - o.start) * (o.speed ?? 1) >
          d.sources[o.sourceIndex].duration + 0.05) ||
      !finite(o.x, 0, 1) ||
      !finite(o.y, 0, 1) ||
      !finite(o.width, 0.1, 1) ||
      (o.height != null && !finite(o.height, 0.03, 1)) ||
      !finite(o.speed ?? 1, 0.25, 4) ||
      !finite(o.volume ?? 0, 0, 1) ||
      !finite(o.opacity, 0, 1)
    )
      throw Error("Invalid overlay.");
  }
  for (const a of d.audio) {
    if (
      !d.sources[a.sourceIndex] ||
      d.sources[a.sourceIndex].kind === "image" ||
      !finite(a.start, 0, len) ||
      !finite(a.end, a.start + 0.01, len) ||
      !finite(a.sourceStart, 0, d.sources[a.sourceIndex].duration) ||
      a.sourceStart + (a.end - a.start) * (a.speed ?? 1) >
        d.sources[a.sourceIndex].duration + 0.05 ||
      !finite(a.speed ?? 1, 0.25, 4) ||
      !finite(a.volume, 0, 1) ||
      !Number.isInteger(a.lane) ||
      a.lane < 0 ||
      a.lane > 2 ||
      !finite(a.fadeIn, 0, 10) ||
      !finite(a.fadeOut, 0, 10)
    )
      throw Error("Invalid audio layer.");
    if (
      d.audio.some(
        (b) =>
          b.id !== a.id &&
          b.lane === a.lane &&
          a.start < b.end &&
          a.end > b.start,
      )
    )
      throw Error("Audio clips on the same lane cannot overlap.");
  }
  assignLanes(
    d.texts.map((t) => ({ ...t, ...textTiming(d, t) })),
    LANE_LIMITS.texts,
  );
  assignLanes(d.overlays, LANE_LIMITS.overlays);
  return d;
}
export function split(d: Document, id: string, sourceTime: number) {
  const out = structuredClone(d),
    i = out.segments.findIndex((s) => s.id === id),
    s = out.segments[i];
  if (!s || sourceTime - s.start < 0.1 || s.end - sourceTime < 0.1)
    throw Error("Move the playhead at least 0.1 seconds from an edge.");
  const right = {
    ...structuredClone(s),
    id: crypto.randomUUID(),
    start: sourceTime,
  };
  s.end = sourceTime;
  out.segments.splice(i + 1, 0, right);
  out.texts = out.texts.flatMap((t) => {
    if (t.anchor?.segmentId !== id) return [t];
    const anchor = t.anchor;
    const left =
      anchor.start < sourceTime
        ? { ...t, anchor: { ...anchor, end: Math.min(anchor.end, sourceTime) } }
        : null;
    const r =
      anchor.end > sourceTime
        ? {
            ...t,
            id: crypto.randomUUID(),
            anchor: {
              segmentId: right.id,
              start: Math.max(anchor.start, sourceTime),
              end: anchor.end,
            },
          }
        : null;
    return [left, r].filter(Boolean) as TextLayer[];
  });
  return validate(out);
}
export function textTiming(d: Document, t: TextLayer) {
  if (!t.anchor) return { start: t.start, end: t.end };
  let p = 0;
  for (const s of d.segments) {
    if (s.id === t.anchor.segmentId)
      return {
        start: p + (Math.max(s.start, t.anchor.start) - s.start) / s.speed,
        end: p + (Math.min(s.end, t.anchor.end) - s.start) / s.speed,
      };
    p += segmentDuration(s);
  }
  return { start: -1, end: -1 };
}
export function captions(d: Document, format = d.captionFormat) {
  const out = structuredClone(d);
  out.texts = out.texts.filter((t) => !t.anchor);
  out.captionFormat = format;
  let cursor = 0;
  for (const s of out.segments) {
    const words = out.words.filter(
      (w) => w.clip === s.sourceIndex && w.end > s.start && w.start < s.end,
    );
    let group: Word[] = [];
    const emit = () => {
      if (!group.length) return;
      const a = Math.max(s.start, group[0].start - 0.02),
        b = Math.min(s.end, group.at(-1)!.end + 0.06);
      out.texts.push({
        id: crypto.randomUUID(),
        text: group.map((w) => w.text).join(" "),
        start: cursor + (a - s.start) / s.speed,
        end: cursor + (b - s.start) / s.speed,
        x: 0.5,
        y: format === "boxed" ? 0.5 : 0.78,
        size: 0.055,
        color: "#ffffff",
        background: "transparent",
        font: "TikTok Sans",
        outline: true,
        animation: "none",
        ...out.captionStyle,
        anchor: { segmentId: s.id, start: a, end: b },
      });
      group = [];
    };
    for (const w of words) {
      const max = format === "single" ? 1 : format === "boxed" ? 4 : 6;
      if (
        group.length &&
        (group.length >= max ||
          group.map((x) => x.text).join(" ").length + w.text.length >
            (format === "boxed" ? 28 : 34) ||
          w.start - group.at(-1)!.end > 0.45 ||
          (w.end - group[0].start) / s.speed > 2.2)
      )
        emit();
      group.push(w);
      if (/[.!?]$/.test(w.text)) emit();
    }
    emit();
    cursor += segmentDuration(s);
  }
  return out;
}
export const filters = [
  "Clear",
  "Warm",
  "Cool",
  "Grey",
  "Tinted",
  "Vivid",
  "Dramatic",
  "Vintage",
  "Fade",
  "Noir",
  "Clarendon",
  "Juno",
  "Gingham",
  "Lark",
];
export function cssFilter(a: Appearance) {
  const named: Record<string, string> = {
    Clear: "",
    Warm: "sepia(.18) saturate(1.1)",
    Cool: "hue-rotate(12deg) saturate(.9)",
    Grey: "grayscale(1)",
    Tinted: "sepia(.25) hue-rotate(310deg)",
    Vivid: "saturate(1.5) contrast(1.1)",
    Dramatic: "contrast(1.35) saturate(.85)",
    Vintage: "sepia(.35) contrast(.9)",
    Fade: "contrast(.8) brightness(1.1)",
    Noir: "grayscale(1) contrast(1.5)",
    Clarendon: "contrast(1.2) saturate(1.3)",
    Juno: "sepia(.2) saturate(1.3)",
    Gingham: "contrast(.85) brightness(1.05)",
    Lark: "brightness(1.1) saturate(.8)",
  };
  return `${named[a.filter] || ""} brightness(${1 + a.brightness}) contrast(${a.contrast}) saturate(${a.saturation}) ${a.warmth ? "sepia(" + Math.abs(a.warmth) * 0.4 + ")" : ""}`;
}
export function applyCuts(
  d: Document,
  cuts: { clip: number; start: number; end: number }[],
) {
  const out = structuredClone(d),
    texts = out.texts;
  out.texts = texts.filter((t) => !t.anchor);
  out.segments = out.segments.flatMap((s) => {
    let keep = [{ start: s.start, end: s.end }];
    for (const c of cuts.filter((c) => c.clip === s.sourceIndex)) {
      if (
        !Number.isFinite(c.start) ||
        !Number.isFinite(c.end) ||
        c.end <= c.start
      )
        throw Error("Unsafe cut range.");
      keep = keep.flatMap((k) =>
        c.end <= k.start || c.start >= k.end
          ? [k]
          : [
              { start: k.start, end: Math.max(k.start, c.start) },
              { start: Math.min(k.end, c.end), end: k.end },
            ].filter((x) => x.end - x.start >= 0.1),
      );
    }
    return keep.map((k, i) => {
      const piece = {
        ...structuredClone(s),
        id: i ? crypto.randomUUID() : s.id,
        ...k,
      };
      for (const t of texts.filter((t) => t.anchor?.segmentId === s.id)) {
        const a = Math.max(t.anchor!.start, k.start),
          b = Math.min(t.anchor!.end, k.end);
        if (b > a)
          out.texts.push({
            ...t,
            id: crypto.randomUUID(),
            anchor: { segmentId: piece.id, start: a, end: b },
          });
      }
      return piece;
    });
  });
  return validate(out);
}
export function duplicate(d: Document, id: string) {
  const out = structuredClone(d),
    i = out.segments.findIndex((s) => s.id === id);
  if (i < 0) throw Error("Select a clip.");
  const copy = { ...structuredClone(out.segments[i]), id: crypto.randomUUID() };
  out.segments.splice(i + 1, 0, copy);
  for (const t of out.texts.filter((t) => t.anchor?.segmentId === id))
    out.texts.push({
      ...structuredClone(t),
      id: crypto.randomUUID(),
      anchor: { ...t.anchor!, segmentId: copy.id },
    });
  return validate(out);
}
// Match EditorDocument.makeOverlay: move the selected source range above the anchor track.
export function makeOverlay(d: Document, id: string, time: number) {
  const out = structuredClone(d),
    clip = out.segments.find((s) => s.id === id);
  if (!clip || out.segments.length < 2 || !Number.isFinite(time))
    throw Error(
      "Keep another clip on the main track before making an overlay.",
    );
  out.segments = out.segments.filter((s) => s.id !== id);
  out.texts = out.texts.filter((t) => t.anchor?.segmentId !== id);
  const len = duration(out),
    start = Math.max(0, Math.min(time, len - segmentDuration(clip)));
  out.overlays = out.overlays.filter((o) => o.start < len - 0.01);
  out.audio = out.audio.filter((a) => a.start < len - 0.01);
  for (const layer of [...out.overlays, ...out.audio])
    layer.end = Math.min(layer.end, len);
  out.overlays.push({
    id: clip.id,
    sourceIndex: clip.sourceIndex,
    sourceStart: clip.start,
    start,
    end: Math.min(len, start + segmentDuration(clip)),
    speed: clip.speed,
    volume: clip.volume,
    appearance: structuredClone(clip.appearance),
    x: 0.5,
    y: 0.5,
    width: 0.5,
    opacity: 1,
  });
  return validate(out);
}
export function planCuts(d: Document, plan: any) {
  return (plan.cuts || []).map((c: any) => {
    const a = d.words.find((w) => w.id === c.firstWord),
      b = d.words.find((w) => w.id === c.lastWord);
    if (!a || !b || a.clip !== b.clip)
      throw Error("AI returned an unsafe cut.");
    return { clip: a.clip, start: a.start, end: b.end };
  });
}
export function silenceCuts(
  samples: Float32Array,
  rate: number,
  words: Word[],
  clip: number,
) {
  const bin = 0.02,
    step = Math.round(rate * bin),
    levels: number[] = [];
  for (let i = 0; i < samples.length; i += step) {
    let sum = 0;
    for (let j = i; j < Math.min(i + step, samples.length); j++)
      sum += samples[j] ** 2;
    levels.push(20 * Math.log10(Math.max(1e-8, Math.sqrt(sum / step))));
  }
  const candidates: { clip: number; start: number; end: number }[] = [];
  const anchors = words
    .filter((w) => w.clip === clip)
    .sort((a, b) => a.start - b.start);
  const sorted: { start: number; end: number }[] = [];
  for (const word of anchors) {
    const previous = sorted.at(-1);
    if (previous && word.start <= previous.end)
      previous.end = Math.max(previous.end, word.end);
    else sorted.push({ start: word.start, end: word.end });
  }
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1].end + 0.02,
      b = sorted[i].start - 0.02;
    if (b - a < 0.5) continue;
    const gap = levels.slice(Math.ceil(a / bin), Math.floor(b / bin));
    if (gap.length && gap.filter((x) => x < -35).length / gap.length >= 0.95)
      candidates.push({ clip, start: a, end: b });
  }
  return candidates.filter(
    (c, i) => i === 0 || c.start - candidates[i - 1].end >= 1.2,
  );
}
export const supportedOperations = [
  "trim",
  "removeRange",
  "delete",
  "split",
  "move",
  "duplicate",
  "speed",
  "volume",
  "canvas",
  "framing",
  "filter",
  "adjustment",
  "opacity",
  "crop",
  "resetCrop",
  "resetAppearance",
  "addText",
  "updateText",
  "removeText",
  "retimeText",
  "captionSize",
  "captionPosition",
  "captionStyle",
  "addClip",
  "addOverlay",
  "addAudio",
  "makeOverlay",
  "overlayLayout",
  "audioSettings",
];
export function applyOperations(d: Document, ops: any[]) {
  let out = structuredClone(d);
  const color = (c: any) =>
    "#" +
    [c.red, c.green, c.blue]
      .map((n) =>
        Math.round(Math.min(1, Math.max(0, n)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  for (const op of ops) {
    const caption = out.texts.find((t) => t.id === op.target);
    const textKinds = [
      "updateText",
      "removeText",
      "retimeText",
      "captionSize",
      "captionPosition",
      "captionStyle",
    ];
    if (caption && op.kind === "delete") {
      out.texts = out.texts.filter((t) => t.id !== caption.id);
      continue;
    }
    if (caption && op.kind === "split") {
      const timing = textTiming(out, caption),
        at = op.value;
      if (
        !Number.isFinite(at) ||
        at <= timing.start + 0.05 ||
        at >= timing.end - 0.05
      )
        throw Error("Unsafe text split.");
      const right = {
        ...structuredClone(caption),
        id: crypto.randomUUID(),
        start: at,
        end: timing.end,
      };
      delete right.anchor;
      Object.assign(caption, { start: timing.start, end: at });
      delete caption.anchor;
      out.texts.push(right);
      continue;
    }
    if (caption && !textKinds.includes(op.kind))
      throw Error("This operation is not supported for text.");
    if (op.target && textKinds.includes(op.kind) && !caption)
      throw Error("Select a text layer.");
    const overlay = out.overlays.find((x) => x.id === op.target);
    const audio = out.audio.find((x) => x.id === op.target);
    const mediaLayer = overlay || audio;
    if (
      mediaLayer &&
      [
        "trim",
        "speed",
        "volume",
        "move",
        "delete",
        "split",
        "duplicate",
        "overlayLayout",
        "audioSettings",
      ].includes(op.kind)
    ) {
      const speed = mediaLayer.speed ?? 1;
      const len = mediaLayer.end - mediaLayer.start;
      switch (op.kind) {
        case "trim": {
          const end = op.end ?? mediaLayer.sourceStart + len * speed;
          mediaLayer.sourceStart = op.start ?? mediaLayer.sourceStart;
          mediaLayer.end =
            mediaLayer.start + (end - mediaLayer.sourceStart) / speed;
          break;
        }
        case "speed":
          mediaLayer.speed = op.value;
          mediaLayer.end = mediaLayer.start + (len * speed) / op.value;
          break;
        case "volume":
          mediaLayer.volume = op.value;
          break;
        case "move":
          mediaLayer.start = op.value;
          mediaLayer.end = op.value + len;
          break;
        case "delete":
          out.overlays = out.overlays.filter((x) => x.id !== op.target);
          out.audio = out.audio.filter((x) => x.id !== op.target);
          break;
        case "duplicate":
        case "split": {
          const copy = {
            ...structuredClone(mediaLayer),
            id: crypto.randomUUID(),
          };
          if (op.kind === "split") {
            const at =
              mediaLayer.start + (op.value - mediaLayer.sourceStart) / speed;
            if (
              !Number.isFinite(at) ||
              at <= mediaLayer.start + 0.05 ||
              at >= mediaLayer.end - 0.05
            )
              throw Error("Unsafe layer split.");
            copy.sourceStart = op.value;
            copy.start = at;
            mediaLayer.end = at;
          } else {
            copy.start =
              op.media?.time ?? (overlay ? mediaLayer.start : mediaLayer.end);
            copy.end = copy.start + len;
          }
          if (overlay) out.overlays.push(copy as Overlay);
          else out.audio.push(copy as AudioLayer);
          break;
        }
        case "overlayLayout":
          if (!overlay || !op.media) throw Error("Select an overlay.");
          overlay.x = op.media.centerX ?? overlay.x;
          overlay.y = op.media.centerY ?? overlay.y;
          overlay.width = op.media.width ?? overlay.width;
          overlay.start = op.media.time ?? overlay.start;
          overlay.end = overlay.start + len;
          break;
        case "audioSettings":
          if (!audio || !op.media) throw Error("Select an audio clip.");
          audio.lane = op.media.lane ?? audio.lane;
          audio.fadeIn = op.media.fadeIn ?? audio.fadeIn;
          audio.fadeOut = op.media.fadeOut ?? audio.fadeOut;
          if (op.media.isMuted != null) audio.muted = op.media.isMuted;
          audio.start = op.media.time ?? audio.start;
          audio.end = audio.start + len;
          break;
      }
      continue;
    }
    if (op.kind === "makeOverlay") {
      out = makeOverlay(out, op.target, op.media?.time);
      continue;
    }
    if (["addClip", "addOverlay", "addAudio"].includes(op.kind)) {
      const index = op.media?.source;
      const source = out.sources[index];
      if (!source || (op.kind !== "addAudio" && source.kind === "audio"))
        throw Error("Choose media from the source library.");
      const start = op.start,
        end = op.end;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end - start < 0.1 ||
        end > source.duration
      )
        throw Error("Unsafe media range.");
      if (op.kind === "addClip") {
        const at = op.value ?? out.segments.length;
        if (!Number.isInteger(at) || at < 0 || at > out.segments.length)
          throw Error("Invalid clip position.");
        out.segments.splice(at, 0, { ...newSegment(index, end), start });
      } else {
        const time = op.media?.time;
        if (!Number.isFinite(time) || time < 0)
          throw Error("Invalid layer position.");
        const speed = 1;
        const common = {
          id: crypto.randomUUID(),
          sourceIndex: index,
          sourceStart: start,
          speed,
          start: time,
          end: Math.min(duration(out), time + (end - start) / speed),
        };
        if (op.kind === "addAudio") {
          const lane =
            op.media?.lane ??
            [0, 1, 2].find(
              (l) =>
                !out.audio.some(
                  (x) =>
                    x.lane === l &&
                    x.start < common.end &&
                    x.end > common.start,
                ),
            );
          if (lane == null) throw Error("Audio lanes are occupied.");
          out.audio.push({
            ...common,
            lane,
            volume: 1,
            muted: op.media?.isMuted ?? false,
            fadeIn: op.media?.fadeIn ?? 0,
            fadeOut: op.media?.fadeOut ?? 0,
          });
        } else
          out.overlays.push({
            ...common,
            x: op.media?.centerX ?? 0.5,
            y: op.media?.centerY ?? 0.5,
            width: op.media?.width ?? 0.5,
            opacity: 1,
            volume: 1,
            appearance: appearance(),
          });
      }
      continue;
    }
    const overlayTarget: Segment | undefined = overlay
      ? {
          ...newSegment(
            overlay.sourceIndex,
            overlay.sourceStart +
              (overlay.end - overlay.start) * (overlay.speed ?? 1),
          ),
          id: overlay.id,
          start: overlay.sourceStart,
          appearance: overlay.appearance ?? appearance(),
        }
      : undefined;
    if (audio) throw Error("This operation is not supported for audio.");
    if (
      overlay &&
      ![
        "filter",
        "adjustment",
        "opacity",
        "crop",
        "resetCrop",
        "resetAppearance",
      ].includes(op.kind)
    )
      throw Error("This operation is not supported for overlays.");
    const targets = op.target
      ? [
          ...out.segments.filter((s) => s.id === op.target),
          ...(overlayTarget ? [overlayTarget] : []),
        ]
      : out.segments;
    const texts = op.target
      ? out.texts.filter((t) => t.id === op.target)
      : out.texts.filter(
          (t) =>
            op.scope === "all" ||
            (op.scope === "captions" ? !!t.anchor : !t.anchor),
        );
    if (
      op.target &&
      !out.segments.some((s) => s.id === op.target) &&
      !out.texts.some((t) => t.id === op.target) &&
      !mediaLayer
    )
      throw Error(
        "AI referred to a layer that does not exist. Your project was kept.",
      );
    switch (op.kind) {
      case "trim":
        for (const s of targets) {
          s.start = op.start ?? s.start;
          s.end = op.end ?? s.end;
        }
        break;
      case "removeRange": {
        const s = targets[0];
        if (
          !s ||
          !Number.isFinite(op.start) ||
          !Number.isFinite(op.end) ||
          op.start < s.start ||
          op.end > s.end ||
          op.end <= op.start
        )
          throw Error("Unsafe removal range.");
        const parts = [
          { start: s.start, end: op.start },
          { start: op.end, end: s.end },
        ]
          .filter((p) => p.end - p.start >= 0.1)
          .map((p, j) => ({
            ...structuredClone(s),
            ...p,
            id: j ? crypto.randomUUID() : s.id,
          }));
        const anchored = out.texts.filter((t) => t.anchor?.segmentId === s.id);
        out.texts = out.texts.filter((t) => t.anchor?.segmentId !== s.id);
        for (const part of parts)
          for (const t of anchored) {
            const start = Math.max(t.anchor!.start, part.start),
              end = Math.min(t.anchor!.end, part.end);
            if (end > start)
              out.texts.push({
                ...t,
                id: crypto.randomUUID(),
                anchor: { segmentId: part.id, start, end },
              });
          }
        out.segments.splice(out.segments.indexOf(s), 1, ...parts);
        break;
      }
      case "delete":
        out.segments = out.segments.filter((s) => s.id !== op.target);
        break;
      case "split":
        if (targets[0]) out = split(out, targets[0].id, op.value);
        break;
      case "move":
        if (targets[0]) {
          const s = targets[0];
          out.segments.splice(out.segments.indexOf(s), 1);
          out.segments.splice(
            Math.max(0, Math.min(out.segments.length, Math.round(op.value))),
            0,
            s,
          );
        }
        break;
      case "duplicate":
        if (targets[0]) out = duplicate(out, targets[0].id);
        break;
      case "speed":
        for (const s of targets) s.speed = op.value;
        break;
      case "volume":
        for (const s of targets) s.volume = op.value;
        break;
      case "canvas": {
        const map: Record<string, Document["canvas"]> = {
          original: "original",
          portrait: "9:16",
          landscape: "16:9",
          square: "1:1",
        };
        if (!map[op.text]) throw Error("Unsupported canvas.");
        out.canvas = map[op.text];
        break;
      }
      case "framing":
        if (!["fit", "fill"].includes(op.text))
          throw Error("Unsupported framing.");
        out.framing = op.text;
        break;
      case "filter":
        if (!filters.includes(op.text)) throw Error("Unknown filter.");
        for (const s of targets) s.appearance.filter = op.text;
        break;
      case "adjustment": {
        const map: Record<string, string> = {
          Brightness: "brightness",
          Contrast: "contrast",
          Saturation: "saturation",
        };
        const allowed = [
          "Exposure",
          "Brilliance",
          "Highlights",
          "Shadows",
          "Black point",
          "Vibrance",
          "Warmth",
          "Tint",
          "Sharpness",
          "Definition",
          "Vintage",
          "Fade",
          "Vignette",
        ];
        if (!map[op.text] && !allowed.includes(op.text))
          throw Error("Unknown adjustment.");
        for (const s of targets) {
          if (map[op.text])
            (s.appearance as any)[map[op.text]] =
              op.value + (["Contrast", "Saturation"].includes(op.text) ? 1 : 0);
          else {
            s.appearance.adjustments ??= {};
            s.appearance.adjustments[op.text] = op.value;
          }
        }
        break;
      }
      case "opacity":
        for (const s of targets) s.appearance.opacity = op.value;
        break;
      case "resetAppearance":
        for (const s of targets) {
          const old = s.appearance;
          s.appearance = {
            ...appearance(),
            opacity: old.opacity,
            crop: old.crop,
            rotation: old.rotation,
            flipX: old.flipX,
            flipY: old.flipY,
          };
        }
        break;
      case "crop":
        for (const s of targets) {
          for (const k of ["x", "y", "width", "height"])
            if (op.crop?.[k] != null)
              (s.appearance.crop as any)[k] = op.crop[k];
          if (op.crop?.quarterTurns != null)
            s.appearance.rotation = op.crop.quarterTurns;
          if (op.crop?.flipHorizontal != null)
            s.appearance.flipX = op.crop.flipHorizontal;
          if (op.crop?.flipVertical != null)
            s.appearance.flipY = op.crop.flipVertical;
        }
        break;
      case "resetCrop":
        for (const s of targets) {
          s.appearance.crop = { x: 0, y: 0, width: 1, height: 1 };
          s.appearance.rotation = 0;
          s.appearance.flipX = false;
          s.appearance.flipY = false;
        }
        break;
      case "addText":
        out.texts.push({
          id: crypto.randomUUID(),
          text: op.text,
          start: op.start ?? 0,
          end: op.end ?? duration(out),
          x: 0.5,
          y: 0.5,
          size: 0.055,
          color: "#ffffff",
          background: "transparent",
          font: "TikTok Sans",
          outline: true,
          animation: "none",
        });
        break;
      case "updateText":
        for (const t of texts) t.text = op.text;
        break;
      case "removeText":
        out.texts = out.texts.filter((t) => !texts.includes(t));
        break;
      case "retimeText":
        for (const t of texts) {
          t.start = op.start;
          t.end = op.end;
          delete t.anchor;
        }
        break;
      case "captionSize":
        for (const t of texts) t.size = op.value;
        break;
      case "captionPosition":
        for (const t of texts) t.y = op.value;
        break;
      case "captionStyle":
        for (const t of texts) {
          const v = op.style || {};
          if (v.size != null) t.size = v.size;
          if (v.horizontalPosition != null) t.x = v.horizontalPosition;
          if (v.verticalPosition != null) t.y = v.verticalPosition;
          if (v.textColor) t.color = color(v.textColor);
          if (v.outline) t.outline = v.outline !== "none";
          if (v.background)
            t.background =
              v.background === "none" ? "transparent" : v.background;
          if (v.animationIn) t.animation = v.animationIn;
          if (v.font) {
            const normalize = (x: string) =>
              x.toLowerCase().replace(/[^a-z0-9]/g, "");
            const special: Record<string, string> = {
              tiktokClassic: "TikTok Sans",
              arial: "Arial",
              outlinedArial: "Arial",
            };
            const font =
              special[v.font] ||
              FONTS.find((f) => normalize(f) === normalize(v.font));
            if (!font) throw Error("This font is not available.");
            t.font = font;
          }
          const fields: Record<string, string> = {
            outlineWidth: "outlineWidth",
            textBoxWidth: "boxWidth",
            alignment: "alignment",
            letterSpacing: "letterSpacing",
            lineSpacing: "lineSpacing",
            textOpacity: "opacity",
            shadowOpacity: "shadowOpacity",
            shadowBlur: "shadowBlur",
            shadowOffset: "shadowOffset",
            backgroundOpacity: "backgroundOpacity",
            backgroundPadding: "backgroundPadding",
            backgroundRadius: "backgroundRadius",
            animationOut: "animationOut",
            animationDuration: "animationDuration",
          };
          for (const [from, to] of Object.entries(fields))
            if (v[from] != null) (t as any)[to] = v[from];
          if (v.outlineColor) t.outlineColor = color(v.outlineColor);
          else if (
            v.outline &&
            v.outline !== "automatic" &&
            v.outline !== "none"
          )
            t.outlineColor = v.outline;
          if (v.backgroundColor) t.background = color(v.backgroundColor);
          if (v.shadowColor) t.shadowColor = color(v.shadowColor);
        }
        break;
      default:
        throw Error(
          `This editor cannot safely apply ${op.kind}. Your timeline was kept.`,
        );
    }
    if (overlay && overlayTarget) overlay.appearance = overlayTarget.appearance;
  }
  return validate(out);
}
