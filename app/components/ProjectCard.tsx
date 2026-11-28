"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";
import { Film, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "./ui";
import { duration, type Project } from "@/lib/editor/model";
import { desktop, mediaURL } from "@/lib/editor/desktop";
import { loadMedia } from "@/lib/editor/storage";
import { formatTime as time } from "@/lib/editor/time";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let unit = 0;
  let size = bytes / 1024;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(size)} ${units[unit]}`;
}

export function ProjectCard({
  p,
  open,
  remove,
  rename,
}: {
  p: Project;
  open: () => void;
  remove: () => void;
  rename?: () => void;
}) {
  const target = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState("");
  const [frameReady, setFrameReady] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);
  const { sources, segments } = p.document;
  const first = segments[0];
  const firstId = sources[first?.sourceIndex]?.id;
  const image = sources[first?.sourceIndex]?.kind === "image";
  const start = first
    ? first.start + Math.min(0.15, (first.end - first.start) / 2)
    : 0;
  const hasSizes =
    sources.length > 0 &&
    sources.every((source) => Number.isFinite(source.bytes));
  const sourceBytes = hasSizes
    ? sources.reduce((sum, source) => sum + source.bytes!, 0)
    : bytes;

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !firstId) return;
    let disposed = false;
    let url = "";
    void loadMedia(firstId)
      .catch(() => undefined)
      .then((media) => {
        if (disposed) return;
        url = media
          ? mediaURL(media)
          : desktop()
            ? ""
            : "/api/assets/" + firstId;
        setFrameReady(false);
        setPreview(url);
      });
    return () => {
      disposed = true;
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [visible, firstId]);

  useEffect(() => {
    if (!visible || hasSizes || !sources.length) return;
    const controller = new AbortController();
    void Promise.all(
      sources.map(async (source) => {
        if (Number.isFinite(source.bytes)) return source.bytes!;
        const media = await loadMedia(source.id).catch(() => undefined);
        if (media) return media.size;
        if (desktop()) throw Error("Media is unavailable.");
        const response = await fetch("/api/assets/" + source.id, {
          method: "HEAD",
          signal: controller.signal,
        });
        const length = response.headers.get("content-length");
        if (!response.ok || length === null)
          throw Error("Media size is unavailable.");
        return Number(length);
      }),
    ).then(
      (sizes) => {
        if (!controller.signal.aborted)
          setBytes(sizes.reduce((sum, size) => sum + size, 0));
      },
      () => {
        if (!controller.signal.aborted) setBytes(null);
      },
    );
    return () => controller.abort();
  }, [visible, hasSizes, sources]);

  return (
    <article className="project-card">
      <button
        ref={target}
        className="project-preview"
        onClick={open}
        aria-label={uiText("Open {0}", { 0: p.title })}
      >
        {!frameReady && <Film size={38} aria-hidden="true" />}
        {preview && image && (
          <img
            className="frame-ready"
            src={preview}
            alt=""
            onLoad={() => setFrameReady(true)}
          />
        )}
        {preview && !image && (
          <video
            key={preview + start}
            className={frameReady ? "frame-ready" : ""}
            src={preview}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onLoadedMetadata={(e) => {
              e.currentTarget.currentTime = start;
            }}
            onLoadedData={(e) => {
              if (!e.currentTarget.seeking) setFrameReady(true);
            }}
            onSeeked={() => setFrameReady(true)}
            onError={() => setFrameReady(false)}
          />
        )}
        <span>{time(duration(p.document))}</span>
      </button>
      <div className="project-card-meta">
        <div>
          <button className="project-card-title" onClick={open}>
            {p.title}
          </button>
          <small>
            {sourceBytes === null
              ? uiText("Size unavailable")
              : formatSize(sourceBytes)}{" "}
            · {new Date(p.updatedAt).toLocaleDateString()}
          </small>
        </div>
        <div className="project-card-actions">
          {rename && (
            <IconButton label={"Rename " + p.title} onClick={rename}>
              <Pencil size={15} />
            </IconButton>
          )}
          <IconButton label={"Delete " + p.title} onClick={remove}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}
