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
      document,
      fps,
      frames: 0,
      encoder,
    });
    return id;
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
    job.process.stdin.end();
    await job.completion;
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
            await runBinary(this.ffprobe, [
              "-v",
              "error",
              "-show_streams",
              "-of",
              "json",
              path,
            ])
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
        ...inputs.flatMap((path) => ["-i", path]),
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
    await runBinary(this.ffmpeg, args);
    await copyFile(out, job.destination);
    await this.cleanup(id);
    return { encoder: job.encoder, frames: job.frames };
  }
  async cancel(id) {
    const job = this.jobs.get(id);
    job?.process.kill();
    await job?.completion.catch(() => {});
    await this.cleanup(id);
  }
  async cleanup(id) {
    const job = this.jobs.get(id);
    if (!job) return;
    const { readdir, rmdir } = await import("node:fs/promises");
    for (const file of await readdir(job.directory))
      await unlink(join(job.directory, file));
    await rmdir(job.directory);
    this.jobs.delete(id);
  }
}
