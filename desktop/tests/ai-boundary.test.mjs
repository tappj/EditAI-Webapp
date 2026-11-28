import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore } from "../local-store.mjs";

const directory = await mkdtemp(join(tmpdir(), "editai-ai-boundary-"));
await build({
  stdin: {
    contents: `
      export { createApi } from "./lib/server/api.ts";
      export * as provider from "./lib/server/publik.ts";
      export { hash } from "./lib/server/security.ts";
      export { nativeAiEnvelope, nativeJob, validateAiBody } from "./lib/server/ai-contract.ts";
      export { relayAi, createRemoteAiEngine } from "./lib/server/ai-engine.ts";
      export { editCheckpoint } from "./lib/server/edit-checkpoints.ts";
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(directory, "boundary.mjs"),
  logLevel: "silent",
});
const { createApi, provider, hash, nativeAiEnvelope, nativeJob, relayAi, createRemoteAiEngine, editCheckpoint } =
  await import(pathToFileURL(join(directory, "boundary.mjs")).href);
const migrations = await Promise.all(
  (await readdir("drizzle")).filter((file) => file.endsWith(".sql")).sort()
    .map((file) => readFile("drizzle/" + file, "utf8")),
);
after(async () => rm(directory, { recursive: true, force: true }));

const words = [{ id: "original-word", clip: 0, start: 0, end: 1, text: "Hello" }];
const alice = "fixture-native-alice";
const bob = "fixture-native-bob";
function envelope(patch = {}) {
  return { path: "ai/summary", request: { words }, choice: "publik", consent: true, ...patch };
}
function fixture(engine, options = {}) {
  const store = new LocalStore(join(directory, crypto.randomUUID()), migrations);
  let authenticated = 0;
  const api = createApi({ DB: store, ...options.env }, {
    ...provider,
    provision: async () => { throw Error("Native requests must not provision a browser install"); },
    ensureSignedIn: async (key) => {
      authenticated++;
      return { wallet: { claim_state: key === "fixture-unclaimed" ? "unclaimed" : "claimed",
        account: { id: key === bob ? "bob" : "alice" }, key_id: key } };
    },
    sendEvent: async () => { throw Error("Verification must not send engagement events"); },
  }, { kind: options.kind || "local", run: engine });
  return {
    store,
    authenticated: () => authenticated,
    async request(body = envelope(), key = alice, origin = "https://editai.test") {
      return api(new Request("https://editai.test/api/desktop-ai/execute", {
        method: "POST",
        headers: { origin, "content-type": "application/json",
          ...(key === null ? {} : { authorization: "Bearer " + key }) },
        body: JSON.stringify(body),
      }));
    },
    close() { store.database.close(); },
  };
}

test("native AI rejects unauthenticated, unclaimed, cross-origin and unconsented requests before inference", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return { cuts: [] }; });
  try {
    assert.equal((await f.request(envelope(), null)).status, 401);
    assert.equal((await f.request(envelope(), "short")).status, 401);
    assert.equal((await f.request(envelope(), "fixture-unclaimed")).status, 401);
    assert.equal((await f.request(envelope(), alice, "https://attacker.test")).status, 403);
    assert.equal((await f.request(envelope({ consent: false }))).status, 403);
    assert.equal((await f.request(envelope({ consent: undefined }))).status, 403);
    assert.equal(calls, 0);
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
  } finally { f.close(); }
});

test("native AI accepts only the fixed feature envelope and derives its owner from verified identity", async () => {
  const calls = [];
  const f = fixture(async (context) => { calls.push(context); return { cuts: [] }; });
  try {
    for (const patch of [
      { path: "ai/audio-upload" }, { path: "https://attacker.test" },
      { owner: "spoofed-owner" }, { system: "client-selected instructions" },
      { instructions: "client-selected instructions" }, { choice: "other" },
      { path: "ai/edit-job/../../another-owner" },
    ]) assert.equal((await f.request(envelope(patch))).status, 400);
    assert.equal((await f.request(envelope({ request: { words: [...words, ...words] } }))).status, 400);
    assert.equal(calls.length, 0);
    const ownKey = { provider: "openai", key: "fixture-personal-key", model: "fixture-model" };
    const response = await f.request(envelope({ choice: "own_key", ownKey,
      request: { words, owner: "nested-spoofed-owner" } }));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].owner, await hash("publik:account:alice"));
    assert.equal(calls[0].key, alice);
    assert.deepEqual(calls[0].ownKey, ownKey);
    assert.deepEqual(calls[0].body.words, words);
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
    const tables = f.store.database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const { name } of tables) {
      const rows = f.store.database.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all();
      assert.ok(!JSON.stringify(rows).includes(ownKey.key), "Personal key must not be persisted by the relay endpoint");
    }
  } finally { f.close(); }
});

test("native edit polling isolates accounts and installations and never executes an inference", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; throw Error("Polling must not run the engine"); });
  try {
    const job = "same-client-job";
    const owner = await hash("publik:account:alice");
    const jobId = await nativeJob(await hash("native-ai:" + alice), job);
    await editCheckpoint(f.store, owner, jobId, "final", "fixture-input", async () => ({ cuts: [] }));
    let response = await f.request(envelope({ path: "ai/edit-job/" + job, request: {} }));
    assert.deepEqual(await response.json(), { state: "complete", result: { cuts: [] } });
    response = await f.request(envelope({ path: "ai/edit-job/" + job, request: {} }), bob);
    assert.deepEqual(await response.json(), { state: "missing" });
    response = await f.request(envelope({ path: "ai/edit-job/" + job, request: {} }), "fixture-alice-second-install");
    assert.deepEqual(await response.json(), { state: "missing" });
    assert.equal(calls, 0);
    assert.notEqual(await nativeJob("install-one", job), await nativeJob("install-two", job));
  } finally { f.close(); }
});

test("public AI relay has a fixed HTTPS destination, forbids redirects and sends no database or owner metadata", async () => {
  const controller = new AbortController();
  const context = { path: "ai/summary", body: { words }, key: alice, choice: "publik",
    ownKey: { provider: "openai", key: "unselected-personal-key" },
    owner: "private-owner", db: { privateDatabase: true }, signal: controller.signal,
    unexpected: "not-for-transport", destination: "https://attacker.test" };
  const answer = { summary: "Hello", hook: "A greeting", highlights: ["00:00 Hello"] };
  assert.deepEqual(await relayAi(context, async (url, init) => {
    assert.equal(url, "https://editai.it.com/api/desktop-ai/execute");
    assert.equal(init.redirect, "manual");
    assert.equal(init.method, "POST");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("authorization"), "Bearer " + alice);
    assert.equal(headers.get("origin"), "https://editai.it.com");
    assert.equal(headers.get("cookie"), null);
    assert.equal(headers.get("OAI-Sites-Authorization"), null);
    assert.deepEqual(JSON.parse(init.body), { path: context.path, request: context.body,
      choice: "publik", ownKey: null, consent: true });
    return Response.json(answer);
  }), answer);
});

test("hosted relay keeps private Site access credentials in server headers only", async () => {
  const config = { EDITAI_AI_ORIGIN: "https://fixture-private-ai.chatgpt.site",
    EDITAI_AI_SERVICE_TOKEN: "fixture-service-access-token" };
  const context = { path: "ai/summary", body: { words }, key: alice, choice: "publik",
    ownKey: null, signal: new AbortController().signal };
  const answer = { summary: "Hello", hook: "A greeting", highlights: ["00:00 Hello"] };
  const response = await relayAi(context, async (url, init) => {
    assert.equal(url, config.EDITAI_AI_ORIGIN + "/api/desktop-ai/execute");
    assert.equal(init.redirect, "manual");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("OAI-Sites-Authorization"), "Bearer " + config.EDITAI_AI_SERVICE_TOKEN);
    assert.equal(headers.get("authorization"), "Bearer " + alice);
    assert.equal(headers.get("origin"), config.EDITAI_AI_ORIGIN);
    assert.ok(!init.body.includes(config.EDITAI_AI_SERVICE_TOKEN));
    assert.ok(!init.body.includes(config.EDITAI_AI_ORIGIN));
    return Response.json(answer);
  }, config);
  assert.deepEqual(response, answer);
  assert.ok(!JSON.stringify(response).includes(config.EDITAI_AI_SERVICE_TOKEN));
  assert.ok(!JSON.stringify(response).includes(config.EDITAI_AI_ORIGIN));
  let sent = 0;
  for (const origin of ["http://fixture.chatgpt.site", "https://user:password@fixture.chatgpt.site",
    "https://fixture.chatgpt.site?query", "https://fixture.chatgpt.site/path",
    "https://attacker.test", "https://fixture.chatgpt.site#fragment"]) {
    await assert.rejects(relayAi(context, async () => { sent++; return Response.json(answer); },
      { ...config, EDITAI_AI_ORIGIN: origin }), (error) => error.status === 503);
  }
  await assert.rejects(relayAi(context, async () => { sent++; return Response.json(answer); },
    { EDITAI_AI_ORIGIN: config.EDITAI_AI_ORIGIN }), (error) => error.status === 503);
  assert.equal(sent, 0);
});

test("public gateway relays native polling and original job IDs to the authoritative private service", async () => {
  const calls = [];
  const f = fixture(async (context) => {
    calls.push(context);
    return context.path.startsWith("ai/edit-job/") ? { state: "missing" } : { cuts: [] };
  }, { kind: "remote", env: { EDITAI_AI_ORIGIN: "https://fixture-private-ai.chatgpt.site" } });
  try {
    let response = await f.request(envelope({ path: "ai/edit", request: { words, jobId: "client-job" } }));
    assert.equal(response.status, 200);
    assert.equal(calls[0].body.jobId, "client-job");
    response = await f.request(envelope({ path: "ai/edit-job/client-job", request: {} }));
    assert.deepEqual(await response.json(), { state: "missing" });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].path, "ai/edit-job/client-job");
    assert.equal(calls[1].key, alice);
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='edit_checkpoints'").get().n, 0);
  } finally { f.close(); }
});

test("private AI data deletion requires identity but not AI consent and preserves another account", async () => {
  let inference = 0;
  const f = fixture(async () => { inference++; throw Error("Deletion must not infer"); });
  try {
    const aliceOwner = await hash("publik:account:alice");
    const bobOwner = await hash("publik:account:bob");
    for (const owner of [aliceOwner, bobOwner]) {
      await editCheckpoint(f.store, owner, "fixture-job", "final", "fixture-input", async () => ({ cuts: [] }));
      f.store.database.prepare("INSERT INTO usage (id,owner,kind,model,created_at) VALUES (?,?,?,?,?)")
        .run(crypto.randomUUID(), owner, "chat", "fixture-model", Date.now());
    }
    const deletion = envelope({ path: "ai/delete-data", choice: "own_key", consent: false, request: {} });
    assert.equal((await f.request(deletion, "fixture-unclaimed")).status, 401);
    assert.equal((await f.request(deletion, null)).status, 401);
    const response = await f.request(deletion);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM edit_checkpoints WHERE owner=?").get(aliceOwner).n, 0);
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM usage WHERE owner=?").get(aliceOwner).n, 0);
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM edit_checkpoints WHERE owner=?").get(bobOwner).n, 1);
    assert.equal(f.store.database.prepare("SELECT COUNT(*) AS n FROM usage WHERE owner=?").get(bobOwner).n, 1);
    assert.equal(inference, 0);
  } finally { f.close(); }
  const calls = [];
  const gateway = fixture(async context => { calls.push(context); return { ok: true }; },
    { kind: "remote", env: { EDITAI_AI_ORIGIN: "https://fixture-private-ai.chatgpt.site" } });
  try {
    const response = await gateway.request(envelope({ path: "ai/delete-data", consent: false, request: {} }));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "ai/delete-data");
    assert.deepEqual(calls[0].body, {});
  } finally { gateway.close(); }
});

test("AI engine factory uses only server configuration and conceals service details on network failure", async () => {
  const originalFetch = globalThis.fetch;
  const config = { EDITAI_AI_ORIGIN: "https://fixture-private-ai.chatgpt.site",
    EDITAI_AI_SERVICE_TOKEN: "fixture-service-access-token" };
  const context = { path: "ai/summary", body: { words }, key: alice, choice: "publik",
    ownKey: null, signal: new AbortController().signal,
    EDITAI_AI_ORIGIN: "https://attacker.test", EDITAI_AI_SERVICE_TOKEN: "attacker-token" };
  try {
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(url, config.EDITAI_AI_ORIGIN + "/api/desktop-ai/execute");
      assert.equal(new Headers(init.headers).get("OAI-Sites-Authorization"), "Bearer " + config.EDITAI_AI_SERVICE_TOKEN);
      throw Error(config.EDITAI_AI_ORIGIN + " " + config.EDITAI_AI_SERVICE_TOKEN);
    };
    const engine = createRemoteAiEngine(config);
    assert.equal(engine.kind, "remote");
    await assert.rejects(engine.run(context), (error) => error.status === 502 &&
      !error.message.includes(config.EDITAI_AI_ORIGIN) && !error.message.includes(config.EDITAI_AI_SERVICE_TOKEN));
    assert.equal(calls, 1);
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://editai.it.com/api/desktop-ai/execute");
      assert.equal(new Headers(init.headers).get("OAI-Sites-Authorization"), null);
      assert.ok(!init.body.includes(config.EDITAI_AI_SERVICE_TOKEN));
      return Response.json({ ok: true });
    };
    assert.deepEqual(await createRemoteAiEngine().run(context), { ok: true });
  } finally { globalThis.fetch = originalFetch; }
});

test("AI relay preserves payment errors and only permits official top-up URLs", async () => {
  const context = { path: "ai/summary", body: { words }, key: alice, choice: "publik",
    ownKey: null, signal: new AbortController().signal };
  for (const [url, allowed] of [["https://publikhq.com/wallet/add", true], ["https://attacker.test/pay", false]]) {
    await assert.rejects(relayAi(context, async () => Response.json({ error: "Please top up your balance.", url }, { status: 402 })),
      (error) => error.status === 402 && error.message === "Please top up your balance." &&
        error.url === (allowed ? url : undefined));
  }
  await assert.rejects(relayAi(context, async () => Response.json(null)), (error) => error.status === 502);
  await assert.rejects(relayAi(context, async () => { throw Error("network failure"); }),
    (error) => error.status === 502 && error.message.includes("project is saved"));
  const controller = new AbortController();
  controller.abort(new DOMException("Fixture cancellation", "AbortError"));
  await assert.rejects(relayAi({ ...context, signal: controller.signal }, async () => {
    controller.signal.throwIfAborted();
  }), (error) => error.name === "AbortError");
});

test("personal-key envelope strips unused fields and rejects credential redirects", () => {
  const ownKey = { provider: "openai", key: "fixture-personal-key", model: "fixture-model",
    baseURL: "https://attacker.test", authorization: "ignored" };
  const value = nativeAiEnvelope(envelope({ choice: "own_key", ownKey }));
  assert.deepEqual(value.ownKey, { provider: "openai", key: ownKey.key, model: ownKey.model });
  for (const patch of [{ provider: "other" }, { key: "short" }, { key: "key with whitespace" },
    { model: "https://host/?secret" }]) {
    assert.throws(() => nativeAiEnvelope(envelope({ choice: "own_key", ownKey: { ...ownKey, ...patch } })));
  }
});
