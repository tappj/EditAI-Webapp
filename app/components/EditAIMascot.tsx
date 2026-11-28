"use client";
import { t as uiText } from "@/lib/editor/i18n";

import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { evaMaterialColors } from "@/lib/editor/app-theme";
import { AppThemeContext } from "./AppThemeContext";
import { EvaThemeFilter } from "./EvaThemeFilter";
import "./editai-mascot.css";

const armFrames = [
  ["rest", "/mascot/editai-hand-rest-v9.png"],
  ["a", "/mascot/editai-wave-a-v5.png"],
  ["b", "/mascot/editai-wave-b-v5.png"],
] as const;

/** Fixed soft artwork with quick expressions and two drawn waving poses. */
export function EditAIMascot({
  working = false,
  greeting = false,
  interactive = true,
  shadow = false,
  size = 48,
  className = "",
}: {
  working?: boolean;
  greeting?: boolean;
  interactive?: boolean;
  shadow?: boolean;
  size?: number;
  className?: string;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const smileId = useId().replace(/:/g, "") + "-smile";
  const theme = useContext(AppThemeContext);
  const colors = evaMaterialColors(theme);
  const filterId = smileId + "-material";
  const material = colors ? { filter: `url(#${filterId})` } : undefined;
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<string[]>([]);
  const interacting = (interactive && hovered) || greeting;
  const ready = (part: string) =>
    setLoaded((parts) => (parts.includes(part) ? parts : [...parts, part]));
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    // Cached server-rendered images may finish before React attaches onLoad.
    const completed = Array.from(
      node.querySelectorAll<HTMLImageElement>("img[data-eva-part]"),
    )
      .filter((image) => image.complete && image.naturalWidth > 0)
      .map((image) => image.dataset.evaPart!);
    if (completed.length)
      setLoaded((parts) => Array.from(new Set([...parts, ...completed])));
    let visible = true;
    const sync = () => setPaused(document.hidden || !visible);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <span
      ref={root}
      className={`editai-mascot ${className}`}
      data-state={working ? "working" : "idle"}
      data-interacting={interacting || undefined}
      data-paused={paused || undefined}
      data-ready={loaded.length === 5 || undefined}
      data-eva-theme={theme}
      style={
        {
          "--mascot-size": `${size}px`,
          ...(colors
            ? {
                "--eva-eye": `color-mix(in srgb, ${colors[0]} 22%, white)`,
                "--eva-glow": colors[0],
                "--eva-star": colors[1],
                "--eva-warm": colors[2],
              }
            : {}),
        } as CSSProperties
      }
      aria-hidden="true"
      onPointerEnter={() => interactive && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {colors && <EvaThemeFilter id={filterId} colors={colors} />}
      {shadow && <span className="mascot-ground-shadow" />}
      <span className="mascot-float">
        <span className="mascot-rig">
          <img
            className="mascot-body mascot-body-open"
            data-eva-part="body"
            style={material}
            src="/mascot/editai-body-v10.png"
            alt=""
            draggable={false}
            onLoad={() => ready("body")}
          />
          <img
            className="mascot-body mascot-body-closed"
            data-eva-part="closed"
            style={material}
            src="/mascot/editai-body-closed-v10.png"
            alt=""
            draggable={false}
            onLoad={() => ready("closed")}
          />
          <img
            className="mascot-arm mascot-arm-rest"
            data-eva-part="rest"
            style={material}
            src={armFrames[0][1]}
            alt=""
            draggable={false}
            onLoad={() => ready("rest")}
          />
          <span className="mascot-wave">
            {armFrames.slice(1).map(([frame, src]) => (
              <img
                key={frame}
                className={`mascot-arm mascot-wave-${frame}`}
                data-eva-part={frame}
                style={material}
                src={src}
                alt=""
                draggable={false}
                onLoad={() => ready(frame)}
              />
            ))}
          </span>
          <svg className="mascot-face" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id={smileId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0"
                  stopColor={
                    colors
                      ? `color-mix(in srgb, ${colors[0]} 25%, white)`
                      : "#bff6ff"
                  }
                />
                <stop
                  offset="0.55"
                  stopColor={
                    colors
                      ? `color-mix(in srgb, ${colors[1]} 10%, white)`
                      : "#e5fcff"
                  }
                />
                <stop
                  offset="1"
                  stopColor={
                    colors
                      ? `color-mix(in srgb, ${colors[2]} 35%, white)`
                      : "#f8e7ff"
                  }
                />
              </linearGradient>
            </defs>
            <g className="mascot-eyes">
              <g className="mascot-eyes-awake">
                <g className="mascot-eyes-open">
                  <ellipse cx="42" cy="33.5" rx="3.2" ry="4.5" />
                  <ellipse cx="60" cy="33.5" rx="3.2" ry="4.5" />
                </g>
                <g className="mascot-eyes-happy">
                  <path d="M37.5 33.5 Q42 26.5 46.5 33.5 M55.5 33.5 Q60 26.5 64.5 33.5" />
                </g>
              </g>
              <g className="mascot-eyes-closed">
                <path d="M38.5 33.5 Q42 37 45.5 33.5 M56.5 33.5 Q60 37 63.5 33.5" />
              </g>
            </g>
            <path
              className="mascot-smile"
              fill={`url(#${smileId})`}
              d="M47.5 39 Q51 40.1 54.5 39 Q55.3 44.4 51 44.6 Q46.7 44.4 47.5 39 Z"
            />
            <g className="mascot-blush">
              <path d="M36.2 39.8 L37.4 38.2 M38.4 39.8 L39.6 38.2 M40.6 39.8 L41.8 38.2 M60.2 39.8 L61.4 38.2 M62.4 39.8 L63.6 38.2 M64.6 39.8 L65.8 38.2" />
            </g>
            <g className="mascot-play-buttons">
              <path
                transform="translate(19.8 36.3) rotate(-7)"
                d="M-1.4 -2.5 L2 0 L-1.4 2.5 Z"
              />
              <path
                transform="translate(79.6 36) rotate(7) scale(-1 1)"
                d="M-1.4 -2.5 L2 0 L-1.4 2.5 Z"
              />
            </g>
          </svg>
          <svg
            className="mascot-sparkles"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <path
              className="mascot-sparkle sparkle-one"
              d="M15 9 Q16 14 20 15 Q16 16 15 21 Q14 16 10 15 Q14 14 15 9 Z"
            />
            <path
              className="mascot-sparkle sparkle-two"
              d="M81 7 Q82 12 86 13 Q82 14 81 19 Q80 14 76 13 Q80 12 81 7 Z"
            />
            <path
              className="mascot-sparkle sparkle-three"
              d="M85 72 Q86 77 90 78 Q86 79 85 84 Q84 79 80 78 Q84 77 85 72 Z"
            />
            <path
              className="mascot-sparkle sparkle-four"
              d="M9 21 L10.5 24 L13 25 L10.5 26 L9 29 L7.5 26 L5 25 L7.5 24 Z"
            />
          </svg>
        </span>
      </span>
    </span>
  );
}
export function TypingDots() {
  return (
    <span className="typing-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
export function HomeMascot() {
  const [greeting, setGreeting] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <button
      className="home-mascot"
      aria-label={uiText("Meet Eva")}
      type="button"
      data-greeting={greeting || undefined}
      onFocus={(event) =>
        setFocused(event.currentTarget.matches(":focus-visible"))
      }
      onBlur={() => setFocused(false)}
      onClick={() => {
        if (timer.current) clearTimeout(timer.current);
        setGreeting(true);
        timer.current = setTimeout(() => setGreeting(false), 1600);
      }}
    >
      <EditAIMascot size={190} greeting={greeting || focused} shadow />
    </button>
  );
}
