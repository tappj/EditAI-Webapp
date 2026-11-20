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
  step = 0.01,
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
  return (
    <label className="range-label">
      <span>
        {label}
        <b>{Number(value.toFixed(2))}</b>
      </span>
      <input
        type="range"
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
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
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
