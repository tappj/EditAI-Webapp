"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useState } from "react";
import { onboardingDisplayName } from "@/lib/editor/profile";
import "./studio-onboarding.css";

export function StudioNameOnboarding({
  onSave,
}: {
  onSave: (firstName: string, lastName: string) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <section
      className="studio-onboarding studio-name-onboarding"
      aria-label={uiText("EditAI onboarding")}
    >
      <div className="studio-onboarding-header">
        <div
          className="studio-onboarding-progress"
          role="progressbar"
          aria-label={uiText("Onboarding progress")}
          aria-valuemin={1}
          aria-valuenow={9}
          aria-valuemax={9}
        >
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="complete" aria-hidden="true">
              <i />
            </span>
          ))}
        </div>
      </div>
      <form
        className="studio-onboarding-body"
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving || !onboardingDisplayName(firstName, lastName)) return;
          setSaving(true);
          setError("");
          try {
            await onSave(firstName.trim(), lastName.trim());
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Couldn’t save your name. Please try again.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <h1>{uiText("Who runs this studio?")}</h1>
        <label>
          {uiText("First name ")}
          <span className="name-field-hint">{uiText("Required")}</span>
          <input
            autoFocus
            autoComplete="given-name"
            autoCapitalize="words"
            required
            maxLength={40}
            value={firstName}
            disabled={saving}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>
        <label>
          {uiText("Last name ")}
          <span className="name-field-hint">{uiText("Optional")}</span>
          <input
            autoComplete="family-name"
            autoCapitalize="words"
            maxLength={39}
            value={lastName}
            disabled={saving}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button
          className="button"
          type="submit"
          disabled={saving || !onboardingDisplayName(firstName, lastName)}
        >
          {saving ? uiText("Saving…") : uiText("Continue")}
        </button>
      </form>
    </section>
  );
}
