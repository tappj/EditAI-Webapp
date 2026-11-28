import test from "node:test";
import assert from "node:assert/strict";
import {
  temporalEvidence,
  audioEvidence,
} from "../lib/editor/reference-metrics.ts";
import {
  fitReferenceText,
  SOCIAL_TEXT_AREA,
} from "../lib/editor/reference-placement.ts";
import {
  newDocument,
  newSegment,
  captions,
  duration,
  textTiming,
  applyOperations,
} from "../lib/editor/model.ts";
import {
  validateChatRequest,
  validateChatReply,
  chatOperationKinds,
} from "../lib/ios/chat.mjs";
function fixture() {
  const d = newDocument();
  d.sources = [
    {
      id: crypto.randomUUID(),
      name: "speech.mp4",
      duration: 10,
      width: 720,
      height: 1280,
      kind: "video",
      mime: "video/mp4",
    },
  ];
  d.segments = [newSegment(0, 10)];
  d.words = [
    { id: "stable:0", clip: 0, start: 2, end: 3, text: "A phrase" },
    { id: "stable:1", clip: 0, start: 5, end: 6, text: "Another phrase" },
  ];
  return captions(d);
}
test("localized speed beats preserve source coverage, words, outside rates and anchored captions atomically", () => {
  const d = fixture(),
    id = d.segments[0].id,
    snapshot = structuredClone(d);
  const out = applyOperations(d, [
    { kind: "speedRange", target: id, start: 5, end: 6, value: 0.75 },
    { kind: "speedRange", target: id, start: 2, end: 3, value: 1.2 },
  ]);
  assert.deepEqual(
    out.segments.map((s) => [s.start, s.end, s.speed]),
    [
      [0, 2, 1],
      [2, 3, 1.2],
      [3, 5, 1],
      [5, 6, 0.75],
      [6, 10, 1],
    ],
  );
  assert.deepEqual(out.words, d.words);
  assert.ok(Math.abs(duration(out) - (8 + 1 / 1.2 + 1 / 0.75)) < 1e-8);
  assert.ok(
    out.texts.every((t) => textTiming(out, t).end > textTiming(out, t).start),
  );
  for (const op of [
    { start: -1, end: 2, value: 1 },
    { start: 1, end: 20, value: 1 },
    { start: 1, end: 2, value: 5 },
    { start: 0.05, end: 2, value: 1 },
    { start: 1, end: 1.05, value: 1 },
  ]) {
    assert.throws(() =>
      applyOperations(d, [{ kind: "speedRange", target: id, ...op }]),
    );
    assert.deepEqual(d, snapshot);
  }
});
test("range rejection leaves the exact supplied document untouched", () => {
  const d = fixture(),
    snapshot = structuredClone(d);
  assert.throws(() =>
    applyOperations(d, [
      {
        kind: "speedRange",
        target: d.segments[0].id,
        start: 2,
        end: 3,
        value: 0.75,
      },
      { kind: "speedRange", target: "missing", start: 4, end: 5, value: 0.75 },
    ]),
  );
  assert.deepEqual(d, snapshot);
});
test("reference numeric evidence distinguishes quiet audio from speech and candidate cuts from motion", () => {
  const pcm = new Float32Array(1000).fill(0.2);
  pcm.fill(0, 200, 600);
  const a = audioEvidence(pcm, 1000);
  assert.equal(a.status, "measured");
  assert.equal(a.quietWindows.length, 1);
  assert.ok(Math.abs(a.quietWindows[0].end - 0.6) < 1e-8);
  assert.equal(a.quietWindows[0].start, 0.2);
  assert.equal(audioEvidence(new Float32Array(1000), 1000).status, "silent");
  const t = temporalEvidence(
    Array.from({ length: 31 }, (_, i) => ({
      time: i / 10,
      change: i === 10 || i === 20 ? 0.8 : 0.02,
    })),
    3,
  );
  assert.deepEqual(t.sceneChangeCandidates, [1, 2]);
  assert.equal(t.medianShotSeconds, 1);
  assert.equal(t.sampleInterval, 0.1);
});
test("matching fonts supports genuine weight patches and bounded temporal metadata, retaining older clients", () => {
  const d = fixture(),
    request: any = {
      mode: "chat",
      prompt: "Match this reference",
      messages: [],
      document: {
        segments: d.segments.map((s) => ({ ...s, source: s.sourceIndex })),
      },
      sourceDurations: [10],
      supportedOperations: chatOperationKinds,
      reference: {
        kind: "video",
        name: "example.mp4",
        width: 720,
        height: 1280,
        duration: 3,
        safePlacement: true,
        textObservations: [
          {
            time: 1,
            lines: ["Bright story"],
            left: 0.2,
            top: 0.2,
            right: 0.8,
            bottom: 0.3,
            confidence: 95,
            strokeWidth: 0.01,
          },
        ],
        frames: [
          { base64JPEG: "/9j/", timeSeconds: 1, role: "detail" },
          {
            base64JPEG: "/9j/",
            timeSeconds: 2,
            role: "motion",
            times: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
          },
        ],
        temporal: temporalEvidence(
          [
            { time: 0, change: 0 },
            { time: 3, change: 0.5 },
          ],
          3,
        ),
        audio: audioEvidence(new Float32Array(100), 100),
      },
    };
  assert.equal(validateChatRequest(request), request);
  const reply = {
    message: "Applied",
    generateCaptions: false,
    operations: [
      {
        kind: "captionStyle",
        target: null,
        start: null,
        end: null,
        value: null,
        text: null,
        scope: "captions",
        style: { font: "tiktokClassic", fontWeight: 700 },
        crop: null,
        media: null,
      },
    ],
  };
  validateChatReply(reply, request);
  assert.equal(applyOperations(d, reply.operations).texts[0].fontWeight, 700);
  assert.throws(() =>
    validateChatRequest({
      ...request,
      reference: {
        ...request.reference,
        temporal: {
          ...request.reference.temporal,
          sceneChangeCandidates: [9999],
        },
      },
    }),
  );
  assert.throws(() =>
    validateChatRequest({
      ...request,
      reference: {
        ...request.reference,
        frames: [
          ...request.reference.frames,
          { base64JPEG: "/9j/", role: "motion", times: [3, 2, 1] },
        ],
      },
    }),
  );
  assert.throws(() =>
    validateChatReply(
      {
        ...reply,
        operations: [{ ...reply.operations[0], kind: "speedRange" }],
      },
      { supportedOperations: ["speed"] },
    ),
  );
});
test("safe placement measures the whole styled wrapped text rather than clamping its center", () => {
  const d = fixture(),
    text = {
      ...d.texts[0],
      text: "A longer caption with a background",
      x: 0.85,
      y: 0.9,
      background: "#fff",
      outline: true,
      outlineWidth: 0.004,
      shadowBlur: 0.004,
      shadowOpacity: 0.5,
      shadowOffset: 0.002,
    };
  const ctx = {
    font: "",
    measureText(this: { font: string }, value: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] || 20);
      return { width: value.length * size * 0.52 };
    },
  } as unknown as CanvasRenderingContext2D;
  const fitted = fitReferenceText(ctx, text, 720, 1280);
  assert.ok(
    fitted.x < SOCIAL_TEXT_AREA.right && fitted.y < SOCIAL_TEXT_AREA.bottom,
  );
  assert.ok(
    (fitted.boxWidth ?? 1) <= SOCIAL_TEXT_AREA.right - SOCIAL_TEXT_AREA.left,
  );
  assert.equal(text.x, 0.85);
  assert.equal(fitted.text, text.text);
  assert.equal(fitted.outlineColor, text.outlineColor);
});

