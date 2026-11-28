import test from "node:test";
import assert from "node:assert/strict";
import {
  finalQuietCuts,
  recordSpeechRegions,
  type AudioRange,
} from "../lib/editor/audio-final-check.ts";
import {
  newDocument,
  newSegment,
  applyAutomaticCuts,
  validate,
  type Document,
} from "../lib/editor/model.ts";
import { removeUnusedSource } from "../lib/editor/library.ts";

function fixture(length = 6) {
  const doc = newDocument();
  doc.sources = [
    {
      id: crypto.randomUUID(),
      name: "source.mp4",
      duration: length,
      width: 320,
      height: 180,
      kind: "video",
      mime: "video/mp4",
    },
  ];
  doc.segments = [newSegment(0, length)];
  doc.words = [
    { id: "stable-first", clip: 0, start: 0.2, end: 0.7, text: "Hello" },
    {
      id: "stable-last",
      clip: 0,
      start: length - 0.8,
      end: length - 0.3,
      text: "again.",
    },
  ];
  return doc;
}

function rangesClose(actual: AudioRange[], expected: AudioRange[]) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) {
    assert.ok(
      Math.abs(actual[index].start - expected[index].start) < 1e-9,
      `Unexpected cut start at ${index}`,
    );
    assert.ok(
      Math.abs(actual[index].end - expected[index].end) < 1e-9,
      `Unexpected cut end at ${index}`,
    );
  }
}

function covers(doc: Document, start: number, end: number, clip = 0) {
  return doc.segments.some(
    (segment) =>
      segment.sourceIndex === clip &&
      segment.start <= start + 1e-9 &&
      segment.end >= end - 1e-9,
  );
}

test("final acoustic verification subtracts the whole timed-word and independent-speech union without changing inputs", () => {
  const candidates = [
    { start: 3, end: 8 },
    { start: -2, end: 4 },
    { start: 9, end: 12 },
    { start: 2, end: 2 },
    { start: NaN, end: 4 },
  ];
  const words = [
    { start: 1, end: 2 },
    { start: 5.35, end: 6 },
  ];
  const independentlyDetected = [
    { start: 1.8, end: 2.5 },
    { start: 5, end: 5.4 },
    { start: 9.8, end: 10.4 },
  ];
  const protectedRanges = [...words, ...independentlyDetected];
  const before = structuredClone({ candidates, protectedRanges });
  const cuts = finalQuietCuts(10, candidates, protectedRanges);
  rangesClose(cuts, [
    { start: 0, end: 0.94 },
    { start: 2.56, end: 4.94 },
    { start: 6.06, end: 8 },
    { start: 9, end: 9.74 },
  ]);
  for (const cut of cuts) {
    assert.ok(cut.start >= 0 && cut.end <= 10);
    for (const span of protectedRanges)
      assert.ok(
        cut.end <= span.start || cut.start >= span.end,
        "A quiet cut must not overlap either speech detector or a timed word",
      );
  }
  assert.deepEqual({ candidates, protectedRanges }, before);
});

test("missing transcript or VAD evidence never creates quiet candidates and tiny residual gaps stay intact", () => {
  assert.deepEqual(finalQuietCuts(5, [], []), []);
  assert.deepEqual(finalQuietCuts(5, [], [{ start: 1, end: 2 }]), []);
  assert.deepEqual(
    finalQuietCuts(1, [{ start: 0, end: 1 }], [{ start: 0.21, end: 0.8 }]),
    [],
  );
  assert.deepEqual(
    finalQuietCuts(5, [{ start: 0, end: 5 }], [{ start: -1, end: 6 }]),
    [],
  );
  for (const length of [0, -1, NaN, Infinity])
    assert.deepEqual(finalQuietCuts(length, [{ start: 0, end: 5 }], []), []);
});

