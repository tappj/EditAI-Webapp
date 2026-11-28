/** Small user-selected images travel only with an explicitly submitted report. */
export const SUPPORT_MAX_IMAGES = 3;
export const SUPPORT_IMAGE_BYTES = 2 * 1024 * 1024;
export const SUPPORT_TOTAL_IMAGE_BYTES = 5 * 1024 * 1024;
export const SUPPORT_BODY_BYTES = 8 * 1024 * 1024;
export const SUPPORT_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export type SupportImage = {
  name: string;
  type: (typeof SUPPORT_IMAGE_TYPES)[number];
  content: string;
};
export const SUPPORT_IMAGE_LIMIT_MESSAGE =
  "Attach up to 3 images, 2 MB each and 5 MB total.";
export function supportImages(value: unknown): SupportImage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > SUPPORT_MAX_IMAGES)
    throw Error(SUPPORT_IMAGE_LIMIT_MESSAGE);
  let total = 0;
  return value.map((raw) => {
    const image = raw as Partial<SupportImage> | null;
    if (
      !image ||
      typeof image.name !== "string" ||
      !image.name.trim() ||
      image.name.length > 180 ||
      /[\\/\x00-\x1f\x7f]/.test(image.name) ||
      !SUPPORT_IMAGE_TYPES.includes(image.type as SupportImage["type"]) ||
      typeof image.content !== "string" ||
      !image.content.length ||
      image.content.length > Math.ceil(SUPPORT_IMAGE_BYTES / 3) * 4 ||
      image.content.length % 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image.content)
    )
      throw Error("Choose a PNG, JPEG, WebP or GIF image.");
    const data = atob(image.content);
    const bytes = data.length;
    total += bytes;
    if (
      !bytes ||
      bytes > SUPPORT_IMAGE_BYTES ||
      total > SUPPORT_TOTAL_IMAGE_BYTES
    )
      throw Error(SUPPORT_IMAGE_LIMIT_MESSAGE);
    const sig = (n: number) => data.charCodeAt(n);
    const matches =
      image.type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => sig(i) === v)
        : image.type === "image/jpeg"
          ? sig(0) === 255 && sig(1) === 216 && sig(2) === 255
          : image.type === "image/webp"
            ? data.slice(0, 4) === "RIFF" && data.slice(8, 12) === "WEBP"
            : data.startsWith("GIF87a") || data.startsWith("GIF89a");
    if (!matches)
      throw Error(
        "This image could not be read. Choose a PNG, JPEG, WebP or GIF image.",
      );
    return {
      name: image.name.trim(),
      type: image.type!,
      content: image.content,
    };
  });
}
