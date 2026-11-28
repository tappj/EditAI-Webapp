import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore, LocalBucket } from "../local-store.mjs";
import * as publik from "../../lib/server/publik.ts";
import { hash, encrypt } from "../../lib/server/security.ts";
import { newDocument, newSegment } from "../../lib/editor/model.ts";

test("sign-out revokes active sessions; explicit verified resume retains consent, projects and original media without public handles", async () => {
  const dir = await mkdtemp(join(tmpdir(), "editai-account-"));
  await build({
    stdin: {
      contents: 'export {createApi} from "./lib/server/api.ts";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(dir, "api.mjs"),
  });
  const { createApi } = await import(pathToFileURL(join(dir, "api.mjs")).href);
  const migrations = await Promise.all(
    [
      "0000_furry_phil_sheldon.sql",
      "0001_massive_expediter.sql",
      "0002_optimal_the_anarchist.sql",
      "0003_account_preferences.sql",
    ].map((f) => readFile("drizzle/" + f, "utf8")),
  );
  const store = new LocalStore(join(dir, "data"), migrations);
  const secret = Buffer.alloc(32, 19).toString("base64");
  const active = crypto.randomUUID();
  const credential = "fixture-private-install";
  let account = null,
    revoked = false,
    provisions = 0;
  const wallet = (key) => ({
    claim_state: key === credential && !revoked ? "claimed" : "unclaimed",
    key_id: key === credential ? "stable-install" : "anonymous",
    account,
    plan: { kind: "none" },
    claim_url: "https://publikhq.com/claim/fixture",
  });
  const provider = {
    ...publik,
    provision: async () => {
      provisions++;
      return {
        key: "fixture-anonymous",
        browser_install_id: crypto.randomUUID(),
      };
    },
    ensureSignedIn: async (key) => {
      if (revoked && key === credential)
        throw new publik.ApiError(401, "Connection revoked");
      return { wallet: wallet(key) };
    },
    sendEvent: async () => false,
  };
  store.database
    .prepare(
      "INSERT INTO sessions (id,install_id,credential,choice,created_at,expires_at,telemetry) VALUES (?,?,?,?,?,?,0)",
    )
    .run(
      await hash(active),
      crypto.randomUUID(),
      await encrypt(credential, secret),
      "publik",
      Date.now(),
      Date.now() + 86400000,
    );
  const deletedAiOwners = [];
  const api = createApi(
    {
      DB: store,
      BUCKET: new LocalBucket(join(dir, "backups")),
      SESSION_ENCRYPTION_KEY: secret,
    },
    provider,
    {
      kind: "local",
      run: async (context) => {
        assert.equal(context.path, "ai/delete-data");
        deletedAiOwners.push(context.owner);
        return { ok: true };
      },
    },
  );
  let jar = new Map([["editai_session", active]]);
  async function request(path, body, method, cookies = jar) {
    const raw = body instanceof Uint8Array;
    const response = await api(
      new Request("https://editai.test/api/" + path, {
        method: method || (body === undefined ? "GET" : "POST"),
        headers: {
          origin: "https://editai.test",
          cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
          "content-type": raw ? "video/mp4" : "application/json",
          ...(raw ? { "content-length": String(body.length) } : {}),
        },
        body:
          body === undefined ? undefined : raw ? body : JSON.stringify(body),
      }),
    );
    if (cookies === jar)
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";")[0],
          i = pair.indexOf("="),
          name = pair.slice(0, i),
          value = pair.slice(i + 1);
        if (value) jar.set(name, value);
        else jar.delete(name);
      }
    return response;
  }
  try {
    const first = await (await request("session")).json();
    assert.equal(first.screen.id, "ready");
    const owner = first.profile.ownerId;
    assert.equal(first.profile.needsName, true);
    assert.equal(
      (await request("onboarding/name", { firstName: "   " })).status,
      400,
    );
    assert.equal(
      (await request("onboarding/name", { firstName: "a".repeat(41) })).status,
      400,
    );
    assert.equal(
      (await request("onboarding/name", { firstName: "Jadon", lastName: "T" }))
        .status,
      200,
    );
    let profile = (await (await request("session")).json()).profile;
    assert.equal(profile.needsName, false);
    assert.equal(profile.displayName, "Jadon T");
    assert.equal(
      (await request("settings", { displayName: "   " })).status,
      400,
    );
    assert.equal(
      (await request("settings", { displayName: "x".repeat(81) })).status,
      400,
    );
    assert.equal(
      (await request("settings", { displayName: "Jadon Updated" })).status,
      200,
    );
    assert.equal(
      (await (await request("session")).json()).profile.displayName,
      "Jadon Updated",
    );

    await request("consent", { allow: true });
    const id = crypto.randomUUID(),
      source = crypto.randomUUID(),
      d = newDocument();
    d.sources = [
      {
        id: source,
        name: "original.mp4",
        duration: 2,
        width: 16,
        height: 16,
        kind: "video",
        mime: "video/mp4",
      },
    ];
    d.segments = [newSegment(0, 2)];
    assert.equal(
      (await request("projects", { id, title: "Retained edit", document: d }))
        .status,
      200,
    );
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    assert.equal((await request("assets/" + source, bytes, "PUT")).status, 200);
    const retained = await request("assets/" + source, undefined, "DELETE");
    assert.equal(retained.status, 200);
    assert.equal((await retained.json()).retained, true);
    assert.equal((await request("assets/" + source)).status, 200);
    const unusedSource = crypto.randomUUID();
    assert.equal(
      (await request("assets/" + unusedSource, bytes, "PUT")).status,
      200,
    );
    assert.equal(
      (await request("assets/" + unusedSource, undefined, "DELETE")).status,
      200,
    );
    assert.equal((await request("assets/" + unusedSource)).status, 404);

    const beforeRefresh = provisions;
    for (let i = 0; i < 3; i++)
      assert.equal((await request("session")).status, 200);
    assert.equal(
      provisions,
      beforeRefresh,
      "normal refresh reuses the saved install",
    );
    const signedOut = await request("logout", {});
    assert.equal(signedOut.status, 200);
    assert.ok(
      signedOut.headers
        .getSetCookie()
        .every((x) => x.includes("HttpOnly") && x.includes("Secure")),
    );
    assert.ok(!jar.has("editai_session"));
    assert.ok(jar.has("editai_connection"));
    assert.equal(
      store.database
        .prepare("SELECT id FROM sessions WHERE id=?")
        .get(await hash(active)),
      undefined,
    );
    assert.equal(
      (
        await request(
          "projects",
          undefined,
          "GET",
          new Map([["editai_session", active]]),
        )
      ).status,
      401,
      "the old active bearer is invalid",
    );
    const gate = await (await request("session")).json();
    assert.equal(gate.screen.id, "remembered");
    assert.equal(gate.profile.ownerId, undefined);
    assert.equal(
      (await request("projects")).status,
      401,
      "remembering alone does not authorize data access",
    );
    const beforeResume = provisions;
    assert.equal((await request("resume", {})).status, 200);
    assert.equal(
      provisions,
      beforeResume,
      "resume reuses the verified install",
    );
    const resumed = await (await request("session")).json();
    assert.equal(resumed.screen.id, "ready");
    assert.equal(resumed.profile.ownerId, owner);
    assert.equal(resumed.profile.displayName, "Jadon Updated");
    assert.equal(resumed.profile.needsName, false);
    assert.equal(resumed.profile.consent, true);
    assert.equal(resumed.profile.consentDecided, true);
    assert.equal((await (await request("projects")).json()).projects[0].id, id);
    assert.deepEqual(
      new Uint8Array(await (await request("assets/" + source)).arrayBuffer()),
      bytes,
    );
    await request("consent", { allow: false });
    await request("logout", {});
    await request("session");
    await request("resume", {});
    const declined = await (await request("session")).json();
    assert.equal(declined.profile.consent, false);
    assert.equal(declined.profile.consentDecided, true);
    await request("logout", {});
    await request("session");
    revoked = true;
    assert.equal(
      (await request("resume", {})).status,
      401,
      "revoked credentials cannot resume",
    );
    revoked = false;
    account = { id: "a-different-verified-account", handle: null };
    assert.equal((await request("resume", {})).status, 200);
    const different = await (await request("session")).json();
    assert.notEqual(different.profile.ownerId, owner);
    assert.equal(different.profile.displayName, "");
    assert.equal(different.profile.needsName, true);
    assert.equal(different.profile.consentDecided, false);
    assert.equal((await request("choice", { choice: "publik" })).status, 200);
    assert.equal((await (await request("projects")).json()).projects.length, 0);
    assert.equal(
      store.database
        .prepare("SELECT COUNT(*) AS n FROM projects WHERE owner=?")
        .get(owner).n,
      1,
      "another account must not delete or adopt the prior library",
    );
    // Deletion removes the actual EditAI identity and every active session,
    // not just the current device's browser cache. Other owners remain intact.
    const deletedOwner = different.profile.ownerId;
    await request("onboarding/name", { firstName: "Deletion fixture" });
    await request("consent", { allow: true });
    const deletedSource = crypto.randomUUID();
    const deletedDocument = structuredClone(d);
    deletedDocument.sources[0].id = deletedSource;
    assert.equal(
      (
        await request("projects", {
          id: crypto.randomUUID(),
          title: "Delete me",
          document: deletedDocument,
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("assets/" + deletedSource, bytes, "PUT")).status,
      200,
    );
    store.database
      .prepare(
        "INSERT INTO sessions (id,install_id,credential,owner,created_at,expires_at) VALUES (?,?,?,?,?,?)",
      )
      .run(
        await hash(crypto.randomUUID()),
        crypto.randomUUID(),
        await encrypt(credential, secret),
        deletedOwner,
        Date.now(),
        Date.now() + 86400000,
      );
    assert.equal((await request("account", undefined, "DELETE")).status, 200);
    assert.deepEqual(deletedAiOwners, [deletedOwner]);
    for (const table of [
      "profiles",
      "account_preferences",
      "projects",
      "assets",
      "usage",
      "speech_jobs",
      "sessions",
    ])
      assert.equal(
        store.database
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE owner=?`)
          .get(deletedOwner).n,
        0,
        `${table} removed for deleted account`,
      );
    assert.equal(
      store.database
        .prepare("SELECT COUNT(*) AS n FROM projects WHERE owner=?")
        .get(owner).n,
      1,
    );
    assert.equal(
      store.database
        .prepare("SELECT name FROM profiles WHERE owner=?")
        .get(owner).name,
      "Jadon Updated",
    );
    assert.ok(!jar.has("editai_session"));
    assert.ok(!jar.has("editai_connection"));
    assert.notEqual(
      (await (await request("session")).json()).screen.id,
      "ready",
    );
  } finally {
    store.database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
