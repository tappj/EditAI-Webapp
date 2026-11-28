"use client";
import { memo, useEffect, useRef, useState } from "react";
const cache = new Map<string, string[]>();
const pending = new Map<string, Promise<string[]>>();
async function decodeFrames(
  url: string,
  start: number,
  end: number,
  library: boolean,
) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  function event(name: "loadeddata" | "seeked") {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(Error("Thumbnail unavailable"));
      }, 5000);
      const done = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener(name, done);
      };
      video.addEventListener(name, done, { once: true });
    });
  }
  try {
    if (video.readyState < 2) await event("loadeddata");
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      (library ? 1280 : 480) / Math.max(video.videoWidth, video.videoHeight),
      (library ? 720 : 164) / video.videoHeight,
    );
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d")!;
    const result: string[] = [];
    const count = library ? 1 : 12;
    for (let i = 0; i < count; i++) {
      const position = Math.max(
        0,
        Math.min(
          video.duration - 0.01,
          end - 0.01,
          library
            ? Math.min(0.2, end / 20)
            : start + ((end - start) * (i + 0.5)) / count,
        ),
      );
      if (Math.abs(video.currentTime - position) > 0.001) {
        const ready = event("seeked");
        video.currentTime = position;
        await ready;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      result.push(canvas.toDataURL("image/jpeg", 0.9));
    }
    return result;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
function sourceFrames(
  key: string,
  url: string,
  start: number,
  end: number,
  library: boolean,
) {
  const ready = cache.get(key);
  if (ready) return Promise.resolve(ready);
  let job = pending.get(key);
  if (!job) {
    job = decodeFrames(url, start, end, library)
      .then((frames) => {
        if (cache.size >= 48) cache.delete(cache.keys().next().value!);
        cache.set(key, frames);
        return frames;
      })
      .catch(() => [])
      .finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}
export const ClipFrames = memo(function ClipFrames({
  url,
  start,
  end,
  image = false,
  library = false,
  duration,
  pixelsPerSecond = 48,
  speed = 1,
}: {
  url?: string;
  start: number;
  end: number;
  image?: boolean;
  library?: boolean;
  duration?: number;
  pixelsPerSecond?: number;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sample, setSample] = useState<{ key: string; frames: string[] }>({
    key: "",
    frames: [],
  });
  // Source-wide samples are shared across cuts. Trimming masks/offsets the strip.
  const full = duration ?? end;
  const sampleStart = duration != null || library ? 0 : start;
  const key = `${url}:${library ? "library" : "strip"}:${sampleStart.toFixed(2)}:${full.toFixed(2)}`;
  useEffect(() => {
    if (!url || !ref.current || image) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        observer.disconnect();
        void sourceFrames(key, url, sampleStart, full, library).then(
          (frames) => {
            if (!cancelled) setSample({ key, frames });
          },
        );
      },
      { rootMargin: "100px" },
    );
    observer.observe(ref.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [url, image, library, key, sampleStart, full]);
  const frames = sample.key === key ? sample.frames : [];
  const fixed = duration != null && !library;
  return (
    <div
      className={`clip-frames ${fixed ? "fixed-filmstrip" : ""}`}
      ref={ref}
      aria-hidden="true"
    >
      <div
        className="frame-samples"
        style={
          fixed
            ? {
                width: `${Math.max(1, (full / speed) * pixelsPerSecond)}px`,
                transform: `translateX(${(-start / speed) * pixelsPerSecond}px)`,
              }
            : undefined
        }
      >
        {(image && url ? [url] : frames).map((src, i) => (
          <span key={i} style={{ backgroundImage: `url("${src}")` }} />
        ))}
      </div>
    </div>
  );
});
