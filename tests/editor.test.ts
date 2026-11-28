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
test("free overlay rotation validates, survives editing and resets without changing speech", () => {
  const d = fixture();
  const id = crypto.randomUUID();
  d.overlays.push({
    id,
    sourceIndex: 0,
    sourceStart: 0,
    start: 0,
    end: 3,
    x: 0.5,
    y: 0.5,
    width: 0.3,
    opacity: 1,
    rotation: 37,
  });
  validate(d);
  const edited = applyOperations(d, [
    { kind: "overlayLayout", target: id, media: { centerX: 0.6 } },
  ]);
  assert.equal(edited.overlays[0].rotation, 37);
  assert.deepEqual(edited.words, d.words);
  assert.equal(JSON.parse(JSON.stringify(edited)).overlays[0].rotation, 37);
  const reset = applyOperations(edited, [{ kind: "resetCrop", target: id }]);
  assert.equal(reset.overlays[0].rotation, 0);
  assert.equal(d.overlays[0].rotation, 37);
  for (const rotation of [NaN, Infinity, 181, -181]) {
    const invalid = structuredClone(d);
    invalid.overlays[0].rotation = rotation;
    assert.throws(() => validate(invalid), /overlay/);
  }
});
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

test("library placement inserts at clip boundaries and routes sound without changing source words", async () => {
  const { placeSource } = await import("../lib/editor/placement.ts");
  const d = fixture();
  const ids = d.words.map((w) => w.id);
  d.sources.push({
    ...d.sources[0],
    id: crypto.randomUUID(),
    name: "second.mp4",
    duration: 3,
  });
  placeSource(d, 1, { track: "segments", time: 0 });
  assert.equal(d.segments[0].sourceIndex, 1);
  assert.equal(duration(d), 13);
  assert.deepEqual(
    d.words.map((w) => w.id),
    ids,
  );
  d.sources.push({
    id: crypto.randomUUID(),
    name: "sound.wav",
    kind: "audio",
    mime: "audio/wav",
    duration: 2,
    width: 0,
    height: 0,
  });
  placeSource(d, 2, { track: "segments", time: 1 });
  assert.equal(d.audio[0].start, 1);
  assert.equal(d.audio[0].end, 3);
  assert.equal(d.segments.length, 2);
  placeSource(d, 1, { track: "overlays", time: 12 });
  assert.equal(d.overlays[0].end, 13);
  assert.throws(
    () => placeSource(structuredClone(d), 99, { track: "segments", time: 0 }),
    /no longer/,
  );
});

test("layer collisions stop at neighbors then deliberate pull uses bounded tracks", async () => {
  const { gestureEdit } = await import("../lib/editor/timeline.ts");
  const d = fixture();
  d.audio = [
    {
      id: "a",
      sourceIndex: 0,
      sourceStart: 0,
      start: 0,
      end: 2,
      lane: 0,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    },
    {
      id: "b",
      sourceIndex: 0,
      sourceStart: 0,
      start: 3,
      end: 5,
      lane: 0,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    },
  ];
  const stopped = gestureEdit(d, "audio", "a", "move", 2);
  assert.equal(stopped.audio[0].start, 1);
  const continued = gestureEdit(d, "audio", "a", "move", 2, true);
  assert.equal(continued.audio[0].start, 2);
  assert.equal(continued.audio[0].lane, 1);
  d.audio.push(
    ...Array.from({ length: 6 }, (_, i) => i + 1).map((lane) => ({
      ...d.audio[1],
      id: "full" + lane,
      lane,
      start: 0,
      end: 10,
    })),
  );
  const capped = gestureEdit(d, "audio", "a", "move", 2, true);
  assert.equal(capped.audio[0].start, 1);
  assert.equal(capped.audio[0].lane, 0);
});

