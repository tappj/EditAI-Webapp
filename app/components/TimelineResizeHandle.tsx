"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";

/** View-only resizing: it never changes the edit or enters undo history. */
export function TimelineResizeHandle() {
  const handle = useRef<HTMLButtonElement>(null);
  const requested = useRef(0);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const [bounds, setBounds] = useState({ min: 240, max: 240, value: 240 });
  const limits = useRef(bounds);
  function resize(height: number) {
    const editor = handle.current?.closest<HTMLElement>(".editor");
    if (!editor) return;
    const value = Math.round(
      Math.max(limits.current.min, Math.min(limits.current.max, height)),
    );
    requested.current = value;
    editor.style.setProperty("--timeline-height", `${value}px`);
    setBounds((previous) => ({ ...previous, value }));
  }
  useEffect(() => {
    const editor = handle.current?.closest<HTMLElement>(".editor");
    if (!editor) return;
    const measure = () => {
      if (innerWidth < 1100) {
        editor.style.removeProperty("--timeline-height");
        return;
      }
      const short = innerHeight <= 680;
      const min = short
        ? 240
        : Math.min(380, Math.max(280, innerHeight * 0.34));
      const max = Math.max(
        min,
        Math.min(
          editor.clientHeight * 0.58,
          editor.clientHeight - (short ? 56 + 180 : 64 + 240),
        ),
      );
      const value = Math.round(
        Math.max(min, Math.min(max, requested.current || min)),
      );
      limits.current = { min: Math.round(min), max: Math.round(max), value };
      if (requested.current)
        editor.style.setProperty("--timeline-height", `${value}px`);
      setBounds(limits.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(editor);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      editor.style.removeProperty("--timeline-height");
    };
  }, []);
  return (
    <button
      ref={handle}
      type="button"
      className="timeline-resize-handle"
      role="separator"
      aria-label={uiText("Resize timeline")}
      aria-orientation="horizontal"
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      aria-valuenow={bounds.value}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const timeline = event.currentTarget.closest(".timeline")!;
        drag.current = {
          y: event.clientY,
          height: timeline.getBoundingClientRect().height,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (drag.current)
          resize(drag.current.height + drag.current.y - event.clientY);
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onDoubleClick={() => resize(limits.current.min)}
      onKeyDown={(event) => {
        const actions: Record<string, number> = {
          ArrowUp: bounds.value + 24,
          ArrowDown: bounds.value - 24,
          Home: bounds.min,
          End: bounds.max,
        };
        if (event.key in actions) {
          event.preventDefault();
          event.stopPropagation();
          resize(actions[event.key]);
        }
      }}
    >
      <span />
    </button>
  );
}
