"use client";
import { RotateCcw, Layers, AudioLines } from "lucide-react";
import {
  appearance,
  type Document,
  type Segment,
  type Overlay,
  type AudioLayer,
} from "@/lib/editor/model";
import type { Track } from "@/lib/editor/timeline";
import { AppearanceEditor } from "./AppearanceEditor";
import { Button, IconButton, Range } from "./ui";
export function SelectedMediaInspector({
  doc,
  selection,
  urls,
  filter,
  onChange,
  onCrop,
  onExtract,
  onOverlay,
  onReplace,
  canvasSettings,
}: {
  canvasSettings?: React.ReactNode;
  doc: Document;
  selection: { track: Track; id: string };
  urls: Record<string, string>;
  filter: boolean;
  onChange: (d: Document) => void;
  onCrop: () => void;
  onExtract: () => void;
  onOverlay: () => void;
  onReplace: (id: string) => void;
}) {
  const item =
    selection.track === "audio"
      ? doc.audio.find((x) => x.id === selection.id)
      : selection.track === "overlays"
        ? doc.overlays.find((x) => x.id === selection.id)
        : doc.segments.find((x) => x.id === selection.id);
  if (!item)
    return <p className="panel-note">Select an item on the timeline.</p>;
  const source = doc.sources[item.sourceIndex];
  const update = (
    fn: (
      item: Partial<Segment & Overlay & AudioLayer> & {
        start: number;
        end: number;
      },
    ) => void,
  ) => {
    const next = structuredClone(doc);
    const item = next[
      selection.track as "segments" | "audio" | "overlays"
    ].find((x) => x.id === selection.id);
    if (item) {
      fn(item);
      onChange(next);
    }
  };
  const audio = selection.track === "audio",
    overlay = selection.track === "overlays";
  const a =
    "appearance" in item ? item.appearance || appearance() : appearance();
  if (filter)
    return audio ? (
      <p className="panel-note">Select video or an image to apply a filter.</p>
    ) : (
      <AppearanceEditor
        mode="filters"
        onResetAdjustments={() =>
          update((x) => {
            x.appearance = {
              ...a,
              brightness: 0,
              contrast: 1,
              saturation: 1,
              warmth: 0,
              adjustments: {},
              opacity: 1,
            };
            if (overlay) x.opacity = 1;
          })
        }
        opacityControl={
          <Range
            label="Opacity"
            min={0}
            max={1}
            resetValue={1}
            value={
              overlay
                ? (item as Document["overlays"][number]).opacity
                : a.opacity
            }
            onChange={(n) =>
              update((x) => {
                if (overlay) x.opacity = n;
                else {
                  x.appearance ??= appearance();
                  x.appearance.opacity = n;
                }
              })
            }
          />
        }
        value={a}
        onChange={(value) =>
          update((x) => {
            x.appearance = value;
          })
        }
        url={urls[source.id]}
        image={source.kind === "image"}
        sourceDuration={source.duration}
      />
    );
  return (
    <>
      <section
        data-section="playback"
        className="appearance-section selected-media-settings"
      >
        <div className="section-heading">
          <h3>{audio ? "Audio" : overlay ? "Overlay" : "Clip"}</h3>
          <IconButton
            label="Reset playback"
            onClick={() =>
              update((x) => {
                x.speed = 1;
                x.volume = overlay ? 0 : 1;
                if (audio) {
                  x.muted = false;
                  x.fadeIn = 0;
                  x.fadeOut = 0;
                }
              })
            }
          >
            <RotateCcw size={15} />
          </IconButton>
        </div>
        <p className="clip-name">{source.name}</p>
        {!audio && !overlay && (
          <Button
            secondary
            disabled={doc.segments.length < 2}
            onClick={onOverlay}
          >
            <Layers size={15} />
            Move to overlay
          </Button>
        )}
        {source.kind !== "image" && (
          <>
            <Range
              label={audio ? "Audio speed" : "Speed"}
              min={0.25}
              max={4}
              step={0.05}
              resetValue={1}
              value={item.speed ?? 1}
              onChange={(n) =>
                update((x) => {
                  if (audio || overlay)
                    x.end = Math.min(
                      doc.segments.reduce(
                        (sum, s) => sum + (s.end - s.start) / s.speed,
                        0,
                      ),
                      x.start + ((x.end - x.start) * (x.speed ?? 1)) / n,
                    );
                  x.speed = n;
                })
              }
            />
            <Range
              label="Volume"
              min={0}
              max={1}
              resetValue={overlay ? 0 : 1}
              value={item.volume ?? (overlay ? 0 : 1)}
              onChange={(n) =>
                update((x) => {
                  x.volume = n;
                })
              }
            />
          </>
        )}
        {!audio && !overlay && source.kind === "video" && (
          <Button secondary onClick={onExtract}>
            <AudioLines size={15} />
            Extract audio
          </Button>
        )}
        {audio && (
          <>
            <Button secondary onClick={() => onReplace(item.id)}>
              Replace audio
            </Button>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={(item as Document["audio"][number]).muted ?? false}
                onChange={(e) =>
                  update((x) => {
                    x.muted = e.target.checked;
                  })
                }
              />
              Mute audio
            </label>
            {(["fadeIn", "fadeOut"] as const).map((key) => (
              <Range
                key={key}
                label={key === "fadeIn" ? "Fade in" : "Fade out"}
                min={0}
                max={10}
                resetValue={0}
                value={(item as Document["audio"][number])[key]}
                onChange={(n) =>
                  update((x) => {
                    x[key] = n;
                  })
                }
              />
            ))}
          </>
        )}
      </section>
      {canvasSettings}
      {!audio && (
        <AppearanceEditor
          value={a}
          onChange={(value) =>
            update((x) => {
              x.appearance = value;
            })
          }
          onCrop={onCrop}
        />
      )}
    </>
  );
}
