# Verification — November 16, 2026 (local)

Production: https://editai-web.givingarmadillo8.chatgpt.site — Sites version 10, source c23ee3170989c830c0e9f0ff96bda7ab6f8b0fb7, points to the verified rounded-icon v0.2.1 installer. Full workflow regression ran on version 8, source de4c2605c0e449d7df343009aa084bb099d47eaf; deployed Chromium browser smoke checks confirmed the version 9 v0.2.0 link and version 10 v0.2.1 link. Same project, D1/R2 bindings, environment revision, encryption key, session cookie and web Publik identity. Original iOS tree remains unchanged; only the owner's pre-existing untracked handbook PDF is present there.

## Observed results

- TypeScript and web build passed; all 15 existing unit/security tests passed.
- All 12 Chromium and 12 WebKit checks passed **on the deployed version**. These cover the public gate, responsive layouts, upload, split/undo/speed/text, actual MP4 export, reload/deletion persistence, synthetic camera recording/teleprompter, real image/audio compositing, batch, CSRF rejection, resumable Chirp request contract, decoded image references, isolated official popup and blocked-popup fallback. AI/auth fixtures in these regression tests are explicitly isolated; they do not prove live provider behavior or count as users.
- Separate real deployed acceptance used the previously linked ordinary HTTP-only browser session, without route fixtures or authentication bypass. Existing 51 word timestamps and 11 caption layers persisted; private R2 upload/download was byte-identical; a fresh browser restored the project. Real Publik chat applied Warm to a clean starting state; real summary and two-stage editorial selection passed; actual AI-edited MP4 export passed. No browser errors. The synthetic verification project was isolated and removed afterward. A previous run correctly returned no redundant Warm operation on already-Warm footage; the test was corrected to use a nonredundant starting state.
- Desktop normal external-browser Publik sign-in and plan gate passed, with OS-encrypted session persistence. Real native audio extraction → Publik Chirp produced 12 caption phrases. Real desktop AI chat passed. The installed Apple Development-signed native9 app restored those captions and exported the 19-second project in 14.104 s. Its runtime reported sandbox/context isolation enabled, Node integration disabled, GPU video decode/WebGL enabled.
- Local app signature integrity and built-app `publik self-test: ok editai-desktop 0.2.0` passed, including the final scoped bootstrap build. ZIP extraction preserved app signature. Installed size approximately 318 MB. These local builds are not public notarized releases.
- Nine native/telemetry tests passed against the source-built FFmpeg 9.0.2 binaries and again against binaries independently rebuilt from the complete corresponding-source archive. Tests include byte-range media, persistence, native WAV, trim/speed H.264/AAC duration, compositor PNG encoding/audio, cancellation/cleanup, blocked playlists, preservation of external originals, official event schema/foreground gating and opt-out. Telemetry transport is intercepted in the test; no artificial events go to Publik.
- Identical short 480p/30 fps benchmarks: Chromium/native clean export 5.905/0.835 s; Warm+text 5.366/1.847 s. M4 Max, 36 GB, single trials; no universal performance or memory claim.
- GitHub Actions run 43818918929 passed the web build and macOS/Windows jobs. Windows built and installed NSIS, passed native processing and the packaged live Publik self-test, displayed the real anonymous gate and verified renderer isolation. macOS built DMG and verified mounted app signature integrity. Internal unsigned/ad-hoc artifacts were not uploaded or publicly released. Windows signed-in editing and real-user usage attribution are not claimed.
- Gitleaks reported zero source/worktree findings and zero findings over all 18 reachable commits. No environment, signing, private per-user or builder keys were committed. The explicitly public desktop app bootstrap resource is included as required by Publik.
- The Developer ID Application identity and `editai-notary` Keychain profile validated locally. Apple notarized the signed app and macOS accepted it as `Notarized Developer ID`. CI run 43825094383 assembled an HFS+ DMG from the exact signed ZIP in a private draft, verified the app inside and returned only the disk image. The local host signed, notarized and stapled that DMG; `spctl` accepted it. The DMG app archive matched the local ZIP archive byte-for-byte. The app copied from the DMG passed Gatekeeper, real persisted Publik sign-in/project restore, 12 caption layers and a 19-second MP4 export in 13.379 s. The public v0.2.0 release contains the DMG, signed ZIP, updater metadata/blockmap, matching native source and checksums. The private signing key never entered CI.
- The v0.2.0 DMG was refreshed with an EditAI-branded, Retina-ready Finder background, an explicit drag-to-Applications instruction and arrow, and arranged app/Applications icons. CI run 43828773260 built it from the exact unchanged signed ZIP. The mounted image contains `.background.tiff`, `.DS_Store` and the Applications link; its app archive matches the original signed app. Apple accepted the refreshed image for notarization, and Gatekeeper accepted it. An app copied from the refreshed DMG passed persisted Publik sign-in, 12 caption layers and a 19-second MP4 export in 14.876 s. The public release DMG digest matches the locally verified image; SHA256SUMS and release notes were refreshed. Automated Finder window capture was unavailable, so the owner's visual check of the downloaded window remains the final layout check.
- Version 0.2.1 regenerates `icon.icns` with transparent rounded corners from the exact existing scissors artwork; the Windows PNG is unchanged. The bundled icon SHA-256 matched the source icon. Local tests passed (15 web, 9 desktop) and GitHub cross-platform QA run 43833435866 passed. The Developer ID signed app and ZIP passed notarization and Gatekeeper. CI run 43833966075 built the guided DMG from that exact signed ZIP; the DMG was signed, notarized and stapled locally. An app copied from that DMG passed the normal persisted Publik session, 12 caption layers and a 19-second MP4 export in 13.485 s. The public 0.2.1 DMG digest matches the verified local artifact; source and checksums accompany the release.
- The installed 0.2.0 app used its normal File → Check for updates flow against the public 0.2.1 release. It reported a new version, downloaded the signed update ZIP and displayed “An EditAI update is ready.” The test chose Later, so the final restart/install step was not exercised. No synthetic Publik usage events were sent.

