import { LANE_LIMITS } from "./lanes.ts";
import {
  duration,
  newSegment,
  segmentDuration,
  validate,
  type Document,
} from "./model.ts";
export type MediaTrack = "segments" | "audio" | "overlays";
export type MediaDrop = { track: MediaTrack; time: number; lane?: number };
export function insertionIndex(doc: Document, time: number) {
  let offset = 0;
  for (let i = 0; i < doc.segments.length; i++) {
    if (time < offset + segmentDuration(doc.segments[i]) / 2) return i;
    offset += segmentDuration(doc.segments[i]);
  }
  return doc.segments.length;
}
// Caller owns the cloned document: adding media is validated with the whole edit.
export function placeSource(doc: Document, index: number, drop: MediaDrop) {
  const source = doc.sources[index];
  if (!source) throw Error("This media is no longer in the project.");
  const total = duration(doc);
  const start = Math.max(0, Math.min(drop.time, total - 0.1));
  if (source.kind === "audio" || drop.track === "audio") {
    if (source.kind === "image")
      throw Error("Choose a sound or video for an audio track.");
    const end = Math.min(total, start + source.duration);
    if (
      drop.lane !== undefined &&
      (!Number.isInteger(drop.lane) ||
        drop.lane < 0 ||
        drop.lane >= LANE_LIMITS.audio)
    )
      throw Error("Invalid audio lane.");
    const lane = (
      drop.lane === undefined
        ? Array.from({ length: LANE_LIMITS.audio }, (_, i) => i)
        : [drop.lane]
    ).find(
      (l) =>
        !doc.audio.some((a) => a.lane === l && a.start < end && a.end > start),
    );
    if (lane == null)
      throw Error(
        "All seven audio tracks are occupied here. Move or trim a sound first.",
      );
    doc.audio.push({
      id: crypto.randomUUID(),
      sourceIndex: index,
      sourceStart: 0,
      start,
      end,
      lane,
      volume: 0.7,
      fadeIn: 0,
      fadeOut: 0,
    });
  } else if (drop.track === "overlays") {
    doc.overlays.push({
      id: crypto.randomUUID(),
      sourceIndex: index,
      sourceStart: 0,
      start,
      end: Math.min(
        total,
        start + (source.kind === "image" ? 3 : source.duration),
      ),
      x: 0.5,
      y: 0.5,
      width: 0.5,
      opacity: 1,
      ...(drop.lane === undefined ? {} : { lane: drop.lane }),
    });
  } else {
    doc.segments.splice(
      insertionIndex(doc, drop.time),
      0,
      newSegment(index, source.kind === "image" ? 3 : source.duration),
    );
  }
  return validate(doc);
}
