import test from "node:test";
import assert from "node:assert/strict";
import { paypalSubscriptions } from "../lib/server/paypal.ts";
const owner = "a".repeat(64),
  attempt = "12345678-1234-1234-1234-123456789abc";
const config = {
  mode: "sandbox" as const,
  clientId: "fixture-client",
  clientSecret: "fixture-secret",
  webhookId: "fixture-hook",
  returnOrigin: "https://editai.test",
  planIds: { starter: "P-STARTER", pro: "P-PRO" },
};
const plan = () => ({
  status: "ACTIVE",
  quantity_supported: false,
  billing_cycles: [
    {
      tenure_type: "REGULAR",
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      total_cycles: 0,
      pricing_scheme: { fixed_price: { currency_code: "USD", value: "8.00" } },
    },
  ],
  payment_preferences: { setup_fee: { value: "0.00" } },
});
test("PayPal verifies merchant pricing before creating an idempotent account-bound checkout", async () => {
  const calls: any[] = [];
  let wrongPrice = false;
  const billing = paypalSubscriptions(config, (async (url: any, init: any) => {
    calls.push({ url, init });
    if (url.endsWith("/token"))
      return Response.json({ access_token: "fixture-access" });
    if (url.includes("/plans/")) {
      const p = plan();
      if (wrongPrice)
        p.billing_cycles[0].pricing_scheme.fixed_price.value = "80.00";
      return Response.json(p);
    }
    const data = JSON.parse(init.body);
    assert.equal(data.custom_id, "editai:" + owner);
    assert.equal(data.plan_id, "P-STARTER");
    assert.equal(
      data.application_context.return_url,
      "https://editai.test/billing/return",
    );
    assert.equal(init.headers["PayPal-Request-Id"], attempt);
    return Response.json({
      id: "I-TEST",
      links: [
        {
          rel: "approve",
          href: "https://www.sandbox.paypal.com/checkoutnow?token=fixture",
        },
      ],
    });
  }) as typeof fetch);
  assert.equal((await billing.create(owner, "starter", attempt)).id, "I-TEST");
  wrongPrice = true;
  const before = calls.length;
  await assert.rejects(
    billing.create(owner, "starter", attempt),
    (e: any) => e.status === 503,
  );
  assert.equal(
    calls.length,
    before + 2,
    "mispriced plans never reach subscription creation",
  );
  assert.ok(
    calls.every((c) =>
      String(c.url).startsWith("https://api-m.sandbox.paypal.com/"),
    ),
  );
});
test("PayPal verifies subscription ownership, plan and ACTIVE status; unverified webhooks are rejected", async () => {
  let status = "APPROVED",
    foreign = false,
    signature = "FAILURE";
  const billing = paypalSubscriptions(config, (async (url: any) => {
    if (url.endsWith("/token"))
      return Response.json({ access_token: "fixture-access" });
    if (url.endsWith("verify-webhook-signature"))
      return Response.json({ verification_status: signature });
    return Response.json({
      id: "I-TEST",
      status,
      custom_id: "editai:" + (foreign ? "b".repeat(64) : owner),
      plan_id: "P-STARTER",
    });
  }) as typeof fetch);
  assert.equal(
    (await billing.verify("I-TEST", owner, "starter")).active,
    false,
  );
  status = "ACTIVE";
  assert.equal((await billing.verify("I-TEST", owner, "starter")).active, true);
  foreign = true;
  await assert.rejects(
    billing.verify("I-TEST", owner, "starter"),
    (e: any) => e.status === 403,
  );
  const headers = new Headers(
    Object.fromEntries(
      [
        "auth-algo",
        "cert-url",
        "transmission-id",
        "transmission-sig",
        "transmission-time",
      ].map((n) => ["paypal-" + n, "fixture"]),
    ),
  );
  const event = { id: "WH-TEST", event_type: "BILLING.SUBSCRIPTION.ACTIVATED" };
  await assert.rejects(
    billing.verifyWebhook(headers, event),
    (e: any) => e.status === 403,
  );
  signature = "SUCCESS";
  assert.deepEqual(await billing.verifyWebhook(headers, event), {
    id: "WH-TEST",
    type: event.event_type,
  });
  await assert.rejects(
    billing.verifyWebhook(new Headers(), event),
    (e: any) => e.status === 400,
  );
});
test("PayPal never accepts missing credentials, unsafe return origins or duplicate plans", () => {
  for (const change of [
    { clientSecret: "" },
    { mode: "arbitrary" },
    { returnOrigin: "http://editai.test" },
    { returnOrigin: "https://editai.test/redirect" },
    { planIds: { starter: "P-SAME", pro: "P-SAME" } },
  ])
    assert.throws(() => paypalSubscriptions({ ...config, ...change } as any));
});
