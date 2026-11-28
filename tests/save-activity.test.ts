import test from "node:test";
import assert from "node:assert/strict";
import {
  trackSave,
  savesInFlight,
  subscribeSaves,
} from "../lib/editor/save-activity.ts";
test("overlapping saves remain active until every queued write settles, including failures", async () => {
  let finish!: () => void, fail!: (error: Error) => void;
  const observed: boolean[] = [];
  const unsubscribe = subscribeSaves(() => observed.push(savesInFlight()));
  const first = trackSave(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const second = trackSave(
    () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
  );
  const failed = assert.rejects(second, /disk unavailable/);
  assert.equal(savesInFlight(), true);
  finish();
  await first;
  assert.equal(savesInFlight(), true);
  fail(Error("disk unavailable"));
  await failed;
  assert.equal(savesInFlight(), false);
  unsubscribe();
  assert.deepEqual(observed, [true, true, true, false]);
});
