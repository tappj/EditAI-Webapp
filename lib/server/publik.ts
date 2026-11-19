// Server adaptation of https://publikhq.com/sdk/publik.ts.md for per-browser hosted sessions.
// Installs and keys are isolated per visitor; no host-global credential or background telemetry timer.
export const APP_SLUG = "editai-studio";
export const APP_VERSION = "0.1.0";
export const USES_AI = true;
export const ORIGIN = "https://publikhq.com";
export const MODELS = {
  fast: "publik-fast",
  balanced: "publik-balanced",
  smart: "publik-smart",
} as const;
export class ApiError extends Error {
  status: number;
  url?: string;
  constructor(status: number, message: string, url?: string) {
    super(
      String(message)
        .replace(/\b(?:pat_|pk_|pbt_|sk-)[A-Za-z0-9_.-]+/g, "[redacted]")
        .slice(0, 1000),
    );
    this.status = status;
    this.url = url;
  }
}
export async function publik(
  path: string,
  key: string,
  body?: unknown,
  timeout = 30000,
) {
  const r = await fetch(`${ORIGIN}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const b: any = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new ApiError(
      r.status,
      b.error?.message || `publik API answered ${r.status}.`,
      safePublikURL(b.error?.top_up_url),
    );
  return {
    body: b,
    charge: Number(r.headers.get("x-publik-charge-micros") || 0),
  };
}
export function safePublikURL(s: unknown): string | undefined {
  try {
    const u = new URL(String(s));
    return u.protocol === "https:" &&
      u.hostname === "publikhq.com" &&
      !u.username &&
      !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export async function provision(
  token: string,
  installId: string,
  attempt = 0,
): Promise<any> {
  if (!token)
    throw new ApiError(
      503,
      "Publik onboarding is not configured yet. Please try again later.",
    );
  const r = await fetch(`${ORIGIN}/api/v1/installs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      app_token: token,
      app_slug: APP_SLUG,
      app_version: APP_VERSION,
      os: "linux",
      install_id: installId,
      device_name: "EditAI Web browser session",
      disclosure_version: 1,
      dialects: ["chat_completions"],
    }),
  });
  const b: any = await r.json().catch(() => ({}));
  // Installs only return their secret once. Recover a lost/revoked credential
  // with a fresh install, as the official module does; never loop indefinitely.
  if (r.status === 200 && !b.key && attempt === 0)
    return provision(token, crypto.randomUUID(), 1);
  if (!r.ok || !b.key)
    throw new ApiError(
      r.status === 200 ? 503 : r.status,
      b.error?.message || "publik could not set up this browser.",
    );
  return { ...b, browser_install_id: installId };
}
export async function readWallet(key: string) {
  return (await publik("/wallet", key)).body;
}
export function gateScreen(w: any, choice: string | null) {
  if (w.claim_state !== "claimed")
    return {
      id: "sign_in",
      title: "Sign in with publik",
      body: "Connect your publik account to open your studio. Your videos stay private.",
      buttons: [{ action: "sign_in", label: "Sign in with publik" }],
      claimURL: safePublikURL(w.claim_url),
    };
  if (!choice) {
    const hasPlan = w.plan?.kind === "plan";
    const hasPack = w.plan?.kind === "pack";
    return {
      id: "choose",
      title: hasPlan ? "Connect your plan" : "Your account is ready",
      body:
        hasPlan || hasPack
          ? "Use your Publik balance for AI, or use your own key."
          : "Start editing and saving projects for free. Publik AI uses your available balance.",
      buttons: [
        ...(hasPlan || hasPack
          ? [
              {
                action: "connect",
                label: hasPlan ? "Connect your plan" : "Use Publik balance",
              },
            ]
          : [
              { action: "free", label: "Open studio for free" },
              { action: "get_plan", label: "Get a plan" },
            ]),
        { action: "own_key", label: "Use my own key" },
      ],
      claimURL: safePublikURL(w.top_up_url) || ORIGIN + "/wallet",
    };
  }
  return { id: "ready", title: "Ready", body: "", buttons: [] };
}
export async function sendEvent(
  key: string,
  installId: string,
  event: "app_opened" | "active_session",
) {
  const r = await fetch(`${ORIGIN}/api/v1/telemetry`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(5000),
    body: JSON.stringify({
      v: 1,
      app: APP_SLUG,
      install_id: installId,
      event,
      app_version: APP_VERSION,
      os: "linux",
    }),
  });
  return r.ok;
}

// Hosted gate: request-scoped credentials replace the desktop module's global file.
// The initial /api/session request calls this before the client can show its editor.
export async function ensureSignedIn(key: string, choice: string | null) {
  const wallet = await readWallet(key);
  return { wallet, screen: gateScreen(wallet, choice) };
}

export function walletIdentity(w: any): {
  reference: string;
  scope: "account" | "browser";
} {
  if (w.claim_state !== "claimed")
    throw new ApiError(401, "Sign in with publik to continue.");
  if (typeof w.account?.id === "string" && w.account.id)
    return { reference: "account:" + w.account.id, scope: "account" };
  if (typeof w.account?.handle === "string" && w.account.handle.trim())
    return {
      reference: "handle:" + w.account.handle.trim().toLowerCase(),
      scope: "account",
    };
  // Publik explicitly permits a claimed account with a null public handle. Its
  // verified key_id is stable for this linked browser; never invent a shared ID.
  if (typeof w.key_id === "string" && w.key_id)
    return { reference: "linked-key:" + w.key_id, scope: "browser" };
  throw new ApiError(
    503,
    "publik has not returned this linked browser identity.",
  );
}
