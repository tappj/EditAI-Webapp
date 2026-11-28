import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTranscript,
  TranscriptTimingError,
  hasAudioSignal,
} from "../lib/editor/transcript.ts";
import { wavFile } from "../lib/editor/voice.ts";

test("speech words retain exact valid timings and permit genuine overlaps", () => {
  const words = [
    { word: "Hello", start: 0.2, end: 0.8 },
    { word: "there", start: 0.7, end: 1 },
  ];
  assert.deepEqual(normalizeTranscript({ words }, 2), [
    { text: "Hello", start: 0.2, end: 0.8 },
    { text: "there", start: 0.7, end: 1 },
  ]);
});
test("timed text aliases from transcript adapters preserve genuine intervals", () => {
  assert.deepEqual(
    normalizeTranscript({ words: [{ text: "Hello", start: 0, end: 0.5 }] }, 1),
    [{ text: "Hello", start: 0, end: 0.5 }],
  );
});
test("zero-length ASR words and punctuation retain recognized content on measured neighboring intervals", () => {
  const words = [
    { word: "I", start: 0, end: 0 },
    { word: "am", start: 0, end: 0.3 },
    { word: "here", start: 0.3, end: 0.7 },
    { word: "!", start: 0.7, end: 0.7 },
  ];
  assert.deepEqual(normalizeTranscript({ words }, 1), [
    { text: "I am", start: 0, end: 0.3 },
    { text: "here!", start: 0.3, end: 0.7 },
  ]);
});
test("bounded provider jitter is conservatively bundled without inventing times or reordering text", () => {
  assert.deepEqual(
    normalizeTranscript(
      {
        words: [
          { word: "we", start: 0.5, end: 1 },
          { word: "are", start: 0.48, end: 0.9 },
          { word: "ready", start: 1, end: 1.4 },
        ],
      },
      2,
    ),
    [
      { text: "we are", start: 0.48, end: 1 },
      { text: "ready", start: 1, end: 1.4 },
    ],
  );
  assert.deepEqual(
    normalizeTranscript(
      { words: [{ word: "Hi", start: "-0.01s", end: "1.04s" }] },
      1,
    ),
    [{ text: "Hi", start: 0, end: 1 }],
  );
});
test("usable measured segments recover captions when word alignment is unavailable", () => {
  assert.deepEqual(
    normalizeTranscript(
      {
        words: [{ word: "Hello", start: 0, end: 0 }],
        segments: [{ text: "Hello there", start: 0.1, end: 1.2 }],
      },
      2,
    ),
    [{ text: "Hello there", start: 0.1, end: 1.2 }],
  );
});
test("corrupt or unrelated alignment fails atomically instead of dropping words or fabricating source time", () => {
  for (const words of [
    [{ word: "Hello", start: NaN, end: 1 }],
    [{ word: "Hello", start: null, end: 1 }],
    [{ word: "Hello", start: 0, end: 20 }],
    [{ word: "Hello", start: 0.4, end: 0.2 }],
    [
      { word: "Hello", start: 0, end: 0.1 },
      { word: "lost", start: 1, end: 1 },
    ],
    [
      { word: "later", start: 1, end: 2 },
      { word: "earlier", start: 0, end: 0.5 },
    ],
  ])
    assert.throws(
      () => normalizeTranscript({ words }, 3),
      TranscriptTimingError,
    );
  assert.throws(
    () => normalizeTranscript({ text: "Speech without any timing" }, 3),
    TranscriptTimingError,
  );
  assert.deepEqual(normalizeTranscript({ words: [], text: "" }, 3), []);
});
test("digital silence is detected while the quietest nonzero PCM speech remains eligible", async () => {
  assert.equal(
    await hasAudioSignal(wavFile(new Float32Array(16000), 16000, "silent.wav")),
    false,
  );
  assert.equal(
    await hasAudioSignal(
      wavFile(new Float32Array([0, 1 / 32768, 0]), 16000, "quiet.wav"),
    ),
    true,
  );
  assert.equal(await hasAudioSignal(new Blob(["unknown format"])), true);
});
