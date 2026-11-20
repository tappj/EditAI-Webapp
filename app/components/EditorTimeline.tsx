"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { assignLanes, LANE_LIMITS } from "@/lib/editor/lanes";
import { createPortal } from "react-dom";
import { insertionIndex, type MediaDrop } from "@/lib/editor/placement";
import { Music, Plus, Subtitles, Layers, Film } from "lucide-react";
import {
  duration,
  segmentDuration,
  textTiming,
  type Document,
} from "@/lib/editor/model";
import { gestureEdit, type Track } from "@/lib/editor/timeline";

import { TimelineItem } from "./TimelineItem";
import { ClipFrames } from "./ClipFrames";
const TRACK_HEADER = 112;
function captionTracks(doc: Document) {
  const items = doc.texts
    .map((t) => ({ ...t, ...textTiming(doc, t) }))
    .filter((t) => t.start >= 0 && t.start < duration(doc) && t.end > t.start);
  const lanes = assignLanes(items, 7);
  return Array.from({ length: 7 }, (_, i) => ({
    name: "Text",
    lane: i,
    items: items.filter((t) => lanes.get(t.id) === i),
  })).filter((row) => row.items.length);
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
  playing: boolean;
  getPlaybackTime: () => number;
  onSourceDrop: (id: string, drop: MediaDrop) => void;
  onFilesDrop: (files: File[], drop: MediaDrop) => void;
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
  playing,
  getPlaybackTime,
  onSourceDrop,
  onFilesDrop,
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
  const [dragView, setDragView] = useState<{
    id: string;
    track: Track;
    x: number;
    y: number;
    width: number;
    height: number;
    marker: number;
    valid: boolean;
  } | null>(null);
  const [dropView, setDropView] = useState<MediaDrop | null>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    base: Document;
    track: Track;
    id: string;
    mode: "start" | "end" | "move";
    x: number;
    y: number;
    width: number;
    height: number;
    offset: number;
    scroll: number;
    latest: Document | null;
  } | null>(null);
  useEffect(() => {
    const cancel = () => {
      if (!gesture.current) return;
      gesture.current = null;
      setDraft(null);
      setTrimPreview(null);
      setDragView(null);
    };
    const key = (event: KeyboardEvent) => {
      if (["Delete", "Backspace", "Escape"].includes(event.key)) cancel();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
    };
  }, []);
  const shown = draft || doc,
    total = duration(draft && trimPreview ? trimPreview.base : shown);
  const textTracks = useMemo(() => captionTracks(shown), [shown]);
  const overlayLanes = useMemo(
    () => assignLanes(shown.overlays, 7),
    [shown.overlays],
  );
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
  const stationaryTime = playing ? 0 : playhead;
  useEffect(() => {
    let frame = 0;
    function paint(time: number) {
      const el = viewport.current;
      const x = TRACK_HEADER + Math.min(time, total) * pixels;
      if (cursor.current)
        cursor.current.style.transform = `translate3d(${x}px,0,0)`;
      if (
        el &&
        !gesture.current &&
        playing &&
        x > el.scrollLeft + el.clientWidth - 24
      )
        el.scrollLeft = Math.max(0, x - el.clientWidth + 24);
    }
    paint(playing ? getPlaybackTime() : stationaryTime);
    if (playing) {
      const tick = () => {
        paint(getPlaybackTime());
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(frame);
  }, [stationaryTime, pixels, playing, getPlaybackTime, total]);
  function dropAt(e: {
    clientX: number;
    target: EventTarget | null;
  }): MediaDrop {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-track]");
    const track = row?.dataset.track;
    const time = Math.max(
      0,
      Math.min(
        total,
        (e.clientX -
          content.current!.getBoundingClientRect().left -
          TRACK_HEADER) /
          pixels,
      ),
    );
    return {
      track: track === "audio" || track === "overlays" ? track : "segments",
      time,
    };
  }
  function markerTime(drop: MediaDrop) {
    return drop.track === "segments"
      ? doc.segments
          .slice(0, insertionIndex(doc, drop.time))
          .reduce((n, s) => n + segmentDuration(s), 0)
      : drop.time;
  }

  function seek(e: PointerEvent<HTMLElement>) {
    const rect = content.current!.getBoundingClientRect();
    const time = Math.max(
      0,
      Math.min(total, (e.clientX - rect.left - TRACK_HEADER) / pixels),
    );
    if (cursor.current)
      cursor.current.style.transform = `translate3d(${TRACK_HEADER + time * pixels}px,0,0)`;
    onSeek(time);
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
    if (mode === "move") seek(e);
    setTrimPreview(
      track === "segments" && mode !== "move" ? { base: doc, id } : null,
    );
    gesture.current = {
      base: doc,
      track,
      id,
      mode,
      x: e.clientX,
      y: e.clientY,
      width: Math.min(400, e.currentTarget.getBoundingClientRect().width),
      height: e.currentTarget.getBoundingClientRect().height,
      offset: Math.min(
        200,
        e.clientX - e.currentTarget.getBoundingClientRect().left,
      ),
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
    if (Math.hypot(dx, e.clientY - g.y) < 3) return;
    try {
      g.latest = gestureEdit(g.base, g.track, g.id, g.mode, dx / pixels);
      if (g.track !== "segments") {
        const baseLayer = g.base[g.track].find((x) => x.id === g.id)!;
        const timing =
          g.track === "texts"
            ? textTiming(g.base, baseLayer as Document["texts"][number])
            : baseLayer;
        const moved = g.latest[g.track].find((x) => x.id === g.id)!;
        const applied =
          g.mode === "end"
            ? moved.end - timing.end
            : moved.start - timing.start;
        if (
          Math.abs(dx / pixels - applied) * pixels > 24 ||
          Math.abs(e.clientY - g.y) > 28
        )
          g.latest = gestureEdit(
            g.base,
            g.track,
            g.id,
            g.mode,
            dx / pixels,
            true,
          );
      }
      if (g.mode === "move") {
        let marker = 0;
        if (g.track === "segments") {
          const index = g.latest.segments.findIndex((s) => s.id === g.id);
          const next = g.latest.segments[index + 1];
          marker = next
            ? g.base.segments
                .slice(
                  0,
                  g.base.segments.findIndex((s) => s.id === next.id),
                )
                .reduce((n, s) => n + segmentDuration(s), 0)
            : duration(g.base);
        } else marker = g.latest[g.track].find((x) => x.id === g.id)!.start;
        setDragView({
          id: g.id,
          track: g.track,
          x: Math.max(
            8,
            Math.min(
              innerWidth - g.width - 8,
              e.clientX - Math.min(g.offset, g.width / 2),
            ),
          ),
          y: Math.max(
            8,
            Math.min(innerHeight - g.height - 8, e.clientY - g.height / 2),
          ),
          width: g.width,
          height: g.height,
          marker,
          valid:
            e.clientX >= rect.left + TRACK_HEADER &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom,
        });
      } else setDraft(g.latest);
    } catch {
      /* Keep the last valid document during constrained drags. */
    }
  }
  function finish(e: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    gesture.current = null;
    setDraft(null);
    setDragView(null);
    setTrimPreview(null);
    const rect = viewport.current!.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left + (g?.mode === "move" ? TRACK_HEADER : 0) &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (
      g?.track === "texts" &&
      g.mode === "move" &&
      inside &&
      e.type !== "pointercancel" &&
      g.base === doc
    ) {
      const text = g.base.texts.find((t) => t.id === g.id)!;
      const rawStart =
        textTiming(g.base, text).start +
        (e.clientX - g.x + viewport.current!.scrollLeft - g.scroll) / pixels;
      if (rawStart >= duration(g.base)) {
        const next = structuredClone(g.base);
        next.texts = next.texts.filter((t) => t.id !== g.id);
        onChange(next);
        return;
      }
    }
    if (
      g?.latest &&
      g.base === doc &&
      e.type !== "pointercancel" &&
      (g.mode !== "move" || inside)
    )
      onChange(g.latest);
  }
  function cancelGesture() {
    gesture.current = null;
    setDraft(null);
    setTrimPreview(null);
    setDragView(null);
  }
  function clip(
    track: Track,
    id: string,
    name: string,
    start: number,
    end: number,
  ) {
    return (
      <TimelineItem
        key={id}
        track={track}
        id={id}
        name={name}
        start={start}
        end={end}
        doc={shown}
        baseDoc={doc}
        urls={urls}
        pixels={pixels}
        selected={selected}
        dragged={dragView?.id === id}
        onBegin={begin}
        onMove={move}
        onFinish={finish}
        onCancel={cancelGesture}
        onSelect={onSelect}
        onChange={onChange}
        onError={onError}
      />
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
      <div
        className="sequence-viewport"
        ref={viewport}
        onPointerDown={(e) => {
          if (
            (e.target as HTMLElement).closest(
              "button,.sequence-item,.track-label,.sequence-ruler,.sequence-playhead,input",
            )
          )
            return;
          seek(e);
        }}
        onDragOver={(e) => {
          if (
            !e.dataTransfer.types.includes("Files") &&
            !e.dataTransfer.types.includes("application/x-editai-source")
          )
            return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropView(dropAt(e));
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setDropView(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const drop = dropAt(e);
          setDropView(null);
          const id = e.dataTransfer.getData("application/x-editai-source");
          if (id) onSourceDrop(id, drop);
          else if (e.dataTransfer.files.length)
            onFilesDrop([...e.dataTransfer.files], drop);
        }}
      >
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
          {Array.from({ length: 7 }, (_, lane) => ({
            lane,
            items: shown.overlays.filter(
              (o) => overlayLanes.get(o.id) === lane,
            ),
          }))
            .filter((row) => row.items.length)
            .map((row) => (
              <div
                key={row.lane}
                data-track="overlays"
                className="sequence-row overlay-row"
              >
                <div className="track-label">
                  <Layers size={16} />
                  <span>Overlay {row.lane + 1}</span>
                </div>
                {row.items.map((o) =>
                  clip(
                    "overlays",
                    o.id,
                    shown.sources[o.sourceIndex].name,
                    o.start,
                    o.end,
                  ),
                )}
              </div>
            ))}
          <div
            data-track="segments"
            className="sequence-row main-row"
            aria-label="Video track"
          >
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
                offset = start + segmentDuration(s);
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
          {textTracks.length ? (
            textTracks.map((row, i) => (
              <div
                data-track="texts"
                className="sequence-row text-row"
                key={"text" + i}
              >
                <div className="track-label">
                  <Subtitles size={16} />
                  <span>{row.name}</span>
                </div>
                {row.items.map((t) =>
                  clip(
                    "texts",
                    t.id,
                    t.text || "Text",
                    t.start,
                    Math.min(t.end, total),
                  ),
                )}
              </div>
            ))
          ) : (
            <div data-track="texts" className="sequence-row text-row">
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
          {Array.from({ length: LANE_LIMITS.audio }, (_, i) => i)
            .filter(
              (lane) => lane === 0 || shown.audio.some((a) => a.lane === lane),
            )
            .map((lane) => (
              <div
                key={lane}
                data-track="audio"
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
            ref={cursor}
            className="sequence-playhead"
            data-testid="timeline-cursor"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              seek(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) seek(e);
            }}
            style={{ left: 0 }}
          >
            <span />
          </div>
          {(dropView || dragView?.valid) && (
            <div
              className="timeline-drop-marker"
              style={{
                left:
                  TRACK_HEADER +
                  (dropView ? markerTime(dropView) : dragView!.marker) * pixels,
              }}
            >
              <span>{dropView ? "Drop media" : "Drop here"}</span>
            </div>
          )}
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
      </div>{" "}
      {dragView &&
        createPortal(
          <div
            className={`clip-drag-ghost ${dragView.valid ? "" : "invalid"}`}
            style={{
              left: dragView.x,
              top: dragView.y,
              width: dragView.width,
              height: dragView.height,
            }}
          >
            {(() => {
              const item = doc[dragView.track].find(
                (x) => x.id === dragView.id,
              )!;
              if (!item) return null;
              if ("sourceIndex" in item) {
                const source = doc.sources[item.sourceIndex];
                return (
                  <>
                    {source.kind !== "audio" && (
                      <ClipFrames
                        library
                        url={urls[source.id]}
                        start={0}
                        end={source.duration}
                        image={source.kind === "image"}
                      />
                    )}
                    <strong>{source.name}</strong>
                  </>
                );
              }
              return <strong>{"text" in item ? item.text : "Layer"}</strong>;
            })()}
          </div>,
          document.body,
        )}
    </div>
  );
}
