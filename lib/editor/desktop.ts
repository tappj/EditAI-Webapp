import type { Document } from "./model";
export type NativeMedia = {
  native: true;
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
};
export type MediaResource = Blob | NativeMedia;
export type DesktopBridge = {
  platform: string;
  setBackgroundWork?(active: boolean): Promise<void>;
  signOut(forget?: boolean): Promise<void>;
  importFile(id: string, file: File, mime: string): Promise<NativeMedia | null>;
  writeMedia(
    id: string,
    bytes: ArrayBuffer,
    type: string,
  ): Promise<NativeMedia>;
  getMedia(id: string): Promise<NativeMedia | null>;
  deleteMedia(ids: string[]): Promise<void>;
  extractAudio(id: string, start: number, length: number): Promise<ArrayBuffer>;
  normalizeRecording(bytes: ArrayBuffer): Promise<ArrayBuffer>;
  beginExport(
    document: Document,
    width: number,
    height: number,
    fps: number,
  ): Promise<{ id: string; mode: "native" | "frames" }>;
  exportFrame(job: string, png: ArrayBuffer): Promise<void>;
  finishExport(job: string): Promise<void>;
  cancelExport(job: string): Promise<void>;
  activity(): void;
};
declare global {
  interface Window {
    editaiDesktop?: DesktopBridge;
  }
}
export const desktop = () =>
  typeof window !== "undefined" ? window.editaiDesktop : undefined;
export const isNative = (media: MediaResource): media is NativeMedia =>
  !(media instanceof Blob);
export const mediaURL = (media: MediaResource) =>
  isNative(media) ? media.url : URL.createObjectURL(media);
export async function mediaBlob(media: MediaResource): Promise<Blob> {
  if (!isNative(media)) return media;
  const response = await fetch(media.url);
  if (!response.ok)
    throw Error(
      "The original local file is unavailable. Restore it and reopen the project.",
    );
  return response.blob();
}
