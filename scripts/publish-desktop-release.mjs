// Publish only an installed, signed, notarized and verified macOS release.
// Run on the signing host with an authenticated gh CLI; secrets never enter JS.
import { extractFile } from "@electron/asar";
import { github } from "./github-cli.mjs";
import { execFileSync } from "node:child_process";
import { readFile, readdir, copyFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, basename } from "node:path";
const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe" });
try {
  if (process.platform !== "darwin")
    throw Error(
      "Only macOS release acceptance is supported by this publisher.",
    );
  const dir = resolve("desktop/release"),
    arch = process.arch,
    tag = "v0.2.1",
    app = resolve(
      dir,
      "mac" + (arch === "arm64" ? "-arm64" : "") + "/EditAI.app",
    );
  const signed = JSON.parse(
    await readFile("outputs/desktop-signing-verification.json", "utf8"),
  );
  const accepted = JSON.parse(
    await readFile("outputs/desktop-live-verification.json", "utf8"),
  );
  if (
    !signed.gatekeeper ||
    !signed.stapled ||
    !signed.publikSelfTest ||
    signed.arch !== arch ||
    !(Date.parse(accepted.date) >= Date.parse(signed.date))
  )
    throw Error("Signed release verification is missing.");
  if (
    !accepted.authentication ||
    !accepted.export ||
    accepted.error ||
    accepted.fixtures ||
    !accepted.runtime.packaged ||
    !accepted.runtime.sandbox ||
    !accepted.runtime.contextIsolation ||
    accepted.runtime.nodeIntegration ||
    accepted.runtime.version !== "0.2.1"
  )
    throw Error("Installed application acceptance has not passed.");
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const archive = resolve(app, "Contents/Resources/app.asar");
  if (
    sha(await readFile(archive)) !== accepted.runtime.archiveSha256 ||
    signed.archiveSha256 !== accepted.runtime.archiveSha256
  )
    throw Error("Installed acceptance does not match this app.");
  execFileSync("codesign", ["--verify", "--deep", "--strict", app], {
    stdio: "pipe",
  });
  // Gatekeeper assessment excludes development/ad-hoc builds without parsing identities.
  run("xcrun", ["stapler", "validate", app]);
  run("spctl", ["--assess", "--type", "execute", "--verbose=2", app]);
  const names = (await readdir(dir)).filter(
    (n) =>
      n === "latest-mac.yml" ||
      (n.startsWith(`EditAI-0.2.1-mac-${arch}.`) &&
        /\.(dmg|zip|blockmap)$/.test(n) &&
        !n.endsWith(".dmg.blockmap")),
  );
  if (
    !names.some((n) => n.endsWith(".dmg")) ||
    !names.some((n) => n.endsWith(".zip")) ||
    !names.includes("latest-mac.yml")
  )
    throw Error("DMG, ZIP and updater metadata are required.");
  for (const name of names.filter((n) => n.endsWith(".dmg"))) {
    run("xcrun", ["stapler", "validate", resolve(dir, name)]);
    run("spctl", [
      "--assess",
      "--type",
      "open",
      "--context",
      "context:primary-signature",
      "--verbose=2",
      resolve(dir, name),
    ]);
  }
  const source =
    process.env.EDITAI_FFMPEG_SOURCE_ARCHIVE ||
    "outputs/EditAI-0.2.0-native-corresponding-source.tar.xz";
  if (!source) throw Error("Provide the corresponding native source archive.");
  const provenance = JSON.parse(
    extractFile(archive, "notices/native-build.json").toString("utf8"),
  );
  if (provenance.sourceSha256 !== sha(await readFile(source)))
    throw Error("Source archive does not match the installed native build.");
  for (const name of names)
    if (
      signed.artifactSha256?.[name] !== sha(await readFile(resolve(dir, name)))
    )
      throw Error("Release artifacts changed after verification.");
  const sourceName = "EditAI-0.2.1-native-corresponding-source.tar.xz";
  await copyFile(source, resolve(dir, sourceName));
  names.push(sourceName);
  const checksums = [];
  for (const name of names)
    checksums.push(sha(await readFile(resolve(dir, name))) + "  " + name);
  await writeFile(resolve(dir, "SHA256SUMS.txt"), checksums.join("\n") + "\n");
  names.push("SHA256SUMS.txt");
  const notes = resolve("outputs/desktop-release-notes.md");
  await writeFile(
    notes,
    "EditAI Desktop 0.2.1 for macOS " +
      arch +
      ". Rounded macOS app icon and guided drag-to-Applications installer. Shared editor, local media and native FFmpeg. Signed, notarized and installed-app acceptance verified. Web remains available at https://editai-web.givingarmadillo8.chatgpt.site. Windows is not included.\n",
  );
  // The draft contains the exact signed ZIP used by macOS CI to assemble the DMG.
  // Keep it private until every release artifact and the installed app pass.
  const draft = JSON.parse(github([
    "release", "view", tag, "--repo", "tappj/EditAI-Webapp", "--json", "isDraft,assets",
  ]));
  if (!draft.isDraft) throw Error("Expected a private draft release before publication.");
  const zipName = `EditAI-0.2.1-mac-${arch}.zip`;
  const remoteZip = draft.assets.find((asset) => asset.name === zipName);
  if (!remoteZip || remoteZip.size !== (await readFile(resolve(dir, zipName))).length)
    throw Error("Draft signed ZIP is missing or differs in size.");
  github([
    "release", "upload", tag, ...names.map((n) => resolve(dir, n)),
    "--repo", "tappj/EditAI-Webapp", "--clobber",
  ]);
  const staged = JSON.parse(github([
    "release", "view", tag, "--repo", "tappj/EditAI-Webapp", "--json", "isDraft,assets",
  ]));
  if (!staged.isDraft || names.some((name) => !staged.assets.some(
    (asset) => asset.name === name,
  ))) throw Error("Draft release is missing an uploaded artifact.");
  github([
    "release", "edit", tag, "--repo", "tappj/EditAI-Webapp",
    "--title", "EditAI Desktop 0.2.1", "--notes-file", notes, "--draft=false",
  ]);
  const dmg = names.find((n) => n.endsWith(".dmg"));
  await writeFile(
    "lib/desktop-releases.json",
    JSON.stringify(
      [
        {
          platform: "macos",
          arch,
          version: "0.2.1",
          url: `https://github.com/tappj/EditAI-Webapp/releases/download/${tag}/${dmg}`,
          signed: true,
          notarized: true,
          tested: true,
        },
      ],
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Verified release published. Commit and deploy the generated download metadata to activate the homepage link.",
  );
} catch (e) {
  console.error("Publication blocked:", e.message);
  process.exitCode = 1;
}
