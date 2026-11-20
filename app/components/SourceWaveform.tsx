"use client";
import { memo, useEffect, useRef, useState } from "react";
const cache = new Map<string, Promise<number[]>>();
let decodeQueue: Promise<unknown> = Promise.resolve();
async function readPeaks(url: string) {
  const response = await fetch(url);
  if (!response.ok) return [];
  const blob = await response.blob();
  if (blob.size > 32 * 1024 * 1024) return [];
  const audio = await new OfflineAudioContext(1, 1, 8000).decodeAudioData(
    await blob.arrayBuffer(),
  );
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
    audio.getChannelData(i),
  );
  const step = Math.max(1, Math.ceil(audio.length / 512)),
    peaks: number[] = [];
  for (let offset = 0; offset < audio.length; offset += step) {
    let sum = 0;
    for (const samples of channels)
      for (let i = offset; i < Math.min(offset + step, audio.length); i++)
        sum += samples[i] ** 2;
    peaks.push(
      Math.sqrt(
        sum / (Math.min(step, audio.length - offset) * channels.length),
      ),
    );
  }
  const max = Math.max(0.001, ...peaks);
  return peaks.map((p) => p / max);
}
function cachedPeaks(url: string) {
  let result = cache.get(url);
  if (!result) {
    if (cache.size >= 32) cache.delete(cache.keys().next().value!);
    result = decodeQueue.then(() => readPeaks(url)).catch(() => []);
    decodeQueue = result;
    cache.set(url, result);
  }
  return result;
}
export const SourceWaveform = memo(function SourceWaveform({
  url,
  start,
  end,
  duration,
  bytes,
}: {
  url?: string;
  start: number;
  end: number;
  duration: number;
  bytes?: number;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  useEffect(() => {
    if (
      !url ||
      !host.current ||
      duration > 300 ||
      (bytes ?? 0) > 32 * 1024 * 1024
    )
      return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        void cachedPeaks(url).then((data) => {
          if (!cancelled) setPeaks(data);
        });
      },
      { rootMargin: "64px" },
    );
    observer.observe(host.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [url, bytes, duration]);
  const values = peaks.length
    ? Array.from(
        { length: 128 },
        (_, i) =>
          peaks[
            Math.min(
              peaks.length - 1,
              Math.max(
                0,
                Math.floor(
                  ((start + ((end - start) * i) / 128) / duration) *
                    peaks.length,
                ),
              ),
            )
          ],
      )
    : [];
  return (
    <span ref={host} className="source-waveform-slot" aria-hidden="true">
      {!!values.length && (
        <svg
          className="source-waveform"
          viewBox="0 0 512 28"
          preserveAspectRatio="none"
        >
          <path
            d={values
              .map((p, i) => `M${i * 4 + 1} 28v-${Math.max(0.5, p * 27)}`)
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
    </span>
  );
});