Local evidence (ignored, not public credentials): outputs/deployed-chromium-desktop-migration.log, outputs/deployed-webkit-desktop-migration.log, outputs/deployed-real-verification.json, outputs/desktop-live-verification.json, outputs/desktop-benchmark.json, outputs/native-repro.log and redacted Gitleaks reports. Live browser session state and OS vault files remain private and are never committed.

## Remaining release boundaries

The positive signed/notarized macOS arm64 release and post-signing installed acceptance passed. This Mac still forces writable image mounts to read-only, so DMG assembly uses macOS CI from the exact signed ZIP; no unsafe hybrid-image fallback is distributed. A next-version update installation and a public Windows release remain unverified.

The separate desktop listing is held_for_review. Built-binary connectivity and real cloud inference passed; genuine human activity/leaderboard attribution needs Publik review and real user activity. Official docs expose no Google replacement, guaranteed popup return/close, combined listing or repository-edit contract. The existing web listing's old repository reference remains pending a supported Publik update. No web sessions or credits are moved.

Desktop project files/backups are local; automatic web/desktop project sync is not implemented. Native HDR parity, physical camera/microphone permission acceptance and full signed-in Windows editing are not verified. The macOS homepage download is enabled by the verified versioned release metadata; no Windows download is advertised.

## Publik open-source review corrections — November 16, 2026

The owner relayed the judge's approval of separate web and desktop listings and requested the missing open-source materials. Both public submitted repositories, `tappj/EditAI-Studio` and `tappj/EditAI-Webapp`, now have a root MIT `LICENSE`, root `THIRD_PARTY_NOTICES.md`, full applicable GPL texts under `LICENSES/`, and MIT package/lockfile metadata. This MIT grant covers EditAI-authored code; FFmpeg/codecs and other dependencies retain their original terms.

The browser core's installed metadata declares `@ffmpeg/core@0.12.10`, GPL-2.0-or-later. The native FFmpeg 9.0.2 executable's own `-L` output confirms GPL version 3 or later. Root notices distinguish these builds, identify the pinned x264 input, and link the complete matching native source archive already attached to v0.2.1. The existing browser GPL notice/license and desktop FFmpeg license/source provenance are preserved.

`desktop/publik-app-token.txt` was already committed in `aff4c75` and is present in the v0.2.1 tag. It is the explicitly public app-scoped desktop bootstrap resource. Its value was not printed, changed or duplicated; no hosted, per-user or builder credentials were committed. An older queued commit cannot establish that the current release is missing it.

Validation: typecheck, 15 model/security tests and the production web build pass for each repository; desktop build and all nine desktop contract tests pass. Byte comparisons confirm that generated desktop notices and MIT license match the root files; generated desktop package metadata declares MIT. Web-only legacy validation used the existing dependency installation through a temporary local symlink (removed after validation). No native binary was rebuilt, replaced or retagged as part of the review correction.

