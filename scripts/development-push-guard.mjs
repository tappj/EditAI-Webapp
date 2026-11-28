import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { tmpdir } from "node:os";

const updates = readFileSync(0, "utf8");
const protectedRefs = updates.split("\n").filter(Boolean).some(line => {
  const ref = line.trim().split(/\s+/)[2];
  return ref === "refs/heads/main" || ref === "refs/heads/master" || ref?.startsWith("refs/tags/");
});
if (protectedRefs && process.env.EDITAI_ALLOW_RELEASE_PUSH !== "1") {
  console.error("Push blocked: main and tags are reserved for explicitly requested releases.\nSave development work on codex/desktop-migration. See docs/DEVELOPING.md.");
  process.exit(1);
}

// Preserve the existing privacy/history guard and any other checkout-local guard.
const common = execFileSync("git", ["rev-parse", "--git-common-dir"], { encoding: "utf8" }).trim();
const previousHook = resolve(common, "hooks/pre-push");
const thisHook = resolve(".githooks/pre-push");
if (previousHook !== thisHook && existsSync(previousHook)) {
  // Git selects the hook interpreter on Windows as well as Unix. Directly
  // spawning a shebang file from Node does not work on Windows.
  const directory = mkdtempSync(join(tmpdir(), "editai-push-hook-"));
  let status = 1;
  try {
    const input = join(directory, "updates");
    writeFileSync(input, updates, { mode: 0o600 });
    const result = spawnSync("git", [
      "-c", `core.hooksPath=${dirname(previousHook)}`, "hook", "run",
      `--to-stdin=${input}`, "pre-push", "--", ...process.argv.slice(2),
    ], { stdio: "inherit" });
    if (result.error) throw result.error;
    status = result.status ?? 1;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  process.exit(status);
}
