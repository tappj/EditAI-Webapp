"use client";
import type React from "react";
import { useRef, useState } from "react";
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
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  function show(button: HTMLButtonElement) {
    if (!button.closest(".is-editor")) return;
    const rect = button.getBoundingClientRect();
    setTooltip({
      x: Math.min(innerWidth - 100, Math.max(100, rect.left + rect.width / 2)),
      y: rect.top < 70 ? rect.bottom + 8 : rect.top - 32,
    });
  }
  return (
    <>
      <button
        className="icon-button"
        aria-label={label}
        title={label}
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
            className="editor-control-tooltip"
            role="tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  resetValue?: number;
  onChange: (n: number) => void;
}) {
  const percent = /opacity|volume/i.test(label);
  const speed = /speed/i.test(label);
  const scale = percent ? 100 : 1;
  const format = (n: number) => String(Number((n * scale).toFixed(2)));
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
    onChange(Number.isFinite(n) && n >= min && n <= max ? n : original.current);
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
  const snapped = (n: number, width: number, bypass: boolean) => {
    if (bypass) return n;
    const candidates = [
      ...marks.filter((m) => m.large).map((m) => m.n),
      min,
      max,
      neutral,
    ];
    const nearest = candidates.reduce((a, b) =>
      Math.abs(n - a) < Math.abs(n - b) ? a : b,
    );
    return (Math.abs(n - nearest) / span) * width <= 9
      ? Number(nearest.toPrecision(10))
      : n;
  };
  return (
    <label
      className={`range-label${speed || /volume/i.test(label) ? " range-wedge" : ""}`}
    >
      <span>
        {label}
        <span className="range-number">
          {speed && <span aria-hidden="true">x</span>}
          <input
            className="range-value"
            style={{
              width: `${Math.max(2, Math.min(12, (draft ?? format(value)).length))}ch`,
            }}
            aria-label={`${label} value`}
            type="number"
            min={min * scale}
            max={max * scale}
            step="any"
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
          {percent && <span aria-hidden="true">%</span>}
        </span>
      </span>
      <span
        className="range-control"
        style={
          {
            "--range-fill": `${((value - min) / span) * 100}%`,
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
          aria-label={label}
          ref={(node) => {
            if (node) (node as ResettableRange).editaiReset = reset;
          }}
          onKeyDown={(e) => {
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
          step={/speed|volume/i.test(label) ? (step ?? 0.01) : "any"}
          value={value}
          style={
            {
              "--range-fill": `${((value - min) / span) * 100}%`,
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
                : +e.target.value,
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
      <img src="/brand/editai-icon-192.png" width={32} height={32} alt="" />
      <span>EditAI</span>
    </span>
  );
}
