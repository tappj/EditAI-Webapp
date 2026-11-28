// Server-only PayPal foundation. No merchant credential belongs in desktop or browser assets.
// Deliberately not enabled in product flows until merchant setup and plan benefits are approved.
import { ApiError } from "./publik.ts";
export const editaiPlans = {
  starter: { name: "Starter", monthlyUSD: "8.00", editStarts: 10 },
  pro: { name: "Pro", monthlyUSD: "10.00", editStarts: 100 },
} as const;
export type EditAIPlan = keyof typeof editaiPlans;
export type PayPalConfiguration = {
  mode: "sandbox" | "live";
  clientId: string;
  clientSecret: string;
  webhookId: string;
  returnOrigin: string;
  planIds: Record<EditAIPlan, string>;
};
export function paypalSubscriptions(
  configuration: PayPalConfiguration,
  transport = fetch,
) {
  const c = configuration;
  const origin = new URL(c.returnOrigin);
  if (
    !["sandbox", "live"].includes(c.mode) ||
    !c.clientId ||
    !c.clientSecret ||
    !c.webhookId ||
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !Object.values(c.planIds).every((id) => /^P-[A-Z0-9]+$/.test(id)) ||
    c.planIds.starter === c.planIds.pro
  )
    throw new ApiError(503, "EditAI billing is not configured.");
  const base =
    c.mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  async function token() {
    const response = await transport(base + "/v1/oauth2/token", {
      method: "POST",
      headers: {
        authorization: "Basic " + btoa(c.clientId + ":" + c.clientSecret),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.access_token !== "string")
      throw new ApiError(502, "PayPal could not connect. Please try again.");
    return data.access_token as string;
  }
  async function request(path: string, body?: unknown, requestId?: string) {
    const accessToken = await token();
    const response = await transport(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: "Bearer " + accessToken,
        "content-type": "application/json",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    const data: any =
      response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ApiError(
        502,
        "PayPal could not complete this billing request. Please try again.",
      );
    return data;
  }
  function identity(owner: string) {
    if (!/^[a-f0-9]{64}$/.test(owner))
      throw new ApiError(400, "Invalid billing account.");
    return "editai:" + owner;
  }
  async function verifyPlan(plan: EditAIPlan) {
    if (!Object.hasOwn(editaiPlans, plan))
      throw new ApiError(400, "Choose an EditAI plan.");
    const product = await request("/v1/billing/plans/" + c.planIds[plan]);
    const cycles = product.billing_cycles;
    const price = cycles?.[0]?.pricing_scheme?.fixed_price;
    // Reject unexpected setup fees, trial cycles, taxes, quantity pricing or cadence.
    if (
      product.status !== "ACTIVE" ||
      product.quantity_supported === true ||
      (product.taxes && Number(product.taxes.percentage) !== 0) ||
      !Array.isArray(cycles) ||
      cycles.length !== 1 ||
      cycles[0].tenure_type !== "REGULAR" ||
      cycles[0].frequency?.interval_unit !== "MONTH" ||
      cycles[0].frequency.interval_count !== 1 ||
      cycles[0].total_cycles !== 0 ||
      price?.currency_code !== "USD" ||
      Number(price.value) !== Number(editaiPlans[plan].monthlyUSD) ||
      Number(product.payment_preferences?.setup_fee?.value ?? 0) !== 0
    )
      throw new ApiError(503, "This EditAI plan is not ready for checkout.");
  }
  async function subscription(id: string, owner: string, plan: EditAIPlan) {
    if (!/^I-[A-Z0-9]+$/.test(id))
      throw new ApiError(400, "Invalid subscription.");
    if (!Object.hasOwn(editaiPlans, plan))
      throw new ApiError(400, "Choose an EditAI plan.");
    const result = await request("/v1/billing/subscriptions/" + id);
    if (
      result.id !== id ||
      result.custom_id !== identity(owner) ||
      result.plan_id !== c.planIds[plan]
    )
      throw new ApiError(
        403,
        "This subscription does not belong to this account and plan.",
      );
    // A browser redirect and APPROVED status alone never grant paid access.
    return {
      id,
      plan,
      status: result.status,
      active: result.status === "ACTIVE",
    };
  }
  return {
    async create(owner: string, plan: EditAIPlan, attemptId: string) {
      const customId = identity(owner);
      if (!/^[a-f0-9-]{36}$/i.test(attemptId))
        throw new ApiError(400, "Invalid checkout attempt.");
      await verifyPlan(plan);
      const result = await request(
        "/v1/billing/subscriptions",
        {
          plan_id: c.planIds[plan],
          custom_id: customId,
          application_context: {
            brand_name: "EditAI",
            shipping_preference: "NO_SHIPPING",
            user_action: "SUBSCRIBE_NOW",
            return_url: origin.origin + "/billing/return",
            cancel_url: origin.origin + "/billing/cancel",
          },
        },
        attemptId,
      );
      const approve = result.links?.find((link: any) => link.rel === "approve");
      let url: URL;
      try {
        url = new URL(approve?.href);
      } catch {
        throw new ApiError(502, "PayPal did not return a checkout link.");
      }
      const host =
        c.mode === "live" ? "www.paypal.com" : "www.sandbox.paypal.com";
      if (
        !/^I-[A-Z0-9]+$/.test(result.id) ||
        url.protocol !== "https:" ||
        url.hostname !== host ||
        url.username ||
        url.password ||
        url.port
      )
        throw new ApiError(502, "PayPal returned an invalid checkout link.");
      return { id: result.id, approvalURL: url.href };
    },
    verify: subscription,
    async cancel(
      owner: string,
      plan: EditAIPlan,
      id: string,
      attemptId: string,
    ) {
      if (!/^[a-f0-9-]{36}$/i.test(attemptId))
        throw new ApiError(400, "Invalid cancellation attempt.");
      await subscription(id, owner, plan);
      await request(
        "/v1/billing/subscriptions/" + id + "/cancel",
        { reason: "Cancelled by the account holder" },
        attemptId,
      );
    },
    async verifyWebhook(headers: Headers, event: any) {
      if (
        !event ||
        typeof event.id !== "string" ||
        event.id.length > 128 ||
        typeof event.event_type !== "string"
      )
        throw new ApiError(400, "Invalid billing event.");
      const required = [
        "paypal-auth-algo",
        "paypal-cert-url",
        "paypal-transmission-id",
        "paypal-transmission-sig",
        "paypal-transmission-time",
      ];
      if (required.some((name) => !headers.get(name)))
        throw new ApiError(400, "Missing billing signature.");
      const result = await request(
        "/v1/notifications/verify-webhook-signature",
        {
          auth_algo: headers.get("paypal-auth-algo"),
          cert_url: headers.get("paypal-cert-url"),
          transmission_id: headers.get("paypal-transmission-id"),
          transmission_sig: headers.get("paypal-transmission-sig"),
          transmission_time: headers.get("paypal-transmission-time"),
          webhook_id: c.webhookId,
          webhook_event: event,
        },
      );
      if (result.verification_status !== "SUCCESS")
        throw new ApiError(403, "Invalid billing signature.");
      return { id: event.id, type: event.event_type };
    },
  };
}
