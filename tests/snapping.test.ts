import test from "node:test";
import assert from "node:assert/strict";
import {
  newDocument,
  newSegment,
  segmentDuration,
} from "../lib/editor/model.ts";
import { snapTimelineDelta } from "../lib/editor/snapping.ts";
import { gestureEdit } from "../lib/editor/timeline.ts";
function fixture() {
  const d = newDocument();
  d.sources = [
    {
      id: "v",
      name: "v",
      kind: "video",
      mime: "video/mp4",
      duration: 20,
      width: 320,
      height: 180,
    },
  ];
  d.sources.push({
    ...d.sources[0],
    id: "audio-source",
    kind: "audio",
    mime: "audio/wav",
  });
  d.segments = [newSegment(0, 5), newSegment(0, 5)];
  d.texts = [
    {
      id: "t",
      text: "Hello",
      start: 1,
      end: 3,
      x: 0.5,
      y: 0.5,
      size: 0.05,
      font: "Inter",
      color: "#ffffff",
      background: "transparent",
      outline: false,
      animation: "none",
    },
  ];
  d.overlays = [
    {
      id: "o",
      sourceIndex: 0,
      start: 4,
      end: 6,
      sourceStart: 0,
      x: 0.5,
      y: 0.5,
      width: 0.5,
      opacity: 1,
    },
  ];
  d.audio = [
    {
      id: "a",
      sourceIndex: 1,
      lane: 0,
      start: 7,
      end: 9,
      sourceStart: 0,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    },
  ];
  return d;
}
test("all layer tracks snap either moving endpoint to other tracks without changing duration", () => {
  const d = fixture();
  for (const [track, id, delta, expected] of [
    ["texts", "t", 1.95, 2],
    ["overlays", "o", 0.95, 1],
    ["audio", "a", -2.95, -3],
  ] as const) {
    const snap = snapTimelineDelta(d, track, id, "move", delta, 0.08);
    assert.ok(Math.abs(snap - expected) < 1e-8);
    const out = gestureEdit(d, track, id, "move", snap, true);
    const before = d[track][0],
      after = out[track][0];
    assert.equal(after.end - after.start, before.end - before.start);
  }
});
test("text trim snaps to a video cut; video trim reciprocally snaps to a text endpoint at changed speed", () => {
  const d = fixture();
  assert.equal(
    gestureEdit(
      d,
      "texts",
      "t",
      "end",
      snapTimelineDelta(d, "texts", "t", "end", 1.96, 0.08),
    ).texts[0].end,
    5,
  );
  d.audio = [];
  d.segments[0].start = 2;
  d.segments[0].end = 7;
  d.segments[0].speed = 2;
  const id = d.segments[0].id;
  const delta = snapTimelineDelta(d, "segments", id, "end", 0.47, 0.08);
  assert.ok(
    Math.abs(
      segmentDuration(
        gestureEdit(d, "segments", id, "end", delta).segments[0],
      ) - 3,
    ) < 1e-8,
  );
  const startDelta = snapTimelineDelta(d, "segments", id, "start", -0.47, 0.08);
  assert.ok(
    Math.abs(
      segmentDuration(
        gestureEdit(d, "segments", id, "start", startDelta).segments[0],
      ) - 3,
    ) < 1e-8,
  );
});
test("outside the screen radius and gapless video reordering preserve raw gesture; selected endpoints excluded", () => {
  const d = fixture(),
    snapshot = structuredClone(d);
  assert.equal(snapTimelineDelta(d, "texts", "t", "move", 0.23, 0.08), 0.23);
  assert.equal(
    snapTimelineDelta(d, "segments", d.segments[0].id, "move", 2.97, 0.08),
    2.97,
  );
  assert.deepEqual(d, snapshot);
});
