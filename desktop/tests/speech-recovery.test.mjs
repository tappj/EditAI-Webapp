import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore, LocalBucket } from "../local-store.mjs";

test("Publik alignment recovery validates job ownership, caches accepted measured words and deletes private cache with account", async () => {
  const dir = await mkdtemp(join(tmpdir(), "editai-alignment-"));
  const module = join(dir, "api.mjs");
  await build({
    stdin: {
      contents:
        'export {createApi} from "./lib/server/api.ts"; export * from "./lib/server/security.ts"; export * as provider from "./lib/server/publik.ts";',
      resolveDir: process.cwd(),
    },
    outfile: module,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { createApi, encrypt, hash, provider } = await import(
    pathToFileURL(module).href
  );
  const migrations = await Promise.all(
    (await readdir("drizzle"))
      .filter((n) => n.endsWith(".sql"))
      .sort()
      .map((n) => readFile(resolve("drizzle", n), "utf8")),
  );
  const store = new LocalStore(join(dir, "db"), migrations),
    bucket = new LocalBucket(join(dir, "bucket"));
  const token = crypto.randomUUID(),
    sid = await hash(token),
    secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
      "base64",
    ),
    source = crypto.randomUUID(),
    job = "trx_fixture_existing";
  store.database
    .prepare(
      "INSERT INTO sessions (id,install_id,credential,choice,created_at,expires_at,consent,telemetry) VALUES (?,?,?,?,?,?,1,0)",
    )
    .run(
      sid,
      crypto.randomUUID(),
      await encrypt("fixture-only-publik-key", secret),
      "publik",
      Date.now(),
      Date.now() + 60000,
    );
  const deletedAiOwners = [];
  const api = createApi(
    { DB: store, BUCKET: bucket, SESSION_ENCRYPTION_KEY: secret },
    {
      ...provider,
      ensureSignedIn: async () => ({
        wallet: {
          claim_state: "claimed",
          key_id: "fixture-alignment",
          plan: { kind: "plan" },
          used_percent: 0,
        },
      }),
    },
    {
      kind: "local",
      run: async (context) => {
        assert.equal(context.path, "ai/delete-data");
        deletedAiOwners.push(context.owner);
        return { ok: true };
      },
    },
  );
  const request = (path, body, method = body ? "POST" : "GET") =>
    api(
      new Request("https://editai.test/api/" + path, {
        method,
        headers: {
          origin: "https://editai.test",
          cookie: "editai_session=" + token,
        },
        body,
      }),
    );
  const originalFetch = globalThis.fetch;
  try {
    await request("session");
    const { owner } = store.database
      .prepare("SELECT owner FROM sessions WHERE id=?")
      .get(sid);
    store.database
      .prepare(
        "INSERT INTO speech_jobs (id,owner,source_id,upload_id,job_id,status,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        owner + ":" + source,
        owner,
        source,
        "upl_fixture",
        job,
        "completed",
        Date.now(),
      );
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(
        String(url),
        "https://publikhq.com/api/v1/audio/transcriptions",
      );
      assert.equal(options.body.get("model"), "whisper-1");
      assert.equal(options.body.get("response_format"), "verbose_json");
      assert.equal(options.body.get("timestamp_granularities[]"), "word");
      return Response.json({
        words: [
          { word: "Measured", start: 0.2, end: 0.6 },
          { word: "speech", start: 0.7, end: 1.2 },
        ],
        text: "Measured speech",
      });
    };
    const form = (jobID = job) => {
      const f = new FormData();
      f.set(
        "file",
        new Blob(["fixture non-WAV bytes"], { type: "audio/wav" }),
        "audio.wav",
      );
      f.set("alignmentJob", jobID);
      f.set("sourceId", source);
      f.set("offset", "0");
      f.set("length", "2");
      return f;
    };
    const denied = await request("ai/transcribe", form("trx_foreign"));
    assert.equal(denied.status, 404);
    assert.equal(calls, 0);
    const first = await request("ai/transcribe", form());
    assert.equal(first.status, 200);
    const body = await first.json();
    assert.deepEqual(body.words, [
      { text: "Measured", start: 0.2, end: 0.6 },
      { text: "speech", start: 0.7, end: 1.2 },
    ]);
    assert.equal(calls, 1);
    const second = await request("ai/transcribe", form());
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), body);
    assert.equal(calls, 1, "resume uses saved timing, no repeated inference");
    assert.ok(await bucket.get(owner + "/" + source + ".alignment"));
    assert.equal((await request("account", undefined, "DELETE")).status, 200);
    assert.deepEqual(deletedAiOwners, [owner]);
    assert.equal(
      await bucket.get(owner + "/" + source + ".alignment"),
      null,
      "also removes cache for local-only media with no cloud asset row",
    );
  } finally {
    globalThis.fetch = originalFetch;
    store.database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
