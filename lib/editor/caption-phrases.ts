import type { Document, TextLayer } from "./model.ts";
import { segmentDuration } from "./model.ts";
export type CaptionPhrase = {
  firstWord: string;
  lastWord: string;
  text: string;
};
const tokens = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
/** Reference phrasing may change case, punctuation, line breaks and emoji, never
 * recorded wording. Apply a complete, ordered, source-anchored set atomically;
 * otherwise keep the already validated, verbatim generated captions. */
export function referenceCaptionPhrases(
  d: Document,
  phrases: CaptionPhrase[] | undefined,
): Document {
  if (!phrases?.length || phrases.length > 120) return d;
  try {
    const lookup = new Map(d.words.map((w, i) => [w.id, i]));
    let cursor = 0;
    const parts = d.segments.map((segment) => {
      const part = {
        segment,
        cursor,
        words: d.words.filter(
          (w) =>
            w.clip === segment.sourceIndex &&
            w.start < segment.end &&
            w.end > segment.start,
        ),
      };
      cursor += segmentDuration(segment);
      return part;
    });
    const expected = parts.flatMap((p) => p.words.map((w) => w.id));
    if (new Set(expected).size !== expected.length) return d;
    // Models occasionally attach an adjacent word's ID to an otherwise exact
    // phrase. Recover anchors only from a complete verbatim ordered token stream;
    // this cannot insert, omit, reorder or paraphrase any recorded speech.
    const retained = parts.flatMap((p) => p.words);
    let wordCursor = 0;
    const anchored = phrases.map((phrase) => {
      if (!lookup.has(phrase.firstWord) || !lookup.has(phrase.lastWord))
        throw Error("Unknown source word");
      const target = tokens(phrase.text),
        first = wordCursor;
      if (!target.length) throw Error("Empty phrase");
      const source: string[] = [];
      while (wordCursor < retained.length && source.length < target.length)
        source.push(...tokens(retained[wordCursor++].text));
      if (JSON.stringify(source) !== JSON.stringify(target))
        throw Error("Caption wording changed");
      return {
        ...phrase,
        firstWord: retained[first].id,
        lastWord: retained[wordCursor - 1].id,
      };
    });
    if (wordCursor !== retained.length) return d;
    const base = d.texts.find((t) => t.kind === "caption" || t.anchor);
    if (!base) return d;
    const seen: string[] = [],
      captions: TextLayer[] = [];
    for (const phrase of anchored) {
      const a = lookup.get(phrase.firstWord),
        b = lookup.get(phrase.lastWord);
      if (
        a == null ||
        b == null ||
        b < a ||
        b - a > 18 ||
        typeof phrase.text !== "string" ||
        phrase.text.length > 240
      )
        throw Error("Invalid caption range");
      const words = d.words.slice(a, b + 1);
      if (
        JSON.stringify(tokens(phrase.text)) !==
        JSON.stringify(tokens(words.map((w) => w.text).join(" ")))
      )
        throw Error("Caption wording changed");
      const part = parts.find((p) =>
        words.every((w) => p.words.some((kept) => kept.id === w.id)),
      );
      if (!part || words.some((w) => w.clip !== part.segment.sourceIndex))
        throw Error("Caption crosses an edit");
      const start = Math.max(part.segment.start, words[0].start - 0.02),
        end = Math.min(part.segment.end, words.at(-1)!.end + 0.06);
      if (end <= start) throw Error("Empty caption");
      seen.push(...words.map((w) => w.id));
      captions.push({
        ...base,
        id: crypto.randomUUID(),
        text: phrase.text,
        kind: "caption",
        start: part.cursor + (start - part.segment.start) / part.segment.speed,
        end: part.cursor + (end - part.segment.start) / part.segment.speed,
        anchor: { segmentId: part.segment.id, start, end },
      });
    }
    if (JSON.stringify(seen) !== JSON.stringify(expected))
      throw Error("Incomplete caption coverage");
    for (let i = 1; i < captions.length; i++)
      if (captions[i - 1].end > captions[i].start) {
        if (captions[i].start <= captions[i - 1].start)
          throw Error("Overlapping phrases");
        captions[i - 1].end = captions[i].start;
        const part = parts.find(
          (p) => p.segment.id === captions[i - 1].anchor!.segmentId,
        )!;
        captions[i - 1].anchor!.end =
          part.segment.start +
          (captions[i].start - part.cursor) * part.segment.speed;
      }
    return {
      ...d,
      texts: [
        ...d.texts.filter((t) => t.kind !== "caption" && !t.anchor),
        ...captions,
      ],
    };
  } catch {
    return d;
  }
}
