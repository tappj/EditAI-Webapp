"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";

export function DiscardToolDialog({
  onDecision,
}: {
  onDecision: (leave: boolean, suppress: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [suppress, setSuppress] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal tool-exit-dialog"
      aria-labelledby="tool-exit-title"
      onCancel={(e) => {
        e.preventDefault();
        onDecision(false, false);
      }}
    >
      <h2 id="tool-exit-title">{uiText("Leave this page?")}</h2>
      <p>
        {uiText(
          "Your uploaded footage and results will be lost. Copy or download anything you want to keep first.",
        )}
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={suppress}
          onChange={(e) => setSuppress(e.target.checked)}
        />
        {uiText("Don’t show again")}
      </label>
      <div className="button-row">
        <button
          className="button secondary"
          autoFocus
          onClick={() => onDecision(false, false)}
        >
          {uiText("Stay")}
        </button>
        <button className="button" onClick={() => onDecision(true, suppress)}>
          {uiText("Leave page")}
        </button>
      </div>
    </dialog>
  );
}
