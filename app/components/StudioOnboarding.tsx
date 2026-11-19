"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CircleHelp,
  Clock3,
  Dumbbell,
  Ellipsis,
  Film,
  GraduationCap,
  Heart,
  House,
  Monitor,
  Pause,
  Play,
  ShoppingCart,
  Sparkles,
  Store,
  Timer,
  Shirt,
  UserRound,
  Users,
  Utensils,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button, Wordmark } from "./ui";
import "./studio-onboarding.css";

const draftKey = "editai-studio-onboarding-v1";
const steps = [
  "welcome",
  "demo",
  "role",
  "niches",
  "frequency",
  "volume",
  "editingTime",
  "estimate",
  "ready",
  "account",
] as const;
type Step = (typeof steps)[number];
type Question = "role" | "niches" | "frequency" | "volume" | "editingTime";
type Draft = { step: Step; answers: Partial<Record<Question, string[]>> };
const emptyDraft: Draft = { step: "welcome", answers: {} };

const questions: Record<
  Question,
  { title: string; options: readonly string[] }
> = {
  role: {
    title: "Who’s behind the camera?",
    options: [
      "TikTok Shop seller",
      "TikTok Shop creator",
      "UGC creator",
      "Coach or educator",
      "Brand or business",
      "Agency (client work)",
      "Just me",
      "None of these",
    ],
  },
  niches: {
    title: "What niches do you create for?",
    options: [
      "Beauty",
      "Fashion",
      "Food & kitchen",
      "Fitness",
      "Home",
      "Tech & gadgets",
      "Toys & family",
      "Business",
      "Health",
      "Other",
    ],
  },
  frequency: {
    title: "How often do you post?",
    options: ["Every day", "A few times a week", "Weekly", "Just starting out"],
  },
  volume: {
    title: "How many videos a week?",
    options: [
      "1 to 2 a week",
      "3 to 5 a week",
      "6+ a week",
      "Just starting out",
    ],
  },
  editingTime: {
    title: "How long do you spend editing each week?",
    options: [
      "Under 1 hour",
      "1 to 3 hours",
      "3 to 6 hours",
      "6 to 10 hours",
      "10+ hours",
      "Not editing yet",
    ],
  },
};

const choiceIcons = {
  role: [
    Store,
    ShoppingCart,
    Camera,
    GraduationCap,
    Building2,
    Users,
    UserRound,
    CircleHelp,
  ],
  niches: [
    Sparkles,
    Shirt,
    Utensils,
    Dumbbell,
    House,
    Monitor,
    Users,
    BriefcaseBusiness,
    Heart,
    Ellipsis,
  ],
  frequency: [CalendarDays, CalendarDays, CalendarDays, Sparkles],
  volume: [Film, Film, Film, Sparkles],
  editingTime: [Timer, Timer, Timer, Timer, Timer, Clock3],
};

function displayTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function OnboardingDemo({
  edited,
  heading,
  next,
  back,
}: {
  edited: boolean;
  heading: React.RefObject<HTMLHeadingElement | null>;
  next: () => void;
  back: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const player = video.current;
    if (!player || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    player.muted = true;
    void player.play().catch(() => {});
  }, []);

  function togglePlayback() {
    const player = video.current;
    if (!player) return;
    if (player.paused) void player.play().catch(() => {});
    else player.pause();
  }
  function toggleSound() {
    const player = video.current;
    if (!player) return;
    player.muted = !player.muted;
    setMuted(player.muted);
  }

  return (
    <section className="studio-onboarding-demo" aria-label="EditAI onboarding">
      <video
        ref={video}
        playsInline
        preload="metadata"
        muted={muted}
        src={edited ? "/onboarding/edited.mp4" : "/onboarding/raw.mp4"}
        poster={edited ? "/onboarding/edited.jpg" : "/onboarding/raw.jpg"}
        aria-label={edited ? "Edited sample video" : "Raw sample video"}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="studio-demo-header">
        {edited && (
          <button
            className="studio-demo-control"
            onClick={back}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Wordmark />
        <div className="studio-demo-controls">
          <button
            className="studio-demo-control"
            aria-label={playing ? "Pause sample" : "Play sample"}
            onClick={togglePlayback}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            className="studio-demo-control"
            aria-label={muted ? "Unmute sample" : "Mute sample"}
            onClick={toggleSound}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="studio-demo-control" onClick={next}>
            Skip
          </button>
        </div>
      </div>
      <div className="studio-demo-footer">
        <h1 ref={heading} tabIndex={-1}>
          {edited ? "Keep the good takes." : "Film it messy."}
        </h1>
        <p>
          {edited
            ? "See the same footage after EditAI removes the retakes and dead space."
            : "Retakes, rambling, dead space."}
        </p>
        <div className="studio-demo-timeline">
          <progress
            aria-label="Sample playback progress"
            value={elapsed}
            max={duration || 1}
          />
          <div>
            <span>{edited ? "Edited sample" : "Raw footage"}</span>
            <span>
              {displayTime(elapsed)} / {displayTime(duration)}
            </span>
          </div>
        </div>
        <Button onClick={next}>
          {edited ? "Make it mine" : "See it happen"}
        </Button>
      </div>
    </section>
  );
}

function savedDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (!value || !steps.includes(value.step)) return emptyDraft;
    const answers: Draft["answers"] = {};
    for (const key of Object.keys(questions) as Question[]) {
      const selection = value.answers?.[key];
      if (Array.isArray(selection))
        answers[key] = selection.filter((option) =>
          questions[key].options.includes(option),
        );
    }
    return { step: value.step, answers };
  } catch {
    return emptyDraft;
  }
}

