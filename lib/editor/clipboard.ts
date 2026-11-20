import {
  type Document,
  type Segment,
  type TextLayer,
  type Overlay,
  type AudioLayer,
  duration,
  textTiming,
  validate,
} from "./model.ts";
import { fitLayers, type Track } from "./timeline.ts";
import { insertionIndex } from "./placement.ts";
import { LANE_LIMITS } from "./lanes.ts";
export type EditorCopy = {
  track: Track;
  item: Segment | TextLayer | Overlay | AudioLayer;
};
export function copyItem(doc: Document, track: Track, id: string): EditorCopy {
  const item = doc[track].find((x) => x.id === id);
  if (!item) throw Error("Select an item to copy.");
  const copy = structuredClone(item);
  if (track === "texts") {
    Object.assign(copy, textTiming(doc, item as TextLayer));
    delete (copy as TextLayer).anchor;
  }
  return { track, item: copy };
}
export function pasteItem(doc: Document, copy: EditorCopy, time: number) {
  const d = structuredClone(doc);
  const item = { ...structuredClone(copy.item), id: crypto.randomUUID() };
  if (copy.track === "segments")
    d.segments.splice(insertionIndex(d, time), 0, item as Segment);
  else {
    const start = Math.max(0, time),
      end = Math.min(duration(d), start + (item.end - item.start));
    if (end - start < 0.05)
      throw Error("Place the cursor before the end of the video to paste.");
    Object.assign(item, { start, end });
    delete (item as TextLayer).lane;
    if (copy.track === "audio") {
      const audio = item as AudioLayer;
      const lane = Array.from({ length: LANE_LIMITS.audio }, (_, i) => i).find(
        (l) =>
          !d.audio.some((a) => a.lane === l && a.start < end && a.end > start),
      );
      if (lane == null)
        throw Error("All seven audio tracks are occupied here.");
      audio.lane = lane;
      d.audio.push(audio);
    } else if (copy.track === "texts") d.texts.push(item as TextLayer);
    else d.overlays.push(item as Overlay);
  }
  fitLayers(d);
  validate(d);
  return { doc: d, id: item.id, track: copy.track };
}
