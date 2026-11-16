import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { NativeVideo, runBinary } from "../native-video.mjs";
import { LocalStore } from "../local-store.mjs";
import { newDocument, newSegment } from "../../lib/editor/model.ts";
const ffmpeg = resolve(
  (process.env.EDITAI_NATIVE_TEST_BIN || "desktop/bin") +
    "/ffmpeg" +
    (process.platform === "win32" ? ".exe" : ""),
);
const ffprobe = resolve(
  (process.env.EDITAI_NATIVE_TEST_BIN || "desktop/bin") +
    "/ffprobe" +
    (process.platform === "win32" ? ".exe" : ""),
);
const migrations = await Promise.all(
  [
    "0000_furry_phil_sheldon.sql",
    "0001_massive_expediter.sql",
    "0002_optimal_the_anarchist.sql",
  ].map((n) => readFile("drizzle/" + n, "utf8")),
);
await test("native media and real FFmpeg pipeline", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "editai-native-qa-"));
  const source = join(directory, "source.mp4");
  await runBinary(ffmpeg, [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x180:rate=30",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-t",
    "4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    source,
  ]);
  const store = new LocalStore(join(directory, "data"), migrations),
    id = randomUUID();
  store.retain(id, source, "video/mp4");
  const destination = join(directory, "export.mp4"),
    native = new NativeVideo({
      ffmpeg,
      ffprobe,
      store,
      chooseDestination: async () => destination,
    });
  const doc = newDocument();
  doc.sources = [
    {
      id,
      name: "source.mp4",
      kind: "video",
      duration: 4,
      width: 320,
      height: 180,
      size: 1000,
      type: "video/mp4",
    },
  ];
  doc.segments = [newSegment(0, 4)];
  doc.segments[0].start = 1;
  doc.segments[0].end = 3;
  doc.segments[0].speed = 2;
  try {
    await t.test(
      "range streaming and persistence retain external originals",
      async () => {
        const r = store.response(
          id,
          new Request("editai://app/media/" + id, {
            headers: { range: "bytes=0-99" },
          }),
        );
        assert.equal(r.status, 206);
        assert.equal((await r.arrayBuffer()).byteLength, 100);
        assert.equal(
          store.response(
            id,
            new Request("editai://app/media/" + id, {
              headers: { range: "bytes=999999999-" },
            }),
          ).status,
          416,
        );
        store.database.close();
        store.database = new (await import("node:sqlite")).DatabaseSync(
          join(directory, "data/projects.sqlite"),
        );
        assert.equal(store.media(id).id, id);
        assert.throws(() => store.path("../source.mp4"));
      },
    );
    await t.test("native WAV extraction preserves real audio", async () => {
      const bytes = Buffer.from(await native.audio(id, 1, 2));
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.ok(bytes.length > 63000 && bytes.length < 65000);
      assert.ok(bytes.some((n) => n > 128));
    });
    await t.test(
      "cuts and speed use native H264/AAC export at exact duration",
      async () => {
        const job = await native.begin(doc, 320, 180, 30);
        assert.equal(job.mode, "native");
        const result = await native.finish(job.id);
        assert.equal(result.frames, 30);
        const probe = JSON.parse(
          (
            await runBinary(ffprobe, [
              "-v",
              "error",
              "-show_streams",
              "-show_format",
              "-of",
              "json",
              destination,
            ])
          ).output,
        );
        assert.ok(Math.abs(Number(probe.format.duration) - 1) < 0.15);
        assert.ok(probe.streams.some((s) => s.codec_name === "h264"));
        assert.ok(probe.streams.some((s) => s.codec_name === "aac"));
        assert.equal(native.jobs.size, 0);
      },
    );
    await t.test("compositor PNG frames encode with audio", async () => {
      const png = join(directory, "frame.png");
      await runBinary(ffmpeg, [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:size=320x180",
        "-frames:v",
        "1",
        png,
      ]);
      const bytes = await readFile(png),
        frame = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
      const composite = structuredClone(doc);
      composite.segments[0].appearance.filter = "Warm";
      const job = await native.begin(composite, 320, 180, 30);
      assert.equal(job.mode, "frames");
      for (let i = 0; i < 30; i++) await native.frame(job.id, frame);
      const result = await native.finish(job.id);
      assert.equal(result.frames, 30);
      assert.equal(native.jobs.size, 0);
    });
    await t.test(
      "native cancellation stops work and cleans temporary files",
      async () => {
        const job = await native.begin(doc, 1920, 1080, 60);
        const finish = native.finish(job.id);
        const rejected = assert.rejects(finish);
        await native.cancel(job.id);
        await rejected;
        assert.equal(native.jobs.size, 0);
      },
    );
    await t.test(
      "playlist input cannot access other files or network",
      async () => {
        const path = join(directory, "playlist.m3u8"),
          badId = randomUUID();
        await writeFile(
          path,
          "#EXTM3U\n#EXTINF:4,\nhttps://example.invalid/media.ts\n",
        );
        store.retain(badId, path, "video/mp4");
        await assert.rejects(native.audio(badId, 0, 1));
        store.remove([badId]);
      },
    );
    await t.test(
      "removing project media never deletes user originals",
      async () => {
        store.remove([id]);
        assert.equal(store.media(id), null);
        await access(source);
      },
    );
  } finally {
    store.database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
