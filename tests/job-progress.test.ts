import test from "node:test";
import assert from "node:assert/strict";
import {
  firstCutProgress,
  advanceEstimatedProgress,
} from "../lib/editor/job-progress.ts";
test("first cut progress counts completed stages and never goes backwards", () => {
  let value = 0;
  for (const n of [0, 0.2, 0.99, 0.8, 1]) {
    const next = firstCutProgress(value, n, 1, "transcribe");
    assert.ok(next >= value);
    assert.ok(next <= 1 / 3);
    value = next;
  }
  assert.equal(firstCutProgress(value, 1, 1, "edit"), 1 / 3);
  value = firstCutProgress(value, 1, 1, "save");
  assert.equal(value, 2 / 3);
  assert.equal(firstCutProgress(value, 0, 1, "transcribe"), 2 / 3);
  assert.equal(firstCutProgress(value, 1, 1, "complete"), 1);
  assert.equal(firstCutProgress(0, 1 / 2, 2, "transcribe"), 1 / 4);
});

test("display estimates keep advancing through held milestones without inventing completion", () => {
  let value = 0;
  for (let tick = 0; tick < 300; tick++) {
    const next = advanceEstimatedProgress(
      value,
      tick < 100 ? 0 : 1 / 3,
      80,
      12000,
    );
    assert.ok(next >= value);
    assert.ok(next > 0 && next < 100);
    value = next;
  }
  assert.ok(value > 70);
  assert.equal(advanceEstimatedProgress(99, 0, 600000, 12000), 99);
  assert.equal(advanceEstimatedProgress(78, 0.2, 80, 12000) >= 78, true);
  assert.equal(advanceEstimatedProgress(78, 1, 0, 12000), 100);
  assert.equal(advanceEstimatedProgress(NaN, NaN, 0, 12000), 1);
});
