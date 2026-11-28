import test from "node:test";
import assert from "node:assert/strict";
import {
  audioEnvelope,
  effectiveFades,
  motionAt,
} from "../lib/editor/motion.ts";
import {
  newDocument,
  newSegment,
  split,
  duplicate,
  applyOperations,
  makeOverlay,
  validate,
} from "../lib/editor/model.ts";
import { layerAction } from "../lib/editor/timeline.ts";

function fixture() {
  const doc = newDocument();
  doc.sources = [
    {
      id: "source",
      name: "test.mp4",
      kind: "video",
      mime: "video/mp4",
      duration: 8,
      width: 320,
      height: 180,
    },
  ];
  doc.segments = [newSegment(0, 8)];
  return doc;
}
test("audio fades use native proportional fitting in rendered seconds", () => {
  assert.deepEqual(effectiveFades({ fadeIn: 6, fadeOut: 2 }, 2), {
    fadeIn: 1.5,
    fadeOut: 0.5,
  });
  assert.equal(audioEnvelope({ fadeIn: 6, fadeOut: 2 }, 0.75, 2), 0.5);
  assert.equal(audioEnvelope({ fadeIn: 6, fadeOut: 2 }, 1.75, 2), 0.5);
  assert.equal(audioEnvelope({ fadeIn: 6, fadeOut: 2 }, 1.5, 2), 1);
  assert.equal(audioEnvelope({}, 0, 2), 1);
  assert.equal(audioEnvelope({}, -0.1, 2), 0);
  const doc = fixture();
  doc.segments[0].speed = 4;
  doc.segments[0].fadeIn = 6;
  doc.segments[0].fadeOut = 2;
  assert.doesNotThrow(() => validate(doc));
});
test("native entrance and exit motion remain independent with pop overshoot and upward exit", () => {
  const settings = {
    animationIn: "pop",
    animationOut: "slide",
    animationDuration: 0.4,
  };
  assert.equal(motionAt(settings, 0, 4).opacity, 0);
  assert.ok(motionAt(settings, 0.2, 4).scale > 1);
  assert.equal(motionAt(settings, 2, 4).scale, 1);
  assert.equal(motionAt(settings, 2, 4).opacity, 1);
  assert.equal(motionAt(settings, 4, 4).offsetY, -0.045);
  assert.equal(motionAt(settings, 4, 4).opacity, 0);
  assert.equal(
    motionAt({ animationIn: "fade", animationOut: "none" }, 4, 4).opacity,
    1,
  );
  assert.equal(
    motionAt({ animationIn: "typewriter", animationDuration: 0.4 }, 0.2, 4, 10)
      .visibleCharacters,
    5,
  );
  assert.deepEqual(motionAt({}, 0, 4), {
    opacity: 1,
    scale: 1,
    offsetY: 0,
    blur: 0,
    visibleCharacters: 0,
  });
});
test("splits retain only outer fades and animations; duplicates and overlays preserve settings and word IDs", () => {
  const doc = fixture();
  const clip = doc.segments[0];
  Object.assign(clip, { fadeIn: 1, fadeOut: 2 });
  Object.assign(clip.appearance, {
    animationIn: "fade",
    animationOut: "zoom",
    animationDuration: 0.5,
  });
  doc.words = [{ id: "stable-word", clip: 0, start: 1, end: 2, text: "Hello" }];
  const result = split(doc, clip.id, 4);
  assert.equal(result.segments[0].fadeOut, 0);
  assert.equal(result.segments[1].fadeIn, 0);
  assert.equal(result.segments[0].appearance.animationOut, "none");
  assert.equal(result.segments[1].appearance.animationIn, "none");
  assert.equal(result.segments[0].fadeIn, 1);
  assert.equal(result.segments[1].fadeOut, 2);
  assert.deepEqual(result.words, doc.words);
  const copy = duplicate(doc, clip.id);
  assert.equal(copy.segments[1].fadeOut, 2);
  const overlay = makeOverlay(copy, clip.id, 0).overlays[0];
  assert.equal(overlay.fadeIn, 1);
  assert.equal(overlay.appearance?.animationOut, "zoom");
  const audio = {
    id: "sound",
    sourceIndex: 0,
    sourceStart: 0,
    start: 0,
    end: 8,
    volume: 1,
    lane: 0,
    fadeIn: 1,
    fadeOut: 2,
  };
  doc.audio = [audio];
  const splitAudio = layerAction(doc, "audio", audio.id, "split", 4);
  assert.equal(splitAudio.audio[0].fadeOut, 0);
  assert.equal(splitAudio.audio[1].fadeIn, 0);
  const ai = applyOperations(doc, [
    { kind: "split", target: audio.id, value: 4 },
  ]);
  assert.equal(ai.audio[0].fadeOut, 0);
  assert.equal(ai.audio[1].fadeIn, 0);
  assert.equal(doc.audio[0].fadeOut, 2);
});
test("invalid fade or motion settings fail atomically while old documents remain valid", () => {
  const doc = fixture();
  assert.doesNotThrow(() => validate(doc));
  for (const value of [-1, 11, NaN, Infinity]) {
    const invalid = structuredClone(doc);
    invalid.segments[0].fadeIn = value;
    assert.throws(() => validate(invalid));
  }
  for (const patch of [
    { animationIn: "typewriter" },
    { animationOut: "unsupported" },
    { animationDuration: 0 },
    { animationDuration: NaN },
  ]) {
    const invalid = structuredClone(doc);
    Object.assign(invalid.segments[0].appearance, patch);
    assert.throws(() => validate(invalid));
  }
  assert.equal(doc.segments[0].appearance.animationIn, undefined);
});
