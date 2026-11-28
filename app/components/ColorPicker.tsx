"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pipette, X } from "lucide-react";
import { TEXT_COLORS, hexToHsv, hsvToHex } from "@/lib/editor/palette";

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const color = /^#[a-f0-9]{6}$/i.test(value) ? value.toLowerCase() : "#000000";
  const hsv = hexToHsv(color);
  const [sampling, setSampling] = useState(false),
    [sample, setSample] = useState(color),
    [error, setError] = useState("");
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const details = useRef<HTMLDetailsElement>(null),
    abort = useRef<AbortController | null>(null);
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!sampling) return;
    const stop = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSampling(false);
      }
    };
    const reposition = () => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        'canvas[aria-label="Video preview"]',
      );
      setBounds(canvas?.getBoundingClientRect() || null);
    };
    reposition();
    document.addEventListener("keydown", stop, true);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("keydown", stop, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [sampling]);
  async function eyedropper() {
    setError("");
    details.current?.removeAttribute("open");
    const Native = (
      window as unknown as {
        EyeDropper?: new () => {
          open: (options: {
            signal: AbortSignal;
          }) => Promise<{ sRGBHex: string }>;
        };
      }
    ).EyeDropper;
    if (Native) {
      abort.current = new AbortController();
      try {
        const result = await new Native().open({
          signal: abort.current.signal,
        });
        latest.current(result.sRGBHex);
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Video preview"]',
    );
    if (!canvas) {
      setError("Open a video preview to sample a color.");
      return;
    }
    setBounds(canvas.getBoundingClientRect());
    setSampling(true);
  }
  function samplePixel(x: number, y: number) {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Video preview"]',
    );
    if (!canvas) return null;
    const b = canvas.getBoundingClientRect();
    try {
      const p = canvas
        .getContext("2d")!
        .getImageData(
          Math.max(
            0,
            Math.min(
              canvas.width - 1,
              Math.floor(((x - b.left) / b.width) * canvas.width),
            ),
          ),
          Math.max(
            0,
            Math.min(
              canvas.height - 1,
              Math.floor(((y - b.top) / b.height) * canvas.height),
            ),
          ),
          1,
          1,
        ).data;
      return (
        "#" +
        Array.from(p.slice(0, 3))
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("")
      );
    } catch {
      setError(
        "This preview cannot be sampled. Choose a palette color instead.",
      );
      setSampling(false);
      return null;
    }
  }
  function wheel(x: number, y: number, element: HTMLElement) {
    const b = element.getBoundingClientRect(),
      dx = x - b.left - b.width / 2,
      dy = y - b.top - b.height / 2;
    onChange(
      hsvToHex(
        ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
        Math.min(1, Math.hypot(dx, dy) / (b.width / 2)),
        hsv.v || 1,
      ),
    );
  }
  return (
    <div className="color-picker color-palette-picker">
      <div className="color-picker-heading">
        <span>{uiText(label)}</span>
        <input
          aria-label={uiText("{0} hex", { 0: label })}
          spellCheck={false}
          maxLength={7}
          key={color}
          defaultValue={color}
          onBlur={(e) => {
            e.currentTarget.value = color;
          }}
          onChange={(e) => {
            const next = e.target.value;
            if (/^#?[a-f0-9]{6}$/i.test(next))
              onChange(next.startsWith("#") ? next : `#${next}`);
          }}
        />
      </div>
      <div className="color-tools-row">
        <button
          type="button"
          className="color-eyedropper"
          aria-label={uiText("Sample {0}", { 0: label.toLowerCase() })}
          title={uiText("Pick a color from the screen or preview")}
          onClick={() => void eyedropper()}
        >
          <Pipette size={18} />
        </button>
        <details className="color-wheel-popover" ref={details}>
          <summary
            className="color-wheel-trigger"
            aria-label={uiText("Choose custom {0}", { 0: label.toLowerCase() })}
            title={uiText("Color wheel")}
          />
          <div className="color-wheel-panel">
            <div
              className="color-disc"
              role="slider"
              tabIndex={0}
              aria-label={uiText("{0} wheel", { 0: label })}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsv.h)}
              aria-valuetext={`Hue ${Math.round(hsv.h)}, saturation ${Math.round(hsv.s * 100)} percent`}
              style={{
                backgroundImage: `linear-gradient(#000000${Math.round(
                  (1 - hsv.v) * 255,
                )
                  .toString(16)
                  .padStart(2, "0")},#000000${Math.round((1 - hsv.v) * 255)
                  .toString(16)
                  .padStart(
                    2,
                    "0",
                  )}),radial-gradient(circle closest-side,white 0%,#ffffff00 100%),conic-gradient(from 90deg,red,#ff0,lime,cyan,blue,magenta,red)`,
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                wheel(e.clientX, e.clientY, e.currentTarget);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  wheel(e.clientX, e.clientY, e.currentTarget);
              }}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  onChange(
                    hsvToHex(
                      (hsv.h +
                        (e.key === "ArrowLeft"
                          ? -1
                          : e.key === "ArrowRight"
                            ? 1
                            : 0) +
                        360) %
                        360,
                      Math.max(
                        0,
                        Math.min(
                          1,
                          hsv.s +
                            (e.key === "ArrowUp"
                              ? 0.02
                              : e.key === "ArrowDown"
                                ? -0.02
                                : 0),
                        ),
                      ),
                      hsv.v || 1,
                    ),
                  );
                }
              }}
            >
              <span
                className="color-disc-marker"
                style={{
                  left: `${50 + Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50}%`,
                  top: `${50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50}%`,
                  background: color,
                }}
              />
            </div>
            <label className="color-brightness">
              {uiText("Brightness")}
              <input
                type="range"
                aria-label={uiText("{0} brightness", { 0: label })}
                min={0}
                max={100}
                value={Math.round(hsv.v * 100)}
                onChange={(e) =>
                  onChange(hsvToHex(hsv.h, hsv.s, +e.target.value / 100))
                }
              />
            </label>
            <label className="system-color">
              {uiText("System picker")}
              <input
                type="color"
                aria-label={uiText("Custom {0}", { 0: label.toLowerCase() })}
                value={color}
                onChange={(e) => onChange(e.target.value)}
              />
            </label>
          </div>
        </details>
        <div
          className="color-swatch-strip"
          role="group"
          aria-label={uiText("{0} palette", { 0: label })}
        >
          {TEXT_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className="color-swatch"
              style={{ background: swatch }}
              aria-label={`${label} ${swatch}`}
              aria-pressed={color === swatch}
              onClick={() => onChange(swatch)}
            />
          ))}
        </div>
      </div>
      {error && (
        <p className="panel-note" role="status">
          {error}
        </p>
      )}
      {sampling &&
        bounds &&
        createPortal(
          <>
            <button
              type="button"
              className="color-sample-surface"
              aria-label={uiText("Sample {0} from preview", {
                0: label.toLowerCase(),
              })}
              style={{
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
              }}
              onPointerMove={(e) => {
                const c = samplePixel(e.clientX, e.clientY);
                if (c) setSample(c);
              }}
              onClick={(e) => {
                const c = samplePixel(e.clientX, e.clientY);
                if (c) latest.current(c);
                setSampling(false);
              }}
            />
            <div className="color-sample-hint">
              <i style={{ background: sample }} />
              {uiText("Click a preview color · Esc to cancel")}
              <button
                type="button"
                aria-label={uiText("Cancel color sampling")}
                onClick={() => setSampling(false)}
              >
                <X size={16} />
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
