"use client";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import { type Document, textTiming } from "@/lib/editor/model";
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function PreviewHandles({
  canvas,
  doc,
  id,
  time,
  onChange,
  onPreview,
  onSelect,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  doc: Document;
  id: string;
  time: number;
  onChange: (d: Document) => void;
  onPreview: (d: Document) => void;
  onSelect: (id: string) => void;
}) {
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [draft, setDraft] = useState<Document | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null,
  );
  const input = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    base: Document;
    origin: Document;
    handle: string;
    next: Document | null;
  } | null>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect(),
        p = el.parentElement!.getBoundingClientRect();
      setBounds({
        left: r.left - p.left,
        top: r.top - p.top,
        width: r.width,
        height: r.height,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(el.parentElement!);
    measure();
    return () => observer.disconnect();
  }, [canvas]);
  const editingId = editing?.id;
  useEffect(() => {
    if (editingId) input.current?.focus();
  }, [editingId]);
  const d = draft || doc;
  const o = d.overlays.find((x) => x.id === id),
    t = d.texts.find((x) => x.id === id);
  const item = o || t;
  const timing = t ? textTiming(d, t) : o;
  const visible =
    item && timing && time >= timing.start && time < timing.end && bounds.width;
  function geometry(layer: {
    x: number;
    y: number;
    size?: number;
    boxWidth?: number;
    boxHeight?: number;
    width?: number;
    sourceIndex?: number;
  }) {
    const width = layer.width ?? layer.boxWidth ?? 0.86;
    const source =
      layer.sourceIndex != null ? d.sources[layer.sourceIndex] : null;
    const height = source
      ? (width * bounds.width * source.height) / source.width
      : layer.boxHeight
        ? layer.boxHeight * bounds.height
        : (layer.size ?? 0.055) * bounds.width * 2;
    return {
      left: bounds.left + layer.x * bounds.width - (width * bounds.width) / 2,
      top: bounds.top + layer.y * bounds.height - height / 2,
      width: width * bounds.width,
      height,
    };
  }
  function begin(e: PointerEvent<HTMLButtonElement>, handle: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const base = editing ? structuredClone(doc) : doc;
    if (editing) {
      const text = base.texts.find((x) => x.id === editing.id);
      if (text) text.text = editing.value;
      setEditing(null);
    }
    drag.current = {
      origin: doc,
      x: e.clientX,
      y: e.clientY,
      base,
      handle,
      next: editing ? base : null,
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const g = drag.current;
    if (!g) return;
    const next = structuredClone(g.base);
    const layer =
      next.overlays.find((x) => x.id === id) ||
      next.texts.find((x) => x.id === id);
    const original =
      g.base.overlays.find((x) => x.id === id) ||
      g.base.texts.find((x) => x.id === id);
    if (!layer || !original) return;
    const dx = (e.clientX - g.x) / bounds.width,
      dy = (e.clientY - g.y) / bounds.height;
    if (g.handle === "move") {
      layer.x = clamp(original.x + dx, 0, 1);
      layer.y = clamp(original.y + dy, 0, 1);
    } else if ("width" in layer && "width" in original)
      layer.width = clamp(
        original.width + dx * (g.handle.includes("w") ? -2 : 2),
        0.1,
        1,
      );
    else if ("size" in layer && "size" in original) {
      const oldW = original.boxWidth ?? 0.86,
        oldH =
          original.boxHeight ??
          (original.size * bounds.width * 2) / bounds.height;
      const signX = g.handle.includes("w") ? -1 : 1,
        signY = g.handle.includes("n") ? -1 : 1;
      const horizontal = /[ew]/.test(g.handle),
        vertical = /[ns]/.test(g.handle);
      if (horizontal) {
        layer.boxWidth = clamp(oldW + signX * dx, 0.05, 1);
        layer.x = clamp(
          original.x + ((layer.boxWidth - oldW) * signX) / 2,
          0,
          1,
        );
      }
      if (vertical) {
        layer.boxHeight = clamp(oldH + signY * dy, 0.03, 1);
        layer.y = clamp(
          original.y + ((layer.boxHeight - oldH) * signY) / 2,
          0,
          1,
        );
      }
      if (horizontal && vertical)
        layer.size = clamp(
          original.size *
            Math.max(
              (layer.boxWidth ?? oldW) / oldW,
              (layer.boxHeight ?? oldH) / oldH,
            ),
          0.01,
          0.3,
        );
    }
    g.next = next;
    setDraft(next);
    onPreview(next);
  }
  function finish(cancel = false) {
    const g = drag.current;
    drag.current = null;
    setDraft(null);
    if (g?.next && !cancel && g.origin === doc) onChange(g.next);
    else onPreview(doc);
  }
  function editText(textId: string) {
    const text = d.texts.find((x) => x.id === textId);
    if (text) {
      onSelect(textId);
      setEditing({ id: textId, value: text.text });
    }
  }
  function commitEdit(cancel = false) {
    if (!editing) return;
    if (!cancel && d.texts.some((x) => x.id === editing.id)) {
      const next = structuredClone(doc);
      next.texts.find((x) => x.id === editing.id)!.text = editing.value;
      if (editing.value !== doc.texts.find((x) => x.id === editing.id)?.text)
        onChange(next);
    }
    setEditing(null);
  }
  return (
    <>
      {d.texts
        .filter((text) => {
          const timing = textTiming(d, text);
          return time >= timing.start && time < timing.end;
        })
        .map((text) => (
          <button
            key={text.id}
            className="preview-text-hit"
            aria-label={`Edit text on video: ${text.text}`}
            style={geometry(text)}
            onClick={() => editText(text.id)}
          />
        ))}
      {visible && item && (
        <div className="preview-selection" style={geometry(item)}>
          {editing?.id === id ? (
            <textarea
              ref={input}
              className="preview-text-input"
              aria-label="Edit text on video"
              value={editing.value}
              style={{
                fontFamily: `"${t?.font || "TikTok Sans"}"`,
                fontSize: Math.max(12, (t?.size ?? 0.055) * bounds.width),
              }}
              onChange={(e) =>
                setEditing({ ...editing, value: e.target.value })
              }
              onBlur={(e) => {
                if (
                  !(e.relatedTarget as HTMLElement | null)?.closest(
                    ".preview-handle",
                  )
                )
                  commitEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  commitEdit(true);
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commitEdit();
                }
              }}
            />
          ) : (
            <button
              aria-label="Move selected layer"
              title={t ? "Drag to move; tap to edit text" : "Drag to move"}
              className="preview-move"
              onPointerDown={(e) => begin(e, "move")}
              onPointerMove={move}
              onPointerUp={() => {
                const moved = drag.current?.next;
                finish();
                if (!moved && t) editText(t.id);
              }}
              onPointerCancel={() => finish(true)}
            />
          )}
          {(o
            ? ["nw", "ne", "se", "sw"]
            : ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
          ).map((handle) => (
            <button
              key={handle}
              aria-label={
                handle === "se"
                  ? "Resize selected layer"
                  : `Resize ${handle} edge of selected layer`
              }
              className={`preview-handle handle-${handle}`}
              onPointerDown={(e) => begin(e, handle)}
              onPointerMove={move}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
            />
          ))}
        </div>
      )}
    </>
  );
}
