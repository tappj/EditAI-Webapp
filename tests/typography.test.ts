import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEXT_COLORS, hexToHsv, hsvToHex } from "../lib/editor/palette.ts";
import {
  newDocument,
  newSegment,
  captions,
  validate,
} from "../lib/editor/model.ts";

test("palette and custom wheel round-trip sRGB colors including black and gray", () => {
  for (const hex of [
    ...TEXT_COLORS,
    "#123abc",
    "#000000",
    "#ffffff",
    "#787878",
  ]) {
    const { h, s, v } = hexToHsv(hex);
    assert.equal(hsvToHex(h, s, v), hex);
  }
  assert.equal(hsvToHex(0, 1, 1), "#ff0000");
  assert.equal(hsvToHex(120, 1, 1), "#00ff00");
  assert.equal(hsvToHex(240, 1, 1), "#0000ff");
});
test("bundled official TikTok Sans has genuine weight and normal-width optical axes", () => {
  const b = readFileSync(
    new URL("../public/fonts/TikTokSans-Variable.ttf", import.meta.url),
  );
  let f = 0;
  for (let i = 0; i < b.readUInt16BE(4); i++) {
    const p = 12 + i * 16;
    if (b.toString("ascii", p, p + 4) === "fvar") f = b.readUInt32BE(p + 8);
  }
  assert.ok(f, "must be a variable font, not a static face declared variable");
  const axes: Record<string, number[]> = {};
  for (let i = 0; i < b.readUInt16BE(f + 8); i++) {
    const p = f + b.readUInt16BE(f + 4) + i * b.readUInt16BE(f + 10);
    axes[b.toString("ascii", p, p + 4)] = [4, 8, 12].map(
      (o) => b.readInt32BE(p + o) / 65536,
    );
  }
  assert.deepEqual(axes.wght, [300, 300, 900]);
  assert.deepEqual(axes.wdth, [75, 100, 150]);
  assert.deepEqual(axes.opsz, [12, 36, 36]);
});
test("new captions use clear typography while legacy weights remain valid", () => {
  const d = newDocument();
  d.sources = [
    {
      id: "source",
      name: "take.mp4",
      duration: 4,
      width: 320,
      height: 180,
      kind: "video",
      mime: "video/mp4",
    },
  ];
  d.segments = [newSegment(0, 4)];
  d.words = [{ id: "source:0", clip: 0, start: 0.2, end: 1, text: "Hello" }];
  const out = captions(d);
  assert.equal(out.texts[0].fontWeight, 500);
  assert.equal(out.texts[0].outline, true);
  validate(out);
  delete out.texts[0].fontWeight;
  validate(out);
  out.texts[0].fontWeight = 950;
  assert.throws(() => validate(out), /Invalid text/);
});
