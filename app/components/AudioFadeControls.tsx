"use client";
import {
  audioEnvelope,
  effectiveFades,
  type AudioFades,
} from "@/lib/editor/motion";
import { Range } from "./ui";

export function AudioFadeControls({
  value,
  duration,
  onChange,
}: {
  value: AudioFades;
  duration: number;
  onChange: (patch: AudioFades) => void;
}) {
  const fades = effectiveFades(value, duration);
  const points = Array.from(
    { length: 61 },
    (_, i) =>
      `${i * 5},${32 - audioEnvelope(value, (duration * i) / 60, duration) * 27}`,
  ).join(" ");
  return (
    <div className="audio-fade-controls" data-section="audio-fades">
      <h4>Audio fades</h4>
      <svg
        className="audio-fade-envelope"
        viewBox="0 0 300 38"
        role="img"
        aria-label={`Audio fade envelope: ${fades.fadeIn.toFixed(1)} seconds in, ${fades.fadeOut.toFixed(1)} seconds out`}
      >
        <path className="fade-baseline" d="M0 32H300" />
        <polygon points={`0,32 ${points} 300,32`} />
        <polyline points={points} />
      </svg>
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
      <p className="panel-note">
        Seconds. Long fades shorten together to fit this clip.
      </p>
    </div>
  );
}
