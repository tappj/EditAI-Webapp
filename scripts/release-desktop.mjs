// This entry point deliberately fails closed before building a public installer.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { access, writeFile, readFile, readdir } from "node:fs/promises";
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
  const identity = identities.match(
    /\b([A-F0-9]{40})\s+"Developer ID Application:[^"]+"/,
  )?.[1];
  if (!identity)
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
  const source =
    process.env.EDITAI_FFMPEG_SOURCE_ARCHIVE ||
    "outputs/EditAI-0.2.0-native-corresponding-source.tar.xz";
  if (!source)
    throw Error(
      "Set EDITAI_FFMPEG_SOURCE_ARCHIVE to the complete corresponding-source archive for the bundled native build. See desktop/THIRD-PARTY.md.",
    );
  await access(source);
  const native = JSON.parse(
    await readFile("desktop/bin/native-build.json", "utf8"),
  );
  if (
    createHash("sha256")
      .update(await readFile(source))
      .digest("hex") !== native.sourceSha256
  )
    throw Error(
      "Native corresponding source does not match the build manifest.",
    );
  run(process.execPath, ["scripts/build-mac-icon.mjs"], { stdio: "inherit" });
  run(process.execPath, ["scripts/build-desktop.mjs"], { stdio: "inherit" });
  const builder = spawnSync(
    process.execPath,
    [
      "node_modules/electron-builder/cli.js",
      "--config",
      "desktop/electron-builder.yml",
      "--config.mac.identity=" + identity,
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
  if (!check.includes("publik self-test: ok editai-desktop 0.2.3"))
    throw Error("Packaged Publik self-test failed.");
  const artifactNames = (await readdir("desktop/release")).filter(
    (n) =>
      n === "latest-mac.yml" ||
      (n.startsWith(`EditAI-0.2.3-mac-${process.arch}.`) &&
        /\.(dmg|zip|blockmap)$/.test(n) &&
        !n.endsWith(".dmg.blockmap")),
  );
  for (const name of artifactNames.filter((n) => n.endsWith(".dmg"))) {
    const image = resolve("desktop/release", name);
    run("codesign", ["--force", "--sign", identity, "--timestamp", image]);
    const notarization = JSON.parse(
      run("xcrun", [
        "notarytool",
        "submit",
        image,
        "--keychain-profile",
        process.env.APPLE_KEYCHAIN_PROFILE,
        "--wait",
        "--output-format",
        "json",
      ]),
    );
    if (notarization.status !== "Accepted")
      throw Error("Disk-image notarization was not accepted.");
    run("xcrun", ["stapler", "staple", image]);
    run("xcrun", ["stapler", "validate", image]);
    run("spctl", [
      "--assess",
      "--type",
      "open",
      "--context",
      "context:primary-signature",
      "--verbose=2",
      image,
    ]);
  }
  const artifactSha256 = {};
  for (const name of artifactNames)
    artifactSha256[name] = createHash("sha256")
      .update(await readFile(resolve("desktop/release", name)))
      .digest("hex");
  await writeFile(
    "outputs/desktop-signing-verification.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        arch: process.arch,
        archiveSha256: createHash("sha256")
          .update(await readFile(resolve(app, "Contents/Resources/app.asar")))
          .digest("hex"),
        artifactSha256,
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
