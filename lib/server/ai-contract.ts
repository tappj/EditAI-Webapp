import { hash } from "./security.ts";
import { ApiError } from "./publik.ts";
import { validateChatRequest } from "../ios/chat.mjs";

export type OwnAiKey = { provider: "openai"; key: string; model?: string };
export type AiContext = {
  path: string;
  body: any;
  db: D1Database;
  owner: string;
  key: string;
  choice: string | null;
  ownKey: OwnAiKey | null;
  signal: AbortSignal;
};
export type AiEngine = {
  kind: "local" | "remote";
  run: (context: AiContext) => Promise<unknown>;
};

const jobPattern = /^[a-zA-Z0-9:_-]{1,128}$/;
export function validateAiBody(path: string, body: any) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(400, "Invalid AI request.");
  if (path === "ai/chat") {
    // The service handles the default reference request after validation.
    const input = typeof body.prompt === "string" && !body.prompt.trim() && body.reference
      ? { ...body, prompt: "Use this style reference." } : body;
    try { validateChatRequest(input); }
    catch { throw new ApiError(400, "This editor request could not be read. Your project is saved."); }
    return;
  }
  if (!["ai/edit", "ai/summary"].includes(path))
    throw new ApiError(404, "Not found.");
  const words = body.words;
  if (!Array.isArray(words) || !words.length || words.length > 6000)
    throw new ApiError(400, "Choose a transcript of 1–6,000 words.");
  const ids = new Set();
  let previous = -1, clip = -1;
  for (const word of words) {
    if (!word || typeof word.id !== "string" || ids.has(word.id) ||
      !Number.isInteger(word.clip) || word.clip < 0 || word.clip < clip ||
      !Number.isFinite(word.start) || !Number.isFinite(word.end) ||
      word.start < 0 || word.end <= word.start || word.end > 1800 ||
      typeof word.text !== "string" || word.text.length > 500 ||
      (word.clip === clip && word.start < previous))
      throw new ApiError(400, "Invalid transcript.");
    ids.add(word.id); previous = word.start; clip = word.clip;
  }
  if (body.jobId !== undefined && (typeof body.jobId !== "string" || !jobPattern.test(body.jobId)))
    throw new ApiError(400, "Invalid saved edit.");
}

export function nativeAiEnvelope(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).some(key => !["path", "request", "choice", "ownKey", "consent"].includes(key)) ||
    typeof value.path !== "string" ||
    !(value.path === "ai/edit" || value.path === "ai/summary" || value.path === "ai/chat" || value.path === "ai/delete-data" ||
      (value.path.startsWith("ai/edit-job/") && jobPattern.test(value.path.slice(12)))) ||
    !["publik", "own_key"].includes(value.choice))
    throw new ApiError(400, "Invalid AI request.");
  if (value.consent !== true && value.path !== "ai/delete-data")
    throw new ApiError(403, "Allow AI processing in Settings before sending transcripts.");
  let ownKey: OwnAiKey | null = null;
  if (value.choice === "own_key" && !value.path.startsWith("ai/edit-job/") && value.path !== "ai/delete-data") {
    const input = value.ownKey;
    if (!input || input.provider !== "openai" || typeof input.key !== "string" ||
      input.key.length < 12 || input.key.length > 512 || /\s/.test(input.key) ||
      (input.model !== undefined && (typeof input.model !== "string" ||
        input.model.length < 1 || input.model.length > 100 || !/^[a-zA-Z0-9._:/-]+$/.test(input.model))))
      throw new ApiError(400, "Add your own OpenAI API key in Settings.");
    ownKey = { provider: "openai", key: input.key, ...(input.model ? {model: input.model} : {}) };
  }
  return {path: value.path as string, request: value.request,
    choice: value.choice as "publik" | "own_key", ownKey};
}

export async function nativeJob(namespace: string, job: string) {
  if (!jobPattern.test(job)) throw new ApiError(400, "Invalid saved edit.");
  return "native-" + await hash(namespace + ":" + job);
}
