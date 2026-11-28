import { ApiError, safePublikURL } from "./publik.ts";
import type { AiContext, AiEngine } from "./ai-contract.ts";

export type AiServiceConfig = { EDITAI_AI_ORIGIN?: string; EDITAI_AI_SERVICE_TOKEN?: string };
export function createRemoteAiEngine(config: AiServiceConfig = {}): AiEngine {
  return { kind: "remote", run: context => relayAi(context, fetch, config) };
}

/** Public clients receive edits only. No model instructions are shipped here. */
export async function relayAi(context: AiContext, send: typeof fetch = fetch, config: AiServiceConfig = {}) {
  const target = new URL(config.EDITAI_AI_ORIGIN || "https://editai.it.com");
  if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash || target.pathname !== "/" ||
    (config.EDITAI_AI_ORIGIN && (!target.hostname.endsWith(".chatgpt.site") || !config.EDITAI_AI_SERVICE_TOKEN)))
    throw new ApiError(503, "EditAI AI is not configured on this server.");
  let response: Response;
  try {
    response = await send(target.origin + "/api/desktop-ai/execute", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: target.origin,
        authorization: `Bearer ${context.key}`,
        ...(config.EDITAI_AI_ORIGIN ? {"OAI-Sites-Authorization": `Bearer ${config.EDITAI_AI_SERVICE_TOKEN}`} : {}),
      },
      body: JSON.stringify({
        path: context.path,
        request: context.body,
        choice: context.choice || "publik",
        ownKey: context.choice === "own_key" ? context.ownKey : null,
        consent: true,
      }),
      // Workers supports manual/follow only. Never forward credentials on redirects.
      redirect: "manual",
      signal: AbortSignal.any([context.signal, AbortSignal.timeout(600000)]),
    });
  } catch (error) {
    context.signal.throwIfAborted();
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    console.warn(JSON.stringify({event:"ai_service_unreachable",category:
      message.includes("redirect") ? "redirect" : message.includes("cross") ? "cross_worker" :
      message.includes("abort") ? "abort" : message.includes("certificate") ? "tls" : "network"}));
    throw new ApiError(502, "EditAI AI could not be reached. Your project is saved. Please try again.");
  }
  if (response.status >= 300 && response.status < 400)
    throw new ApiError(502, "EditAI AI could not be reached. Your project is saved. Please try again.");
  const body: any = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(response.status,
      typeof body?.error === "string" ? body.error : "EditAI couldn’t complete that edit. Your project is saved.",
      safePublikURL(body?.url));
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(502, "EditAI returned an unreadable edit. Your project is saved.");
  return body;
}

export const aiEngine: AiEngine = { kind: "remote", run: relayAi };
