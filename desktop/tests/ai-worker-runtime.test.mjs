import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare, Response as OutboundResponse } from "miniflare";

const privateOrigin = "https://fixture-ai-private.chatgpt.site";
const userKey = "fixture-user-runtime-key";
const serviceToken = "fixture-private-runtime-token";
const answer = { summary: "A greeting.", hook: "Starts with hello.", highlights: ["00:00 Hello"] };

const output = await build({
  stdin: {
    contents: `
      import { relayAi } from "./lib/server/ai-engine.ts";
      export default { async fetch(request, env) {
        try {
          const context = {
            path: "ai/summary",
            body: { words: [{id:"original-word",clip:0,start:0,end:1,text:"Hello"}] },
            owner: "private-owner-not-for-transport", db: {},
            key: env.USER_KEY, choice: "publik", ownKey: null, signal: request.signal,
          };
          const config = new URL(request.url).pathname === "/public" ? {} : {
            EDITAI_AI_ORIGIN: env.PRIVATE_ORIGIN,
            EDITAI_AI_SERVICE_TOKEN: env.SERVICE_TOKEN,
          };
          return Response.json(await relayAi(context, fetch, config));
        } catch(error) {
          return Response.json({error:error.message}, {status:error.status || 500});
        }
      }};
    `,
    resolveDir: process.cwd(),
    sourcefile: "relay-runtime-fixture.ts",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  target: "es2022",
  logLevel: "silent",
});

function runtime(outboundService) {
  return new Miniflare({
    modules: true,
    script: output.outputFiles[0].text,
    // Keep within the bundled Workerd binary's supported date. This exercises
    // its native Request/fetch implementation rather than Node fetch mocks.
    compatibilityDate: "2026-05-15",
    bindings: { USER_KEY: userKey, PRIVATE_ORIGIN: privateOrigin, SERVICE_TOKEN: serviceToken },
    outboundService,
  });
}

test("actual Workerd fetch executes the AI relay with supported redirect mode and header-only service credentials", async () => {
  const requests = [];
  const mf = runtime(async request => {
    requests.push({url:request.url, headers:new Headers(request.headers), body:await request.json()});
    return new OutboundResponse(JSON.stringify(answer), {headers:{"content-type":"application/json"}});
  });
  try {
    let response = await mf.dispatchFetch("https://relay-runtime.test/private");
    assert.equal(response.status, 200, "The real Worker fetch must reach its outbound boundary");
    assert.deepEqual(await response.json(), answer);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, privateOrigin + "/api/desktop-ai/execute");
    assert.equal(requests[0].headers.get("authorization"), "Bearer " + userKey);
    assert.equal(requests[0].headers.get("OAI-Sites-Authorization"), "Bearer " + serviceToken);
    assert.equal(requests[0].headers.get("origin"), privateOrigin);
    assert.deepEqual(Object.keys(requests[0].body).sort(), ["choice", "consent", "ownKey", "path", "request"]);
    assert.ok(!JSON.stringify(requests[0].body).includes(serviceToken));
    assert.ok(!JSON.stringify(requests[0].body).includes("private-owner-not-for-transport"));
    response = await mf.dispatchFetch("https://relay-runtime.test/public");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), answer);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].url, "https://editai.it.com/api/desktop-ai/execute");
    assert.equal(requests[1].headers.get("OAI-Sites-Authorization"), null);
    assert.equal(requests[1].headers.get("authorization"), "Bearer " + userKey);
  } finally { await mf.dispose(); }
});

test("actual Workerd relay refuses every redirect without following it or exposing credentials to its destination", async () => {
  let status = 301;
  const requests = [];
  const mf = runtime(async request => {
    requests.push({url:request.url, user:request.headers.get("authorization"),
      service:request.headers.get("OAI-Sites-Authorization")});
    return new OutboundResponse(status === 304 ? null : "Redirect fixture", { status,
      headers:{location:"https://fixture-untrusted.test/collect"} });
  });
  try {
    for (status of [300, 301, 302, 303, 304, 305, 306, 307, 308, 399]) {
      const before = requests.length;
      const response = await mf.dispatchFetch("https://relay-runtime.test/private");
      assert.equal(response.status, 502);
      const text = await response.text();
      assert.ok(text.includes("project is saved"));
      for (const sensitive of [userKey, serviceToken, privateOrigin, "fixture-untrusted.test"])
        assert.ok(!text.includes(sensitive), "Client errors must not expose internal destinations or credentials");
      assert.equal(response.headers.get("location"), null);
      assert.equal(requests.length, before + 1, "Redirects must not trigger a second outbound request");
      assert.equal(requests.at(-1).url, privateOrigin + "/api/desktop-ai/execute");
      assert.ok(requests.every(request => !request.url.includes("fixture-untrusted.test")));
    }
  } finally { await mf.dispose(); }
});
