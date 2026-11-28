import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { validateChatRequest } from "../../lib/ios/chat.mjs";
import sharp from "sharp";

test("an audio-readable HEVC reference is converted instead of sending zero-size blank frames", async ({
  page,
}) => {
  test.setTimeout(180000);
  const bundle = await build({
    entryPoints: ["lib/editor/reference.ts"],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "EvaRef",
    define: {
      "import.meta.url": JSON.stringify(
        (process.env.TEST_BASE_URL || "http://127.0.0.1:5285") +
          "/reference-harness.js",
      ),
    },
    platform: "browser",
    logLevel: "silent",
  });
  await page.route("**/api/**", (r) =>
    r.fulfill({ status: 503, json: { error: "Isolated media fixture" } }),
  );
  await page.goto("/reference-inspection");
  await page.setContent('<input type="file">');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page
    .locator("input")
    .setInputFiles("outputs/eva-support/hevc-reference.mov");
  await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(
      HTMLVideoElement.prototype,
      "videoWidth",
    )!;
    let first = true;
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
      ...original,
      get() {
        if (first) {
          first = false;
          return 0;
        }
        return original.get!.call(this);
      },
    });
  });
  const ref = await page.evaluate(
    async () =>
      await (window as any).EvaRef.makeReference(
        (document.querySelector("input") as HTMLInputElement).files![0],
      ),
  );
  expect(ref.width).toBeGreaterThan(0);
  expect(ref.height).toBeGreaterThan(0);
  const detail = ref.frames.find((f: any) => f.role === "detail");
  const stats = await sharp(Buffer.from(detail.base64JPEG, "base64")).stats();
  expect(Math.max(...stats.channels.map((c) => c.stdev))).toBeGreaterThan(15);
  expect(() =>
    validateChatRequest({
      mode: "chat",
      prompt: "Add captions in this style",
      messages: [],
      sourceDurations: [5],
      document: {
        segments: [
          {
            id: crypto.randomUUID(),
            source: 0,
            start: 0,
            end: 5,
            speed: 1,
            volume: 1,
          },
        ],
      },
      reference: ref,
    }),
  ).not.toThrow();
});
