import type { Document } from "./model.ts";

export type AudioRange = { start: number; end: number };
const valid = (range: AudioRange) =>
  !!range &&
  Number.isFinite(range.start) &&
  Number.isFinite(range.end) &&
  range.end > range.start;

function merge(ranges: AudioRange[]): AudioRange[] {
  const result: AudioRange[] = [];
  for (const range of ranges
    .filter(valid)
    .map((range) => ({ ...range }))
    .sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && range.start <= last.end + 0.001)
      last.end = Math.max(last.end, range.end);
    else result.push(range);
  }
  return result;
}

/** Final verification of already measured quiet candidates. Missing text alone
 * never creates a cut. Independent speech and word ranges both veto cleanup. */
export function finalQuietCuts(
  length: number,
  candidates: AudioRange[],
  spoken: AudioRange[],
) {
  if (!Number.isFinite(length) || length <= 0) return [];
  if (spoken.some((range) => !valid(range))) return [];
  const bounded = (range: AudioRange) => ({
    start: Math.max(0, range.start),
    end: Math.min(length, range.end),
  });
  const protectedRanges = merge(
    spoken
      .filter(valid)
      .map((range) =>
        bounded({ start: range.start - 0.06, end: range.end + 0.06 }),
      ),
  );
  const quiet = merge(candidates.filter(valid).map(bounded));
  const result: AudioRange[] = [];
  let index = 0;
  for (const candidate of quiet) {
    let cursor = candidate.start;
    while (
      index < protectedRanges.length &&
      protectedRanges[index].end <= cursor
    )
      index++;
    let at = index;
    while (
      at < protectedRanges.length &&
      protectedRanges[at].start < candidate.end
    ) {
      const speech = protectedRanges[at++];
      if (speech.start - cursor >= 0.16)
        result.push({
          start: cursor,
          end: Math.min(speech.start, candidate.end),
        });
      cursor = Math.max(cursor, speech.end);
      if (cursor >= candidate.end) break;
    }
    if (candidate.end - cursor >= 0.16)
      result.push({ start: cursor, end: candidate.end });
  }
  return result;
}

/** Local measured ranges stay source-anchored, including chunk offsets. They
 * protect later cleanup, not model instructions or authorizations to delete. */
export function recordSpeechRegions(
  document: Document,
  clip: number,
  regions?: AudioRange[],
) {
  if (!regions || !document.sources[clip]) return;
  const length = document.sources[clip].duration;
  const same = (document.speechRegions || []).filter(
    (range) => range.clip === clip,
  );
  const next = merge(
    [...same, ...regions].filter(valid).map((range) => ({
      start: Math.max(0, range.start),
      end: Math.min(length, range.end),
    })),
  );
  document.speechRegions = [
    ...(document.speechRegions || []).filter((range) => range.clip !== clip),
    ...next.map((range) => ({ clip, ...range })),
  ].sort((a, b) => a.clip - b.clip || a.start - b.start);
}