The signed v0.2.1 release is the target for the updated catalog scan. The root MIT license, third-party notice, full GPLv2/GPLv3 texts and LICENSES-SHA256SUMS.txt were added to that existing public release. GitHub asset IDs, sizes and digests for every original release artifact were verified unchanged. GitHub's license API recognizes both repositories as MIT. Publik's documented existing-listing update path is a GitHub release scan, including the dashboard action “Check GitHub for a new release now”; no undocumented listing mutation or duplicate submission is used. Repository corrections alone do not prove the queued review has been refreshed or accepted.

Both documented derive checks returned HTTP/status 409 `repo_already_listed`, confirming `editai-studio` for `tappj/EditAI-Studio` and `editai-desktop` for `tappj/EditAI-Webapp`. No duplicate listing was submitted. No authenticated Publik dashboard integration was available, so the queued scan was **not** refreshed here. The remaining owner action is to open EditAI Desktop in Publik's signed-in dashboard and choose **Check GitHub for a new release now**, targeting the public v0.2.1 release. Official instructions: https://publikhq.com/skills/publish.md. Judge approval and live listing status remain external.

## Native-sized icon and personal OpenAI station — November 18, 2026

The app installed in /Applications still contained an older icon with visible alpha bounds 28…995 (968px of a 1024px canvas). The repository's correct icon has bounds 100…923 (824px). Desktop 0.2.2 packages that exact icon; the release path now regenerates the ICNS before building. The artwork is unchanged. The old installed bundle is retained under ignored outputs/desktop-icon-install/EditAI-0.2.1-backup.app. /Applications/EditAI.app is now 0.2.2, Developer ID signed, notarized and accepted by Gatekeeper, with the source ICNS byte-identical to its bundled icon. LaunchServices and Dock were refreshed.

The new signed ZIP was used unchanged by GitHub workflow 44466054032 to assemble the guided DMG. App and DMG notarization/stapling, Gatekeeper checks, matching app.asar, matching native source and updater digests pass. The installed 0.2.2 application passed genuine persisted Publik authentication and a 19-second synthetic-video MP4 export in 1.365 seconds. Export-only acceptance intentionally makes no AI request; captions and AI are not claimed newly verified. No API routes or provider responses were mocked for installed acceptance. GitHub Desktop QA run 44465746779 passes web, macOS and Windows jobs.

The personal station uses own_key and has official usage sharing turned off. No OpenAI API key is saved yet. The owner confirmed ChatGPT Pro; activation of any eligible API credit benefit and creation/entry of the API key remain owner account actions. Own-key routing/encryption tests use isolated provider transport and do not prove real OpenAI connectivity. The separate Publik listing review state remains external; no unsupported listing mutation was attempted.

## Shared editor parity source/build — November 19, 2026

Shared editor now runs automatic first cuts on normal uploads, exposes a visible
playhead and source-time drag trim/reorder timeline, adds editable text/overlay/
three-lane audio rows, independent layer playback, preview placement/resize,
image append, audio replacement/mute, project typography and native EditAI media
operations. Home and Edits layouts are unchanged. `npm run desktop:build` and all
11 desktop checks pass. The native compositor test includes primary-muted output
with a 2× overlay and 0.5× audio, real FFmpeg export and audible-level verification.
All 23 shared studio browser cases pass in Chromium and WebKit. These fixtures
are distinct from installed-app real-auth acceptance: no new signed/notarized
installer, updater publication, live account verification or installed-DMG test
was performed for this revision. See ../VERIFICATION.md and ../WEB-PARITY.md.

Account continuity fix: normal sign-out pauses official telemetry and retains the
OS-encrypted Publik install; explicit account switching forgets it. The shared API
invalidates its active bearer while retaining encrypted resume state and saved
account preferences. Matching-owner personal-key settings are restored on local
session recreation. Client sign-out flushes pending timeline edits before closing
its session. Typecheck, all 12 desktop checks and desktop build pass; the additional
real SQLite/bucket/cookie integration check covers original media persistence,
allow/decline consent, revoked sessions/keys and other-account isolation using
fixture provider transport. No new installed-DMG or live account acceptance is
claimed; updated source is being published with the hosted build.

