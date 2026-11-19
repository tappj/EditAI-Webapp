import test from "node:test";
import assert from "node:assert/strict";
import {
  newDocument,
  newSegment,
  duration,
  split,
  captions,
  textTiming,
  applyCuts,
  duplicate,
  applyOperations,
  validate,
} from "../lib/editor/model.ts";
function fixture() {
  const d = newDocument();
  d.sources = [
    {
      id: crypto.randomUUID(),
      name: "source.mp4",
      duration: 10,
      width: 320,
      height: 180,
      kind: "video",
      mime: "video/mp4",
    },
  ];
  d.segments = [newSegment(0, 10)];
  d.words = [
    { id: "0:0", clip: 0, start: 0.2, end: 0.7, text: "Hello" },
    { id: "0:1", clip: 0, start: 0.8, end: 1.2, text: "world." },
    { id: "0:2", clip: 0, start: 5, end: 5.4, text: "Another" },
    { id: "0:3", clip: 0, start: 5.5, end: 6, text: "take." },
  ];
  return d;
}
test("split preserves source anchors and exact duration at non-unit speed", () => {
  let d = fixture();
  d.segments[0].speed = 2;
  d = captions(d);
  const out = split(d, d.segments[0].id, 5.2);
  assert.equal(duration(out), 5);
  assert.equal(out.segments.length, 2);
  assert.ok(out.texts.every((t) => textTiming(out, t).start >= 0));
});
test("cuts and duplicates keep captions on each retained source island", () => {
  const d = captions(fixture());
  const out = applyCuts(d, [{ clip: 0, start: 2, end: 4 }]);
  assert.equal(out.segments.length, 2);
  assert.equal(out.texts.length, 2);
  assert.ok(out.texts.every((t) => textTiming(out, t).start >= 0));
  const dup = duplicate(out, out.segments[1].id);
  assert.equal(dup.texts.length, 3);
  assert.equal(duration(dup), 14);
});
test("AI operations obey actual iOS target/value/text contract atomically", () => {
  const d = fixture();
  const out = applyOperations(d, [
    { kind: "speed", target: d.segments[0].id, value: 2 },
    { kind: "canvas", text: "portrait" },
    { kind: "filter", target: null, text: "Warm" },
  ]);
  assert.equal(duration(out), 5);
  assert.equal(out.canvas, "9:16");
  assert.equal(out.segments[0].appearance.filter, "Warm");
  assert.equal(d.segments[0].speed, 1);
  assert.throws(() =>
    applyOperations(d, [{ kind: "speed", target: null, value: 100 }]),
  );
});
test("safety rejects final-clip deletion, unsafe crop and overlapping audio", () => {
  const d = fixture();
  assert.throws(() =>
    applyOperations(d, [{ kind: "delete", target: d.segments[0].id }]),
  );
  const c = structuredClone(d);
  c.segments[0].appearance.crop.x = 0.8;
  c.segments[0].appearance.crop.width = 0.5;
  assert.throws(() => validate(c));
  d.audio = [
    {
      id: "a",
      sourceIndex: 0,
      start: 0,
      end: 3,
      sourceStart: 0,
      lane: 0,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    },
    {
      id: "b",
      sourceIndex: 0,
      start: 2,
      end: 5,
      sourceStart: 0,
      lane: 0,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    },
  ];
  assert.throws(() => validate(d));
});
test("speed edits project source-attached captions instead of leaving stale timestamps", () => {
  let d = captions(fixture());
  d.segments[0].speed = 2;
  const a = textTiming(d, d.texts[1]);
  assert.ok(a.start > 2.4 && a.start < 2.6);
  assert.ok(a.end <= 3.1);
});

test("AI removal retains caption anchors on both remaining portions of a target clip", () => {
  const d = captions(fixture());
  const out = applyOperations(d, [
    { kind: "removeRange", target: d.segments[0].id, start: 2, end: 4 },
  ]);
  assert.equal(out.segments.length, 2);
  assert.equal(out.texts.length, 2);
  assert.ok(out.texts.every((t) => textTiming(out, t).start >= 0));
});
test("AI cannot fabricate a target or invalid GPU values", () => {
  const d = fixture();
  assert.throws(() =>
    applyOperations(d, [
      { kind: "trim", target: crypto.randomUUID(), start: 0, end: 1 },
    ]),
  );
  const out = applyOperations(d, [
    {
      kind: "adjustment",
      target: d.segments[0].id,
      text: "Exposure",
      value: 0.5,
    },
  ]);
  assert.equal(out.segments[0].appearance.adjustments?.Exposure, 0.5);
  assert.throws(() =>
    applyOperations(d, [
      { kind: "adjustment", target: null, text: "Exposure", value: NaN },
    ]),
  );
});
test("caption style preserves supported native options including font, shadow and outline", () => {
  const d = captions(fixture());
  const out = applyOperations(d, [
    {
      kind: "captionStyle",
      target: null,
      scope: "captions",
      style: {
        font: "anton",
        outlineWidth: 0.01,
        textOpacity: 0.7,
        shadowOpacity: 0.5,
        letterSpacing: 0.1,
      },
    },
  ]);
  assert.equal(out.texts[0].font, "Anton");
  assert.equal(out.texts[0].opacity, 0.7);
  assert.equal(out.texts[0].outlineWidth, 0.01);
});

