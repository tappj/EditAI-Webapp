import test from "node:test";
import assert from "node:assert/strict";
import {
  editaiMinutesPerVideo,
  shortTime,
  timeSavings,
  weeklyVideoEstimate,
} from "../lib/editor/time-savings.ts";

test("five-minute estimate uses video volume and returns exact minutes without negative savings", () => {
  assert.equal(editaiMinutesPerVideo, 5);
  const result = timeSavings(20, 4);
  assert.equal(result.editaiMinutes, 85);
  assert.equal(result.savedMinutes, 1115);
  assert.equal(
    result.editaiMinutes + result.savedMinutes,
    result.originalMinutes,
  );
  assert.equal(shortTime(result.savedMinutes), "18h 35m");
  assert.equal(shortTime(result.editaiMinutes), "1h 25m");
  assert.equal(timeSavings(1, 7).savedMinutes, 0);
  assert.equal(timeSavings(0, 4).editaiMinutes, 0);
  assert.equal(timeSavings(NaN, NaN).originalMinutes, 0);
  assert.equal(timeSavings(999, 4).editingHours, 170);
  assert.equal(weeklyVideoEstimate("3 to 5 a week", "Every day"), 4);
  assert.equal(weeklyVideoEstimate(undefined, "Every day"), 7);
  assert.equal(weeklyVideoEstimate(undefined, "Weekly"), 1);
});
