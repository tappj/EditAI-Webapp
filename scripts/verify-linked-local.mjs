// Isolated integration check using an already approved owner-test install.
// No production auth route/bypass is added. Local D1 contains encrypted credentials.
import { readFile, writeFile, unlink, chmod } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { hash, encrypt } from "../lib/server/security.ts";
const headerPath = process.env.LIVE_TEST_KEY_HEADER_PATH;
if (!headerPath)
  throw Error("Provide the private approved test-install header path.");
const key = (await readFile(headerPath, "utf8"))
  .trim()
  .replace(/^authorization:\s*Bearer\s+/i, "");
if (!key.startsWith("pk_")) throw Error("Invalid test-install header.");
const secret = randomBytes(32).toString("base64"),
  token = randomUUID();
const state = "work/live-test-state",
  config = "dist/server/wrangler.json";
const wrangler = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
];
const runtimeEnv = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "LANG"]
    .filter((k) => process.env[k])
    .map((k) => [k, process.env[k]]),
);
Object.assign(runtimeEnv, {
  CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
  SESSION_ENCRYPTION_KEY: secret,
});
const sqlPath = "work/live-test-seed.sql";
const migrations = await Promise.all(
  [
    "0000_furry_phil_sheldon.sql",
    "0001_massive_expediter.sql",
    "0002_optimal_the_anarchist.sql",
  ].map((f) => readFile("drizzle/" + f, "utf8")),
);
const id = await hash(token),
  cipher = await encrypt(key, secret);
const sql =
  migrations
    .join("\n")
    .replaceAll("CREATE TABLE `", "CREATE TABLE IF NOT EXISTS `") +
  `\nINSERT INTO sessions (id,install_id,credential,created_at,expires_at,last_event,consent,telemetry) VALUES ('${id}','${randomUUID()}','${cipher}',${Date.now()},${Date.now() + 3600000},0,0,0);`;
await writeFile(sqlPath, sql, { mode: 0o600 });
try {
  const seeded = spawnSync(
    process.execPath,
    [
      ...wrangler,
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      state,
      "--config",
      config,
      "--file",
      sqlPath,
    ],
    { env: runtimeEnv, encoding: "utf8" },
  );
  if (seeded.status !== 0) throw Error("Could not prepare isolated local D1.");
} finally {
  await unlink(sqlPath);
}
const server = spawn(
  process.execPath,
  [
    ...wrangler,
    "dev",
    "--config",
    config,
    "--local",
    "--persist-to",
    state,
    "--ip",
    "127.0.0.1",
    "--port",
    "5186",
    "--inspector-port",
    "0",
  ],
  { env: runtimeEnv, stdio: ["ignore", "pipe", "pipe"] },
);
// Consume dev logs without exposing bindings or provider errors.
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});
const statePath = "outputs/live-local-session.json",
  baseURL = "http://127.0.0.1:5186";
await writeFile(
  statePath,
  JSON.stringify({
    cookies: [
      {
        name: "editai_session",
        value: token,
        domain: "127.0.0.1",
        path: "/",
        expires: Date.now() / 1000 + 3600,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  }),
  { mode: 0o600 },
);
await chmod(statePath, 0o600);
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      ready = (await fetch(baseURL + "/api/health")).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw Error("Local test Worker did not start.");
  console.log(
    "Isolated Worker ready. Real approved Publik credential; no route fixtures.",
  );
  const test = spawn(
    process.execPath,
    [
      process.env.LIVE_CONTRACTS_ONLY
        ? "scripts/verify-ai-contracts.mjs"
        : "scripts/verify-live.mjs",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_BASE_URL: baseURL,
        LIVE_SESSION_STATE: statePath,
      },
    },
  );
  const status = await new Promise((resolve) => test.on("exit", resolve));
  if (status !== 0) process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
