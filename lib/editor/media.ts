import { NO_AUDIO } from "./transcript.ts";
import { textLayout } from "./text-layout.ts";
import { audioEnvelope, motionAt, cameraZoomAt } from "./motion";
import { desktop, isNative, type MediaResource } from "./desktop";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { Document, Source, TextLayer } from "./model";
import { atTime, duration, cssFilter, textTiming, appearance } from "./model";
import { ColorRenderer } from "./color";
let instance: FFmpeg | undefined;
let loading: Promise<FFmpeg> | undefined;
const textSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
export async function ffmpeg() {
  if (instance?.loaded) return instance;
  if (!loading)
    loading = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const f = new FFmpeg();
      const chunks = await Promise.all(
        [1, 2].map(async (i) => {
          const r = await fetch("/ffmpeg/core-part-" + i + ".bin");
          if (!r.ok)
            throw Error(
              "The video engine could not download. Check your connection and retry.",
            );
          return r.arrayBuffer();
        }),
      );
      const wasmURL = URL.createObjectURL(
        new Blob(chunks, { type: "application/wasm" }),
      );
      try {
        await f.load({
          classWorkerURL: "/ffmpeg/worker.js",
          coreURL: location.origin + "/ffmpeg/ffmpeg-core.js",
          wasmURL,
        });
      } finally {
        URL.revokeObjectURL(wasmURL);
      }
      instance = f;
      return f;
    })().catch((e) => {
      loading = undefined;
      throw e;
    });
  return loading;
}
export function cancelFFmpeg() {
  instance?.terminate();
  instance = undefined;
  loading = undefined;
}
export async function extractAudio(
  blob: MediaResource,
  start: number,
  length: number,
) {
  if (isNative(blob)) {
    if (!desktop()) throw Error("Native video services are unavailable.");
    try {
      return new Blob([await desktop()!.extractAudio(blob.id, start, length)], {
        type: "audio/wav",
      });
    } catch (e) {
      if ((e as Error).message.includes(NO_AUDIO)) throw Error(NO_AUDIO);
      throw e;
    }
  }
  const f = await ffmpeg(),
    name = "audio-source-" + crypto.randomUUID();
  const out = name + ".wav";
  let missingAudio = false;
  const observe = ({ message }: { message: string }) => {
    if (/matches no streams|does not contain any stream/i.test(message))
      missingAudio = true;
  };
  f.on("log", observe);
  try {
    await f.writeFile(name, new Uint8Array(await blob.arrayBuffer()));
    const status = await f.exec([
      "-ss",
      String(start),
      "-i",
      name,
      "-t",
      String(length),
      "-map",
      "0:a:0",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      out,
    ]);
    if (status !== 0)
      throw Error(
        missingAudio
          ? NO_AUDIO
          : "This audio format could not be decoded. Try converting the clip and uploading it again.",
      );
    const data = await f.readFile(out);
    return new Blob([new Uint8Array(data as Uint8Array)], {
      type: "audio/wav",
    });
  } finally {
    f.off("log", observe);
    await f.deleteFile(name).catch(() => {});
    await f.deleteFile(out).catch(() => {});
  }
}
export async function toMP4(
  blob: Blob,
  progress: (n: number) => void,
  fps = 30,
  maxDimension?: number,
) {
  const f = await ffmpeg();
  const id = crypto.randomUUID();
  const input = id + ".webm",
    output = id + ".mp4";
  const cb = ({ progress: p }: { progress: number }) =>
    progress(Math.min(0.99, Math.max(0, p)));
  f.on("progress", cb);
  try {
    await f.writeFile(input, new Uint8Array(await blob.arrayBuffer()));
    if (
      (await f.exec([
        "-i",
        input,
        ...(maxDimension
          ? [
              "-vf",
              `scale=w='min(${maxDimension},iw)':h='min(${maxDimension},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
            ]
          : []),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-r",
        String(fps),
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        output,
      ])) !== 0
    )
      throw Error(
        "MP4 encoding failed. Your edit is saved; try a smaller resolution.",
      );
    const b = await f.readFile(output);
    return new Blob([new Uint8Array(b as Uint8Array)], { type: "video/mp4" });
  } finally {
    f.off("progress", cb);
    await f.deleteFile(input).catch(() => {});
    await f.deleteFile(output).catch(() => {});
  }
}
export async function probe(file: File): Promise<Source> {
  if (file.size > 1024 * 1024 * 1024)
    throw Error("Choose media smaller than 1 GB.");
  const kind = file.type.startsWith("audio/")
    ? "audio"
    : file.type.startsWith("image/")
      ? "image"
      : "video";
  if (kind === "image") {
    const b = await createImageBitmap(file);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      duration: 10,
      width: b.width,
      height: b.height,
      kind,
      mime: file.type,
      bytes: file.size,
    };
  }
  const el = document.createElement(kind === "audio" ? "audio" : "video");
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(Error("Media could not be opened. Try MP4 (H.264) or WebM.")),
        15000,
      );
      el.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      el.onerror = () => {
        clearTimeout(timer);
        reject(
          Error(
            "This browser cannot decode this file. Try MP4 (H.264) or WebM.",
          ),
        );
      };
      el.src = url;
    });
    if (!Number.isFinite(el.duration) || el.duration <= 0 || el.duration > 1800)
      throw Error("Choose a video up to 30 minutes long.");
    return {
      id: crypto.randomUUID(),
      name: file.name,
      duration: el.duration,
      width: kind === "video" ? (el as HTMLVideoElement).videoWidth : 0,
      height: kind === "video" ? (el as HTMLVideoElement).videoHeight : 0,
      kind,
      mime: file.type || (kind === "audio" ? "audio/mpeg" : "video/mp4"),
      bytes: file.size,
    };
  } finally {
    el.removeAttribute("src");
    el.load();
    URL.revokeObjectURL(url);
  }
}
export function canvasSize(doc: Document, longest = 1280) {
  const src = doc.sources[doc.segments[0]?.sourceIndex],
    ratio =
      doc.canvas === "9:16"
        ? 9 / 16
        : doc.canvas === "16:9"
          ? 16 / 9
          : doc.canvas === "1:1"
            ? 1
            : (src?.width || 16) / (src?.height || 9);
  longest = longest || Math.max(src?.width || 1280, src?.height || 720);
  return {
    width: Math.round((ratio >= 1 ? longest : longest * ratio) / 2) * 2,
    height: Math.round((ratio >= 1 ? longest / ratio : longest) / 2) * 2,
  };
}
function drawText(
  ctx: CanvasRenderingContext2D,
  t: TextLayer,
  time: number,
  w: number,
  h: number,
  start: number,
  end: number,
) {
  ctx.save();
  const text = t.text || "Text";
  const glyphs = (value: string) =>
    Array.from(textSegmenter.segment(value), (part) => part.segment);
  const motion = motionAt(
    {
      animationIn: t.animation,
      animationOut: t.animationOut,
      animationDuration: t.animationDuration,
    },
    time - start,
    end - start,
    glyphs(text).length,
  );
  ctx.globalAlpha = (t.opacity ?? 1) * motion.opacity;
  ctx.translate(t.x * w, (t.y + motion.offsetY) * h);
  ctx.scale(motion.scale, motion.scale);
  if (motion.blur) ctx.filter = `blur(${(motion.blur * w) / 1080}px)`;
  const { size, contentWidth, lines, fit } = textLayout(ctx, t, w, h);
  ctx.textAlign = t.alignment || "center";
  ctx.textBaseline = "middle";
  ctx.scale(fit, fit);
  let remaining = motion.visibleCharacters;
  lines.forEach((line, i) => {
    const y =
      (i - (lines.length - 1) / 2) * size * (1.2 + (t.lineSpacing ?? 0));
    const measuredWidth = ctx.measureText(line).width,
      mw = measuredWidth,
      x =
        t.alignment === "left"
          ? -contentWidth / 2
          : t.alignment === "right"
            ? contentWidth / 2
            : 0,
      left =
        t.alignment === "left"
          ? x
          : t.alignment === "right"
            ? x - mw
            : x - mw / 2,
      padding = (t.backgroundPadding ?? 0.012) * w;
    if (t.background !== "transparent") {
      ctx.save();
      ctx.globalAlpha *= t.backgroundOpacity ?? 1;
      ctx.fillStyle = t.background;
      ctx.beginPath();
      ctx.roundRect(
        left - padding,
        y - size * 0.6 - padding / 2,
        mw + padding * 2,
        size * 1.2 + padding,
        (t.backgroundRadius ?? 0) * w,
      );
      ctx.fill();
      ctx.restore();
    }
    const characters = glyphs(line);
    const displayed = characters.slice(0, Math.max(0, remaining)).join("");
    remaining -= characters.length + 1;
    ctx.save();
    ctx.translate(left, y);
    ctx.textAlign = "left";
    if (t.shadowOpacity) {
      const c = t.shadowColor || "#000000";
      ctx.shadowColor =
        c +
        Math.round(t.shadowOpacity * 255)
          .toString(16)
          .padStart(2, "0");
      ctx.shadowBlur = (t.shadowBlur ?? 0.005) * w;
      ctx.shadowOffsetX = (t.shadowOffset ?? 0.003) * w;
      ctx.shadowOffsetY = (t.shadowOffset ?? 0.003) * w;
    }
    if (t.outline) {
      ctx.strokeStyle = t.outlineColor || "#000000";
      ctx.lineWidth = Math.max(0.5, w * (t.outlineWidth ?? 0.00495));
      ctx.lineJoin = "round";
      ctx.strokeText(displayed, 0, 0);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(displayed, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

export class Player {
  canvas: HTMLCanvasElement;
  doc: Document;
  urls: Record<string, string>;
  videos = new Map<number | string, HTMLVideoElement | HTMLAudioElement>();
  images = new Map<number | string, HTMLImageElement>();
  ctx: AudioContext | null = null;
  dest: MediaStreamAudioDestinationNode | null = null;
  nodes = new Map<number | string, GainNode>();
  playing = false;
  time = 0;
  frame = 0;
  last = 0;
  fallbackFrame: ReturnType<typeof setTimeout> | undefined;
  mainSlots = new Map<
    number,
    { segment: string; source: number; start: number }
  >();
  pendingTime: number | null = null;
  onBuffering?: (buffering: boolean) => void;
  onTime: (t: number) => void;
  onEnd?: () => void;
  onError?: (s: string) => void;
  onFailure?: (e: Error) => void;
  exporting = false;
  disposed = false;
  exportFrames?: Map<string, HTMLCanvasElement | OffscreenCanvas>;
  color: ColorRenderer | null = null;
  fontReady: Promise<unknown> | null = null;
  constructor(
    canvas: HTMLCanvasElement,
    doc: Document,
    urls: Record<string, string>,
    onTime: (t: number) => void,
  ) {
    this.canvas = canvas;
    this.doc = doc;
    this.urls = urls;
    this.onTime = onTime;
  }
  async init() {
    if (this.disposed) return;
    const media = [
      ...this.doc.sources
        .map((s, i) => ({
          key: i as number | string,
          source: s,
        }))
        .filter((item) => item.source.kind === "image"),
      ...[...this.doc.overlays, ...this.doc.audio].map((l) => ({
        key: l.id,
        source: this.doc.sources[l.sourceIndex],
      })),
    ];
    for (const { key: i, source: s } of media) {
      if (this.disposed) return;
      const url = this.urls[s.id];
      if (!url) continue;
      if (s.kind === "image") {
        if (!this.images.has(i)) {
          const img = new Image();
          img.src = url;
          await img.decode().catch(() => {});
          this.images.set(i, img);
        }
        continue;
      }
      if (!this.videos.has(i)) {
        const v = document.createElement(
          s.kind === "audio" ? "audio" : "video",
        );
        v.preload = "auto";
        if (v instanceof HTMLVideoElement) v.playsInline = true;
        v.src = url;
        v.setAttribute("aria-hidden", "true");
        v.style.cssText =
          "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-1";
        document.body.appendChild(v);
        v.onerror = () =>
          this.onError?.("This browser could not decode the selected video.");
        this.videos.set(i, v);
        await new Promise<void>((r) => {
          if (v.readyState >= 2) return r();
          v.onloadeddata = () => r();
          setTimeout(r, 10000);
        });
      }
    }
    this.fontReady ??= document.fonts
      .load('600 30px "TikTok Sans"')
      .catch(() => {});
    await this.fontReady;
    this.prepareMain();
    this.draw();
  }
  // Three bounded decoder slots let adjacent cuts of the SAME source seek
  // independently. Only current + two upcoming clips are kept warm.
  prepareMain() {
    if (this.disposed) return;
    const at = atTime(this.doc, this.time);
    if (!at) return;
    for (
      let index = at.index;
      index < Math.min(this.doc.segments.length, at.index + 3);
      index++
    ) {
      const segment = this.doc.segments[index],
        source = this.doc.sources[segment.sourceIndex];
      if (source.kind !== "video") continue;
      const slot = index % 3,
        key = "main:" + slot,
        known = this.mainSlots.get(slot);
      if (
        known?.segment === segment.id &&
        known.source === segment.sourceIndex &&
        known.start === segment.start
      )
        continue;
      const url = this.urls[source.id];
      if (!url) continue;
      let video = this.videos.get(key) as HTMLVideoElement | undefined;
      if (!video) {
        video = document.createElement("video");
        video.preload = "auto";
        video.playsInline = true;
        video.setAttribute("aria-hidden", "true");
        video.style.cssText =
          "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-1";
        document.body.appendChild(video);
        this.videos.set(key, video);
        video.onseeked = () => this.draw();
        video.onloadeddata = () => this.draw();
        video.oncanplay = () => this.draw();
        video.onerror = () =>
          this.onFailure?.(Error("A source video could not be decoded."));
      }
      video.pause();
      this.mainSlots.set(slot, {
        segment: segment.id,
        source: segment.sourceIndex,
        start: segment.start,
      });
      const seek = () => {
        if (this.disposed || this.mainSlots.get(slot)?.segment !== segment.id)
          return;
        const current = atTime(this.doc, this.time);
        const target =
          current?.segment.id === segment.id
            ? current.sourceTime
            : segment.start;
        const time = Math.min(target, Math.max(0, video!.duration - 0.001));
        if (Math.abs(video!.currentTime - time) > 0.001)
          video!.currentTime = time;
      };
      if (video.src !== url) {
        video.onloadedmetadata = seek;
        video.src = url;
        video.load();
      } else if (video.readyState >= 1) seek();
      else video.onloadedmetadata = seek;
    }
  }
  mainMedia() {
    if (this.exportFrames?.has("main")) return this.exportFrames.get("main");
    const at = atTime(this.doc, this.time);
    if (!at) return undefined;
    return (
      this.images.get(at.segment.sourceIndex) ||
      this.videos.get("main:" + (at.index % 3)) ||
      this.videos.get(at.segment.sourceIndex)
    );
  }
  mainReady() {
    const media = this.mainMedia();
    return (
      !!this.exportFrames ||
      media instanceof HTMLImageElement ||
      (media instanceof HTMLVideoElement &&
        !media.seeking &&
        media.readyState >= 2)
    );
  }
  audio() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.dest = this.ctx.createMediaStreamDestination();
    }
    for (const [i, v] of this.videos) {
      if (!this.nodes.has(i)) {
        const gain = this.ctx.createGain();
        this.ctx.createMediaElementSource(v).connect(gain);
        if (!this.exporting) gain.connect(this.ctx.destination);
        gain.connect(this.dest!);
        this.nodes.set(i, gain);
        v.volume = 1;
      }
    }
    void this.ctx.resume();
  }
  sync() {
    this.prepareMain();
    if (this.ctx && [...this.videos.keys()].some((key) => !this.nodes.has(key)))
      this.audio();
    const at = atTime(this.doc, this.time);
    const active = new Map<
      number | string,
      { t: number; speed: number; volume: number }
    >();
    if (at)
      active.set(
        this.doc.sources[at.segment.sourceIndex].kind === "video"
          ? "main:" + (at.index % 3)
          : at.segment.sourceIndex,
        {
          t: at.sourceTime,
          speed: at.segment.speed,
          volume:
            at.segment.volume *
            audioEnvelope(
              at.segment,
              this.time - at.offset,
              (at.segment.end - at.segment.start) / at.segment.speed,
            ),
        },
      );
    for (const a of this.doc.audio) {
      if (this.time >= a.start && this.time < a.end) {
        const fade = audioEnvelope(a, this.time - a.start, a.end - a.start);
        active.set(a.id, {
          t: a.sourceStart + (this.time - a.start) * (a.speed ?? 1),
          speed: a.speed ?? 1,
          volume: a.muted ? 0 : a.volume * Math.max(0, fade),
        });
      }
    }
    for (const o of this.doc.overlays) {
      if (this.time >= o.start && this.time < o.end)
        active.set(o.id, {
          t: o.sourceStart + (this.time - o.start) * (o.speed ?? 1),
          speed: o.speed ?? 1,
          volume:
            (o.volume ?? 0) *
            audioEnvelope(o, this.time - o.start, o.end - o.start),
        });
    }
    for (const [i, v] of this.videos) {
      const a = active.get(i);
      if (!a) {
        v.pause();
        const gain = this.nodes.get(i);
        if (gain) gain.gain.value = 0;
        continue;
      }
      if (!v.seeking && Math.abs(v.currentTime - a.t) > 0.15)
        v.currentTime = Math.max(0, a.t);
      v.playbackRate = a.speed;
      const gain = this.nodes.get(i);
      if (gain) gain.gain.value = a.volume;
      else v.volume = a.volume;
      if (this.playing) {
        if (v.paused) void v.play().catch(() => {});
      } else v.pause();
    }
  }
  draw() {
    if (this.disposed) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    if (atTime(this.doc, this.time) && !this.mainReady()) return;
    const w = this.canvas.width,
      h = this.canvas.height;
    ctx.fillStyle = "#101216";
    ctx.fillRect(0, 0, w, h);
    const at = atTime(this.doc, this.time);
    if (at) {
      const s = at.segment,
        src = this.doc.sources[s.sourceIndex],
        v = this.mainMedia();
      if (
        v instanceof HTMLCanvasElement ||
        v instanceof OffscreenCanvas ||
        v instanceof HTMLImageElement ||
        (v instanceof HTMLVideoElement && v.readyState >= 2)
      ) {
        const a = s.appearance,
          c = a.crop,
          motion = motionAt(
            a,
            this.time - at.offset,
            (s.end - s.start) / s.speed,
          );
        ctx.save();
        ctx.filter =
          cssFilter(a) +
          (motion.blur ? ` blur(${(motion.blur * w) / 1080}px)` : "");
        ctx.globalAlpha = a.opacity * motion.opacity;
        ctx.translate(w / 2, h / 2 + motion.offsetY * h);
        const cameraScale = cameraZoomAt(a.cameraZoom, at.sourceTime);
        ctx.scale(motion.scale * cameraScale, motion.scale * cameraScale);
        ctx.rotate((a.rotation * Math.PI) / 2);
        ctx.scale(a.flipX ? -1 : 1, a.flipY ? -1 : 1);
        const vw = src.width * c.width,
          vh = src.height * c.height,
          rot = a.rotation % 2,
          spaceW = rot ? h : w,
          spaceH = rot ? w : h,
          scale =
            this.doc.framing === "fill"
              ? Math.max(spaceW / vw, spaceH / vh)
              : Math.min(spaceW / vw, spaceH / vh);
        ctx.drawImage(
          (this.color ??= new ColorRenderer()).render(v, a),
          src.width * c.x,
          src.height * c.y,
          vw,
          vh,
          (-vw * scale) / 2,
          (-vh * scale) / 2,
          vw * scale,
          vh * scale,
        );
        ctx.restore();
      }
    }
    for (const o of this.doc.overlays) {
      if (this.time < o.start || this.time >= o.end) continue;
      const media =
          this.exportFrames?.get(o.id) ||
          this.images.get(o.id) ||
          this.videos.get(o.id),
        s = this.doc.sources[o.sourceIndex];
      if (
        media &&
        (media instanceof HTMLCanvasElement ||
          media instanceof OffscreenCanvas ||
          media instanceof HTMLImageElement ||
          (media instanceof HTMLVideoElement && media.readyState >= 2))
      ) {
        const a = o.appearance || appearance(),
          c = a.crop,
          cw = s.width * c.width,
          ch = s.height * c.height,
          scale = (o.width * w) / (a.rotation % 2 ? ch : cw),
          drawW = o.height
            ? a.rotation % 2
              ? o.height * h
              : o.width * w
            : cw * scale,
          drawH = o.height
            ? a.rotation % 2
              ? o.width * w
              : o.height * h
            : ch * scale;
        ctx.save();
        const motion = motionAt(a, this.time - o.start, o.end - o.start);
        ctx.globalAlpha = o.opacity * a.opacity * motion.opacity;
        ctx.filter =
          cssFilter(a) +
          (motion.blur ? ` blur(${(motion.blur * w) / 1080}px)` : "");
        ctx.translate(o.x * w, (o.y + motion.offsetY) * h);
        const cameraScale = cameraZoomAt(
          a.cameraZoom,
          o.sourceStart + (this.time - o.start) * (o.speed ?? 1),
        );
        ctx.scale(motion.scale * cameraScale, motion.scale * cameraScale);
        ctx.rotate(
          (a.rotation * Math.PI) / 2 + ((o.rotation ?? 0) * Math.PI) / 180,
        );
        ctx.scale(a.flipX ? -1 : 1, a.flipY ? -1 : 1);
        const renderable = (this.color ??= new ColorRenderer()).render(
          media as
            | HTMLVideoElement
            | HTMLImageElement
            | HTMLCanvasElement
            | OffscreenCanvas,
          a,
        );
        ctx.drawImage(
          renderable,
          s.width * c.x,
          s.height * c.y,
          cw,
          ch,
          -drawW / 2,
          -drawH / 2,
          drawW,
          drawH,
        );
        ctx.restore();
      }
    }
    for (const t of this.doc.texts) {
      const timing = textTiming(this.doc, t);
      if (this.time >= timing.start && this.time < timing.end)
        drawText(ctx, t, this.time, w, h, timing.start, timing.end);
    }
  }
  seek(time: number) {
    this.pendingTime = null;
    this.time = Math.max(0, Math.min(duration(this.doc), time));
    this.sync();
    this.draw();
    this.onTime(this.time);
    setTimeout(() => this.draw(), 80);
  }
  play() {
    if (this.disposed) return;
    if (this.playing) return;
    this.audio();
    this.playing = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.playing) return;
      cancelAnimationFrame(this.frame);
      clearTimeout(this.fallbackFrame);
      if (
        this.exporting &&
        (document.hidden || this.ctx?.state !== "running")
      ) {
        if (!document.hidden) void this.ctx?.resume();
        this.last = now;
        for (const video of this.videos.values()) video.pause();
        this.onBuffering?.(true);
        this.frame = requestAnimationFrame(tick);
        this.fallbackFrame = setTimeout(() => tick(performance.now()), 50);
        return;
      }
      this.time =
        this.pendingTime ??
        Math.min(duration(this.doc), this.time + (now - this.last) / 1000);
      this.last = now;
      // Retain the final decoded frame; seeking to the exact source duration
      // can leave some browser decoders waiting forever for a nonexistent frame.
      if (this.time >= duration(this.doc)) {
        this.onTime(this.time);
        this.pause();
        this.onEnd?.();
        return;
      }
      try {
        this.sync();
        if (!this.mainReady()) {
          this.pendingTime = this.time;
          for (const video of this.videos.values()) video.pause();
          this.onBuffering?.(true);
          this.frame = requestAnimationFrame(tick);
          this.fallbackFrame = setTimeout(() => tick(performance.now()), 50);
          return;
        }
        this.pendingTime = null;
        this.onBuffering?.(false);
        this.draw();
      } catch (e) {
        this.pause();
        const err = e instanceof Error ? e : Error(String(e));
        this.onError?.(err.message);
        this.onFailure?.(err);
        return;
      }
      this.onTime(this.time);
      if (this.time >= duration(this.doc)) {
        this.pause();
        this.onEnd?.();
        return;
      }
      this.frame = requestAnimationFrame(tick);
      this.fallbackFrame = setTimeout(() => tick(performance.now()), 50);
    };
    this.sync();
    this.frame = requestAnimationFrame(tick);
    this.fallbackFrame = setTimeout(() => tick(performance.now()), 50);
  }
  pause() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.fallbackFrame);
    for (const v of this.videos.values()) v.pause();
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.pause();
    if (this.exporting)
      this.onFailure?.(
        Error(
          "The preview changed during export. Your edit is saved; start export again.",
        ),
      );
    for (const v of this.videos.values()) {
      v.removeAttribute("src");
      v.load();
      v.remove();
    }
    void this.ctx?.close();
    this.color?.destroy();
    this.videos.clear();
  }
  async renderFrame(time: number) {
    this.pause();
    this.time = time;
    this.prepareMain();
    const targets = new Map<number | string, number>(),
      at = atTime(this.doc, time);
    if (at)
      targets.set(
        this.doc.sources[at.segment.sourceIndex].kind === "video"
          ? "main:" + (at.index % 3)
          : at.segment.sourceIndex,
        at.sourceTime,
      );
    for (const overlay of this.doc.overlays)
      if (time >= overlay.start && time < overlay.end)
        targets.set(
          overlay.id,
          overlay.sourceStart + (time - overlay.start) * (overlay.speed ?? 1),
        );
    await Promise.all(
      [...targets].map(async ([index, position]) => {
        const video = this.videos.get(index);
        if (!(video instanceof HTMLVideoElement)) return;
        if (video.readyState < 1)
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              cleanup();
              reject(Error("The video decoder did not load."));
            }, 15000);
            const cleanup = () => {
              clearTimeout(timer);
              video.removeEventListener("loadedmetadata", loaded);
              video.removeEventListener("error", failed);
            };
            const loaded = () => {
              cleanup();
              resolve();
            };
            const failed = () => {
              cleanup();
              reject(Error("The source video could not be loaded."));
            };
            video.addEventListener("loadedmetadata", loaded, { once: true });
            video.addEventListener("error", failed, { once: true });
          });
        if (
          Math.abs(video.currentTime - position) < 0.001 &&
          video.readyState >= 2 &&
          !video.seeking
        )
          return;
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            cleanup();
            reject(
              Error(
                "The video decoder stalled while exporting. Retry or use an H.264 source.",
              ),
            );
          }, 10000);
          const cleanup = () => {
            clearTimeout(timer);
            video.removeEventListener("seeked", done);
            video.removeEventListener("loadeddata", done);
            video.removeEventListener("canplay", done);
            video.removeEventListener("error", failed);
          };
          const done = () => {
            if (video.seeking || video.readyState < 2) return;
            cleanup();
            resolve();
          };
          const failed = () => {
            cleanup();
            reject(Error("The source video could not be decoded."));
          };
          video.addEventListener("seeked", done);
          video.addEventListener("loadeddata", done);
          video.addEventListener("canplay", done);
          video.addEventListener("error", failed, { once: true });
          video.currentTime = Math.min(
            position,
            Math.max(0, video.duration - 0.001),
          );
        });
      }),
    );
    this.draw();
  }
  async exportNative(
    fps: number,
    progress: (n: number) => void,
    signal: AbortSignal,
  ) {
    const bridge = desktop()!,
      oldTime = this.time;
    this.pause();
    this.exporting = true;
    let job: string | undefined;
    const cancel = () => {
      if (job) void bridge.cancelExport(job);
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      await this.init();
      await document.fonts.ready;
      const started = await bridge.beginExport(
        this.doc,
        this.canvas.width,
        this.canvas.height,
        fps,
      );
      job = started.id;
      const frames =
        started.mode === "native" ? 0 : Math.ceil(duration(this.doc) * fps);
      for (let frame = 0; frame < frames; frame++) {
        signal.throwIfAborted();
        await this.renderFrame(
          Math.min(duration(this.doc) - 0.001, frame / fps),
        );
        const image = await new Promise<Blob>((resolve, reject) =>
          this.canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(Error("The preview frame could not be rendered.")),
            "image/png",
          ),
        );
        await bridge.exportFrame(job, await image.arrayBuffer());
        progress(((frame + 1) / frames) * 0.9);
      }
      signal.throwIfAborted();
      await bridge.finishExport(job);
      progress(1);
    } catch (error) {
      if (job) await bridge.cancelExport(job).catch(() => {});
      throw error;
    } finally {
      signal.removeEventListener("abort", cancel);
      this.exporting = false;
      this.seek(oldTime);
    }
  }
  async export(
    fps: number,
    progress: (n: number) => void,
    signal: AbortSignal,
  ) {
    this.pause();
    const surface = document.createElement("canvas");
    surface.width = this.canvas.width;
    surface.height = this.canvas.height;
    const renderer = new Player(
      surface,
      structuredClone(this.doc),
      this.urls,
      () => {},
    );
    renderer.exporting = true;
    try {
      return await renderer.encodeExport(fps, progress, signal);
    } finally {
      renderer.exporting = false;
      renderer.destroy();
    }
  }
  async encodeExport(
    fps: number,
    progress: (n: number) => void,
    signal: AbortSignal,
  ) {
    if (!fps) {
      const { Input, UrlSource, ALL_FORMATS } = await import("mediabunny");
      const source = this.doc.sources[this.doc.segments[0].sourceIndex];
      if (source.kind === "video") {
        const input = new Input({
          source: new UrlSource(this.urls[source.id]),
          formats: ALL_FORMATS,
        });
        try {
          const track = await input.getPrimaryVideoTrack();
          const stats = await track?.computePacketStats(120);
          fps = Math.min(
            120,
            Math.max(1, Math.round(stats?.averagePacketRate || 30)),
          );
        } finally {
          input.dispose();
        }
      } else fps = 30;
    }
    if (desktop()) {
      await this.exportNative(fps, progress, signal);
      return;
    }
    const { offlineExport } = await import("./offline-export");
    const encoded = await offlineExport(this, fps, progress, signal);
    if (encoded) return encoded;
    this.pause();
    this.audio();
    const ctx = this.ctx as AudioContext & {
      sinkId?: string | { type: "none" };
      setSinkId?: (sink: string | { type: "none" }) => Promise<void>;
    };
    const oldTime = this.time,
      previous = this.onTime,
      oldSink = ctx.sinkId || "",
      oldEnd = this.onEnd;
    let stream: MediaStream | undefined,
      changedSink = false;
    let cleanupCapture: (() => void) | undefined;
    try {
      // A silent output still renders the real audio graph, including our capture
      // destination, without depending on a working physical speaker device.
      // https://developer.chrome.com/blog/audiocontext-setsinkid
      if (ctx.setSinkId) {
        await ctx
          .setSinkId({ type: "none" })
          .then(() => {
            changedSink = true;
          })
          .catch(() => {});
      }
      let resumeTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          ctx.resume(),
          new Promise<never>((_, reject) => {
            resumeTimer = setTimeout(
              () =>
                reject(
                  Error(
                    "Your browser's audio engine did not start. Check the audio output device and retry.",
                  ),
                ),
              3000,
            );
          }),
        ]);
      } finally {
        clearTimeout(resumeTimer);
      }
      const startClock = ctx.currentTime;
      for (let i = 0; i < 10 && ctx.currentTime <= startClock; i++)
        await new Promise((r) => setTimeout(r, 100));
      if (ctx.currentTime <= startClock)
        throw Error(
          "Your browser's audio engine stopped. Check the audio output device and retry.",
        );
      signal.throwIfAborted();
      this.exporting = true;
      this.seek(0);
      await new Promise((r) => setTimeout(r, 250));
      signal.throwIfAborted();
      stream = this.canvas.captureStream(fps);
      for (const t of this.dest!.stream.getAudioTracks()) stream.addTrack(t);
      const mime = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/mp4",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime)
        throw Error(
          "This browser cannot record video exports. Try current Chrome or Edge.",
        );
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 8000000,
      });
      const chunks: Blob[] = [];
      await new Promise<void>((resolve, reject) => {
        let timer: ReturnType<typeof setInterval>;
        let lastProgress = performance.now();
        let buffering = false;
        const visibility = () => {
          lastProgress = performance.now();
          this.last = performance.now();
          if (!document.hidden) void ctx.resume();
        };
        document.addEventListener("visibilitychange", visibility);
        const stop = () => {
          this.pause();
          if (recorder.state !== "inactive") recorder.stop();
        };
        cleanupCapture = () => {
          clearInterval(timer);
          signal.removeEventListener("abort", stop);
          document.removeEventListener("visibilitychange", visibility);
        };
        signal.addEventListener("abort", stop, { once: true });
        this.onFailure = (e) => {
          stop();
          reject(e);
        };
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onerror = () => {
          stop();
          reject(Error("Video recording failed."));
        };
        recorder.onstop = () => {
          clearInterval(timer);
          signal.removeEventListener("abort", stop);
          document.removeEventListener("visibilitychange", visibility);
          signal.aborted
            ? reject(new DOMException("Cancelled", "AbortError"))
            : resolve();
        };
        this.onBuffering = (waiting) => {
          if (buffering !== waiting) lastProgress = performance.now();
          buffering = waiting;
          if (waiting && recorder.state === "recording") recorder.pause();
          if (!waiting && recorder.state === "paused") recorder.resume();
        };
        this.onTime = (t) => {
          lastProgress = performance.now();
          previous(t);
          progress((t / duration(this.doc)) * 0.75);
        };
        this.onEnd = stop;
        recorder.start(1000);
        this.play();
        timer = setInterval(() => {
          if (document.hidden) return;
          if (performance.now() - lastProgress > 30000) {
            stop();
            reject(
              Error(
                "The video decoder stopped during export. Your edit is saved; retry or use an H.264 source.",
              ),
            );
          }
        }, 1000);
      });
      const blob = new Blob(chunks, { type: mime });
      if (!blob.size)
        throw Error(
          "The browser produced an empty recording. Check the audio output device and retry.",
        );
      if (mime.startsWith("video/mp4")) return blob;
      progress(0.76);
      return await toMP4(blob, (n) => progress(0.76 + n * 0.24), fps);
    } finally {
      cleanupCapture?.();
      this.pause();
      this.onTime = previous;
      this.onEnd = oldEnd;
      this.onFailure = undefined;
      this.onBuffering = undefined;
      this.exporting = false;
      this.seek(oldTime);
      for (const t of stream?.getVideoTracks() || []) t.stop();
      if (changedSink) await ctx.setSinkId?.(oldSink).catch(() => {});
    }
  }
}

// MediaRecorder WebM has no duration header. Remux without re-encoding before import.
export async function normalizeRecording(file: File) {
  if (!file.type.includes("webm")) return file;
  if (desktop())
    return new File(
      [await desktop()!.normalizeRecording(await file.arrayBuffer())],
      file.name,
      { type: "video/webm" },
    );
  const f = await ffmpeg(),
    id = crypto.randomUUID(),
    input = id + ".in.webm",
    output = id + ".out.webm";
  try {
    await f.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    if ((await f.exec(["-i", input, "-c", "copy", output])) !== 0)
      throw Error(
        "This recording could not be finalized. Please try recording again.",
      );
    const b = await f.readFile(output);
    return new File([new Uint8Array(b as Uint8Array)], file.name, {
      type: "video/webm",
    });
  } finally {
    await f.deleteFile(input).catch(() => {});
    await f.deleteFile(output).catch(() => {});
  }
}
