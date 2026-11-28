export const NO_AUDIO = "No audio detected.";
const TOLERANCE = 0.1;
type TimedText = { start: number; end: number; text: string };
type Token = TimedText & { index: number };
export class TranscriptTimingError extends Error {
  constructor() {
    super(
      "The speech service did not return usable timing. Your original clip is saved; retry to resume its transcription.",
    );
  }
}
function seconds(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?s?$/.test(value.trim()))
    return Number(value.trim().replace(/s$/, ""));
  return NaN;
}
function tokens(
  raw: unknown,
  duration: number,
  field: "word" | "text",
): Token[] {
  if (!Array.isArray(raw) || raw.length > 50000)
    throw new TranscriptTimingError();
  return raw.flatMap((item, index) => {
    const value = field === "word" ? (item?.word ?? item?.text) : item?.text;
    if (typeof value !== "string" || value.length > 500)
      throw new TranscriptTimingError();
    const text = value.trim();
    if (!text) return [];
    const start = seconds(item.start),
      end = seconds(item.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < -TOLERANCE ||
      end < start ||
      end > duration + TOLERANCE + 1e-6
    )
      throw new TranscriptTimingError();
    return [
      {
        index,
        text,
        start: Math.max(0, Math.min(duration, start)),
        end: Math.max(0, Math.min(duration, end)),
      },
    ];
  });
}
function join(parts: string[]) {
  return parts.reduce(
    (a, b) =>
      !a ? b : /^[,.;:!?\)\]\}，。！？]/u.test(b) ? a + b : a + " " + b,
    "",
  );
}
function normalizeWords(raw: unknown, duration: number): TimedText[] {
  const input = tokens(raw, duration, "word");
  const previous: number[] = [],
    next: number[] = [];
  let anchor = -1;
  input.forEach((t, i) => {
    previous[i] = anchor;
    if (t.end > t.start) anchor = i;
  });
  anchor = -1;
  for (let i = input.length - 1; i >= 0; i--) {
    next[i] = anchor;
    if (input[i].end > input[i].start) anchor = i;
  }
  const groups = new Map<number, Token[]>();
  const distance = (t: Token, i: number) =>
    i < 0
      ? Infinity
      : Math.max(input[i].start - t.start, t.start - input[i].end, 0);
  input.forEach((t, i) => {
    let index = i;
    if (t.end === t.start) {
      const left = previous[i],
        right = next[i],
        a = distance(t, left),
        b = distance(t, right);
      // Preserve zero-duration words/punctuation on an adjacent measured speech
      // interval. Do not fabricate durations or silently drop recognized text.
      index =
        a < b || (a === b && /^[,.;:!?\)\]\}，。！？]/u.test(t.text))
          ? left
          : right;
      if (index < 0 || Math.min(a, b) > TOLERANCE + 1e-6)
        throw new TranscriptTimingError();
    }
    const group = groups.get(index) || [];
    group.push(t);
    groups.set(index, group);
  });
  const output: TimedText[] = [];
  for (const [, members] of [...groups].sort(([a], [b]) => a - b)) {
    const current = {
      start: Math.min(...members.map((x) => x.start)),
      end: Math.max(...members.map((x) => x.end)),
      text: join(members.map((x) => x.text)),
    };
    if (current.end <= current.start || current.text.length > 500)
      throw new TranscriptTimingError();
    const prior = output.at(-1);
    if (prior && current.start < prior.start) {
      // Small overlapping provider jitter is bundled conservatively. Editorial
      // cuts protect the entire measured union and original token order.
      if (
        prior.start - current.start > TOLERANCE + 1e-6 ||
        current.end < prior.start
      )
        throw new TranscriptTimingError();
      prior.start = current.start;
      prior.end = Math.max(prior.end, current.end);
      prior.text = join([prior.text, current.text]);
      if (
        prior.text.length > 500 ||
        (output.length > 1 && prior.start < output.at(-2)!.start)
      )
        throw new TranscriptTimingError();
    } else output.push(current);
  }
  return output;
}
export function normalizeTranscript(
  reply: { words?: unknown; segments?: unknown; text?: unknown },
  duration: number,
): TimedText[] {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 900)
    throw new TranscriptTimingError();
  try {
    const words = normalizeWords(reply.words ?? [], duration);
    if (words.length) return words;
  } catch (error) {
    if (!Array.isArray(reply.segments) || !reply.segments.length) throw error;
  }
  if (Array.isArray(reply.segments) && reply.segments.length) {
    const result = tokens(reply.segments, duration, "text");
    if (
      result.some(
        (t, i) => t.end <= t.start || (i > 0 && t.start < result[i - 1].start),
      )
    )
      throw new TranscriptTimingError();
    return result.map(({ start, end, text }) => ({ start, end, text }));
  }
  if (typeof reply.text === "string" && reply.text.trim())
    throw new TranscriptTimingError();
  return [];
}
// Inspect the canonical mono 16-bit WAV we encode, not an arbitrary user codec.
// Only exact digital silence is rejected; quiet speech is preserved.
export async function hasAudioSignal(audio: Blob) {
  const buffer = await audio.arrayBuffer(),
    v = new DataView(buffer);
  const tag = (i: number) =>
    String.fromCharCode(...new Uint8Array(buffer, i, 4));
  if (buffer.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE")
    return true;
  let pcm = false;
  for (let p = 12; p + 8 <= buffer.byteLength;) {
    const n = v.getUint32(p + 4, true);
    if (p + 8 + n > buffer.byteLength) return true;
    if (tag(p) === "fmt " && n >= 16)
      pcm = v.getUint16(p + 8, true) === 1 && v.getUint16(p + 22, true) === 16;
    if (tag(p) === "data" && pcm) {
      for (let q = p + 8; q + 1 < p + 8 + n; q += 2)
        if (v.getInt16(q, true) !== 0) return true;
      return false;
    }
    p += 8 + n + (n % 2);
  }
  return true;
}
