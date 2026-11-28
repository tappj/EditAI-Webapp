"use client";
import { t as uiText } from "@/lib/editor/i18n";
import type { PointerEvent } from "react";
import type { Document } from "@/lib/editor/model";
import { effectiveFades } from "@/lib/editor/motion";
import { gestureEdit, type Track } from "@/lib/editor/timeline";
import { ClipFrames } from "./ClipFrames";
import { SourceWaveform } from "./SourceWaveform";
const TRACK_HEADER = 112;
const stamp = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
export function TimelineItem({
  track,
  id,
  name,
  start,
  end,
  doc,
  baseDoc,
  urls,
  pixels,
  selected,
  dragged,
  onBegin,
  onMove,
  onFinish,
  onCancel,
  onSelect,
  onChange,
  onError,
}: {
  track: Track;
  id: string;
  name: string;
  start: number;
  end: number;
  doc: Document;
  baseDoc: Document;
  urls: Record<string, string>;
  pixels: number;
  selected: string;
  dragged: boolean;
  onBegin: (
    e: PointerEvent<HTMLElement>,
    track: Track,
    id: string,
    mode: "start" | "end" | "move",
  ) => void;
  onMove: (e: PointerEvent<HTMLElement>) => void;
  onFinish: (e: PointerEvent<HTMLElement>) => void;
  onCancel: () => void;
  onSelect: (track: Track, id: string) => void;
  onChange: (doc: Document) => void;
  onError: (error: unknown) => void;
}) {
  return (
    <div
      key={id}
      role="button"
      tabIndex={0}
      aria-label={`${track === "segments" ? "Clip" : track} ${name}`}
      className={`sequence-item ${track === "segments" ? "timeline-clip" : "layer-clip"} ${selected === id ? "selected" : ""} ${dragged ? "drag-origin" : ""}`}
      style={{
        left: TRACK_HEADER + start * pixels,
        width: Math.max(3, (end - start) * pixels),
      }}
      onPointerDown={(e) => onBegin(e, track, id, "move")}
      onPointerMove={onMove}
      onPointerUp={onFinish}
      onPointerCancel={onCancel}
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
                baseDoc,
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
              ? doc.segments.find((x) => x.id === id)!
              : doc.overlays.find((x) => x.id === id)!;
          const source = doc.sources[s.sourceIndex];
          return (
            <ClipFrames
              url={urls[source.id]}
              duration={source.duration}
              speed={s.speed ?? 1}
              pixelsPerSecond={pixels}
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
          const item = doc.audio.find((x) => x.id === id)!;
          const source = doc.sources[item.sourceIndex];
          if (source.kind === "image") return null;
          const length = end - start;
          const fades = effectiveFades(item, length);
          const a = fades.fadeIn / length,
            b = fades.fadeOut / length;
          return (
            <div
              className="audio-fade-body"
              data-fade-in={fades.fadeIn}
              data-fade-out={fades.fadeOut}
            >
              <SourceWaveform
                url={urls[source.id]}
                duration={source.duration}
                bytes={source.bytes}
                start={item.sourceStart}
                end={item.sourceStart + length * (item.speed ?? 1)}
              />
              <svg
                className="audio-fade-overlay"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {a > 0 && (
                  <path
                    className="audio-fade-in"
                    d={`M0 0 H${a} C${a * 0.5} 0 ${a * 0.18} .35 0 1 Z`}
                  />
                )}
                {b > 0 && (
                  <path
                    className="audio-fade-out"
                    d={`M1 0 H${1 - b} C${1 - b * 0.5} 0 ${1 - b * 0.18} .35 1 1 Z`}
                  />
                )}
              </svg>
            </div>
          );
        })()}
      <strong>{name}</strong>
      <small>{stamp(end - start)}</small>
      {selected === id &&
        (["start", "end"] as const).map((edge) => (
          <button
            key={edge}
            className={`trim-grip ${edge}`}
            aria-label={uiText("Trim {0} of {1}", { 0: edge, 1: name })}
            onPointerDown={(e) => onBegin(e, track, id, edge)}
            onPointerMove={onMove}
            onPointerUp={onFinish}
            onPointerCancel={onCancel}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
              e.preventDefault();
              e.stopPropagation();
              try {
                onChange(
                  gestureEdit(
                    baseDoc,
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
