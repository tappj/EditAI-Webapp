"use client";
import { t as uiText } from "@/lib/editor/i18n";

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
import { weeklyVideoEstimate } from "@/lib/editor/time-savings";
import { EditAIMascot } from "./EditAIMascot";
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
  const [building, setBuilding] = useState(false);
  useEffect(() => {
    if (!building) return;
    const timer = setTimeout(() => {
      setDraft((current) => ({ ...current, step: "ready" }));
      setBuilding(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, [building]);
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

  if (building)
    return (
      <section
        className="studio-onboarding-building"
        role="status"
        aria-live="polite"
      >
        <EditAIMascot working size={140} interactive={false} />
        <p>{uiText("Preparing your studio…")}</p>
      </section>
    );

  if (!restored)
    return (
      <div className="studio-onboarding" role="status">
        {uiText("Opening EditAI…")}
      </div>
    );

  const editingIndex = questions.editingTime.options.indexOf(
    draft.answers.editingTime?.[0] ?? "",
  );
  const hours = Math.round(
    ([0.5, 2, 4.5, 8, 10, 0][editingIndex] ?? 0) * 4.345,
  );

  return (
    <section
      className="studio-onboarding"
      aria-label={uiText("EditAI onboarding")}
    >
      <div className="studio-onboarding-header">
        <button
          className="studio-onboarding-back"
          onClick={() => move(-1)}
          aria-label={uiText("Back")}
          disabled={index === 0}
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className="studio-onboarding-progress"
          role="progressbar"
          aria-label={uiText("Onboarding progress")}
          aria-valuemin={1}
          aria-valuenow={index + 1}
          aria-valuemax={steps.length + 1}
        >
          {[...steps, "name"].map((item, position) => (
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
            {uiText("Skip")}
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
              {uiText("Save your progress.")}
            </h1>
            {children}
          </>
        ) : question ? (
          <>
            <h1 ref={heading} tabIndex={-1}>
              {uiText(questions[question].title)}
            </h1>
            <p className="studio-onboarding-instruction">
              {question === "niches"
                ? uiText("Pick every niche that fits your content.")
                : uiText("Select one.")}
            </p>
            <div
              className={
                question === "niches"
                  ? "studio-onboarding-choices niche-choices"
                  : "studio-onboarding-choices"
              }
              role="group"
              aria-label={uiText(questions[question].title)}
            >
              {questions[question].options.map((option, index) => {
                const Icon = choiceIcons[question][index];
                const selected = selection.includes(option);
                return (
                  <button
                    key={uiText(option)}
                    aria-pressed={selected}
                    onClick={() => select(question, option)}
                  >
                    <span
                      className="studio-onboarding-choice-icon"
                      aria-hidden="true"
                    >
                      <Icon size={23} />
                    </span>
                    {uiText(option)}
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
              {uiText("Continue")}
            </Button>
          </>
        ) : step === "estimate" ? (
          <>
            <h1 ref={heading} tabIndex={-1}>
              {hours > 0
                ? uiText("Your editing time")
                : uiText("Make your first edit a little easier.")}
            </h1>
            {hours > 0 ? (
              <EditingTimeEstimate
                hours={hours}
                onContinue={() => setBuilding(true)}
                videosPerWeek={weeklyVideoEstimate(
                  draft.answers.volume?.[0],
                  draft.answers.frequency?.[0],
                )}
              />
            ) : (
              <>
                <img
                  className="studio-onboarding-mark"
                  src="/brand/editai-icon-192.png"
                  width="76"
                  height="76"
                  alt=""
                />
              </>
            )}
            {hours === 0 && (
              <Button onClick={() => setBuilding(true)}>
                {uiText("Build my studio")}
              </Button>
            )}
          </>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1}>
              {uiText("Your studio is ready.")}
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
                  <strong>{uiText("Upload your video")}</strong>
                  <p>
                    {uiText("Start with one clip or bring in several takes.")}
                  </p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">2</span>
                <div>
                  <strong>{uiText("Send it to EditAI")}</strong>
                  <p>
                    {uiText(
                      "Get an AI first cut when your AI connection has usage available.",
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">3</span>
                <div>
                  <strong>{uiText("Make it yours")}</strong>
                  <p>
                    {uiText("Fine-tune the edit, add captions and export.")}
                  </p>
                </div>
              </li>
            </ol>
            <Button onClick={() => move(1)}>
              {uiText("Continue to sign in")}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export function StudioAccount({
  title,
  signIn,
  children,
}: {
  title: string;
  signIn: boolean;
  children: ReactNode;
}) {
  return (
    <section className="studio-account sign-in-card">
      <h2>{uiText(title)}</h2>
      {signIn && (
        <>
          <p>
            {uiText(
              "Create a free Publik account with Google to open EditAI and save your edits. A subscription is optional.",
            )
              .split(/(Google)/)
              .map((part, index) =>
                part === "Google" ? (
                  <span className="google-sign-in-brand" key={index}>
                    <svg
                      viewBox="0 0 48 48"
                      width="16"
                      height="16"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        fill="#4285F4"
                        d="M43.61 20.08H24v8.05h11.26c-.49 2.58-1.96 4.77-4.17 6.24v5.18h6.72c3.93-3.62 6.2-8.95 6.2-15.28 0-1.48-.13-2.9-.4-4.19Z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 44c5.63 0 10.35-1.87 13.8-5.06l-6.72-5.18c-1.87 1.25-4.26 2.01-7.08 2.01-5.43 0-10.04-3.66-11.69-8.59H5.37v5.35A20.83 20.83 0 0 0 24 44Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M12.31 27.18a12.5 12.5 0 0 1 0-7.96v-5.35H5.37a20.84 20.84 0 0 0 0 18.66l6.94-5.35Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M24 10.63c3.07 0 5.81 1.05 7.98 3.11l5.99-5.99C34.33 4.36 29.61 2.4 24 2.4A20.83 20.83 0 0 0 5.37 13.87l6.94 5.35C13.96 14.29 18.57 10.63 24 10.63Z"
                      />
                    </svg>
                    {part}
                  </span>
                ) : (
                  part
                ),
              )}
          </p>
        </>
      )}
      {children}
    </section>
  );
}