## Guided Mac installation — November 20, 2026 (0.2.3 staged)

Runtime source 8f6a95cb29e653055e7b59f1c60ed5f26c2c5a92 adds an Install and Open prompt for packaged Mac apps outside Applications. Electron's native move API installs and relaunches the installed copy, with explicit conflict/cancel handling. A uniquely identified mounted EditAI DMG matching this app's bundle identifier/version can be ejected; an unchecked option moves that download to Trash only after a successful detach and a second identity check. Keeping it open is remembered per app version. No editing data or account state is involved. Source/dev builds, self-tests, Windows and Linux skip this installer UI. Finder drag/copy cannot execute app code, so the revised DMG background explains double-click to install/open and the manual drag-then-open alternative.

Verified in isolated /tmp/editai-installer-023 to preserve concurrent unrelated workspace edits: typecheck, 24 web unit/security tests, 18 desktop tests, production web and desktop builds. Six new installer tests cover native relaunch handoff, cancellation, path scoping, explicit Trash selection, changed/busy disks and repeat/platform guards. Real hdiutil/plutil discovery recognized the mounted notarized 0.2.3 image and rejected another app version. No actual user download was trashed.

Developer ID app signing, Apple app notarization, stapling and Gatekeeper checks pass. Local writable DMG assembly hits this host's pre-existing read-only mount restriction; GitHub Mac CI run 44708529557 assembled the image from the exact private signed ZIP, checked matching app archive/Applications link/background, and succeeded. The DMG was then signed, notarized, stapled and accepted by Gatekeeper locally. scripts/verify-signed-desktop-release.mjs passes for the app, ZIP, DMG, native corresponding-source archive, packaged Publik self-test and updater metadata. Actual OS installation from the built signed app succeeded; prior /Applications/EditAI.app is preserved under ignored outputs/installer-023-backup/EditAI.app. The installed 0.2.3 app was opened for the owner.

Full installed-app export acceptance is pending the owner's first-run AI privacy choice. The real app reaches “Allow AI processing?”; no consent action was selected on the owner's behalf. The existing release publisher requires successful installed authentication/export acceptance, so v0.2.3 remains a private draft and public download metadata remains 0.2.2. The export-only QA path now preserves the owner's AI/telemetry preferences. No paid inference, fabricated account/activity, production auth bypass or sibling-project change was introduced. Native Install and Open/cleanup dialogs were not driven with OS accessibility automation, which is disabled on this Mac; test coverage for those choices uses injected native-service fixtures, distinct from the actual signed-package and mounted-image checks.

### 0.2.3 public release acceptance — November 20, 2026

After the owner saved their actual first-run privacy choice, the installed Developer ID signed/notarized 0.2.3 app passed genuine Publik account/session restoration, sandbox/context isolation checks, native local-media import, account-scoped project persistence and actual UI MP4 export (1.438 seconds). The earlier synthetic-speech project was no longer in the account, so the export-only QA path created two new synthetic-media batch projects with Run AI editing unchecked, exported one and removed both through the real authenticated project API. No authentication/provider transport fixture, inference call or privacy/telemetry preference change was used. Runtime app archive SHA-256 matches the signed ZIP/DMG verification report; automated activity used DNT and disabled telemetry. Evidence: isolated outputs/desktop-live-verification.json and outputs/desktop-real-export.mp4.

The guarded publisher passed all checks and published v0.2.3 with signed/notarized DMG, ZIP, updater metadata/blockmap, matching native corresponding source and SHA256SUMS. Runtime source remains 8f6a95c, matching the verified installed archive; subsequent website changes are separate source work. Public download metadata now targets the verified 0.2.3 DMG. Installer UI choices retain the coverage limits above; no new claim of OS accessibility automation or an installed-to-next-version updater exercise is made.

## Integrated macOS window header — November 20, 2026 (0.2.4)

Runtime source 00c4ee3 uses Electron hiddenInset and native traffic lights at x16/y18. The preloader opts only the Mac renderer into the shared stylesheet. Home/Settings reserve the sidebar control area; the editor's separate header reserves 104px before its logo/title and keeps its buttons and editable fields outside drag regions. Marketing and onboarding reserve a top safe area. Header backgrounds follow EditAI theme tokens; Windows/Linux retain their native frames and browser pages do not opt in.