test("text and video overlays allow seven concurrent tracks and reject an eighth atomically", () => {
  const d = fixture();
  d.texts = Array.from({ length: 7 }, (_, i) => ({
    id: "t" + i,
    text: "Title",
    start: 0,
    end: 2,
    x: 0.5,
    y: 0.5,
    size: 0.05,
    color: "#ffffff",
    background: "transparent",
    font: "TikTok Sans",
    outline: false,
    animation: "none",
  }));
  validate(d);
  assert.throws(
    () =>
      validate({ ...d, texts: [...d.texts, { ...d.texts[0], id: "eighth" }] }),
    /7-track/,
  );
  d.overlays = Array.from({ length: 7 }, (_, i) => ({
    id: "o" + i,
    sourceIndex: 0,
    sourceStart: 0,
    start: 0,
    end: 2,
    x: 0.5,
    y: 0.5,
    width: 0.3,
    opacity: 1,
  }));
  validate(d);
  assert.throws(
    () =>
      validate({
        ...d,
        overlays: [...d.overlays, { ...d.overlays[0], id: "eighth" }],
      }),
    /7-track/,
  );
  assert.equal(d.texts.length, 7);
  assert.equal(d.overlays.length, 7);
});

test("manual crop round-trips through rotation and flips without changing source coordinates", async () => {
  const { displayCrop, sourceCrop } = await import("../lib/editor/crop.ts");
  const rect = { x: 0.1, y: 0.2, width: 0.6, height: 0.5 };
  for (let rotation = 0; rotation < 4; rotation++)
    for (const flipX of [false, true])
      for (const flipY of [false, true]) {
        const a = {
          ...fixture().segments[0].appearance,
          rotation,
          flipX,
          flipY,
        };
        const actual = sourceCrop(displayCrop(rect, a), a);
        for (const key of ["x", "y", "width", "height"] as const)
          assert.ok(Math.abs(actual[key] - rect[key]) < 1e-9);
      }
  assert.deepEqual(
    displayCrop(rect, { ...fixture().segments[0].appearance, rotation: 1 }),
    { x: 0.30000000000000004, y: 0.1, width: 0.5, height: 0.6 },
  );
});

test("seven audio layers remain valid and an eighth is rejected atomically", async () => {
  const { placeSource } = await import("../lib/editor/placement.ts");
  const d = fixture();
  for (let i = 0; i < 7; i++) placeSource(d, 0, { track: "audio", time: 0 });
  assert.deepEqual(d.audio.map((a) => a.lane).sort(), [0, 1, 2, 3, 4, 5, 6]);
  validate(d);
  assert.throws(
    () => placeSource(structuredClone(d), 0, { track: "audio", time: 0 }),
    /occupied|limit|room|available/i,
  );
  assert.equal(d.audio.length, 7);
});

test("timeline cleanup removes text beyond video and clips partially visible text", async () => {
  const { fitLayers } = await import("../lib/editor/timeline.ts");
  const d = captions(fixture());
  const base = { ...d.texts[0], anchor: undefined };
  d.texts = [
    { ...base, id: "partial", start: 3, end: 9 },
    { ...base, id: "void", start: 8, end: 10 },
  ];
  d.segments[0].end = 5;
  fitLayers(d);
  assert.deepEqual(
    d.texts.map((t) => [t.id, t.start, t.end]),
    [["partial", 3, 5]],
  );
});

test("copy paste preserves source ranges, anchors and bounded layer placement atomically", async () => {
  const { copyItem, pasteItem } = await import("../lib/editor/clipboard.ts");
  const d = captions(fixture());
  const copied = copyItem(d, "segments", d.segments[0].id);
  const pasted = pasteItem(d, copied, 0);
  assert.equal(pasted.doc.segments.length, 2);
  assert.notEqual(pasted.id, copied.item.id);
  assert.deepEqual(pasted.doc.words, d.words);
  const text = copyItem(d, "texts", d.texts[0].id);
  assert.equal((text.item as any).anchor, undefined);
  const result = pasteItem(d, text, 9.5);
  const added = result.doc.texts.find((t) => t.id === result.id)!;
  assert.equal(added.start, 9.5);
  assert.equal(added.end, 10);
  assert.throws(() => pasteItem(d, text, 10), /before the end/);
  assert.ok(d.texts.every((t) => !!t.anchor));
});