test("quiet-pause evidence never cuts the protected union of overlapping words", async () => {
  const { silenceCuts } = await import("../lib/editor/model.ts");
  const rate = 1000,
    samples = new Float32Array(7000);
  const words = [
    { id: "a", clip: 0, start: 0, end: 4, text: "overlap" },
    { id: "b", clip: 0, start: 1, end: 2, text: "inside" },
    { id: "c", clip: 0, start: 5, end: 6, text: "later" },
  ];
  const cuts = silenceCuts(samples, rate, words, 0);
  assert.equal(cuts.length, 1);
  assert.ok(cuts[0].start >= 4);
  assert.ok(cuts[0].end <= 5);
  assert.equal(silenceCuts(samples, rate, [], 0).length, 0);
});

test("timeline edge gestures restore original media at changed speed and preserve word IDs", async () => {
  const { gestureEdit } = await import("../lib/editor/timeline.ts");
  const d = fixture();
  d.segments[0].start = 2;
  d.segments[0].end = 8;
  d.segments[0].speed = 2;
  const shorter = gestureEdit(d, "segments", d.segments[0].id, "start", 1);
  assert.equal(shorter.segments[0].start, 4);
  const restored = gestureEdit(
    shorter,
    "segments",
    d.segments[0].id,
    "start",
    -100,
  );
  assert.equal(restored.segments[0].start, 0);
  assert.deepEqual(restored.words, d.words);
  assert.equal(d.segments[0].start, 2);
});
test("layer gestures and splitting map source time at changed speed and prevent audio collisions", async () => {
  const { gestureEdit, layerAction } =
    await import("../lib/editor/timeline.ts");
  const d = fixture();
  d.audio = [
    {
      id: "a",
      sourceIndex: 0,
      sourceStart: 1,
      start: 1,
      end: 4,
      speed: 2,
      volume: 0.7,
      fadeIn: 0,
      fadeOut: 0,
      lane: 0,
    },
    {
      id: "b",
      sourceIndex: 0,
      sourceStart: 0,
      start: 6,
      end: 8,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
      lane: 0,
    },
  ];
  const moved = gestureEdit(d, "audio", "a", "move", 100);
  assert.equal(moved.audio[0].end, 6);
  const trimmed = gestureEdit(d, "audio", "a", "start", 0.5);
  assert.equal(trimmed.audio[0].sourceStart, 2);
  const splitLayer = layerAction(d, "audio", "a", "split", 2);
  assert.equal(splitLayer.audio[2].sourceStart, 3);
  assert.equal(splitLayer.audio[0].end, 2);
  assert.throws(() => layerAction(d, "audio", "a", "duplicate", 0));
  assert.deepEqual(d.words, moved.words);
});
test("shortening the main track crops layers without moving them and cleans deleted caption anchors", async () => {
  const { gestureEdit, fitLayers } = await import("../lib/editor/timeline.ts");
  const d = captions(fixture());
  d.overlays = [
    {
      id: "overlay",
      sourceIndex: 0,
      start: 3,
      end: 9,
      sourceStart: 0,
      x: 0.5,
      y: 0.5,
      width: 0.5,
      opacity: 1,
    },
  ];
  const out = gestureEdit(d, "segments", d.segments[0].id, "end", -5);
  assert.equal(out.overlays[0].start, 3);
  assert.equal(out.overlays[0].end, 5);
  out.segments = [newSegment(0, 5)];
  assert.equal(fitLayers(out).texts.length, 0);
});

test("EditAI can use imported media and edit layers atomically with native operation names", () => {
  const original = fixture();
  const d = split(original, original.segments[0].id, 5);
  const overlay = applyOperations(d, [
    { kind: "makeOverlay", target: d.segments[0].id, media: { time: 2 } },
  ]);
  const id = overlay.overlays[0].id;
  const changed = applyOperations(overlay, [
    { kind: "trim", target: id, start: 1, end: 4 },
    { kind: "speed", target: id, value: 2 },
    {
      kind: "overlayLayout",
      target: id,
      media: { centerX: 0.25, centerY: 0.3, width: 0.4, time: 1 },
    },
    { kind: "filter", target: id, text: "Warm" },
  ]);
  assert.equal(changed.overlays[0].end, 2.5);
  assert.equal(changed.overlays[0].sourceStart, 1);
  assert.equal(changed.overlays[0].appearance?.filter, "Warm");
  const audio = applyOperations(d, [
    { kind: "addAudio", start: 1, end: 3, media: { source: 0, time: 2 } },
  ]);
  assert.equal(audio.audio[0].start, 2);
  assert.throws(() =>
    applyOperations(audio, [
      { kind: "volume", target: audio.audio[0].id, value: 0.2 },
      { kind: "audioSettings", target: audio.audio[0].id, media: { lane: 9 } },
    ]),
  );
  assert.equal(audio.audio[0].volume, 1);
  assert.equal(d.overlays.length, 0);
});

test("global caption defaults survive regeneration and audio mute retains volume", () => {
  const d = fixture();
  d.captionStyle = { font: "Montserrat", size: 0.08, color: "#fff176" };
  const out = captions(d);
  assert.ok(out.texts.every((t) => t.font === "Montserrat" && t.size === 0.08));
  const audio = applyOperations(d, [
    { kind: "addAudio", start: 0, end: 2, media: { source: 0, time: 0 } },
  ]);
  const muted = applyOperations(audio, [
    { kind: "volume", target: audio.audio[0].id, value: 0.3 },
    {
      kind: "audioSettings",
      target: audio.audio[0].id,
      media: { isMuted: true },
    },
  ]);
  assert.equal(muted.audio[0].muted, true);
  assert.equal(muted.audio[0].volume, 0.3);
  const restored = applyOperations(muted, [
    {
      kind: "audioSettings",
      target: audio.audio[0].id,
      media: { isMuted: false },
    },
  ]);
  assert.equal(restored.audio[0].muted, false);
  assert.equal(restored.audio[0].volume, 0.3);
});
