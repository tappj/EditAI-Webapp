/** Completed work, not a timer or an estimate of time remaining. Two final units
 * are editorial review and committing the validated document. */
export function firstCutProgress(
  previous: number,
  sourceProgress: number,
  sources: number,
  stage: "transcribe" | "edit" | "save" | "complete",
) {
  const count = Math.max(1, sources);
  const units =
    stage === "complete"
      ? count + 2
      : stage === "save"
        ? count + 1
        : stage === "edit"
          ? count
          : Math.min(1, Math.max(0, sourceProgress)) * count;
  return Math.min(1, Math.max(previous, units / (count + 2)));
}

/** Presentation estimate between reported milestones; only confirmed completion
 * may reach 100. It never changes the saved job or reports provider work. */
export function advanceEstimatedProgress(
  current: number,
  reported: number,
  elapsedMs: number,
  expectedMs: number,
) {
  if (reported >= 1) return 100;
  const previous = Math.min(
    99,
    Math.max(0, Number.isFinite(current) ? current : 0),
  );
  const confirmed = Math.min(
    99,
    Math.max(0, Number.isFinite(reported) ? reported * 100 : 0),
  );
  const drift =
    (99 - previous) *
    (1 - Math.exp(-Math.max(0, elapsedMs) / Math.max(1000, expectedMs)));
  return Math.min(99, Math.max(1, previous, confirmed, previous + drift));
}
