import {
  duration,
  segmentDuration,
  textTiming,
  type Document,
} from "./model.ts";
import type { Track } from "./timeline.ts";

/** Magnetic distance is supplied in seconds from a constant screen-pixel radius.
 * Main video remains gapless: moving it reorders clips at their existing cuts. */
export function snapTimelineDelta(
  doc: Document,
  track: Track,
  id: string,
  mode: "start" | "end" | "move",
  delta: number,
  tolerance: number,
) {
  if (
    !Number.isFinite(delta) ||
    !Number.isFinite(tolerance) ||
    tolerance <= 0 ||
    (track === "segments" && mode === "move")
  )
    return delta;
  const targets = [0, duration(doc)];
  let offset = 0;
  let selected: { start: number; end: number } | undefined;
  for (const segment of doc.segments) {
    const timing = { start: offset, end: offset + segmentDuration(segment) };
    if (track === "segments" && segment.id === id) selected = timing;
    else targets.push(timing.start, timing.end);
    offset = timing.end;
  }
  for (const kind of ["texts", "overlays", "audio"] as const)
    for (const layer of doc[kind]) {
      const timing =
        kind === "texts"
          ? textTiming(doc, layer as Document["texts"][number])
          : layer;
      if (kind === track && layer.id === id) selected = timing;
      else if (!(
        track === "segments" &&
        "anchor" in layer &&
        layer.anchor?.segmentId === id
      ))
        targets.push(timing.start, timing.end);
    }
  if (!selected) return delta;
  // A main-track start trim ripples its duration: its final right boundary
  // moves opposite the source-in gesture. Snap that resulting boundary.
  const direction = track === "segments" && mode === "start" ? -1 : 1;
  const edges =
    mode === "move"
      ? [selected.start, selected.end]
      : [track === "segments" ? selected.end : selected[mode]];
  let correction = tolerance + 1;
  for (const edge of edges)
    for (const target of targets) {
      const candidate = target - (edge + delta * direction);
      if (
        Math.abs(candidate) <= tolerance &&
        Math.abs(candidate) < Math.abs(correction)
      )
        correction = candidate;
    }
  return Math.abs(correction) <= tolerance
    ? delta + correction * direction
    : delta;
}
