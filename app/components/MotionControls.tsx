"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { MotionSettings } from "@/lib/editor/motion";
import { AnimationPicker } from "./AnimationPicker";
import { IconButton, Range } from "./ui";

export function MotionControls({
  value,
  onChange,
  media = false,
  preview,
}: {
  value: MotionSettings;
  onChange: (patch: MotionSettings) => void;
  media?: boolean;
  preview?: ReactNode;
}) {
  const [outgoing, setOutgoing] = useState(false);
  const incoming = value.animationIn || "none";
  const exiting = value.animationOut || "none";
  return (
    <details
      className="motion-controls appearance-section"
      data-section="animation"
    >
      <summary>
        {media ? uiText("Clip animation") : uiText("Text animation")}
        <span className="motion-reset">
          <IconButton
            label={
              media
                ? uiText("Reset clip animation")
                : uiText("Reset text animation")
            }
            onClick={() =>
              onChange({
                animationIn: "none",
                animationOut: "none",
                animationDuration: 0.35,
              })
            }
          >
            <RotateCcw size={15} />
          </IconButton>
        </span>
      </summary>
      <div
        className="motion-directions"
        aria-label={
          media
            ? uiText("Clip animation direction")
            : uiText("Text animation direction")
        }
      >
        <button
          type="button"
          aria-pressed={!outgoing}
          onClick={() => setOutgoing(false)}
        >
          <small>{uiText("IN")}</small>
          {uiText("Entrance ")}
          <span>{incoming}</span>
        </button>
        <button
          type="button"
          aria-pressed={outgoing}
          onClick={() => setOutgoing(true)}
        >
          <small>{uiText("OUT")}</small>
          {uiText("Exit ")}
          <span>{exiting}</span>
        </button>
      </div>
      <AnimationPicker
        key={String(outgoing)}
        label={
          media
            ? outgoing
              ? uiText("Clip exit animation")
              : uiText("Clip entrance animation")
            : outgoing
              ? uiText("Exit animation")
              : uiText("Animation")
        }
        value={outgoing ? exiting : incoming}
        outgoing={outgoing}
        duration={value.animationDuration ?? 0.35}
        media={media}
        preview={preview}
        onChange={(name) =>
          onChange(outgoing ? { animationOut: name } : { animationIn: name })
        }
      />
      <Range
        label={
          media
            ? uiText("Clip animation duration")
            : uiText("Animation duration")
        }
        value={value.animationDuration ?? 0.35}
        min={0.1}
        max={2}
        step={0.05}
        resetValue={0.35}
        onChange={(animationDuration) => onChange({ animationDuration })}
      />
    </details>
  );
}
