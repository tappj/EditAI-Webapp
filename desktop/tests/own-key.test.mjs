import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore } from "../local-store.mjs";

test("personal OpenAI settings encrypt credentials and route AI without a Publik plan", async () => {
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
  const request = (path, body) =>
    api(
      new Request("https://editai.test/api/" + path, {
        method: "POST",
        headers: {
          origin: "https://editai.test",
          cookie: "editai_session=" + token,
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
    const saved = await request("settings", {
      displayName: "Personal test",
      ownKey: fixtureKey,
      consent: true,
      telemetry: false,
    });
    assert.equal(saved.status, 200);
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
      assert.equal(init.headers.authorization, "Bearer " + fixtureKey);
      calls.push(String(url));
      if (String(url).endsWith("/audio/transcriptions")) {
        assert.equal(init.body.get("model"), "whisper-1");
        assert.deepEqual(init.body.getAll("timestamp_granularities[]"), [
          "word",
        ]);
        return Response.json({
          words: [{ word: "Hello", start: 0, end: 0.5 }],
          text: "Hello",
        });
      }
      assert.equal(JSON.parse(init.body).model, "gpt-4o-mini");
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "A greeting.",
                hook: "A clear opening.",
                highlights: ["00:00 Greeting"],
              }),
            },
          },
        ],
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
    assert.equal((await transcription.json()).words.length, 1);
    assert.deepEqual(calls, [
      "https://api.openai.com/v1/chat/completions",
      "https://api.openai.com/v1/audio/transcriptions",
    ]);
    claimed = false;
    assert.equal((await request("ai/summary", { words: [] })).status, 401);
    assert.equal(calls.length, 2, "an unclaimed session must not call AI");
  } finally {
    globalThis.fetch = originalFetch;
    store.database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
