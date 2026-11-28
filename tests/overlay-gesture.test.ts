import test from "node:test";
import assert from "node:assert/strict";
import {
  breaksResizeLock,
  snapUpright,
} from "../lib/editor/overlay-gesture.ts";

test("corner gestures tolerate resize jitter but unlock deliberate tangential drags", () => {
  const center = { x: 200, y: 200 };
  for (const start of [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 },
  ]) {
    const radial = { x: start.x - center.x, y: start.y - center.y };
    assert.equal(
      breaksResizeLock(start, center, {
        x: start.x + radial.x * 0.5,
        y: start.y + radial.y * 0.5 + 4,
      }),
      false,
    );
    assert.equal(
      breaksResizeLock(start, center, {
        x: start.x - radial.x * 0.3 + 4,
        y: start.y - radial.y * 0.3,
      }),
      false,
    );
    assert.equal(
      breaksResizeLock(start, center, { x: start.x + 3, y: start.y + 6 }),
      false,
    );
    assert.equal(
      breaksResizeLock(start, center, { x: start.x, y: start.y + 40 }),
      true,
    );
    // The same radial/tangential distinction also works after rotating the layer.
    assert.equal(
      breaksResizeLock(start, center, {
        x: start.x - radial.y * 0.4,
        y: start.y + radial.x * 0.4,
      }),
      true,
    );
  }
  assert.equal(
    breaksResizeLock({ x: 250, y: 110 }, center, { x: 250, y: 150 }),
    true,
    "a vertical pull also unlocks common portrait overlays",
  );
});

test("upright snap has a narrow entry zone and releases without jitter", () => {
  assert.deepEqual(snapUpright(2.9, false), { angle: 0, snapped: true });
  assert.deepEqual(snapUpright(-2.9, false), { angle: 0, snapped: true });
  assert.equal(snapUpright(4, false).snapped, false);
  assert.deepEqual(snapUpright(4.9, true), { angle: 0, snapped: true });
  assert.equal(snapUpright(5.1, true).snapped, false);
  assert.deepEqual(snapUpright(359, false), { angle: 0, snapped: true });
  assert.equal(snapUpright(270, true).angle, -90);
});
