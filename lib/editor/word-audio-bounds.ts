import type { Word } from "./model.ts";
export type AudioWordBound = {
  start: number;
  end: number;
  leadingSpeech?: boolean;
};
/** Measured boundary evidence; original ASR words/IDs are retained unchanged.
 * Require clear SNR, preserve short-word cores and leave phonetic roll-in/out.
 * Quiet microphones use the same relative threshold as loud microphones. */
export function wordAudioBounds(
  samples: Float32Array,
  rate: number,
  words: Word[],
  offset = 0,
): Record<string, AudioWordBound> {
  const hop = Math.max(1, Math.round(rate * 0.005)),
    window = Math.max(1, Math.round(rate * 0.01));
  if (samples.length < window || !words.length) return {};
  const count = Math.floor((samples.length - window) / hop) + 1,
    levels = new Float32Array(count);
  let sum = 0;
  for (let i = 0; i < window; i++) sum += samples[i] ** 2;
  for (let j = 0; j < count; j++) {
    if (j) {
      const old = (j - 1) * hop;
      for (let i = old; i < old + hop; i++) {
        sum -= samples[i] ** 2;
        sum += samples[i + window] ** 2;
      }
    }
    levels[j] =
      20 * Math.log10(Math.max(1e-8, Math.sqrt(Math.max(0, sum) / window)));
  }
  const sorted = levels.slice().sort(),
    noise = sorted[Math.floor(count * 0.1)],
    step = hop / rate,
    bounds: Record<string, AudioWordBound> = {};
  for (const word of words) {
    const a = Math.max(0, Math.floor(word.start / step)),
      b = Math.min(count, Math.ceil(word.end / step) + 1);
    if (b <= a) continue;
    const voice = levels.slice(a, b).sort(),
      peak = voice[Math.floor(voice.length * 0.9)];
    if (peak - noise < 18) continue;
    const threshold = Math.max(noise + 9, peak - 28);
    const find = (lo: number, hi: number, last: boolean) => {
      let found: number | undefined;
      for (
        let i = Math.max(0, Math.ceil(lo / step));
        i < Math.min(count, Math.floor(hi / step));
        i++
      )
        if (levels[i] > threshold) {
          found = i * step;
          if (!last) break;
        }
      return found;
    };
    // Some recognizers stamp the first word at zero and include the entire
    // leading silence in it. Search its whole interval, with clear SNR and a
    // surviving voiced core, instead of protecting an empty timestamp prefix.
    const leadingOn =
      word === words[0] && word.start <= 0.1
        ? find(word.start, Math.min(word.end, word.start + 1.5), false)
        : undefined;
    const leadingSpeech =
      leadingOn != null &&
      leadingOn - word.start > 0.2 &&
      word.end - leadingOn >= 0.06;
    const on = leadingSpeech
        ? leadingOn
        : find(word.start - 0.16, word.start + 0.16, false),
      off = find(word.end - 0.16, word.end + 0.16, true);
    if (on == null || off == null) continue;
    const core = word.end - word.start;
    const start = Math.max(
      0,
      leadingSpeech
        ? on - 0.035
        : Math.min(word.start + Math.min(0.08, core * 0.2), on - 0.025),
    );
    const end = Math.min(
      samples.length / rate,
      Math.max(
        word.end - Math.min(0.1, core * 0.2),
        off + window / rate + 0.035,
      ),
    );
    if (end > start)
      bounds[word.id] = {
        start: Math.round((start + offset) * 1000) / 1000,
        end: Math.round((end + offset) * 1000) / 1000,
        ...(leadingSpeech ? { leadingSpeech: true } : {}),
      };
  }
  return bounds;
}
