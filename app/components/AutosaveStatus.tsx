"use client";
import { useSyncExternalStore } from "react";
import { Check, CircleAlert, RefreshCw } from "lucide-react";
import { t } from "@/lib/editor/i18n";
import {
  subscribeSaves,
  savesInFlight,
  noServerSaves,
} from "@/lib/editor/save-activity";

export function AutosaveStatus({
  dirty,
  error,
}: {
  dirty: boolean;
  error: boolean;
}) {
  const active = useSyncExternalStore(
    subscribeSaves,
    savesInFlight,
    noServerSaves,
  );
  const saving = !error && (active || dirty);
  const label = t(
    error
      ? "Not saved"
      : saving
        ? "Saving…"
        : "Autosaved",
  );
  return (
    <span
      className="autosave"
      data-saving={saving || undefined}
      data-state={error ? "error" : saving ? "saving" : "saved"}
      aria-label={label}
    >
      {error ? (
        <CircleAlert size={13} aria-hidden="true" />
      ) : saving ? (
        <RefreshCw size={13} className="autosave-refresh" aria-hidden="true" />
      ) : (
        <Check size={13} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
