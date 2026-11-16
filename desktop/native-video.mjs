import { spawn } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  unlink,
  rename,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
export function runBinary(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      windowsHide: true,
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "",
      error = "";
    child.stdout.on("data", (b) => {
      output += b;
      if (output.length > 2e6) child.kill();
    });
    child.stderr.on("data", (b) => {
      error = (error + b).slice(-8000);
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve({ output, error })
        : reject(
            Error(
              "Native video processing failed. Check the source format and available disk space.",
            ),
          ),
    );
  });
}
// Reject network protocols and playlist demuxers for user-selected local files.
const localInput = [
  "-protocol_whitelist",
  "file,pipe",
  "-format_whitelist",
  "mov,matroska,webm,avi,mp3,wav,flac,ogg,aac,image2,png_pipe,jpeg_pipe,webp_pipe",
];
export class NativeVideo {
  constructor({ ffmpeg, ffprobe, store, chooseDestination }) {
    Object.assign(this, { ffmpeg, ffprobe, store, chooseDestination });
    this.jobs = new Map();
  }
  async audio(id, start, length) {
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(length) ||
      start < 0 ||
      length <= 0 ||
      length > 1800
    )
      throw Error("Invalid audio range.");
    const directory = await mkdtemp(join(tmpdir(), "editai-audio-")),
      out = join(directory, "audio.wav");
    try {
      await runBinary(this.ffmpeg, [
        "-v",
        "error",
        "-ss",
        String(start),
        ...localInput,
        "-i",
        this.store.path(id),
        "-t",
        String(length),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        out,
      ]);
      const bytes = await readFile(out);
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    } finally {
      await unlink(out).catch(() => {});
      const { rmdir } = await import("node:fs/promises");
      await rmdir(directory).catch(() => {});
    }
  }
  async normalize(bytes) {
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > 1024 ** 3)
      throw Error("Recording is too large.");
    const directory = await mkdtemp(join(tmpdir(), "editai-recording-")),
      input = join(directory, "input.webm"),
      output = join(directory, "output.webm");
    try {
      await writeFile(input, Buffer.from(bytes), { mode: 0o600 });
      await runBinary(this.ffmpeg, [
        "-v",
        "error",
        ...localInput,
        "-i",
        input,
        "-c",
        "copy",
        output,
      ]);
      const result = await readFile(output);
      return result.buffer.slice(
        result.byteOffset,
        result.byteOffset + result.byteLength,
      );
    } finally {
      await unlink(input).catch(() => {});
      await unlink(output).catch(() => {});
      const { rmdir } = await import("node:fs/promises");
      await rmdir(directory).catch(() => {});
    }
  }
  async encoder() {
    if (this.selectedEncoder) return this.selectedEncoder;
    if (process.platform === "darwin") {
      const { output } = await runBinary(this.ffmpeg, [
        "-hide_banner",
        "-encoders",
      ]);
      if (output.includes("h264_videotoolbox")) {
        try {
          await runBinary(this.ffmpeg, [
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=size=64x64:rate=1",
            "-frames:v",
            "1",
            "-c:v",
            "h264_videotoolbox",
            "-f",
            "null",
            "-",
          ]);
          return (this.selectedEncoder = "h264_videotoolbox");
        } catch {}
      }
    }
    return (this.selectedEncoder = "libx264");
  }
  canRenderNative(document) {
    return (
      !document.texts.length &&
      !document.overlays.length &&
      document.segments.every(
        ({ appearance: a }) =>
          a.filter === "Clear" &&
          a.brightness === 0 &&
          a.contrast === 1 &&
          a.saturation === 1 &&
          a.warmth === 0 &&
          a.rotation === 0 &&
          !a.flipX &&
          !a.flipY &&
          a.opacity === 1 &&
          a.crop.x === 0 &&
          a.crop.y === 0 &&
          a.crop.width === 1 &&
          a.crop.height === 1 &&
          Object.values(a.adjustments || {}).every((v) => v === 0),
      )
    );
  }
  async renderNative(job) {
    const sources = [
        ...new Set(job.document.segments.map((s) => s.sourceIndex)),
      ],
      graph = [],
      labels = [];
    for (const source of sources) {
      const indexes = job.document.segments
        .map((s, i) => (s.sourceIndex === source ? i : -1))
        .filter((i) => i >= 0);
      graph.push(
        `[${sources.indexOf(source)}:v]split=${indexes.length}` +
          indexes.map((i) => `[source${i}]`).join(""),
      );
    }
    job.document.segments.forEach((s, i) => {
      const scale =
        job.document.framing === "fill"
          ? `scale=${job.width}:${job.height}:force_original_aspect_ratio=increase,crop=${job.width}:${job.height}`
          : `scale=${job.width}:${job.height}:force_original_aspect_ratio=decrease,pad=${job.width}:${job.height}:(ow-iw)/2:(oh-ih)/2:color=0x101216`;
      graph.push(
        `[source${i}]trim=start=${s.start}:end=${s.end},setpts=(PTS-STARTPTS)/${s.speed},${scale},setsar=1,fps=${job.fps}[part${i}]`,
      );
      labels.push(`[part${i}]`);
    });
    graph.push(labels.join("") + `concat=n=${labels.length}:v=1:a=0[rendered]`);
    await runBinary(
      this.ffmpeg,
      [
        "-v",
        "error",
        ...sources.flatMap((source) => [
          ...localInput,
          "-hwaccel",
          "auto",
          "-i",
          this.store.path(job.document.sources[source].id),
        ]),
        "-filter_complex",
        graph.join(";"),
        "-map",
        "[rendered]",
        "-an",
        "-c:v",
        job.encoder,
        ...(job.encoder === "libx264"
          ? ["-preset", "veryfast", "-crf", "20"]
          : ["-b:v", "12M"]),
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        job.video,
      ],
      { signal: job.controller.signal },
    );
    job.frames = Math.ceil(
      job.document.segments.reduce(
        (sum, s) => sum + (s.end - s.start) / s.speed,
        0,
      ) * job.fps,
    );
  }
  async begin(document, width, height, fps) {
    if (this.jobs.size)
      throw Error("Finish or cancel the current export first.");
    if (
      ![24, 30, 60].includes(fps) ||
      ![width, height].every(
        (n) => Number.isInteger(n) && n >= 2 && n <= 8192 && n % 2 === 0,
      )
    )
      throw Error("Invalid export dimensions.");
    const destination = await this.chooseDestination();
    if (!destination) throw Error("Export cancelled.");
    const id = randomUUID(),
      directory = await mkdtemp(join(tmpdir(), "editai-export-")),
      video = join(directory, "video.mp4"),
      encoder = await this.encoder();
    if (this.canRenderNative(document)) {
      this.jobs.set(id, {
        id,
        directory,
        video,
        destination,
        document,
        fps,
        width,
        height,
        frames: 0,
        encoder,
        native: true,
        controller: new AbortController(),
      });
      return { id, mode: "native" };
    }
    const args = [
      "-v",
      "error",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-framerate",
      String(fps),
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      encoder,
      ...(encoder === "libx264"
        ? ["-preset", "veryfast", "-crf", "20"]
        : ["-b:v", "12M"]),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      video,
    ];
    const process = spawn(this.ffmpeg, args, {
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true,
    });
    process.stdin.on("error", () => {});
    let error = "";
    process.stderr.on("data", (b) => {
      error = (error + b).slice(-4000);
    });
    const completion = new Promise((resolve, reject) => {
      process.once("error", reject);
      process.once("close", (code) =>
        code === 0
          ? resolve()
          : reject(
              Error("Native encoding failed. Try a smaller export resolution."),
            ),
      );
    });
    completion.catch(() => {});
    this.jobs.set(id, {
      id,
      directory,
      video,
      destination,
      process,
      completion,
      controller: new AbortController(),
      document,
      fps,
      frames: 0,
      encoder,
    });
    return { id, mode: "frames" };
  }
  async frame(id, png) {
    const job = this.jobs.get(id);
    if (
      !job ||
      !(png instanceof ArrayBuffer) ||
      png.byteLength > 80 * 1024 * 1024
    )
      throw Error("Invalid export frame.");
    if (job.process.exitCode !== null)
      throw Error("The encoder stopped. Retry export.");
    if (!job.process.stdin.write(Buffer.from(png)))
      await Promise.race([
        once(job.process.stdin, "drain"),
        job.completion.then(() => {
          throw Error("The encoder ended early.");
        }),
      ]);
    job.frames++;
  }
  async finish(id) {
    const job = this.jobs.get(id);
    if (!job) throw Error("Unknown export.");
    job.finishing = this.finishJob(job);
    try {
      return await job.finishing;
    } finally {
      await this.cleanup(id);
    }
  }
  async finishJob(job) {
    const id = job.id;
    if (job.native) await this.renderNative(job);
    else {
      job.process.stdin.end();
      await job.completion;
    }
    const paths = [
        ...new Set([
          ...job.document.segments.map((s) => s.sourceIndex),
          ...job.document.audio.map((a) => a.sourceIndex),
        ]),
      ],
      inputs = [],
      indexes = new Map(),
      hasAudio = new Set();
    for (const source of paths) {
      const path = this.store.path(job.document.sources[source].id),
        probe = JSON.parse(
          (
            await runBinary(
              this.ffprobe,
              [
                "-v",
                "error",
                ...localInput,
                "-show_streams",
                "-of",
                "json",
                path,
              ],
              { signal: job.controller.signal },
            )
          ).output,
        );
      if (probe.streams.some((s) => s.codec_type === "audio")) {
        indexes.set(source, inputs.length);
        inputs.push(path);
        hasAudio.add(source);
      }
    }
    let cursor = 0;
    const filters = [],
      labels = [];
    const add = (
      source,
      start,
      length,
      speed,
      volume,
      time,
      fadeIn = 0,
      fadeOut = 0,
    ) => {
      if (!hasAudio.has(source) || volume <= 0) return;
      const label = "a" + labels.length;
      let tempo = speed,
        atempo = [];
      while (tempo > 2) {
        atempo.push("atempo=2");
        tempo /= 2;
      }
      while (tempo < 0.5) {
        atempo.push("atempo=0.5");
        tempo /= 0.5;
      }
      atempo.push("atempo=" + tempo);
      const rendered = length / speed;
      filters.push(
        `[${indexes.get(source) + 1}:a]atrim=start=${start}:duration=${length},asetpts=PTS-STARTPTS,${atempo.join(",")},volume=${volume}${fadeIn ? ",afade=t=in:d=" + Math.min(fadeIn, rendered) : ""}${fadeOut ? ",afade=t=out:st=" + Math.max(0, rendered - fadeOut) + ":d=" + Math.min(fadeOut, rendered) : ""},adelay=${Math.round(time * 1000)}:all=1[${label}]`,
      );
      labels.push("[" + label + "]");
    };
    for (const segment of job.document.segments) {
      add(
        segment.sourceIndex,
        segment.start,
        segment.end - segment.start,
        segment.speed,
        segment.volume,
        cursor,
      );
      cursor += (segment.end - segment.start) / segment.speed;
    }
    for (const audio of job.document.audio)
      add(
        audio.sourceIndex,
        audio.sourceStart,
        audio.end - audio.start,
        1,
        audio.volume,
        audio.start,
        audio.fadeIn,
        audio.fadeOut,
      );
    const out = join(job.directory, "final.mp4"),
      args = [
        "-v",
        "error",
        "-i",
        job.video,
        ...inputs.flatMap((path) => [...localInput, "-i", path]),
      ];
    if (labels.length) {
      filters.push(
        labels.join("") +
          `amix=inputs=${labels.length}:normalize=0,apad,atrim=duration=${cursor}[mixed]`,
      );
      args.push(
        "-filter_complex",
        filters.join(";"),
        "-map",
        "0:v",
        "-map",
        "[mixed]",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      );
    } else args.push("-map", "0:v", "-an");
    args.push(
      "-c:v",
      "copy",
      "-t",
      String(cursor),
      "-movflags",
      "+faststart",
      out,
    );
    await runBinary(this.ffmpeg, args, { signal: job.controller.signal });
    job.controller.signal.throwIfAborted();
    await copyFile(out, job.destination);
    return { encoder: job.encoder, frames: job.frames };
  }
  async cancel(id) {
    const job = this.jobs.get(id);
    job?.controller.abort();
    job?.process?.kill();
    if (job?.completion) await job.completion.catch(() => {});
    await job?.finishing?.catch(() => {});
    await this.cleanup(id);
  }
  async cleanup(id) {
    const job = this.jobs.get(id);
    if (!job) return;
    this.jobs.delete(id);
    const { readdir, rmdir } = await import("node:fs/promises");
    for (const file of await readdir(job.directory))
      await unlink(join(job.directory, file));
    await rmdir(job.directory);
  }
}
