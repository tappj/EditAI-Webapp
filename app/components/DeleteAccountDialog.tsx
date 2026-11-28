"use client";
import { useEffect, useRef, useState } from "react";
import { t as uiText } from "@/lib/editor/i18n";

export function DeleteAccountDialog({
  onClose,
  onDelete,
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal delete-account-dialog"
      aria-labelledby="delete-account-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <h2 id="delete-account-title">{uiText("Delete your EditAI account?")}</h2>
      <p>
        {uiText(
          "Permanently delete your EditAI account, including all projects, uploaded sources, usage records, profile and saved credentials? This cannot be undone. Your separate Publik account and plan will remain active.",
        )}
      </p>
      {error && <p role="alert">{uiText(error)}</p>}
      <div className="button-row">
        <button
          className="button secondary"
          autoFocus
          disabled={busy}
          onClick={onClose}
        >
          {uiText("Cancel")}
        </button>
        <button
          className="button delete-account-confirm"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await onDelete();
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {uiText(busy ? "Deleting…" : "Delete account")}
        </button>
      </div>
    </dialog>
  );
}
