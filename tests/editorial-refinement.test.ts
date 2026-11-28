import test from "node:test";
import assert from "node:assert/strict";
import {
  newDocument,
  newSegment,
  captions,
  applyAutomaticCuts,
} from "../lib/editor/model.ts";
import {
  calibratedText,
  referenceLineBreaks,
} from "../lib/editor/reference-calibration.ts";
import { observedTextGroups } from "../lib/editor/reference-observations.ts";
import { measuredOutline } from "../lib/editor/reference-outline.ts";

test("measured line breaks preserve model emphasis and emoji that OCR cannot recognize", () => {
  assert.equal(
    referenceLineBreaks("A bright morning 🌅", ["A bright", "morning"]),
    "A bright\nmorning🌅",
  );
  assert.equal(
    referenceLineBreaks("A BRIGHT\nmorning 🌅", ["A bright", "morning"]),
    "A BRIGHT\nmorning 🌅",
  );
});

test("outline measurement separates a four-pixel rim from dark footage and glyph fill", () => {
  const width = 500,
    height = 200,
    pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let value = 160;
      if (x >= 100 && x < 304 && y >= 46 && y < 104) value = 0;
      if (x >= 104 && x < 300 && y >= 50 && y < 100) value = 255;
      const i = (y * width + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
    }
  const stroke = measuredOutline(pixels, width, height, {
    x0: 104,
    y0: 50,
    x1: 300,
    y1: 100,
  });
  assert.ok(stroke && Math.abs((stroke * width) / 2 - 4) < 0.5);
  const dark = new Uint8ClampedArray(width * height * 4);
  assert.equal(
    measuredOutline(dark, width, height, { x0: 104, y0: 50, x1: 300, y1: 100 }),
    undefined,
  );
});

test("local reference observations group neighboring text lines and reject uncertain scene marks", () => {
  const line = (text: string, y0: number, y1: number, confidence = 95) => ({
    text,
    confidence,
    bbox: { x0: 100, y0, x1: 400, y1 },
  });
  const groups = observedTextGroups(
    [
      line("Bright new", 100, 130),
      line("morning", 143, 173),
      line("scene mark", 240, 250, 35),
      line("Own speech", 700, 725),
      line("continues", 736, 760),
    ],
    540,
    960,
    3,
  );
  assert.deepEqual(
    groups.map((g) => g.lines),
    [
      ["Bright new", "morning"],
      ["Own speech", "continues"],
    ],
  );
  assert.equal(groups[0].top, 100 / 960);
  assert.equal(groups[1].time, 3);
});

test("reference ink calibration preserves target wording and only transfers matching title line breaks", () => {
  const ctx = {
    font: "",
    textBaseline: "middle",
    letterSpacing: "0px",
    measureText(this: { font: string }, text: string) {
      const px = Number(this.font.match(/([\d.]+)px/)?.[1]);
      return {
        width: text.length * px * 0.5,
        actualBoundingBoxAscent: px * 0.45,
        actualBoundingBoxDescent: px * 0.25,
      };
    },
  } as unknown as CanvasRenderingContext2D;
  const t = captions({
    ...document(),
    words: [
      { id: "a", clip: 0, start: 0.2, end: 1, text: "A different story" },
    ],
  }).texts[0];
  const metric = {
    scope: "text" as const,
    lines: ["Bright new", "morning"],
    left: 0.2,
    top: 0.15,
    right: 0.8,
    bottom: 0.25,
    strokeWidth: 0.01,
  };
  const out = calibratedText(
    ctx,
    { ...t, kind: "text", anchor: undefined, text: "Bright new morning" },
    metric,
    1000,
    1800,
  );
  assert.equal(out.text, "Bright new\nmorning");
  assert.ok(Math.abs(out.size - 0.118) < 0.001);
  assert.equal(out.outlineWidth, 0.01);
  const own = calibratedText(
    ctx,
    { ...t, kind: "text", anchor: undefined },
    metric,
    1000,
    1800,
  );
  assert.equal(own.text, "A different story");
  assert.equal(calibratedText(ctx, t, { ...metric, right: -1 }, 1000, 1800), t);
});
function document() {
  const d = newDocument();
  d.sources = [
    {
      id: crypto.randomUUID(),
      name: "recording.mp4",
      duration: 4,
      width: 720,
      height: 1280,
      kind: "video",
      mime: "video/mp4",
    },
  ];
  d.segments = [newSegment(0, 4)];
  return d;
}
test("measured acoustic boundaries retain their own padding while unverified cuts keep guarded word endings", () => {
  const d = document();
  d.words = [
    { id: "a", clip: 0, start: 0.2, end: 0.8, text: "First." },
    { id: "b", clip: 0, start: 1.6, end: 2, text: "Next." },
  ];
  d.quietCuts = [{ clip: 0, start: 0.84, end: 1.54 }];
  d.quietCutVersion = 4;
  const measured = applyAutomaticCuts(d, d.quietCuts);
  assert.equal(measured.segments[0].end, 0.84);
  assert.equal(measured.segments[1].start, 1.54);
  const fallback = applyAutomaticCuts(
    { ...d, quietCutVersion: 0 },
    d.quietCuts,
  );
  assert.ok(fallback.segments[0].end > 0.84);
  assert.ok(fallback.segments[0].end < 1.6);
});
test("caption groups keep bounded complete phrases without orphaning a final word or merging distinct replies", () => {
  const d = document();
  const text = ["Let", "us", "build", "a", "calmer", "working", "day."];
  d.words = text.map((text, i) => ({
    id: String(i),
    clip: 0,
    start: i * 0.4,
    end: i * 0.4 + 0.3,
    text,
  }));
  const out = captions(d);
  assert.equal(out.texts.length, 1);
  assert.equal(out.texts[0].text, text.join(" "));
  d.words = [
    { id: "a", clip: 0, start: 0.2, end: 0.5, text: "Yes." },
    { id: "b", clip: 0, start: 1, end: 1.3, text: "No." },
  ];
  assert.deepEqual(
    captions(d).texts.map((t) => t.text),
    ["Yes.", "No."],
  );
  assert.equal(captions(d, "single").texts.length, 2);
});

