import test from "node:test";
import assert from "node:assert/strict";
import { firstCutProgress } from "../lib/editor/job-progress.ts";
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
