export const TEXT_ANIMATIONS = [
  "none",
  "fade",
  "pop",
  "zoom",
  "slide",
  "typewriter",
] as const;
export const MEDIA_ANIMATIONS = TEXT_ANIMATIONS.filter(
  (value) => value !== "typewriter",
);
export type Animation = (typeof TEXT_ANIMATIONS)[number];
export type MotionSettings = {
  animationIn?: string;
  animationOut?: string;
  animationDuration?: number;
};
export type AudioFades = { fadeIn?: number; fadeOut?: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

// EditorTimeline.swift: requested fades stay stored; shorten them together to fit.
export function effectiveFades(settings: AudioFades, duration: number) {
  const first = Math.max(0, settings.fadeIn ?? 0);
  const last = Math.max(0, settings.fadeOut ?? 0);
  const factor =
    first + last > duration ? Math.max(0, duration) / (first + last) : 1;
  return { fadeIn: first * factor, fadeOut: last * factor };
}
export function audioEnvelope(
  settings: AudioFades,
  time: number,
  duration: number,
) {
  if (duration <= 0 || time < 0 || time > duration) return 0;
  const { fadeIn, fadeOut } = effectiveFades(settings, duration);
  return (
    (fadeIn ? clamp(time / fadeIn) : 1) *
    (fadeOut ? clamp((duration - time) / fadeOut) : 1)
  );
}

// The native CaptionMotion contract, shared by text, visual clips and export.
export function motionAt(
  settings: MotionSettings,
  time: number,
  duration: number,
  characters = 0,
) {
  const seconds = Math.min(
    settings.animationDuration ?? 0.35,
    Math.max(0.001, duration * 0.45),
  );
  const result = {
    opacity: 1,
    scale: 1,
    offsetY: 0,
    blur: 0,
    visibleCharacters: characters,
  };
  function apply(
    animation: string | undefined,
    progress: number,
    exiting: boolean,
  ) {
    const p = 1 - (1 - progress) ** 3;
    switch (animation) {
      case "fade":
        result.opacity *= progress;
        break;
      case "pop":
        result.scale *=
          progress < 1
            ? 0.72 + 0.28 * p + 0.16 * Math.sin(progress * Math.PI)
            : 1;
        result.opacity *= Math.min(1, progress * 5);
        break;
      case "zoom":
        result.scale *= 0.6 + 0.4 * p;
        result.opacity *= progress;
        result.blur += (1 - p) * 8;
        break;
      case "slide":
        result.offsetY += (exiting ? -1 : 1) * (1 - p) * 0.045;
        result.opacity *= progress;
        break;
      case "typewriter":
        result.visibleCharacters = Math.min(
          result.visibleCharacters,
          Math.ceil(characters * progress),
        );
        break;
    }
  }
  apply(settings.animationIn, clamp(time / seconds), false);
  apply(settings.animationOut, clamp((duration - time) / seconds), true);
  return result;
}
export function validMotion(settings: MotionSettings, text = false) {
  const names: readonly string[] = text ? TEXT_ANIMATIONS : MEDIA_ANIMATIONS;
  return (
    [settings.animationIn, settings.animationOut].every(
      (value) => value === undefined || names.includes(value),
    ) &&
    (settings.animationDuration === undefined ||
      (Number.isFinite(settings.animationDuration) &&
        settings.animationDuration >= 0.1 &&
        settings.animationDuration <= 2))
  );
}
export function validFades(settings: AudioFades) {
  return [settings.fadeIn, settings.fadeOut].every(
    (value) =>
      value === undefined ||
      (Number.isFinite(value) && value >= 0 && value <= 10),
  );
}
export function splitEffects(
  left: AudioFades & { appearance?: MotionSettings },
  right: AudioFades & { appearance?: MotionSettings },
) {
  left.fadeOut = 0;
  right.fadeIn = 0;
  if (left.appearance) left.appearance.animationOut = "none";
  if (right.appearance) right.appearance.animationIn = "none";
}
