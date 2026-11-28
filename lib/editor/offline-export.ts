import {
  Input,
  BlobSource,
  ALL_FORMATS,
  CanvasSink,
  CanvasSource,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  QUALITY_HIGH,
  canEncodeVideo,
} from "mediabunny";
import type { Player } from "./media";
import { ffmpeg, cancelFFmpeg } from "./media";
import { atTime, duration } from "./model";
import { effectiveFades } from "./motion";

// Export owns its decoders and frame clock. Playback, speaker devices and rAF
// cannot stall or change the timestamps of the resulting file.
export async function offlineExport(
  player: Player,
  fps: number,
  progress: (n: number) => void,
  signal: AbortSignal,
) {
  const { width, height } = player.canvas;
  if (!(await canEncodeVideo("avc", { width, height }))) return null;
  const inputs = new Map<number, Input>();
  const iterators = new Map<string, AsyncGenerator<any, void, unknown>>();
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const video = new CanvasSource(player.canvas, {
    codec: "avc",
    quality: QUALITY_HIGH,
  });
  output.addVideoTrack(video, { frameRate: fps });
  const oldTime = player.time,
    files: string[] = [];
  const id = "export-" + crypto.randomUUID();
  let engine: Awaited<ReturnType<typeof ffmpeg>> | undefined;
  const cancel = () => {
    for (const input of inputs.values()) input.dispose();
    void output.cancel();
    if (engine) cancelFFmpeg();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    player.pause();
    player.exporting = true;
    await player.init();
    await document.fonts.ready;
    const indexes = new Set(
      [...player.doc.segments, ...player.doc.audio, ...player.doc.overlays].map(
        (x) => x.sourceIndex,
      ),
    );
    const audioIndexes = new Set<number>();
    for (const index of indexes) {
      signal.throwIfAborted();
      const source = player.doc.sources[index];
      if (source.kind === "image") continue;
      const response = await fetch(player.urls[source.id], { signal });
      if (!response.ok)
        throw Error(
          "The original media could not be read. Reopen the project and retry.",
        );
      const input = new Input({
        source: new BlobSource(await response.blob()),
        formats: ALL_FORMATS,
      });
      inputs.set(index, input);
      if (await input.getPrimaryAudioTrack()) audioIndexes.add(index);
    }
    await output.start();
    const total = duration(player.doc),
      frames = Math.ceil(total * fps);
    player.exportFrames = new Map();
    for (let frame = 0; frame < frames; frame++) {
      signal.throwIfAborted();
      if (player.disposed) throw Error("The project changed during export. Your edit is saved; retry export.");
      const time = frame / fps,
        at = atTime(player.doc, time)!;
      const active = [
        {
          key: "main",
          token: at.segment.id,
          index: at.segment.sourceIndex,
          start: at.sourceTime,
          speed: at.segment.speed,
          end:
            at.offset + (at.segment.end - at.segment.start) / at.segment.speed,
        },
        ...player.doc.overlays
          .filter((o) => time >= o.start && time < o.end)
          .map((o) => ({
            key: o.id,
            token: o.id,
            index: o.sourceIndex,
            start: o.sourceStart + (time - o.start) * (o.speed ?? 1),
            speed: o.speed ?? 1,
            end: o.end,
          })),
      ];
      for (const [key, iterator] of iterators)
        if (!active.some((a) => a.token === key)) {
          await iterator.return();
          iterators.delete(key);
        }
      player.exportFrames.clear();
      for (const item of active) {
        if (player.doc.sources[item.index].kind === "image") continue;
        let iterator = iterators.get(item.token);
        if (!iterator) {
          const track = await inputs.get(item.index)!.getPrimaryVideoTrack();
          if (!track || !(await track.canDecode()))
            throw Error(
              "This source video codec cannot be decoded by this browser. Export it with the Mac app.",
            );
          const sink = new CanvasSink(track, { poolSize: 2 });
          const start = item.start,
            step = item.speed / fps,
            count = Math.ceil((item.end - time) * fps);
          iterator = sink.canvasesAtTimestamps(
            (function* () {
              for (let i = 0; i < count; i++) yield start + i * step;
            })(),
          );
          iterators.set(item.token, iterator);
        }
        const sample = await iterator.next();
        if (!sample.value)
          throw Error(
            "A source frame is missing. Your project is saved; export with the Mac app or restore the original file.",
          );
        player.exportFrames.set(item.key, sample.value.canvas);
      }
      player.time = time;
      player.draw();
      await video.add(time, Math.min(1 / fps, total - time));
      progress(((frame + 1) / frames) * 0.85);
    }
    video.close();
    await output.finalize();
    const encoded = new Uint8Array(target.buffer!);
    // Mix original audio independently, preserving speed, volume, fades and
    // overlapping layers, without a second lossy video encode.
    const layers: {
      index: number;
      start: number;
      length: number;
      speed: number;
      volume: number;
      time: number;
      fadeIn?: number;
      fadeOut?: number;
    }[] = [];
    let cursor = 0;
    for (const s of player.doc.segments) {
      layers.push({
        index: s.sourceIndex,
        start: s.start,
        length: s.end - s.start,
        speed: s.speed,
        volume: s.volume,
        time: cursor,
        fadeIn: s.fadeIn,
        fadeOut: s.fadeOut,
      });
      cursor += (s.end - s.start) / s.speed;
    }
    for (const a of [...player.doc.audio, ...player.doc.overlays])
      layers.push({
        index: a.sourceIndex,
        start: a.sourceStart,
        length: (a.end - a.start) * (a.speed ?? 1),
        speed: a.speed ?? 1,
        volume: "muted" in a && a.muted ? 0 : (a.volume ?? 0),
        time: a.start,
        fadeIn: a.fadeIn,
        fadeOut: a.fadeOut,
      });
    const audible = layers.filter(
      (a) => audioIndexes.has(a.index) && a.volume > 0,
    );
    if (!audible.length) return new Blob([encoded], { type: "video/mp4" });
    signal.throwIfAborted();
    engine = await ffmpeg();
    const name = id + ".mp4",
      out = id + "-final.mp4";
    files.push(name, out);
    await engine.writeFile(name, encoded);
    const audioSources = [...new Set(audible.map((a) => a.index))];
    for (const index of audioSources) {
      const name = id + "-" + index;
      files.push(name);
      const response = await fetch(player.urls[player.doc.sources[index].id], {
        signal,
      });
      await engine.writeFile(
        name,
        new Uint8Array(await response.arrayBuffer()),
      );
    }
    const filters = audible.map((a, i) => {
      let speed = a.speed;
      const tempo = [];
      while (speed > 2) {
        tempo.push("atempo=2");
        speed /= 2;
      }
      while (speed < 0.5) {
        tempo.push("atempo=0.5");
        speed /= 0.5;
      }
      tempo.push("atempo=" + speed);
      const length = a.length / a.speed,
        fades = effectiveFades(a, length);
      return `[${audioSources.indexOf(a.index) + 1}:a]atrim=start=${a.start}:duration=${a.length},asetpts=PTS-STARTPTS,${tempo.join(",")},volume=${a.volume}${fades.fadeIn ? ",afade=t=in:d=" + fades.fadeIn : ""}${fades.fadeOut ? ",afade=t=out:st=" + (length - fades.fadeOut) + ":d=" + fades.fadeOut : ""},adelay=${Math.round(a.time * 1000)}:all=1[a${i}]`;
    });
    filters.push(
      audible.map((_, i) => `[a${i}]`).join("") +
        `amix=inputs=${audible.length}:normalize=0,apad,atrim=duration=${total}[mix]`,
    );
    const status = await engine.exec([
      "-i",
      name,
      ...audioSources.flatMap((i) => ["-i", id + "-" + i]),
      "-filter_complex",
      filters.join(";"),
      "-map",
      "0:v",
      "-map",
      "[mix]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(total),
      "-movflags",
      "+faststart",
      out,
    ]);
    signal.throwIfAborted();
    if (status !== 0)
      throw Error("Audio encoding failed. Your edit is saved; retry export.");
    progress(1);
    return new Blob(
      [new Uint8Array((await engine.readFile(out)) as Uint8Array)],
      { type: "video/mp4" },
    );
  } finally {
    signal.removeEventListener("abort", cancel);
    for (const iterator of iterators.values())
      await iterator.return().catch(() => {});
    for (const input of inputs.values()) input.dispose();
    if (output.state !== "finalized" && output.state !== "canceled")
      await output.cancel().catch(() => {});
    if (engine)
      for (const name of files) await engine.deleteFile(name).catch(() => {});
    player.exportFrames = undefined;
    player.exporting = false;
    player.seek(oldTime);
  }
}
