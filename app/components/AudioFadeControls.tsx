"use client";
import { t as uiText } from "@/lib/editor/i18n";

import type { AudioFades } from "@/lib/editor/motion";
import { Range } from "./ui";

export function AudioFadeControls({
  value,
  onChange,
}: {
  value: AudioFades;
  onChange: (patch: AudioFades) => void;
}) {
  return (
    <div className="audio-fade-controls" data-section="audio-fades">
      <h4>{uiText("Audio fades")}</h4>
      <div className="audio-fade-fields">
        <Range
          label="Fade in"
          min={0}
          max={10}
          step={0.1}
          resetValue={0}
          value={value.fadeIn ?? 0}
          onChange={(fadeIn) => onChange({ fadeIn })}
        />
        <Range
          label="Fade out"
          min={0}
          max={10}
          step={0.1}
          resetValue={0}
          value={value.fadeOut ?? 0}
          onChange={(fadeOut) => onChange({ fadeOut })}
        />
      </div>
    </div>
  );
}
