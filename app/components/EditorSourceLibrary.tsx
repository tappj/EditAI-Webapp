"use client";
import { useState } from "react";
import {
  AudioLines,
  Film,
  ImageIcon,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import type { Document } from "@/lib/editor/model";
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
  onAdd,
}: {
  doc: Document;
  urls: Record<string, string>;
  mode: "all" | "audio" | "overlay";
  onImport: () => void;
  onAdd: (index: number) => void;
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
              ? "Your audio"
              : mode === "overlay"
                ? "Overlay media"
                : "Source library"}
          </h3>
          <small>
            {sources.length} {sources.length === 1 ? "item" : "items"}
          </small>
        </div>
        <Button secondary onClick={onImport}>
          <Upload size={15} />
          {mode === "audio"
            ? "Import audio"
            : mode === "overlay"
              ? "Import overlay"
              : "Import"}
        </Button>
      </div>
      <label className="library-search">
        <Search size={15} />
        <input
          aria-label="Search source media"
          placeholder="Search your media"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {mode === "all" && (
        <div className="library-filters" aria-label="Media filters">
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
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="source-grid">
        {sources.map(({ source: s, index }) => {
          const used =
            doc.segments.some((c) => c.sourceIndex === index) ||
            doc.audio.some((c) => c.sourceIndex === index) ||
            doc.overlays.some((c) => c.sourceIndex === index);
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
              }}
            >
              <div className={`source-preview ${s.kind}`}>
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
                {used && <span className="source-used">In edit</span>}
                <button
                  className="source-append"
                  aria-label={"Append " + s.name}
                  title={
                    mode === "overlay"
                      ? "Add as overlay"
                      : s.kind === "audio" || mode === "audio"
                        ? "Add to audio track"
                        : "Append to video track"
                  }
                  onClick={() => onAdd(index)}
                >
                  <Plus size={17} />
                </button>
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
              ? "No matching media."
              : "Import media to add it to your edit."}
          </p>
          <button className="text-button" onClick={onImport}>
            <Plus size={14} />
            Import media
          </button>
        </div>
      )}
    </div>
  );
}