export function StudioOnboarding({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [restored, setRestored] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = draft.step;
  const index = steps.indexOf(step);
  const question = Object.hasOwn(questions, step) ? (step as Question) : null;
  const selection = question ? (draft.answers[question] ?? []) : [];
  const media = step === "welcome" || step === "demo";
  const edited = step === "demo";

  useEffect(() => {
    setDraft(savedDraft());
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {}
  }, [draft, restored]);
  useEffect(() => {
    if (restored && step !== "welcome") heading.current?.focus();
  }, [step, restored]);

  function move(offset: number) {
    setDraft((current) => ({
      ...current,
      step: steps[steps.indexOf(current.step) + offset] ?? current.step,
    }));
  }
  function select(key: Question, option: string) {
    setDraft((current) => {
      const selected = current.answers[key] ?? [];
      return {
        ...current,
        answers: {
          ...current.answers,
          [key]:
            key !== "niches"
              ? [option]
              : selected.includes(option)
                ? selected.filter((item) => item !== option)
                : [...selected, option],
        },
      };
    });
  }

  if (!restored)
    return (
      <div className="studio-onboarding" role="status">
        Opening EditAI…
      </div>
    );

  const editingIndex = questions.editingTime.options.indexOf(
    draft.answers.editingTime?.[0] ?? "",
  );
  const hours = Math.round(
    ([0.5, 2, 4.5, 8, 10, 0][editingIndex] ?? 0) * 4.345,
  );

  if (media)
    return (
      <OnboardingDemo
        key={step}
        edited={edited}
        heading={heading}
        next={() => move(1)}
        back={() => move(-1)}
      />
    );

  return (
    <section className="studio-onboarding" aria-label="EditAI onboarding">
      <div className="studio-onboarding-header">
        <button
          className="studio-onboarding-back"
          onClick={() => move(-1)}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <Wordmark />
        <span
          className="studio-onboarding-progress"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuenow={index + 1}
          aria-valuemax={steps.length}
        >
          {index + 1}/{steps.length}
        </span>
        {question && (
          <Button secondary onClick={() => move(1)}>
            Skip
          </Button>
        )}
      </div>
      {step === "account" ? (
        <>
          <h1 ref={heading} tabIndex={-1}>
            Save your progress.
          </h1>
          {children}
        </>
      ) : question ? (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {questions[question].title}
          </h1>
          <p className="studio-onboarding-instruction">
            {question === "niches"
              ? "Pick every niche that fits your content."
              : "Select one."}
          </p>
          <div
            className={
              question === "niches"
                ? "studio-onboarding-choices niche-choices"
                : "studio-onboarding-choices"
            }
            role="group"
            aria-label={questions[question].title}
          >
            {questions[question].options.map((option, index) => {
              const Icon = choiceIcons[question][index];
              const selected = selection.includes(option);
              return (
                <button
                  key={option}
                  aria-pressed={selected}
                  onClick={() => select(question, option)}
                >
                  <span
                    className="studio-onboarding-choice-icon"
                    aria-hidden="true"
                  >
                    <Icon size={23} />
                  </span>
                  {option}
                  {selected && (
                    <span
                      className="studio-onboarding-check"
                      aria-hidden="true"
                    >
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button onClick={() => move(1)} disabled={!selection.length}>
            Continue
          </Button>
        </>
      ) : step === "estimate" ? (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {hours > 0
              ? "Your editing time"
              : "Make your first edit a little easier."}
          </h1>
          {hours > 0 ? (
            <>
              <div className="studio-onboarding-estimate">
                <strong>
                  About <b>{hours}</b> {hours === 1 ? "hour" : "hours"} a month
                </strong>
                <p>
                  Estimated time you currently spend editing, based on your
                  weekly answer.
                </p>
              </div>
              <div className="studio-onboarding-hour-grid">
                <p>1 square = 1 hour this month.</p>
                <div aria-hidden="true">
                  {Array.from({ length: 720 }, (_, index) => (
                    <span
                      key={index}
                      className={index < hours ? "marked" : undefined}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <img
                className="studio-onboarding-mark"
                src="/brand/editai-icon-192.png"
                width="76"
                height="76"
                alt=""
              />
              <p className="studio-onboarding-instruction">
                Start with a rough cut and make it yours at your own pace.
              </p>
            </>
          )}
          <Button onClick={() => move(1)}>Build my studio</Button>
        </>
      ) : (
        <>
          <h1 ref={heading} tabIndex={-1}>
            Your studio is ready.
          </h1>
          <img
            className="studio-onboarding-mark"
            src="/brand/editai-icon-192.png"
            width="76"
            height="76"
            alt=""
          />
          <ol className="studio-onboarding-tutorial">
            <li>
              <span aria-hidden="true">1</span>
              <div>
                <strong>Upload your video</strong>
                <p>Start with one clip or bring in several takes.</p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">2</span>
              <div>
                <strong>Send it to EditAI</strong>
                <p>
                  Get an AI first cut when your AI connection has usage
                  available.
                </p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">3</span>
              <div>
                <strong>Make it yours</strong>
                <p>Fine-tune the edit, add captions and export.</p>
              </div>
            </li>
          </ol>
          <Button onClick={() => move(1)}>Continue to sign in</Button>
        </>
      )}
    </section>
  );
}

export function StudioAccount({
  title,
  signIn,
  onGoogle,
  children,
}: {
  title: string;
  signIn: boolean;
  onGoogle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="studio-account sign-in-card">
      <h2>{title}</h2>
      {signIn && (
        <>
          <p>
            Create or link a free Publik account to open EditAI and save your
            edits. A subscription is optional.
          </p>
          <Button onClick={onGoogle}>Continue with Google via Publik</Button>
          <p>Choose Google in the Publik sign-in window.</p>
        </>
      )}
      {children}
    </section>
  );
}
