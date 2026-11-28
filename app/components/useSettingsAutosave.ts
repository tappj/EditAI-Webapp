"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Patch = Record<string, unknown>;

// Serialize writes and coalesce typing without letting an earlier response replace
// a newer input. Failed values remain queued for an explicit retry.
export function useSettingsAutosave(
  owner: string,
  save: (patch: Patch) => Promise<void>,
) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState({ message: "", url: "" });
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef<Promise<boolean> | null>(null);
  const current = useRef({ owner, save });
  useLayoutEffect(() => {
    current.current = { owner, save };
  });
  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (active.current) return active.current;
    if (!Object.keys(pending.current).length) return true;
    const savedOwner = current.current.owner;
    if (!savedOwner) return false;
    const write = async () => {
      setStatus("saving");
      while (Object.keys(pending.current).length) {
        const patch = pending.current;
        pending.current = {};
        try {
          await current.current.save(patch);
        } catch (error) {
          if (savedOwner === current.current.owner) {
            pending.current = { ...patch, ...pending.current };
            setError({
              message: error instanceof Error ? error.message : "Please retry.",
              url:
                error instanceof Error &&
                "url" in error &&
                typeof error.url === "string"
                  ? error.url
                  : "",
            });
            setStatus("error");
          }
          return false;
        }
        if (savedOwner !== current.current.owner) return false;
      }
      setStatus("saved");
      return true;
    };
    active.current = write();
    try {
      return await active.current;
    } finally {
      active.current = null;
    }
  }, []);
  const schedule = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 450);
    },
    [flush],
  );
  useEffect(() => {
    pending.current = {};
    return () => {
      clearTimeout(timer.current);
    };
  }, [owner]);
  // Flush typing when the tab is hidden; keep normal page navigation in-app.
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [flush]);
  return { status, error, schedule, flush };
}
