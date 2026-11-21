"use client";
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
  const [replay, setReplay] = useState(0);
  const incoming = value.animationIn || "none";
  const exiting = value.animationOut || "none";
  return (
    <details
      className="motion-controls appearance-section"
      data-section="animation"
    >
      <summary>{media ? "Clip animation" : "Text animation"}</summary>
      <div
        className="motion-directions"
        aria-label={
          media ? "Clip animation direction" : "Text animation direction"
        }
      >
        <button
          type="button"
          aria-pressed={!outgoing}
          onClick={() => setOutgoing(false)}
        >
          <small>IN</small>Entrance <span>{incoming}</span>
        </button>
        <button
          type="button"
          aria-pressed={outgoing}
          onClick={() => setOutgoing(true)}
        >
          <small>OUT</small>Exit <span>{exiting}</span>
        </button>
      </div>
      <AnimationPicker
        key={replay + String(outgoing)}
        label={
          media
            ? outgoing
              ? "Clip exit animation"
              : "Clip entrance animation"
            : outgoing
              ? "Exit animation"
              : "Animation"
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
        label={media ? "Clip animation duration" : "Animation duration"}
        value={value.animationDuration ?? 0.35}
        min={0.1}
        max={2}
        step={0.05}
        resetValue={0.35}
        onChange={(animationDuration) => onChange({ animationDuration })}
      />
      <div className="motion-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => setReplay((n) => n + 1)}
        >
          <RotateCcw size={13} />
          Replay previews
        </button>
        <IconButton
          label={media ? "Reset clip animation" : "Reset text animation"}
          onClick={() =>
            onChange({
              animationIn: "none",
              animationOut: "none",
              animationDuration: 0.35,
            })
          }
        >
          <RotateCcw size={13} />
        </IconButton>
      </div>
    </details>
  );
}
