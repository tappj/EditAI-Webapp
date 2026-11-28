"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Play,
  RotateCcw,
  Send,
  Video,
  X,
} from "lucide-react";
import type { Source } from "@/lib/editor/model";
import { EditAIMascot } from "./EditAIMascot";
import "./upload-flow.css";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const bytes = (size: number) =>
  size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(size / 1024)} KB`;
/** The native app's review and processing screens share one presentation. */
export function UploadFlow({
  sources,
  urls,
  sizes,
  processing,
  preparing,
  stage,
  options,
  startedAt,
  activeIndex,
  error,
  onRetake,
  onSend,
  onClose,
  onBackground,
}: {
  sources: Source[];
  urls: Record<string, string>;
  sizes: number[];
  processing: boolean;
  preparing: boolean;
  stage: "transcribe" | "cut" | "captions" | "save" | "complete";
  options: { autoCut: boolean; addCaptions: boolean };
  startedAt?: number;
  activeIndex: number;
  error: string;
  onRetake: () => void;
  onSend: (options: { autoCut: boolean; addCaptions: boolean }) => void;
  onClose: () => void;
  onBackground: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const fallbackStart = useRef(Date.now());
  useEffect(() => {
    if (!processing) return;
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [processing]);
  const [autoCut, setAutoCut] = useState(true);
  const [addCaptions, setAddCaptions] = useState(false);
  const [selected, setSelected] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const exit = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    exit.current?.focus();
  }, []);
  const source =
    sources[Math.min(processing ? activeIndex : selected, sources.length - 1)];

  useEffect(() => {
    if (!processing) return;
    heading.current?.focus();
  }, [processing]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  async function toggle() {
    const player = video.current;
    if (!player || !ready) return;
    if (!player.paused) player.pause();
    else
      try {
        await player.play();
      } catch {
        setPlaybackError(
          "Couldn’t play this preview. Tap Retake to try again.",
        );
      }
  }

  const actions = [
    ...(options.autoCut || options.addCaptions
      ? [{ key: "transcribe", label: "Transcribing your footage" }]
      : []),
    ...(options.autoCut ? [{ key: "cut", label: "Cutting" }] : []),
    ...(options.addCaptions
      ? [{ key: "captions", label: "Adding captions" }]
      : []),
    { key: "save", label: "Saving your edit" },
  ];
  const stageOrder = ["transcribe", "cut", "captions", "save", "complete"];
  const stageIndex = stageOrder.indexOf(stage);
  if (processing)
    return (
      <section
        className="upload-processing"
        aria-label={uiText("Creating your first cut")}
      >
        <button
          className="upload-cancel"
          aria-label={uiText("Continue editing in background")}
          onClick={onBackground}
        >
          <ChevronDown size={20} /> {uiText(" Back")}
        </button>
        <button
          className="upload-stop"
          aria-label={uiText("Cancel editing and return")}
          onClick={onClose}
        >
          {uiText("Cancel")}
        </button>
        <div className="upload-processing-content">
          <h1 ref={heading} tabIndex={-1}>
            <span className="upload-action-heading">
              {uiText(
                actions.find((action) => action.key === stage)?.label ||
                  "Saving your edit",
              )}
            </span>
          </h1>
          <div className="upload-processing-image">
            <Video
              className="upload-thumbnail-fallback"
              size={44}
              aria-hidden="true"
            />
            <video
              key={source.id}
              src={urls[source.id]}
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            />
            <div className="upload-processing-shade" />
            <div className="upload-processing-mascot">
              <EditAIMascot working size={104} />
            </div>
            <svg className="upload-image-orbit" aria-hidden="true">
              <defs>
                <linearGradient id="upload-orbit-gradient">
                  <stop stopColor="#a8f0f0" />
                  <stop offset="1" stopColor="#c4e0ff" />
                </linearGradient>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                rx="24"
                pathLength="1"
              />
            </svg>
          </div>
          <div
            className="upload-activity"
            role="progressbar"
            aria-label={uiText(
              actions.find((action) => action.key === stage)?.label ||
                "Saving your edit",
            )}
          >
            <span aria-hidden="true" />
          </div>
          <p className="upload-elapsed">
            {uiText("Elapsed {0}", {
              0: clock(
                Math.max(
                  0,
                  (now - (startedAt || fallbackStart.current)) / 1000,
                ),
              ),
            })}
          </p>
          {actions.some(
            (action) => stageOrder.indexOf(action.key) < stageIndex,
          ) && (
            <p className="upload-completed-tasks">
              {uiText("{0} of {1} tasks complete", {
                0: actions.filter(
                  (action) => stageOrder.indexOf(action.key) < stageIndex,
                ).length,
                1: actions.length,
              })}
            </p>
          )}
          <ul
            className="upload-task-list"
            aria-label={uiText("Creating your first cut")}
          >
            {actions
              .filter((action) => stageOrder.indexOf(action.key) <= stageIndex)
              .map((action) => {
                const done = stageOrder.indexOf(action.key) < stageIndex;
                return (
                  <li
                    key={action.key}
                    data-stage={action.key}
                    data-complete={done}
                  >
                    <span aria-hidden="true">
                      {done ? (
                        <Check size={15} />
                      ) : (
                        <span className="upload-loading-dots">•••</span>
                      )}
                    </span>
                    {uiText(action.label)}
                  </li>
                );
              })}
          </ul>
          {sources.length > 1 && stage === "transcribe" && (
            <p className="upload-clip-count">
              {uiText("Video ")}
              {activeIndex + 1} {uiText(" of ")}
              {sources.length}
            </p>
          )}
        </div>
      </section>
    );

  return (
    <section
      className="upload-review"
      aria-label={uiText("Preview your upload")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="upload-review-header">
        <button
          ref={exit}
          className="upload-review-exit"
          aria-label={uiText("Exit upload")}
          onClick={onClose}
        >
          <X size={25} />
        </button>
      </div>
      <div className="upload-review-content">
        <h1>
          {sources.length > 1
            ? uiText("Preview your videos")
            : uiText("Preview your video")}
        </h1>
        <div
          className="upload-review-player"
          style={{
            aspectRatio: source.width / source.height || 9 / 16,
            width: `min(${source.width >= source.height ? 480 : 240}px, 100%, ${42 * (source.width / source.height || 9 / 16)}dvh)`,
          }}
        >
          <video
            key={source.id}
            ref={video}
            src={urls[source.id]}
            playsInline
            preload="auto"
            aria-label={uiText("Video {0} of {1} preview", {
              0: selected + 1,
              1: sources.length,
            })}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                void toggle();
              }
            }}
            onClick={() => void toggle()}
            onCanPlay={() => setReady(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => {
              setReady(false);
              setPlaybackError(
                "Couldn’t play this preview. Tap Retake to try again.",
              );
            }}
          />
          {preparing && (
            <div className="upload-review-preparing" role="status">
              <span className="upload-preparing-wheel" />
              {uiText("Preparing your videos")}
              <p>{uiText("Preparing playback may take a moment.")}</p>
            </div>
          )}
          {!playing && (
            <button
              className="upload-review-play"
              aria-label={uiText("Play upload preview")}
              disabled={!ready}
              onClick={() => void toggle()}
            >
              <Play size={28} fill="currentColor" />
            </button>
          )}
        </div>
        <span className="upload-review-info">
          {clock(source.duration)} · {bytes(sizes[selected])}
        </span>
        <div className="upload-review-footer">
          {sources.length > 1 && (
            <>
              <div
                className="upload-review-clips"
                role="group"
                aria-label={uiText("Uploaded videos")}
              >
                {sources.map((clip, index) => (
                  <button
                    key={clip.id}
                    disabled={preparing}
                    aria-pressed={selected === index}
                    onClick={() => {
                      if (selected === index) return;
                      video.current?.pause();
                      setReady(false);
                      setPlaying(false);
                      setPlaybackError("");
                      setSelected(index);
                    }}
                  >
                    {uiText("Video ")}
                    {index + 1}
                  </button>
                ))}
              </div>
            </>
          )}
          {(error || playbackError) && (
            <p className="upload-review-error" role="alert">
              {error || playbackError}
            </p>
          )}
          <div className="upload-review-actions">
            <button
              className="upload-retake"
              disabled={preparing}
              onClick={onRetake}
            >
              <RotateCcw size={18} /> {uiText(" Retake")}
            </button>
            <button
              className="upload-send"
              disabled={preparing || !ready || !!error || !!playbackError}
              onClick={() => {
                video.current?.pause();
                onSend({ autoCut, addCaptions });
              }}
            >
              <Send size={18} fill="currentColor" /> {uiText(" Send")}
            </button>
          </div>
          <div
            className="upload-options"
            role="group"
            aria-label={uiText("Automatic editing options")}
          >
            <label className="checkbox">
              <span className="upload-option-control">
                <input
                  type="checkbox"
                  checked={autoCut}
                  onChange={(e) => setAutoCut(e.target.checked)}
                />
                <Check size={17} aria-hidden="true" />
              </span>
              {uiText("Auto Cut")}
            </label>
            <label className="checkbox">
              <span className="upload-option-control">
                <input
                  type="checkbox"
                  checked={addCaptions}
                  onChange={(e) => setAddCaptions(e.target.checked)}
                />
                <Check size={17} aria-hidden="true" />
              </span>
              {uiText("Add Captions")}
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