test("low-level speech omitted by ASR survives quiet cuts and subsequent measured word-edge trims", () => {
  const doc = fixture(3);
  doc.words = [
    {
      id: "stable-recognized-word",
      clip: 0,
      start: 0.8,
      end: 1.0,
      text: "Yes",
    },
  ];
  doc.quietCutVersion = 7;
  doc.wordAudioBounds = {
    "stable-recognized-word": { start: 0.85, end: 1.02 },
  };
  doc.speechRegions = [
    { clip: 0, start: 0.2, end: 0.35 },
    { clip: 0, start: 1.4, end: 1.55 },
  ];
  const quiet = finalQuietCuts(
    3,
    [
      { start: 0, end: 0.7 },
      { start: 1.2, end: 3 },
    ],
    [...doc.words, ...doc.speechRegions],
  );
  doc.quietCuts = quiet.map((cut) => ({ clip: 0, ...cut }));
  const original = structuredClone(doc);
  const result = applyAutomaticCuts(doc, doc.quietCuts);
  assert.ok(
    covers(result, 0.2, 0.35),
    "Speech preceding the first recognized word must survive",
  );
  assert.ok(
    covers(result, 1.4, 1.55),
    "Speech following the last recognized word must survive",
  );
  assert.ok(covers(result, 0.85, 1.0));
  assert.deepEqual(result.words, original.words);
  assert.deepEqual(result.speechRegions, original.speechRegions);
  assert.deepEqual(doc, original);
});

test("independent speech protects a captionless short island even when cached quiet evidence overlaps it", () => {
  const doc = fixture();
  const cuts = [
    { clip: 0, start: 1.3, end: 2 },
    { clip: 0, start: 2.18, end: 4.8 },
  ];
  doc.quietCutVersion = 7;
  doc.quietCuts = [{ clip: 0, start: 2, end: 2.18 }];
  doc.speechRegions = [{ clip: 0, start: 2.02, end: 2.15 }];
  const original = structuredClone(doc);
  const result = applyAutomaticCuts(doc, cuts);
  assert.ok(covers(result, 2.02, 2.15));
  assert.ok(
    result.segments.some(
      (segment) => segment.start === 2 && segment.end === 2.18,
    ),
  );
  assert.deepEqual(
    result.words.map((word) => word.id),
    ["stable-first", "stable-last"],
  );
  assert.deepEqual(doc, original);
});

test("captionless short islands require complete measured quiet coverage to authorize removal", () => {
  const cuts = [
    { clip: 0, start: 1.3, end: 2 },
    { clip: 0, start: 2.18, end: 4.8 },
  ];
  for (const speechRegions of [undefined, []]) {
    for (const quietCuts of [
      undefined,
      [],
      [{ clip: 0, start: 2, end: 2.1 }],
    ]) {
      const doc = fixture();
      doc.quietCutVersion = 7;
      doc.speechRegions = speechRegions;
      doc.quietCuts = quietCuts;
      const result = applyAutomaticCuts(doc, cuts);
      assert.ok(
        covers(result, 2, 2.18),
        "No VAD match or incomplete quiet coverage is not proof of silence",
      );
    }
  }
  const confirmed = fixture();
  confirmed.quietCutVersion = 7;
  confirmed.speechRegions = [];
  confirmed.quietCuts = [{ clip: 0, start: 2, end: 2.18 }];
  const result = applyAutomaticCuts(confirmed, cuts);
  assert.ok(
    !result.segments.some((segment) => segment.start < 2.18 && segment.end > 2),
  );
  assert.deepEqual(result.words, confirmed.words);
});

