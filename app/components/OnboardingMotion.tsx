"use client";

import { useEffect, useRef, useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "./ui";

// Presentation time stops while the component is offscreen or the tab is hidden.
export function usePresentationProgress(milliseconds: number, paused = false) {
  const target = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let visible = false;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    const tick = (now: number) => {
      frame = 0;
      if (previous)
        elapsed.current = Math.min(
          milliseconds,
          elapsed.current + now - previous,
        );
      previous = now;
      setProgress(elapsed.current / milliseconds);
      if (elapsed.current < milliseconds) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      stop();
      if (motion.matches) {
        elapsed.current = milliseconds;
        setProgress(1);
      } else if (
        visible &&
        !paused &&
        document.visibilityState === "visible" &&
        elapsed.current < milliseconds
      ) {
        frame = requestAnimationFrame(tick);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [milliseconds, paused]);
  return { target, progress };
}

// First frames after verified jumps in the app's bundled 30 fps edited sample.
export const sampleCuts = [0, 64 / 30, 150 / 30, 290 / 30, 410 / 30, 17.367];
const rawSeconds = 23.036;
const editedSeconds = sampleCuts.at(-1)!;
const gapSeconds = (rawSeconds - editedSeconds) / 4;
const pieces = sampleCuts.slice(1).flatMap((end, index) => {
  const retained = {
    key: "take-" + index,
    keep: true,
    duration: end - sampleCuts[index],
    index,
  };
  return index === 4
    ? [retained]
    : [
        retained,
        { key: "gap-" + index, keep: false, duration: gapSeconds, index },
      ];
});
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);

export function CutSimulation({
  progress,
  playback,
}: {
  progress: number;
  playback: number;
}) {
  const stage =
    progress < 0.12
      ? "Finding cuts"
      : progress < 0.44
        ? "Cutting retakes"
        : progress < 0.64
          ? "Removing pauses"
          : progress < 1
            ? "Joining clips"
            : "Cut ready";
  const sliced = progress >= 0.12;
  const removed = ease(clamp((progress - 0.44) / 0.2));
  const joined = ease(clamp((progress - 0.64) / 0.26));
  const scan = clamp((progress - 0.12) / 0.32);
  let rawStart = 0;
  let editedStart = 0;
  return (
    <div
      className="cut-simulation"
      data-stage={stage}
      aria-label="EditAI sample cut simulation"
    >
      <div className="cut-simulation-heading">
        <span>
          <Scissors size={17} aria-hidden="true" /> {stage}
        </span>
        <span>
          0:23 raw <span aria-hidden="true">→</span> 0:17 edited
        </span>
      </div>
      <div className="cut-simulation-ruler" aria-hidden="true">
        <span>0:00</span>
        <span>{joined === 1 ? "0:08" : "0:11"}</span>
        <span>{joined === 1 ? "0:17" : "0:23"}</span>
      </div>
      <div className="cut-simulation-track" aria-hidden="true">
        {pieces.map((piece) => {
          const start = rawStart / rawSeconds;
          rawStart += piece.duration;
          const joinedStart = editedStart / editedSeconds;
          if (piece.keep) editedStart += piece.duration;
          const left = 100 * (start + (joinedStart - start) * joined);
          const rawWidth = piece.duration / rawSeconds;
          const endWidth = piece.duration / editedSeconds;
          const width = 100 * (rawWidth + (endWidth - rawWidth) * joined);
          return (
            <span
              key={piece.key}
              className={piece.keep ? "cut-piece kept" : "cut-piece discarded"}
              style={{
                left: left + "%",
                width: `calc(${width}% - ${sliced ? 4 : 0}px)`,
                opacity: piece.keep ? 1 : 1 - removed,
                transform: `translateY(${piece.keep ? 0 : removed * 28}px)`,
                borderRadius: sliced ? 7 : 0,
              }}
            >
              <span>{piece.keep ? `Take ${piece.index + 1}` : "Retake"}</span>
            </span>
          );
        })}
        {progress >= 0.12 && progress < 0.44 && (
          <span
            className="cut-simulation-scissors"
            style={{ left: `calc(${scan * 100}% - 13px)` }}
          >
            <Scissors size={20} />
          </span>
        )}
        {progress === 1 && (
          <span
            className="cut-simulation-playhead"
            style={{ left: `calc(${clamp(playback) * 100}% - 1px)` }}
          />
        )}
      </div>
      <div className="cut-simulation-legend">
        <span>
          <i className="keep-swatch" />
          Good takes
        </span>
        <span>
          <i className="discard-swatch" />
          Retakes & pauses
        </span>
      </div>
    </div>
  );
}

const activities = [
  { key: "sleep", label: "Sleep", hours: 240 },
  { key: "work", label: "Work", hours: 160 },
  { key: "meals", label: "Meals", hours: 60 },
  { key: "care", label: "Personal care", hours: 30 },
  { key: "home", label: "Home & travel", hours: 60 },
];

export function EditingTimeEstimate({ hours }: { hours: number }) {
  const [run, setRun] = useState(0);
  return (
    <MonthlyTime
      key={run}
      hours={hours}
      replay={() => setRun((value) => value + 1)}
    />
  );
}

function MonthlyTime({ hours, replay }: { hours: number; replay: () => void }) {
  const { target, progress } = usePresentationProgress(1800);
  const eased = 1 - (1 - progress) ** 3;
  const displayed = Math.round(hours * eased);
  const revealed = Math.round(720 * eased);
  const editing = Math.min(170, Math.max(0, hours));
  const distribution = [
    { key: "editing", label: "Editing", hours: editing },
    ...activities,
    { key: "other", label: "Other time", hours: 170 - editing },
  ];
  const cells = distribution.flatMap((activity) =>
    Array.from({ length: activity.hours }, () => activity.key),
  );
  return (
    <div ref={target} className="monthly-time">
      <div
        className="studio-onboarding-estimate"
        aria-label={`About ${hours} hours a month spent editing`}
      >
        <strong aria-hidden="true">
          About <b>{displayed}</b> {hours === 1 ? "hour" : "hours"} a month
        </strong>
        <p>
          Estimated time you currently spend editing, based on your weekly
          answer.
        </p>
      </div>
      <div className="monthly-time-chart">
        <div
          className="studio-onboarding-hour-grid"
          role="img"
          aria-label={`Illustrative 720-hour month. Editing ${editing} hours. Sleep 240, work 160, meals 60, personal care 30, home and travel 60, other time ${170 - editing} hours.`}
        >
          <p>One square = one hour in a 30-day month</p>
          <div aria-hidden="true">
            {cells.map((activity, index) => (
              <span
                key={index}
                className={activity === "editing" ? "marked" : undefined}
                data-activity={activity}
                style={{
                  opacity: index < revealed ? 1 : 0.12,
                  transform: index < revealed ? "scale(1)" : "scale(0.65)",
                }}
              />
            ))}
          </div>
        </div>
        <ul
          className="monthly-time-legend"
          aria-label="Monthly time allocation"
        >
          {distribution.map((activity) => (
            <li key={activity.key} data-activity={activity.key}>
              <i aria-hidden="true" />
              <span>{activity.label}</span>
              <strong>{activity.hours}h</strong>
            </li>
          ))}
        </ul>
      </div>
      <Button secondary onClick={replay}>
        Replay animation
      </Button>
    </div>
  );
}
