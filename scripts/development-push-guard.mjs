import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

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
  const result = spawnSync(previousHook, process.argv.slice(2), {
    input: updates, stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
