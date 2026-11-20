export type Reference = {
  kind: "image" | "video";
  name: string;
  frames: { base64JPEG: string; timeSeconds: number | null }[];
};
export async function makeReference(file: File): Promise<Reference> {
  if (!/^(image|video)\//.test(file.type))
    throw Error("Choose an image or video reference.");
  if (file.size > 100 * 1024 * 1024)
    throw Error("Choose a reference smaller than 100 MB.");
  const url = URL.createObjectURL(file),
    canvas = document.createElement("canvas");
  let video: HTMLVideoElement | undefined;
  try {
    const frames: Reference["frames"] = [];
    const capture = (
      el: CanvasImageSource,
      w: number,
      h: number,
      t: number | null,
    ) => {
      const scale = Math.min(1, 960 / Math.max(w, h));
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      canvas.getContext("2d")!.drawImage(el, 0, 0, canvas.width, canvas.height);
      frames.push({
        base64JPEG: canvas.toDataURL("image/jpeg", 0.65).split(",")[1],
        timeSeconds: t,
      });
    };
    if (file.type.startsWith("image/")) {
      const image = new Image();
      image.src = url;
      await image.decode();
      capture(image, image.naturalWidth, image.naturalHeight, null);
      return { kind: "image", name: file.name.slice(0, 255), frames };
    }
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((r, j) => {
      video!.onloadedmetadata = () => r();
      video!.onerror = () =>
        j(Error("This browser cannot open the reference video."));
      video!.src = url;
    });
    if (!Number.isFinite(video.duration) || video.duration > 1800)
      throw Error("Choose a reference video up to 30 minutes.");
    for (const fraction of [0.08, 0.35, 0.62, 0.88]) {
      const t = video.duration * fraction;
      await new Promise<void>((r, j) => {
        const timeout = setTimeout(
          () => j(Error("Reference frame could not be read.")),
          10000,
        );
        video!.onseeked = () => {
          clearTimeout(timeout);
          r();
        };
        video!.currentTime = t;
      });
      capture(video, video.videoWidth, video.videoHeight, t);
    }
    if (
      frames.some((f) => f.base64JPEG.length > 500000) ||
      frames.reduce((n, f) => n + f.base64JPEG.length, 0) > 1500000
    )
      throw Error("Reference frames are too large. Try a smaller reference.");
    return { kind: "video", name: file.name.slice(0, 255), frames };
  } finally {
    if (video) {
      video.removeAttribute("src");
      video.load();
    }
    URL.revokeObjectURL(url);
  }
}
