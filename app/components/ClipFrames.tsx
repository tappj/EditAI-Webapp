"use client";
import { useEffect, useRef, useState } from "react";
const cache = new Map<string, string[]>();
export function ClipFrames({
  url,
  start,
  end,
  image = false,
}: {
  url?: string;
  start: number;
  end: number;
  image?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  useEffect(() => {
    if (!url || !ref.current) return;
    if (image) return;
    let cancelled = false;
    let video: HTMLVideoElement | undefined;
    const key = `${url}:${start.toFixed(2)}:${end.toFixed(2)}`;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        observer.disconnect();
        const existing = cache.get(key);
        if (existing) {
          setFrames(existing);
          return;
        }
        video = document.createElement("video");
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
              video?.removeEventListener(name, done);
            };
            video!.addEventListener(name, done, { once: true });
          });
        }
        try {
          if (video.readyState < 2) await event("loadeddata");
          const canvas = document.createElement("canvas");
          canvas.width = 120;
          canvas.height = 68;
          const ctx = canvas.getContext("2d")!;
          const result: string[] = [];
          for (let i = 0; i < 3 && !cancelled; i++) {
            const position = Math.min(
              end - 0.01,
              start + ((end - start) * (i + 0.5)) / 3,
            );
            if (Math.abs(video.currentTime - position) > 0.001) {
              const ready = event("seeked");
              video.currentTime = position;
              await ready;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            result.push(canvas.toDataURL("image/jpeg", 0.65));
          }
          if (!cancelled) {
            if (cache.size >= 64) cache.delete(cache.keys().next().value!);
            cache.set(key, result);
            setFrames(result);
          }
        } catch {
          /* A missing thumbnail never blocks editing or media playback. */
        } finally {
          video?.removeAttribute("src");
          video?.load();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(ref.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      video?.removeAttribute("src");
      video?.load();
    };
  }, [url, start, end, image]);
  return (
    <div className="clip-frames" ref={ref} aria-hidden="true">
      {(image && url ? [url] : frames).map((src, i) => (
        <span key={i} style={{ backgroundImage: `url("${src}")` }} />
      ))}
    </div>
  );
}
