// Isolated transport fixtures only. Never sends test activity to Publik.
import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import * as sdk from "../publik.ts";
await test("official desktop telemetry schema, foreground activity and opt-out", async () => {
  const original = globalThis.fetch,
    environment = { ...process.env },
    calls = [];
  process.env.DO_NOT_TRACK = "0";
  process.env.PUBLIK_TELEMETRY = "true";
  process.env.PUBLIK_TELEMETRY_INTERVAL_SECONDS = "1";
  let credential = {
    key: "fixture-not-a-live-key",
    base_url: "https://example.invalid",
    install_id: "fixture",
    claim_url: null,
    choice: "publik",
  };
  await sdk.configureCredentialStore(
    async () => credential,
    async (v) => {
      credential = v;
    },
  );
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return Response.json({ ok: true });
  };
  try {
    let active = false;
    sdk.setActivityCheck(() => active);
    sdk.startTelemetry();
    await delay(20);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.event, "app_opened");
    assert.equal(calls[0].body.app, "editai-desktop");
    assert.equal(calls[0].body.app_version, "0.2.1");
    assert.equal(calls[0].body.v, 1);
    assert.match(calls[0].body.install_id, /^[a-f0-9-]{36}$/);
    await delay(1050);
    assert.equal(calls.length, 1);
    active = true;
    await delay(1050);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].body.event, "active_session");
    process.env.DO_NOT_TRACK = "1";
    await delay(1050);
    assert.equal(calls.length, 2);
  } finally {
    sdk.forgetCredential();
    await sdk.flushCredentialStore();
    globalThis.fetch = original;
    for (const k of Object.keys(process.env))
      if (!(k in environment)) delete process.env[k];
    Object.assign(process.env, environment);
  }
});
