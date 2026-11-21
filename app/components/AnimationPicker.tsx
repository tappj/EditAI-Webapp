"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  MEDIA_ANIMATIONS,
  TEXT_ANIMATIONS,
  motionAt,
} from "@/lib/editor/motion";

function MotionSample({
  animation,
  outgoing,
  duration,
  media,
  children,
}: {
  animation: string;
  outgoing: boolean;
  duration: number;
  media: boolean;
  children: ReactNode;
}) {
  const sample = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = sample.current;
    if (!element || animation === "none") return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let playing: globalThis.Animation | undefined;
    const replay = () => {
      playing?.cancel();
      if (!visible || preference.matches) return;
      const length = Math.max(1, duration * 4);
      const frames = Array.from({ length: 25 }, (_, index) => {
        const t = (duration * index) / 24;
        const motion = motionAt(
          {
            animationIn: outgoing ? "none" : animation,
            animationOut: outgoing ? animation : "none",
            animationDuration: duration,
          },
          outgoing ? length - duration + t : t,
          length,
          4,
        );
        return {
          offset: t / (duration + 0.7),
          opacity: motion.opacity,
          transform: `translateY(${motion.offsetY * (media ? 46 : 300)}px) scale(${motion.scale})`,
          filter: `blur(${motion.blur * 0.12}px)`,
          clipPath: `inset(0 ${(1 - motion.visibleCharacters / 4) * 100}% 0 0)`,
        };
      });
      playing = element.animate(
        [...frames, { ...frames[frames.length - 1], offset: 1 }],
        { duration: (duration + 0.7) * 1000, iterations: Infinity },
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      replay();
    });
    observer.observe(element);
    preference.addEventListener("change", replay);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", replay);
      playing?.cancel();
    };
  }, [animation, outgoing, duration, media]);
  return (
    <span
      ref={sample}
      className={`animation-sample animation-${animation}`}
      style={{ animation: "none" }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
export function AnimationPicker({
  label,
  value,
  onChange,
  media = false,
  preview,
  outgoing = false,
  duration = 0.35,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  media?: boolean;
  preview?: ReactNode;
  outgoing?: boolean;
  duration?: number;
}) {
  return (
    <fieldset
      className={`animation-picker${media ? " media-animation-picker" : ""}${outgoing ? " animation-outgoing" : ""}`}
    >
      <legend>{label}</legend>
      <div>
        {(media ? MEDIA_ANIMATIONS : TEXT_ANIMATIONS).map((animation) => (
          <button
            key={animation}
            type="button"
            aria-label={`${label}: ${animation}`}
            aria-pressed={animation === value}
            onClick={() => onChange(animation)}
          >
            <MotionSample
              animation={animation}
              outgoing={outgoing}
              duration={duration}
              media={media}
            >
              {preview || "Text"}
            </MotionSample>
            <span>{animation[0].toUpperCase() + animation.slice(1)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