In an isolated checkout, typecheck, all 27 web unit/security tests, all 18 desktop tests and both builds pass. The actual Developer ID signed, Apple-notarized, stapled and Gatekeeper-accepted app is installed in Applications, with 0.2.3 preserved under ignored outputs/chrome-024-backup. Real native checks verify full-frame content bounds, the native traffic-light position, minimize/restore and a working Account action. Home headers match the sidebar in light/dark at 1440px and 900px; editor headers are draggable with no-drag controls and logo x104. Captured web-content screenshots were visually inspected in both themes; OS traffic lights are verified by the native window API because web-content screenshots exclude them. Hardware clicks on the native close/fullscreen buttons were not automated.

The installed 0.2.4 app passed genuine signed-in account/session restoration, sandbox/context isolation and actual local MP4 export in 0.812s. The QA helper was updated for the current Split/back labels and waits for Edits before cleanup. It removed 12 synthetic QA projects, including leftovers from earlier checks, through the UI and verified absence after reload; this clears both account data and IndexedDB media/library records. No user project, privacy/telemetry preference, paid inference, credential or authentication boundary was changed. Automated usage used DNT and disabled telemetry. Evidence is under isolated outputs/window-chrome-verification.json, desktop-live-verification.json and desktop-real-export.mp4; public disk-image assembly/publication follows the existing signed release guard.

0.2.4 publication: GitHub Mac assembly run 44712677360 succeeded from the exact signed ZIP (the earlier draft run was superseded before publication). The DMG was then Developer ID signed, Apple-notarized, stapled and accepted by Gatekeeper; the release verifier checks app/ZIP/DMG archive identity, native corresponding source, packaged Publik self-test and updater metadata. Final installed-app acceptance after disk-image verification exported H.264/AAC, 854×480, 19.075s in 1.308s and removed both temporary projects without AI requests or preference changes. The guarded publisher released v0.2.4 with all six expected artifacts; public download metadata now points to the verified 0.2.4 DMG. The updated app is reopened for the owner. No installed-to-next-version updater exercise or physical native-button click automation is claimed.

## Shared header typography and platform label — November 20, 2026 (0.2.5)

Runtime source 1d17c96 restores normal opacity to EditAI Studio by targeting the slash with nth-of-type instead of accidentally dimming the first text span through nth-child. The shared breadcrumb inherits the app font at 14px, with stronger current-page weight; Account uses the normal 13px action typography. Web/Desktop Studio remains a span with no role, tab stop, action or hover treatment. Its compact 12px label uses existing blue, ice and lavender theme tokens, a quiet border and no shadow. Narrow-screen hiding remains unchanged.

Isolated typecheck, all 27 web tests, all 18 desktop tests and both builds pass. Browser visual/geometry checks at 1440/900/390px in light/dark verify the shared font, full-opacity namespace, non-interactive badge semantics, default cursor, static hover appearance and no horizontal overflow. The signed, notarized and Gatekeeper-accepted installed Mac 0.2.5 build passes the equivalent actual desktop checks at 1440/900px, including DESKTOP STUDIO text and a working Account action. Header screenshots were inspected in both themes. Web authentication in the browser presentation checks is fixture-scoped; desktop header checks used the genuine persisted account without provider fixtures, inference or preference changes. Public release follows disk-image and installed-export acceptance.

0.2.5 publication: Mac disk-image assembly run 44716135951 succeeded from the exact signed ZIP. The DMG passed Developer ID signing, Apple notarization, stapling and Gatekeeper; the release verifier confirmed matching app/ZIP/DMG archive identity, native corresponding source, updater metadata and packaged Publik self-test. After these checks the installed app passed genuine account restoration and MP4 export in 1.319s, with both synthetic projects removed and no inference or preference changes. The guarded publisher released v0.2.5 and public download metadata now targets its verified DMG. Runtime source is 1d17c96; the shared header changes are applied to both web and native assets. Other subsequently committed web editor work is a separate runtime snapshot. The installed app is reopened for the owner.

## Shared inspector and slider controls — November 20, 2026

The shared Electron renderer includes Filter/Adjust/opacity consolidation, timeline
Crop/Overlays actions, editable numeric drafts, 0–100 volume/opacity, fixed speed x,
magnetic dragging and tapered speed/volume tracks. Typecheck, 30 web unit/model/
security tests, 18 desktop tests and both builds pass. All 35 shared studio browser
scenarios pass across the full runs plus the corrected Chromium trim/export rerun;
see docs/VERIFICATION.md for exact evidence and fixture boundaries. Existing native
FFmpeg extraction/export tests pass. No new signed installer is published here.

