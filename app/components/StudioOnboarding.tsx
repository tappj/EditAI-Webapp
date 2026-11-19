"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Film,
  Scissors,
  Sparkles,
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

  return (
    <section className="studio-onboarding" aria-label="EditAI onboarding">
      <div className="studio-onboarding-header">
        <Wordmark />
        <progress
          aria-label="Onboarding progress"
          value={index + 1}
          max={steps.length}
        />
        {index > 0 && (
          <Button secondary onClick={() => move(-1)}>
            <ArrowLeft size={16} /> Back
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
      ) : media ? (
        <div className="studio-onboarding-demo">
          <video
            key={step}
            controls
            playsInline
            preload="metadata"
            src={edited ? "/onboarding/edited.mp4" : "/onboarding/raw.mp4"}
            poster={edited ? "/onboarding/edited.jpg" : "/onboarding/raw.jpg"}
            aria-label={edited ? "Edited sample video" : "Raw sample video"}
          />
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {edited ? "Keep the good takes." : "Film it messy."}
            </h1>
            <p>
              {edited
                ? "See the same footage after EditAI removes the retakes and dead space."
                : "Start with the raw footage, retakes and all."}
            </p>
            <Button onClick={() => move(1)}>
              {edited ? "Make it mine" : "See it happen"}
            </Button>
          </div>
        </div>
      ) : question ? (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {questions[question].title}
          </h1>
          {question === "niches" && (
            <p>Pick every niche that fits your content.</p>
          )}
          <div
            className="studio-onboarding-choices"
            role="group"
            aria-label={questions[question].title}
          >
            {questions[question].options.map((option) => (
              <button
                key={option}
                aria-pressed={selection.includes(option)}
                onClick={() => select(question, option)}
              >
                {option}
                {selection.includes(option) && (
                  <Check size={16} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          <div className="studio-onboarding-actions">
            <Button onClick={() => move(1)} disabled={!selection.length}>
              Continue
            </Button>
            <Button secondary onClick={() => move(1)}>
              Skip
            </Button>
          </div>
        </>
      ) : step === "estimate" ? (
        <>
          <h1 ref={heading} tabIndex={-1}>
            Make time for your next video.
          </h1>
          {hours > 0 ? (
            <div className="studio-onboarding-estimate">
              <Clock3 size={28} aria-hidden="true" />
              <strong>
                About {hours} {hours === 1 ? "hour" : "hours"} a month
              </strong>
              <p>
                Estimated time you currently spend editing, based on your weekly
                answer.
              </p>
            </div>
          ) : (
            <p>Start with a rough cut and make it yours at your own pace.</p>
          )}
          <Button onClick={() => move(1)}>Build my studio</Button>
        </>
      ) : (
        <>
          <h1 ref={heading} tabIndex={-1}>
            Your studio is ready.
          </h1>
          <ol className="studio-onboarding-tutorial">
            <li>
              <Film size={20} aria-hidden="true" />{" "}
              <div>
                <strong>Upload your video</strong>
                <p>Start with one clip or bring in several takes.</p>
              </div>
            </li>
            <li>
              <Scissors size={20} aria-hidden="true" />{" "}
              <div>
                <strong>Send it to EditAI</strong>
                <p>
                  Get an AI first cut when your AI connection has usage
                  available.
                </p>
              </div>
            </li>
            <li>
              <Sparkles size={20} aria-hidden="true" />{" "}
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
