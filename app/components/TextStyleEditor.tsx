"use client";
import { t as uiText } from "@/lib/editor/i18n";

import type { TextLayer } from "@/lib/editor/model";
import { ColorPicker } from "./ColorPicker";
import { Range } from "./ui";
export function TextStyleEditor({
  text,
  onChange,
}: {
  text: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
}) {
  return (
    <div className="text-style-editor">
      <fieldset className="text-appearance-group">
        <legend>{uiText("Text color")}</legend>
        <ColorPicker
          label={uiText("Text color")}
          value={text.color}
          onChange={(color) => onChange({ color })}
        />
        <Range
          label="Text opacity"
          resetValue={1}
          min={0}
          max={1}
          value={text.opacity ?? 1}
          onChange={(opacity) => onChange({ opacity })}
        />
      </fieldset>
      <fieldset className="text-appearance-group">
        <legend>{uiText("Text border")}</legend>
        <div className="text-style-choices">
          {[
            ["None", null],
            ["Black", "#000000"],
            ["White", "#ffffff"],
          ].map(([label, color]) => (
            <button
              key={uiText(label || "")}
              type="button"
              aria-label={uiText("Text border {0}", {
                0: label!.toLowerCase(),
              })}
              aria-pressed={
                color
                  ? text.outline && (text.outlineColor || "#000000") === color
                  : !text.outline
              }
              onClick={() =>
                onChange(
                  color
                    ? {
                        outline: true,
                        outlineColor: color,
                        outlineWidth: text.outlineWidth ?? 0.002,
                      }
                    : { outline: false },
                )
              }
            >
              {uiText(label || "")}
            </button>
          ))}
        </div>
        {text.outline && (
          <>
            <Range
              label="Outline width"
              displayScale={1080}
              unit="px"
              resetValue={0.002}
              min={0.0005}
              max={0.02}
              step={0.0005}
              value={text.outlineWidth ?? 0.00495}
              onChange={(outlineWidth) => onChange({ outlineWidth })}
            />
            <ColorPicker
              label={uiText("Outline color")}
              value={text.outlineColor || "#000000"}
              onChange={(outlineColor) => onChange({ outlineColor })}
            />
          </>
        )}
      </fieldset>
      <fieldset className="text-appearance-group">
        <legend>{uiText("Background box")}</legend>
        <div className="text-style-choices">
          {[
            ["None", "transparent"],
            ["Black", "#000000"],
            ["White", "#ffffff"],
          ].map(([label, background]) => (
            <button
              key={uiText(label || "")}
              type="button"
              aria-label={uiText("Text background {0}", {
                0: label.toLowerCase(),
              })}
              aria-pressed={text.background === background}
              onClick={() =>
                onChange({
                  background,
                  ...(background !== "transparent"
                    ? {
                        backgroundOpacity: text.backgroundOpacity ?? 0.9,
                        backgroundPadding: text.backgroundPadding ?? 0.012,
                        backgroundRadius: text.backgroundRadius ?? 0.01,
                      }
                    : {}),
                })
              }
            >
              {uiText(label || "")}
            </button>
          ))}
        </div>
        {text.background !== "transparent" && (
          <>
            <ColorPicker
              label={uiText("Background color")}
              value={text.background}
              onChange={(background) => onChange({ background })}
            />
            <Range
              label="Background opacity"
              resetValue={0.9}
              min={0}
              max={1}
              value={text.backgroundOpacity ?? 1}
              onChange={(backgroundOpacity) => onChange({ backgroundOpacity })}
            />
            <Range
              label="Background padding"
              displayScale={1080}
              unit="px"
              resetValue={0.012}
              min={0.002}
              max={0.03}
              step={0.001}
              value={text.backgroundPadding ?? 0.012}
              onChange={(backgroundPadding) => onChange({ backgroundPadding })}
            />
            <Range
              label="Background radius"
              displayScale={1080}
              unit="px"
              resetValue={0.01}
              min={0}
              max={0.05}
              step={0.001}
              value={text.backgroundRadius ?? 0}
              onChange={(backgroundRadius) => onChange({ backgroundRadius })}
            />
          </>
        )}
      </fieldset>
      <fieldset className="text-appearance-group">
        <legend>{uiText("Shadow")}</legend>
        <Range
          label="Shadow opacity"
          resetValue={0}
          min={0}
          max={1}
          value={text.shadowOpacity ?? 0}
          onChange={(shadowOpacity) => onChange({ shadowOpacity })}
        />
        {!!text.shadowOpacity && (
          <>
            <ColorPicker
              label={uiText("Shadow color")}
              value={text.shadowColor || "#000000"}
              onChange={(shadowColor) => onChange({ shadowColor })}
            />
            <Range
              label="Shadow blur"
              displayScale={1080}
              unit="px"
              resetValue={0.005}
              min={0}
              max={0.025}
              step={0.001}
              value={text.shadowBlur ?? 0.005}
              onChange={(shadowBlur) => onChange({ shadowBlur })}
            />
            <Range
              label="Shadow offset"
              displayScale={1080}
              unit="px"
              resetValue={0.003}
              min={-0.025}
              max={0.025}
              step={0.001}
              value={text.shadowOffset ?? 0.003}
              onChange={(shadowOffset) => onChange({ shadowOffset })}
            />
          </>
        )}
      </fieldset>
      <details className="text-timing-layout">
        <summary>{uiText("Layout")}</summary>
        <Range
          label="Text box width"
          resetValue={0.86}
          min={0.15}
          max={0.94}
          value={text.boxWidth ?? 0.86}
          onChange={(boxWidth) => onChange({ boxWidth })}
        />
        <label>
          {uiText("Alignment")}
          <select
            value={text.alignment || "center"}
            onChange={(e) =>
              onChange({ alignment: e.target.value as TextLayer["alignment"] })
            }
          >
            <option value="left">{uiText("Left")}</option>
            <option value="center">{uiText("Center")}</option>
            <option value="right">{uiText("Right")}</option>
          </select>
        </label>
        <Range
          label="Letter spacing"
          resetValue={0}
          min={-0.05}
          max={0.3}
          value={text.letterSpacing ?? 0}
          onChange={(letterSpacing) => onChange({ letterSpacing })}
        />
        <Range
          label="Line spacing"
          resetValue={0}
          min={0}
          max={1}
          value={text.lineSpacing ?? 0}
          onChange={(lineSpacing) => onChange({ lineSpacing })}
        />
      </details>
    </div>
  );
}
