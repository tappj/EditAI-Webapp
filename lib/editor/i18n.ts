import type { AppLanguage } from "./language";

type Dictionary = Record<string, string>;
let current: AppLanguage = "en";
let dictionary: Dictionary = {};
let revision = 0;
let requested: AppLanguage = "en";
let templates: { pattern: RegExp; source: string; slots: string[] }[] = [];
const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const listeners = new Set<() => void>();
export const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const languageRevision = () => revision;
export const serverLanguageRevision = () => 0;
const loaders = {
  es: () => import("./locales/es.json"),
  fr: () => import("./locales/fr.json"),
  de: () => import("./locales/de.json"),
  it: () => import("./locales/it.json"),
  pt: () => import("./locales/pt.json"),
  zh: () => import("./locales/zh.json"),
  ja: () => import("./locales/ja.json"),
  ko: () => import("./locales/ko.json"),
};
export async function setInterfaceLanguage(language: AppLanguage) {
  requested = language;
  const next = language === "en" ? {} : (await loaders[language]()).default;
  if (requested !== language) return;
  dictionary = next;
  templates = Object.keys(dictionary)
    .filter((key) => /\{\d+\}/.test(key))
    .sort(
      (a, b) =>
        b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length,
    )
    .map((source) => ({
      source,
      slots: [...source.matchAll(/\{(\d+)\}/g)].map((match) => match[1]),
      pattern: new RegExp(
        "^" +
          source
            .split(/(\{\d+\})/g)
            .map((part) =>
              /^\{\d+\}$/.test(part) ? "([\\s\\S]*?)" : escapePattern(part),
            )
            .join("") +
          "$",
      ),
    }));
  current = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
  revision++;
  for (const listener of listeners) listener();
}
/** Only developer-authored UI copy goes through this function, never user content. */
const decode = (value: string) =>
  value.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp);/g,
    (entity) =>
      ({
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
        "&nbsp;": "\u00a0",
      })[entity]!,
  );
export function t(
  source: string,
  values: Record<string, string | number> = {},
): string {
  let translated =
    current !== "en" && Object.hasOwn(dictionary, source)
      ? dictionary[source]
      : source;
  const key = source.trim();
  if (
    current !== "en" &&
    translated === source &&
    Object.hasOwn(dictionary, key)
  )
    translated = source.replace(key, dictionary[key]);
  if (
    current !== "en" &&
    translated === source &&
    !Object.keys(values).length &&
    source.length < 4000
  ) {
    for (const template of templates) {
      const match = template.pattern.exec(source);
      if (!match) continue;
      translated = dictionary[template.source];
      const slots: Record<string, string> = {};
      template.slots.forEach((key, i) => {
        const value = match[i + 1];
        slots[key] = Object.hasOwn(dictionary, value)
          ? dictionary[value]
          : value;
      });
      return decode(translated).replace(/\{(\d+)\}/g, (token, key) =>
        Object.hasOwn(slots, key) ? slots[key] : token,
      );
    }
  }
  return decode(translated).replace(/\{(\d+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