test("reference matching preserves distinct measured title and caption heights", () => {
  const d = fixture();
  const ctx = {
    font: "",
    measureText(this: { font: string }, s: string) {
      return {
        width:
          s.length *
          Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] || 20) *
          0.5,
      };
    },
  } as unknown as CanvasRenderingContext2D;
  for (const y of [0.29, 0.77]) {
    const t = {
      ...d.texts[0],
      text: "Reference text",
      x: 0.5,
      y,
      size: 0.05,
      boxWidth: 0.8,
    };
    const fitted = fitReferenceText(ctx, t, 720, 1280);
    assert.equal(fitted.y, y);
    assert.equal(fitted.x, 0.5);
  }
});

test("reference zoom beats are source-anchored, preserve speech and reject invalid batches atomically", async () => {
  const { cameraZoomAt } = await import("../lib/editor/motion.ts");
  const d = fixture(),
    original = structuredClone(d),
    id = d.segments[0].id;
  const edited = applyOperations(d, [
    {
      kind: "zoomRange",
      target: id,
      start: 2,
      end: 4,
      value: 1.2,
      text: "pulse",
    },
  ]);
  assert.deepEqual(
    edited.segments.map((s) => [s.start, s.end, s.speed]),
    [
      [0, 2, 1],
      [2, 4, 1],
      [4, 10, 1],
    ],
  );
  assert.deepEqual(edited.words, d.words);
  assert.equal(duration(edited), duration(d));
  const zoom = edited.segments[1].appearance.cameraZoom;
  assert.equal(cameraZoomAt(zoom, 2), 1);
  assert.equal(cameraZoomAt(zoom, 3), 1.2);
  assert.equal(cameraZoomAt(zoom, 4), 1);
  const retimed = applyOperations(edited, [
    { kind: "speed", target: edited.segments[1].id, value: 0.5 },
  ]);
  assert.equal(cameraZoomAt(retimed.segments[1].appearance.cameraZoom, 3), 1.2);
  assert.throws(() =>
    applyOperations(d, [
      {
        kind: "zoomRange",
        target: id,
        start: 2,
        end: 4,
        value: 1.2,
        text: "in",
      },
      {
        kind: "zoomRange",
        target: "missing",
        start: 6,
        end: 7,
        value: 1.2,
        text: "out",
      },
    ]),
  );
  assert.throws(() =>
    applyOperations(d, [
      {
        kind: "zoomRange",
        target: id,
        start: 2,
        end: 4,
        value: 10,
        text: "pulse",
      },
    ]),
  );
  assert.deepEqual(d, original);
});