test("reference caption phrases preserve complete source wording, styling and anchors atomically", async () => {
  const { referenceCaptionPhrases } =
    await import("../lib/editor/caption-phrases.ts");
  const d = document();
  d.words = [
    { id: "a", clip: 0, start: 0.2, end: 0.5, text: "This" },
    { id: "b", clip: 0, start: 0.5, end: 0.9, text: "really" },
    { id: "c", clip: 0, start: 0.9, end: 1.4, text: "works." },
  ];
  const generated = captions(d);
  generated.texts.push({
    ...generated.texts[0],
    id: crypto.randomUUID(),
    kind: "text",
    anchor: undefined,
    text: "A title",
  });
  const styled = referenceCaptionPhrases(generated, [
    { firstWord: "a", lastWord: "c", text: "This\nREALLY works! ✨" },
  ]);
  assert.notEqual(styled, generated);
  assert.deepEqual(styled.words, generated.words);
  assert.deepEqual(styled.segments, generated.segments);
  assert.equal(
    styled.texts.find((t) => t.kind === "caption")?.text,
    "This\nREALLY works! ✨",
  );
  assert.ok(styled.texts.some((t) => t.text === "A title"));
  assert.equal(
    styled.texts.find((t) => t.kind === "caption")?.anchor?.segmentId,
    d.segments[0].id,
  );
  const adjacent = referenceCaptionPhrases(generated, [
    { firstWord: "a", lastWord: "a", text: "This really" },
    { firstWord: "b", lastWord: "c", text: "works." },
  ]);
  assert.equal(adjacent.texts.filter((t) => t.kind === "caption").length, 2);
  assert.equal(
    adjacent.texts.find((t) => t.kind === "caption")?.anchor?.end,
    0.88,
  );
  for (const invalid of [
    [{ firstWord: "a", lastWord: "c", text: "This never works." }],
    [{ firstWord: "b", lastWord: "c", text: "really works." }],
    [
      { firstWord: "a", lastWord: "b", text: "This really" },
      { firstWord: "b", lastWord: "c", text: "really works." },
    ],
  ])
    assert.equal(referenceCaptionPhrases(generated, invalid), generated);
});

test("measured word boundaries preserve quiet phonetic tails across microphone gains and fall back when uncertain", async () => {
  const { wordAudioBounds } =
    await import("../lib/editor/word-audio-bounds.ts");
  const rate = 16000,
    samples = new Float32Array(rate * 2);
  for (let i = 0; i < samples.length; i++)
    samples[i] = Math.sin(i * 0.73) * 0.00003;
  for (let i = Math.floor(0.15 * rate); i < Math.floor(0.36 * rate); i++)
    samples[i] += 0.2 * Math.sin((i * 2 * Math.PI * 180) / rate);
  const words = [
    { id: "kept", clip: 0, start: 0.1, end: 0.45, text: "Clear." },
  ];
  const loud = wordAudioBounds(samples, rate, words),
    quiet = wordAudioBounds(
      samples.map((x) => x * 0.01),
      rate,
      words,
    );
  assert.ok(loud.kept.start <= 0.15 && loud.kept.start >= 0.1);
  assert.ok(loud.kept.end >= 0.36 && loud.kept.end <= 0.45);
  assert.ok(Math.abs(loud.kept.start - quiet.kept.start) <= 0.005);
  assert.ok(Math.abs(loud.kept.end - quiet.kept.end) <= 0.005);
  assert.deepEqual(wordAudioBounds(new Float32Array(rate), rate, words), {});
  const shifted = wordAudioBounds(samples, rate, words, 10);
  assert.equal(shifted.kept.start, loud.kept.start + 10);
});

test("coarse first-word timestamps do not protect a clearly silent recording lead-in", async () => {
  const { wordAudioBounds } =
    await import("../lib/editor/word-audio-bounds.ts");
  const samples = new Float32Array(1000).fill(0.00001);
  for (let i = 460; i < 850; i++) samples[i] = Math.sin(i * 0.4) * 0.2;
  const d = document();
  d.words = [{ id: "opening", clip: 0, start: 0, end: 0.9, text: "Hello." }];
  d.wordAudioBounds = wordAudioBounds(samples, 1000, d.words);
  d.quietCutVersion = 6;
  assert.equal(d.wordAudioBounds.opening.leadingSpeech, true);
  const trimmed = applyAutomaticCuts(d, []);
  assert.ok(
    trimmed.segments[0].start > 0.4 && trimmed.segments[0].start < 0.46,
  );
  assert.ok(trimmed.segments[0].end > 0.85);
  assert.deepEqual(trimmed.words, d.words);
});
