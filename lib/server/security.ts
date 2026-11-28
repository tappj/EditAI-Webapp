import { ApiError } from "./publik.ts";
export const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
function bytes(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
export async function encrypt(text: string, secret: string) {
  if (!secret) throw new ApiError(503, "Secure storage is not configured.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey(
    "raw",
    bytes(secret),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    k,
    new TextEncoder().encode(text),
  );
  return (
    btoa(String.fromCharCode(...iv)) +
    "." +
    btoa(String.fromCharCode(...new Uint8Array(cipher)))
  );
}
export async function decrypt(value: string, secret: string) {
  const [iv, c] = value.split(".");
  const k = await crypto.subtle.importKey(
    "raw",
    bytes(secret),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(iv) },
      k,
      bytes(c),
    ),
  );
}
export function sameOrigin(req: Request) {
  const u = new URL(req.url);
  if (
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.headers.get("origin") !== u.origin
  )
    throw new ApiError(403, "This request must come from EditAI.");
}
export async function jsonBody(req: Request, max = 1024 * 1024) {
  if (Number(req.headers.get("content-length")) > max)
    throw new ApiError(413, "Request too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "Missing request body.");
  const chunks: Uint8Array[] = [];
  let n = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > max) {
      await reader.cancel();
      throw new ApiError(413, "Request too large.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(n);
  let i = 0;
  for (const a of chunks) {
    out.set(a, i);
    i += a.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(out));
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}
export async function limit(
  db: D1Database,
  id: string,
  max: number,
  seconds: number,
) {
  const bucket = Math.floor(Date.now() / 1000 / seconds);
  const r = await db
    .prepare(
      "INSERT INTO limits (id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(id + ":" + bucket, (bucket + 1) * seconds)
    .first<{ count: number }>();
  if ((r?.count || 0) > max)
    throw new ApiError(429, "Too many requests. Please try again shortly.");
}
