const weeksPerMonth = 4.345;
export const editaiMinutesPerVideo = 5;

export function weeklyVideoEstimate(volume?: string, frequency?: string) {
  if (volume === "1 to 2 a week") return 1.5;
  if (volume === "3 to 5 a week") return 4;
  if (volume === "6+ a week") return 6;
  if (frequency === "Every day") return 7;
  if (frequency === "A few times a week") return 3;
  return 1;
}

/** An estimate from onboarding answers, never more time than the current budget. */
export function timeSavings(hours: number, videosPerWeek: number) {
  const editingHours = Math.min(
    170,
    Math.max(0, Math.round(Number.isFinite(hours) ? hours : 0)),
  );
  const videos = Math.max(
    1,
    Math.round(
      Math.max(0, Number.isFinite(videosPerWeek) ? videosPerWeek : 1) *
        weeksPerMonth,
    ),
  );
  const originalMinutes = editingHours * 60;
  const editaiMinutes = Math.min(
    originalMinutes,
    videos * editaiMinutesPerVideo,
  );
  return {
    editingHours,
    originalMinutes,
    editaiMinutes,
    savedMinutes: originalMinutes - editaiMinutes,
  };
}

export function shortTime(minutes: number) {
  const value = Math.max(0, Math.round(minutes)),
    hours = Math.floor(value / 60),
    remainder = value % 60;
  return hours
    ? `${hours}h${remainder ? ` ${remainder}m` : ""}`
    : `${remainder}m`;
}
