"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useState } from "react";
import { Pencil } from "lucide-react";
export function EditableProjectTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <div className="project-title-control">
      {editing ? (
        <input
          autoFocus
          className="project-title"
          aria-label={uiText("Project name")}
          maxLength={140}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onChange(draft.trim() || value);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="project-title-button"
          title={uiText("Rename edit")}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <span>{value}</span>
          <Pencil size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
