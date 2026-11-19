"use client";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import { type Document, textTiming } from "@/lib/editor/model";
export function PreviewHandles({
  canvas,
  doc,
  id,
  time,
  onChange,
  onPreview,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  doc: Document;
  id: string;
  time: number;
  onChange: (d: Document) => void;
  onPreview: (d: Document) => void;
}) {
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [draft, setDraft] = useState<Document | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    base: Document;
    resize: boolean;
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
  const d = draft || doc;
  const o = d.overlays.find((x) => x.id === id),
    t = d.texts.find((x) => x.id === id);
  const item = o || t;
  const timing = t ? textTiming(d, t) : o;
  if (
    !item ||
    !timing ||
    time < timing.start ||
    time >= timing.end ||
    !bounds.width
  )
    return null;
  const width = o ? o.width : (t?.boxWidth ?? 0.7);
  const source = o ? d.sources[o.sourceIndex] : null;
  const height = source
    ? (width * bounds.width * source.height) / source.width
    : (t?.size ?? 0.055) * bounds.width * 2;
  function begin(e: PointerEvent<HTMLButtonElement>, resize: boolean) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      base: doc,
      resize,
      next: null,
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const g = drag.current;
    if (!g) return;
    const next = structuredClone(g.base),
      layer =
        next.overlays.find((x) => x.id === id) ||
        next.texts.find((x) => x.id === id)!;
    const original =
      g.base.overlays.find((x) => x.id === id) ||
      g.base.texts.find((x) => x.id === id)!;
    const dx = (e.clientX - g.x) / bounds.width,
      dy = (e.clientY - g.y) / bounds.height;
    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, n));
    if (g.resize) {
      if ("width" in layer && "width" in original)
        layer.width = clamp(original.width + dx * 2, 0.1, 1);
      else if ("size" in layer && "size" in original)
        layer.size = clamp(original.size + dx * 0.2, 0.01, 0.3);
    } else {
      layer.x = clamp(original.x + dx, 0, 1);
      layer.y = clamp(original.y + dy, 0, 1);
    }
    g.next = next;
    setDraft(next);
    onPreview(next);
  }
  function finish(cancel = false) {
    const g = drag.current;
    drag.current = null;
    setDraft(null);
    if (g?.next && !cancel) onChange(g.next);
    else onPreview(doc);
  }
  return (
    <div
      className="preview-selection"
      style={{
        left: bounds.left + item.x * bounds.width - (width * bounds.width) / 2,
        top: bounds.top + item.y * bounds.height - height / 2,
        width: width * bounds.width,
        height,
      }}
    >
      <button
        aria-label="Move selected layer"
        className="preview-move"
        onPointerDown={(e) => begin(e, false)}
        onPointerMove={move}
        onPointerUp={() => finish()}
        onPointerCancel={() => finish(true)}
      />
      <button
        aria-label="Resize selected layer"
        className="preview-resize"
        onPointerDown={(e) => begin(e, true)}
        onPointerMove={move}
        onPointerUp={() => finish()}
        onPointerCancel={() => finish(true)}
      />
    </div>
  );
}
