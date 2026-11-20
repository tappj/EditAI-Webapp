import test from "node:test";
import assert from "node:assert/strict";
import { wavFile } from "../lib/editor/voice.ts";
test("microphone PCM is seekable mono WAV with bounded signed samples", async () => {
  const file = wavFile(
    new Float32Array([-2, -0.5, 0, 0.5, 2]),
    48000,
    "voice.wav",
  );
  const data = await file.arrayBuffer(),
    view = new DataView(data);
  assert.equal(file.type, "audio/wav");
  assert.equal(new TextDecoder().decode(data.slice(0, 4)), "RIFF");
  assert.equal(view.getUint32(4, true), data.byteLength - 8);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(40, true), 10);
  assert.deepEqual(
    Array.from({ length: 5 }, (_, i) => view.getInt16(44 + i * 2, true)),
    [-32768, -16384, 0, 16384, 32767],
  );
});
