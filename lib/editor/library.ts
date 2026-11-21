import { validate, type Document } from "./model.ts";

export function sourceIsUsed(doc: Document, index: number) {
  return [...doc.segments, ...doc.overlays, ...doc.audio].some(
    (item) => item.sourceIndex === index,
  );
}

// Permanent library removal is separate from undoable timeline deletion. Retained
// words keep their original IDs even when their source-array position changes.
export function removeUnusedSource(doc: Document, index: number) {
  if (!Number.isInteger(index) || !doc.sources[index])
    throw Error("Media not found.");
  if (sourceIsUsed(doc, index))
    throw Error("Remove this media's timeline clips first.");
  const next = structuredClone(doc);
  next.sources.splice(index, 1);
  for (const item of [...next.segments, ...next.overlays, ...next.audio])
    if (item.sourceIndex > index) item.sourceIndex--;
  next.words = next.words
    .filter((word) => word.clip !== index)
    .map((word) => ({
      ...word,
      clip: word.clip > index ? word.clip - 1 : word.clip,
    }));
  if (next.quietCuts)
    next.quietCuts = next.quietCuts
      .filter((cut) => cut.clip !== index)
      .map((cut) => ({
        ...cut,
        clip: cut.clip > index ? cut.clip - 1 : cut.clip,
      }));
  return validate(next);
}
