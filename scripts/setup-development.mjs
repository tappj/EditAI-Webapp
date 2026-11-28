import { execFileSync } from "node:child_process";
import { writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setupDevelopmentDatabase } from "./setup-development-db.mjs";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
let hooksPath = "";
try { hooksPath = git("config", "--get", "core.hooksPath"); } catch {}
if (hooksPath && hooksPath !== ".githooks")
  throw Error("An existing core.hooksPath needs to be integrated before setup; it was preserved.");
chmodSync(".githooks/pre-push", 0o755);
// Hook paths must be checkout-specific: older worktrees may not have .githooks.
// They must continue to use the original shared privacy guard in .git/hooks.
git("config", "--local", "extensions.worktreeConfig", "true");
let sharedHooksPath = "";
try { sharedHooksPath = git("config", "--local", "--get", "core.hooksPath"); } catch {}
if (sharedHooksPath === ".githooks") git("config", "--local", "--unset", "core.hooksPath");
git("config", "--worktree", "core.hooksPath", ".githooks");
git("config", "--worktree", "push.default", "current");
git("config", "--worktree", "branch.codex/desktop-migration.pushRemote", "origin");

// Create local encryption material once. Never inspect or overwrite existing secrets.
try {
  writeFileSync(".dev.vars", [
    "# Local Worker secrets only; ignored by Git. Never copy production user keys.",
    `SESSION_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`,
    "# Set PUBLIK_APP_TOKEN here through an approved developer setup for real web sign-in.",
    "# Without it the local web sign-in reports unavailable; desktop has its own public bootstrap.",
    "",
  ].join("\n"), { flag: "wx", mode: 0o600 });
  console.log("Created ignored local encryption configuration (no secrets displayed).");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Existing local configuration preserved without reading it.");
}
console.log("Development push guard installed; existing Git privacy guard preserved.");
setupDevelopmentDatabase();
console.log(`Current branch: ${git("branch", "--show-current")}. Work on codex/desktop-migration.`);
console.log("Web: npm run dev → http://127.0.0.1:5173");
console.log("Desktop: npm run desktop:dev → isolated EditAI Dev profile");
console.log("No source was pushed, no release was published, and the installed app was not changed.");
