import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LocalStore } from "../local-store.mjs";
test("editing checkpoints isolate owners, poll without inference, and reuse completed stages on explicit retry", async () => {
  const dir = await mkdtemp(join(tmpdir(), "editai-checkpoint-"));
  const path = join(dir, "checkpoints.mjs");
  await build({
    entryPoints: ["lib/server/edit-checkpoints.ts"],
    outfile: path,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { editCheckpoint, editJobStatus } = await import(
    pathToFileURL(path).href
  );
  const store = new LocalStore(join(dir, "data"), []);
  try {
    let calls = 0,
      release;
    const pending = editCheckpoint(
      store,
      "alice",
      "task",
      "final",
      "input",
      () =>
        new Promise((r) => {
          calls++;
          release = r;
        }),
    );
    while (!release) await new Promise((r) => setImmediate(r));
    assert.equal(
      (await editJobStatus(store, "alice", "task")).state,
      "running",
    );
    assert.equal((await editJobStatus(store, "bob", "task")).state, "missing");
    await assert.rejects(
      editCheckpoint(store, "alice", "task", "final", "input", async () => {
        calls++;
      }),
      /still running/,
    );
    release({ cuts: [] });
    await pending;
    assert.equal(calls, 1);
    assert.deepEqual((await editJobStatus(store, "alice", "task")).result, {
      cuts: [],
    });
    assert.deepEqual(
      await editCheckpoint(
        store,
        "alice",
        "task",
        "final",
        "input",
        async () => {
          calls++;
        },
      ),
      { cuts: [] },
    );
    await assert.rejects(
      editCheckpoint(
        store,
        "alice",
        "task",
        "final",
        "different",
        async () => {},
      ),
      /different transcript/,
    );
    let stageCalls = 0;
    const run = () =>
      editCheckpoint(
        store,
        "alice",
        "recover",
        "0",
        "step-input",
        async () => {
          stageCalls++;
          return 42;
        },
        true,
      );
    await assert.rejects(
      editCheckpoint(store, "alice", "recover", "final", "input", async () => {
        await run();
        throw Error("timeout");
      }),
    );
    await assert.rejects(
      editCheckpoint(store, "alice", "recover", "final", "input", run),
      /retry explicitly/,
    );
    assert.equal(
      await editCheckpoint(
        store,
        "alice",
        "recover",
        "final",
        "input",
        run,
        true,
      ),
      42,
    );
    assert.equal(stageCalls, 1);
  } finally {
    store.database.close();
    await rm(dir, { recursive: true, force: true });
  }
});