test("recorded speech regions preserve chunk source offsets, merge overlaps and retain other clips", () => {
  const doc = fixture();
  doc.sources.push({
    ...doc.sources[0],
    id: crypto.randomUUID(),
    name: "long-source.mp4",
    duration: 240,
  });
  doc.speechRegions = [{ clip: 0, start: 0.2, end: 0.5 }];
  const ranges = [
    { start: 100.5, end: 101 },
    { start: 100.8, end: 101.7 },
    { start: -1, end: 0.2 },
    { start: 239.8, end: 245 },
  ];
  const originalRanges = structuredClone(ranges);
  const originalWords = structuredClone(doc.words);
  recordSpeechRegions(doc, 1, ranges);
  recordSpeechRegions(doc, 1, [{ start: 101.6, end: 102.2 }]);
  assert.deepEqual(doc.speechRegions, [
    { clip: 0, start: 0.2, end: 0.5 },
    { clip: 1, start: 0, end: 0.2 },
    { clip: 1, start: 100.5, end: 102.2 },
    { clip: 1, start: 239.8, end: 240 },
  ]);
  const recorded = structuredClone(doc.speechRegions);
  recordSpeechRegions(doc, 1, undefined);
  recordSpeechRegions(doc, 1, []);
  recordSpeechRegions(doc, 2, [{ start: 0, end: 1 }]);
  assert.deepEqual(doc.speechRegions, recorded);
  assert.deepEqual(ranges, originalRanges);
  assert.deepEqual(doc.words, originalWords);
  assert.deepEqual(
    validate(JSON.parse(JSON.stringify(doc))).speechRegions,
    recorded,
  );
});

test("project validation rejects malformed or non-source-anchored speech evidence", () => {
  const base = fixture();
  assert.doesNotThrow(() => validate(base));
  for (const regions of [
    null,
    {},
    [null],
    [{ clip: 0.5, start: 0, end: 1 }],
    [{ clip: -1, start: 0, end: 1 }],
    [{ clip: 1, start: 0, end: 1 }],
    [{ clip: 0, start: -0.1, end: 1 }],
    [{ clip: 0, start: 5, end: 6.2 }],
    [{ clip: 0, start: 1, end: 1 }],
    [{ clip: 0, start: 2, end: 1 }],
    [{ clip: 0, start: NaN, end: 1 }],
    [{ clip: 0, start: 0, end: Infinity }],
    [{ clip: 0, end: 1 }],
  ]) {
    const doc = structuredClone(base);
    doc.speechRegions = regions as Document["speechRegions"];
    assert.throws(() => validate(doc), /speech/i);
  }
  base.speechRegions = [{ clip: 0, start: 0, end: 6 }];
  assert.doesNotThrow(() => validate(base));
});

test("removing unused media remaps speech evidence without rewriting surviving word identities", () => {
  const doc = fixture();
  doc.sources.push({
    ...doc.sources[0],
    id: crypto.randomUUID(),
    name: "kept.mp4",
  });
  doc.sources.push({
    ...doc.sources[0],
    id: crypto.randomUUID(),
    name: "later.mp4",
  });
  doc.segments[0].sourceIndex = 1;
  doc.words = [
    {
      id: "removed-original-id",
      clip: 0,
      start: 0.2,
      end: 0.5,
      text: "unused",
    },
    { id: "kept-original-id", clip: 1, start: 0.2, end: 0.5, text: "Hello" },
    { id: "later-original-id", clip: 2, start: 1, end: 1.3, text: "later" },
  ];
  doc.speechRegions = [
    { clip: 0, start: 0.1, end: 0.6 },
    { clip: 1, start: 0.1, end: 0.6 },
    { clip: 2, start: 0.9, end: 1.4 },
  ];
  const original = structuredClone(doc);
  const result = removeUnusedSource(doc, 0);
  assert.deepEqual(result.speechRegions, [
    { clip: 0, start: 0.1, end: 0.6 },
    { clip: 1, start: 0.9, end: 1.4 },
  ]);
  assert.deepEqual(
    result.words.map((word) => ({ id: word.id, clip: word.clip })),
    [
      { id: "kept-original-id", clip: 0 },
      { id: "later-original-id", clip: 1 },
    ],
  );
  assert.equal(result.segments[0].sourceIndex, 0);
  assert.deepEqual(doc, original);
});
