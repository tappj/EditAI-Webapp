import { assignLanes, LANE_LIMITS } from "./lanes.ts";
import { FONTS, DEFAULT_TEXT_STYLE } from "./fonts.ts";
import {
  validMotion,
  validCameraZoom,
  type CameraZoom,
  validFades,
  splitEffects,
  type MotionSettings,
  type AudioFades,
} from "./motion.ts";
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
  speechAlignment?: { job: string; until: number };
};
export type Appearance = MotionSettings & {
  cameraZoom?: CameraZoom;
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
export type Segment = AudioFades & {
  id: string;
  sourceIndex: number;
  start: number;
  end: number;
  speed: number;
  volume: number;
  appearance: Appearance;
};
export type TextLayer = {
  kind?: "caption" | "text";
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
  fontWeight?: number;
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
export type Overlay = AudioFades & {
  /** Free rotation in canvas degrees, in addition to the source's quarter turns. */
  rotation?: number;
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
  quietCutVersion?: number;
  wordAudioBounds?: Record<
    string,
    { start: number; end: number; leadingSpeech?: boolean }
  >;
  quietCuts?: { clip: number; start: number; end: number }[];
  speechRegions?: { clip: number; start: number; end: number }[];
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
  firstCutTask?: {
    autoCut?: boolean;
    addCaptions?: boolean;
    id: string;
    status: "pending" | "complete" | "cancelled" | "failed";
    progress: number;
    provider: string;
    startedAt: number;
  };
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
  for (const source of d.sources) {
    const progress = source.speechAlignment;
    if (
      progress &&
      (!/^trx_[a-zA-Z0-9_-]{1,160}$/.test(progress.job) ||
        !Number.isFinite(progress.until) ||
        progress.until < 0 ||
        progress.until > source.duration ||
        (progress.until % 100 !== 0 &&
          Math.abs(progress.until - source.duration) > 0.00001))
    )
      throw Error("Invalid speech recovery state.");
  }
  const ids = new Set();
  if (
    d.speechRegions !== undefined &&
    (!Array.isArray(d.speechRegions) ||
      d.speechRegions.length > 20000 ||
      d.speechRegions.some(
        (region) =>
          !region ||
          !Number.isInteger(region.clip) ||
          !d.sources[region.clip] ||
          d.sources[region.clip].kind === "image" ||
          !finite(region.start, 0, d.sources[region.clip].duration) ||
          !finite(region.end, 0, d.sources[region.clip].duration + 0.01) ||
          region.end <= region.start,
      ))
  )
    throw Error("Invalid measured speech ranges.");
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
      !filters.includes(a.filter) ||
      !validFades(s) ||
      !validMotion(a) ||
      !validCameraZoom(a.cameraZoom)
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
      (t.fontWeight != null &&
        (!Number.isInteger(t.fontWeight) || !finite(t.fontWeight, 300, 900))) ||
      !finite(t.start, 0, 7200) ||
      !finite(t.end, 0, 7200) ||
      t.end <= t.start ||
      (t.boxHeight != null && !finite(t.boxHeight, 0.03, 1)) ||
      (t.boxWidth != null && !finite(t.boxWidth, 0.05, 1)) ||
      !/^#[a-f0-9]{6}$/i.test(t.color) ||
      !validMotion(
        {
          animationIn: t.animation,
          animationOut: t.animationOut,
          animationDuration: t.animationDuration,
        },
        true,
      )
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
      !finite(o.opacity, 0, 1) ||
      !finite(o.rotation ?? 0, -180, 180) ||
      !validFades(o) ||
      !validMotion(o.appearance || {}) ||
      !validCameraZoom(o.appearance?.cameraZoom)
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
      a.lane >= LANE_LIMITS.audio ||
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
  for (const caption of [true, false])
    assignLanes(
      d.texts
        .filter((t) => (t.kind === "caption" || !!t.anchor) === caption)
        .map((t) => ({ ...t, ...textTiming(d, t) })),
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
  splitEffects(s, right);
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
  out.texts = out.texts.filter((t) => t.kind !== "caption" && !t.anchor);
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
        kind: "caption",
        id: crypto.randomUUID(),
        text: group.map((w) => w.text).join(" "),
        start: cursor + (a - s.start) / s.speed,
        end: cursor + (b - s.start) / s.speed,
        x: 0.5,
        y: format === "boxed" ? 0.5 : 0.78,
        size: 0.055,
        color: "#ffffff",
        background: "transparent",
        ...DEFAULT_TEXT_STYLE,
        animation: "none",
        ...out.captionStyle,
        anchor: { segmentId: s.id, start: a, end: b },
      });
      const current = out.texts.at(-1)!;
      const prior = out.texts.at(-2);
      if (
        prior?.anchor?.segmentId === s.id &&
        current.anchor &&
        prior.anchor.end > current.anchor.start
      ) {
        if (current.anchor.start > prior.anchor.start + 0.001) {
          prior.anchor.end = current.anchor.start;
          prior.end = current.start;
        } else {
          prior.text += " " + current.text;
          prior.anchor.end = Math.max(prior.anchor.end, current.anchor.end);
          prior.end = Math.max(prior.end, current.end);
          out.texts.pop();
        }
      }
      group = [];
    };
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi],
        max = format === "single" ? 1 : format === "boxed" ? 4 : 6;
      const sentenceTail =
        format === "standard" &&
        group.length <= max &&
        /[.!?]$/.test(w.text) &&
        (wi === words.length - 1 || words[wi + 1].start - w.end > 0.2) &&
        (w.end - group[0]?.start) / s.speed <= 3.2;
      if (
        group.length &&
        ((!sentenceTail &&
          (group.length >= max ||
            group.map((x) => x.text).join(" ").length + w.text.length >
              (format === "boxed" ? 28 : 42))) ||
          w.start - group.at(-1)!.end > 0.45 ||
          (w.end - group[0].start) / s.speed >
            (format === "standard" ? 3.0 : 2.2))
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
// Automatic edits use the union of all proposed removals. Sequential slicing
// used to strand frame-sized, wordless islands between two acoustic cuts.
export const isNonSpeechMarker = (text: string) =>
  /^(?:\[(?:cough(?:s|ing)?|clears? throat|throat clear(?:ing)?)\]|\((?:cough(?:s|ing)?|clears? throat|throat clear(?:ing)?)\))$/i.test(
    text.trim(),
  );
export function applyAutomaticCuts(
  d: Document,
  cuts: { clip: number; start: number; end: number }[],
) {
  const byClip = new Map<
    number,
    { clip: number; start: number; end: number }[]
  >();
  for (const cut of cuts) {
    if (
      !Number.isFinite(cut.start) ||
      !Number.isFinite(cut.end) ||
      cut.end <= cut.start
    )
      throw Error("Unsafe cut range.");
    const list = byClip.get(cut.clip) || [];
    list.push({ ...cut });
    byClip.set(cut.clip, list);
  }
  const removedWord = (word: Word) =>
    cuts.some(
      (c) =>
        c.clip === word.clip &&
        c.start <= word.start + 0.001 &&
        c.end >= word.end - 0.001,
    );
  const keptWords = d.words.filter(
    (w) => !removedWord(w) && !isNonSpeechMarker(w.text),
  );
  const normalized = [];
  for (const [clip, list] of byClip) {
    const merged: typeof list = [];
    for (const next of list.sort((a, b) => a.start - b.start)) {
      const last = merged.at(-1);
      if (last && next.start <= last.end)
        last.end = Math.max(last.end, next.end);
      else merged.push({ ...next });
    }
    for (const cut of merged) {
      const before = keptWords
        .filter((w) => w.clip === clip && w.end <= cut.start)
        .at(-1);
      const after = keptWords.find(
        (w) => w.clip === clip && w.start >= cut.end,
      );
      const firstRemoved = d.words.find(
        (w) =>
          w.clip === clip &&
          removedWord(w) &&
          w.start >= cut.start &&
          w.start < cut.end,
      );
      // Local acoustic cuts already protect measured speech. Adding a second
      // fixed post-roll to those ranges reinstates dead air at every edit.
      const measuredStart =
        (d.quietCutVersion ?? 0) >= 4 &&
        d.quietCuts?.some(
          (c) => c.clip === clip && Math.abs(c.start - cut.start) < 0.001,
        );
      const measuredEnd =
        (d.quietCutVersion ?? 0) >= 4 &&
        d.quietCuts?.some(
          (c) => c.clip === clip && Math.abs(c.end - cut.end) < 0.001,
        );
      if (before && !measuredStart && cut.start - before.end < 0.2)
        cut.start = Math.min(
          firstRemoved?.start ?? cut.end,
          Math.max(cut.start, before.end + 0.12),
        );
      const lastRemoved = d.words.findLast(
        (w) =>
          w.clip === clip &&
          removedWord(w) &&
          w.end <= cut.end &&
          w.end > cut.start,
      );
      if (after && !measuredEnd && after.start - cut.end < 0.2)
        cut.end = Math.max(
          lastRemoved?.end ?? cut.start,
          Math.min(cut.end, after.start - 0.06),
        );
      if (cut.end > cut.start) normalized.push(cut);
    }
  }
  const safe: typeof normalized = [];
  const spoken = (clip: number, start: number, end: number) =>
    keptWords.some((w) => w.clip === clip && w.start < end && w.end > start);
  for (const cut of normalized) {
    const previous = safe.findLast((c) => c.clip === cut.clip);
    if (
      previous &&
      cut.start - previous.end < 0.1 &&
      spoken(cut.clip, previous.end, cut.start)
    )
      continue;
    const boundaryWord = d.segments.some(
      (s) =>
        s.sourceIndex === cut.clip &&
        ((cut.start > s.start &&
          cut.start - s.start < 0.1 &&
          spoken(cut.clip, s.start, cut.start)) ||
          (cut.end < s.end &&
            s.end - cut.end < 0.1 &&
            spoken(cut.clip, cut.end, s.end))),
    );
    if (!boundaryWord) safe.push(cut);
  }
  let out = applyCuts(d, safe);
  if (d.wordAudioBounds && (d.quietCutVersion ?? 0) >= 5) {
    const edges: { clip: number; start: number; end: number }[] = [];
    for (const segment of out.segments) {
      const spoken = keptWords.filter(
        (w) =>
          w.clip === segment.sourceIndex &&
          w.start < segment.end &&
          w.end > segment.start,
      );
      if (!spoken.length) continue;
      const first = d.wordAudioBounds[spoken[0].id],
        last = d.wordAudioBounds[spoken.at(-1)!.id];
      let start =
        first && Number.isFinite(first.start)
          ? Math.max(
              segment.start,
              Math.min(
                first.start,
                first.leadingSpeech
                  ? first.start
                  : spoken[0].start +
                      Math.min(0.08, (spoken[0].end - spoken[0].start) * 0.2),
              ),
            )
          : segment.start;
      let end =
        last && Number.isFinite(last.end)
          ? Math.min(
              segment.end,
              Math.max(
                last.end,
                spoken.at(-1)!.end -
                  Math.min(
                    0.1,
                    (spoken.at(-1)!.end - spoken.at(-1)!.start) * 0.2,
                  ),
              ),
            )
          : segment.end;
      // The recognizer may omit real speech. Timed words do not authorize
      // trimming independently detected speech at either retained edge.
      for (const region of d.speechRegions || []) {
        if (
          region.clip !== segment.sourceIndex ||
          region.end <= segment.start ||
          region.start >= segment.end
        )
          continue;
        start = Math.min(start, Math.max(segment.start, region.start));
        end = Math.max(end, Math.min(segment.end, region.end));
      }
      if (end - start < 0.1) continue;
      if (start - segment.start > 0.02)
        edges.push({
          clip: segment.sourceIndex,
          start: segment.start,
          end: start,
        });
      if (segment.end - end > 0.02)
        edges.push({ clip: segment.sourceIndex, start: end, end: segment.end });
    }
    if (edges.length) out = applyCuts(out, edges);
  }
  const keep = out.segments.filter(
    (s) =>
      d.sources[s.sourceIndex].kind !== "video" ||
      (s.end - s.start) / s.speed >= 0.3 ||
      d.speechRegions?.some(
        (region) =>
          region.clip === s.sourceIndex &&
          region.start < s.end &&
          region.end > s.start,
      ) ||
      // A captionless fragment is not proof of silence, especially in legacy
      // projects. Only an existing measured quiet range may remove it.
      !d.quietCuts?.some(
        (cut) =>
          cut.clip === s.sourceIndex &&
          cut.start <= s.start + 0.001 &&
          cut.end >= s.end - 0.001,
      ) ||
      keptWords.some(
        (w) => w.clip === s.sourceIndex && w.start < s.end && w.end > s.start,
      ),
  );
  if (keep.length) {
    const ids = new Set(keep.map((s) => s.id));
    out.segments = keep;
    out.texts = out.texts.filter(
      (t) => !t.anchor || ids.has(t.anchor.segmentId),
    );
  }
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
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
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
    .filter((w) => w.clip === clip && !isNonSpeechMarker(w.text))
    .sort((a, b) => a.start - b.start);
  const sorted: { start: number; end: number }[] = [];
  for (const word of anchors) {
    const previous = sorted.at(-1);
    if (previous && word.start <= previous.end)
      previous.end = Math.max(previous.end, word.end);
    else sorted.push({ start: word.start, end: word.end });
  }
  // Relative to measured speech: works for a quiet microphone and for room
  // tone that is louder than a fixed -35dB cutoff. Timed words remain protected.
  const voice: number[] = [];
  let anchor = 0;
  for (let i = 0; i < levels.length; i++) {
    while (anchor < sorted.length && sorted[anchor].end <= i * bin) anchor++;
    if (anchor < sorted.length && sorted[anchor].start <= i * bin)
      voice.push(levels[i]);
  }
  voice.sort((a, b) => a - b);
  const speech = voice[Math.floor(voice.length * 0.65)] ?? -20;
  const threshold = Math.max(-75, Math.min(-28, speech - 14));
  for (let i = 1; i < sorted.length; i++) {
    const a = Math.ceil((sorted[i - 1].end + 0.04) / bin),
      b = Math.min(levels.length, Math.floor((sorted[i].start - 0.04) / bin));
    let first = -1;
    for (let j = a; j <= b; j++) {
      if (j < b && levels[j] < threshold) {
        if (first < 0) first = j;
      } else if (first >= 0) {
        // Keep equal, short breathing room on both sides of every quiet run.
        if ((j - first) * bin >= 0.28)
          candidates.push({
            clip,
            start: first * bin + 0.04,
            end: j * bin - 0.04,
          });
        first = -1;
      }
    }
  }
  return candidates;
}
// Keep every timed word AND independently detected speech, even when ASR omitted
// it. Only their complement is eligible for non-speech cleanup and end trimming.
export function nonSpeechCuts(
  length: number,
  words: Word[],
  speech: { start: number; end: number }[],
  clip: number,
) {
  if (!words.some((w) => w.clip === clip) || !speech.length) return [];
  const intervals = [
    ...words.filter((w) => w.clip === clip && !isNonSpeechMarker(w.text)),
    ...speech,
  ]
    .map((w) => ({
      start: Math.max(0, w.start - 0.06),
      end: Math.min(length, w.end + 0.06),
    }))
    .sort((a, b) => a.start - b.start);
  const cuts: { clip: number; start: number; end: number }[] = [];
  let end = 0;
  for (const next of intervals) {
    if (next.start - end >= 0.28)
      cuts.push({ clip, start: end, end: next.start });
    end = Math.max(end, next.end);
  }
  if (length - end >= 0.28) cuts.push({ clip, start: end, end: length });
  return cuts;
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
  "speedRange",
  "zoomRange",
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
      right.kind ??= right.anchor ? "caption" : "text";
      delete right.anchor;
      Object.assign(caption, { start: timing.start, end: at });
      caption.kind ??= caption.anchor ? "caption" : "text";
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
            splitEffects(mediaLayer, copy);
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
            Array.from({ length: LANE_LIMITS.audio }, (_, i) => i).find(
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
            (op.scope === "captions"
              ? t.kind === "caption" || !!t.anchor
              : t.kind !== "caption" && !t.anchor),
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
      case "speedRange":
      case "zoomRange": {
        const original = out.segments.find((s) => s.id === op.target);
        if (
          !original ||
          !Number.isFinite(op.start) ||
          !Number.isFinite(op.end) ||
          op.start < original.start ||
          op.end > original.end ||
          op.end - op.start < 0.1 ||
          !Number.isFinite(op.value) ||
          op.value < (op.kind === "zoomRange" ? 1 : 0.25) ||
          op.value > (op.kind === "zoomRange" ? 2.5 : 4) ||
          (op.kind === "zoomRange" &&
            !["in", "out", "pulse", "hold"].includes(op.text))
        )
          throw Error("Unsafe source effect range.");
        const originalStart = original.start;
        // End first leaves the original ID on the left. The middle ID is resolved
        // here atomically, never supplied/guessed by the model.
        if (op.end < original.end) out = split(out, original.id, op.end);
        if (op.start > originalStart) out = split(out, original.id, op.start);
        const middle = out.segments.find(
          (s) =>
            s.sourceIndex === original.sourceIndex &&
            s.start === op.start &&
            s.end === op.end &&
            (s.id === original.id ||
              out.segments.indexOf(s) ===
                out.segments.findIndex((s) => s.id === original.id) + 1),
        );
        if (!middle) throw Error("Unsafe speed range.");
        if (op.kind === "zoomRange")
          middle.appearance.cameraZoom = {
            start: op.start,
            end: op.end,
            scale: op.value,
            mode: op.text,
          };
        else middle.speed = op.value;
        break;
      }
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
            animationIn: old.animationIn,
            animationOut: old.animationOut,
            animationDuration: old.animationDuration,
            cameraZoom: old.cameraZoom,
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
        if (overlay) overlay.rotation = 0;
        for (const s of targets) {
          delete s.appearance.cameraZoom;
          s.appearance.crop = { x: 0, y: 0, width: 1, height: 1 };
          s.appearance.rotation = 0;
          s.appearance.flipX = false;
          s.appearance.flipY = false;
        }
        break;
      case "addText":
        out.texts.push({
          kind: "text",
          id: crypto.randomUUID(),
          text: op.text,
          start: op.start ?? 0,
          end: op.end ?? duration(out),
          x: 0.5,
          y: 0.5,
          size: 0.055,
          color: "#ffffff",
          background: "transparent",
          ...DEFAULT_TEXT_STYLE,
          animation: "none",
        });
        if (op.style)
          out = applyOperations(out, [
            {
              kind: "captionStyle",
              target: out.texts.at(-1)!.id,
              style: op.style,
            },
          ]);
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
          t.kind ??= t.anchor ? "caption" : "text";
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
            fontWeight: "fontWeight",
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
