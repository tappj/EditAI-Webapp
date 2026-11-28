"use client";
import { t as uiText } from "@/lib/editor/i18n";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Button } from "./ui";
import { shortTime, timeSavings } from "@/lib/editor/time-savings";

// Presentation time stops while the component is offscreen or the tab is hidden.
export function usePresentationProgress(
  milliseconds: number,
  paused = false,
  run: string | number = 0,
) {
  const target = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const [state, setState] = useState({ run, progress: 0 });
  const previousRun = useRef(run);
  useEffect(() => {
    if (previousRun.current !== run) {
      elapsed.current = 0;
      previousRun.current = run;
    }
    const setProgress = (progress: number) => setState({ run, progress });
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
  }, [milliseconds, paused, run]);
  return { target, progress: state.run === run ? state.progress : 0 };
}

const activities = [
  { key: "sleep", label: "Sleep", hours: 240 },
  { key: "work", label: "Work", hours: 160 },
  { key: "meals", label: "Meals", hours: 60 },
  { key: "home", label: "Home & travel", hours: 60 },
];

export function EditingTimeEstimate({
  hours,
  videosPerWeek = 1,
  onContinue,
}: {
  hours: number;
  videosPerWeek?: number;
  onContinue: () => void;
}) {
  const [view, setView] = useState<"initial" | "savings">("initial");
  const reveal = usePresentationProgress(1800, view !== "initial");
  const transition = usePresentationProgress(1600, view === "initial", view);
  const root = useCallback(
    (node: HTMLDivElement | null) => {
      reveal.target.current = node;
      transition.target.current = node;
    },
    [reveal.target, transition.target],
  );
  const eased = 1 - (1 - reveal.progress) ** 3;
  const transitionEase = 1 - (1 - transition.progress) ** 3;
  const fraction = view === "savings" ? transitionEase : 0;
  const estimate = timeSavings(hours, videosPerWeek);
  const savedMinutes = Math.round(estimate.savedMinutes * fraction);
  const editingMinutes = estimate.originalMinutes - savedMinutes;
  const showingSavings = view === "savings";
  const distribution = [
    {
      key: "editing",
      label: view === "initial" ? "Editing" : "EditAI estimate",
      minutes: editingMinutes,
    },
    ...(view !== "initial" && (showingSavings || savedMinutes > 0)
      ? [{ key: "saved", label: uiText("Time back"), minutes: savedMinutes }]
      : []),
    ...activities.map((activity) => ({
      ...activity,
      minutes: activity.hours * 60,
    })),
    {
      key: "other",
      label: uiText("Other time"),
      minutes: (200 - estimate.editingHours) * 60,
    },
  ];
  const cells = useMemo(
    () => [
      ...Array.from({ length: estimate.editingHours }, () => "editing"),
      ...activities.flatMap((activity) =>
        Array.from({ length: activity.hours }, () => activity.key),
      ),
      ...Array.from({ length: 200 - estimate.editingHours }, () => "other"),
    ],
    [estimate.editingHours],
  );
  const revealed = view === "initial" ? Math.round(720 * eased) : 720;
  const busy = view !== "initial" && transition.progress < 1;
  return (
    <div
      ref={root}
      className="monthly-time"
      data-view={view}
      style={
        {
          "--editing-color": `rgb(${Math.round(229 - 121 * fraction)}, ${Math.round(138 + 49 * fraction)}, 147)`,
        } as CSSProperties
      }
    >
      <div
        className="studio-onboarding-estimate"
        aria-label={
          showingSavings
            ? `Estimated ${shortTime(savedMinutes)} back a month`
            : `About ${hours} hours a month spent editing`
        }
      >
        <strong aria-hidden="true">
          {view === "initial" ? (
            <>
              {uiText("About ")}
              <b>{Math.round(hours * eased)}</b>{" "}
              {hours === 1 ? uiText("hour") : uiText("hours")}{" "}
              {uiText(" a month")}
            </>
          ) : (
            <>
              <b>{shortTime(showingSavings ? savedMinutes : editingMinutes)}</b>{" "}
              {showingSavings ? uiText("back") : uiText("editing")}{" "}
              {uiText(" a month")}
            </>
          )}
        </strong>
      </div>
      <div className="monthly-time-chart">
        <div
          className="studio-onboarding-hour-grid"
          role="img"
          aria-label={uiText(
            "Illustrative 720-hour month. Editing {0}. Time back {1}. Sleep 240 hours, work 160, meals 60, home and travel 60, other time {2} hours.",
            {
              0: shortTime(editingMinutes),
              1: shortTime(savedMinutes),
              2: 200 - estimate.editingHours,
            },
          )}
        >
          <p>{uiText("1 square = 1 hour")}</p>
          <div aria-hidden="true">
            {cells.map((activity, index) => {
              const retained =
                activity === "editing"
                  ? Math.min(60, Math.max(0, editingMinutes - index * 60))
                  : 0;
              const reclaimed = activity === "editing" ? 60 - retained : 0;
              return (
                <span
                  key={index}
                  className={
                    activity === "editing" && retained > 0
                      ? "marked"
                      : undefined
                  }
                  data-activity={
                    activity === "editing" && retained === 0
                      ? "saved"
                      : activity
                  }
                  data-editing-minutes={
                    activity === "editing" ? retained : undefined
                  }
                  data-saved-minutes={
                    activity === "editing" ? reclaimed : undefined
                  }
                  style={{
                    opacity: index < revealed ? 1 : 0.12,
                    transform: index < revealed ? "scale(1)" : "scale(.65)",
                    ...(retained > 0 && reclaimed > 0
                      ? {
                          background: `linear-gradient(90deg, var(--editing-color) ${(retained / 60) * 100}%, var(--saved-color) ${(retained / 60) * 100}%)`,
                        }
                      : {}),
                  }}
                />
              );
            })}
          </div>
        </div>
        <ul
          className="monthly-time-legend"
          aria-label={uiText("Monthly time allocation")}
        >
          {distribution.map((activity) => (
            <li key={activity.key} data-activity={activity.key}>
              <i aria-hidden="true" />
              <span>{uiText(activity.label)}</span>
              <strong data-minutes={activity.minutes}>
                {shortTime(activity.minutes)}
              </strong>
            </li>
          ))}
        </ul>
      </div>
      <Button
        className="time-savings-button"
        disabled={busy}
        onClick={() => {
          if (showingSavings) {
            onContinue();
            return;
          }
          setView("savings");
          reveal.target.current?.scrollIntoView({
            block: "nearest",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          });
        }}
      >
        {showingSavings
          ? uiText("Build my studio")
          : uiText("Show how much time I will save")}
      </Button>
    </div>
  );
}
