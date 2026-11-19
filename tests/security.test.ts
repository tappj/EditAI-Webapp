import test from "node:test";
import assert from "node:assert/strict";
import {
  encrypt,
  decrypt,
  sameOrigin,
  jsonBody,
} from "../lib/server/security.ts";
import { safePublikURL, ApiError } from "../lib/server/publik.ts";
const key = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
test("stored credentials use authenticated encryption with unique IVs", async () => {
  const k = key(),
    a = await encrypt("fixture credential", k),
    b = await encrypt("fixture credential", k);
  assert.notEqual(a, b);
  assert.equal(await decrypt(a, k), "fixture credential");
  await assert.rejects(decrypt(a, key()));
  assert.ok(!a.includes("fixture credential"));
});
test("cross-origin and missing-origin writes are rejected before data access", () => {
  for (const origin of ["https://untrusted.invalid", undefined])
    assert.throws(
      () =>
        sameOrigin(
          new Request("https://editai.example/api/projects", {
            method: "POST",
            headers: origin ? { origin } : {},
          }),
        ),
      (e: any) => e instanceof ApiError && e.status === 403,
    );
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("https://editai.example/api/projects", {
        method: "POST",
        headers: { origin: "https://editai.example" },
      }),
    ),
  );
});
test("JSON parsing is bounded even without a content-length header", async () => {
  const req = new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify({ text: "x".repeat(200) }),
  });
  await assert.rejects(jsonBody(req, 100), (e: any) => e.status === 413);
  await assert.rejects(
    jsonBody(
      new Request("https://example.test", { method: "POST", body: "not JSON" }),
    ),
    (e: any) => e.status === 400,
  );
});
test("payment recovery links allow only the official HTTPS origin", () => {
  assert.equal(
    safePublikURL("https://publikhq.com/wallet"),
    "https://publikhq.com/wallet",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://publikhq.com.untrusted.invalid/wallet",
    "http://publikhq.com",
    "https://user:pass@publikhq.com/wallet",
  ])
    assert.equal(safePublikURL(url), undefined);
});

test("a legitimately linked Publik account may have no public handle", async () => {
  const { walletIdentity } = await import("../lib/server/publik.ts");
  assert.deepEqual(
    walletIdentity({
      claim_state: "claimed",
      account: { handle: null },
      key_id: "fixture_key_id",
    }),
    { reference: "linked-key:fixture_key_id", scope: "browser" },
  );
  assert.throws(
    () =>
      walletIdentity({ claim_state: "anonymous", key_id: "fixture_key_id" }),
    (e: any) => e.status === 401,
  );
  assert.deepEqual(
    walletIdentity({ claim_state: "claimed", account: { handle: "Creator" } }),
    { reference: "handle:creator", scope: "account" },
  );
});

test("the free studio path requires an authenticated Publik account", async () => {
  const { gateScreen } = await import("../lib/server/publik.ts");
  const wallet = {
    claim_state: "anonymous",
    plan: { kind: "none" },
    balance_micros: 0,
  };
  assert.equal(gateScreen(wallet, "publik").id, "sign_in");
  const claimed = { ...wallet, claim_state: "claimed" };
  assert.deepEqual(
    gateScreen(claimed, null).buttons.map((button) => button.action),
    ["free", "get_plan", "own_key"],
  );
  assert.equal(gateScreen(claimed, "publik").id, "ready");
  const starter = { ...claimed, balance_micros: 50_000 };
  assert.equal(gateScreen(starter, null).buttons[0].action, "free");
  assert.equal(
    gateScreen({ ...starter, plan: { kind: "plan" } }, null).buttons[0].action,
    "connect",
  );
});

test("a lost one-time install credential recovers once with a fresh install", async () => {
  const { provision } = await import("../lib/server/publik.ts");
  const original = globalThis.fetch;
  const ids: string[] = [];
  try {
    globalThis.fetch = (async (_url, init) => {
      ids.push(JSON.parse(String(init?.body)).install_id);
      return Response.json(
        ids.length === 1 ? {} : { key: "fixture credential" },
        { status: ids.length === 1 ? 200 : 201 },
      );
    }) as typeof fetch;
    const c = await provision("fixture app token", "first-install");
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
    assert.equal(c.browser_install_id, ids[1]);
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return Response.json({});
    }) as typeof fetch;
    await assert.rejects(
      provision("fixture app token", "lost"),
      (e: any) => e.status === 503,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
