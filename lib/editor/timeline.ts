import { splitEffects } from "./motion.ts";
import { assignLanes, LANE_LIMITS } from "./lanes.ts";
import {
  duration,
  segmentDuration,
  textTiming,
  validate,
  type Document,
} from "./model.ts";
export type Track = "segments" | "texts" | "overlays" | "audio";
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
// Main-track edits preserve absolute layer placement, cropping only at the new end.
export function fitLayers(d: Document) {
  const end = duration(d);
  d.texts = d.texts.filter((t) => {
    const timing = textTiming(d, t);
    return (
      timing.start >= 0 &&
      timing.start < end - 0.01 &&
      timing.end > timing.start
    );
  });
  for (const t of d.texts) if (!t.anchor) t.end = Math.min(t.end, end);
  d.overlays = d.overlays.filter((x) => x.start < end - 0.01);
  d.audio = d.audio.filter((x) => x.start < end - 0.01);
  for (const x of [...d.overlays, ...d.audio]) x.end = Math.min(x.end, end);
  return validate(d);
}
export function gestureEdit(
  base: Document,
  track: Track,
  id: string,
  mode: "start" | "end" | "move",
  delta: number,
  pushThrough = false,
) {
  const d = structuredClone(base);
  if (!Number.isFinite(delta)) throw Error("Invalid timeline movement.");
  if (track === "segments") {
    const s = d.segments.find((s) => s.id === id);
    if (!s) throw Error("Select a clip.");
    if (mode === "start")
      s.start = clamp(s.start + delta * s.speed, 0, s.end - 0.1);
    else if (mode === "end")
      s.end = clamp(
        s.end + delta * s.speed,
        s.start + 0.1,
        d.sources[s.sourceIndex].duration,
      );
    else {
      const i = d.segments.indexOf(s);
      const center =
        d.segments.slice(0, i).reduce((n, x) => n + segmentDuration(x), 0) +
        segmentDuration(s) / 2 +
        delta;
      d.segments.splice(i, 1);
      let offset = 0,
        target = 0;
      for (const other of d.segments) {
        if (center < offset + segmentDuration(other) / 2) break;
        offset += segmentDuration(other);
        target++;
      }
      d.segments.splice(target, 0, s);
    }
    return fitLayers(d);
  }
  const layer = d[track].find((x) => x.id === id);
  if (!layer) throw Error("Select a layer.");
  if (track === "texts") {
    const t = d.texts.find((x) => x.id === id)!;
    Object.assign(t, textTiming(base, t));
    t.kind ??= t.anchor ? "caption" : "text";
    delete t.anchor;
  }
  const len = layer.end - layer.start;
  const source =
    "sourceIndex" in layer ? d.sources[layer.sourceIndex] : undefined;
  const sourceStart = "sourceStart" in layer ? layer.sourceStart : 0;
  const sourceAvailable =
    source && source.kind !== "image"
      ? (source.duration - sourceStart) /
        ("speed" in layer ? layer.speed || 1 : 1)
      : Infinity;
  let left = 0,
    right = duration(d);
  const selectedText =
    track === "texts" ? base.texts.find((t) => t.id === id) : undefined;
  const caption =
    selectedText && (selectedText.kind === "caption" || !!selectedText.anchor);
  const timings = base[track]
    .filter(
      (x) =>
        track !== "texts" ||
        ((x as Document["texts"][number]).kind === "caption" ||
          !!(x as Document["texts"][number]).anchor) === caption,
    )
    .map((x) => ({
      ...x,
      ...(track === "texts"
        ? textTiming(base, x as Document["texts"][number])
        : {}),
    }));
  const laneMap = assignLanes(timings, LANE_LIMITS[track]);
  const originalLane = laneMap.get(id)!;
  layer.lane = originalLane;
  for (const x of timings.filter(
    (x) => x.id !== id && laneMap.get(x.id) === originalLane,
  )) {
    if (x.end <= layer.start) left = Math.max(left, x.end);
    if (x.start >= layer.end) right = Math.min(right, x.start);
  }
  if (pushThrough) {
    const desired =
      mode === "move"
        ? clamp(layer.start + delta, 0, duration(d) - len)
        : mode === "start"
          ? clamp(
              layer.start + delta,
              Math.max(
                0,
                layer.start -
                  sourceStart / ("speed" in layer ? layer.speed || 1 : 1),
              ),
              layer.end - 0.05,
            )
          : layer.start;
    const desiredEnd =
      mode === "move"
        ? desired + len
        : mode === "end"
          ? clamp(
              layer.end + delta,
              layer.start + 0.05,
              Math.min(duration(d), layer.start + sourceAvailable),
            )
          : layer.end;
    const otherLane = Array.from(
      { length: LANE_LIMITS[track] },
      (_, i) => i,
    ).find(
      (lane) =>
        !timings.some(
          (x) =>
            x.id !== id &&
            laneMap.get(x.id) === lane &&
            desired < x.end &&
            desiredEnd > x.start,
        ),
    );
    if (otherLane != null) {
      layer.lane = otherLane;
      left = 0;
      right = duration(d);
    }
  }
  if (mode === "move") {
    layer.start = clamp(layer.start + delta, left, right - len);
    layer.end = layer.start + len;
  } else if (mode === "start") {
    const start = clamp(
      layer.start + delta,
      Math.max(
        left,
        layer.start - sourceStart / ("speed" in layer ? layer.speed || 1 : 1),
      ),
      layer.end - 0.05,
    );
    if ("sourceStart" in layer)
      layer.sourceStart +=
        (start - layer.start) * ("speed" in layer ? layer.speed || 1 : 1);
    layer.start = start;
  } else
    layer.end = clamp(
      layer.end + delta,
      layer.start + 0.05,
      Math.min(right, layer.start + sourceAvailable),
    );
  return validate(d);
}

export function layerAction(
  base: Document,
  track: Exclude<Track, "segments">,
  id: string,
  action: "split" | "duplicate" | "delete",
  playhead: number,
) {
  const d = structuredClone(base);
  const items = d[track];
  const layer = items.find((x) => x.id === id);
  if (!layer) throw Error("Select a layer.");
  if (action === "delete") {
    items.splice(
      items.findIndex((x) => x.id === id),
      1,
    );
    return validate(d);
  }
  if (track === "texts") {
    const t = d.texts.find((x) => x.id === id)!;
    Object.assign(t, textTiming(base, t));
    delete t.anchor;
  }
  const copy = { ...structuredClone(layer), id: crypto.randomUUID() };
  if (action === "split") {
    if (playhead <= layer.start + 0.05 || playhead >= layer.end - 0.05)
      throw Error("Place the playhead inside the selected layer.");
    copy.start = playhead;
    if ("sourceStart" in copy)
      copy.sourceStart +=
        (playhead - layer.start) * ("speed" in layer ? layer.speed || 1 : 1);
    layer.end = playhead;
    if ("sourceStart" in layer && "sourceStart" in copy)
      splitEffects(layer, copy);
  } else {
    const length = layer.end - layer.start;
    copy.start = layer.end;
    copy.end = Math.min(duration(d), copy.start + length);
    if (copy.end - copy.start < 0.05)
      throw Error(
        "There is no room after this layer. Shorten or move it first.",
      );
  }
  // Each union member keeps its original track shape.
  if (track === "texts") d.texts.push(copy as Document["texts"][number]);
  else if (track === "overlays")
    d.overlays.push(copy as Document["overlays"][number]);
  else d.audio.push(copy as Document["audio"][number]);
  return validate(d);
}
