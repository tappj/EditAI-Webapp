import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/ocr", { recursive: true });
await copyFile(
  "node_modules/tesseract.js/dist/worker.min.js",
  "public/ocr/worker.min.js",
);
// LSTM-only engine, with browser-selected SIMD/relaxed-SIMD and portable fallback.
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"])
  for (const ext of ["wasm.js", "wasm"]) {
    const name = `tesseract-core-${variant}.${ext}`;
    await copyFile(
      "node_modules/tesseract.js-core/" + name,
      "public/ocr/" + name,
    );
  }
await copyFile(
  "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
  "public/ocr/eng.traineddata.gz",
);