test("audio and overlay paste retain media settings and find available bounded tracks", async () => {
  const { copyItem, pasteItem } = await import("../lib/editor/clipboard.ts");
  const d = fixture();
  d.audio = [
    {
      id: "sound",
      sourceIndex: 0,
      start: 0,
      end: 2,
      sourceStart: 1,
      speed: 2,
      volume: 0.4,
      fadeIn: 0,
      fadeOut: 0,
      lane: 0,
    },
  ];
  const audio = pasteItem(d, copyItem(d, "audio", "sound"), 1);
  const sound = audio.doc.audio.find((a) => a.id === audio.id)!;
  assert.equal(sound.lane, 1);
  assert.equal(sound.sourceStart, 1);
  assert.equal(sound.speed, 2);
  assert.equal(sound.volume, 0.4);
  d.overlays = [
    {
      id: "overlay",
      sourceIndex: 0,
      start: 0,
      end: 2,
      sourceStart: 1,
      x: 0.5,
      y: 0.5,
      width: 0.3,
      height: 0.2,
      opacity: 0.6,
    },
  ];
  const overlay = pasteItem(d, copyItem(d, "overlays", "overlay"), 9);
  const item = overlay.doc.overlays.find((o) => o.id === overlay.id)!;
  assert.equal(item.end, 10);
  assert.equal(item.height, 0.2);
  assert.equal(item.opacity, 0.6);
  assert.equal(item.sourceStart, 1);
});

test("relaxed source trims restore removed words without replacing IDs or appearance", () => {
  const original = captions(fixture());
  const cut = applyCuts(original, [{ clip: 0, start: 0.75, end: 1.3 }]);
  cut.segments[0].appearance!.filter = "Warm";
  const before = structuredClone(cut);
  const restored = applyOperations(cut, [
    { kind: "trim", target: cut.segments[0].id, start: 0, end: 1.3 },
  ]);
  assert.equal(duration(restored), duration(original));
  assert.deepEqual(restored.words, original.words);
  assert.deepEqual(restored.sources, original.sources);
  assert.equal(restored.segments[0].id, cut.segments[0].id);
  assert.equal(restored.segments[0].appearance!.filter, "Warm");
  assert.ok(
    captions(restored).texts.some((text) => text.text.includes("world.")),
  );
  assert.throws(() =>
    applyOperations(cut, [
      { kind: "trim", target: cut.segments[0].id, start: 0, end: 11 },
    ]),
  );
  assert.deepEqual(cut, before);
});

test("permanent unused-source removal preserves retained word IDs and remaps every source reference", async () => {
  const { removeUnusedSource } = await import("../lib/editor/library.ts");
  const d = fixture();
  d.sources.unshift({
    ...d.sources[0],
    id: crypto.randomUUID(),
    name: "unused.mp4",
  });
  d.segments[0].sourceIndex = 1;
  d.words = d.words.map((w) => ({ ...w, clip: 1 }));
  d.words.unshift({
    id: "removed-word",
    clip: 0,
    start: 0,
    end: 0.1,
    text: "Unused",
  });
  d.quietCuts = [
    { clip: 0, start: 1, end: 2 },
    { clip: 1, start: 2, end: 3 },
  ];
  const before = structuredClone(d);
  const out = removeUnusedSource(d, 0);
  assert.equal(out.sources.length, 1);
  assert.equal(out.segments[0].sourceIndex, 0);
  assert.deepEqual(
    out.words.map((w) => w.id),
    before.words.slice(1).map((w) => w.id),
  );
  assert.ok(out.words.every((w) => w.clip === 0));
  assert.deepEqual(out.quietCuts, [{ clip: 0, start: 2, end: 3 }]);
  assert.deepEqual(d, before);
  assert.throws(() => removeUnusedSource(d, 1), /timeline clips/);
});

