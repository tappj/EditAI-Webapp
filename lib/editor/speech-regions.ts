let detector: Promise<import("@ricky0123/vad-web").NonRealTimeVAD> | undefined;
let queue: Promise<unknown> = Promise.resolve();
// A quick "no" or correction may be shorter than half a second. Keep short
// detections as protection; they never authorize removal of missing text.
export const MIN_SPEECH_MS = 96;
async function primeAssets() {
  await Promise.all(
    [
      "silero_vad_legacy.onnx",
      "ort-wasm-simd-threaded.mjs",
      "ort-wasm-simd-threaded.wasm",
    ].map(async (name) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(location.origin + "/speech/" + name, {
            cache: "force-cache",
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw Error("Speech asset unavailable");
          await response.arrayBuffer();
          return;
        } catch (error) {
          if (attempt) throw error;
        }
      }
    }),
  );
}
function loadDetector() {
  return (detector ??= primeAssets()
    .then(() => import("@ricky0123/vad-web"))
    .then(({ NonRealTimeVAD }) =>
      NonRealTimeVAD.new({
        modelURL: location.origin + "/speech/silero_vad_legacy.onnx",
        ortConfig: (ort) => {
          ort.env.wasm.wasmPaths = location.origin + "/speech/";
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.proxy = false;
        },
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        redemptionMs: 120,
        preSpeechPadMs: 60,
        minSpeechMs: MIN_SPEECH_MS,
      }),
    ));
}
export function warmSpeechDetector() {
  void loadDetector().catch(() => {
    detector = undefined;
  });
}
// Model and WASM are packaged with EditAI; audio never leaves this device.
export function speechRegions(
  samples: Float32Array,
  rate: number,
): Promise<{ start: number; end: number }[] | null> {
  const result = queue.then(async () => {
    try {
      const pending = loadDetector();
      const vad = await pending,
        regions = [];
      for await (const part of vad.run(samples, rate))
        regions.push({ start: part.start / 1000, end: part.end / 1000 });
      return regions.length ? regions : null;
    } catch (error) {
      console.warn(
        "Local speech analysis unavailable",
        error instanceof Error
          ? error.message.slice(0, 200)
          : "model initialization failed",
      );
      detector = undefined;
      return null;
    }
  });
  queue = result.catch(() => {});
  return result;
}
