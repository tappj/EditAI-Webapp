import { test } from "node:test";
import assert from "node:assert/strict";
import { textLayout } from "../lib/editor/text-layout.ts";
import type { TextLayer } from "../lib/editor/model.ts";
const ctx = {
  font: "",
  measureText(this: { font: string }, text: string) {
    const size = Number(/([\d.]+)px/.exec(this.font)![1]);
    return { width: text.length * size * 0.6 };
  },
} as unknown as CanvasRenderingContext2D;
const layer = {
  text: "without",
  size: 0.08,
  boxWidth: 0.05,
  font: "Inter",
  background: "transparent",
  outline: true,
} as TextLayer;
test("narrow automatic captions and added text preserve whole words with breathing room", () => {
  for (const kind of ["caption", "text"] as const) {
    for (const text of [
      "without",
      "semester",
      "WWW",
      "a longer caption with semester",
      "without\u00a0semester",
    ]) {
      const result = textLayout(ctx, { ...layer, kind, text }, 1080, 1920);
      for (const line of result.lines)
        assert.ok(ctx.measureText(line).width <= result.contentWidth + 0.001);
      assert.ok(result.padding >= result.size * 0.18);
      assert.equal(result.fit, 1);
    }
  }
});
test("unusually long unbroken text fits the frame uniformly without losing characters", () => {
  const text = "W".repeat(100);
  const result = textLayout(ctx, { ...layer, text }, 1080, 1920);
  assert.equal(result.lines.join(""), text);
  assert.ok(result.boxWidth * result.fit <= 1080 * 0.96 + 0.001);
  assert.ok(result.fit > 0 && result.fit < 1);
});
test("newlines and explicit height share a uniform fit for typing and rendering", () => {
  const result = textLayout(
    ctx,
    { ...layer, text: "without\nsemester", boxHeight: 0.03 },
    1080,
    1920,
  );
  assert.deepEqual(result.lines, ["without", "semester"]);
  assert.ok(
    (result.lines.length * result.lineHeight + 2 * result.padding) *
      result.fit <=
      0.03 * 1920 + 0.001,
  );
});

test("long multiline added text remains inside the frame without dropping lines", () => {
  const text = Array(100).fill("semester").join("\n");
  const result = textLayout(ctx, { ...layer, text }, 1080, 1920);
  assert.equal(result.lines.length, 100);
  assert.ok(
    (result.lines.length * result.lineHeight + result.padding * 2) *
      result.fit <=
      1920 * 0.96 + 0.001,
  );
  assert.ok(result.boxWidth * result.fit <= 1080 * 0.96 + 0.001);
});
