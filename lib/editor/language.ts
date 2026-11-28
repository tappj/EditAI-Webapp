import { franc } from "franc-min";

export const languageNames = {
  en: "English",
  es: "Spanish",
  fr: "French",
  zh: "Chinese",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
} as const;
export type AppLanguage = keyof typeof languageNames;
const codes: Record<string, AppLanguage> = {
  eng: "en",
  spa: "es",
  fra: "fr",
  cmn: "zh",
  deu: "de",
  por: "pt",
  ita: "it",
  jpn: "ja",
  kor: "ko",
};
export function validLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && Object.hasOwn(languageNames, value);
}
/** Evaluate independent samples; long recordings have proportionally more weight.
 * Short/ambiguous text supplies no evidence. No text leaves the device. */
export function languageScores(
  samples: string[],
): Partial<Record<AppLanguage, number>> {
  const scores: Partial<Record<AppLanguage, number>> = {};
  for (const text of samples) {
    const count = Math.min(5, Math.ceil(text.length / 2000));
    for (let i = 0; i < count; i++) {
      const offset =
        count <= 1
          ? 0
          : Math.round((i * Math.max(0, text.length - 2000)) / (count - 1));
      const sample = text.slice(offset, offset + 2000).trim();
      const code =
        codes[franc(sample, { only: Object.keys(codes), minLength: 40 })];
      if (code)
        scores[code] =
          (scores[code] || 0) +
          sample.replace(/\s/g, "").length *
            Math.max(1, text.length / (count * 2000));
    }
  }
  return scores;
}
export function mostUsedLanguage(
  samples: string[],
  usage: Partial<Record<AppLanguage, number>> = {},
): AppLanguage {
  const scores = languageScores(samples);
  for (const code of Object.keys(languageNames) as AppLanguage[]) {
    const count = usage[code];
    if (typeof count === "number" && Number.isFinite(count) && count > 0)
      scores[code] = (scores[code] || 0) + Math.min(count, 1e7);
  }
  return (Object.keys(languageNames) as AppLanguage[]).reduce(
    (best, code) => ((scores[code] || 0) > (scores[best] || 0) ? code : best),
    "en",
  );
}
