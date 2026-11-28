import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore } from "../local-store.mjs";
test("shared web/native chat relays validated requests and preserves service errors without local prompts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "editai-chat-"));
  await build({
    stdin: {
      contents:
        'export {createApi} from "./lib/server/api.ts"; export * from "./lib/server/security.ts"; export * as provider from "./lib/server/publik.ts";',
      resolveDir: process.cwd(),
    },
    outfile: join(dir, "api.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { createApi, hash, encrypt, provider } = await import(
    pathToFileURL(join(dir, "api.mjs")).href
  );
  const migrations = await Promise.all(
    (await readdir("drizzle"))
      .filter((n) => n.endsWith(".sql"))
      .sort()
      .map((n) => readFile(resolve("drizzle", n), "utf8")),
  );
  const store = new LocalStore(join(dir, "db"), migrations),
    token = crypto.randomUUID(),
    secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
      "base64",
    );
  store.database
    .prepare(
      "INSERT INTO sessions (id,install_id,credential,choice,created_at,expires_at,consent,telemetry) VALUES (?,?,?,?,?,?,1,0)",
    )
    .run(
      await hash(token),
      crypto.randomUUID(),
      await encrypt("fixture-only", secret),
      "publik",
      Date.now(),
      Date.now() + 60000,
    );
  const api = createApi(
    { DB: store, SESSION_ENCRYPTION_KEY: secret },
    {
      ...provider,
      ensureSignedIn: async () => ({
        wallet: {
          claim_state: "claimed",
          key_id: "fixture-chat",
          plan: { kind: "plan" },
        },
      }),
    },
  );
  const segment = {
    id: crypto.randomUUID(),
    source: 0,
    start: 0,
    end: 5,
    speed: 1,
    volume: 1,
  };
  const body = {
    mode: "chat",
    prompt: "Add a title saying Hello",
    messages: [],
    sourceDurations: [5],
    document: { segments: [segment] },
    supportedOperations: ["addText"],
  };
  const before = structuredClone(body);
  const request = (input = body) =>
    api(
      new Request("https://editai.test/api/ai/chat", {
        method: "POST",
        headers: {
          origin: "https://editai.test",
          cookie: "editai_session=" + token,
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      }),
    );
  const originalFetch = globalThis.fetch,
    originalWarn = console.warn;
  const logs = [];
  let mode = "repair",
    calls = [];
  try {
    console.warn = (line) => logs.push(JSON.parse(line));
    globalThis.fetch = async (url, init) => {
      const payload = JSON.parse(init.body);
      calls.push(payload);
      assert.equal(String(url), "https://editai.it.com/api/desktop-ai/execute");
      assert.equal(init.headers.authorization, "Bearer fixture-only");
      assert.equal(init.redirect, "manual");
      assert.deepEqual(Object.keys(payload).sort(), ["choice", "consent", "ownKey", "path", "request"]);
      assert.equal(payload.path, "ai/chat");
      assert.equal(payload.choice, "publik");
      assert.equal(payload.consent, true);
      assert.equal(payload.ownKey, null);
      assert.deepEqual(payload.request, before);
      assert.ok(!("model" in payload));
      assert.ok(!("response_format" in payload));
      assert.ok(!("messages" in payload));
      if (mode === "payment")
        return Response.json(
          { error: "Add credits to continue.", url: "https://publikhq.com/wallet" },
          { status: 402 },
        );
      if (mode === "invalid")
        return Response.json(
          { error: "EditAI couldn’t complete that edit. Your timeline is unchanged. Please try again." },
          { status: 502 },
        );
      return Response.json({
        message: "Added your title.",
        generateCaptions: false,
        operations: [{ kind: "addText", text: "Hello", target: null }],
      });
    };
    const accepted = await request();
    assert.equal(accepted.status, 200);
    const output = await accepted.json();
    assert.equal(output.operations[0].text, "Hello");
    assert.equal(output.operations[0].target, null);
    assert.equal(calls.length, 1, "repair orchestration stays in the private service");
    assert.deepEqual(body, before);
    mode = "invalid";
    calls = [];
    const rejected = await request();
    assert.equal(rejected.status, 502);
    assert.equal(calls.length, 1);
    assert.equal((await rejected.json()).operations, undefined);
    mode = "payment";
    calls = [];
    const payment = await request();
    assert.equal(payment.status, 402);
    assert.equal(calls.length, 1);
    assert.deepEqual(await payment.json(), {
      error: "Add credits to continue.",
      url: "https://publikhq.com/wallet",
    });
    const priorCalls = calls.length;
    const invalidRequest = await request({ ...body, sourceDurations: [-1] });
    assert.equal(invalidRequest.status, 400);
    assert.equal(calls.length, priorCalls, "invalid source ranges never reach the service");
    assert.deepEqual(logs, [], "no model payload or recovery diagnostics exist in the public relay");
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    store.database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
