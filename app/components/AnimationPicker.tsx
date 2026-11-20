"use client";
const animations = ["none", "fade", "pop", "zoom", "slide", "typewriter"];
export function AnimationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="animation-picker">
      <legend>{label}</legend>
      <div>
        {animations.map((animation) => (
          <button
            key={animation}
            type="button"
            aria-label={`${label}: ${animation}`}
            aria-pressed={animation === value}
            onClick={() => onChange(animation)}
          >
            <span
              className={`animation-sample animation-${animation}`}
              aria-hidden="true"
            >
              Text
            </span>
            <span>{animation[0].toUpperCase() + animation.slice(1)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
