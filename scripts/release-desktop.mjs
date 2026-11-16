// This entry point deliberately fails closed before building a public installer.
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { access, writeFile, readdir } from "node:fs/promises";
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...options });
try {
  if (process.platform !== "darwin")
    throw Error(
      "Public releases currently require the validated macOS signing host. Windows QA is prepared separately.",
    );
  const identities = run("security", [
    "find-identity",
    "-v",
    "-p",
    "codesigning",
  ]);
  if (!identities.includes("Developer ID Application:"))
    throw Error(
      "Install a Developer ID Application identity in Keychain. Apple Development is for local QA only.",
    );
  process.env.APPLE_KEYCHAIN_PROFILE ||= "editai-notary";
  try {
    run("xcrun", [
      "notarytool",
      "history",
      "--keychain-profile",
      process.env.APPLE_KEYCHAIN_PROFILE,
      "--output-format",
      "json",
    ]);
  } catch {
    throw Error(
      "The configured notarytool Keychain profile is unavailable or unauthorized.",
    );
  }
  // Preserve corresponding source alongside the GPL native executables.
  const source = process.env.EDITAI_FFMPEG_SOURCE_ARCHIVE;
  if (!source)
    throw Error(
      "Set EDITAI_FFMPEG_SOURCE_ARCHIVE to the complete corresponding-source archive for the bundled native build. See desktop/THIRD-PARTY.md.",
    );
  await access(source);
  run(process.execPath, ["scripts/build-desktop.mjs"], { stdio: "inherit" });
  const builder = spawnSync(
    process.execPath,
    [
      "node_modules/electron-builder/cli.js",
      "--config",
      "desktop/electron-builder.yml",
      "--mac",
      "--" + process.arch,
      "--publish",
      "never",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (builder.status !== 0)
    throw Error(
      "Signed/notarized packaging failed. No artifacts were published.",
    );
  const app = resolve(
    "desktop/release/mac" +
      (process.arch === "arm64" ? "-arm64" : "") +
      "/EditAI.app",
  );
  run("codesign", ["--verify", "--deep", "--strict", app]);
  run("xcrun", ["stapler", "validate", app]);
  run("spctl", ["--assess", "--type", "execute", "--verbose=2", app]);
  const check = run(resolve(app, "Contents/MacOS/EditAI"), [], {
    env: {
      ...process.env,
      PUBLIK_SELF_TEST: "1",
      DO_NOT_TRACK: "1",
      PUBLIK_TELEMETRY: "false",
    },
    timeout: 60000,
  });
  if (!check.includes("publik self-test: ok editai-desktop 0.2.0"))
    throw Error("Packaged Publik self-test failed.");
  await writeFile(
    "outputs/desktop-signing-verification.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        arch: process.arch,
        codesign: true,
        stapled: true,
        gatekeeper: true,
        publikSelfTest: true,
        artifacts: (await readdir("desktop/release")).filter((n) =>
          /\.(dmg|zip|yml|blockmap)$/.test(n),
        ),
      },
      null,
      2,
    ),
  );
  console.log(
    "Signed and notarized artifacts verified locally. Run installed-app acceptance before publishing a release or updating download metadata.",
  );
} catch (e) {
  console.error("Release blocked:", e.message);
  process.exitCode = 1;
}
