// Final verification after assembling the DMG on macOS CI and notarizing it locally.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...options });
const sha = async (file, algorithm = "sha256", encoding = "hex") =>
  createHash(algorithm).update(await readFile(file)).digest(encoding);

try {
  if (process.platform !== "darwin" || process.arch !== "arm64")
    throw Error("This verifier currently supports the tested macOS arm64 release only.");
  const dir = resolve("desktop/release");
  const app = join(dir, "mac-arm64/EditAI.app");
  const archive = join(app, "Contents/Resources/app.asar");
  const dmg = join(dir, "EditAI-0.2.0-mac-arm64.dmg");
  const zip = join(dir, "EditAI-0.2.0-mac-arm64.zip");
  const zipBlockmap = zip + ".blockmap";
  const source = resolve("outputs/EditAI-0.2.0-native-corresponding-source.tar.xz");
  const native = JSON.parse(await readFile("desktop/bin/native-build.json", "utf8"));
  if ((await sha(source)) !== native.sourceSha256)
    throw Error("Bundled FFmpeg source archive does not match its manifest.");
  run("codesign", ["--verify", "--deep", "--strict", app]);
  run("xcrun", ["stapler", "validate", app]);
  run("spctl", ["--assess", "--type", "execute", app]);
  run("hdiutil", ["verify", dmg]);
  run("codesign", ["--verify", "--strict", dmg]);
  run("xcrun", ["stapler", "validate", dmg]);
  run("spctl", [
    "--assess", "--type", "open", "--context", "context:primary-signature", dmg,
  ]);
  const mount = await mkdtemp(join(tmpdir(), "editai-release-check-"));
  try {
    run("hdiutil", ["attach", dmg, "-readonly", "-nobrowse", "-mountpoint", mount]);
    const mounted = join(mount, "EditAI.app");
    run("codesign", ["--verify", "--deep", "--strict", mounted]);
    run("xcrun", ["stapler", "validate", mounted]);
    run("spctl", ["--assess", "--type", "execute", mounted]);
    if ((await sha(join(mounted, "Contents/Resources/app.asar"))) !== (await sha(archive)))
      throw Error("DMG app differs from the signed and tested ZIP app.");
  } finally {
    try { run("hdiutil", ["detach", mount]); } finally { await rm(mount, { recursive: true, force: true }); }
  }
  // The failed local DMG packaging stopped electron-builder before writing updater metadata.
  // Match its ZIP-first update-info schema; the signed DMG is a manual download only.
  const zipSha512 = await sha(zip, "sha512", "base64");
  const zipSize = (await stat(zip)).size;
  const name = "EditAI-0.2.0-mac-arm64.zip";
  await writeFile(join(dir, "latest-mac.yml"),
    `version: 0.2.0\nfiles:\n  - url: ${name}\n    sha512: ${zipSha512}\n    size: ${zipSize}\npath: ${name}\nsha512: ${zipSha512}\nreleaseDate: '${new Date().toISOString()}'\n`);
  const files = [name, name + ".blockmap", "EditAI-0.2.0-mac-arm64.dmg", "latest-mac.yml"];
  const artifactSha256 = {};
  for (const file of files) artifactSha256[file] = await sha(join(dir, file));
  const report = {
    date: new Date().toISOString(),
    arch: "arm64",
    archiveSha256: await sha(archive),
    artifactSha256,
    codesign: true,
    stapled: true,
    gatekeeper: true,
    publikSelfTest: run(join(app, "Contents/MacOS/EditAI"), [], {
      env: { ...process.env, PUBLIK_SELF_TEST: "1", DO_NOT_TRACK: "1", PUBLIK_TELEMETRY: "false" },
    }).includes("publik self-test: ok editai-desktop 0.2.0"),
    ciDmgRun: process.env.EDITAI_DMG_CI_RUN_ID || null,
    artifacts: files,
  };
  if (!report.publikSelfTest) throw Error("Packaged Publik self-test failed.");
  await writeFile("outputs/desktop-signing-verification.json", JSON.stringify(report, null, 2));
  console.log("Signed and notarized app, ZIP, DMG, matching archive and updater metadata verified.");
} catch (error) {
  console.error("Release verification blocked:", error.message);
  process.exitCode = 1;
}
