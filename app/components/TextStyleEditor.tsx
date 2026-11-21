"use client";
import type { TextLayer } from "@/lib/editor/model";
import { ColorPicker } from "./ColorPicker";
import { Range } from "./ui";
export function TextStyleEditor({
  text,
  timing,
  total,
  onChange,
}: {
  text: TextLayer;
  timing: { start: number; end: number };
  total: number;
  onChange: (patch: Partial<TextLayer>) => void;
}) {
  return (
    <details className="text-style-editor">
      <summary>Timing & advanced style</summary>
      <div className="timing-fields">
        <label>
          Start
          <input
            type="number"
            aria-label="Text start time"
            step={0.1}
            min={0}
            max={timing.end - 0.1}
            value={Number(timing.start.toFixed(2))}
            onChange={(e) =>
              onChange({
                start: +e.target.value,
                end: timing.end,
                anchor: undefined,
              })
            }
          />
        </label>
        <label>
          End
          <input
            type="number"
            aria-label="Text end time"
            step={0.1}
            min={timing.start + 0.1}
            max={total}
            value={Number(timing.end.toFixed(2))}
            onChange={(e) =>
              onChange({
                start: timing.start,
                end: +e.target.value,
                anchor: undefined,
              })
            }
          />
        </label>
      </div>
      <p className="panel-note">
        Changing timing pins this text to the timeline.
      </p>
      <Range
        label="Text opacity"
        resetValue={1}
        min={0}
        max={1}
        value={text.opacity ?? 1}
        onChange={(opacity) => onChange({ opacity })}
      />
      <Range
        label="Text box width"
        resetValue={0.86}
        min={0.15}
        max={0.94}
        value={text.boxWidth ?? 0.86}
        onChange={(boxWidth) => onChange({ boxWidth })}
      />
      <label>
        Alignment
        <select
          value={text.alignment || "center"}
          onChange={(e) =>
            onChange({ alignment: e.target.value as TextLayer["alignment"] })
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
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
      {text.outline && (
        <>
          <Range
            label="Outline width"
            resetValue={0.00495}
            min={0.0005}
            max={0.02}
            step={0.0005}
            value={text.outlineWidth ?? 0.00495}
            onChange={(outlineWidth) => onChange({ outlineWidth })}
          />
          <ColorPicker
            label="Outline color"
            value={text.outlineColor || "#000000"}
            onChange={(outlineColor) => onChange({ outlineColor })}
          />
        </>
      )}
      <label>
        Background
        <select
          value={
            text.background === "transparent"
              ? "transparent"
              : text.background === "#ffffff"
                ? "#ffffff"
                : "#000000"
          }
          onChange={(e) => onChange({ background: e.target.value })}
        >
          <option value="transparent">None</option>
          <option value="#000000">Black</option>
          <option value="#ffffff">White</option>
        </select>
      </label>
      {text.background !== "transparent" && (
        <>
          <ColorPicker
            label="Background color"
            value={text.background}
            onChange={(background) => onChange({ background })}
          />
          <Range
            label="Background opacity"
            resetValue={1}
            min={0}
            max={1}
            value={text.backgroundOpacity ?? 1}
            onChange={(backgroundOpacity) => onChange({ backgroundOpacity })}
          />
          <Range
            label="Background padding"
            resetValue={0.012}
            min={0.002}
            max={0.03}
            step={0.001}
            value={text.backgroundPadding ?? 0.012}
            onChange={(backgroundPadding) => onChange({ backgroundPadding })}
          />
          <Range
            label="Background radius"
            resetValue={0}
            min={0}
            max={0.05}
            step={0.001}
            value={text.backgroundRadius ?? 0}
            onChange={(backgroundRadius) => onChange({ backgroundRadius })}
          />
        </>
      )}
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
            label="Shadow color"
            value={text.shadowColor || "#000000"}
            onChange={(shadowColor) => onChange({ shadowColor })}
          />
          <Range
            label="Shadow blur"
            resetValue={0.005}
            min={0}
            max={0.025}
            step={0.001}
            value={text.shadowBlur ?? 0.005}
            onChange={(shadowBlur) => onChange({ shadowBlur })}
          />
          <Range
            label="Shadow offset"
            resetValue={0.003}
            min={-0.025}
            max={0.025}
            step={0.001}
            value={text.shadowOffset ?? 0.003}
            onChange={(shadowOffset) => onChange({ shadowOffset })}
          />
        </>
      )}
    </details>
  );
}
