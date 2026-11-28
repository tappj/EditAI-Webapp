import { trackSave } from "./save-activity";
import { openDB } from "idb";
import type { Project } from "./model";
import { desktop, type MediaResource } from "./desktop";
let scope = "signed-out";
export function setStorageScope(owner: string) {
  scope = owner;
}
const db = () =>
  openDB("editai-studio", 1, {
    upgrade(d) {
      d.createObjectStore("projects", { keyPath: "id" });
      d.createObjectStore("media");
      d.createObjectStore("preferences");
    },
  });
const storeMedia = async (id: string, file: Blob, mime = file.type) => {
  const native = desktop();
  if (native) {
    const retained =
      file instanceof File ? await native.importFile(id, file, mime) : null;
    if (!retained) await native.writeMedia(id, await file.arrayBuffer(), mime);
    return;
  }
  const root = scope + ":" + id,
    d = await db();
  const previous = await d.get("media", root);
  try {
    await d.put("media", file, root);
  } catch (e: any) {
    if (e.name === "QuotaExceededError")
      throw Error(
        "This browser's storage is full. Free some space or use a smaller video.",
      );
    if (
      !["UnknownError", "DataCloneError"].includes(e.name) &&
      !/blob|file data/i.test(e.message)
    )
      throw e;
    // WebKit can decode a File yet reject persisting its Blob backing store.
    // ArrayBuffer chunks avoid that path without reading the whole file at once.
    const keys: string[] = [],
      prefix = root + ":chunk:" + crypto.randomUUID() + ":";
    try {
      for (let offset = 0; offset < file.size; offset += 4 * 1024 * 1024) {
        const key = prefix + keys.length;
        keys.push(key);
        await d.put(
          "media",
          await file.slice(offset, offset + 4 * 1024 * 1024).arrayBuffer(),
          key,
        );
      }
      await d.put(
        "media",
        {
          format: "editai-media-chunks-v1",
          type: file.type,
          size: file.size,
          keys,
        },
        root,
      );
    } catch (error) {
      for (const key of keys) await d.delete("media", key);
      throw error;
    }
  }
  if (previous?.format === "editai-media-chunks-v1")
    for (const key of previous.keys)
      if (typeof key === "string" && key.startsWith(root + ":chunk:"))
        await d.delete("media", key);
};
export const saveMedia = (...args: Parameters<typeof storeMedia>) =>
  trackSave(() => storeMedia(...args));
export const loadMedia = async (
  id: string,
): Promise<MediaResource | undefined> => {
  if (desktop()) return (await desktop()!.getMedia(id)) || undefined;
  const root = scope + ":" + id,
    d = await db(),
    value = await d.get("media", root);
  if (value == null || value instanceof Blob) return value;
  if (
    value.format !== "editai-media-chunks-v1" ||
    !Array.isArray(value.keys) ||
    value.keys.length > 256
  )
    throw Error(
      "Saved media could not be read. Restore its original file or cloud backup.",
    );
  const chunks: ArrayBuffer[] = [];
  for (const key of value.keys) {
    if (typeof key !== "string" || !key.startsWith(root + ":chunk:"))
      throw Error("Invalid saved media.");
    const bytes = await d.get("media", key);
    if (!(bytes instanceof ArrayBuffer))
      throw Error(
        "Saved media is incomplete. Restore its original file or cloud backup.",
      );
    chunks.push(bytes);
  }
  const file = new Blob(chunks, { type: value.type });
  if (file.size !== value.size)
    throw Error(
      "Saved media is incomplete. Restore its original file or cloud backup.",
    );
  return file;
};
export const saveProject = async (p: Project, owner = scope) => {
  await trackSave(async () => {
    await (await db()).put("projects", { ...p, _owner: owner });
  });
};
export const listProjects = async (owner = scope): Promise<Project[]> =>
  ((await (await db()).getAll("projects")) as (Project & { _owner?: string })[])
    .filter((p) => p._owner === owner)
    .sort((a, b) => b.updatedAt - a.updatedAt);
export const deleteProject = async (id: string) => {
  const owner = scope,
    d = await db(),
    p = await d.get("projects", id);
  if (p?._owner !== owner) return;
  await d.delete("projects", id);
  const used = new Set(
    (await listProjects(owner)).flatMap((p) =>
      p.document.sources.map((s) => s.id),
    ),
  );
  for (const s of p.document.sources)
    if (!used.has(s.id)) {
      if (desktop()) {
        await desktop()!.deleteMedia([s.id]);
        continue;
      }
      const root = owner + ":" + s.id,
        media = await d.get("media", root);
      if (media?.format === "editai-media-chunks-v1")
        for (const key of media.keys)
          if (typeof key === "string" && key.startsWith(root + ":chunk:"))
            await d.delete("media", key);
      await d.delete("media", root);
    }
};
export const clearStorage = async () => {
  const owner = scope,
    d = await db();
  if (desktop())
    await desktop()!.deleteMedia([
      ...new Set(
        (await listProjects(owner)).flatMap((p) =>
          p.document.sources.map((s) => s.id),
        ),
      ),
    ]);
  for (const k of await d.getAllKeys("media"))
    if (String(k).startsWith(owner + ":")) await d.delete("media", k);
  for (const p of await listProjects(owner)) await d.delete("projects", p.id);
};

export const deleteUnusedMedia = async (id: string) => {
  const owner = scope;
  if (
    (await listProjects(owner)).some((p) =>
      p.document.sources.some((s) => s.id === id),
    )
  )
    return;
  if (desktop()) {
    await desktop()!.deleteMedia([id]);
    return;
  }
  const d = await db(),
    root = owner + ":" + id;
  const media = await d.get("media", root);
  const tx = d.transaction("media", "readwrite");
  if (media?.format === "editai-media-chunks-v1")
    for (const key of media.keys)
      if (typeof key === "string" && key.startsWith(root + ":chunk:"))
        await tx.store.delete(key);
  await tx.store.delete(root);
  await tx.done;
};
