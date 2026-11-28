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
