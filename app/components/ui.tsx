"use client";
import type React from "react";
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
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Range({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="range-label">
      <span>
        {label}
        <b>{Number(value.toFixed(2))}</b>
      </span>
      <input
        type="range"
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
      <span>
        Edit<span>AI</span>
      </span>
    </span>
  );
}