## Portrait capture and focused shared panels — November 20, 2026

The shared renderer now includes Auto-only word grouping, full-cell EditAI styling,
image/video reference thumbnails, relaxed-cut source-restoration instructions,
portrait media cards, persistent Edits grid/list views, Clip canvas controls and
compact nonmodal progress/notifications. Recording defaults to 9:16; its 1:1, 16:9
and 4:5 alternatives crop the actual canvas capture and preserve microphone audio.
Cleanup releases camera/capture tracks and animation frames. Desktop source/build,
all 18 native contracts, 31 web tests and typecheck pass. Shared browser scenarios
all pass across the full WebKit run and Chromium run/reruns described in
../VERIFICATION.md. Generated camera/audio fixtures establish encoded dimensions,
not physical camera permission acceptance or fresh Publik connectivity. This commit
does not publish a replacement signed installer.

## Current shared editor released as 0.2.6 — November 20, 2026

Owner explicitly requested live browser and installed desktop updates, superseding
the prior source-only publication boundary. Runtime source 8995cc151679b13ea6b54827ea8f655da296572b
includes all inspector/slider, portrait media/recording, caption-panel, reference,
notification and shared-header changes. Version-pinned build/release/self-test/CI
contracts now agree on 0.2.6. Typecheck, 31 web tests, 18 desktop tests and both
production builds pass.

The app is Developer ID signed, Apple-notarized, stapled and Gatekeeper accepted.
Mac CI run 44802417785 assembled the guided DMG from the exact draft signed ZIP
SHA-256 31d407a7ec5f3026f37a585196b07911e413a166b04d22503eb1af58cf81d7a4.
The resulting DMG is also signed, Apple-notarized, stapled and Gatekeeper accepted.
The final verifier checks source provenance, app/ZIP/DMG archive identity, packaged
Publik self-test and updater hashes. Installed /Applications/EditAI.app has the
same archive; 0.2.5 is preserved under outputs/release026-backup/EditAI.app.

After final disk-image verification, the installed 0.2.6 app passed genuine existing
Publik session restoration, the actual new editor controls, real source thumbnails,
and native H.264/AAC export: 854×480, 19.075 seconds, rendered in 1.33 seconds.
The acceptance helper now waits specifically for the export notification because
nonmodal progress and earlier status messages may coexist. It also has opt-in UI
checks for this release, and does not print the official sign-in claim URL. No
provider/auth fixture or inference request was used in installed acceptance. Privacy
and telemetry preferences were preserved; DNT/disabled telemetry excludes automated
engagement. Two final synthetic batch projects were removed through the real UI;
prior acceptance's temporary projects were also cleaned up.

The guarded publisher released v0.2.6 with the signed/notarized DMG, ZIP, ZIP blockmap,
latest-mac.yml, matching native corresponding source and SHA256SUMS. Download metadata
now targets that verified release. Public URL:
https://github.com/tappj/EditAI-Webapp/releases/tag/v0.2.6.
Existing supported macOS arm64 distribution is updated; no new Windows distribution
is introduced. Updater metadata is published, but a prior-version auto-update
installation is not claimed exercised here.

## Shared control corrections — 0.2.7 pending Apple credentials

Runtime source 57678d019fd66481778134d67c8a584bb1c13635 restores Overlays/Adjust
rail actions, Volume-before-Speed, straight Speed/accurately aligned ticks, compact
square Edits and Home-only upload. Shared web version 92 is live. Typecheck, 31 web
unit/security/model tests, 18 desktop tests, both builds, all 38 Chromium scenarios
and the four affected WebKit scenarios pass; public-domain focused checks also pass.
The 0.2.7 Developer ID app passes deep/strict signature verification and its packaged
Publik self-test. The real installed acceptance helper now checks the restored
shortcuts and playback ordering, ready for the new installed release.

Apple notarization is blocked by a missing editai-notary Keychain profile, confirmed
both through the default and explicit login Keychain paths. The owner has been
asked to restore the profile securely or identify its replacement. The signed app
and submission ZIP are staged, and v0.2.7 is a private draft (release ID 453120264).
No new signed/notarized installer is published, no verification report is fabricated,
and the verified 0.2.6 installed app/download/update metadata remains intact. Once
the profile is restored, notarize/staple the staged app, package its ZIP/blockmap,
assemble and notarize its matching DMG, verify archives/native source/updater
metadata, install with the prior app preserved, run real export-only/UI acceptance,
then use the guarded publisher and update the live homepage download metadata.


