import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export function setupDevelopmentDatabase() {
  // This config cannot address a deployed D1 database. Its placeholder identity
  // matches vite.config.ts; persistence is separate from built-server QA state.
  const directory = resolve(".sites-runtime/development");
  mkdirSync(directory, { recursive: true });
  const config = resolve(directory, "wrangler.json");
  writeFileSync(config, JSON.stringify({
    name: "editai-development",
    compatibility_date: "2026-05-15",
    d1_databases: [{
      binding: "DB",
      database_name: "site-creator-d1",
      database_id: "00000000-0000-4000-8000-000000000000",
      migrations_dir: resolve("drizzle"),
    }],
  }, null, 2));
  execFileSync(process.execPath, [
    "--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js",
    "d1", "migrations", "apply", "DB", "--local", "--config", config,
    "--persist-to", resolve(".wrangler/development"),
  ], { stdio: ["ignore", "inherit", "inherit"] });
}
