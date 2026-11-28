"use client";
import { t as uiText } from "@/lib/editor/i18n";

import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  className = "",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      title={title}
      className={`${secondary ? "button secondary" : "button"} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function IconButton({
  children,
  onClick,
  label,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
}) {
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    below: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const width = tooltipRef.current.getBoundingClientRect().width;
    tooltipRef.current.style.left = `${Math.max(width / 2 + 8, Math.min(innerWidth - width / 2 - 8, tooltip.x))}px`;
  }, [tooltip]);
  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [tooltip]);
  function show(button: HTMLButtonElement) {
    if (!button.closest(".is-editor")) return;
    const rect = button.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top < 70 ? rect.bottom + 8 : rect.top - 8,
      below: rect.top < 70,
    });
  }
  return (
    <>
      <button
        className="icon-button"
        aria-label={uiText(label)}
        title={tooltip ? undefined : label}
        onClick={() => {
          setTooltip(null);
          onClick?.();
        }}
        onPointerEnter={(e) => show(e.currentTarget)}
        onPointerLeave={() => setTooltip(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setTooltip(null)}
        disabled={disabled}
      >
        {children}
      </button>
      {tooltip &&
        createPortal(
          <span
            ref={tooltipRef}
            className="editor-control-tooltip"
            role="tooltip"
            data-below={tooltip.below || undefined}
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {uiText(label)}
          </span>,
          document.body,
        )}
    </>
  );
}
const RANGE_THUMB_SIZE = 8;
type ResettableRange = HTMLInputElement & { editaiReset?: () => void };
export function resetHoveredRange() {
  const slider = document.querySelector<ResettableRange>(
    ".is-editor .range-label:hover input[type=range]",
  );
  if (!slider?.editaiReset) return false;
  slider.editaiReset();
  return true;
}
export function Range({
  label,
  value,
  min,
  max,
  step,
  resetValue,
  displayScale = 1,
  unit,
  onChange: applyValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  resetValue?: number;
  displayScale?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  const volume = /volume/i.test(label);
  const percent = /opacity|volume/i.test(label);
  const speed = /^speed$/i.test(label);
  const scale = percent ? 100 : displayScale;
  const quantize = (n: number) => (volume ? Math.round(n * 100) / 100 : n);
  const onChange = (n: number) => applyValue(quantize(n));
  const format = (n: number) =>
    String(Number((n * scale).toFixed(volume ? 0 : 2)));
  const [draft, setDraft] = useState<string | null>(null);
  const original = useRef(value);
  const cancelled = useRef(false);
  const dragging = useRef(false);
  const bypassSnap = useRef(false);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(null);
      return;
    }
    const n = draft === null || !draft.trim() ? NaN : Number(draft) / scale;
    onChange(
      Number.isFinite(n) && n >= min && n <= max
        ? quantize(n)
        : original.current,
    );
    setDraft(null);
  };
  const neutral =
    resetValue ??
    (/speed|contrast|saturation|opacity|volume/i.test(label)
      ? 1
      : /horizontal|vertical/i.test(label)
        ? 0.5
        : /size/i.test(label)
          ? 0.055
          : 0);
  const reset = () => onChange(Math.min(max, Math.max(min, neutral)));
  const span = max - min;
  const rough = span / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const major = [1, 2, 5, 10].map((n) => n * power).find((n) => n >= rough)!;
  const marks = Array.from(
    { length: Math.ceil(span / (major / 5)) + 1 },
    (_, i) => {
      const n = Math.ceil(min / (major / 5)) * (major / 5) + (i * major) / 5;
      return { n, large: Math.abs(n / major - Math.round(n / major)) < 0.001 };
    },
  ).filter((m) => m.n <= max + span * 0.0001);
  for (const n of [min, max, neutral]) {
    if (
      n >= min &&
      n <= max &&
      !marks.some((m) => Math.abs(m.n - n) < span * 1e-8)
    )
      marks.push({ n, large: true });
  }
  const snapped = (n: number, width: number, bypass: boolean) => {
    if (bypass) return quantize(n);
    const candidates = [
      ...marks.filter((m) => m.large).map((m) => m.n),
      min,
      max,
      neutral,
    ];
    const nearest = candidates.reduce((a, b) =>
      Math.abs(n - a) < Math.abs(n - b) ? a : b,
    );
    return (Math.abs(n - nearest) / span) *
      Math.max(1, width - RANGE_THUMB_SIZE) <=
      9
      ? quantize(Number(nearest.toPrecision(10)))
      : quantize(n);
  };
  return (
    <label
      className={`range-label${/volume/i.test(label) ? " range-wedge" : ""}`}
    >
      <span>
        {uiText(label)}
        <span className="range-number">
          {speed && <span aria-hidden="true">x</span>}
          <input
            className="range-value"
            style={{
              width: `${Math.max(2, Math.min(12, (draft ?? format(value)).length))}ch`,
            }}
            aria-label={uiText("{0} value", { 0: uiText(label) })}
            type="number"
            min={min * scale}
            max={max * scale}
            step={volume ? 1 : "any"}
            value={draft ?? format(value)}
            onFocus={() => {
              original.current = value;
              setDraft(format(value));
            }}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelled.current = true;
                e.currentTarget.blur();
              }
            }}
          />
          {unit && <span aria-hidden="true">{unit}</span>}
          {percent && <span aria-hidden="true">%</span>}
          {/fade|duration/i.test(label) && <span aria-hidden="true">s</span>}
        </span>
      </span>
      <span
        className="range-control"
        style={
          {
            "--range-fill": `${((quantize(value) - min) / span) * 100}%`,
            "--range-thumb-size": `${RANGE_THUMB_SIZE}px`,
          } as React.CSSProperties
        }
      >
        <span className="range-ticks" aria-hidden="true">
          {marks.map((m, i) => (
            <i
              key={i}
              className={m.large ? "major" : "minor"}
              style={{ left: `${((m.n - min) / span) * 100}%` }}
            />
          ))}
        </span>
        <input
          type="range"
          aria-label={uiText(label)}
          ref={(node) => {
            if (node) (node as ResettableRange).editaiReset = reset;
          }}
          onKeyDown={(e) => {
            if (
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              e.stopPropagation();
              const direction =
                e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 1;
              onChange(
                Math.min(
                  max,
                  Math.max(
                    min,
                    Number(
                      (value + direction * (step ?? span / 100)).toPrecision(
                        10,
                      ),
                    ),
                  ),
                ),
              );
            }
            if (
              e.key.toLowerCase() === "r" &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.altKey
            ) {
              e.preventDefault();
              e.stopPropagation();
              reset();
            }
          }}
          min={min}
          max={max}
          step={volume ? 0.01 : "any"}
          value={quantize(value)}
          style={
            {
              "--range-fill": `${((quantize(value) - min) / span) * 100}%`,
            } as React.CSSProperties
          }
          onPointerDown={(e) => {
            dragging.current = true;
            bypassSnap.current = e.altKey;
          }}
          onPointerMove={(e) => {
            bypassSnap.current = e.altKey;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onPointerUp={(e) => {
            dragging.current = false;
            onChange(
              snapped(
                +e.currentTarget.value,
                e.currentTarget.clientWidth,
                e.altKey,
              ),
            );
          }}
          onChange={(e) =>
            onChange(
              dragging.current
                ? snapped(
                    +e.target.value,
                    e.currentTarget.clientWidth,
                    bypassSnap.current,
                  )
                : quantize(+e.target.value),
            )
          }
        />
      </span>
    </label>
  );
}
export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-icon">
        <img src="/brand/editai-icon-192.png" width={32} height={32} alt="" />
        <svg viewBox="0 0 192 192" width={32} height={32} aria-hidden="true">
          <filter id="editai-scissors-ink" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 -1 -1 0 2"
            />
          </filter>
          <image
            href="/brand/editai-icon-192.png"
            width="192"
            height="192"
            filter="url(#editai-scissors-ink)"
          />
        </svg>
      </span>
      <span>EditAI</span>
    </span>
  );
}
