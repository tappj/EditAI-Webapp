import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const guard = resolve("scripts/development-push-guard.mjs");
const sha = "1".repeat(40);
const update = (ref: string) => `refs/heads/test ${sha} ${ref} ${sha}\n`;
function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), "editai-push-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  return (input: string, allow = "") => spawnSync(process.execPath, [guard, "origin", "https://example.test/repo"], {
    cwd: root, input, encoding: "utf8",
    env: { ...process.env, EDITAI_ALLOW_RELEASE_PUSH: allow },
  });
}

test("development push guard rejects protected refs, deletes and combined pushes", t => {
  const run = fixture(t);
  for (const ref of ["refs/heads/main", "refs/heads/master", "refs/tags/v1.0.0"]) {
    for (const input of [update(ref), update("refs/heads/codex/desktop-migration") + update(ref), `delete ${"0".repeat(40)} ${ref} ${sha}\n`]) {
      const result = run(input);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /reserved for explicitly requested releases/);
    }
  }
  assert.equal(run(update("refs/heads/codex/desktop-migration")).status, 0);
  assert.equal(run(update("refs/heads/main"), "1").status, 0);
});

test("release opt-in and development pushes still run the original privacy guard", t => {
  const root = mkdtempSync(join(tmpdir(), "editai-hook-chain-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  mkdirSync(join(root, ".git/hooks"), { recursive: true });
  writeFileSync(join(root, ".git/hooks/pre-push"), '#!/bin/sh\ncat >/dev/null\necho "Existing privacy guard ran" >&2\nexit 23\n', { mode: 0o755 });
  for (const ref of ["refs/heads/main", "refs/heads/codex/desktop-migration"]) {
    const result = spawnSync(process.execPath, [guard, "origin", "https://example.test/repo"], {
      cwd: root, input: update(ref), encoding: "utf8",
      env: { ...process.env, EDITAI_ALLOW_RELEASE_PUSH: "1" },
    });
    assert.equal(result.status, 23);
    assert.match(result.stderr, /Existing privacy guard ran/);
  }
});
