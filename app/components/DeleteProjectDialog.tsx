"use client";
import { useEffect, useRef, useState } from "react";
import { t as uiText } from "@/lib/editor/i18n";

export function DeleteProjectDialog({
  title,
  onClose,
  onDelete,
}: {
  title: string;
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
      className="modal delete-account-dialog delete-project-dialog"
      aria-labelledby="delete-project-title"
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
      <h2 id="delete-project-title">{uiText("Delete this edit?")}</h2>
      <p>
        {uiText("Delete “{0}”? This removes the project from your library.", {
          0: title,
        })}
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
          {uiText(busy ? "Deleting…" : "Delete")}
        </button>
      </div>
    </dialog>
  );
}
