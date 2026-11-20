"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Music, Plus, Subtitles, Layers, Film } from "lucide-react";
import {
  duration,
  segmentDuration,
  textTiming,
  type Document,
} from "@/lib/editor/model";
import { gestureEdit, type Track } from "@/lib/editor/timeline";

import { SourceWaveform } from "./SourceWaveform";
import { ClipFrames } from "./ClipFrames";
const TRACK_HEADER = 112;
function captionTracks(doc: Document) {
  const rows: {
    name: string;
    items: { id: string; text: string; start: number; end: number }[];
  }[] = [];
  for (const automatic of [true, false]) {
    const lanes: typeof rows = [];
    const items = doc.texts
      .filter((t) => !!t.anchor === automatic)
      .map((t) => ({ ...textTiming(doc, t), id: t.id, text: t.text }))
      .filter((t) => t.start >= 0 && t.end > t.start)
      .sort((a, b) => a.start - b.start);
    for (const item of items) {
      let lane = lanes.find((row) => row.items.at(-1)!.end <= item.start);
      if (!lane) {
        lane = { name: automatic ? "Captions" : "Text", items: [] };
        lanes.push(lane);
      }
      lane.items.push(item);
    }
    rows.push(...lanes);
  }
  return rows;
}
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
  onAddAudio: () => void;
  onAddOverlay: () => void;
  onAddText: () => void;
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
  onAddAudio,
  onAddOverlay,
  onAddText,
  onError,
}: Props) {
  const [zoom, setZoom] = useState(48);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
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
  const textTracks = useMemo(() => captionTracks(shown), [shown]);
  const firstDuration = useRef(duration(doc));
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > TRACK_HEADER + 80) {
        setZoom(
          Math.min(
            160,
            Math.max(
              8,
              (el.clientWidth - TRACK_HEADER - 60) / firstDuration.current,
            ),
          ),
        );
        observer.disconnect();
      }
    });
    observer.observe(el);
    let frame = 0;
    let gestureScale = 1;
    let nativeGesture = false;
    function zoomAt(ratio: number, clientX: number) {
      const old = zoomRef.current;
      const next = Math.min(160, Math.max(8, old * ratio));
      const localX = Math.max(
        TRACK_HEADER,
        clientX - el!.getBoundingClientRect().left,
      );
      const time = (el!.scrollLeft + localX - TRACK_HEADER) / old;
      zoomRef.current = next;
      setZoom(next);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el!.scrollLeft = Math.max(0, TRACK_HEADER + time * next - localX);
      });
    }
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (!nativeGesture)
        zoomAt(Math.exp(-event.deltaY * 0.008), event.clientX);
    };
    const startGesture = (event: Event) => {
      event.preventDefault();
      gestureScale = 1;
      nativeGesture = true;
    };
    const changeGesture = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale: number; clientX: number };
      if (gesture.scale > 0) {
        zoomAt(gesture.scale / gestureScale, gesture.clientX);
        gestureScale = gesture.scale;
      }
    };
    const endGesture = () => {
      nativeGesture = false;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", startGesture, { passive: false });
    el.addEventListener("gesturechange", changeGesture, { passive: false });
    el.addEventListener("gestureend", endGesture);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", startGesture);
      el.removeEventListener("gesturechange", changeGesture);
      el.removeEventListener("gestureend", endGesture);
    };
  }, []);
  const pixels = zoom,
    width = Math.max(300, total * pixels);
  useEffect(() => {
    const el = viewport.current;
    if (!el || gesture.current) return;
    const x = TRACK_HEADER + playhead * pixels;
    if (
      x < el.scrollLeft + TRACK_HEADER ||
      x > el.scrollLeft + el.clientWidth - 24
    )
      el.scrollLeft = Math.max(0, x - TRACK_HEADER - el.clientWidth / 3);
  }, [playhead, pixels]);
  function seek(e: PointerEvent<HTMLElement>) {
    const rect = content.current!.getBoundingClientRect();
    onSeek(
      Math.max(
        0,
        Math.min(total, (e.clientX - rect.left - TRACK_HEADER) / pixels),
      ),
    );
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
    if (e.clientX < rect.left + TRACK_HEADER + 24) el.scrollLeft -= 12;
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
          left: TRACK_HEADER + start * pixels,
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
        {(track === "segments" || track === "overlays") &&
          (() => {
            const s =
              track === "segments"
                ? shown.segments.find((x) => x.id === id)!
                : shown.overlays.find((x) => x.id === id)!;
            const source = shown.sources[s.sourceIndex];
            return (
              <ClipFrames
                url={urls[source.id]}
                start={"sourceStart" in s ? s.sourceStart : s.start}
                end={
                  "sourceStart" in s
                    ? s.sourceStart + (s.end - s.start) * (s.speed ?? 1)
                    : s.end
                }
                image={source.kind === "image"}
              />
            );
          })()}
        {track === "audio" &&
          (() => {
            const item = shown.audio.find((x) => x.id === id)!;
            const source = shown.sources[item.sourceIndex];
            if (source.kind === "image") return null;
            return (
              <SourceWaveform
                url={urls[source.id]}
                duration={source.duration}
                bytes={source.bytes}
                start={item.sourceStart}
                end={
                  item.sourceStart + (item.end - item.start) * (item.speed ?? 1)
                }
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
        <button className="track-import text-button" onClick={onAddOverlay}>
          <Layers size={14} />
          Add overlay
        </button>
        <span>
          Pinch to zoom · drag edges to trim <kbd>S</kbd> Split
        </span>
      </div>
      <div className="sequence-viewport" ref={viewport}>
        <div
          className="sequence-content"
          ref={content}
          style={
            {
              width: width + TRACK_HEADER + 54,
              "--track-width": `${total * pixels}px`,
            } as React.CSSProperties
          }
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
              <span key={i} style={{ left: TRACK_HEADER + i * step * pixels }}>
                {stamp(i * step)}
              </span>
            ))}
          </div>
          {textTracks.length ? (
            textTracks.map((row, i) => (
              <div className="sequence-row text-row" key={"text" + i}>
                <div className="track-label">
                  <Subtitles size={16} />
                  <span>{row.name}</span>
                </div>
                {row.items.map((t) =>
                  clip("texts", t.id, t.text, t.start, t.end),
                )}
              </div>
            ))
          ) : (
            <div className="sequence-row text-row">
              <div className="track-label">
                <Subtitles size={16} />
                <span>Captions</span>
              </div>
              <button
                className="empty-track-action"
                style={{ left: TRACK_HEADER + 12 }}
                onClick={onAddText}
              >
                <Plus size={13} />
                Add text or captions
              </button>
            </div>
          )}
          <div className="sequence-row main-row" aria-label="Video track">
            <div className="track-label">
              <Film size={16} />
              <span>
                Video<small>{shown.segments.length} clips</small>
              </span>
            </div>
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
              title="Append media"
              style={{ left: TRACK_HEADER + total * pixels + 6 }}
              onClick={onAdd}
            >
              <Plus size={18} />
            </button>
          </div>
          {shown.overlays.map((o) => (
            <div key={o.id} className="sequence-row overlay-row">
              <div className="track-label">
                <Layers size={16} />
                <span>Overlay</span>
              </div>
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
            .filter(
              (lane) => lane === 0 || shown.audio.some((a) => a.lane === lane),
            )
            .map((lane) => (
              <div
                key={lane}
                className="sequence-row audio-row"
                aria-label={`Audio lane ${lane + 1}`}
              >
                <div className="track-label">
                  <Music size={16} />
                  <span>Audio {lane + 1}</span>
                </div>
                {!shown.audio.some((a) => a.lane === lane) && (
                  <button
                    className="empty-track-action"
                    aria-label="Add audio to timeline"
                    style={{ left: TRACK_HEADER + 12 }}
                    onClick={onAddAudio}
                  >
                    <Plus size={13} />
                    Add audio
                  </button>
                )}
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
            style={{ left: TRACK_HEADER + Math.min(playhead, total) * pixels }}
          >
            <span />
          </div>
          <input
            className="sequence-seek"
            style={{ left: TRACK_HEADER, width: total * pixels }}
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
