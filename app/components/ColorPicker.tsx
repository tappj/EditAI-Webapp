"use client";
export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const color = /^#[a-f0-9]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="color-picker">
      <label>
        {label}
        <input
          aria-label={`Custom ${label.toLowerCase()}`}
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <input
        aria-label={`${label} hex`}
        spellCheck={false}
        maxLength={7}
        key={color}
        defaultValue={color}
        onBlur={(e) => {
          e.currentTarget.value = color;
        }}
        onChange={(e) => {
          const next = e.target.value;
          if (/^#?[a-f0-9]{6}$/i.test(next))
            onChange(next.startsWith("#") ? next : `#${next}`);
        }}
      />
    </div>
  );
}
