import {
  referenceTextObservations,
  type TextObservation,
} from "./reference-observations.ts";
import { referenceFontGuide } from "./reference-font-guide.ts";
import {
  audioEvidence,
  temporalEvidence,
  type TemporalSample,
} from "./reference-metrics.ts";
export type Reference = {
  kind: "image" | "video";
  name: string;
  width: number;
  height: number;
  duration: number | null;
  safePlacement: boolean;
  frames: {
    base64JPEG: string;
    timeSeconds: number | null;
    role?: "detail" | "motion" | "fontGuide";
    times?: number[];
    repeatTransitions?: number;
  }[];
  textObservations?: TextObservation[];
  temporal?: ReturnType<typeof temporalEvidence>;
  audio?:
    | ReturnType<typeof audioEvidence>
    | { status: "unavailable"; quietWindows: []; quietFraction: null };
};
export async function makeReference(
  file: File,
  progress: (message: string) => void = () => {},
  converted = false,
): Promise<Reference> {
  if (!/^(image|video)\//.test(file.type))
    throw Error("Choose an image or video reference.");
  if (!converted && file.size > 100 * 1024 * 1024)
    throw Error("Choose a reference smaller than 100 MB.");
  const url = URL.createObjectURL(file),
    canvas = document.createElement("canvas");
  let video: HTMLVideoElement | undefined;
  const frames: Reference["frames"] = [];
  const capture = (
    el: CanvasImageSource,
    w: number,
    h: number,
    t: number | null,
  ) => {
    if (!(w > 0 && h > 0))
      throw Error("Reference video has no readable frames.");
    const scale = Math.min(1, 1280 / Math.max(w, h));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d")!.drawImage(el, 0, 0, canvas.width, canvas.height);
    let jpeg = "";
    for (const quality of [0.9, 0.75, 0.55, 0.4]) {
      jpeg = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      if (jpeg.length <= 500_000) break;
    }
    if (jpeg.length > 500_000)
      throw Error("This reference image is too detailed. Try a smaller image.");
    frames.push({
      base64JPEG: jpeg,
      timeSeconds: t,
      role: "detail",
    });
  };
  try {
    if (file.type.startsWith("image/")) {
      const image = new Image();
      image.src = url;
      await image.decode();
      capture(image, image.naturalWidth, image.naturalHeight, null);
      return {
        kind: "image",
        name: file.name.slice(0, 255),
        width: image.naturalWidth,
        height: image.naturalHeight,
        duration: null,
        safePlacement: true,
        frames,
        textObservations: await referenceTextObservations(frames),
      };
    }
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Reference video could not be opened.")),
          15000,
        );
        video!.onloadeddata = () => {
          clearTimeout(timer);
          if (video!.videoWidth > 0 && video!.videoHeight > 0) resolve();
          else reject(Error("Reference video has no readable frames."));
        };
        video!.onloadedmetadata = () => {
          if (
            !Number.isFinite(video!.duration) ||
            video!.duration <= 0 ||
            video!.duration > 1800
          ) {
            clearTimeout(timer);
            reject(Error("Choose a reference video up to 30 minutes."));
          }
        };
        video!.onerror = () => {
          clearTimeout(timer);
          reject(Error("This browser cannot open the reference video."));
        };
        video!.src = url;
      });
    } catch (error) {
      if (
        converted ||
        (error as Error).message ===
          "Choose a reference video up to 30 minutes."
      )
        throw error;
      video.pause();
      video.removeAttribute("src");
      video.load();
      progress("Preparing reference video");
      const { toMP4 } = await import("./media");
      const compatible = await toMP4(
        file,
        (n) => progress(`Preparing reference video · ${Math.round(n * 100)}%`),
        30,
        1280,
      );
      return await makeReference(
        new File([compatible], file.name, { type: "video/mp4" }),
        progress,
        true,
      );
    }
    const duration = video.duration,
      width = video.videoWidth,
      height = video.videoHeight;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1800)
      throw Error("Choose a reference video up to 30 minutes.");
    const seek = async (time: number) => {
      const target = Math.min(duration - 0.001, Math.max(0, time));
      if (
        Math.abs(video!.currentTime - target) < 0.0001 &&
        video!.readyState >= 2
      )
        return;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Reference frame could not be read.")),
          10000,
        );
        video!.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video!.currentTime = target;
      });
    };
    // Dense low-resolution scan stays on this device. Only selected detail frames,
    // eight ordered strips and bounded numeric measurements are sent when prompted.
    const scan = document.createElement("canvas");
    scan.width = 48;
    scan.height = 48;
    const ctx = scan.getContext("2d", { willReadFrequently: true })!;
    const count = Math.min(900, Math.max(2, Math.ceil(duration * 6) + 1));
    const samples: TemporalSample[] = [];
    let prior: Uint8ClampedArray | undefined;
    for (let i = 0; i < count; i++) {
      const time = Math.min(duration - 0.001, (i * duration) / (count - 1));
      await seek(time);
      ctx.drawImage(video, 0, 0, 48, 48);
      const pixels = ctx.getImageData(0, 0, 48, 48).data;
      let change = 0;
      if (prior)
        for (let p = 0; p < pixels.length; p += 4)
          change +=
            (Math.abs(pixels[p] - prior[p]) +
              Math.abs(pixels[p + 1] - prior[p + 1]) +
              Math.abs(pixels[p + 2] - prior[p + 2])) /
            (255 * 3 * 48 * 48);
      samples.push({ time, change });
      prior = pixels;
      if (i % 30 === 0)
        progress(
          `Measuring reference motion · ${Math.round((i / count) * 100)}%`,
        );
    }
    const temporal = temporalEvidence(samples, duration);
    // Cover the full reference, plus frames immediately after likely scene cuts.
    const detailTimes = Array.from(
      { length: 8 },
      (_, i) => (duration * (i + 0.5)) / 8,
    );
    const cuts = temporal.sceneChangeCandidates;
    for (let i = 0; i < Math.min(2, cuts.length); i++)
      detailTimes.push(
        Math.min(
          duration - 0.001,
          cuts[Math.floor((i * cuts.length) / Math.min(2, cuts.length))] + 0.08,
        ),
      );
    for (const time of detailTimes.sort((a, b) => a - b)) {
      await seek(time);
      capture(video, width, height, time);
    }
    progress("Preparing text and motion comparisons");
    const strip = document.createElement("canvas");
    const tileScale = Math.min(240 / height, 320 / width),
      tileHeight = Math.max(1, Math.round(height * tileScale)),
      tileWidth = Math.max(1, Math.round(width * tileScale));
    strip.width = tileWidth * 6;
    strip.height = tileHeight;
    const stripCtx = strip.getContext("2d")!;
    const centers = Array.from(
      { length: 6 },
      (_, n) => (duration * (n + 0.5)) / 6,
    );
    const slowCandidates = temporal.motionWindows
      .map((w, i, all) => ({
        center: (w.start + w.end) / 2,
        score:
          ((all[i - 1]?.change ?? w.change) +
            (all[i + 1]?.change ?? w.change)) /
          Math.max(0.00001, w.change),
      }))
      .sort((a, b) => b.score - a.score);
    for (const candidate of slowCandidates) {
      if (centers.length === 8) break;
      if (
        centers.every(
          (t) => Math.abs(t - candidate.center) > Math.min(0.5, duration / 20),
        )
      )
        centers.push(candidate.center);
    }
    while (centers.length < 8) centers.push((duration * centers.length) / 8);
    for (const center of centers.sort((a, b) => a - b)) {
      let stripPrior: Uint8ClampedArray | undefined,
        repeatTransitions = 0;
      const times: number[] = [];
      for (let i = 0; i < 6; i++) {
        const time = Math.max(
          0,
          Math.min(duration - 0.001, center + (i - 2.5) / 30),
        );
        await seek(time);
        stripCtx.drawImage(video, i * tileWidth, 0, tileWidth, tileHeight);
        times.push(time);
        ctx.drawImage(video, 0, 0, 48, 48);
        const pixels = ctx.getImageData(0, 0, 48, 48).data;
        let difference = 0;
        if (stripPrior) {
          for (let p = 0; p < pixels.length; p += 4)
            difference +=
              Math.abs(pixels[p] - stripPrior[p]) +
              Math.abs(pixels[p + 1] - stripPrior[p + 1]) +
              Math.abs(pixels[p + 2] - stripPrior[p + 2]);
          if (difference / (255 * 3 * 48 * 48) < 0.001) repeatTransitions++;
        }
        stripPrior = pixels;
      }
      frames.push({
        base64JPEG: strip.toDataURL("image/jpeg", 0.65).split(",")[1],
        timeSeconds: center,
        role: "motion",
        times,
        repeatTransitions,
      });
    }
    progress("Measuring reference audio pauses");
    let audio: Reference["audio"] = {
      status: "unavailable",
      quietWindows: [],
      quietFraction: null,
    };
    // Decode locally when supported. No transcription job, uploaded audio or
    // guessed speech timings; unavailable audio never blocks a visual reference.
    const ac = duration <= 180 ? new AudioContext() : null;
    try {
      if (!ac) throw Error("Audio sampling is limited to three minutes.");
      const decoded = await ac.decodeAudioData(await file.arrayBuffer());
      const mono = new Float32Array(decoded.length);
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
        const data = decoded.getChannelData(channel);
        for (let i = 0; i < data.length; i++)
          mono[i] += data[i] / decoded.numberOfChannels;
      }
      audio = audioEvidence(mono, decoded.sampleRate);
    } catch {
      /* Some engines cannot decode an MP4 audio container. */
    } finally {
      await ac?.close();
    }
    try {
      const guide = await referenceFontGuide();
      if (frames.length >= 18) {
        const lastMotion = frames.findLastIndex((f) => f.role === "motion");
        if (lastMotion >= 0) frames.splice(lastMotion, 1);
      }
      if (frames.length < 18) frames.push(guide);
    } catch {
      /* Font loading cannot block a reference. */
    }
    // Keep the authenticated request below its existing 2MB ceiling. Re-encode
    // detail frames if unusually textured footage exhausts the image budget.
    if (frames.reduce((n, f) => n + f.base64JPEG.length, 0) > 1_450_000) {
      for (const frame of frames) {
        const image = new Image();
        image.src = "data:image/jpeg;base64," + frame.base64JPEG;
        await image.decode();
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d")!.drawImage(image, 0, 0);
        frame.base64JPEG = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
      }
    }
    if (
      frames.some((f) => f.base64JPEG.length > 500_000) ||
      frames.reduce((n, f) => n + f.base64JPEG.length, 0) > 1_500_000
    )
      throw Error("Reference frames are too large. Try a smaller reference.");
    return {
      kind: "video",
      name: file.name.slice(0, 255),
      width,
      height,
      duration,
      safePlacement: true,
      frames,
      temporal,
      audio,
      textObservations: await referenceTextObservations(frames),
    };
  } finally {
    if (video) {
      video.removeAttribute("src");
      video.load();
    }
    URL.revokeObjectURL(url);
  }
}
