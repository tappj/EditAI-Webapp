import test from "node:test";
import assert from "node:assert/strict";
import { mostUsedLanguage, validLanguage } from "../lib/editor/language.ts";
test("automatic language defaults to English and ignores short ambiguous text", () => {
  assert.equal(mostUsedLanguage([]), "en");
  assert.equal(mostUsedLanguage(["hola", "hello"]), "en");
  assert.equal(validLanguage("auto"), false);
  assert.equal(validLanguage("es"), true);
  assert.equal(validLanguage("constructor"), false);
});
test("automatic language follows the majority of actual content, including non-Latin scripts", () => {
  const spanish =
    "Hoy vamos a explicar cómo preparar este proyecto y compartir una historia sobre nuestras vacaciones con toda la familia.";
  const english =
    "Today we are going to explain how this project works and share a story about our holiday with the whole family.";
  assert.equal(mostUsedLanguage([spanish, spanish, english]), "es");
  assert.equal(mostUsedLanguage([english, english, spanish]), "en");
  assert.equal(
    mostUsedLanguage([
      "これは日本語で書かれた文章です。今日の動画では新しいプロジェクトを作成する方法を詳しく説明します。家族と一緒に旅行した時の思い出も紹介します。",
    ]),
    "ja",
  );
});

test("every interface locale covers source copy and preserves interpolation tokens", async () => {
  const { readFile } = await import("node:fs/promises");
  const keys: string[] = [];
  for (const name of [
    "interface-strings",
    "interface-extra",
    "interface-onboarding",
    "interface-status",
    "interface-support",
    "interface-support-images",
    "interface-workflows",
  ])
    keys.push(...JSON.parse(await readFile(`lib/editor/${name}.json`, "utf8")));
  for (const code of ["es", "fr", "pt", "de", "it", "zh", "ja", "ko"]) {
    const dictionary = JSON.parse(
      await readFile(`lib/editor/locales/${code}.json`, "utf8"),
    );
    for (const key of keys) {
      assert.equal(typeof dictionary[key], "string", `${code}: ${key}`);
      assert.deepEqual(
        dictionary[key].match(/\{\d+\}/g)?.sort() || [],
        key.match(/\{\d+\}/g)?.sort() || [],
        `${code} placeholders: ${key}`,
      );
    }
  }
});

test("translated copy preserves filenames, interpolation and internal English behavior labels", async () => {
  const { build } = await import("esbuild");
  const bundled = await build({
    entryPoints: ["lib/editor/i18n.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  });
  const { t, setInterfaceLanguage } = await import(
    "data:text/javascript;base64," +
      Buffer.from(bundled.outputFiles[0].text).toString("base64")
  );
  const { readFile } = await import("node:fs/promises");
  const spanish = JSON.parse(
    await readFile("lib/editor/locales/es.json", "utf8"),
  );
  try {
    await setInterfaceLanguage("es");
    assert.equal(t("Appearance"), spanish.Appearance);
    assert.equal(
      t("Open {0}", { 0: "Report & notes.mp4" }),
      spanish["Open {0}"].replace("{0}", "Report & notes.mp4"),
    );
    assert.equal(
      t("Open Report.mp4"),
      spanish["Open {0}"].replace("{0}", "Report.mp4"),
    );
    assert.equal(t("constructor"), "constructor");
  } finally {
    await setInterfaceLanguage("en");
  }
  assert.equal(t("Feedback &amp; help"), "Feedback & help");
});

test("remembered language counts survive empty projects without counting assistant output", () => {
  assert.equal(mostUsedLanguage([], { es: 300 }), "es");
  assert.equal(mostUsedLanguage([], { es: NaN, fr: -1 }), "en");
  assert.equal(mostUsedLanguage([], { es: 200, en: 400 }), "en");
});
