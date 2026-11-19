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
  ShoppingCart,
  Sparkles,
  Store,
  Timer,
  Shirt,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import { Button } from "./ui";
import "./studio-onboarding.css";
import { EditingTimeEstimate } from "./OnboardingMotion";

const draftKey = "editai-studio-onboarding-v1";
const steps = [
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
const emptyDraft: Draft = { step: "role", answers: {} };

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

function savedDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (!value) return emptyDraft;
    // Old drafts can resume directly at the first question after demo removal.
    const step =
      value.step === "welcome" || value.step === "demo" ? "role" : value.step;
    if (!steps.includes(step)) return emptyDraft;
    const answers: Draft["answers"] = {};
    for (const key of Object.keys(questions) as Question[]) {
      const selection = value.answers?.[key];
      if (Array.isArray(selection))
        answers[key] = selection.filter((option) =>
          questions[key].options.includes(option),
        );
    }
    return { step, answers };
  } catch {
    return emptyDraft;
  }
}

export function StudioOnboarding({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [restored, setRestored] = useState(false);
  const [direction, setDirection] = useState("forward");
  const heading = useRef<HTMLHeadingElement>(null);
  const step = draft.step;
  const index = steps.indexOf(step);
  const question = Object.hasOwn(questions, step) ? (step as Question) : null;
  const selection = question ? (draft.answers[question] ?? []) : [];

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
    if (restored) heading.current?.focus({ preventScroll: true });
  }, [step, restored]);

  function feedback() {
    // Tactile feedback is optional; unsupported desktop hardware still gets
    // the same visual press response without sound or extra permissions.
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try {
        navigator.vibrate?.(8);
      } catch {}
    }
  }
  function move(offset: number) {
    feedback();
    setDirection(offset < 0 ? "backward" : "forward");
    setDraft((current) => ({
      ...current,
      step: steps[steps.indexOf(current.step) + offset] ?? current.step,
    }));
  }
  function select(key: Question, option: string) {
    feedback();
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

  return (
    <section className="studio-onboarding" aria-label="EditAI onboarding">
      <div className="studio-onboarding-header">
        <button
          className="studio-onboarding-back"
          onClick={() => move(-1)}
          aria-label="Back"
          disabled={index === 0}
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className="studio-onboarding-progress"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuenow={index + 1}
          aria-valuemax={steps.length}
        >
          {steps.map((item, position) => (
            <span
              key={item}
              className={position <= index ? "complete" : ""}
              aria-hidden="true"
            >
              <i />
            </span>
          ))}
        </div>
        {question && (
          <Button secondary onClick={() => move(1)}>
            Skip
          </Button>
        )}
      </div>
      <div
        className="studio-onboarding-body"
        key={step}
        data-direction={direction}
      >
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
                    <span
                      className="studio-onboarding-check"
                      aria-hidden="true"
                    >
                      {selected && <Check size={14} />}
                    </span>
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
              <EditingTimeEstimate hours={hours} />
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
      </div>
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
