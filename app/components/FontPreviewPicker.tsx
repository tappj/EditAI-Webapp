"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useState } from "react";
import { FONTS, FONT_SAMPLES } from "@/lib/editor/fonts";
export function FontPreviewPicker({
  font,
  onFont,
  weight,
  onWeight,
}: {
  font: string;
  weight: number;
  onWeight: (weight: number) => void;
  onFont: (font: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(12);
  const fonts = FONTS.filter((f) =>
    f.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="font-preview-picker">
      <h4>{uiText("Font previews")}</h4>
      {font === "TikTok Sans" && (
        <label>
          {uiText("Font weight")}
          <select
            aria-label={uiText("Font weight")}
            value={weight}
            onChange={(e) => onWeight(+e.target.value)}
          >
            {[
              [300, "Light"],
              [400, "Regular"],
              [500, "Medium"],
              [600, "Semibold"],
              [700, "Bold"],
              [800, "Extra bold"],
              [900, "Black"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      <input
        aria-label={uiText("Search fonts")}
        placeholder={uiText("Search fonts")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(12);
        }}
      />
      <div className="font-preview-grid" aria-label={uiText("Font previews")}>
        {fonts.slice(0, limit).map((f) => (
          <button
            key={f}
            title={uiText("Use {0}", { 0: f })}
            aria-label={uiText("Use {0} font", { 0: f })}
            aria-pressed={font === f}
            onClick={() => onFont(f)}
          >
            <span
              style={{
                fontFamily: `"${f}"`,
                fontWeight: f === "TikTok Sans" ? weight : 600,
              }}
            >
              {FONT_SAMPLES[f]}
            </span>
            <small>{f}</small>
          </button>
        ))}
      </div>
      {!fonts.length && <p>{uiText("No matching fonts.")}</p>}
      {fonts.length > limit && (
        <button className="text-button" onClick={() => setLimit((n) => n + 12)}>
          {uiText("Show more fonts")}
        </button>
      )}
    </div>
  );
}
