"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { RotateCw, RotateCcw, Crop } from "lucide-react";
import {
  type Appearance,
  appearance,
  filters,
  cssFilter,
} from "@/lib/editor/model";
import { ADVANCED_ADJUSTMENTS, POSITIVE_ADJUSTMENTS } from "@/lib/editor/color";
import { Button, IconButton, Range } from "./ui";
import { ClipFrames } from "./ClipFrames";
export function AppearanceEditor({
  value,
  onChange,
  mode = "controls",
  url,
  image = false,
  sourceDuration = 1,
  onCrop,
  opacityControl,
  onResetAdjustments,
  onResetCrop,
}: {
  value: Appearance;
  onChange: (value: Appearance) => void;
  mode?: "filters" | "controls" | "adjustments";
  url?: string;
  image?: boolean;
  sourceDuration?: number;
  onCrop?: () => void;
  opacityControl?: React.ReactNode;
  onResetAdjustments?: () => void;
  onResetCrop?: () => void;
}) {
  const edit = (fn: (v: Appearance) => void) => {
    const next = structuredClone(value);
    fn(next);
    onChange(next);
  };
  if (mode === "filters")
    return (
      <>
        <section data-section="filter" className="appearance-section">
          <div className="section-heading">
            <h3>{uiText("Filter")}</h3>
            <IconButton
              label={uiText("Reset filter")}
              onClick={() =>
                edit((s) => {
                  const defaults = appearance();
                  s.filter = defaults.filter;
                  s.brightness = defaults.brightness;
                  s.contrast = defaults.contrast;
                  s.saturation = defaults.saturation;
                  s.warmth = defaults.warmth;
                  s.adjustments = {};
                })
              }
            >
              <RotateCcw size={15} />
            </IconButton>
          </div>
          <div className="filter-grid visual-filters">
            {filters.map((f) => (
              <button
                key={f}
                aria-pressed={value.filter === f}
                className={value.filter === f ? "selected" : ""}
                onClick={() =>
                  edit((s) => {
                    s.filter = f;
                  })
                }
              >
                <span
                  className="filter-preview"
                  style={{ filter: cssFilter({ ...appearance(), filter: f }) }}
                >
                  <ClipFrames
                    library
                    url={url}
                    start={0}
                    end={sourceDuration}
                    image={image}
                  />
                </span>
                <span>{uiText(f)}</span>
              </button>
            ))}
          </div>
        </section>
        <AppearanceEditor
          value={value}
          onChange={onChange}
          mode="adjustments"
          opacityControl={opacityControl}
          onResetAdjustments={onResetAdjustments}
        />
      </>
    );
  return (
    <>
      {mode === "adjustments" && (
        <section data-section="adjust" className="appearance-section">
          <details className="advanced-adjustments" open>
            <summary>{uiText("Adjust")}</summary>
            <div className="adjust-reset">
              <IconButton
                label={uiText("Reset adjustments")}
                onClick={
                  onResetAdjustments ??
                  (() =>
                    edit((s) => {
                      s.brightness = 0;
                      s.contrast = 1;
                      s.saturation = 1;
                      s.warmth = 0;
                      s.adjustments = {};
                    }))
                }
              >
                <RotateCcw size={15} />
              </IconButton>
            </div>
            {opacityControl}
            {(
              [
                ["Brightness", "brightness", -0.8, 0.8, 0],
                ["Contrast", "contrast", 0.2, 2, 1],
                ["Saturation", "saturation", 0, 2, 1],
              ] as const
            ).map(([label, key, min, max, reset]) => (
              <Range
                key={key}
                label={label}
                min={min}
                max={max}
                value={value[key]}
                resetValue={reset}
                onChange={(n) =>
                  edit((s) => {
                    s[key] = n;
                  })
                }
              />
            ))}
            {ADVANCED_ADJUSTMENTS.map((name) => (
              <Range
                key={name}
                label={name}
                min={POSITIVE_ADJUSTMENTS.has(name) ? 0 : -1}
                max={1}
                value={value.adjustments?.[name] || 0}
                resetValue={0}
                onChange={(n) =>
                  edit((s) => {
                    s.adjustments ??= {};
                    s.adjustments[name] = n;
                  })
                }
              />
            ))}
          </details>
        </section>
      )}
      {mode === "controls" && (
        <section data-section="crop" className="appearance-section">
          <div className="section-heading">
            <h3>{uiText("Crop")}</h3>
            <IconButton
              label={uiText("Reset crop")}
              onClick={
                onResetCrop ??
                (() =>
                  edit((s) => {
                    s.crop = { x: 0, y: 0, width: 1, height: 1 };
                    s.rotation = 0;
                    s.flipX = false;
                    s.flipY = false;
                  }))
              }
            >
              <RotateCcw size={15} />
            </IconButton>
          </div>
          <Button secondary onClick={onCrop}>
            <Crop size={15} />
            {uiText("Crop on video")}
          </Button>
          <div className="button-row">
            <button
              title={uiText("Rotate 90°")}
              onClick={() =>
                edit((s) => {
                  s.rotation = (s.rotation + 1) % 4;
                })
              }
            >
              <RotateCw size={15} />
              {uiText("Rotate 90°")}
            </button>
            <button
              onClick={() =>
                edit((s) => {
                  s.flipX = !s.flipX;
                })
              }
            >
              {uiText("Flip ↔")}
            </button>
            <button
              onClick={() =>
                edit((s) => {
                  s.flipY = !s.flipY;
                })
              }
            >
              {uiText("Flip ↕")}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