test("audio source drops honor the hovered lane and reject a collision", async () => {
  const { placeSource } = await import("../lib/editor/placement.ts");
  const d = fixture();
  d.audio.push({
    id: crypto.randomUUID(),
    sourceIndex: 0,
    sourceStart: 0,
    start: 0,
    end: 3,
    lane: 0,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
  });
  const out = placeSource(structuredClone(d), 0, {
    track: "audio",
    time: 0,
    lane: 2,
  });
  assert.equal(out.audio.at(-1)!.lane, 2);
  assert.throws(() =>
    placeSource(structuredClone(d), 0, { track: "audio", time: 0, lane: 0 }),
  );
  assert.throws(() =>
    placeSource(structuredClone(d), 0, { track: "audio", time: 0, lane: 7 }),
  );
});

test("saved speech recovery cursors require a valid job and complete section boundaries", () => {
  for (const until of [0, 10]) {
    const d = fixture();
    d.sources[0].speechAlignment = { job: "trx_fixture", until };
    assert.doesNotThrow(() => validate(d));
  }
  for (const until of [-1, 0.1, 9, 100, Infinity]) {
    const d = fixture();
    d.sources[0].speechAlignment = { job: "trx_fixture", until };
    assert.throws(() => validate(d), /recovery state/);
  }
  const d = fixture();
  d.sources[0].speechAlignment = { job: "../other", until: 0 };
  assert.throws(() => validate(d), /recovery state/);
});

test("reference title creation applies inline styling and speech captions remain sequential", () => {
  const d = fixture();
  d.words = Array.from({ length: 12 }, (_, i) => ({
    id: `0:${i}`,
    clip: 0,
    start: i * 0.3,
    end: (i + 1) * 0.3,
    text: "word",
  }));
  const c = captions(d, "single");
  for (let i = 1; i < c.texts.length; i++)
    assert.ok(
      textTiming(c, c.texts[i - 1]).end <=
        textTiming(c, c.texts[i]).start + 1e-8,
    );
  const out = applyOperations(c, [
    {
      kind: "addText",
      text: "Community College\nHorror Story",
      start: 0,
      end: 10,
      style: {
        font: "tiktokClassic",
        fontWeight: 600,
        verticalPosition: 0.29,
        size: 0.075,
        outline: "black",
        outlineWidth: 0.006,
        textBoxWidth: 0.85,
      },
    },
  ]);
  const title = out.texts.at(-1)!;
  assert.equal(title.y, 0.29);
  assert.equal(title.outline, true);
  assert.equal(title.outlineWidth, 0.006);
  assert.equal(title.font, "TikTok Sans");
  assert.equal(title.kind, "text");
  assert.ok(out.texts.slice(0, -1).every((t) => t.kind === "caption"));
});

test("pause cleanup treats nearby room-tone gaps consistently without removing quiet speech", async () => {
  const { silenceCuts } = await import("../lib/editor/model.ts");
  const rate = 1000,
    samples = new Float32Array(5000).fill(0.02);
  const words = [
    { id: "one", clip: 0, start: 0, end: 1, text: "One" },
    { id: "two", clip: 0, start: 1.65, end: 1.85, text: "two" },
    { id: "three", clip: 0, start: 2.5, end: 3, text: "three" },
    { id: "four", clip: 0, start: 4, end: 5, text: "four" },
  ];
  for (const w of words)
    for (let i = Math.floor(w.start * rate); i < w.end * rate; i++)
      samples[i] = 0.2;
  // Preserve a genuinely audible, untranscribed sound inside the last gap.
  samples.fill(0.15, 3400, 3600);
  const cuts = silenceCuts(samples, rate, words, 0);
  assert.equal(cuts.length, 4);
  assert.ok(cuts.some((c) => c.start > 1 && c.end < 1.65));
  assert.ok(cuts.some((c) => c.start > 1.85 && c.end < 2.5));
  for (const c of cuts) {
    assert.ok(!words.some((w) => c.start < w.end && c.end > w.start));
    assert.ok(c.end <= 3.4 || c.start >= 3.6);
  }
  const quiet = Float32Array.from(samples, (x) => x * 0.01);
  assert.deepEqual(silenceCuts(quiet, rate, words, 0), cuts);
});

