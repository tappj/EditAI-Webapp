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
    tag = "v0.2.64",
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
    !accepted.downloads ||
    !accepted.previewStillDuringExport ||
    !accepted.localSpeechDetection ||
    !accepted.backgroundWindowClose ||
    accepted.error ||
    accepted.fixtures ||
    !accepted.runtime.packaged ||
    !accepted.runtime.sandbox ||
    !accepted.runtime.contextIsolation ||
    accepted.runtime.nodeIntegration ||
    accepted.runtime.version !== "0.2.64"
  )
    throw Error("Installed application acceptance has not passed.");
  if (
    !accepted.editorUI?.adjustFeedback ||
    !accepted.editorUI?.blackSparkle ||
    !accepted.editorUI?.shiftEnter ||
    !accepted.editorUI?.referenceAnalysis ||
    !accepted.editorUI?.referenceCleanUI ||
    !accepted.motionUI?.audioFades ||
    !accepted.motionUI?.audioOnlyFades ||
    !accepted.motionUI?.clipAnimation ||
    !accepted.motionUI?.textAnimation ||
    !accepted.motionUI?.stableFontOrder ||
    !accepted.motionUI?.compositorExportRequired
  )
    throw Error("Installed animation and fade acceptance has not passed.");
  if (
    !accepted.uploadReview?.centeredPreview ||
    !accepted.uploadReview?.multipleClips ||
    !accepted.uploadReview?.nativePlayback ||
    !accepted.uploadReview?.explicitSend ||
    !accepted.uploadReview?.noAIBeforeSend ||
    !accepted.uploadReview?.cancelledDraftRemoved
  )
    throw Error("Installed upload review acceptance has not passed.");
  if (
    !accepted.textAppearance?.directControls ||
    !accepted.textAppearance?.restoredTimeline ||
    !accepted.textAppearance?.previewHandles ||
    !accepted.textAppearance?.previewSelectionIndependent ||
    !accepted.textAppearance?.inlineEditing ||
    !accepted.textAppearance?.fontSpecimens ||
    !accepted.textAppearance?.palette ||
    !accepted.textAppearance?.variableFont ||
    !accepted.textAppearance?.timelineFades ||
    !accepted.textAppearance?.exportedPixels
  )
    throw Error(
      "Installed text appearance and selection acceptance has not passed.",
    );
  if (
    !accepted.workflowUI?.recorderPills ||
    !accepted.workflowUI?.durationRing ||
    !accepted.workflowUI?.visibleScrollSpeed ||
    !accepted.workflowUI?.desktopFlipHidden ||
    !accepted.workflowUI?.sendDefaults ||
    !accepted.workflowUI?.batchThumbnails
  )
    throw Error("Installed creation workflow acceptance has not passed.");
  if (
    !accepted.nameProfile?.persisted ||
    !accepted.nameProfile?.onboardingComplete
  )
    throw Error(
      "Installed required-name persistence acceptance has not passed.",
    );
  if (
    !accepted.actionMotion?.batchLayers ||
    !accepted.actionMotion?.waveformBars ||
    !accepted.actionMotion?.twinklingStars ||
    !accepted.actionMotion?.reducedMotion
  )
    throw Error("Installed Home icon motion acceptance has not passed.");
  const savingsUI = JSON.parse(
    await readFile("outputs/desktop-savings-verification.json", "utf8"),
  );
  if (
    !savingsUI.fixtures ||
    !savingsUI.nativeGraph ||
    !savingsUI.blueButton ||
    !savingsUI.noBackLink ||
    !savingsUI.restoredGenuineSession ||
    savingsUI.error ||
    savingsUI.savedMinutes !== 1115 ||
    savingsUI.editaiMinutes !== 85 ||
    savingsUI.monthMinutes !== 43200 ||
    savingsUI.archiveSha256 !== signed.archiveSha256
  )
    throw Error(
      "Installed savings graph UI fixture has not passed for this archive; genuine acceptance is checked separately.",
    );
  const settings = JSON.parse(
    await readFile("outputs/desktop-settings-verification.json", "utf8"),
  );
  if (
    settings.error ||
    settings.fixtures ||
    !settings.restoredPreferences ||
    settings.archiveSha256 !== signed.archiveSha256 ||
    !settings.settings?.layout ||
    !settings.settings?.allLanguages ||
    !settings.settings?.liveEva ||
    !settings.settings?.noHoverWave ||
    !settings.settings?.displayIcons ||
    !settings.settings?.deleteConfirmation ||
    !settings.settings?.metadataRemoved
  )
    throw Error(
      "Installed Settings and language acceptance has not passed for this archive.",
    );
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const mascot = JSON.parse(
    await readFile("outputs/desktop-mascot-verification.json", "utf8"),
  );
  if (
    mascot.appearanceVersion !== 13 ||
    !mascot.restoredFloatingDesign ||
    !mascot.fixedBody ||
    !mascot.stableBlink ||
    !mascot.twoFrameWave ||
    !mascot.compactMitten ||
    !mascot.cutting ||
    !mascot.inwardPlay ||
    !mascot.rapidExpressions ||
    !mascot.streakBlush ||
    !mascot.headphonePlay ||
    !mascot.sparkles ||
    !mascot.homeShadow ||
    mascot.idleBlush !== 0 ||
    !mascot.fixtures ||
    !mascot.home ||
    !mascot.transparent ||
    !mascot.typing ||
    !mascot.avatar ||
    !mascot.playback ||
    !mascot.cancel ||
    !mascot.reducedMotion ||
    !mascot.cleanup ||
    !mascot.restoredGenuineSession ||
    mascot.error ||
    mascot.archiveSha256 !== signed.archiveSha256
  )
    throw Error(
      "Installed mascot and inline chat fixture has not passed for this archive; genuine acceptance is checked separately.",
    );
  if (
    !mascot.evaStudio?.undoRedo ||
    !mascot.evaStudio?.sliderUndo ||
    !mascot.evaStudio?.anchoredTooltips ||
    !mascot.evaStudio?.headerResets ||
    !mascot.evaStudio?.neutralResets ||
    !mascot.evaStudio?.boundedTimelineResize ||
    !mascot.evaStudio?.evaName
  )
    throw Error("Installed Eva studio acceptance has not passed.");
  if (
    !mascot.evaThemes?.vibrantMapping ||
    !mascot.evaThemes?.allEightThemes ||
    !mascot.evaThemes?.nativeDarkTiles ||
    !mascot.evaThemes?.lightLogoOnly ||
    !mascot.evaThemes?.appearanceIndependent ||
    !mascot.autosaveFeedback?.pending ||
    !mascot.autosaveFeedback?.backgroundWrites ||
    !mascot.autosaveFeedback?.completedCheck ||
    !mascot.autosaveFeedback?.smallMutedIcon ||
    !mascot.autosaveFeedback?.reducedMotion ||
    !mascot.autosaveFeedback?.tooltips ||
    !mascot.supportUI?.imageAttachments ||
    !mascot.supportUI?.imageRemoval ||
    !mascot.supportUI?.attachmentLimits ||
    !mascot.supportUI?.attachmentsPreservedOnError ||
    !mascot.supportUI?.inApp ||
    !mascot.supportUI?.preservedOnError ||
    !mascot.supportUI?.balancedToolbar ||
    !mascot.overlayRotation?.simultaneousResize ||
    !mascot.overlayRotation?.breakaway ||
    !mascot.overlayRotation?.uprightSnap ||
    !mascot.overlayRotation?.previewSelection ||
    !mascot.overlayRotation?.activeCursorOnly ||
    !mascot.overlayRotation?.continuousRotation ||
    !mascot.overlayRotation?.undoRedo ||
    !mascot.overlayRotation?.rotatedResize ||
    !mascot.overlayRotation?.reset
  )
    throw Error(
      "Installed theme and overlay rotation acceptance has not passed.",
    );
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
      (n.startsWith(`EditAI-0.2.64-mac-${arch}.`) &&
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
  const sourceName = "EditAI-0.2.64-native-corresponding-source.tar.xz";
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
    "EditAI Desktop 0.2.64 for macOS " +
      arch +
      ". Processing shows smoothly advancing estimated percentages instead of elapsed time and a task counter. Project deletion has larger, equally sized actions. Upload previews can start from a tap before automatic buffering finishes. After installation, EditAI opens without prompting to eject or delete the installer; downloaded installers are left untouched. Existing editor, language, support and privacy features are retained. Signed, notarized and verified in the installed Mac app with native MP4 export. Web: https://editai.it.com. Windows is not included.\n",
  );
  // The draft contains the exact signed ZIP used by macOS CI to assemble the DMG.
  // Keep it private until every release artifact and the installed app pass.
  const draft = JSON.parse(
    github([
      "release",
      "view",
      tag,
      "--repo",
      "tappj/EditAI-Webapp",
      "--json",
      "isDraft,assets",
    ]),
  );
  if (!draft.isDraft)
    throw Error("Expected a private draft release before publication.");
  const zipName = `EditAI-0.2.64-mac-${arch}.zip`;
  const remoteZip = draft.assets.find((asset) => asset.name === zipName);
  if (
    !remoteZip ||
    remoteZip.size !== (await readFile(resolve(dir, zipName))).length
  )
    throw Error("Draft signed ZIP is missing or differs in size.");
  github([
    "release",
    "upload",
    tag,
    ...names.map((n) => resolve(dir, n)),
    "--repo",
    "tappj/EditAI-Webapp",
    "--clobber",
  ]);
  const staged = JSON.parse(
    github([
      "release",
      "view",
      tag,
      "--repo",
      "tappj/EditAI-Webapp",
      "--json",
      "isDraft,assets",
    ]),
  );
  if (
    !staged.isDraft ||
    names.some((name) => !staged.assets.some((asset) => asset.name === name))
  )
    throw Error("Draft release is missing an uploaded artifact.");
  github([
    "release",
    "edit",
    tag,
    "--repo",
    "tappj/EditAI-Webapp",
    "--title",
    "EditAI Desktop 0.2.64",
    "--notes-file",
    notes,
    "--draft=false",
  ]);
  const dmg = names.find((n) => n.endsWith(".dmg"));
  await writeFile(
    "lib/desktop-releases.json",
    JSON.stringify(
      [
        {
          platform: "macos",
          arch,
          version: "0.2.64",
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
