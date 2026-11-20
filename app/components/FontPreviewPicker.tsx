"use client";
import { useState } from "react";
import { FONTS } from "@/lib/editor/fonts";
import type { TextLayer } from "@/lib/editor/model";
const styles: { name: string; values: Partial<TextLayer> }[] = [
  {
    name: "Clean",
    values: {
      color: "#ffffff",
      background: "transparent",
      outline: false,
      shadowOpacity: 0,
    },
  },
  {
    name: "Outlined",
    values: {
      color: "#ffffff",
      background: "transparent",
      outline: true,
      shadowOpacity: 0,
    },
  },
  {
    name: "Label",
    values: {
      color: "#ffffff",
      background: "#101216",
      outline: false,
      shadowOpacity: 0,
    },
  },
  {
    name: "Sunshine",
    values: {
      color: "#ffe66d",
      background: "transparent",
      outline: true,
      shadowOpacity: 0,
    },
  },
];
export function FontPreviewPicker({
  font,
  sample,
  onFont,
  onStyle,
}: {
  font: string;
  sample: string;
  onFont: (font: string) => void;
  onStyle: (values: Partial<TextLayer>) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(12);
  const fonts = [font, ...FONTS.filter((f) => f !== font)].filter((f) =>
    f.toLowerCase().includes(query.toLowerCase()),
  );
  const preview = sample.slice(0, 40) || "Your story";
  return (
    <div className="font-preview-picker">
      <h4>Font previews</h4>
      <input
        aria-label="Search fonts"
        placeholder="Search fonts"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(12);
        }}
      />
      <div className="font-preview-grid" aria-label="Font previews">
        {fonts.slice(0, limit).map((f) => (
          <button
            key={f}
            title={`Use ${f}`}
            aria-label={`Use ${f} font`}
            aria-pressed={font === f}
            onClick={() => onFont(f)}
          >
            <span style={{ fontFamily: `"${f}"`, fontWeight: 600 }}>
              {preview}
            </span>
            <small>{f}</small>
          </button>
        ))}
      </div>
      {!fonts.length && <p>No matching fonts.</p>}
      {fonts.length > limit && (
        <button className="text-button" onClick={() => setLimit((n) => n + 12)}>
          Show more fonts
        </button>
      )}
      <h4>Style previews</h4>
      <div className="font-preview-grid style-preview-grid">
        {styles.map(({ name, values }) => (
          <button
            key={name}
            aria-label={`Apply ${name} text style`}
            title={`Apply ${name} text style`}
            onClick={() => onStyle(values)}
          >
            <span
              style={{
                fontFamily: `"${font}"`,
                color: values.color,
                background: values.background,
                WebkitTextStroke: values.outline ? "0.5px #101216" : undefined,
                textShadow: values.outline ? "1px 1px #101216" : undefined,
              }}
            >
              {preview}
            </span>
            <small>{name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