test("non-speech cleanup removes noisy untimed gaps and tail while protecting every word and sustained omitted speech", async () => {
  const { nonSpeechCuts } = await import("../lib/editor/model.ts");
  const words = [
    { id: "a", clip: 0, start: 0.2, end: 1, text: "Yes" },
    { id: "b", clip: 0, start: 2, end: 2.2, text: "Go" },
  ];
  const speech = [
    { start: 0.15, end: 1.05 },
    { start: 2, end: 2.25 },
    { start: 3, end: 3.6 },
  ];
  const cuts = nonSpeechCuts(6, words, speech, 0);
  assert.ok(cuts.some((c) => c.start > 1 && c.end < 2));
  assert.equal(cuts.at(-1)?.end, 6);
  for (const cut of cuts)
    for (const protectedSpan of [...words, ...speech])
      assert.ok(
        cut.end <= protectedSpan.start || cut.start >= protectedSpan.end,
      );
  assert.deepEqual(nonSpeechCuts(6, words, [], 0), []);
});

test("automatic cuts remove only wordless micro-islands and protect a real short word", async () => {
  const { applyAutomaticCuts } = await import("../lib/editor/model.ts");
  const d = fixture();
  d.quietCuts = [{ clip: 0, start: 2, end: 2.16 }];
  const out = applyAutomaticCuts(d, [
    { clip: 0, start: 1.3, end: 2 },
    { clip: 0, start: 2.16, end: 4.8 },
  ]);
  assert.ok(!out.segments.some((s) => s.start === 2 && s.end === 2.16));
  d.words.push({ id: "short", clip: 0, start: 2.03, end: 2.12, text: "No!" });
  const spoken = applyAutomaticCuts(d, [
    { clip: 0, start: 1.3, end: 2 },
    { clip: 0, start: 2.16, end: 4.8 },
  ]);
  assert.ok(spoken.segments.some((s) => s.start <= 2.03 && s.end >= 2.12));
  assert.deepEqual(spoken.words, d.words);
});
test("automatic acoustic cuts leave sentence tail padding without restoring a removed word", async () => {
  const { applyAutomaticCuts } = await import("../lib/editor/model.ts");
  const d = fixture();
  const out = applyAutomaticCuts(d, [{ clip: 0, start: 1.22, end: 4.8 }]);
  assert.ok(out.segments[0].end >= 1.32 - 1e-9);
  const removed = applyAutomaticCuts(d, [{ clip: 0, start: 5, end: 6 }]);
  assert.ok(!removed.segments.some((s) => s.start < 5.4 && s.end > 5));
});

test("explicit cough annotation cannot protect a wordless micro-clip, while the spoken word cough can", async () => {
  const { applyAutomaticCuts } = await import("../lib/editor/model.ts");
  const d = fixture();
  d.words.push({
    id: "cough-event",
    clip: 0,
    start: 2.02,
    end: 2.14,
    text: "[cough]",
  });
  const cuts = [
    { clip: 0, start: 1.3, end: 2 },
    { clip: 0, start: 2.16, end: 4.8 },
  ];
  // The gap is independently measured quiet; absent captions alone are insufficient.
  d.quietCuts = [{ clip: 0, start: 2, end: 2.16 }];
  const out = applyAutomaticCuts(d, cuts);
  assert.ok(!out.segments.some((s) => s.start <= 2.02 && s.end >= 2.14));
  d.words.at(-1)!.text = "cough";
  const spoken = applyAutomaticCuts(d, cuts);
  assert.ok(spoken.segments.some((s) => s.start <= 2.02 && s.end >= 2.14));
});

test("automatic cleanup restores context rather than dropping a spoken island below the minimum clip length", async () => {
  const { applyAutomaticCuts } = await import("../lib/editor/model.ts");
  const d = fixture();
  d.words.push(
    { id: "no", clip: 0, start: 2.01, end: 2.08, text: "No" },
    { id: "bad", clip: 0, start: 2.09, end: 3, text: "wrong" },
  );
  const out = applyAutomaticCuts(d, [
    { clip: 0, start: 1.3, end: 2 },
    { clip: 0, start: 2.09, end: 4.8 },
  ]);
  assert.ok(out.segments.some((s) => s.start <= 2.01 && s.end >= 2.08));
});
