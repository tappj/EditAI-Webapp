"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "./ui";
function BatchPreview({ file }: { file: File }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file),
      node = video.current;
    if (node) node.src = url;
    return () => {
      if (node) {
        node.removeAttribute("src");
        node.load();
      }
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return (
    <video
      ref={video}
      className="batch-thumbnail"
      aria-label={uiText("{0} preview", { 0: file.name })}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = Math.min(
          0.1,
          e.currentTarget.duration / 2,
        );
      }}
    />
  );
}
export function Batch({
  onDone,
}: {
  onDone: (groups: File[][], useAI: boolean) => void;
}) {
  const [useAI, setUseAI] = useState(true);
  const [groups, setGroups] = useState<File[][]>(
    Array.from({ length: 7 }, () => []),
  );
  return (
    <main className="dashboard">
      <div className="page-heading">
        <div>
          <h1>{uiText("Batch")}</h1>
          <p>
            {uiText(
              "Each box becomes its own editable project. Select clips for at least two.",
            )}
          </p>
        </div>
      </div>
      <div className="batch-grid">
        {groups.map((g, i) => (
          <label className="batch-box" key={i}>
            <span>
              {uiText("VIDEO ")}
              {String(i + 1).padStart(2, "0")}
            </span>
            {g.length ? <BatchPreview file={g[0]} /> : <Plus size={25} />}
            <strong>
              {g.length
                ? g.map((f) => f.name).join(", ")
                : uiText("Choose clips")}
            </strong>
            <input
              type="file"
              accept="video/*"
              multiple
              hidden
              onChange={(e) =>
                setGroups((gs) =>
                  gs.map((x, j) =>
                    j === i ? Array.from(e.target.files || []) : x,
                  ),
                )
              }
            />
          </label>
        ))}
        {groups.length < 10 && (
          <button
            className="batch-box"
            onClick={() => setGroups((g) => [...g, []])}
          >
            <Plus />
            {uiText("Add another video")}
          </button>
        )}
      </div>
      <label className="checkbox batch-ai">
        <input
          type="checkbox"
          checked={useAI}
          onChange={(e) => setUseAI(e.target.checked)}
        />
        {uiText("Auto Cut")}
      </label>
      <Button
        disabled={groups.filter((g) => g.length).length < 2}
        onClick={() =>
          void onDone(
            groups.filter((g) => g.length),
            useAI,
          )
        }
      >
        {uiText("Create ")}
        {groups.filter((g) => g.length).length} {uiText(" projects")}{" "}
        <ArrowRight size={17} />
      </Button>
    </main>
  );
}