## Resolved 0.2.7 notarization and current blue editor — November 20, 2026

The editai-notary Keychain profile is available again. Rebuild the pending 0.2.7
from current shared runtime 9f49c95dd01492225229a356c36bc6bf3b7877a9, including
the prior shortcut/slider corrections and compact media, integer Volume, permanent
unused-source deletion, track-aware drop previews and blue feature/editor accents.
Typecheck, 33 web unit/model/security tests, 18 native contracts and both production
builds pass. Full Chromium passes 39/39 and affected WebKit passes 4/4. See the
shared verification document for browser fixture boundaries and implementation details.

Developer ID app is Apple-notarized, stapled and Gatekeeper accepted. Mac CI run
44841429707 assembled the guided DMG from signed ZIP SHA-256
1c0e79698858c3220c1dfca5d1401c00820b71169028d186202afe3961bcdfaf.
The DMG was signed, Apple-notarized (Accepted), stapled and Gatekeeper accepted.
Its final SHA-256 is 612c43c84e518d6bd64b2b60640df80df3f12fe1759afc9b8f776b5b17e547d4.
Final verifier confirms app/ZIP/mounted-DMG archive identity, corresponding native
source, packaged Publik self-test and updater hashes. Installed /Applications/EditAI.app
matches the archive; prior 0.2.6 is preserved in outputs/release027-blue-backup/EditAI.app.

After final DMG verification, actual installed 0.2.7 acceptance passed existing genuine
Publik session restoration, shared control checks, integer Volume, blue surfaces,
real source thumbnails, second-clip removal and permanent unused-media deletion.
A native H.264/AAC export of the remaining 19.075-second source completed in 0.821
seconds. No provider/auth fixtures or external AI requests were used. DNT/disabled
telemetry excluded automated engagement; privacy preferences were preserved. Both
synthetic batch projects were removed. This proves session restoration and native
export, not new real AI quality or a fresh sign-in flow.

Guarded publisher released v0.2.7 with signed/notarized DMG and ZIP, ZIP blockmap,
latest-mac.yml, matching native corresponding source and SHA256SUMS. Public release:
https://github.com/tappj/EditAI-Webapp/releases/tag/v0.2.7. Download metadata now
targets this verified release. Existing macOS arm64 distribution is updated; no
Windows release or prior-version updater installation is claimed tested.


## Original palette replacement — November 20, 2026

The 0.2.8 light-illustration correction finished publication before the owner's
interruption, but its download metadata was not activated on the live site before
the new palette request. Owner rejects the broader blue-accent trial. Runtime
1a3857d2acfafbfd58b0489caadd7d34fd1eb9f5 restores original feature/editor tokens,
card colors, premium gradient, lavender drag ghosts and editor icon colors. Only
the film illustration adapts in dark mode, using the original cards' cyan/lavender;
light film artwork is unchanged. Functional editor refinements remain. Version-
pinned build, CI, native self-test and guarded release contracts advance to 0.2.9.

All required source checks/builds pass. Chromium's existing compact-media regression
passes with original color expectations; Chromium and WebKit manual theme checks
pass. Captures verify the original light artwork and original dark feature palette.
The Developer ID 0.2.9 app is Apple-notarized, stapled, Gatekeeper accepted and
installed under /Applications/EditAI.app. Previous app is preserved under
outputs/release029-backup/EditAI.app. Guided-installer CI run is 44846597802.

