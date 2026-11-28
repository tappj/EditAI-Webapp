"use client";
import { t as uiText } from "@/lib/editor/i18n";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import { appearance, type Document, type Appearance } from "@/lib/editor/model";
import { displayCrop, sourceCrop } from "@/lib/editor/crop";
type Crop = Appearance["crop"];
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export function CropEditor({
  canvas,
  doc,
  track,
  id,
  onPreview,
  onApply,
  onCancel,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  doc: Document;
  track: "segments" | "overlays";
  id: string;
  onPreview: (d: Document) => void;
  onApply: (d: Document) => void;
  onCancel: () => void;
}) {
  const item = doc[track].find((x) => x.id === id)!;
  const [crop, setCrop] = useState<Crop>(() =>
    displayCrop(
      item.appearance?.crop || appearance().crop,
      item.appearance || appearance(),
    ),
  );
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  });
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    base: Crop;
    handle: string;
  } | null>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const measure = () => {
      const r = c.getBoundingClientRect(),
        p = c.parentElement!.getBoundingClientRect();
      const source = doc.sources[item.sourceIndex];
      let width: number, height: number, left: number, top: number;
      if (track === "overlays") {
        const o = item as Document["overlays"][number];
        width = o.width * r.width;
        height = o.height
          ? o.height * r.height
          : width *
            ((item.appearance?.rotation ?? 0) % 2
              ? source.width / source.height
              : source.height / source.width);
        left = r.left - p.left + o.x * r.width - width / 2;
        top = r.top - p.top + o.y * r.height - height / 2;
      } else {
        const rotated = (item.appearance?.rotation ?? 0) % 2;
        const sw = rotated ? source.height : source.width,
          sh = rotated ? source.width : source.height;
        const scale =
          doc.framing === "fill"
            ? Math.max(r.width / sw, r.height / sh)
            : Math.min(r.width / sw, r.height / sh);
        width = sw * scale;
        height = sh * scale;
        left = r.left - p.left + (r.width - width) / 2;
        top = r.top - p.top + (r.height - height) / 2;
      }
      setBounds({ left, top, width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(c);
    measure();
    return () => observer.disconnect();
  }, [canvas, doc, item, track]);
  useEffect(() => {
    const full = structuredClone(doc);
    const target = full[track].find((x) => x.id === id)!;
    target.appearance = {
      ...(target.appearance || appearance()),
      crop: { x: 0, y: 0, width: 1, height: 1 },
    };
    onPreview(full);
  }, [doc, id, onPreview, track]);
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    let scale = 1;
    const zoom = (factor: number) =>
      setCrop((c) => {
        const width = clamp(c.width * factor, 0.05, 1),
          height = clamp(c.height * factor, 0.05, 1);
        return {
          x: clamp(c.x + (c.width - width) / 2, 0, 1 - width),
          y: clamp(c.y + (c.height - height) / 2, 0, 1 - height),
          width,
          height,
        };
      });
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoom(Math.exp(e.deltaY * 0.005));
    };
    const start = (e: Event) => {
      e.preventDefault();
      scale = 1;
    };
    const change = (e: Event) => {
      e.preventDefault();
      const next = (e as Event & { scale: number }).scale;
      if (next > 0) {
        zoom(scale / next);
        scale = next;
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", start, { passive: false });
    el.addEventListener("gesturechange", change, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", start);
      el.removeEventListener("gesturechange", change);
    };
  }, []);
  function begin(e: PointerEvent<HTMLButtonElement>, handle: string) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, base: crop, handle };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const g = drag.current;
    if (!g) return;
    const rotation =
      track === "overlays"
        ? ((item as Document["overlays"][number]).rotation ?? 0)
        : 0;
    const radians = (rotation * Math.PI) / 180,
      cos = Math.cos(radians),
      sin = Math.sin(radians);
    const rawX = e.clientX - g.x,
      rawY = e.clientY - g.y;
    const dx = (rawX * cos + rawY * sin) / bounds.width,
      dy = (-rawX * sin + rawY * cos) / bounds.height;
    const c = { ...g.base };
    if (g.handle === "move") {
      c.x = clamp(c.x + dx, 0, 1 - c.width);
      c.y = clamp(c.y + dy, 0, 1 - c.height);
    } else {
      if (g.handle.includes("w")) {
        c.x = clamp(g.base.x + dx, 0, g.base.x + g.base.width - 0.05);
        c.width = g.base.x + g.base.width - c.x;
      }
      if (g.handle.includes("e"))
        c.width = clamp(g.base.width + dx, 0.05, 1 - c.x);
      if (g.handle.includes("n")) {
        c.y = clamp(g.base.y + dy, 0, g.base.y + g.base.height - 0.05);
        c.height = g.base.y + g.base.height - c.y;
      }
      if (g.handle.includes("s"))
        c.height = clamp(g.base.height + dy, 0.05, 1 - c.y);
    }
    setCrop(c);
  }
  return (
    <>
      <div
        className="crop-surface"
        ref={surface}
        style={{
          ...bounds,
          transform:
            track === "overlays"
              ? `rotate(${(item as Document["overlays"][number]).rotation ?? 0}deg)`
              : undefined,
        }}
      >
        <div
          className="crop-selection"
          style={{
            left: crop.x * bounds.width,
            top: crop.y * bounds.height,
            width: crop.width * bounds.width,
            height: crop.height * bounds.height,
          }}
        >
          <button
            className="preview-move"
            aria-label={uiText("Move crop")}
            onPointerDown={(e) => begin(e, "move")}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
          />
          {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => (
            <button
              key={h}
              aria-label={uiText("Crop {0} edge", { 0: h })}
              className={`preview-handle handle-${h}`}
              onPointerDown={(e) => begin(e, h)}
              onPointerMove={move}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            />
          ))}
        </div>
      </div>
      <div className="crop-actions">
        <button className="button secondary" onClick={onCancel}>
          {uiText("Cancel")}
        </button>
        <button
          className="button"
          onClick={() => {
            const next = structuredClone(doc);
            const target = next[track].find((x) => x.id === id)!;
            target.appearance ??= appearance();
            target.appearance.crop = sourceCrop(crop, target.appearance);
            onApply(next);
          }}
        >
          {uiText("Apply crop")}
        </button>
      </div>
    </>
  );
}
