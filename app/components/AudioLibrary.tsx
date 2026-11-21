"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, Plus, Search } from "lucide-react";
import tracks from "@/lib/audio-library.json";

export function AudioLibrary({
  onAdd,
  onPreview,
  disabled,
}: {
  onAdd: (file: File) => Promise<void>;
  onPreview: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [preview, setPreview] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const player = useRef<HTMLAudioElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const audio = player.current;
    if (!audio || !preview) return;
    let cancelled = false;
    void audio.play().catch(() => {
      if (!cancelled) {
        setError("Couldn't play this preview. Try again.");
        setPreview(null);
      }
    });
    return () => {
      cancelled = true;
      audio.pause();
    };
  }, [preview]);
  const visible = tracks.filter(
    (track) =>
      (category === "All" || category === track.category) &&
      `${track.title} ${track.artist} ${track.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  async function add(track: (typeof tracks)[number]) {
    if (request.current || disabled) return;
    const controller = new AbortController();
    request.current = controller;
    setAdding(track.id);
    setError("");
    setPreview(null);
    try {
      const response = await fetch(track.url, { signal: controller.signal });
      if (!response.ok) throw Error("Couldn't load this track. Try again.");
      const blob = await response.blob();
      if (blob.size !== track.bytes)
        throw Error("This track didn't finish loading. Try again.");
      controller.signal.throwIfAborted();
      await onAdd(
        new File([blob], `${track.title} — ${track.artist}.m4a`, {
          type: "audio/mp4",
        }),
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Couldn't add this track. Try again.",
        );
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setAdding(null);
    }
  }
  return (
    <section className="audio-catalog" aria-label="Free music catalog">
      <p className="audio-catalog-note">
        Free music for personal and commercial edits. No attribution required.
      </p>
      <label className="library-search">
        <Search size={15} />
        <input
          aria-label="Search free music"
          placeholder="Search music"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div
        className="library-filters audio-categories"
        aria-label="Music categories"
      >
        {["All", "Chill", "Funk", "Electronic"].map((name) => (
          <button
            key={name}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="audio-result-count">
        {visible.length} {visible.length === 1 ? "track" : "tracks"}
      </p>
      {error && (
        <p role="alert" className="audio-catalog-error">
          {error}
        </p>
      )}
      <audio
        ref={player}
        src={tracks.find((t) => t.id === preview)?.url}
        preload="none"
        onEnded={() => setPreview(null)}
        onError={() => {
          if (preview) {
            setError("Couldn't play this preview. Try again.");
            setPreview(null);
          }
        }}
      />
      <div className="audio-track-list">
        {visible.map((track) => (
          <div className="audio-track" key={track.id}>
            <button
              className="audio-preview-button"
              aria-label={`${preview === track.id ? "Stop" : "Preview"} ${track.title}`}
              aria-pressed={preview === track.id}
              onClick={() => {
                setError("");
                if (preview !== track.id) onPreview();
                setPreview(preview === track.id ? null : track.id);
              }}
            >
              {preview === track.id ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="audio-track-info">
              <strong>{track.title}</strong>
              <span>
                {track.category} · {Math.floor(track.duration / 60)}:
                {Math.floor(track.duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
              <a
                href={track.source}
                target="_blank"
                rel="noreferrer"
                aria-label={`${track.title} by ${track.artist}, source and CC0 license`}
              >
                {track.artist} · CC0
              </a>
            </div>
            <button
              className="audio-add-button"
              aria-label={`Add ${track.title} to timeline`}
              title="Add to timeline"
              disabled={disabled || adding !== null}
              onClick={() => void add(track)}
            >
              {adding === track.id ? (
                <LoaderCircle className="audio-loading" size={17} />
              ) : (
                <Plus size={17} />
              )}
            </button>
          </div>
        ))}
      </div>
      {!visible.length && (
        <p className="library-empty">
          No matching music. Try another search or category.
        </p>
      )}
      <p className="audio-catalog-credit">
        Music by Holizna, released under{" "}
        <a
          href="https://creativecommons.org/publicdomain/zero/1.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC0
        </a>{" "}
        via OpenGameArt.
      </p>
    </section>
  );
}
