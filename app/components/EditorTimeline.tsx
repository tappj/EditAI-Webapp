"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Music, Plus, Subtitles, Layers } from "lucide-react";
import {
  duration,
  segmentDuration,
  textTiming,
  type Document,
} from "@/lib/editor/model";
import { gestureEdit, type Track } from "@/lib/editor/timeline";

import { ClipFrames } from "./ClipFrames";
const stamp = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
type Props = {
  urls: Record<string, string>;
  doc: Document;
  playhead: number;
  selected: string;
  onSeek: (time: number) => void;
  onSelect: (track: Track, id: string) => void;
  onChange: (doc: Document) => void;
  onAdd: () => void;
  onError: (error: unknown) => void;
};
export function EditorTimeline({
  urls,
  doc,
  playhead,
  selected,
  onSeek,
  onSelect,
  onChange,
  onAdd,
  onError,
}: Props) {
  const [zoom, setZoom] = useState(48);
  const [draft, setDraft] = useState<Document | null>(null);
  const [trimPreview, setTrimPreview] = useState<{
    base: Document;
    id: string;
  } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    base: Document;
    track: Track;
    id: string;
    mode: "start" | "end" | "move";
    x: number;
    scroll: number;
    latest: Document | null;
  } | null>(null);
  const shown = draft || doc,
    total = duration(shown);
  const pixels = zoom,
    width = Math.max(300, total * pixels);
  useEffect(() => {
    const el = viewport.current;
    if (!el || gesture.current) return;
    const x = playhead * pixels;
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 24)
      el.scrollLeft = Math.max(0, x - el.clientWidth / 3);
  }, [playhead, pixels]);
  function seek(e: PointerEvent<HTMLElement>) {
    const rect = content.current!.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(total, (e.clientX - rect.left) / pixels)));
  }
  function begin(
    e: PointerEvent<HTMLElement>,
    track: Track,
    id: string,
    mode: "start" | "end" | "move",
  ) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(track, id);
    setTrimPreview(
      track === "segments" && mode === "start" ? { base: doc, id } : null,
    );
    gesture.current = {
      base: doc,
      track,
      id,
      mode,
      x: e.clientX,
      scroll: viewport.current?.scrollLeft || 0,
      latest: null,
    };
  }
  function move(e: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    const el = viewport.current!;
    const rect = el.getBoundingClientRect();
    if (e.clientX > rect.right - 32) el.scrollLeft += 12;
    if (e.clientX < rect.left + 32) el.scrollLeft -= 12;
    const dx = e.clientX - g.x + el.scrollLeft - g.scroll;
    if (Math.abs(dx) < 3) return;
    try {
      g.latest = gestureEdit(g.base, g.track, g.id, g.mode, dx / pixels);
      setDraft(g.latest);
    } catch {
      /* Keep the last valid document during constrained drags. */
    }
  }
  function finish(e: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    gesture.current = null;
    setDraft(null);
    if (g?.latest && e.type !== "pointercancel") onChange(g.latest);
  }
  function clip(
    track: Track,
    id: string,
    name: string,
    start: number,
    end: number,
  ) {
    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        aria-label={`${track === "segments" ? "Clip" : track} ${name}`}
        className={`sequence-item ${track === "segments" ? "timeline-clip" : "layer-clip"} ${selected === id ? "selected" : ""}`}
        style={{
          left: start * pixels,
          width: Math.max(3, (end - start) * pixels),
        }}
        onPointerDown={(e) => begin(e, track, id, "move")}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={() => {
          gesture.current = null;
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(track, id);
          }
          if (e.altKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            try {
              onChange(
                gestureEdit(
                  doc,
                  track,
                  id,
                  "move",
                  e.key === "ArrowLeft" ? -0.1 : 0.1,
                ),
              );
            } catch (error) {
              onError(error);
            }
          }
        }}
      >
        {track === "segments" &&
          (() => {
            const s = shown.segments.find((x) => x.id === id)!;
            const source = shown.sources[s.sourceIndex];
            return (
              <ClipFrames
                url={urls[source.id]}
                start={s.start}
                end={s.end}
                image={source.kind === "image"}
              />
            );
          })()}
        <strong>{name}</strong>
        <small>{stamp(end - start)}</small>
        {(["start", "end"] as const).map((edge) => (
          <button
            key={edge}
            className={`trim-grip ${edge}`}
            aria-label={`Trim ${edge} of ${name}`}
            onPointerDown={(e) => begin(e, track, id, edge)}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={() => {
              gesture.current = null;
              setDraft(null);
            }}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
              e.preventDefault();
              e.stopPropagation();
              try {
                onChange(
                  gestureEdit(
                    doc,
                    track,
                    id,
                    edge,
                    e.key === "ArrowLeft" ? -0.1 : 0.1,
                  ),
                );
              } catch (error) {
                onError(error);
              }
            }}
          >
            <span />
          </button>
        ))}
      </div>
    );
  }
  const leftTrim = draft ? trimPreview : null;
  const offsets = (leftTrim?.base || shown).segments.reduce<number[]>(
    (a, s) => [...a, (a.at(-1) ?? 0) + segmentDuration(s)],
    [0],
  );
  const step = pixels < 20 ? 10 : pixels < 50 ? 5 : pixels < 100 ? 2 : 1;
  return (
    <div className="sequence-editor">
      <div className="sequence-options">
        <span>Drag edges to trim · drag clips to reorder · S to split</span>
        <label>
          Zoom{" "}
          <input
            aria-label="Timeline zoom"
            type="range"
            min="8"
            max="160"
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
          />
        </label>
      </div>
      <div className="sequence-viewport" ref={viewport}>
        <div
          className="sequence-content"
          ref={content}
          style={{ width: width + 54 }}
        >
          <div
            className="sequence-ruler"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              seek(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) seek(e);
            }}
          >
            {Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => (
              <span key={i} style={{ left: i * step * pixels }}>
                {stamp(i * step)}
              </span>
            ))}
          </div>
          <div className="sequence-row main-row" aria-label="Video track">
            {shown.segments.map((s, i) => {
              const original = leftTrim?.base.segments.find(
                (x) => x.id === s.id,
              );
              const start =
                  offsets[i] +
                  (leftTrim?.id === s.id && original
                    ? (s.start - original.start) / s.speed
                    : 0),
                offset = offsets[i + 1];
              return clip(
                "segments",
                s.id,
                shown.sources[s.sourceIndex].name,
                start,
                offset,
              );
            })}
            <button
              className="sequence-add"
              aria-label="Append media"
              style={{ left: total * pixels + 6 }}
              onClick={onAdd}
            >
              <Plus size={18} />
            </button>
          </div>
          {shown.texts.map((t) => {
            const timing = textTiming(shown, t);
            return timing.end > timing.start && timing.start >= 0 ? (
              <div key={t.id} className="sequence-row text-row">
                <Subtitles size={13} />
                {clip("texts", t.id, t.text, timing.start, timing.end)}
              </div>
            ) : null;
          })}
          {shown.overlays.map((o) => (
            <div key={o.id} className="sequence-row overlay-row">
              <Layers size={13} />
              {clip(
                "overlays",
                o.id,
                shown.sources[o.sourceIndex].name,
                o.start,
                o.end,
              )}
            </div>
          ))}
          {[0, 1, 2]
            .filter((lane) => shown.audio.some((a) => a.lane === lane))
            .map((lane) => (
              <div
                key={lane}
                className="sequence-row audio-row"
                aria-label={`Audio lane ${lane + 1}`}
              >
                <Music size={13} />
                {shown.audio
                  .filter((a) => a.lane === lane)
                  .map((a) =>
                    clip(
                      "audio",
                      a.id,
                      shown.sources[a.sourceIndex].name,
                      a.start,
                      a.end,
                    ),
                  )}
              </div>
            ))}
          <div
            className="sequence-playhead"
            data-testid="timeline-cursor"
            style={{ left: Math.min(playhead, total) * pixels }}
          >
            <span />
          </div>
          <input
            className="sequence-seek"
            style={{ width: total * pixels }}
            aria-label="Timeline playhead"
            type="range"
            min={0}
            max={total}
            step={0.01}
            value={Math.min(playhead, total)}
            onChange={(e) => onSeek(+e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
