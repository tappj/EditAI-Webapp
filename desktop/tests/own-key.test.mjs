import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore } from "../local-store.mjs";

test("personal OpenAI settings encrypt credentials and relay AI while retaining direct transcription without a Publik plan", async () => {
  const directory = await mkdtemp(join(tmpdir(), "editai-own-key-"));
  const modulePath = join(directory, "api.mjs");
  await build({
    stdin: {
      contents:
        'export {createApi} from "./lib/server/api.ts"; export * from "./lib/server/security.ts"; export * as provider from "./lib/server/publik.ts";',
      resolveDir: process.cwd(),
    },
    outfile: modulePath,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { createApi, hash, encrypt, decrypt, provider } = await import(
    pathToFileURL(modulePath).href
  );
  const migrations = await Promise.all(
    (await readdir("drizzle"))
      .filter((n) => n.endsWith(".sql"))
      .sort()
      .map((n) => readFile(resolve("drizzle", n), "utf8")),
  );
  const store = new LocalStore(join(directory, "data"), migrations);
  const token = crypto.randomUUID(),
    id = await hash(token);
  const secret = crypto.randomBytes
    ? crypto.randomBytes(32).toString("base64")
    : btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const fixtureKey = "fixture-only-personal-openai-key";
  store.database
    .prepare(
      "INSERT INTO sessions (id,install_id,credential,created_at,expires_at,consent,telemetry) VALUES (?,?,?,?,?,1,0)",
    )
    .run(
      id,
      crypto.randomUUID(),
      await encrypt("fixture-publik-install", secret),
      Date.now(),
      Date.now() + 60000,
    );
  let claimed = true;
  const api = createApi(
    { DB: store, SESSION_ENCRYPTION_KEY: secret },
    {
      ...provider,
      ensureSignedIn: async () => ({
        wallet: {
          claim_state: claimed ? "claimed" : "anonymous",
          key_id: "fixture-key-id",
          plan: { kind: "none" },
          balance_micros: 0,
        },
      }),
    },
  );
  const request = (path, body, sessionToken = token) =>
    api(
      new Request("https://editai.test/api/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          origin: "https://editai.test",
          cookie: "editai_session=" + sessionToken,
          ...(body instanceof FormData
            ? {}
            : { "content-type": "application/json" }),
        },
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
    );
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    const before = await (await request("session")).json();
    assert.equal(
      before.profile.consent,
      true,
      "honor an existing session's consent",
    );
    assert.equal(before.profile.consentDecided, true);
    assert.equal((await request("consent", { allow: false })).status, 200);
    const declined = await (await request("session")).json();
    assert.equal(declined.profile.consent, false);
    assert.equal(declined.profile.consentDecided, true);
    assert.equal((await request("consent", { allow: true })).status, 200);
    const secondToken = crypto.randomUUID();
    store.database
      .prepare(
        "INSERT INTO sessions (id,install_id,credential,created_at,expires_at,telemetry) VALUES (?,?,?,?,?,0)",
      )
      .run(
        await hash(secondToken),
        crypto.randomUUID(),
        await encrypt("fixture-second-install", secret),
        Date.now(),
        Date.now() + 60000,
      );
    const nextSession = await (
      await request("session", undefined, secondToken)
    ).json();
    assert.equal(nextSession.profile.consent, true);
    assert.equal(nextSession.profile.telemetry, false);
    const saved = await request("settings", {
      displayName: "Personal test",
      ownKey: fixtureKey,
      avatarPreset: "midnight",
      appearance: "dark",
      telemetry: false,
    });
    assert.equal(saved.status, 200);
    const sharedProfile = await (
      await request("session", undefined, secondToken)
    ).json();
    assert.equal(sharedProfile.profile.appearance, "dark");
    assert.equal(sharedProfile.profile.avatarPreset, "midnight");
    assert.equal(sharedProfile.profile.displayName, "Personal test");
    const row = store.database
      .prepare("SELECT own_key,choice FROM sessions WHERE id=?")
      .get(id);
    assert.equal(row.choice, "own_key");
    assert.ok(!row.own_key.includes(fixtureKey));
    assert.equal(
      JSON.parse(await decrypt(row.own_key, secret)).key,
      fixtureKey,
    );
    assert.ok(!(await saved.text()).includes(fixtureKey));
    globalThis.fetch = async (url, init) => {
      calls.push(String(url));
      if (String(url).endsWith("/audio/transcriptions")) {
        assert.equal(init.headers.authorization, "Bearer " + fixtureKey);
        assert.equal(init.body.get("model"), "whisper-1");
        assert.deepEqual(init.body.getAll("timestamp_granularities[]"), ["word"]);
        return Response.json({
          words: [{ word: "Hello", start: 0, end: 0.5 }],
          segments: [{ text: "Hello", start: 0, end: 0.5 }],
          text: "Hello",
        });
      }
      assert.equal(String(url), "https://editai.it.com/api/desktop-ai/execute");
      assert.equal(init.headers.authorization, "Bearer fixture-publik-install");
      const envelope = JSON.parse(init.body);
      assert.deepEqual(Object.keys(envelope).sort(), ["choice", "consent", "ownKey", "path", "request"]);
      assert.equal(envelope.choice, "own_key");
      assert.equal(envelope.consent, true);
      assert.equal(envelope.path, "ai/summary");
      assert.deepEqual(envelope.ownKey, { provider: "openai", key: fixtureKey, model: "gpt-4o-mini" });
      assert.equal(envelope.request.words[0].id, "source:0");
      assert.ok(!("messages" in envelope));
      assert.ok(!("response_format" in envelope));
      return Response.json({
        summary: "A greeting.",
        hook: "A clear opening.",
        highlights: ["00:00 Greeting"],
      });
    };
    const summary = await request("ai/summary", {
      words: [{ id: "source:0", clip: 0, start: 0, end: 0.5, text: "Hello" }],
    });
    assert.equal(summary.status, 200, await summary.clone().text());
    const audio = new FormData();
    audio.set(
      "file",
      new File([new Uint8Array(100)], "test.wav", { type: "audio/wav" }),
    );
    const transcription = await request("ai/transcribe", audio);
    assert.equal(transcription.status, 200);
    const recognized = await transcription.json();
    assert.equal(recognized.words.length, 1);
    assert.deepEqual(recognized.segments, [
      { text: "Hello", start: 0, end: 0.5 },
    ]);
    assert.deepEqual(calls, [
      "https://editai.it.com/api/desktop-ai/execute",
      "https://api.openai.com/v1/audio/transcriptions",
    ]);
    globalThis.fetch = async (url) => {
      assert.equal(String(url), "https://editai.it.com/api/desktop-ai/execute");
      return Response.json(
        { error: "The AI provider took too long to respond. Your project is saved." },
        { status: 504 },
      );
    };
    const timeout = await request("ai/summary", {
      words: [{ id: "source:0", clip: 0, start: 0, end: 0.5, text: "Hello" }],
    });
    assert.equal(timeout.status, 504);
    assert.match((await timeout.json()).error, /too long to respond/);
    assert.equal(
      (await request("consent", { allow: false }, secondToken)).status,
      200,
    );
    assert.equal((await request("ai/summary", { words: [] })).status, 403);
    claimed = false;
    assert.equal((await request("ai/summary", { words: [] })).status, 401);
    assert.equal(calls.length, 2, "an unclaimed session must not call AI");
  } finally {
    globalThis.fetch = originalFetch;
    store.database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
