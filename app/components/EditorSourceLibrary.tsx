"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useState } from "react";
import {
  AudioLines,
  Film,
  ImageIcon,
  Plus,
  Search,
  Upload,
  Trash2,
} from "lucide-react";
import type { Document } from "@/lib/editor/model";
import { sourceIsUsed } from "@/lib/editor/library";
import { Button } from "./ui";
import { ClipFrames } from "./ClipFrames";
function fileSize(bytes?: number) {
  if (bytes == null) return "Size unavailable";
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return bytes >= 1000 ? `${(bytes / 1000).toFixed(1)} KB` : `${bytes} B`;
}
export function EditorSourceLibrary({
  doc,
  urls,
  mode,
  onImport,
  onRemove,
  removing,
}: {
  doc: Document;
  urls: Record<string, string>;
  mode: "all" | "audio" | "overlay";
  onImport: () => void;
  onRemove: (index: number) => void;
  removing?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const sources = doc.sources
    .map((source, index) => ({ source, index }))
    .filter(({ source, index }) => {
      const audio =
        source.kind === "audio" ||
        doc.audio.some((a) => a.sourceIndex === index);
      return (
        (mode !== "audio" || audio) &&
        (mode !== "overlay" || source.kind !== "audio") &&
        (filter === "all" || source.kind === filter) &&
        source.name.toLowerCase().includes(query.toLowerCase())
      );
    });
  return (
    <div className="media-panel studio-library">
      <div className="library-heading">
        <div>
          <h3>
            {mode === "audio"
              ? uiText("Your audio")
              : mode === "overlay"
                ? uiText("Overlay media")
                : uiText("Source library")}
          </h3>
          <small>
            {sources.length}{" "}
            {sources.length === 1 ? uiText("item") : uiText("items")}
          </small>
        </div>
        <Button secondary onClick={onImport}>
          <Upload size={15} />
          {mode === "audio"
            ? uiText("Import audio")
            : mode === "overlay"
              ? uiText("Import overlay")
              : uiText("Import")}
        </Button>
      </div>
      <label className="library-search">
        <Search size={15} />
        <input
          aria-label={uiText("Search source media")}
          placeholder={uiText("Search your media")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {mode === "all" && (
        <div className="library-filters" aria-label={uiText("Media filters")}>
          {[
            ["all", "All"],
            ["video", "Videos"],
            ["image", "Images"],
            ["audio", "Audio"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {uiText(label)}
            </button>
          ))}
        </div>
      )}
      <div className="source-grid">
        {sources.map(({ source: s, index }) => {
          const used = sourceIsUsed(doc, index);
          const ratio =
            s.kind === "audio"
              ? 1
              : Math.max(0.65, Math.min(1.6, (s.width || 1) / (s.height || 1)));
          return (
            <div
              className="source-item source-card"
              key={s.id}
              draggable
              onDragStart={(e) => {
                if ((e.target as HTMLElement).closest("button")) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("application/x-editai-source", s.id);
                e.dataTransfer.setData(
                  "application/x-editai-kind-" + s.kind,
                  "1",
                );
              }}
            >
              <div
                className={`source-preview ${s.kind}`}
                style={{ aspectRatio: ratio }}
              >
                <button
                  className="source-remove"
                  aria-label={"Delete media " + s.name}
                  title={
                    used
                      ? uiText("Remove timeline clips first")
                      : uiText("Delete media")
                  }
                  disabled={used || removing}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 size={13} />
                </button>
                {s.kind !== "audio" ? (
                  <ClipFrames
                    library
                    url={urls[s.id]}
                    start={0}
                    end={s.duration}
                    image={s.kind === "image"}
                  />
                ) : (
                  <AudioLines size={34} />
                )}
                <span className="source-kind">
                  {s.kind === "audio" ? (
                    <AudioLines size={12} />
                  ) : s.kind === "image" ? (
                    <ImageIcon size={12} />
                  ) : (
                    <Film size={12} />
                  )}
                </span>
                <span className="source-duration">
                  {Math.floor(s.duration / 60)}:
                  {Math.floor(s.duration % 60)
                    .toString()
                    .padStart(2, "0")}
                </span>
              </div>
              <strong title={s.name}>{s.name}</strong>
              <small>{fileSize(s.bytes)}</small>
            </div>
          );
        })}
      </div>
      {!sources.length && (
        <div className="library-empty">
          <Film size={26} />
          <p>
            {query
              ? uiText("No matching media.")
              : uiText("Import media to add it to your edit.")}
          </p>
          <button className="text-button" onClick={onImport}>
            <Plus size={14} />
            {uiText("Import media")}
          </button>
        </div>
      )}
    </div>
  );
}
