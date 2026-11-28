import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { checkPublicBoundary } from "../scripts/check-public-boundary.mjs";

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "editai-boundary-"));
  try {
    execFileSync("git", ["init", "--quiet", root]);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function file(root: string, path: string, text: string) {
  const full = join(root, path);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, text);
}
test("release guard checks staged private source without printing its contents", async () => {
  await fixture(async (root) => {
    await file(root, "editor.mjs", "export const validate = () => true;");
    execFileSync("git", ["-C", root, "add", "."]);
    assert.equal((await checkPublicBoundary(root, "tracked")).ok, true);
    const confidential = "You are EditAI, a precise " + "video editing assistant";
    await file(root, "hidden.mjs", `const data = ${JSON.stringify(confidential)};`);
    await file(root, ".private-ai/engine.mjs", "export const execute = () => {};");
    execFileSync("git", ["-C", root, "add", "."]);
    const result = await checkPublicBoundary(root, "tracked");
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((f) => f.rule === "private-module"));
    assert.ok(result.failures.some((f) => f.rule === "private-prompt-eva"));
    assert.ok(!JSON.stringify(result).includes(confidential));
  });
});
test("missing builds, source maps and artifact symlinks fail closed", async () => {
  await fixture(async (root) => {
    assert.equal((await checkPublicBoundary(root, "desktop")).ok, false);
    await file(root, "desktop/dist/main.mjs", "const remoteEngine = true;");
    assert.equal((await checkPublicBoundary(root, "desktop")).ok, true);
    await file(root, "desktop/dist/main.mjs.map", '{"version":3}');
    let result = await checkPublicBoundary(root, "desktop");
    assert.ok(result.failures.some((f) => f.rule === "production-source-map"));
    await rm(join(root, "desktop/dist/main.mjs.map"));
    await file(root, "desktop/dist/main.mjs", "//# sourceMappingURL=data:application/json;base64,e30=");
    result = await checkPublicBoundary(root, "desktop");
    assert.ok(result.failures.some((f) => f.rule === "inline-production-source-map"));
    await file(root, "desktop/dist/main.mjs", "const remoteEngine = true;");
    await symlink(join(root, "desktop/dist/main.mjs"), join(root, "desktop/dist/link.mjs"));
    result = await checkPublicBoundary(root, "desktop");
    assert.ok(result.failures.some((f) => f.rule === "non-regular-file"));
  });
});
test("browser guard requires client entry and scans emitted JavaScript", async () => {
  await fixture(async (root) => {
    await file(root, "dist/client/readme.txt", "partial build");
    assert.equal((await checkPublicBoundary(root, "browser")).ok, false);
    await file(root, "dist/client/_next/assets/app.js", "const localExport = true;");
    assert.equal((await checkPublicBoundary(root, "browser")).ok, true);
    await file(root, "dist/client/_next/assets/app.js", "const leaked = 'Review ONLY the flagged " + "local retakes';");
    const result = await checkPublicBoundary(root, "browser");
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((f) => f.rule === "private-prompt-retake-review"));
  });
});