Final DMG is signed, Apple-notarized, stapled and Gatekeeper accepted. SHA-256:
13510277bda8045193714b7d7ba5a9f0362f3d9334aa705eed8789743d8c7d51.
The final verifier checks mounted-app identity against the ZIP and installed app,
native corresponding source, packaged Publik self-test and updater hashes. Installed
acceptance initially encountered an already-running app, then correctly rejected
the old blue-gradient expectation. The acceptance helper now expects the restored
original gradient. A clean rerun passes genuine existing-session restoration,
shared UI/media-removal checks and real H.264/AAC export in 1.322 seconds. Four
synthetic QA projects (including the interrupted check's pair) were cleaned up
through the real UI. No user project was removed. No auth/provider fixture or
external AI request was used; automation telemetry remained disabled.

Guarded publisher released v0.2.9 with verified DMG, ZIP/blockmap, latest-mac.yml,
corresponding native source and SHA256SUMS. Homepage metadata now targets this
release. macOS arm64 only; no Windows release or prior-version auto-update
installation is claimed tested.


## Compact bottom-right notifications — November 20, 2026

Runtime source 975d224e6437c3dd0c115b5d8a4d655b9d874ac3 gives Home, Settings
and the editor a shared bottom-right notification stack. Short messages fit their
content; longer messages wrap within a bounded width. Leading icons, text and
fixed 24px close buttons align in a grid. Legacy editor/mobile position overrides
are removed. Existing colors, status/alert roles, cancellation and error links stay
intact. All required checks/builds pass; Chromium regression scenarios pass 3/3.
Manual Chromium/WebKit visual fixtures cover both themes, 1280px/390px viewports,
actual profile saving/dismissal and progress/error stacking without overflow.
Browser fixture checks do not prove real provider connectivity.

0.2.10 Developer ID app is Apple-notarized, stapled, Gatekeeper accepted and installed
at /Applications/EditAI.app. Prior app is preserved at outputs/release0210-backup/EditAI.app.
Mac installer CI run 44848097419 assembles the matching guided DMG from the signed ZIP.

Final DMG SHA-256: 18f72891994d781bd9fd31b736e000f2226d3f60e71cc1f31f0563f26db8a28d.
Apple accepted the signed installer; staple/Gatekeeper checks pass. Final verifier
confirms mounted-app/ZIP identity, corresponding native source, packaged Publik
self-test and updater hashes. Installed 0.2.10 acceptance passed existing genuine
Publik session restoration, shared UI/media-removal checks and real native H.264/AAC
export in 0.821 seconds. All 2 synthetic projects were removed. No provider/auth
fixture or external AI request was used; automated telemetry remained disabled.
Guarded publisher released v0.2.10 with DMG, ZIP/blockmap, latest-mac.yml, corresponding
native source and SHA256SUMS. Homepage metadata targets this verified macOS arm64
release. No Windows release or prior-version update installation is claimed tested.

## Automatic Settings and scoped themes — November 20, 2026

Shared runtime 24d08a8f15db3c546ef05503712ca33c71886ece includes General's
name/photo controls and automatic saves, separate appearance and eight scoped
brand themes, native dark contrasts, compact Home download/copy, no Privacy & data
footer, bottom media controls without plus/In edit badges and a filled blue
selected EditAI sparkle. Autosave preserves in-flight name edits, asynchronous
photo/name changes and provider switches. Existing auth/AI/editor contracts remain.

Typecheck, 33 web tests, 18 desktop contracts and both production builds pass.
The full Chromium suite passed 40/40 before final refinements; final affected
own-key/media/autosave/theme/provider/photo checks pass 3/3 per engine. Browser
checks use explicit auth/provider fixtures and do not prove new Publik connectivity.

0.2.11 Developer ID app and guided DMG are Apple-notarized, stapled and Gatekeeper
accepted. Installer CI run 44855399095 assembled the matching DMG from signed ZIP
SHA-256 f16e7f9b3790b05d6c000aa4038cb08ffe3eb4a2137d6b328e7fb0138323afbf.
Final DMG SHA-256 dd33060cf555b276ab1dca1324c718e7adbef3786d3acdced50cb1d127a0940c.
Verifier confirms mounted-DMG/ZIP/archive identity, corresponding native source,
packaged Publik self-test and updater metadata. App archive SHA-256:
bb0c16632c94fe9a14e5e1d1b052c6b2338bb82dddc6b3baae478c5bb0bbaef2.

Installed /Applications/EditAI.app matches the verified archive; previous app is
preserved at outputs/release0211-backup/EditAI.app. Real installed acceptance
restored the genuine existing session, inspected General/appearance/theme controls,
verified media control placement and selected blue sparkle, removed unused media,
and exported actual H.264/AAC in 0.824 seconds. Both synthetic projects were removed.
AI inference was not exercised; privacy choices were preserved and automated
telemetry was disabled. No authentication/provider fixture was used in this acceptance.

Guarded publisher released v0.2.11 with DMG, ZIP/blockmap, latest-mac.yml,
corresponding native source and SHA256SUMS. Download manifest now targets the
verified release. macOS arm64 only; no Windows release or prior-version automatic
update installation is claimed tested.
