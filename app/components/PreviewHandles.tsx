"use client";
import { t as uiText } from "@/lib/editor/i18n";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import { Move } from "lucide-react";
import { flushSync } from "react-dom";
import { type Document, type TextLayer, textTiming } from "@/lib/editor/model";
import { appearance, type Appearance } from "@/lib/editor/model";
import { textLayout } from "@/lib/editor/text-layout";
import { overlayAspect } from "@/lib/editor/crop";
import {
  breaksResizeLock,
  normalizedDegrees,
  snapUpright,
} from "@/lib/editor/overlay-gesture";
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
  onSelect: (id: string, track: "overlays" | "texts") => void;
}) {
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [previewTextId, setPreviewTextId] = useState("");
  const [draft, setDraft] = useState<Document | null>(null);
  const [rotating, setRotating] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null,
  );
  const input = useRef<HTMLTextAreaElement>(null);
  const measureContext = useRef<CanvasRenderingContext2D | null>(null);
  const liveEdit = useRef<{ id: string; value: string } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    textId?: string;
    base: Document;
    origin: Document;
    handle: string;
    next: Document | null;
    center: { x: number; y: number };
    angle: number;
    mode: "resize" | "rotate";
    snapped: boolean;
    radius: number;
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
    t = d.texts.find((x) => x.id === previewTextId);

  const typingLayout = useMemo(() => {
    if (!editing || !t || !canvas.current) return null;
    const preview = canvas.current;
    const measure = preview.ownerDocument
      .createElement("canvas")
      .getContext("2d")!;
    const layout = textLayout(
      measure,
      { ...t, text: editing.value },
      preview.width,
      preview.height,
    );
    const scale = bounds.width / preview.width;
    return {
      ...layout,
      size: layout.size * scale,
      boxWidth: layout.boxWidth * scale,
      lineHeight: layout.lineHeight * scale,
      padding: layout.padding * scale,
    };
  }, [editing, t, canvas, bounds.width]);
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
    height?: number;
    sourceIndex?: number;
    appearance?: Appearance;
  }) {
    if ("text" in layer && canvas.current) {
      const preview = canvas.current;
      const ctx = (measureContext.current ??= preview.ownerDocument
        .createElement("canvas")
        .getContext("2d")!);
      const layout = textLayout(
        ctx,
        layer as TextLayer,
        preview.width,
        preview.height,
      );
      const scale = bounds.width / preview.width;
      const width = layout.boxWidth * layout.fit * scale;
      const height =
        (layout.lines.length * layout.lineHeight + layout.padding * 2) *
        layout.fit *
        scale;
      return {
        left: bounds.left + layer.x * bounds.width - width / 2,
        top: bounds.top + layer.y * bounds.height - height / 2,
        width,
        height,
      };
    }
    const width = layer.width ?? layer.boxWidth ?? 0.86;
    const source =
      layer.sourceIndex != null ? d.sources[layer.sourceIndex] : null;
    const height = layer.height
      ? layer.height * bounds.height
      : source
        ? width *
          bounds.width *
          overlayAspect(
            source.width,
            source.height,
            layer.appearance || appearance(),
          )
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
  function begin(
    e: PointerEvent<HTMLButtonElement>,
    handle: string,
    textId?: string,
  ) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const base = editing ? structuredClone(doc) : doc;
    if (editing) {
      const text = base.texts.find((x) => x.id === editing.id);
      if (text) text.text = editing.value;
      liveEdit.current = null;
      setEditing(null);
    }
    const rect = canvas.current!.getBoundingClientRect();
    const center = {
      x: rect.left + (o?.x ?? 0.5) * rect.width,
      y: rect.top + (o?.y ?? 0.5) * rect.height,
    };
    drag.current = {
      origin: doc,
      textId,
      x: e.clientX,
      y: e.clientY,
      base,
      handle,
      next: editing ? base : null,
      center,
      angle: Math.atan2(e.clientY - center.y, e.clientX - center.x),
      mode: "resize",
      snapped: false,
      radius: Math.hypot(e.clientX - center.x, e.clientY - center.y),
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const g = drag.current;
    if (!g) return;
    if (
      o &&
      g.mode === "resize" &&
      /^(nw|ne|sw|se)$/.test(g.handle) &&
      breaksResizeLock(g, g.center, { x: e.clientX, y: e.clientY })
    ) {
      // Continue from the last resize preview, without a size/angle jump. The
      // original snapshot remains the single undo/cancel boundary for the gesture.
      g.base = g.next || g.base;
      const layer = g.base.overlays.find((x) => x.id === id)!;
      const rect = canvas.current!.getBoundingClientRect();
      g.center = {
        x: rect.left + layer.x * rect.width,
        y: rect.top + layer.y * rect.height,
      };
      g.x = e.clientX;
      g.y = e.clientY;
      g.angle = Math.atan2(e.clientY - g.center.y, e.clientX - g.center.x);
      g.mode = "rotate";
      g.radius = Math.max(
        1,
        Math.hypot(e.clientX - g.center.x, e.clientY - g.center.y),
      );
      setRotating(true);
    }
    const next = structuredClone(g.base);
    const layer =
      next.overlays.find((x) => x.id === id) ||
      next.texts.find((x) => x.id === (g.textId ?? previewTextId));
    const original =
      g.base.overlays.find((x) => x.id === id) ||
      g.base.texts.find((x) => x.id === (g.textId ?? previewTextId));
    if (!layer || !original) return;
    const rawX = e.clientX - g.x,
      rawY = e.clientY - g.y;
    if (Math.hypot(rawX, rawY) < 3) return;
    const radians =
      "width" in original ? ((original.rotation ?? 0) * Math.PI) / 180 : 0;
    const cos = Math.cos(radians),
      sin = Math.sin(radians);
    const dx = (rawX * cos + rawY * sin) / bounds.width,
      dy = (-rawX * sin + rawY * cos) / bounds.height;
    if (g.mode === "rotate" && "width" in layer && "width" in original) {
      const angle = Math.atan2(e.clientY - g.center.y, e.clientX - g.center.x);
      const delta =
        (Math.atan2(Math.sin(angle - g.angle), Math.cos(angle - g.angle)) *
          180) /
        Math.PI;
      let degrees = (original.rotation ?? 0) + delta;
      if (e.shiftKey) degrees = Math.round(degrees / 15) * 15;
      const snap = snapUpright(degrees, g.snapped);
      layer.rotation = snap.angle;
      g.snapped = snap.snapped;
      const source = d.sources[original.sourceIndex];
      const height =
        original.height ??
        (original.width *
          bounds.width *
          overlayAspect(
            source.width,
            source.height,
            original.appearance || appearance(),
          )) /
          bounds.height;
      const scale = clamp(
        Math.hypot(e.clientX - g.center.x, e.clientY - g.center.y) / g.radius,
        Math.max(0.1 / original.width, 0.03 / height),
        Math.min(1 / original.width, 1 / height),
      );
      layer.width = original.width * scale;
      layer.height = height * scale;
    } else if (g.handle === "move") {
      layer.x = clamp(original.x + rawX / bounds.width, 0, 1);
      layer.y = clamp(original.y + rawY / bounds.height, 0, 1);
    } else if ("width" in layer && "width" in original) {
      const source = d.sources[original.sourceIndex],
        oldW = original.width,
        oldH =
          original.height ??
          (oldW *
            bounds.width *
            overlayAspect(
              source.width,
              source.height,
              original.appearance || appearance(),
            )) /
            bounds.height;
      const sx = g.handle.includes("w") ? -1 : 1,
        sy = g.handle.includes("n") ? -1 : 1;
      const hx = /[ew]/.test(g.handle),
        hy = /[ns]/.test(g.handle);
      if (hx && hy) {
        const scale = Math.max(
          0.1,
          Math.abs(dx / oldW) > Math.abs(dy / oldH)
            ? 1 + (sx * dx) / oldW
            : 1 + (sy * dy) / oldH,
        );
        layer.width = clamp(oldW * scale, 0.1, 1);
        layer.height = clamp(oldH * scale, 0.03, 1);
      } else {
        layer.width = hx ? clamp(oldW + sx * dx, 0.1, 1) : oldW;
        layer.height = hy ? clamp(oldH + sy * dy, 0.03, 1) : oldH;
      }
      const shiftX = ((layer.width - oldW) * sx * bounds.width) / 2;
      const shiftY = ((layer.height - oldH) * sy * bounds.height) / 2;
      layer.x = clamp(
        original.x + (shiftX * cos - shiftY * sin) / bounds.width,
        0,
        1,
      );
      layer.y = clamp(
        original.y + (shiftX * sin + shiftY * cos) / bounds.height,
        0,
        1,
      );
    } else if ("size" in layer && "size" in original) {
      const measured = geometry(original);
      const oldW = measured.width / bounds.width,
        oldH = measured.height / bounds.height;
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
  const finish = useCallback(
    (cancel = false) => {
      const g = drag.current;
      drag.current = null;
      setRotating(false);
      setDraft(null);
      if (g?.next && !cancel && g.origin === doc) onChange(g.next);
      else onPreview(doc);
    },
    [doc, onChange, onPreview],
  );
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drag.current) {
        event.preventDefault();
        finish(true);
      }
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [finish]);
  useEffect(() => {
    if (!rotating) return;
    document.documentElement.classList.add("preview-rotating");
    return () => document.documentElement.classList.remove("preview-rotating");
  }, [rotating]);
  useEffect(() => {
    const cancel = () => {
      if (drag.current) finish(true);
    };
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, [finish]);
  function editText(textId: string) {
    const text = d.texts.find((x) => x.id === textId);
    if (text) {
      setPreviewTextId(textId);
      onSelect(textId, "texts");
      liveEdit.current = { id: textId, value: text.text };
      setEditing(liveEdit.current);
    }
  }
  const commitEdit = useCallback(
    (cancel = false) => {
      const edit = liveEdit.current;
      if (!edit) return;
      liveEdit.current = null;
      const next = structuredClone(doc);
      const text = next.texts.find((x) => x.id === edit.id);
      if (!cancel && text) {
        text.text = edit.value;
        if (edit.value !== doc.texts.find((x) => x.id === edit.id)?.text)
          onChange(next);
        onPreview(next);
      } else onPreview(doc);
      setEditing(null);
    },
    [doc, onChange, onPreview],
  );

  useEffect(() => {
    if (previewTextId && id !== previewTextId) {
      commitEdit();
      // Synchronize this live editor with an external timeline/history selection.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewTextId("");
    }
  }, [id, previewTextId, commitEdit]);
  useEffect(() => {
    if (!previewTextId) return;
    const dismiss = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".preview-selection, .preview-text-hit")
      )
        return;
      // Commit before an outside timeline gesture reads its document snapshot.
      flushSync(() => {
        commitEdit();
        setPreviewTextId("");
      });
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("focusin", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("focusin", dismiss, true);
    };
  }, [previewTextId, commitEdit]);

  return (
    <>
      {d.overlays
        .filter((overlay) => time >= overlay.start && time < overlay.end)
        .map((overlay) => (
          <button
            key={overlay.id}
            className="preview-overlay-hit"
            aria-label={uiText("Select overlay on video: {0}", {
              0: d.sources[overlay.sourceIndex]?.name || "Overlay",
            })}
            style={{
              ...geometry(overlay),
              transform: `rotate(${overlay.rotation ?? 0}deg)`,
            }}
            onClick={() => {
              commitEdit();
              setPreviewTextId("");
              onSelect(overlay.id, "overlays");
            }}
          />
        ))}
      {d.texts
        .filter((text) => {
          const timing = textTiming(d, text);
          return time >= timing.start && time < timing.end;
        })
        .map((text) => (
          <button
            key={text.id}
            className="preview-text-hit"
            aria-label={uiText("Edit text on video: {0}", {
              0: text.text || "Text",
            })}
            style={geometry(text)}
            onPointerDown={(event) => {
              setPreviewTextId(text.id);
              onSelect(text.id, "texts");
              begin(event, "move", text.id);
            }}
            onPointerMove={move}
            onPointerUp={() => {
              const moved = drag.current?.next;
              finish();
              if (!moved) editText(text.id);
            }}
            onPointerCancel={() => finish(true)}
            onLostPointerCapture={() => {
              if (drag.current) finish(true);
            }}
            onClick={(event) => {
              if (event.detail === 0) editText(text.id);
            }}
          />
        ))}
      {visible && item && (
        <div
          className="preview-selection"
          data-layer={o ? "overlay" : "text"}
          data-transform-mode={rotating ? "rotate" : "resize"}
          style={{
            ...geometry(item),
            transform: o ? `rotate(${o.rotation ?? 0}deg)` : undefined,
          }}
        >
          {t && (
            <button
              className="preview-text-drag"
              aria-label={uiText("Drag to move")}
              title={uiText("Drag to move")}
              onPointerDown={(event) => begin(event, "move", t.id)}
              onPointerMove={move}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => {
                if (drag.current) finish(true);
              }}
            >
              <Move size={14} aria-hidden="true" />
            </button>
          )}
          {editing?.id === previewTextId ? (
            <textarea
              ref={input}
              className="preview-text-input"
              aria-label={uiText("Edit text on video")}
              placeholder={uiText("Text")}
              spellCheck={false}
              value={editing.value}
              style={{
                fontFamily: `"${t?.font || "TikTok Sans"}"`,
                fontWeight: t?.fontWeight ?? 600,
                fontOpticalSizing: "none",
                fontSize:
                  typingLayout?.size ?? (t?.size ?? 0.055) * bounds.width,
                width: typingLayout?.boxWidth,
                height: typingLayout
                  ? typingLayout.lines.length * typingLayout.lineHeight +
                    typingLayout.padding * 2
                  : undefined,
                padding: typingLayout?.padding,
                boxSizing: "border-box",
                lineHeight: typingLayout
                  ? `${typingLayout.lineHeight}px`
                  : undefined,
                textAlign: t?.alignment || "center",
                letterSpacing:
                  (t?.letterSpacing ?? 0) * (typingLayout?.size ?? 0),
                transform: `translate(-50%, -50%) scale(${typingLayout?.fit ?? 1})`,
              }}
              onChange={(e) => {
                const value = e.target.value;
                liveEdit.current = { ...editing, value };
                setEditing(liveEdit.current);
                const next = structuredClone(doc);
                const text = next.texts.find((x) => x.id === editing.id);
                if (text) {
                  text.text = value;
                  onPreview(next);
                }
              }}
              onBlur={(e) => {
                if (
                  !(e.relatedTarget as HTMLElement | null)?.closest(
                    ".preview-handle",
                  )
                )
                  commitEdit();
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Escape") {
                  e.preventDefault();
                  commitEdit(true);
                  setPreviewTextId("");
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commitEdit();
                }
              }}
            />
          ) : (
            <button
              aria-label={uiText("Move selected layer")}
              title={
                t
                  ? uiText("Drag to move; tap to edit text")
                  : uiText("Drag to move")
              }
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
          {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
            <button
              key={handle}
              aria-label={
                handle === "se"
                  ? uiText("Resize selected layer")
                  : `Resize ${handle} edge of selected layer`
              }
              className={`preview-handle handle-${handle}`}
              onPointerDown={(e) => begin(e, handle)}
              onPointerMove={move}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => {
                if (drag.current) finish(true);
              }}
              onKeyDown={(event) => {
                if (
                  !o ||
                  handle.length !== 2 ||
                  !["ArrowLeft", "ArrowRight", "Home"].includes(event.key)
                )
                  return;
                event.preventDefault();
                event.stopPropagation();
                const next = structuredClone(doc),
                  overlay = next.overlays.find((x) => x.id === o.id)!;
                overlay.rotation =
                  event.key === "Home"
                    ? 0
                    : normalizedDegrees(
                        (overlay.rotation ?? 0) +
                          (event.key === "ArrowLeft" ? -1 : 1) *
                            (event.shiftKey ? 15 : 5),
                      );
                onChange(next);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
