import { wordAudioBounds, type AudioWordBound } from "./word-audio-bounds.ts";
import { speechRegions } from "./speech-regions";
import {
  nonSpeechCuts,
  silenceCuts,
  isNonSpeechMarker,
  type Word,
} from "./model";
import { finalQuietCuts, type AudioRange } from "./audio-final-check.ts";
export const QUIET_CUT_VERSION = 7;
// Read our own FFmpeg output (mono, 16-bit PCM WAV), never a guessed source encoding.
export async function quietPauses(
  audio: Blob,
  words: Word[],
  clip: number,
  offset = 0,
  onSpeechAnalyzed?: (
    complete: boolean,
    bounds?: Record<string, AudioWordBound>,
    regions?: AudioRange[],
  ) => void,
) {
  const buffer = await audio.arrayBuffer(),
    view = new DataView(buffer);
  const tag = (i: number) =>
    String.fromCharCode(...new Uint8Array(buffer, i, 4));
  if (buffer.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    onSpeechAnalyzed?.(false);
    return [];
  }
  let rate = 0,
    bits = 0,
    channels = 0,
    data = 0,
    size = 0;
  for (let i = 12; i + 8 <= buffer.byteLength;) {
    const n = view.getUint32(i + 4, true),
      type = tag(i);
    if (type === "fmt " && n >= 16) {
      channels = view.getUint16(i + 10, true);
      rate = view.getUint32(i + 12, true);
      bits = view.getUint16(i + 22, true);
    }
    if (type === "data") {
      data = i + 8;
      size = Math.min(n, buffer.byteLength - data);
      break;
    }
    i += 8 + n + (n % 2);
  }
  if (!data || channels !== 1 || bits !== 16 || !rate) {
    onSpeechAnalyzed?.(false);
    return [];
  }
  const samples = new Float32Array(Math.floor(size / 2));
  for (let i = 0; i < samples.length; i++)
    samples[i] = view.getInt16(data + i * 2, true) / 32768;
  const local = words
    .filter((w) => w.clip === clip && w.end > offset)
    .map((w) => ({
      ...w,
      start: Math.max(0, w.start - offset),
      end: w.end - offset,
    }));
  const regions = await speechRegions(samples, rate);
  onSpeechAnalyzed?.(
    regions !== null,
    regions ? wordAudioBounds(samples, rate, local, offset) : undefined,
    regions?.map((range) => ({
      start: range.start + offset,
      end: range.end + offset,
    })),
  );
  const candidates = [
    ...silenceCuts(samples, rate, local, clip),
    ...(regions
      ? nonSpeechCuts(samples.length / rate, local, regions, clip)
      : []),
  ];
  return finalQuietCuts(samples.length / rate, candidates, [
    ...local.filter((word) => !isNonSpeechMarker(word.text)),
    ...(regions || []),
  ]).map((c) => ({
    clip,
    start: c.start + offset,
    end: c.end + offset,
  }));
}
