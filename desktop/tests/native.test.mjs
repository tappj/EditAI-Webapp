import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  access,
  rename,
  copyFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { NativeVideo, runBinary } from "../native-video.mjs";
import { LocalStore } from "../local-store.mjs";
import {
  newDocument,
  newSegment,
  applyOperations,
} from "../../lib/editor/model.ts";
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
    await t.test(
      "new imports stay playable when the selected original moves",
      async () => {
        const selected = join(directory, "selected.mp4");
        const moved = join(directory, "moved.mp4");
        const imported = randomUUID();
        await copyFile(source, selected);
        const media = await store.importFile(imported, selected, "video/mp4");
        await rename(selected, moved);
        assert.equal(media.size, (await readFile(source)).length);
        assert.deepEqual(
          await readFile(store.path(imported)),
          await readFile(moved),
        );
        const managedPath = store.path(imported);
        store.remove([imported]);
        await assert.rejects(access(managedPath));
        await access(moved);
      },
    );
    await t.test(
      "missing audio is identified without confusing it with a decode failure",
      async () => {
        const silent = join(directory, "no-audio.mp4"),
          silentId = randomUUID();
        await runBinary(ffmpeg, [
          "-v",
          "error",
          "-i",
          source,
          "-map",
          "0:v:0",
          "-c:v",
          "copy",
          "-an",
          silent,
        ]);
        store.retain(silentId, silent, "video/mp4");
        await assert.rejects(
          native.audio(silentId, 0, 1),
          /^Error: No audio detected\.$/,
        );
        store.remove([silentId]);
      },
    );
    await t.test("native WAV extraction preserves real audio", async () => {
      const bytes = Buffer.from(await native.audio(id, 1, 2));
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.ok(bytes.length > 63000 && bytes.length < 65000);
      assert.ok(bytes.some((n) => n > 128));
    });
    await t.test(
      "localized reference speed beats render real source audio and restore surrounding rates",
      async () => {
        const base = structuredClone(doc);
        base.segments[0].start = 0;
        base.segments[0].end = 4;
        base.segments[0].speed = 1;
        const matched = applyOperations(base, [
          {
            kind: "speedRange",
            target: base.segments[0].id,
            start: 1,
            end: 2,
            value: 0.75,
          },
        ]);
        const job = await native.begin(matched, 320, 180, 30);
        const output = await native.finish(job.id);
        assert.equal(output.frames, 130);
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
        assert.ok(
          Math.abs(Number(probe.format.duration) - (3 + 1 / 0.75)) < 0.15,
        );
        assert.ok(probe.streams.some((s) => s.codec_name === "aac"));
        const stats = (
          await runBinary(ffmpeg, [
            "-i",
            destination,
            "-vn",
            "-af",
            "volumedetect",
            "-f",
            "null",
            "-",
          ])
        ).error;
        assert.match(stats, /mean_volume: -[0-9.]+ dB/);
        assert.deepEqual(
          matched.segments.map((s) => s.speed),
          [1, 0.75, 1],
        );
      },
    );
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
    await t.test(
      "primary fades fit short retimed clips and animated clips use the compositor",
      async () => {
        const faded = structuredClone(doc);
        faded.segments[0].fadeIn = 3;
        faded.segments[0].fadeOut = 3;
        assert.equal(native.canRenderNative(faded), true);
        for (const key of ["animationIn", "animationOut"]) {
          const animated = structuredClone(faded);
          animated.segments[0].appearance[key] = "pop";
          assert.equal(native.canRenderNative(animated), false);
        }
        const zoomed = structuredClone(faded);
        zoomed.segments[0].appearance.cameraZoom = { start: 0, end: 1, scale: 1.2, mode: "pulse" };
        assert.equal(native.canRenderNative(zoomed), false);
        const job = await native.begin(faded, 320, 180, 30);
        assert.equal(job.mode, "native");
        await native.finish(job.id);
        const rms = async (start, end) => {
          const result = await runBinary(ffmpeg, [
            "-v",
            "info",
            "-i",
            destination,
            "-vn",
            "-af",
            `atrim=start=${start}:end=${end},volumedetect`,
            "-f",
            "null",
            "-",
          ]);
          const match = /mean_volume: (-?[\d.]+) dB/.exec(result.error);
          assert.ok(match);
          return Number(match[1]);
        };
        const first = await rms(0.02, 0.1),
          center = await rms(0.45, 0.55),
          last = await rms(0.9, 0.98);
        assert.ok(
          center - first > 12,
          `entrance must rise in rendered seconds: ${first} -> ${center}`,
        );
        assert.ok(
          center - last > 12,
          `exit must fall in rendered seconds: ${center} -> ${last}`,
        );
        assert.ok(
          center > -25,
          "normalizing two long fades must reach full gain",
        );
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
      composite.segments[0].volume = 0;
      composite.overlays = [
        {
          id: randomUUID(),
          sourceIndex: 0,
          sourceStart: 0,
          start: 0,
          end: 1,
          speed: 2,
          volume: 0.8,
          x: 0.5,
          y: 0.5,
          width: 0.5,
          opacity: 1,
        },
      ];
      composite.audio = [
        {
          id: randomUUID(),
          sourceIndex: 0,
          sourceStart: 1,
          start: 0,
          end: 1,
          speed: 0.5,
          volume: 0.4,
          lane: 0,
          fadeIn: 0.05,
          fadeOut: 0.05,
        },
      ];
      const job = await native.begin(composite, 320, 180, 30);
      assert.equal(job.mode, "frames");
      for (let i = 0; i < 30; i++) await native.frame(job.id, frame);
      const result = await native.finish(job.id);
      assert.equal(result.frames, 30);
      const audio = await runBinary(ffmpeg, [
        "-v",
        "info",
        "-i",
        destination,
        "-vn",
        "-af",
        "volumedetect",
        "-f",
        "null",
        "-",
      ]);
      const mean = /mean_volume: (-?[\d.]+) dB/.exec(audio.error);
      assert.ok(
        mean && Number(mean[1]) > -50,
        "retimed overlay and imported audio must be audible with primary muted",
      );
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
