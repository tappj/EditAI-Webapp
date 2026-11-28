// Local measurements, not semantic speech recognition or a speed detector.
export type TemporalSample = { time: number; change: number };
export function temporalEvidence(samples: TemporalSample[], duration: number) {
  const differences = samples
    .slice(1)
    .map((s) => s.change)
    .sort((a, b) => a - b);
  const median = differences[Math.floor(differences.length / 2)] || 0;
  const threshold = Math.max(0.16, median * 3.5);
  const cuts: number[] = [];
  for (const s of samples) {
    if (
      s.change >= threshold &&
      (!cuts.length || s.time - cuts[cuts.length - 1] > 0.3)
    )
      cuts.push(s.time);
  }
  const windowCount = Math.min(100, Math.ceil(duration / 0.75));
  const intervals = [0, ...cuts, duration]
    .slice(1)
    .map((end, i) => end - [0, ...cuts][i])
    .sort((a, b) => a - b);
  return {
    sampleInterval:
      samples.length > 1 ? duration / (samples.length - 1) : duration,
    sceneChangeCandidates: cuts.slice(0, 160),
    medianShotSeconds: cuts.length
      ? intervals[Math.floor(intervals.length / 2)]
      : null,
    // Averaged 0.5–3 second windows locate motion changes for ordered filmstrips.
    motionWindows: Array.from({ length: windowCount }, (_, i) => {
      const start = (duration * i) / windowCount,
        end = (duration * (i + 1)) / windowCount;
      const values = samples.filter((s) => s.time >= start && s.time < end);
      return {
        start,
        end,
        change:
          values.reduce((n, s) => n + s.change, 0) / Math.max(1, values.length),
      };
    }),
  };
}
export function audioEvidence(pcm: Float32Array, sampleRate: number) {
  const step = Math.max(1, Math.round(sampleRate * 0.05));
  const levels: number[] = [];
  for (let i = 0; i < pcm.length; i += step) {
    let energy = 0;
    const end = Math.min(pcm.length, i + step);
    for (let j = i; j < end; j++) energy += pcm[j] * pcm[j];
    levels.push(Math.sqrt(energy / (end - i)));
  }
  const sorted = [...levels].sort((a, b) => a - b);
  const peak = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const threshold = Math.max(0.001, peak * 0.09);
  const quiet: { start: number; end: number }[] = [];
  let start = -1;
  levels.forEach((level, i) => {
    if (level < threshold && start < 0) start = i;
    if ((level >= threshold || i === levels.length - 1) && start >= 0) {
      const end = level < threshold ? i + 1 : i;
      if ((end - start) * 0.05 >= 0.15)
        quiet.push({
          start: start * 0.05,
          end: Math.min(pcm.length / sampleRate, end * 0.05),
        });
      start = -1;
    }
  });
  return {
    status: peak > 0 ? ("measured" as const) : ("silent" as const),
    quietWindows: quiet.slice(0, 200),
    quietFraction:
      levels.filter((v) => v < threshold).length / Math.max(1, levels.length),
  };
}