test("chat accepts the editor's image overlays and source rounding tolerance without accepting real overruns", () => {
  const d = fixture();
  d.sources[0].duration = 120;
  d.segments[0].end = 120.005;
  d.sources.push({
    ...d.sources[0],
    id: crypto.randomUUID(),
    name: "photo.png",
    duration: 10,
    kind: "image",
    mime: "image/png",
  });
  d.overlays = [
    {
      id: crypto.randomUUID(),
      sourceIndex: 1,
      sourceStart: 0,
      start: 0,
      end: 120,
      x: 0.5,
      y: 0.5,
      width: 0.3,
      opacity: 1,
    },
  ];
  const request: any = {
    mode: "chat",
    prompt: "Add captions",
    messages: [],
    sourceDurations: d.sources.map((s) => s.duration),
    document: {
      ...d,
      segments: d.segments.map((s) => ({ ...s, source: s.sourceIndex })),
      overlays: d.overlays.map((o) => ({
        start: o.start,
        segment: {
          id: o.id,
          source: 1,
          start: 0,
          end: 120,
          speed: 1,
          volume: 0,
        },
      })),
    },
  };
  const snapshot = structuredClone(request);
  assert.equal(validateChatRequest(request), request);
  assert.deepEqual(request, snapshot);
  request.document.segments[0].end = 120.02;
  assert.throws(() => validateChatRequest(request), /Invalid timeline/);
  request.document.segments[0].end = 120;
  request.document.sources[1].kind = "video";
  request.sourceDurations[1] = 119.97;
  assert.doesNotThrow(() => validateChatRequest(request));
  request.sourceDurations[1] = 119.9;
  assert.throws(() => validateChatRequest(request), /Invalid media track/);
});
