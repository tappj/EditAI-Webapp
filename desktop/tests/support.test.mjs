import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore } from "../local-store.mjs";
test("hosted support verifies native credentials, rejects cross-origin/unclaimed/malformed requests, and bounds sends", async () => {
  const dir = await mkdtemp(join(tmpdir(), "editai-support-"));
  await build({
    stdin: {
      contents:
        'export{createApi}from"./lib/server/api.ts";export * as provider from"./lib/server/publik.ts";',
      resolveDir: process.cwd(),
    },
    outfile: join(dir, "api.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { createApi, provider } = await import(
    pathToFileURL(join(dir, "api.mjs")).href
  );
  const migrations = await Promise.all(
    (await readdir("drizzle"))
      .filter((n) => n.endsWith(".sql"))
      .sort()
      .map((n) => readFile(resolve("drizzle", n), "utf8")),
  );
  const store = new LocalStore(join(dir, "db"), migrations);
  let claimed = true,
    calls = 0,
    provisions = 0;
  const api = createApi(
    {
      DB: store,
      RESEND_API_KEY: "fixture-mail-key",
      SUPPORT_FROM_EMAIL: "support@example.com",
    },
    {
      ...provider,
      provision: async () => {
        provisions++;
        throw Error("Public contact must not provision");
      },
      ensureSignedIn: async () => ({
        wallet: {
          claim_state: claimed ? "claimed" : "unclaimed",
          account: { id: "support-fixture" },
        },
      }),
    },
  );
  const body = {
    id: crypto.randomUUID(),
    title: "",
    message: "Please fix Eva",
    to: "attacker@example.com",
    images: [
      {
        name: "error.png",
        type: "image/png",
        content: Buffer.concat([
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
            "base64",
          ),
          Buffer.alloc(30000),
        ]).toString("base64"),
      },
    ],
  };
  const request = (patch = {}, origin = "https://editai.test") =>
    api(
      new Request("https://editai.test/api/support", {
        method: "POST",
        headers: {
          origin,
          authorization: "Bearer fixture-native-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...body, ...patch }),
      }),
    );
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(String(url), "https://api.resend.com/emails");
      const sent = JSON.parse(init.body);
      if (sent.subject === "Contact EditAI") {
        assert.ok(
          sent.reply_to === undefined || sent.reply_to === "reply@example.com",
        );
        assert.deepEqual(sent.to, ["editaiapp@gmail.com"]);
        assert.match(
          sent.text,
          /Reply email: (reply@example.com|Not provided)/,
        );
        assert.equal(sent.attachments, undefined);
        return Response.json({ id: "contact-fixture" });
      }
      assert.deepEqual(sent.to, ["editaiapp@gmail.com"]);
      assert.deepEqual(sent.attachments, [
        { filename: "error.png", content: body.images[0].content },
      ]);
      return Response.json({ id: "mail-fixture" });
    };
    assert.equal((await request({}, "https://evil.test")).status, 403);
    claimed = false;
    assert.equal((await request()).status, 401);
    claimed = true;
    assert.equal((await request({ message: " " })).status, 400);
    assert.equal(calls, 0);
    assert.equal((await request()).status, 200);
    for (let i = 0; i < 3; i++) assert.equal((await request()).status, 200);
    assert.equal((await request()).status, 429);
    assert.equal(calls, 4);
    const contact = (
      patch = {},
      origin = "https://editai.test",
      ip = "fixture",
    ) =>
      api(
        new Request("https://editai.test/api/contact", {
          method: "POST",
          headers: {
            origin,
            "content-type": "application/json",
            "cf-connecting-ip": ip,
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            title: "",
            message: "A website question",
            email: "reply@example.com",
            ...patch,
          }),
        }),
      );
    claimed = false;
    assert.equal((await contact({}, "https://evil.test")).status, 403);
    assert.equal(
      (await contact({ images: [] }, undefined, "images")).status,
      400,
    );
    assert.equal(
      (await contact({ website: "spam" }, undefined, "spam")).status,
      400,
    );
    assert.equal(
      (await contact({ email: "" }, undefined, "missing")).status,
      400,
    );
    assert.equal(
      (await contact({ email: undefined }, undefined, "optional")).status,
      200,
    );
    for (let i = 0; i < 3; i++) assert.equal((await contact()).status, 200);
    assert.equal((await contact()).status, 429);
    assert.equal(provisions, 0);
    assert.equal(calls, 8);
  } finally {
    globalThis.fetch = original;
    store.database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
