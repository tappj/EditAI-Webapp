"use client";
import type React from "react";
import { useState } from "react";
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
  const snap = (input: HTMLInputElement, alt: boolean) => {
    if (alt || /speed|volume/i.test(label)) return;
    const n = +input.value;
    const nearest = Math.round(n / major) * major;
    if (
      nearest >= min &&
      nearest <= max &&
      (Math.abs(n - nearest) / span) * input.clientWidth <= 3
    )
      onChange(Number(nearest.toPrecision(10)));
  };
  return (
    <label className="range-label">
      <span>
        {label}
        <input
          className="range-value"
          aria-label={`${label} value`}
          type="number"
          min={min}
          max={max}
          step="any"
          value={Number(value.toFixed(5))}
          onChange={(e) => {
            const n = e.currentTarget.valueAsNumber;
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
        />
      </span>
      <span className="range-control">
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
          onPointerUp={(e) => snap(e.currentTarget, e.altKey)}
          onChange={(e) => onChange(+e.target.value)}
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
