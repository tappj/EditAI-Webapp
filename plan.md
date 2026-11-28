# EditAI Web execution record

Source: ../EditAI/EditAI. Independent repository tappj/EditAI-Webapp, branch codex/desktop-migration. Preserve original iOS and private tappj/editai-web marketing projects.

## Architecture

React/TypeScript with Vinext App Router, Cloudflare Worker via Sites; D1/R2 for authenticated data. Browser FFmpeg worker for extraction and MP4 export, IndexedDB media/drafts. Nondestructive source-anchored timeline shared by preview/export/AI/captions. Server-only Publik credentials, per-visitor install identity/wallet and HTTP-only sessions. Port existing pure editorial/summary algorithms; do not bypass existing Supabase/iOS entitlements.

## Tasks

- [x] Audit iOS features/design/algorithms, fellowship handbook and Publik docs.
- [x] Create independent project and hosting identity; preserve older projects.
- [x] Approve hosted-web listing, device authorization, mint server token (catalog held for Publik review).
- [x] Multi-source import, recording/teleprompter, batch, persistent library.
- [x] Timeline split/trim/reorder/duplicate/delete, speed/volume, crop/filters/history.
- [x] Captions/text, video/image overlays, audio lanes.
- [x] Publik transcription, full-recording editorial selection, summary, editor chat (real provider tests passed).
- [x] Matching playback and MP4 export.
- [x] Settings/profile/consent/privacy/deletion and resilient errors.
- [x] Algorithm/security tests; real browser upload/edit/export and AI tests (see verification boundaries).
- [x] Deploy the independent web app and document parity/validation.
- [x] Publish final integration fixes and pass the public deployment regression suite.
- [ ] Publik catalog review (external).

## Fellowship

Nov 9–Dec 15, 2026. Sunday check-ins Nov 15/22/29, Dec 6/13; no automation requested. WAU requires 25 min in a day or use on two days. Owner/bot/extra-account use excluded. Compute is eligible paying-user spend. Only official app_opened/active_session telemetry during actual use. Credits expire Dec 31; wallet must confirm available grants.

## Constraints

Publik checklist and browser approvals mandatory before integration/publication. Hosted web has no binary release and requires sign-in gate before application. Browser exports cannot promise AVFoundation HDR/VFR fidelity; measure memory limits. Apple IAP/DeviceCheck/Photos/camera torch require web alternatives. Domain purchase requires approval. No functionality claimed complete until verified.

## Validation

TypeScript and production builds pass; fifteen model/security tests and nine fixture browser tests. Actual H.264/AAC export inspected with FFprobe. Live hosted app and database deployed; the original nine browser checks pass on public version 3, and the expanded ten-check suite covers browser-reload recovery and deletion. All ten checks pass against the public deployment in both Chromium and WebKit. Real linked Publik chat returned 200; Chirp returned 51 timed words. Real backend browser authentication/consent/transcription/captions/chat and real server summary/editorial review pass. The real public authenticated workflow now passes, including R2 source backup/restore, chat, summary, editorial review and final MP4 export. Google upload CORS is handled with a bounded authenticated streaming proxy. WebKit Blob storage falls back to bounded ArrayBuffer chunks, and inspector scrolling is corrected. See docs/VERIFICATION.md and docs/WEB-PARITY.md for evidence and limits.

## Outstanding

- Publik catalog is held for their review.
- No domain purchased: editai.com is registered; geteditai.com is a candidate pending registrar confirmation.
- Physical camera/microphone permissions and actual Safari/iPhone device checks remain manual; WebKit engine checks pass.
- Publik wallets without a public account identifier use verified linked-key storage scope, disclosed in Settings; cross-browser account sync cannot be promised for these accounts.

## Webapp migration and desktop release — November 16, 2026

Primary source migrated with complete web history to tappj/EditAI-Webapp, branch codex/desktop-migration. iOS is unchanged; main was not pushed. Shared Electron/native FFmpeg desktop editor, encrypted Publik sessions, official separate registration, popup/recovery onboarding, benchmarks and guarded GitHub release/update tools are implemented. Production web version 8 and 24 deployed browser checks plus real AI/restore/export acceptance passed. Developer ID signed/notarized macOS arm64 v0.2.1 passed installed-DMG acceptance and was published with a rounded app icon, guided installer, matching native source and updater metadata. See docs/desktop/VERIFICATION.md for exact evidence and remaining limits. No unsigned download is advertised. Existing web listing repository migration and desktop catalog review need Publik's supported process. Desktop backups are local and automatic cross-device project synchronization remains unimplemented.

## Marketing reference implementation — November 16, 2026

Implemented the supplied master prompt's complete public section sequence and sign-in adaptation in this repository. Reviewed every local reference PNG and original-resolution animation samples; independently recreated the airy blue layout, cursor/glyph field, card loops, icon ribbon, media lifecycle, interactive plan preview, FAQ, availability and footer. Existing editor, official Publik gate, signed downloads and native contracts remain preserved. iOS is coming soon. Real reviews/videos/metrics/prices are intentionally pending in the typed marketing manifest rather than fabricated. See `docs/MARKETING.md` for owner handoff, `REFERENCE_AUDIT.md` for references and `docs/VERIFICATION.md` for exact build/browser/desktop results and the Chromium export flake. Local-only; no publishing, push or merge.

## Superseding marketing design — November 16, 2026

The owner removed the previous metric/award/profile block and replaced the visual references with `Website resources/cutai new`. Only the old seven-feature/ribbon section is retained, restyled. All ten new images were inspected; eight depict the new site and two unrelated food-menu examples are excluded. The exact owner scissors image now supplies the website logo and favicon. The new site uses a flat cool-gray/cyan layout, four-step workflow, creator media slots, factual workflow comparison, explicitly hypothetical user-input estimate, three-card pricing, categorized FAQ and graphic footer. Original auth/editor/native functionality and truthful pending content remain preserved. Validation and publication evidence follow in `docs/VERIFICATION.md`.

- Owner palette/footer refinement: preserve the deliberately cropped footer wordmark at a smaller 220px desktop cap / 20vw mobile size. Marketing accents now complement the original blue/lavender/blush app icon, including CTAs, headings, icons, previews, chart, pricing and sign-in presentation. Typecheck, 15 unit/security tests, build and seven marketing checks in both Chromium and WebKit pass; desktop/mobile visuals inspected. Details in `docs/VERIFICATION.md`.

- Primary marketing accent updated to the existing EditAI editor blues (`#598fd9`, `#326ab4`, `#c4e0ff`) per owner request; smaller cropped footer retained. Typecheck, 15 model/security tests, build and marketing browser checks in Chromium/WebKit pass. See `docs/VERIFICATION.md`.

- Superseding owner screenshot: match its bright cyan palette exactly, including solid primary buttons and glow, highlighted headline and cool pale background. Browser-rendered reference and implementation both sample `#11e9fb`; editor/auth and cropped footer retained. Typecheck, 15 model/security tests, build and seven marketing checks in both engines pass; evidence in `docs/VERIFICATION.md`.

- Added the verified Mac installer directly to the marketing hero, including architecture/version and existing mobile/iPad gating. Wordmark AI text uses the same bright cyan as the headline. Typecheck, 15 model/security tests, production build and 11 targeted cases per browser engine pass; actual DMG HEAD resolves to HTTP 200. See `docs/VERIFICATION.md`.

- Superseding native EditAI theme: read exact logo/premium/action gradients and four individual tile colors from the requested iOS source without modifying it. Apply mixed gradients to wordmark/key titles/actions and individual pastels to features. Rebuilt calculator with an accessible moving tick ruler and synchronized interruptible chart/count animation; retained explicit hypothetical assumptions. Restored pointer-driven Codex glyph atmosphere only in the hero, with reduced-motion/touch/visibility/cleanup handling. Typecheck, 15 unit/security tests, build, both full 28-case engine regressions and final 12-case marketing/media checks pass. See `docs/VERIFICATION.md`.

- Cursor correction: re-reviewed the complete Codex movie and documented each movement/fade phase. Replaced radial/idle glyph emission with an actual-path, narrow grid streak that fades in place over 720ms and stops its rAF loop when empty. A stationary/jitter regression verifies exact zero canvas pixels and zero pending frames, narrow geometry, resume and leave behavior. Typecheck, 15 model/security tests, build and 13 marketing/media cases in each browser pass. See `docs/VERIFICATION.md` and `REFERENCE_AUDIT.md`.

- Hero/comparison refinement: paired rounded availability badges, laptop icon, equally sized web/Mac buttons, demo link underneath, ombre decorative stars, persistent AI first-cut highlight and transparent-at-top/frosted-on-scroll header. Removed metadata/showcase pending copy. Raised the EditAI comparison column and adopted applicable DIY/editor wording while keeping authentic pricing pending. Simplified graph to Without EditAI / EditAI Users with back-every-week/month labels and content-configured assumptions; removed legend and adjustment disclosure. Typecheck, 15 model/security tests, build and full 31-case suites in Chromium/WebKit pass; visuals inspected. See `docs/VERIFICATION.md`.

- Authentic workflow integration: publish unchanged owner PNGs for Upload → Send → AI Edit → Export, preserving full-frame 1170×2532 proportions and highlighting AI Edit through gradient text only. Reproduced the live disappearing-card bug and moved reveal completion into data-revealed so React selection changes cannot reset it; pricing shares the fix. Typecheck, 15 model/security tests, build and full 33-case Chromium/WebKit suites pass. See docs/VERIFICATION.md.

- Owner savings badge: four unchanged supplied portraits with circular framing/overlap and fixed “saved 250+ hours of editing” copy. Desktop/mobile visuals inspected; typecheck, 15 model/security tests, build and 17 marketing/media cases in each browser engine pass. Kept on codex/desktop-migration under the latest owner-supplied branch restriction; main and deployment unchanged. See docs/VERIFICATION.md.

- Updated the hero to “edited videos in minutes.” and review-placeholder footers to “Reviews coming soon.” Required checks and targeted Chromium/WebKit layout/responsive checks pass; retained codex/desktop-migration only.

- Web/desktop fellowship pricing now presents the free editor plus Publik plans or a personal OpenAI API key, separately from iOS subscriptions. Personal-key save selects and persists its provider; missing-key sessions open secure Settings. Typecheck, 15 web tests, 10 desktop tests, both builds and four targeted browser checks per engine pass. See docs/VERIFICATION.md and docs/desktop/PERSONAL-TESTING.md.

- November 19: shortened shared web/desktop onboarding to eight steps, beginning with EditAI's existing questions. Adopted light raised choices, native palette accents, segmented progress, selection/press feedback and directional transitions from the supplied onboarding reference. Preserve choice sizes, saved answers, monthly estimate and official Publik gate; migrate old demo drafts. Required web/desktop checks, six targeted browser cases per engine and fixture desktop-gate acceptance pass. Hardware haptics depend on device support; public desktop installer remains 0.2.2. See docs/VERIFICATION.md.
- Owner correction: restored the pre-CutAI EditAI icon tiles and onboarding styling while retaining the segmented progress bar and shortened eight-step flow. Required checks, both builds, two onboarding checks per browser and desktop fixture handoff pass.

## Editor suite interaction parity — November 19, 2026

Read-only audit of current native editor views/session/timeline/chat and caption
contracts; implement the shared web/Electron automatic upload-to-first-cut flow,
visible time-scaled playhead/thumbnail strip, grouped source-bound drag trims,
reordering/zoom, real text/overlay/three-lane audio tracks, canvas manipulation,
main-track images, native move-to-overlay behavior, audio replacement/mute,
project typography scope and request-based EditAI media operations. Home and
Edits layouts remain unchanged. Unsafe AI changes fail atomically and source word
IDs/original media remain stable. Error/cancellation/declined-consent paths retain
manual editing. Typecheck, 21 unit/security tests, 11 desktop checks, both builds
and all 23 studio checks in each of Chromium/WebKit pass, including actual
browser MP4 export and retimed native layer-audio mixing. See docs/WEB-PARITY.md
and docs/VERIFICATION.md for mapping, evidence and limits. Local branch only;
fixture AI/auth does not prove fresh provider connectivity, and no hosted or
signed installer release was published.

## Account continuity and publication — November 19, 2026

Owner authorized committing/pushing all pending work and updating the live site.
Fixed destructive install rotation on normal sign-out: retain an encrypted
connection separately from the invalidated active session and explicitly verify
Publik on resume. Preserve allow/decline consent, the verified library owner,
source bytes and last edits; cancel stale account sync. Desktop retains its OS
vault connection until explicit switching. Real SQLite/bucket/cookie tests pass
with provider fixtures; all 12 desktop checks, 21 web tests and both builds pass.
All 24 studio scenarios have passed in Chromium/WebKit, with the final two
sign-out checks repeated after the final edit-flush change. Previously deleted
handle-less install identities are not automatically merged or claimed recovered.
Includes all prior uncommitted editor parity work. Publication evidence follows
in docs/VERIFICATION.md.

## Reference editor workspace — November 19, 2026

Reformat the editor using the supplied studio references: compact project header,
thumbnail source library and tool rail, central preview, right-hand clip/text/layer
inspector, and full-width timeline. Keep EditAI components and its light pastel
palette. Home and Edits layouts remain unchanged. Source search/filter/import and
append actions use real project media; captions share sequential timeline lanes,
with numbered inspector rows and expandable typography controls. Add track labels,
zoom controls and real decoded waveforms without changing source anchors or AI
validation. Shared web/desktop source builds include this workspace; a new signed
desktop installer is outside this publication. See docs/VERIFICATION.md.

## Editor surface corrections — November 19, 2026

Preserve portrait thumbnail proportions during frame encoding and fill video/overlay
strips with media. Remove video waveforms, duplicated tool actions, jump/reorder
arrows, timeline zoom controls, redundant caption rows/timestamps and the AI recut
button. Keep pinch zoom, separate Auto captions from manual Text, add real font and
style previews, curved undo/redo, hover descriptions and a compact help guide.
Extract audio creates a saved WAV source for the selected trimmed clip, preserving
speed/placement/volume on a separate audio lane while muting its video. Audio peaks
extend upward from a single baseline. Flush project state before leaving the editor
so returning immediately to My creations cannot reopen an older edit. Normalize
Shift+Z for keyboard redo. Home and Edits appearance remain unchanged.

## Direct media editing — November 20, 2026

Add Delete/Backspace for selected timeline items with typing/modal guards and the
existing final-clip safety rule. Library media and real desktop files can be dropped
onto timeline rows; validate placement, insert at clip boundaries and preserve source
word IDs. Reordering lifts a named thumbnail ghost with an insertion marker, commits
only on an inside drop and cancels outside. Trims mask a source-wide fixed filmstrip
and close the gap on release. Share bounded, higher-resolution thumbnail samples
across cuts. Drive the playhead transform directly on animation frames, including
scrubbing, while keeping the app's text-time updates throttled. Apply logo-colored
EditAI background, one-line Captions with a sparkle badge, Text inspector title,
file sizes, and remove library notes/separators and the timeline options bar.

## Text and precision controls — November 20, 2026

Render trim handles only for selected items and remove the PREVIEW label. Edit text
directly on the canvas; replace the round resize dot with compact corner/edge grips,
persist text box height and width, and honor vertical fit during preview/export.
Extract clip sound immediately through a source-range reference, retaining speed,
volume and atomic undo while muting the original clip. No media job or blocking UI
is needed. Increase waveform resolution and adapt its detail to zoom. Clicking the
timeline moves the playhead, while only its cap captures dragging. Notifications
expire automatically. Enforce bounded concurrent track allocation (audio 3, text 7,
video overlays 7), retaining collision stops and deliberate continued-drag behavior.
- November 20: implemented and pushed guided Mac Install and Open with native relaunch, explicit existing-app handling and optional matching-DMG eject/Trash cleanup. Isolated required checks and signed/notarized 0.2.3 app/image verification pass; installed app is open for the owner's first-run privacy choice. Private release staged; public download stays 0.2.2 until installed-app export acceptance passes. See docs/desktop/VERIFICATION.md.

## Selected inspector and manual crop — November 20, 2026

Use Clip, Text and Filter inspector tabs; remove Layers and inspect only the selected
media item. Keep opacity in Clip, place Extract audio below Volume, and label the
feature-bar caption tool Auto without a sparkle. Provide actual selected-source
filter previews, compact section resets, and focused/hovered slider R resets recorded
only in Help. Account for the sticky tab height when navigating to section headings
at every viewport. Crop media directly with edge/corner handles and pinch; preserve
source crop coordinates through rotations/flips. Overlay corners scale and sides
stretch independently, with matching preview/export geometry. Keep Home/Edits intact.

## Inline voice recording and toolbar — November 20, 2026

Remove redundant Add media action. Keep undo/redo and microphone at the left of the
timeline toolbar, split/duplicate/delete at the right. Center the project title with
a clickable pencil/title that opens a rename field; use My Edits for the back link.
Record default-device microphone audio only on user request, display a red recording
indicator, and stop/release tracks on stop, duration limit or editor exit. Decode the
real recording into seekable mono PCM WAV and import at its starting cursor position
through normal persistent source storage and undo. Use current edits when the take
finishes. Raise audio lanes to seven consistently across UI, placement, validation,
gestures and AI contracts, while preserving atomic rejection of an eighth lane.

## Precision sliders, text controls and copy/paste — November 20, 2026

Keep Adjust and its reset icon on one row. Use slim slider rails and rounded vertical
thumbs, subtle major/minor marks, free precision movement and exact numeric values.
Snap near major marks only on release; Alt bypasses snapping. Preserve speed/volume
steps and R resets. Empty new text displays Text as a placeholder, so initial typing
replaces it. Label entry/exit animations with live visual samples and offer full RGB
pickers/hex entry for text, outline, background and shadow. Copy/paste selected video,
text, overlays and audio at the cursor with Ctrl/Cmd+C/V, preserving native typing
shortcuts and undo. Fit text to video duration, remove wholly stray text on reopening
or shortening, and delete text deliberately dropped into the timeline void. Keep
other items bounded by video duration and preserve cancel-on-outside drops.

## Timeline track order — November 20, 2026

Display overlay tracks above the main video and captions/text below it, followed by
audio. Preserve existing clip data, timing, lane allocation and editing behavior.

## Shared inspector and slider controls — November 20, 2026

Owner supersedes the earlier main-push restriction: commit and push completed
changes to main. Remove Adjust/Filters/Overlays from the left rail; Filter now
contains adjustments and percentage opacity. Overlay media and direct crop open
from the timeline toolbar beside Split/Duplicate. Opening overlay media preserves
the inspector; keep an empty overlay lane available so source cards can be dragged
to either overlays or main video independently of the library mode. Remove Precision
trim. Numeric slider fields accept temporary blank drafts and validate on blur or
Enter, reverting invalid entries and cancelling with Escape. Volume/opacity display
0–100, speed has a fixed x prefix, and values display at most two decimals while
retaining exact typed precision. Dragging attracts to major/neutral marks within
nine pixels, with Alt bypass. Speed/volume use tapered symmetric wedge tracks.
Suppress the inner search focus ring while retaining whole-field border feedback.
Shared web/Electron code and builds are updated; installer/public deployment status
and verification evidence are recorded in docs/VERIFICATION.md.

## Portrait media and focused editor panels — November 20, 2026

Keep six/four/single-word grouping exclusively in Auto captions and preserve the
selected grouping during generation. Remove the nested Auto card surface, darken
only the text-add plus, and fill the entire EditAI rail cell with its native pastel
gradient without a blue selected border. Style references accept images/videos
only and display an actual decoded frame thumbnail. Quick prompts are Add captions,
Give it a warmer look, and Make the cuts more relaxed; chat instructions explicitly
restore natural pacing from original source ranges through existing atomic tools.

Use 4:5 source/project previews with the full media frame visible. Match the native
Edits grid/list toggle and retain the choice locally. Recording defaults to 9:16;
its selector also offers square, landscape and 4:5. A canvas crops the actual saved
recording to the chosen shape and preserves microphone audio; completed takes have
real previews. Move aspect ratio/framing into Clip's Canvas settings and leave
preview expansion at the left of the monitor controls.

Reserve progress dialogs for AI work. Other operations expose compact cancellable
status/progress in the bottom-left notification stack; profile saves use the same
small temporary feedback. Media import resolves against the latest project document
after decoding so simultaneous manual edits survive. Release camera/capture tracks,
frame loops and thumbnail URLs on completion/unmount. See docs/VERIFICATION.md for
browser, native/build evidence and provider/release boundaries.

## Live shared editor and desktop 0.2.6 — November 20, 2026

Owner requests actual publication and installed updates, beyond source pushes.
Publish the current shared editor to the existing public Site at editai.it.com;
Chromium/WebKit hosted checks pass. Build/sign/notarize/staple the 0.2.6 app and
matching guided DMG, verify archive/native-source/updater identity, install it with
the prior app preserved, and pass real existing-session UI/thumbnail/export acceptance
without inference or consent/telemetry changes. Guarded GitHub publication succeeds;
update the homepage download manifest and publish it. Keep both main and the working
branch pushed. Detailed evidence and remaining platform limits are recorded in
both verification documents.

## Shared platform corrections and compact Edits — November 20, 2026

Treat requests for web or desktop as shared changes unless explicitly limited.
Restore Overlays to the top-left rail and Adjust as a shortcut into Filter's Adjust
section; keep Filter off the rail and Crop on the timeline toolbar. Remove the
redundant toolbar Overlays action. Preserve the left library/chat when using the
Adjust shortcut and inspect primary media if audio was selected.

Place Volume before Speed. Only Volume has the tapered track; Speed uses a straight
rail. Rails, fill boundaries and centered ticks explicitly span the native thumb's
usable travel (input width minus its eight-pixel thumb), with shared half-thumb
insets. Native range values retain exact typed precision; keyboard stepping remains
bounded and pointer snapping uses the same usable width. Use compact square Edits
thumbnails in bounded 176px desktop cards and three columns on phones, with square
list thumbnails and accessible over-image actions. Remove Upload clips from Edits;
Home import remains available. Prepare/publish matching 0.2.7 native assets and the
live Site after checks, preserving source anchors and existing authentication.

## Compact media, track-aware drops and blue accent trial — November 20, 2026

Apply changes to shared web/desktop surfaces. Volume displays/commits integer
percentages. Use bounded source-shaped video/image thumbnails with fitted filenames,
universal 94px audio squares and 36px audio timeline rows. Unused library media has
a direct permanent delete action without confirmation/success notifications; used
media must be removed from the timeline first. Purge app-owned local/cloud copies
only when no saved project references them, preserve other projects and original
files, retain source word IDs while remapping indexes, and prevent undo resurrection.
Serialize project writes before purging assets and keep new word IDs collision-free.

Choose drop targets by pointer row geometry, honor explicit audio/overlay lanes,
and show a short marker/preview with track/time inside the destination row. Keep
main-video boundary insertion; reject images on audio rows. Improve dark Home icon
contrast and replace purple feature/editor accents with EditAI blues, including
Batch, text/overlay lanes, EditAI tool, audio-library tiles and transient surfaces.
Preserve the actual logo artwork, user content and custom color/filter choices.
The previously missing notarization profile is available again. Rebuild the pending
0.2.7 release from this complete current source, then publish/install through the
existing signed/notarized acceptance workflow and update the live Site.

Completed: runtime 9f49c95 is live in shared web and signed/notarized installed
desktop 0.2.7. All required checks and browser regressions pass. Mac CI 44841429707,
final mounted-DMG verification and real installed media-removal/export acceptance
pass. Published v0.2.7 assets and updated homepage download metadata.


## Light Home illustration correction — November 20, 2026

Restore the original pastel film cards and white play icon in light mode. Keep
the stronger blue/white illustration exclusively in dark mode. Apply to the shared
web/desktop renderer and publish matching verified desktop 0.2.8 and web assets.


## Restore original EditAI palette — November 20, 2026

Owner rejects the blue-accent trial. Remove its global/product token, feature-card,
editor and transient color overrides, preserving all functional media/slider/drop
changes. Restore the original premium gradient and lavender editor colors. Only
the Home film illustration gets dark-specific cyan/lavender from the original
feature cards; light artwork stays exactly original. Replace the superseded 0.2.8
installer with a matching verified 0.2.9.

Completed: original product palette is restored live; 0.2.9 is signed/notarized,
installed, tested with real export and published. Only dark film artwork adapts.


## Compact bottom-right notifications — November 20, 2026

Use one shared notification layout across Home, Settings and editor. Anchor the
stack bottom-right with safe-area spacing. Short notices fit their content; long
errors wrap within a bounded width. Align leading icon, text and a fixed square
close button; remove legacy editor placement overrides. Preserve existing themes,
notification timing, cancel actions and error recovery links. Publish shared web
and matching verified desktop 0.2.10.

Completed: bottom-right notification layout is live on web and installed desktop
0.2.10; checks, Apple acceptance, final installer verification and real export pass.

## Automatic Settings and scoped app themes — November 20, 2026

Move editable display name and photo upload/removal directly into General, with
app language, saved-edit count and the native support address. Remove profile
color choices and both manual save buttons. Debounce and serialize automatic
profile/preferences writes, retain failed values for Retry, preserve newer edits
and flush before navigation/sign-out. Separate system/light/dark appearance from
eight brand themes; copy native EditAI/Aurora/Sunset/Midnight palettes and extend
with Rose/Ocean/Forest/Citrus. Scope theme changes to the logo, iOS badge, EditAI
rail action and four Home cards. Preserve native dark page contrast and independent
editor/export colors. Remove repeated Privacy & data footers; retain Settings and
onboarding privacy access. Place media kind top-left, duration bottom-left and
trash bottom-right; remove plus and In edit badges, preserving used-source safety.
Fill the selected EditAI sparkle cyan/blue. Remove the raw-takes heading, move Mac
download to the top bar, and use Your edits / View →. Shared desktop advances to
0.2.11, pending final signed installer/installed acceptance and publication evidence.

Completed: final shared runtime 24d08a8 is packaged in signed/notarized installed
and published desktop 0.2.11. Real installed controls/media/export acceptance passes
(0.824s), with all synthetic projects removed. Download metadata is updated; final
web publication incorporates the provider/photo preservation refinements and release
link. See both verification records for exact evidence and fixture boundaries.

Final web: Sites version 103 is live at editai.it.com with source 7eaf950 and the
verified 0.2.11 installer link. Public Chromium 7/7 and WebKit 3/3 pass; installer
HTTP 200 confirmed. Shared web and installed/published Mac updates are complete.

## Slim selections, audio fades and motion — November 21, 2026

Refine shared web/desktop selection styling to one-pixel outlines, transparent
resize/trim targets and a small corner cue; preserve all eight edge gestures,
keyboard trimming, direct text editing and crop interactions. Canvas moves into a
closed preview-top-right menu. Timeline action order is Split, Overlay, Crop,
Duplicate, Delete, with the existing safe move-to-overlay operation.

Place audio fades below Volume inside Clip for primary video, overlays and audio.
Show the envelope and native proportional fitting when paired fades exceed a clip.
Text animations live under Text; visual clip/overlay animations under Filter.
Use native independent entrance/exit/duration/easing and thumbnail/text previews
that share the motion evaluator, stop when hidden, and honor reduced motion.
Fonts remain in their original list positions. Preview, browser export and desktop
compositor use matching effects; native audio mixing uses the same fade envelope.
Keep requested durations in rendered seconds across speed/trim, preserve effects
when moving/extracting/duplicating and clear only internal edges when splitting.
Validate new settings atomically without changing stable source word IDs or auth.
Prepare matching signed/notarized installed desktop 0.2.12 and the live Site.

## Audio-session rollback — November 21, 2026

Owner canceled the audio-library and Instagram work and requested a full undo.
Restore application code and release configuration to pre-audio source 937a7a3;
retain the independent final verification of the earlier motion/fade work. Remove
bundled music, catalog UI/tests/provenance and unfinished Instagram endpoints and
model changes. Original audio-file imports, earlier fades/motion and user projects
are preserved. Restore the verified installed/public Mac 0.2.12, withdraw 0.2.13
from public release and make 0.2.12 latest. Publish the restored web source using
an additive rollback commit; retain remote Git history.

Completed: restored source is live as Sites version 108, the installed Mac app is
verified 0.2.12, and the original imports remain. Session music/Instagram work is
removed, 0.2.13 is withdrawn and Git history is preserved. All required checks,
full browser regression and genuine installed export acceptance pass.

## Native upload review and pill handles — November 21, 2026

Restore the full text/crop selection outline at 1px with 6px corners and eight
16×3px pill grips on transparent 20px hit targets. Home upload now prepares one
or multiple clips, opens the native-style full-screen preview, and waits for Send.
Retake replaces the selection atomically; cancelling its picker retains previews.
Send starts the existing real transcription/editorial pipeline, showing the native
portrait thumbnail, 24%-perimeter pastel orbit, Transcribe/Edit stages and real
reported progress. Cancellation returns Home with locally saved originals; failures
retain the manual edit. Recorded takes keep the native immediate-send behavior;
Batch still produces separate edits. Prepare matching Mac 0.2.14; preserve withdrawn
0.2.13 and all remote history. Verification and publication follow in the records.

Mac 0.2.14 is signed, Apple-notarized, published and installed. Genuine installed
acceptance verifies multi-clip preview/playback/Exit without inference and the
existing editor/motion controls, then exports real H.264/AAC in 13.486 seconds.
The native window-control row stays clear of upload/processing actions. All QA
projects were removed; withdrawn 0.2.13 and source history remain preserved.

Completed: live Sites version 109 and installed/public Mac 0.2.14 match. All 44
hosted editor checks, four targeted hosted WebKit checks, 37 model/security tests,
19 desktop/native tests and both production builds pass. The actual installed
Mac preview, Exit and native export pass without fixture authentication. See
verification records for AI-fixture boundaries and the separate marketing-test
limits. Main and the migration branch preserve remote history.

## Centered upload preview — November 21, 2026

Owner correction: show the full uploaded clip in a centered rounded card on the
loading screen's light/dark background, rather than filling/cropping the viewport.
Preserve the source aspect ratio and group duration/size, multi-clip selectors,
Retake and Send below the card. Keep playback, explicit Send, processing, original
recovery and the safe Mac window-control row. Prepare matching Mac 0.2.15 and web
publication; verify the actual installed preview geometry and export.

Centered-preview implementation passes all 44 editor checks, four focused cases
in Chromium/WebKit and the required model/native/build checks. Mac 0.2.15 is
signed, notarized, public and installed; genuine centered-preview/playback/Exit
and 13.499-second native export pass. Web publication follows with matching
installer metadata; original AI and media safety contracts remain unchanged.

Completed: web version 110 and installed/public Mac 0.2.15 match the centered-card
request. The full 44 local editor checks, required tests/builds and four targeted
live cases in each browser engine pass. Native centered preview/playback/Exit and
real export pass without authentication fixtures. Main/migration history remains
preserved; see verification records for provider-fixture boundaries.

## Text customization and selection scope correction — November 22, 2026

Owner correction: restore timeline video/audio/text selection borders and grips
from before bd35155. Restore classic preview corner/edge handles, thinning only
the preview frame; remove diagonal pills and leave crop controls independent.
Remove redundant Replay previews from continuously looping motion choices. Replace
Style previews with directly usable native-style text color/opacity, background
boxes, outline thickness/color and shadow controls. Keep fonts stable, all timing/
layout/animations, auto-save and actual preview/export rendering. Publish shared
web and a verified installed Mac 0.2.16; preserve all history.

Compatibility follow-up: older saved boxes with omitted opacity/radius fields
must display the renderer's existing 100% / 0px defaults without changing data.
The added reload/export/audio-selection check passes. Final Mac target is 0.2.17;
0.2.16's genuine installed styling/export acceptance passed before this readout fix.

Styling and original selection restoration are live in web version 111 and pass
focused Chromium/WebKit export/reload/legacy-default checks. The full 45 editor
regression, 37 model/security and 19 native tests pass. Final Mac 0.2.17 is signed,
notarized, published and installed; genuine controls, classic handles, restored
borders and decoded text color in a 13.739-second export pass. Final web metadata
publication follows to advertise the matching 0.2.17 installer.

Completed: web version 112 and the installed/public Mac 0.2.17 match. Original
timeline borders/grips are restored; only preview selection lines/handles are
slimmed. Looping previews no longer have Replay, Style previews are removed, and
real text color/background/border/shadow controls persist and export correctly.
Verification and fixture boundaries are recorded; source is pushed to main and
the migration branch with remote history preserved.


## Text palette, official font and timeline fades — November 22, 2026

Owner correction: remove fade helper copy and inspector envelope, show fade
curves on actual audio timeline bodies while preserving strong selection/trim
controls. Remove text Start/End controls, keep layout, and use a fine white
preview frame with circular corner grips and eight accessible resize targets.
Replace the static semibold masquerading as every weight with official variable
TikTok Sans, expose genuine weights and clearer new-text defaults, and retain
saved text settings. Add compact scrollable color swatches, custom HSV wheel,
screen eyedropper with preview sampling fallback for text, borders, boxes and
shadows. Publish matching verified web and installed Mac 0.2.18.


Implementation passes all 45 editor browser checks, 40 unit/security/font tests,
19 native contracts, both production builds and focused live Chromium/WebKit
exports. Web UI version 113 is live. Mac 0.2.18 is signed, notarized, published
and installed; genuine installed typography/color/fade controls and a real
14.076-second H.264/AAC export pass. Final web download metadata publication
follows; all original media, account choices and Git history are preserved.

Completed: final web version 114 advertises the verified public Mac 0.2.18
installer, and the matching app is installed. Final deployed styling/export and
device-gated download checks pass; the served font matches the official asset's
digest. All requested removals, thin preview frame, real TikTok Sans weights,
scrollable color tools and timeline fade curves are published. See verification
records for native export evidence and browser fixture boundaries.

## Font specimens and unchanged on-preview typing — November 22, 2026

Keep TikTok Sans as the default. Give each font its own short expressive specimen,
independent of the user's caption. Match on-preview typing to the renderer's
wrapping and fit, preserve styled canvas pixels on entry, preview keystrokes live,
and retain commit, cancellation, resizing, undo and export. Publish matching web
and verified installed Mac 0.2.19. Silence installed-test speaker output without
altering recorded or exported audio.

All 45 browser editor checks, 40 unit/security tests, 19 native contracts, both
builds and focused live Chromium/WebKit checks pass. Web UI version 115 is live.
Mac 0.2.19 is signed, notarized, public and installed; genuine fitted-typing pixel
checks, specimens and a 13.556-second native export pass with speaker output
muted. Final web publication follows with matching installer metadata.

Completed: live web version 116 and public/installed Mac 0.2.19 match. All 59
font specimens are independent of caption text, TikTok Sans remains default,
and on-preview typing preserves the rendered appearance with real-time drafts,
cancel/commit and undo. Final deployed typing and installer checks pass; the
native export retains non-silent audio. Source and evidence are committed and
pushed to main and the migration branch without rewriting history.

## Preview-only text selection and audio fade overlays — November 22, 2026

Separate preview text frames from timeline text selection. Show a frame only after
selecting text on the video; dismiss on outside pointer/focus changes while safely
committing drafts and retaining the timeline selection. Keep typing, Escape,
resize and undo. Limit audio fade controls to audio tracks. Replace waveform
clipping with translucent gray curved triangular overlays growing from either
end of the full rectangular audio clip. Preserve DSP, effective fade durations,
original timeline borders, visual animation controls and legacy documents.
Publish shared web and verified installed Mac 0.2.20.

Implementation and all 45 editor cases are covered, with one stale overlay-slider
count updated and rerun. Required unit/native/type/build checks and focused live
Chromium/WebKit cases pass. Web UI 117 is live. Mac 0.2.20 is signed, notarized,
public and installed; corrected deterministic QA caption placement verifies
styled pixels in a genuine 13.544-second export. Final metadata publication follows.

Completed: live web version 118 and verified public/installed Mac 0.2.20 match.
Text preview frames activate only from preview selection and dismiss on outside
interaction while timeline selection stays independent. Audio tracks alone have
fade controls; the full waveform shows gray translucent curved overlays from
its ends. Final hosted selection/download checks pass, and source/evidence are
pushed to main and the migration branch with history preserved.

## Caption recovery, chat keys and Adjust feedback — November 22, 2026

Recover legitimate zero-duration words, bounded timing jitter and measured
segment fallback without inventing timings or dropping recognized text. Keep
stable source IDs, atomic edits, existing job resumption, original media and
privacy choices. Detect missing tracks/digital silence before transcription,
skip silent sources in mixed uploads, and use the concise missing-audio message.
Remove the manual-text caption note. Flash Adjust light blue for 750ms (250ms
under reduced motion), support Enter/Shift-Enter and terminal-style prompt recall,
and retain black sparkle strokes with the existing blue fill. Publish shared web
and verified installed Mac 0.2.21. Browser/provider fixtures must remain explicit;
read-only live job metadata inspection does not prove a fresh AI call.

All 47 unit/security/transcript tests, 20 native contracts, complete 47-case editor
browser regression, production builds and focused live Chromium/WebKit checks
pass. UI 119 is live. Mac 0.2.21 is signed, notarized, published and installed;
actual Adjust/chat UI checks and a 13.564-second export pass. No fresh paid
inference was used as synthetic verification; exact-user-response limitations
are documented. Final metadata publication follows with matching installer.

Completed: live web version 120 and verified public/installed Mac 0.2.21 match.
Caption timing recovery, missing-audio handling, Adjust feedback, prompt keys,
note removal and black sparkle outline are published. Final live caption/chat
and installer checks pass. Source and records are pushed to main and the
migration branch; no auth/provider bypass or synthetic usage was introduced.
The exact user's failed response remains a stated verification limit.

## Reference text, safe placement and pacing — November 22, 2026

Upgrade reference attachments from four low-detail frames to bounded high-detail
text frames, ordered 30Hz motion strips, local scene/motion measurements and
optional local audio energy pauses. Prioritize font/weight/size/effects and
normalized placement, distinguish platform UI from creator captions, use target
word timing for relaxed/tight cuts, and support atomic bounded source speed
beats without guessed split IDs. Fit changed portrait text using measured canvas
layout inside a conservative optional TikTok/Reels safe area. Preserve unrelated
edits, source words, consent, original media, and shared web/desktop behavior.
Document research and exact-rate/font/provider limitations. Publish web and
verified installed Mac 0.2.22.

Implemented. Typecheck, 52 unit/security/reference tests, 21 native contracts,
web/desktop builds and focused Chromium/WebKit checks pass. The actual supplied
48.94-second reference was sampled locally in 21.91 seconds, with repeated-frame
evidence near the inspected slowdown sections. All 48 editor browser cases pass including a targeted fixture update; publication
is in progress; no fresh provider inference is represented by fixture tests.

Web UI 121 passes focused deployed Chromium/WebKit reference checks. Mac 0.2.22
is signed, notarized, public and installed, with actual local reference sampling
and a 13.552-second real export passing. Final download metadata publication
follows; provider inference/fidelity limitations remain explicit.

Completed: live web version 122 and verified public/installed Mac 0.2.22 match.
Final live reference/download checks pass. Text/placement matching, local reference
pacing evidence and atomic bounded speed beats are published. Real installed
reference preparation and non-silent native export pass; source and records are
pushed to main and the migration branch. No exact-font/rate guarantee or fresh
provider-inference claim is made.

## Remove reference clutter and recover speech alignment — November 22, 2026

Restore the reference picker to thumbnail, filename and removal action. Remove
analysis/category text, timing counts, the placement checkbox and the hardcoded
safe-area chat suffix; keep reference analysis and matching guidance internal.
For completed Publik jobs with unusable timing, recover real word timestamps
through bounded alternate transcription sections. Preserve original media,
source word IDs, partial progress and atomic editorial cuts. Cache accepted
sections privately per owner/source/job; retry an interrupted later section
without restarting Chirp or repeating accepted alignment. Remove cached data
with media/project/account deletion. Publish shared web and verified installed
Mac 0.2.23.

All 50 editor browser cases pass (2.0m), plus three focused WebKit cases (10.5s),
53 unit/security tests, 22 native/backend contracts, typecheck and web build.
Coverage includes actual media decoding, recovery through first-cut and captions,
interrupted multi-section resume, stable word IDs, owner checks and cache cleanup.
Provider/auth fixtures remain explicit; the exact failed provider payload was
unavailable through the separate test login. Publication and Mac acceptance follow.


Resumed handoff: Mac 0.2.23 is now public and installed. The previous session's
publisher stopped on a GitHub TLS timeout after signing and installed acceptance;
publication was retried successfully without rebuilding the verified app. Its
genuine-session export passed in 13.553 seconds. Fresh typecheck, 53 web tests,
22 desktop/backend tests, production build and three focused browser cases in
each of Chromium/WebKit pass. Exact failed response/fresh inference remains
unverified. Web stays on version 122: public Site metadata is readable, but source
credentials and version history return project_not_found. The owner confirmed
this is a different ChatGPT account. Deployment requires authorized Sites write
access; no replacement Site or access bypass is created. Download metadata and
evidence are ready in source for the next authorized web publication.

Completed after restored Sites write access: existing public web version 123 is
live with the clean reference preview and speech alignment recovery, matching
public/installed Mac 0.2.23. Final deployed Chromium checks pass 4/4 and WebKit
checks pass 3/3. Provider-fixture boundaries remain documented. No new Site or
access bypass was introduced; final source/evidence are pushed to both branches.

## Editor empty-answer recovery — November 23, 2026

Handle final structured text blocks and parsed JSON as well as plain-string model
answers. Never treat reasoning/refusal text as editing commands. Increase bounded
completion room and recover once from empty/truncated answers, using publik-smart
for the Publik recovery attempt. Keep existing atomic edit validation and genuine
provider errors. Publish web and verified installed Mac 0.2.24.

Typecheck, 54 unit/security tests, 22 native/backend contracts and production build
pass. Backend coverage exercises an empty length-limited answer followed by valid
structured text; focused editor failure-preservation and caption/chat cases pass.
The exact user's upstream payload remains unavailable; live logs confirm two
502 editor requests. No fresh paid inference is represented by these fixtures.

Web UI 124 passes deployed chat and reference editing checks. Verified public and
installed Mac 0.2.24 passes actual UI/export acceptance (14.056-second render).
Final matching download publication follows; provider-fixture and exact-user
inference boundaries remain explicit.

Completed: live web 125 and verified public/installed Mac 0.2.24 match. Final
hosted caption/chat and download checks pass. Empty/truncated answer recovery and
structured final-text parsing are published, with atomic editor validation kept.

## Reference text fidelity and conversational editor — November 23, 2026

Make assistant confirmations brief, with opposing chat bubbles and a visible
composer. Preserve measured title/caption heights for each reference rather than
forcing both into a central ad-safe rectangle. Apply addText.style directly so
new titles retain font, outline, size and position. Distinguish TikTok Sans glyphs
from rounded-font/stroke effects. Generated captions stay sequential without
padding overlap, in Auto captions rows; headings remain in Text. Persist origin
through timing edits and preserve source anchors/word IDs and atomic validation.
Publish web and verified installed Mac 0.2.25.

Typecheck, 57 unit/security tests, 22 backend/native contracts and web build pass.
All 51 browser editor cases pass (2.0m). Focused WebKit title/caption checks pass;
final compact composer and visual-position checks also pass. Reference matching
still uses provider vision; controlled replies verify application/rendering,
not an exact fresh-model identification of the user's reference.

UI 126 passes three focused live Chromium checks and the new live WebKit case.
Mac 0.2.25 is signed, notarized, public and installed; genuine UI/export acceptance
passes (14.048-second render). Final matching download publication follows.

Completed: live web 127 and verified public/installed Mac 0.2.25 match. Final hosted
reference-title/caption/chat and download checks pass. Brief bubbles, preserved
reference layout, inline title styling and sequential Auto captions/Text rows are
published; source/evidence are pushed to both branches. Existing edits can rerun
the reference match to adopt the layout fixes; fresh vision fidelity remains a
stated verification limit.


## November 22: seamless hard cuts and export completion

Replaced the single primary decoder with three bounded, independently pre-seeked
slots (current clip plus two upcoming clips), including adjacent cuts of the same
source. Preview retains its decoded frame during seek/decode waits. Browser
capture pauses during buffering/background suspension, uses a timer fallback when
animation frames are delayed, and finishes before seeking to the source end.
Removed the duration-based export deadline; a visible stalled decoder still fails
with recoverable feedback. Native compositor frame rendering waits for metadata
and a fully decoded seek before capturing.

Validation in progress: typecheck, 57 unit/security tests, 22 native/backend tests
and production build pass. Deterministic mixed-source/reordered same-source cuts
have no black preview or exported frames, including export without animation
callbacks and a simulated hidden interval. Styled-text export finalization now
passes. Full editor regression and refreshed final-build WebKit checks follow.
Web and verified installed Mac 0.2.26 publication remain pending.

All 52 Chromium editor cases pass (2.3m). Final-build targeted real exports for
styled text, audio fades/visual motion and mixed-source hard cuts pass 3/3 in
Chromium (32.1s) and 3/3 in WebKit (45.9s). The final two hardening changes keep
the pending clip as the decoder target during buffering and honor cancellation
before capture starts. Typecheck, 57 unit/security and 22 native/backend tests
were rerun successfully; production build passes. Provider replies/auth in these
browser regressions are explicit fixtures, not proof of fresh Publik inference.

Web version 128 is live, source eeb4dc25380654d02906745c2c1eb77c3c0c29c0.
Deployed Chromium styled-text export and no-black-frame cut/export cases pass
2/2 (25.5s); the same deployed cut/export case passes WebKit (18.1s).
Mac 0.2.26 is undergoing signing/notarization and installed acceptance.

Mac 0.2.26 is signed, Apple-notarized, public and installed. Genuine normal-gate
acceptance, editor checks and real native MP4 export pass (14.069-second render).
Installer CI 45114114755 used source eeb4dc25380654d02906745c2c1eb77c3c0c29c0.
The guarded publisher verified the installed app and matching signed artifacts.
Final web download metadata publication follows.

Completed: live web version 129, source ec3d7b81c6c2e2e5812075089c431c81769d0396,
and verified public/installed Mac 0.2.26 now match. Final deployed Mac-download
and no-black-frame cut/MP4-export checks pass 2/2 (16.6s). Public installer HEAD
returns HTTP 200, 170,852,412 bytes. Installed acceptance has no renderer errors,
uses no fixtures and passes real native export. No fresh paid AI inference was
needed or claimed. Source and verification records are pushed to both main and
codex/desktop-migration without rewriting history. Local Worker started for this
change is stopped. Refresh the existing web tab to load the updated player.


## November 22: independent browser export and Downloads defaults

Added independent demux/decode through Mediabunny and direct H.264 encoding via
WebCodecs. Export uses monotonically sampled frames with decoder backpressure,
not the live preview/MediaRecorder clock. Original audio is trimmed, time-stretched,
faded and mixed independently in FFmpeg, then muxed without re-encoding video.
Caption/effect rendering still uses the shared compositor. Inputs, iterators,
encoder and temporary files are released on success/cancellation/failure.
Browsers without AVC encoding retain the compatibility capture path.

Original dimensions and measured source frame rate are selected by default.
Mac exports use app.getPath('downloads') and unique filenames, with no save dialog;
large native exports scale bitrate with resolution/frame rate. Browser downloads
honor browser settings. No overwrite of an existing download is intended.

Checks: 52 Chromium editor cases pass (1.8m), four focused WebKit real exports pass
(25.9s), including captions, effects, overlays, audio fades and hard cuts with
MediaRecorder disabled and no animation callbacks. Four initial Chromium exports
took 19.4s total; the same cut test was 6.6s versus ~11s with capture. This is a
fixture benchmark, not a guarantee of speed on all hardware. Typecheck, 57 unit
and 22 native/backend tests and production build pass. Fixture authentication/AI
is not evidence of fresh paid Publik inference. Live and installed Mac 0.2.27
publication/acceptance follow.

Web version 130 is live, source 931af98b037542232be8a0e372917c43d98f8fb9.
Four deployed Chromium export checks pass (27.9s); WebKit's deployed hard-cut
export with MediaRecorder disabled passes (11.7s). Source-quality defaults are
included. Mac 0.2.27 app notarization passed; installer CI 45129403106 and installed
Downloads/native export acceptance remain in progress.

Mac 0.2.27 is public, signed/notarized and installed. Genuine normal-gate acceptance
passes with no fixtures or renderer errors; source frame-rate default and automatic
Downloads saving were exercised. Real native export took 14.061s. The acceptance
harness redirects only its own app Downloads destination to an isolated test
folder and verifies exactly one MP4 before copying it for media inspection.
Installer CI: 45129403106. Final web download metadata publication follows.

Completed: existing live web version 131, source
61c4aa99857437a4213a6fb310dcf8a699567278, matches verified public/installed Mac
0.2.27. Final live Mac-download and direct-frame cut/export checks pass 2/2
(10.9s). Public installer HEAD returns HTTP 200, 171,051,158 bytes. Source and
verification records are pushed to both main and codex/desktop-migration without
rewriting history. Local Worker for this task is stopped. Refresh an existing
web tab to load the new encoder. Unsupported browser AVC encoders retain the
legacy compatibility path; browser download prompts/location follow browser
settings. Exports remain SDR, not lossless/HDR source preservation.


## November 23: paused export preview, consistent pauses and text outlines

Export now snapshots the document and renders into a separate detached canvas
with its own Player, including the native compositor and compatibility capture.
The visible preview stays paused at its current frame. Export audio nodes do not
connect to the speaker output. Caption/effect timing in the exported file is
unchanged.

Audited the owner's supplied 71.866667s sample locally (no upload/paid inference).
Audio detection confirms ~1.58s of quiet near 36.58–38.16 and ~1.31s near
65.04–66.35, plus ~.43s near 15.26. This does not establish word alignment for
that baked output. Replaced fixed -35dB/95%-of-entire-gap gating and the 1.2s
spacing exclusion with speech-relative contiguous quiet runs, equal short guards
and protected unions of all timed words. Nearby pauses no longer suppress one
another. Cached older projects remeasure local pause evidence when using their
saved transcript, with no new transcription job. Stable source word IDs and
atomic edit validation remain unchanged. This updates local rules and model
instructions; no model-weight fine-tuning was performed.

New TikTok Sans text/captions use 600 weight, white fill, round black .010 centered
stroke (relative to canvas width), and no default shadow. Reference matching now
explicitly measures exterior rim versus full centered stroke separately for titles
and captions, with a concrete pixel-to-width example; detail images retain the
highest JPEG quality fitting the established payload limit. Stored explicit text
styles are not silently migrated. Exact fresh-provider reference fidelity remains
unverified; changing instructions alone cannot prove pixel-identical inference.

Typecheck, 58 unit/security tests, 22 native/backend tests and production build
pass. Full browser and WebKit checks and live/installed Mac 0.2.28 publication
are in progress. Browser auth/AI fixtures are not fresh Publik inference evidence.

All 52 Chromium editor cases pass (1.8m). Final targeted Chromium text/reference/
stationary-preview export checks pass 4/4 (15.2s); WebKit stationary-preview
export passes (9.5s), with its other three text/reference checks passing earlier.
Resolution changes now resize the existing preview surface without replacing its
paused decoder; source-URL rebuilds retain the paused source position. Export
pixel observation verifies zero changes on the visible monitor during rendering.
The preview's canplay event also redraws a newly available paused frame. Final
typecheck/unit/native checks pass and the production build is prepared. Publishing
and genuine installed Mac acceptance follow; fresh vision inference is not claimed.

Web version 132 is live, source fe6eba8632332b8aa13a92eed5f61d01fc4d777e.
Three deployed Chromium text/reference/stationary-preview export checks pass
(21.9s), and the deployed WebKit stationary-preview export check passes (11.6s).
Mac 0.2.28 app notarization has passed; installer and installed acceptance follow.

Mac 0.2.28 is signed, notarized, public and installed. Genuine normal-gate
acceptance passes without fixtures or renderer errors. Real native MP4 export
took 14.068s, automatic Downloads saving passed, and pixel observation confirmed
the visible preview stayed unchanged throughout export. Installer CI 45341260341
used source fe6eba8632332b8aa13a92eed5f61d01fc4d777e. Final web download metadata
publication follows.

Completed: existing public web version 133, source
b52ff965c9550489e7e593c8c3bcf44b0994358e, matches verified public/installed Mac
0.2.28. Final hosted Mac-download/stationary-preview export checks pass 2/2
(11.1s). Public installer HEAD returns HTTP 200, 171,054,815 bytes. Source and
verification records are pushed to main and codex/desktop-migration without
rewriting history. Local Worker for this task is stopped. Existing projects need
the cut/reference operation rerun to adopt new measured pause evidence or text
styling; stored explicit styles and source media were not silently rewritten.
The supplied exported video was audited locally but not modified. Actual fresh
vision identification/pixel-identical provider matching remains unverified.


## November 23: first-cut delivery cleanup and latency

Audited the owner's current 76.633333s baked sample locally. Bundled Silero VAD
(ISC wrapper/MIT model and ONNX runtime) analyzes on-device speech activity in
~0.52s Chromium / ~0.51s WebKit on this Mac. At the chosen short-event threshold,
it does not retain the untimed ~17.4s burst; the later cough lies in a non-speech
window near 44–45s, and the UCI pause is near 68–69s. This is local acoustic
analysis, not ground-truth ASR or a guaranteed cough classifier. All recognized
word intervals remain protected, including brief words. Sustained detected speech
is also protected when ASR omitted it. Very brief untimed bursts below the speech
threshold can be removed; this heuristic is not perfect sound-event recognition.

Added complement-of-word/speech cleanup across noisy gaps and the unspoken tail,
with short guards and versioned local evidence refresh. This avoids keeping an
isolated cough island merely because silence was removed on either side. Source
word IDs and atomic cut validation remain intact. No hard-coded sample timestamps
or desired final duration are used for other videos. The file itself is not
modified; changing cut logic does not rewrite an existing exported file.

The selector/reviewer explicitly handle a quick abandoned 'don't know how to
transfer—' launch followed by 'if you don't know how transferring works…'. A
paraphrased-restart warning and dash/unfinished-suffix detection add context for
review; they are not unconditional deletion rules. Explicit bracketed cough
annotations are excluded from the spoken script. No model weights were retrained.

Latency: packaged detector warms during transcription; polling is 1s initially
then 2s instead of 10s, while preserving ~15m resumable-job wait capacity. Initial
draft uses publik-fast; final editorial review remains publik-balanced, with its
full answer budget and source safety checks. Own-key users retain their selected
model. No new paid job is created to poll or refresh completed transcription.
A real end-to-end first cut under 60s has NOT been established: provider upload,
ASR/recovery and model latency still vary. The local ~.5s VAD measurement is not
an end-to-end first-cut benchmark or evidence of successful fresh inference.

Typecheck, 60 unit/security tests, 22 native/backend tests and production build
pass. All 52 Chromium editor cases pass (1.9m); final focused first-cut/resumable
ASR/export checks pass 3/3 Chromium (11.3s), 3/3 WebKit (14.7s). Provider/auth
fixtures in these regressions do not prove fresh Publik inference. Model/WASM
resources served locally with HTTP 200. Matching live web and installed Mac 0.2.29
publication, real native export and packaged-model initialization checks follow.

Web 134 is live, source 10376a571839f0e087abf962ab2a0e30bf2301f8. Deployed
first-cut/resumable-transcription/export fixtures pass 3/3 Chromium (16.8s) and
first-cut fixture passes WebKit (4.8s). A separate local-only acoustic pass on the
owner's supplied sample using the public model/runtime assets completed in 2.535s
including loading. Its first module fetch failed transiently; recheck succeeded
with correct JavaScript MIME and packaged model/WASM files. This measurement still
excludes ASR and provider reasoning. Mac app notarization and installer CI
45347865659 pass; installed model initialization/export acceptance follows.

Mac 0.2.29 is signed/notarized, public and installed. Genuine normal-gate editor
checks, packaged local speech-model initialization under production CSP, native
export (14.062s), stationary preview and automatic Downloads saving pass, with
zero renderer errors. The audit harness is injected by DevTools evaluation; app
CSP is not weakened. Installer CI: 45347865659. A real first-cut timing attempt
on the supplied sample stopped before any AI call: the Mac's saved provider is
own_key (consent true), whereas the owner previously specified Publik credits.
Provider preference clarification was requested asynchronously; no account
preference or credential was changed. Thus real first-cut <60s remains unverified.
Final web download metadata publication follows.

Published implementation: web version 135, source
710555081f508e0d45c5e2c437c069ead0488677, matches verified public/installed Mac
0.2.29. Final hosted first-cut-flow/download checks pass 2/2 (7.3s). Public DMG
HEAD returns HTTP 200, 176,473,175 bytes. Source and records are pushed to main
and codex/desktop-migration without rewriting history. Owned local Worker is
stopped. Supplied source/export files remain unchanged. Rerun the cut to apply
new local speech evidence and selection guidance. Real fresh-provider first-cut
speed/quality on this sample remains pending the owner's provider choice; no AI
call was made by the stopped real timing attempt. No guarantee of <60s is claimed.


## November 24: Medium defaults, deselection and automatic-cut refinement

New TikTok Sans text defaults to Medium (500) and is the first fixed font-picker
entry. Choosing another font does not reorder the picker. Stored explicit text
styles remain intact. Blank timeline/ruler/preview clicks can deselect the primary
clip; there is no first-clip fallback target. Clip-specific actions disable with
no selection. Removed export's browser/device/SDR helper paragraph.

Automatic cuts now union overlapping removal ranges before slicing; wordless
video remnants shorter than .3 playback seconds are removed after projection.
Recognized short words are retained. When the minimum native clip length would
otherwise erase a spoken island, retain context instead. Manual tiny edits and
short image content are unaffected. Explicit bracketed cough/throat-clear event
markers cannot protect a wordless glitch, but ordinary spoken 'cough' can.
Acoustic joins preserve .12s of retained word tail where available and a short
onset guard, bounded by actual removed-word timings so discarded syllables are
not reintroduced. Source word IDs and anchored-text remapping remain intact.

A failed/empty speech-model analysis is no longer stamped as complete. Evidence
version 4 rechecks older sources, with packaged model/module/WASM priming and a
bounded network retry. The latest supplied 75.033333s sample still shows acoustic
non-speech windows near 37–39s and 44–45s; cached fallback evidence could previously
prevent their remeasurement. This is local signal analysis, not fresh ASR or a
guaranteed classification of every sound.

Raw delivery warnings now reach the initial selector too. If a restart warning
survives the full review, a bounded local-context adjudication may remove only a
falseStart/retake with an exact, retained replacement inside the supplied context.
The combined result is source-validated atomically. Invalid supplements do not
replace the previously validated base review. The additional model round is
conditional; no <60s promise or model-weight training is claimed. Fresh provider
quality remains unverified pending the previously requested provider choice.

Typecheck, 65 unit/security tests, 22 native/backend tests and production build
pass. All 53 Chromium editor checks pass (2.2m). Focused final interface/export
checks pass 4/4 Chromium (15.3s), 3/3 WebKit (16.3s); final sub-minimum spoken-island
safety and source-scoped review checks pass unit verification. React review:
selection stays in state, no conditional hooks, existing seek/drag gestures remain,
buttons reflect disabled state, fixed font order and labels are accessible.
Auth/AI browser replies are explicit fixtures, not fresh Publik inference.
Live web and matching verified installed Mac 0.2.30 publication follow.

Web version 136 is live, source 49efdfd90b8201a4578dcace768be661c11d4ed7.
Deployed Chromium first-cut flow, real export and Medium-first/deselection checks
pass 3/3 (19.3s); the deployed WebKit Medium/deselection case passes (4.3s).
Mac 0.2.30 app notarization passed. Installer/installed acceptance follow.

Mac 0.2.30 is signed/notarized, public and installed. Genuine normal-gate editor
acceptance, Medium font default, packaged speech initialization, native export
(14.576s), stationary preview and Downloads saving pass with zero renderer errors.
Installer CI 45357011096 used source 49efdfd90b8201a4578dcace768be661c11d4ed7.
Final web download metadata publication follows. No fresh paid selection was run;
provider quality on the supplied video is not claimed from fixture checks.

Published: web 137, source 9ba6d12236c961e17061efb671462a220f6de5dd, matches
verified public/installed Mac 0.2.30. Final live deselection/Medium/export-copy
check passes. The download case initially saw no hydrated installer link immediately
after deployment; its fresh recheck passes (1.9s). Public DMG HEAD returns HTTP
200, 176,478,001 bytes. Source and records are pushed to both main and
codex/desktop-migration without rewriting history. Owned local Worker is stopped.
Refresh and rerun the automatic cut to adopt new analysis/cleanup. Existing source
and exported files were not modified. Fresh provider retake judgment remains
unverified; scoped reply tests establish validation/application, not model accuracy.

November 24 — processing progress and background recovery

Clean UI typography replaces the handwritten percentage. Progress counts completed
source/transcription work, editorial review and document commit, stays monotonic,
and never uses a timer to invent progress. Unknown provider work remains pending.
Back leaves first-cut processing running with a compact status; Cancel remains an
explicit action. Completion does not navigate a background user away from Home.

A saved local first-cut task keeps its provider and stable job ID. Reopening the
browser resumes pending tasks under the same signed-in provider and consent.
Owner-scoped model checkpoints recover completed editing stages and final replies;
read-only status polling cannot start another paid inference. Explicit retry alone
releases failed/expired stages; completed results are reused. Account deletion
removes checkpoints. Transcription retains its existing same-job recovery.

Mac window close retains the renderer during active work, with background
throttling disabled; ordinary Quit waits for active processing, then exits.
Force Quit, loss of power, and a fully closed web browser cannot execute local
media analysis. Those cases recover saved work on reopening; this is not a
permanent remote queue and full closed-browser execution is not claimed.

Production logs showed authenticated chat/edit requests ending around 90 seconds
with 503, not authentication rejection. Model timeout is now 180 seconds, mapped
to a specific recoverable 504 instead of generic Publik connectivity. No provider
choice changed and no paid inference was initiated to test the owner's account.

Validation: typecheck, 66 unit/security and 23 native/backend checks pass. Full
Chromium editor suite 55/55 passes; final focused changes pass 5/5 Chromium and
2/2 WebKit. Safari reload teardown preserves pending recovery. Persistent recovery
controls are inline in Home and do not cover timeline controls. Three unrelated
marketing assertions failed during the broad run; no marketing changes were made.
Publishing source, live web and verified installed Mac 0.2.31 follow.

Web 138 is live, source 62ce2f7ffab73869932860d26a74fd57a27b3164.
Hosted upload/background and reload recovery pass Chrome and Safari. The first
immediate checks hit a previous cached UI; fresh checks pass. The 0.2.31 app is
signed/notarized and its matching installer CI is 45372748100. Installation,
native close/background and export acceptance, and final web metadata follow.

Final background chat returns Home and persists its validated result before
reopening is enabled. This avoids exposing timeline controls to an in-flight
snapshot. Focused regression passes 4/4 Chrome, 2/2 Safari. Rebuilding the still
private 0.2.31 Mac staging package to include the same final behavior.

Web 139 is live from 4b4af05b358ad55d557dea3370c265fae978941e; final hosted
checks pass 3/3. Final native source checks pass real sign-in, background close,
editor controls, speech initialization and native export (13.799s), zero errors,
no paid inference. This run is unpackaged and does not constitute installed-release
acceptance. Final 0.2.31 packaging is blocked by the missing Apple `editai-notary`
Keychain profile. Requested restoration; final release remains private, installed
Mac remains 0.2.30. No unverified download/update metadata has been published.
Resume the progress2 release helpers after the profile is restored.

November 24 — generalized editorial evaluation

Completed genuine owner-authorized iterations with the unchanged reference prompt
on both supplied recordings. The first final timeline is 63.55s against a 63.667s
human reference; the unrelated second is 20.61s, retaining its own story and title.
Both retain complete source-word caption coverage and export without black gaps
or tiny wordless clip islands. Full first-cut processing with cached transcription
is 11.153s on the first; fresh upload/transcription/cut is 24.239s on the second.

Fixed actual desktop WASM detector loading, measured acoustic word boundaries,
independent whole-script review and emphasis safeguards. Added optional local OCR,
outline measurement and font/layout calibration, source-anchored caption phrases,
verbatim endpoint recovery and preserved line breaks/emoji. Rejected faster model
routes that failed genuine semantic checks; smart-tier review/reference planning
passed both examples. Removed recording-specific runtime examples. No provider
weights were trained or sample-specific cut times/prompts introduced.

See docs/EDITORIAL-EVALUATION.md for methods, actual results and limits. Typecheck,
78 unit/security, 23 native/backend and production builds pass. Full Chromium
56/56 passes, including actual local OCR; final affected Chrome/Safari checks and
publication/install records follow. Public notarized Mac publication still depends
on the missing editai-notary Keychain credential; existing public installer stays
unchanged until that requirement can be met.

Final publication: web 140 is live from runtime source 1609b106296f14130e43e8905c0b11a83362e8bc;
public checks pass 4/4 Chrome and 3/3 Safari. Latest local affected checks pass
6/6 per engine, including real packaged OCR. Matching Developer ID signed Mac
0.2.31 is installed, exact archive verified, with prior app backed up. Normal
LaunchServices/real Publik gate, both saved final projects, editor controls,
background close and native export pass; no renderer errors. This local source
build is not Apple-notarized. Missing editai-notary still blocks public installer
publication; existing verified public downloads remain unchanged. Old private
0.2.31 draft is stale and must be rebuilt/notarized before public release.
Both final MP4s are in Downloads, temporary owned trials are cleaned up, original
media/unrelated projects are preserved. See the shared/desktop verification records.

## Creation workflow refresh — November 24, 2026

Upload review now offers independent Auto Cut (on) and Add Captions (off)
choices, retained in resumable first-cut tasks. Recordings reach the same review
and combine their remaining takes in one project. Recorder duration pills,
cumulative progress ring, removable takes and a readable stepped scroll control
replace the clipped number/dropdown controls; camera flip is mobile only.
Home welcomes the saved first name and uses compact, animated action cards.
Batch shows local video thumbnails and an Auto Cut toggle. Analyze and Transcribe
start on upload, use clean titles, and keep temporary results outside the project
library/cloud. A dismissible, account-scoped exit warning protects those results;
leaving cancels unfinished work and cleans up its local media. Analysis keeps
intrinsic video proportions beside the summary. Validation/publication follows.

Creation refresh validation is complete: 78 unit and 23 desktop contracts,
62 Chrome checks across the full run and corrected-copy rerun, final affected
10/10 Chrome and 10/10 Safari, and public-web 6/6 per engine. Web 141 serves the
new creation UI from ca82f05. Matching Mac 0.2.32 is installed and passes genuine
Publik gate, existing-project preservation, new creation UI, text/motion/fades,
background close and real native/composited export. Apple credentials are now
available; app and CI-assembled DMG are signed, notarized, stapled, Gatekeeper
verified and published as v0.2.32. Native source, hashes, matching archives and
updater metadata pass. Web 142 is live from 508df1f3e88e848bbf71ab419e77f4dc02fd60f3 with the matching 0.2.32 download. Final device/Home checks pass 5/5 per browser, the served bundle matches the built asset, and the public installer returns HTTP 200.

## Required onboarding name — November 24, 2026

The native reference collects first/last name after account setup; the web
funnel previously had no name collection. Added a final authenticated name step
for profiles without a saved name, before the studio opens. First name is
required (40 characters), last name optional (39); the existing profile stores
the combined name. Settings requires a nonblank name of at most 80 characters,
and Home reads the saved value. Existing named profiles skip the new step.
The owner’s website already stores Jadon; the Mac had no local profile row.
These stores use separately verified linked-install identities, so no unrelated
owners are merged. Jadon is the owner-provided name for Mac verification.

Local typecheck, production build, 79 unit and 23 desktop contracts pass. The
name contract verifies server rejection of blank/oversized names, persistence
across sign-out/resume and isolation on account switch. Five Chrome checks cover
late onboarding, retries, reload, Settings/Home updates and existing profiles.
Final cross-browser, installed 0.2.33 and publication verification follow.

Name verification complete: 63/63 Chromium, 5/5 focused WebKit and hosted web-143
3/3 per engine pass, alongside 79 unit and 23 desktop contracts. Genuine Mac
0.2.33 onboarding saved the supplied Jadon name; reload and normal application
restart restore the personalized Home. Both saved final projects remain. Full
post-signing editor/motion/fade/export checks pass without paid AI or fixtures;
all owned QA projects are removed. Signed/notarized app and CI-assembled DMG
45477182854 pass Gatekeeper, archive/source/updater verification. v0.2.33 is
published; updated download metadata is ready for the final web rollout.

Final name rollout: web 144/68571bc is live with the matching public 0.2.33 Mac
installer. Final public onboarding/Settings/Home tests pass 2/2 each in Chrome
and Safari; current asset and installer return HTTP 200. Existing web Jadon is
preserved and the supplied Jadon value persists in the installed Mac profile.

## Home action icon motion — November 24, 2026

Move animation from whole SVGs to their parts. Batch uses the website’s exact
420 ms per-layer drop/settle choreography with 150/75/0 ms stacking delays.
Transcribe pulses individual vertical bars using the website’s wave keyframes;
the frame stays stationary. Analyze uses three actual four-point stars, each
pulsing around its own center without rotation/translation. Small stars peak at
1.28x and the central star at 1.14x, with quick double pulses. Record copy is
Record your ideas. Reduced-motion users receive static icons. Storage controls
were inspected to explain their recovery/data functions; no deletion or settings
redesign was requested.

Action-motion checks pass 3/3 per browser, including live DOM comparison against
the website’s actual Batch card, per-bar amplitude geometry, bounded/no-rotation
star transforms and reduced-motion suppression. Typecheck/build, 79 unit and
23 desktop contracts pass. Prepare signed/notarized 0.2.34, then verify/publish
both web and installed Mac; no storage controls are removed or invoked.

Motion rollout: web 145/bd8e0fa is live, hosted checks pass 2/2 in each engine.
Matching signed/notarized Mac 0.2.34 is installed; genuine gate, action motion,
reduced-motion and all existing editor/export guards pass. Name/final projects
remain and owned QA projects are removed. ZIP-only packaging and CI DMG assembly
45487164051 passed all Apple/archive/native-source/updater checks; public 0.2.34
is released. Final web download metadata rollout follows. Storage controls were
explained, without being removed or invoked.

Final motion rollout is complete: web 146/69dcd2a advertises public, signed,
notarized Mac 0.2.34. Final hosted motion checks pass in both engines, current
asset matches the build, and installer returns HTTP 200. Installed app and
existing user data are verified; source is pushed to both authorized branches.

## Animated time savings — November 24, 2026

Replace Replay with the blue See your time savings action. Use the owner's
updated estimate of five minutes per video, based on onboarding video volume.
Animate editing minutes into green Time back without changing other activities;
preserve all 720 hours, including fractional-hour cells. Keep only essential
figures, keys and controls. Remove the redundant Back to EditAI header link;
the logo remains the home action. Reduced motion changes values immediately.

Local production checks pass 3/3 each in Chromium and WebKit, 80 unit and
23 desktop contracts, typecheck and build. Prepare matching signed/notarized
Mac 0.2.35, then verify installed app and publish both product surfaces.

Web 147/7a3374e is live; hosted onboarding/graph checks pass 3/3 per engine.
Mac 0.2.35 is signed, notarized, installed and verified against the exact
archive. Its isolated onboarding fixture confirms five-minute math and restores
the genuine session. Normal Publik/LaunchServices startup preserves Jadon and
both final projects. Separate genuine post-signing editor/export acceptance
passes with no renderer errors or paid AI; owned QA projects are removed.
CI 45492942350 assembled the matching branded DMG; app/installer Apple checks,
archive, native-source and updater checks pass. Public release and final web
download metadata rollout follow.

The guarded publisher released public Mac 0.2.35 and generated the matching
download metadata. The installer returns HTTP 200. Final metadata typecheck
and production build pass; the web rollout now points to this exact release.

Final rollout complete: web 148/17316a0 is live with public Mac 0.2.35.
The final graph test passes in Chromium and WebKit. All six referenced client
scripts match the production build and return HTTP 200; the current graph
and installer version are present. The public installer also returns 200.
Both authorized branches are pushed without rewriting history. The installed
Mac app remains verified and user data is preserved.

## Compact Settings cards — November 24, 2026

Remove the theme-target and sign-out/account-switch explanation paragraphs.
Settings cards align at their natural content height rather than stretching
to the tallest card in each grid row. Standard padding and responsive order
remain. Projects/storage controls are preserved; their backup/metadata/delete
purpose is explained to the owner.

Typecheck/build, 80 unit and 23 desktop contracts pass. Existing settings
autosave/profile/theme regression passes in Chromium and WebKit. Separate
production UI checks confirm both paragraphs are absent, all five cards end
with only normal padding (27 px desktop, 23 px mobile), and no horizontal
overflow at 1280/390 px. Browser authentication is fixture-based; it does not
prove Publik connectivity. Publish live web and verified installed Mac 0.2.36.

Web 149/6a802f2 is live; hosted Chrome/Safari checks confirm removed copy and
normal bottom padding at desktop/mobile widths. Mac 0.2.36 is installed,
signed and notarized. Its Settings check confirms removed copy and 27 px
bottom padding on all five cards. The isolated onboarding fixture is labelled
as a fixture and restores the genuine session; separate unmocked Publik gate,
normal LaunchServices startup, name/project preservation and post-signing
editor/motion/fade/text/export checks all pass. No renderer errors or paid AI;
owned synthetic QA projects are removed. Compositor export takes 13.547 s.

CI 45498222439 built the branded DMG from the exact signed ZIP. App, ZIP and
DMG pass Developer ID, Apple notarization/stapling, Gatekeeper, archive, native
source and updater checks. Installed/archive SHA-256 is
c22a69257e80392f06a248ed4c64919990a876f5e460bb73861642591fb7add5.
Prior Mac 0.2.35 is backed up at outputs/settings-cleanup/mac-before/EditAI.app.
Final public release/download metadata rollout follows. Storage actions were
explained; no user backup, export or deletion was invoked.

Public Mac 0.2.36 is released; the installer returns HTTP 200. Final web
download metadata typecheck and production build pass. Deploy this exact
metadata with the verified compact Settings UI.

Final web 150/38bc457 is live with public Mac 0.2.36. Chrome and Safari
confirm compact Settings and removed text at desktop/mobile widths. All six
referenced client scripts match the final build; page, assets and installer
return HTTP 200. Initial old HTML during propagation resolved to the current
asset manifest. Source is pushed to both authorized branches; installed Mac
and genuine user data remain verified. Storage controls are preserved.

## Animated EditAI mascot and inline chat — November 24, 2026

Generate a transparent 3x2 character atlas from the owner's concepts: idle,
blink, two greeting poses and two scissors-snipping working poses. Reuse one
asset for Home, assistant avatars, upload processing, account loading, generic
progress and background/media toasts. Home supports hover, keyboard focus and
tap greeting. Reduced motion is static; offscreen/hidden mascots pause.

Chat uses the saved user photo/initials and a floating unframed assistant.
Requests show a cancellable three-dot typing bubble inside the conversation
without modal focus capture, including transcription/reference preparation.
Playback remains available; edit mutations/undo wait for the request so a late
AI result cannot overwrite manual edits. Leaving through My Edits saves and
completes in the background. Cancellation/error clear typing; prompt recall
and retry remain available. Keep enough room for both user's message and dots.

Production Chrome and Safari pass six focused tests each: upload review,
caption chat/key history, styled reference replies, background completion,
Home layout and the new avatar/mascot/inline loading/cancel/error/retry/playback/
reduced-motion case. Typecheck/build, 80 unit and 23 desktop contracts pass.
Browser provider boundaries are fixtures, not real Publik verification.
Prepare signed/notarized Mac 0.2.37 and separately verify genuine acceptance.

Web 151/10eda7e is live; hosted Chrome/Safari inline-chat and background
completion checks pass 2/2 each. Installed Mac 0.2.37 loads the real transparent
1536x1024 atlas (alpha-zero corner, opaque face), animates hover/snipping,
displays user avatar and cancellable typing without a popup, permits playback,
and honors reduced motion. Its UI fixture restores the genuine account and
removes owned QA projects; fixtures do not establish provider connectivity.
Separate genuine Publik gate, normal LaunchServices, saved name/final-project
preservation and post-signing editor/text/motion/fade/export checks pass with
no renderer errors or paid AI. Compositor export: 13.549 seconds.

App, ZIP and branded DMG from CI 45506954678 pass Developer ID, notarization,
stapling, Gatekeeper, native-source, archive and updater checks. Installed
archive SHA-256 is 8e6f5ed7714acc535cace8774875731f91d1c8c6db7b784a975c5d2e9dee5679.
Mac 0.2.36 is backed up at outputs/mascot/mac-before/EditAI.app. Guarded public
release and final web download metadata rollout follow.

The guarded publisher released public Mac 0.2.37 and generated matching web
download metadata. The installer returns HTTP 200; final metadata typecheck
and build pass. A fresh closed-store audit confirms zero owned mascot or
synthetic Batch QA rows; the two original final projects and name remain.

Final web 152/87bcf2c is live with public Mac 0.2.37. Both final hosted
inline-chat/background tests pass in Chromium and WebKit. All six client
scripts and the transparent mascot PNG match the final build, return HTTP
200, and include the current release. Public installer returns HTTP 200.
Both original final projects remain; zero owned QA rows remain in the closed
Mac store. Both branches are pushed without rewriting history. No iOS or
older private marketing project was modified.

## Soft rigged mascot refinement — November 24, 2026

Replace whole-character pose swapping with a fixed body, separate articulated
arm and vector eyes in one coordinate system. New transparent art follows the
owner's softer reference, with ivory/cyan/periwinkle/peach brand tones, plain
headphones and balanced scissors without play symbols. Idle has no blush;
interaction brings a fading blush and a continuously eased wave. Mouse/tap
focus does not latch the greeting; keyboard focus remains interactive.

Blink transforms only the eyes about their exact 35% vertical center. The
body, headphones and scissors never swap images. The waving arm uses a smooth
requestAnimationFrame pose with eased entry/exit and continuous phase; work
adds a small attentive hand/gaze movement. Idle uses no JS frame loop. Motion
pauses offscreen/hidden, and reduced motion keeps a still pose.

Typecheck/build, 80 unit and 23 desktop contracts pass. Five production
workflow/mascot checks pass in each browser; final alignment/inline-chat
reruns pass 2/2 in Chromium and WebKit. Tests verify unchanged body/arm bounds
through blink, eye-center drift under .05 px, over 50 distinct arm angles over
80 frames, bounded frame deltas, zero idle blush, static reduced motion, and
offscreen suspension. UI fixture checks do not prove real Publik access.
Prepare and verify signed/notarized Mac 0.2.38 and publish both product surfaces.

Web 153/23e4052 is live; hosted pose/inline-chat checks pass 2/2 in each
browser. Installed Mac 0.2.38 passes the new two-part artwork, stable eye/body
alignment, continuous wave, zero idle blush, reduced-motion and chat checks.
The UI fixture restores the real account; provider access is verified only
by the separate genuine gate/normal LaunchServices/post-signing acceptance.
Existing name and both final projects remain. Full editor/text/motion/fade/
export checks pass without renderer errors or paid AI. Compositor export:
14.261 seconds. Fresh closed-store cleanup confirms no owned QA rows remain.

CI 45511395701 assembled the branded DMG from the signed ZIP. Developer ID,
notarization/stapling, Gatekeeper, native-source, archive and updater checks
pass. Installed archive SHA-256:
1dcaf6f1df79002a91cd5c365b271c50f37b2494ba36ec1ddd2edb5ce58226ee.
Prior Mac 0.2.37 is backed up at outputs/soft-mascot/mac-before/EditAI.app.
Guarded public release and final web download metadata rollout follow.

Public Mac 0.2.38 is released; the installer returns HTTP 200. Final web
download metadata typecheck and production build pass. Owned QA rows are
removed and both original final projects remain in the closed Mac store.

Final web 154/ae5f10a is live with public Mac 0.2.38. Both final hosted
pose/inline-chat checks pass in Chromium and WebKit. All six client scripts
and both rigged artwork PNGs match the final build; page, assets and installer
return HTTP 200. Mac installation, genuine session/name and both final
projects remain verified, with zero owned QA rows. Source is pushed to both
authorized branches without rewriting history.

## November 24 — rejected chat proposal recovery and one signup route

The owner chose to retain current Publik sign-in, own-key and per-user-wallet
requirements. Remove the duplicated Google-via-Publik CTA in web and native
onboarding, retaining the official single sign-in action. Do not share an
owner's grant, add an independent Google gate, hide required source or enable
unconfigured PayPal billing.

Chat validation now returns its normalized response instead of discarding the
normalization. Missing unused nullable operation fields are filled without
coercing values or removing unknown operations. Each request advertises exactly
the client's supported operation kinds. A rejected proposal gets one bounded
regeneration, using a fixed schema-path diagnostic; cancellation/provider/credit
errors retain their actual behavior. Invalid batches never partially apply.
No source word IDs or client atomic editorial validation were relaxed.

A server-only PayPal connector is prepared and tested for proposed $8 Starter /
$10 Pro monthly plans, using 10/100 edit-start draft metadata from the app.
It verifies plan pricing, binds subscriptions to accounts/plans, validates
approval origins, forwards idempotency IDs and verifies webhook signatures.
No merchant credentials/plans exist and no checkout is exposed. Full activation
requires approved benefit/funding policy, durable billing integration and real
merchant sandbox acceptance; docs/PAYPAL_SETUP.md records that handoff.

Initial checks: 87 unit and 24 desktop contracts pass, including shared API
rejection→repair and 402 preservation. Typecheck/build pass. Chromium signup,
caption chat and inline typing cases pass 3/3. Prepare web rollout and matching
signed/notarized installed Mac 0.2.39; UI fixtures alone are not provider proof.

Web 155 / 5390c1b is live. Hosted single-signup and caption-chat cases pass
2/2 in Chromium and WebKit. Mac 0.2.39 is signed/notarized and installed,
archive fae69f543527ebc5318eaa34a397bef82d8c7800864360ae80f78457bdf4437c.
An unmocked, genuine Publik call on the owner's existing sample project returned
HTTP 200 and a captionStyle title-outline operation that passed the actual
atomic editor validator; it was not saved over the original project. UI fixtures
pass separately and restore the genuine account. Normal LaunchServices verifies
Publik choice, Jadon and both original final projects. DMG CI 45514892503 passes;
artifact download, local DMG notarization and post-signing release acceptance follow.

Latest funding clarification: browser/Mac prices remain $8/$10, different from
Apple plans. Owner requests paid AI use the app's server-side OpenAI token and
Publik signups use the owner's grant. Hosted config inspection confirms only
PUBLIK_APP_TOKEN and SESSION_ENCRYPTION_KEY exist, not OpenAI/PayPal credentials.
The app source references OPENAI_API_KEY server-side. Supabase is available but
not installed/connected; offered that connection to inspect the existing backend
securely. No key was read from .env, printed, embedded or copied into visitors.
Owner-grant allocation has no verified supported mechanism yet. Preserve current
working per-user Publik funding until that external setup is resolved; no live
paid checkout or funded entitlement is claimed. PAYPAL_SETUP.md records this
concrete activation dependency and keeps proposed web/Mac prices independent.

Mac 0.2.39 is publicly released and installed after full signing/native
acceptance. Fresh closed-store QA cleanup reports zero owned QA projects;
both original final project IDs remain. Publish the generated 0.2.39 download
metadata in the final web version and verify its exact client assets/installer.

Final web 156 / 484cc38 is live with Mac 0.2.39 download metadata. Final hosted
signup/caption-chat checks pass 2/2 in each browser. Six client scripts and both
mascot artwork PNGs match the final production build, and the public signed DMG
returns HTTP 200. Installed archive and original projects remain verified. No
owned servers/app processes remain. Source will be pushed on both authorized
branches; no history rewrite. Funding/payment activation remains explicitly
pending the secure backend/merchant connection and verified grant support above.

## November 24 — restore the original floating mascot

Restore the original 10eda7e six-pose character identity: rounded floating egg
body, wide navy face, large oval eyes and cheerful open mouth. The legged
reference was for scissors geometry only. Use cyan/lilac/peach refinements,
plain headphones/scissor pivot, no idle blush, balanced V-open scissors.
New v3 body/arm PNGs derive from the original artwork using built-in imagegen;
RGB-preserving alpha cleanup removes off-silhouette background remnants.
Earlier artwork remains available for cached clients/history.

Keep the smooth fixed-body rig. Fit larger expressions to the original face,
blink about their exact center, ease arm entry/exit over 460ms and reveal the
resting mitten into a continuous wave. Idle blush remains zero; interaction
adds blush. Motion pauses offscreen/hidden; reduced motion is still. Working
and chat/loading use the same restored character. No provider/billing edits.

Typecheck/build, 87 unit and 24 desktop contracts pass. Browser verification
checks the rounded lower silhouette, aligned blink, continuous wave, inline
chat/cancellation and background completion. Prepare matching signed/notarized
installed/public Mac 0.2.40 and publish the web update.

Web 157 / 061cbfb is live. Hosted pose/inline-chat checks pass 2/2 in Chromium
and WebKit. Installed signed/notarized Mac 0.2.40 passes the native restored
floating silhouette, v3 layer transparency, stable eye/body alignment, continuous
wave, zero idle blush, reduced motion and inline chat checks. UI fixtures restore
the genuine account and are not provider-connectivity proof. Installed archive:
39a35a7783a8ef8116b7e650d57300741ce23d2c820004a22030429d7a4d6b84.
DMG CI 45518578096 is in progress; public installer/final metadata rollout remain.

DMG CI 45518578096 passes. Its artifact is signed, notarized/stapled and
Gatekeeper-verified against the installed/ZIP archive. Genuine post-signing
native acceptance passes required editor/text/workflow/motion/account checks;
real compositor export takes 14.054 seconds. Normal LaunchServices confirms
the real Publik session, Jadon and both original final projects. Mac 0.2.39
is backed up at outputs/mascot-restore/mac-before/EditAI.app. Public release,
QA cleanup and final web download metadata follow.

Mac 0.2.40 is publicly released and installed after guarded acceptance. Owned
QA projects are cleared and the closed store confirms zero QA rows; both
original final projects remain. One metadata-only Batch 2 QA row left by the
acceptance autosave was removed through the authenticated owner-scoped API
using the exact owned QA title allowlist; no user project/source was removed.
Publish final web download metadata and verify the matching assets/installer.

Final web 158 / 9df9b1d is live with public Mac 0.2.40 download metadata.
Six client scripts and both v3 artwork layers match the final build; page,
assets and installer return HTTP 200. Final hosted pose/inline-chat checks pass
2/2 in WebKit and in an unchanged traced Chromium rerun. The first final
Chromium inline-chat case timed out at its five-second Home visibility wait;
its pose case passed, and the full unchanged rerun passed. No product change
was made to conceal that transient startup wait. All owned QA processes are
closed; both original final projects remain and zero owned QA rows remain.
Source and verification records are pushed to both authorized branches.


## November 24 — reference two-frame mascot

Keep the original soft floating v3 body/scissors. New transparent arm artwork
uses two drawn waving poses with an anchored shoulder; remove the rotating
arm and slow expression fades. Restore quick aligned blink/happy expressions,
pink streak blush on interaction, headphone play symbols, animated working/
waving sparkles, and a soft Home-only ground shadow. Earlier assets remain.

Typecheck/build, 87 unit and 24 desktop contracts pass. Local production
Chromium passes all three focused mascot/chat/background checks. Shared browser
and native acceptance checks two discrete wave poses, stable body/blink, instant
expressions, blush, headphone icons, sparkles, Home shadow and reduced motion.
Matching verified web and signed/notarized installed/public Mac 0.2.41 follow.
Fixture UI checks do not establish genuine provider connectivity.

Web 159 / 054c81e is live; hosted pose/inline-chat cases pass 2/2 in
Chromium and WebKit, and all three local production cases pass in both.
Installed signed/notarized Mac 0.2.41 passes the shared animation, chat and
Home checks. The first native attempt had an unlabeled boolean assertion
failure; an unchanged-runtime rerun with assertion labels passed. No product
change or weakened assertion concealed it. Normal LaunchServices confirms
the genuine Publik session, Jadon and both original final projects. Fixture
UI checks remain distinct from genuine account/export acceptance.
Installed archive: cbfea9c8cecbf9ebf2f2bb3ad57739bc8889b0454a09c30e113370672e70be7b.
Previous Mac 0.2.40 is preserved at outputs/mascot-reference/mac-before/EditAI.app.
DMG CI 45523913164 is in progress; final acceptance/public release follow.

CI 45523913164 succeeds. The branded DMG is signed, notarized/stapled and
Gatekeeper-verified; its app archive matches the installed and ZIP app.
Post-signing genuine native acceptance passes all required account, editor,
workflow and motion checks. Actual compositor export takes 13.556 seconds.
Owned QA projects are cleared and the closed store has zero owned QA rows;
both original final project IDs remain. Guarded public release and final
web download metadata publication follow.

Final web 160 / 457c5cd is live with public/installed Mac 0.2.41. Final
hosted pose/inline-chat cases pass 2/2 in Chromium and WebKit. All six client
scripts and four mascot PNGs match the final build, and page/assets/installer
return HTTP 200. An immediate post-deploy asset probe reported one mismatch;
the subsequent per-file probe and full unchanged verifier both match exactly.
No source change was made for that rollout timing. No owned app/server QA
processes remain; both original final projects remain and owned QA rows are
zero. Source and verification records are pushed to both authorized branches.
Artwork/prompt provenance and the assembled preview are saved under
outputs/mascot-reference/ (built-in image generation for arm layers).


## November 24 — compact original mitten wave and aligned details

Replace the bent arm/ball-hand wave with two short rounded mitten poses like
the original atlas, lower beside the body. Keep the soft body, scissors, quick
face changes, working/waving sparkles and Home shadow. Center each headphone
play symbol on its own tilted earcup and mirror the six blush streaks around
the face center beneath the eyes. Built-in image generation supplies only
the two mitten layers; earlier assets and current body/rest pose are retained.

Shared rendered acceptance now also bounds both mitten silhouettes to prevent
oversized arms or covering the headphone play symbols. Verify the web and
matching signed/notarized installed/public Mac 0.2.42 before completion.

Typecheck/build, 87 unit tests and 24 desktop contracts pass. The two focused
production browser cases pass in Chromium and WebKit. Visual inspection checks
both new short mitten poses, symmetric cheek streaks and earcup-centered play
symbols. Release checks for web and Mac 0.2.42 follow; fixture UI evidence does
not prove genuine provider connectivity.

Web 161 / 14953e6 is live with the simplified mitten wave and aligned face/
headphone details. Both hosted mascot/chat cases pass in Chromium and WebKit.
Mac 0.2.42 ZIP signing/notarization is in progress; source, installer acceptance
and original-project preservation remain required before claiming completion.

Installed signed/notarized Mac 0.2.42 passes shared compact-mitten, two-frame
wave, fixed-body/blink, instant-expression, blush, headphone, sparkle, Home
shadow and reduced-motion checks, plus inline chat/avatar/playback/cancel.
Normal LaunchServices confirms the real Publik session, Jadon and both original
final projects. These genuine startup checks are separate from fixture UI checks.
Installed archive: 52143dfb95f9da62a76cdbc5bb3b848f304c2d77fd253481b9306f720bdca20c.
Mac 0.2.41 is backed up at outputs/mascot-alignment/mac-before/EditAI.app.
DMG CI 45529025550 is in progress; public release and final metadata follow.

CI 45529025550 succeeds. DMG/app/ZIP signatures, notarization, stapling and
Gatekeeper checks pass with matching archives. Genuine post-signing native
acceptance passes all required editor/text/workflow/motion/account checks;
actual compositor export takes 13.548 seconds. Guarded public release and final
web download metadata follow. No paid AI inference was needed for this visual
change; fixture UI and real gate/export evidence remain separately identified.

The guarded publisher released Mac 0.2.42; installed and public archives match.
QA cleanup confirms zero owned QA rows in the closed store and preserves both
original final project IDs. Publish the generated download metadata and verify
matching final web assets before completion.

Final web 162 / 3666c67 is live with the public/installed Mac 0.2.42 download.
All six client scripts and four current mascot layers match the final build;
page/assets/installer return HTTP 200. Final hosted pose/chat checks pass 2/2
in each browser. Temporary QA data is cleared, with zero owned QA rows in
the closed store and both original final projects preserved. This turn's
preview/server/application sessions are closed; pre-existing unrelated local
servers are left alone. Source and verification records are pushed to both
authorized branches without rewriting history. Built-in artwork prompts,
asset paths and preview are saved under outputs/mascot-alignment/.


## November 24 — subtle organic lower-body silhouette

Change only the exposed lower torso to a slightly asymmetric floating blob,
closer to the reference: a fuller lower-right flank and gently off-center
bottom curve. Preserve the original head/headphones, foreground scissors and
left mitten pixels. Keep all separate face, compact wave, blush/play alignment,
sparkle, shadow and animation layers/settings unchanged. Built-in image editing
produces the lower torso; protected-region compositing retains 1,104,171
original pixels exactly (zero protected pixel differences). The new body layer
is editai-body-v6.png; v3 and all earlier assets remain for cached clients.

Verify typecheck/unit/build and the existing rendered mascot/chat behavior,
then publish web and matching signed/notarized installed/public Mac 0.2.43.
Fixture UI checks remain separate from real account/export acceptance.

Typecheck/build, 87 unit tests and 24 desktop contracts pass. Both production
mascot/chat cases pass in Chromium and WebKit. Preview inspection confirms
the subtle lower-body change and unchanged face, scissors, hands and effects.
Web/native release verification follows.

Web 163 / 77db4e7 is live. Hosted mascot/chat checks pass 2/2 in each browser.
The only component change is the body-image source; all face/hand/effect code
and CSS remain unchanged. Mac 0.2.43 has passed Apple app notarization and is
finishing its ZIP before installed/public release acceptance.

Installed signed/notarized Mac 0.2.43 passes the existing mascot, compact wave,
aligned blink, instant face/blush, headphones, effects and inline chat checks.
Normal LaunchServices confirms Jadon, the genuine Publik session and both
original final projects. Fixture UI evidence remains separate from genuine
account/export acceptance. Installed archive:
9ed2d452f041461530566e8ba4fd4d49a4b806b4cd0636722879164ce9a9b7bd.
Mac 0.2.42 is backed up at outputs/mascot-blob/mac-before/EditAI.app.
DMG CI 45532801192 is in progress; final release checks follow.


## November 24 — smooth the lower-body join beneath the blade

The owner identified a triangular transparent nick under the left blade in
v6. The protected-artwork composition had retained the old transparent edge
inside the new torso. Supersede the unpublicized Mac 0.2.43 candidate with
0.2.44 and v7 artwork; do not publish the superseded draft. Repair only the
local lower-left torso/matte join. Every pixel outside rectangle
(340,1005)–(510,1110) remains identical to v6. Preserve the opaque scissor
pixels, head and all other layers/animations. Built-in localized image editing
supplies the repair; a 302-pixel matte closing removes the remaining alpha nick.
Seven scanlines through the problem band each have one solid alpha interval.
Dark-background inspection confirms a continuous lower contour.

The 0.2.43 candidate completed signing/notarization and real export acceptance
(14.058 seconds), then was superseded before public release by this correction.
Its owned QA data is cleared. Repeat required source and release checks for
0.2.44; keep fixture UI and genuine account/export evidence separate.

For the v7 correction, typecheck/build, 87 unit tests and 24 desktop contracts
pass. Both focused production mascot/chat cases pass in Chromium and WebKit.
The existing motion code is unchanged. Publish the corrected web and verify
the matching installed/public Mac 0.2.44 before completion.

Corrected web 164 / bc15d5d is live; both hosted mascot/chat cases pass in
Chromium and WebKit. Dark preview confirms the repaired lower edge. The final
asset still has zero pixel differences outside the local repair rectangle,
and all seven sampled nick-band scanlines are contiguous. Mac 0.2.44 app/ZIP
signing, notarization and Gatekeeper checks pass; installed/public acceptance
is in progress. No further changes to layers or animation behavior.

Installed Mac 0.2.44 passes mascot/chat/reduced-motion checks and normal
LaunchServices startup with the genuine account and both original final
projects. Installed archive:
b756145514afee719acc727242d3559015740d22275fa7a0df674d3dc71b15db.
The superseded installed 0.2.43 is backed up under
outputs/mascot-smooth/mac-before/EditAI.app; the original 0.2.42 backup is under
outputs/mascot-blob/mac-before/EditAI.app. CI 45534684037 is assembling the DMG.
Fixture UI checks do not prove provider connectivity; final genuine export
acceptance, public release and metadata remain.

CI 45534684037 succeeds. Final app/ZIP/DMG signing, notarization, stapling,
Gatekeeper and archive-matching verification pass. Post-signing genuine
installed acceptance passes the required editor/text/workflow/motion/account
checks; actual compositor export takes 13.552 seconds. Guarded public 0.2.44
release, owned QA cleanup and final web download metadata publication follow.
The old 0.2.43 draft remains unpublished and superseded.

The guarded publisher released Mac 0.2.44 with the repaired lower-body matte.
Closed-store QA cleanup confirms zero owned QA rows and both original final
projects. Publish the generated download metadata and verify final hosted
assets. The earlier 0.2.43 candidate was never publicly released.

Final web 165 / 64d4e9a is live with the corrected body and public/installed
Mac 0.2.44 download. All six client scripts and four current mascot layers
match the final build; page/assets/installer return HTTP 200. Final hosted
mascot/chat cases pass 2/2 in Chromium and WebKit. Owned QA data is cleared,
with zero owned QA rows in the closed store and both original final projects
preserved. This turn's preview/server/app sessions are closed; pre-existing
unrelated local servers remain untouched. Source and verification records
are pushed to both authorized branches. The superseded 0.2.43 draft remains
private. Built-in image-edit prompts, protected-region/matte verification and
the final dark preview are saved in outputs/mascot-smooth/.


## November 24 — studio reference editing and working mascot refinements

Use a one-piece resting mitten, move the upper-left sparkles away from the
face, center/flip the right headphone play symbol inward, clean the torso
blemish below the left blade, and snip the scissors with two working frames.
The protected head/pivot/left hand stay aligned; reduced motion stays still.
Move independent Auto Cut/Add Captions options below Send/Retake with larger
round controls using the same gradient. Give status notices a real 40px mascot
column so text and cancellation controls never overlap it.

A reference can be sent without a typed prompt. The default matches visual
text/caption style and evidence-backed pacing, slowdown and zoom beats using
the target's own words and titles. Still images cannot establish motion.
The new bounded zoomRange operation preserves source word IDs and supports
in/out/pulse/hold camera scale in both preview and compositor export; native
fast rendering yields to the compositor when source-anchored zoom is present.

Production logs show POST /api/ai/chat on 2026-11-25 04:11:22Z returned 502
after both parsed proposals hit the generic editor-limit rejection. This is
not an authentication/key failure. The previous diagnostic did not retain
which limit failed, so the exact field of that historical proposal is unknown.
Fix the concrete 120-phrase ceiling for longer/single-word captions, encode
actual bounds in the advertised schema, give repair attempts precise safe
field paths, and preflight unknown targets/source-word anchors. Keep atomic
validation and bounded retries. Single-word and long-source grouping can be
generated locally from the verbatim transcript instead of overflowing model
output. No fake production responses or authentication/provider bypasses.

Typecheck/build, 90 unit tests and 24 desktop contracts pass. All nine focused
cases pass in both Chromium and WebKit, and on the live hosted app. A separate
unmocked Publik request in the installed 0.2.45 suite used a copy of the saved
sample 1 project and the authorized edited.mov reference: HTTP 200, 37 styled
captions, one preserved title, all source word IDs unchanged. The supplied
reference is 63.67 seconds, so this is an equivalent flow rather than an exact
reproduction of the unavailable reported 49-second attachment. Native mascot,
inline cancellation/playback, genuine session restoration and normal
LaunchServices startup pass. Fixture UI tests remain explicitly separate from
the real provider request. The app and matching CI-built DMG are Developer ID
signed, Apple accepted, stapled and Gatekeeper verified. Full installed
acceptance passes with genuine authentication, 14.154-second native MP4 export,
Downloads output, still preview during export, editor/text/motion/creation UI
and background window handling. Owned verification projects are removed from
both the UI and closed native store. Version 0.2.45 is installed and publicly
released with matching verified ZIP/DMG/updater artifacts (CI 45548809442).
Website version 167 is live from ec625bc with the 0.2.45 download link.
Final hosted checks pass for all four device/download cases; six client scripts
and five mascot PNGs match the local build byte-for-byte. The public installer
returns HTTP 200 and all public release artifact digests match signing records.
Both authorized source branches are fast-forwarded; owned test apps and the
fresh local Worker are closed, leaving unrelated servers intact. Artwork edits
used built-in image generation, with final asset paths, prompts, protected-region
comparisons and previews retained privately under outputs/studio-refinement/.

## November 24 — Eva and timeline controls

Name the assistant Eva and show Edit with Eva. Repair only the small right-neck
outline notch in both scissors frames, and center the inward headphone play.
Keep the rest of the mascot, waving and face artwork aligned.

Undo/redo use synchronous current-document/history references so consecutive
commands in one event turn restore the correct snapshots. Treat a slider drag
and final release snap as one history entry; omit unchanged document commits.
Pause playback on restoration and clear selections whose items no longer exist.
History starts empty on a newly opened project; this change does not invent
persisted undo entries for older sessions. Tooltips measure their own width and
anchor above their icon instead of clamping all left-edge buttons to x=100.

Animation reset is beside its summary, including while collapsed; filter,
animation and adjustment reset controls use the same neutral color. Add a subtle
keyboard/pointer timeline divider: current default is its minimum, height is
bounded to preserve preview space, and resizing is view-only, outside history.
Responsive stacked/mobile layouts retain their existing layout.

Typecheck, build, 90 unit tests and 24 desktop contracts pass. Browser coverage
passes in Chromium and WebKit, including actual MP4 export, text/caption edits,
reference undo, same-turn history, slider gestures and responsive resize bounds.
All six focused hosted cases pass on web 168 from 9d4339c. Mac 0.2.46 is signed,
Apple notarized, installed and Gatekeeper verified. All seven new shared
installed-renderer checks pass, along with mascot/chat/cancellation/playback
and normal genuine Publik-gate LaunchServices startup. These fixture UI checks
do not claim AI-provider usage. CI 45552793951 assembled the matching branded
installer. App, ZIP and DMG are signed, Apple accepted, stapled and Gatekeeper
verified with matching archive hashes. Full installed acceptance passes through
genuine authentication, including native MP4 export (13.57 seconds), Downloads,
paused preview, editor/text/motion/creation controls and background windows.
Owned QA data is cleared from both UI and closed native store; original final
projects are preserved. Mac 0.2.46 is public and installed. Web 169 is live
from b615036 with its matching download. Six client scripts and five mascot
PNGs match the built assets byte-for-byte; the public installer returns HTTP
200 and artifact digests match signing records. Four hosted device/download
cases pass. Source is fast-forwarded to both authorized branches; the owned
local Worker and test apps are closed, leaving unrelated processes alone.

## November 24 — theme-aware Eva and overlay rotation

Use read-only native ProfileUploadTheme.swift/ProfileAvatar.swift references.
Restore selected-theme Home tiles in dark mode by fixing CSS specificity; retain
the native dark colors for EditAI, Aurora, Sunset and Midnight, and the existing
app-avatar-derived supplemental web themes. All eight choices stay available.
Eva uses light-mode logo colors only, in every appearance, with aligned runtime
material coloring for all five raster animation parts. Preserve her dark face,
soft material/gloss, original alpha and white headphone buttons. Her current
EditAI artwork remains the unfiltered default. Do not regenerate her poses.

Provide invisible rotation hit areas just outside overlay preview corner grips,
with a rotation cursor, pointer capture, Shift snapping, keyboard controls and
Escape cancellation. Store optional canvas-degree rotation separately from
source quarter-turn orientation. Rotate selection/crop frames and inverse-map
resize/crop drags. Preserve move geometry, source word IDs and existing projects;
one committed gesture is one undo entry. Validate bounded angles and render the
same transform in compositor preview/export. Reset crop clears free rotation.
Reserve a preview gutter for outer-corner interactions.

Verify all eight Home palettes and Eva's appearance-independent pixels, actual
encoded rotation, undo/redo, cancellation, keyboard, resize, reset and reopen.
Typecheck/build, 93 unit tests, 24 desktop contracts and all six focused browser
cases pass in Chromium and WebKit. Encoded MP4 edge slope matches the preview
rotation; all eight Eva variants render identically on one backdrop in light
and dark modes. Keep all poses aligned and the default artwork unfiltered.
All four focused hosted cases pass on web 170 from cedcc35. The signed,
notarized installed 0.2.47 app passes all eight Eva/theme pairs, native dark
Home palettes, corner rotation/undo/cancel/keyboard/resize/reset, prior Eva UI
and mascot checks, and normal LaunchServices startup through the genuine
Publik gate. Original final projects and preferences are retained. Shared
Node/browser test imports use explicit .ts extensions. CI 45557161424 built
the matching branded installer. App/ZIP/DMG signatures, Apple acceptance,
stapling, Gatekeeper, matching archive hashes and updater metadata pass. Full
installed acceptance passes through genuine authentication, native MP4 export
(14.103 seconds), Downloads, paused preview, editing/motion/text controls and
background handling. Temporary QA data is cleared from UI and closed native
store. Mac 0.2.47 is public and installed. Web 171 is live from b7b6141 with
the matching installer link. Six client scripts, five mascot rasters and the
rotation cursor match local assets byte-for-byte. All four hosted device/link
cases pass; public installer HEAD is HTTP 200 and artifact digests match the
signing record. Both authorized branches are fast-forwarded. Owned test apps
and the local Worker are closed; unrelated processes are untouched.
Fixture UI checks remain separate from genuine session/export acceptance.

## November 24 — Vibrant Eva materials and corner tilt gestures

Replace the single pastel tint with material-aware mapping of Eva's original
cyan/violet/warm areas to saturated light-logo hues. Preserve original EditAI art,
all five aligned layers, softness, face, wave and cutting poses. Default/native
Home tile colors remain unchanged. Corner drags resize along their diagonal and
unlock rotation after a deliberate tangential pull; no outside hover controls.
Opposing-arc cursor appears only while tilting, with 3° upright entry / 5° release
snap hysteresis. Preview overlay hits select their overlay inspector/timeline row;
text/caption hit areas retain priority above overlays. Shared browser/native
acceptance checks direct selection, resize, breakaway, snapping, cancellation,
undo, keyboard, reset and encoded MP4 angle. Release target 0.2.48.

- Released and verified: Mac 0.2.48 is public and installed; web 172 is live.
  Chromium/WebKit, installed gesture/palette checks, genuine native export and
  eight hosted checks pass. Public asset/artifact hashes match. Original projects
  and original EditAI artwork remain preserved; owned QA sessions are closed.

## November 25 — Eva validation and support reports

Fix request/editor contract mismatches for still-image overlays and timeline
rounding; convert unreadable reference videos before capture. Add safe diagnostic
categories. Compact timeline toolbar, smaller cursor and simultaneous rotation/
resize. In-app support form and authenticated hosted Resend delivery/desktop relay;
owner will supply server mail configuration. Verify UI fixtures separately from
actual provider/delivery checks. Target Mac 0.2.50. Concurrent language work is
preserved in the original checkout; implement these changes in an isolated worktree.

## November 24 — Settings, account deletion and interface language

Remove Projects & storage controls. Keep Delete my account beneath Feedback & help
at the bottom of General. Deletion uses the existing authenticated identity/data
removal endpoint and forgets desktop's retained sign-in credential; the separate
Publik account/plan remains untouched. Add database coverage for profile, project,
source, preference and all-session removal while preserving another owner.

Arrange General/AI connection and Appearance/Privacy as independent columns with
matching 20px gaps. Show a small floating, non-waving Eva above eight named circular
theme swatches. Display mode uses sun, moon and system icons with selected cards.

Replace the fixed English row and General's Spoken language control with App
language. Support full authored studio UI copy in English, Spanish, French,
Portuguese, German, Italian, Chinese, Japanese and Korean. Automatic mode begins
in English and weights existing project transcripts plus remembered user-message
language totals; detection stays on-device. A manual language takes precedence.
Translate labels rather than stored enums, user content or native editing data.
Eva/summary response-language guidance preserves operation names and stable IDs.
Lazy locale assets retain interpolation values, including filenames. Release target
0.2.51; verification/publication evidence follows after acceptance.


- Settings/language integration is verified on shared runtime c14c6ec. Typecheck,
  105 unit tests, 25 desktop contracts, both builds, 74 Chromium scenarios and
  focused WebKit checks pass. Mac 0.2.51 is signed, Apple notarized, public and
  installed, with genuine sign-in/editor/export acceptance and separate UI fixtures.
  Existing preferences/library remain; owned QA data is cleared. Matching web
  publication follows; details are recorded in docs/VERIFICATION.md.

- Eva validation/transform/support work is live in the combined web 174 and
  verified public/installed Mac 0.2.51, preserving concurrent Settings/language
  changes. Genuine reference editing and native support relay pass; support email
  delivery awaits the owner's Resend key and permitted sender. Owned QA metadata
  and test sessions are cleaned up. Full evidence is in docs/VERIFICATION.md.

- Complete: web 174 is live from c7c852b with the matching verified, public and
  installed Mac 0.2.51. All three hosted Settings scenarios pass in Chromium and
  WebKit; eight locale chunks, client assets and Eva rasters match production
  bytes. Public download and artifact digests verify. The deletion test waits for
  its intentional reload; no actual user account was deleted during QA.

## November 25 — Support images and quiet save feedback

Replace the phone support glyph with a chat bubble; tooltip/accessible name Support,
and shorten the help control tooltip to Help. Track pending edits plus overlapping
local media/project writes and queued remote persistence. A 13px muted refresh
icon runs while saving, returns to the existing check when settled and respects
reduced motion; local failures do not claim a successful save.

Support reports accept up to three PNG/JPEG/WebP/GIF images, 2 MiB each and 5 MiB
total, with previews, removal and retained attachments on failed sends. Validate
names, MIME, base64, byte limits and signatures on the server; forward attachment
bytes to Resend, never arbitrary file URLs. Bound both hosted and desktop relay
bodies to 8 MiB. Maintain idempotent retries and the fixed editaiapp@gmail.com inbox.
Owner is setting up Resend one step at a time; production mail key/sender are absent.
Keep secrets server-side. Target signed Mac 0.2.52 and matching web publication.

Mac 0.2.52 is public, signed, notarized and installed. The final genuine-session
acceptance passes export, editing, motion, upload review and workflow checks;
FFprobe confirms H.264/AAC 854×480, 19.1 seconds. Normal LaunchServices startup
passes with the three original projects preserved and owned QA records removed.
Matching web download metadata publication follows. Resend DNS is now correctly
published; genuine email delivery remains unverified until the owner supplies
the server-side API key and permitted sender.

Final publication: web 176 is live from 270193d with the matching public and
installed Mac 0.2.52. Live client/Eva/cursor bytes match the packaged build and
the public installer resolves successfully. Both branches contain the release.
Production email configuration remains the only unfinished support setup step;
no genuine delivery or new paid AI connectivity is claimed.

## November 25 — Compact support form

Remove the attachment heading and static format/privacy helper copy; retain
Attach images directly below Message, selected image previews and actionable
validation errors. Shape the blue support button as a filled chat bubble with
a small white phone icon. Target matching web and verified Mac 0.2.53.

Validation: typecheck, 107 unit tests, 25 desktop contracts and both builds pass.
Support/autosave browser checks pass in Chromium and WebKit; live support checks
pass in both engines on web 177. Visually inspected the compact form and filled
chat-bubble/phone header button. Installed Mac 0.2.53 passes support/autosave,
Settings/language and genuine-session export/workflow acceptance. Apple accepted
both app and DMG; signature, stapling and Gatekeeper verification pass. Existing
three projects/preferences are preserved and owned QA projects removed. Genuine
email delivery remains dependent on the owner's unfinished Resend configuration.

Completed: web 178 is live from d1124de, with the public and installed signed,
notarized Mac 0.2.53. Live client assets match the packaged build; public installer
resolves successfully. Normal startup preserves all three original projects.
Both source branches are pushed without replacing remote history.

## November 25 — Eva opening screen and dark refresh

Replace loading cards with centered Eva and Opening your studio, hiding
header/download/footer chrome during loading. Apply local appearance before
first paint in both web and native renderer; sign-in inherits the saved palette.
Restore the rounded blue support button and outline chat icon per owner request.
Resend domain verified; owner-authorized clipboard key stored directly as a
hosted secret, sender support@mail.editai.it.com, recipient editaiapp@gmail.com.
Runtime revision 3 is deployed; genuine test delivery awaits explicit approval.
Target matching web and signed, notarized, installed Mac 0.2.54.

Owner explicitly authorized one genuine support report with a tiny PNG. Installed
Mac sent it through the real native bearer relay and hosted Resend integration;
HTTP 200 after provider acceptance. Title EditAI support setup test, recipient
editaiapp@gmail.com. No fixtures or project data in this report. Inbox arrival
awaits owner confirmation; API acceptance is not claimed as mailbox delivery.
A refresh regression exposed cached SSR Eva images completing before React
load handlers; mascot readiness now includes already-complete decoded images.

Validation passes: typecheck, 107 unit tests, 25 desktop contracts and web/native
builds. Three loading regressions cover explicit Dark/Light opposite the system
setting and automatic System dark before client bundles run, then reload, cached
Eva readiness, centered mobile/desktop bounds, and dark error recovery. All three
pass on hosted web 179 in Chromium and WebKit; local Settings/language/support/
autosave regressions also pass in both engines. Visually inspected both palettes.
Installed Mac 0.2.54 UI/settings checks pass and restore the genuine session and
preferences; all three original projects remain after owned QA cleanup.

Final installed acceptance passes against the signed 0.2.54 archive after final
DMG signature verification. Genuine-session export is H.264/AAC, 854×480,
19.1 seconds; editor/motion/upload/workflow acceptance passes. Normal macOS
LaunchServices startup opens the ready Publik gate and preserves all three
original project IDs. App, ZIP and final DMG match; both are notarized/stapled
and Gatekeeper-approved. Public release/download metadata publication follows.

Completed: web 180 is live from 4a5d5e5 with runtime configuration revision 3
and the matching public/installed Mac 0.2.54. Final client assets, Eva/cursor
artwork and pre-paint appearance bootstrap match the packaged files; the public
installer resolves successfully. Both source branches are pushed. One authorized
real support report with an image was accepted by Resend; mailbox arrival awaits
the owner's confirmation. No new paid AI inference was performed.

## November 25 — Waving loading Eva and compact appearance preview

Use Eva's existing continuous greeting animation on web and native startup;
respect reduced motion and background pause. Reduce space between the Appearance
preview and App theme options, and show Eva's existing soft ground shadow.
Owner screenshots confirm both support messages delivered; owner found both in
Gmail Spam. Sending works; advised marking messages Not spam. No further email
was sent or configuration changed. Target matching Mac 0.2.55 and web release.

Typecheck, 107 unit tests, 25 desktop contracts and both builds pass. Loading
and compact Settings checks pass 4/4 in Chromium and WebKit locally; all three
hosted loading variants pass in each engine. Wave animation runs with normal
motion and stops with reduced motion. Visual checks confirm the ground shadow
in both palettes and a 9px box gap above App theme (20px less than before).
Installed 0.2.55 UI/settings checks pass and restore original preferences. The
cleanup helper's 5-second startup timeout was raised to 30 seconds after a slow
genuine gate; cleanup then passed and the closed store contains no owned QA rows.

Final signed/notarized 0.2.55 acceptance passes after DMG verification. Real
signed-in export is H.264/AAC 854×480, 19.1 seconds; full editor, motion, upload
and workflow checks pass. Normal macOS startup reaches the ready gate with all
three original projects present. Final download metadata publication follows.
Email delivery is confirmed by Resend Delivered events and the owner's Gmail
Spam-folder check; no additional sending configuration is required.

Complete: web 182 is live from dd82615 with matching public and installed Mac
0.2.55. Live client assets, appearance bootstrap and Eva artwork match packaged
bytes; public installer resolves successfully. Both branches are pushed without
replacing remote history. Owner confirmed mail delivery in Gmail Spam and was
advised to mark both messages Not spam; no additional email was sent.

## November 25 — General settings order and support button

Move Saved edits above App language, show Feedback & help as a secondary button
that opens Contact support, aligned at the same left edge as Delete my account.
Swap AI connection and Privacy & data: left column General/Privacy, right column
Appearance/AI connection, retaining the existing independent 20px card gaps.
Target verified public/installed Mac 0.2.56 and matching web publication.

Validation: typecheck, 107 unit tests, 25 desktop contracts and both builds pass.
Three focused Chromium Settings/persistence/language cases pass; Settings also
passes in WebKit. The same Settings regression passes against live web 183 in
both engines, including Feedback & help opening Contact support without sending
a message, matching left button edges, and cancel/fixture-only account deletion.
Visual verification confirms Saved edits before App language and the exact card
order General/Privacy (left), Appearance/AI connection (right), with 20px gaps.

Installed Mac 0.2.56 UI and all Settings/language checks pass, restore genuine
session/preferences and remove owned QA records. Final genuine-session acceptance
after final DMG verification passes editor, motion, upload/workflow and export;
FFprobe confirms H.264/AAC 854×480, 19.1 seconds. Normal macOS startup reaches
ready and preserves all three original projects. Signed app/ZIP/DMG match and
pass Apple notarization, stapling and Gatekeeper. Final metadata follows.

Complete: web 184 is live from 3e9a431 with matching public and installed Mac
0.2.56. Final live client assets, appearance bootstrap, cursor and Eva artwork
match packaged files; the public installer resolves successfully. Both source
branches are pushed, all original projects retained, and no real account was
deleted during these checks.

## November 25 — Publik install audit and cardless onboarding

Audit: web connections are per retained cookie/credential, not physical computers.
Normal refresh and explicit remembered resume reuse the install; fresh profiles,
cleared cookies and explicit account switching can create another. Historical
sign-out credential deletion was fixed November 19; early real QA sign-ins can
contribute entries, while current browser fixture checks never provision Publik.
Desktop reuses its OS-encrypted credential across launches. Do not attribute all
13 screenshot rows to testing or revoke/merge unfamiliar installs without evidence.

Correct hosted install and telemetry metadata from hardcoded linux to web, as
the current official hosted SDK specifies. Existing remote labels are untouched;
no migration, fingerprinting, shared account key or additional install is created
for the correction. Remove the outer onboarding and inner sign-in card borders,
backgrounds and shadows while retaining the questions, controls and official gate.
Target matching web and public/installed Mac 0.2.57.

Validation: typecheck, 107 unit tests, 25 desktop contracts and both builds pass.
The backend SQLite/encryption/cookie contract explicitly proves repeated session
checks and verified remembered resume mint no new install. Provider-request tests
assert the hosted os=web field. Local Chromium passes public sign-in, blocked
popup recovery, complete first-run/name/consent flow and repeated sign-out/resume;
WebKit passes the public sign-in, full onboarding and repeated resume cases.
The full-flow test now asserts transparent onboarding/account backgrounds and
retained dark appearance. Visual light/dark previews confirm both cards removed.
Hosted first-run and remembered-resume fixture checks pass in Chromium; no new
real claim or paid inference is used to test this change.

Hosted onboarding/resume cases also pass in WebKit. The local health check
confirms authConfigured=false: local public-page tests cannot mint a real Publik
install; hosted flow checks explicitly fixture the provider boundary. No new
real claim or device-link approval was performed. The first installed native
overlay gesture run missed its expected angle; the unchanged full native UI
rerun passed without loosening the assertion, followed by Settings and cleanup.
This is recorded as a transient verification failure, not an editing-code fix.

Final installed Mac 0.2.57 genuine-session acceptance passes after final DMG
signature verification: editor/motion/upload/workflow, native export, and normal
macOS startup with the three original projects. FFprobe: H.264/AAC 854×480,
19.1 seconds. The notarized/stapled app, ZIP and DMG match and pass Gatekeeper.
Existing OS-encrypted credential is retained; no real browser install is linked
for verification. Final release/download metadata publication follows.

Complete: web 186 is live from e28bc31 with runtime revision 3 and matching
public/installed Mac 0.2.57. Final client assets, appearance bootstrap, Eva parts
and cursor match packaged bytes; public installer resolves successfully. Both
branches are pushed. No remote Publik connection was revoked, merged or linked
for this audit; the screenshot alone cannot identify each of the thirteen rows.


## November 25 — temporary tools, contact replies and Eva feature orbit

Analyze/Transcribe remain temporary workspaces: remove Continue in background,
warn before leaving by navigation, processing backdrop or Escape, retain Stay and
account-scoped Don’t show again, cancel processing and release temporary media on
confirmed exit. Loading now has a short task title, smaller filename, Loading
label and rounded EditAI-blue progress pill. Persistent project background edits
remain supported.

New support reports require the sender’s email and include it in both the body
and Resend Reply-To; legacy clients still send without inventing an address.
Previously delivered reports cannot gain a reply address retroactively. Website
FAQ Contact us and footer Support open a generic contact dialog without image
uploads. Its same-origin public endpoint validates email, rejects attachments and
honeypots, limits sends and never provisions a Publik install. The recipient stays
fixed to editaiapp@gmail.com. No real test email is sent for this release.

Account deletion uses an in-app destructive dialog with Cancel, pending/error
states and the existing truthful deletion scope. The website features become
seven glossy circular tools orbiting a shadowed brand-theme Eva; hover, focus or
click shows details and pauses motion. Reduced motion, visibility and offscreen
suspension are honored. Safari clicks explicitly focus the selected tool so
Escape dismisses its details consistently.

The monthly onboarding chart uses one two-step action: Show how much time I will
save, then Build my studio after the animation. Five minutes per video is inline
with EditAI estimate, the grid is larger, legend values closer, and brand colors
retain contrast in dark mode. Personal care is removed from the legend and its
30 hours are allocated to Other time, preserving an illustrative 720-hour month.
All twelve new app strings have eight language translations.

Validation so far: typecheck, 108 unit tests, 25 desktop contracts, web and desktop
builds pass. Browser fixture checks cover reply-email retry preservation, public
contact without attachments, temporary processing backdrop/Stay/cleanup,
in-app deletion, two-step savings totals, persistent background editing, and
complete onboarding. Chromium and WebKit pass the changed app flows. The orbit’s
WebKit Escape issue was fixed by focusing clicked controls; both engines pass
motion, pinning, keyboard and reduced-motion checks. Old marketing tests referred
to removed feature ribbons and capability stars; updated assertions follow the
current feature orbit. Matching verified public/installed Mac 0.2.58 and hosted
publication are in progress; fixtures do not establish provider connectivity.


Installed Mac 0.2.58 UI checks pass with required support email/retry fixtures,
the new two-step savings graph, all Settings languages, and cancellation of the
in-app delete-account confirmation. Genuine session and preferences are restored
and owned QA records removed. After final DMG verification, real-session installed
acceptance passes editor, motion, upload/workflow and export; FFprobe confirms
H.264/AAC 854×480, 19.1 seconds. Normal macOS startup reaches ready with all three
existing projects. App, ZIP and branded DMG match, are notarized/stapled and pass
Gatekeeper. Public Mac release 0.2.58 is published; final web metadata follows.

Web 187 is live with runtime revision 3. All sixteen marketing/contact/orbit
Chromium cases pass. Six changed-flow hosted cases pass in both Chromium and
WebKit, with provider/email boundaries explicitly fixtured: temporary tools,
savings flow, Settings/delete confirmation, support reply draft and public
contact/orbit. Direct invalid-form validation on the real contact endpoint returns
400 requiring an email; no email was sent. The edge sets only its __cf_bm cookie
for this validation; the contract test proves public contact does not provision a
Publik installation. Live UI asset hashes and visual previews match the build.


Complete: web 188 is live from 7f9a07b with runtime revision 3, matching public
and installed Mac 0.2.58. Final live client assets, appearance bootstrap, Eva
artwork and cursor match packaged bytes; the public signed/notarized installer
returns 200. Final hosted checks confirm the new download, seven-tool Eva orbit
and attachment-free contact dialog. The installed app is reopened normally;
both source branches are pushed. No real account was deleted, no extra Publik
installation was linked, and no real email was sent during this verification.


## November 25 evening — first-cut navigation and compact onboarding

Trace: video selection creates a saved draft and opens Review. Send runs measured
transcription, optional cutting and optional captions, then commits the validated
document. Staying opens the editor; Background opens Home and View progress must
return to that active draft. Once complete, View edit must open the latest edited
document. Cancellation returns Home with recoverable originals; interrupted jobs
remain resumable in Edits. Missing/deleted targets return to Edits or Home.

Fix a completion race where the old View progress callback could set Review after
its draft was cleared, leaving an inert sidebar and blank content. Notification
navigation now reads the current task target and phase, completed notifications
open the latest current/saved document, and Review without a draft has an explicit
recovery route. Local completion replaces the progress notification immediately,
including while final cloud synchronization remains pending. A notification never
restores its original document snapshot over later user edits.

Upload Send/Retake controls are smaller. Progress percentage is always visible
below Eva rather than overlapped by her image. Actual selected tasks appear as
loading dots/current work and completed checks; unselected cutting/caption work
is omitted. No paid job or measured progress is fabricated for presentation.

The six feature tools omit Export and use matte pastel rounded squares, two of
each color, around larger Eva with less section whitespace. Onboarding downloads
move to the header; iOS coming soon badges are removed. The chart and legend are
centered, Editing is red, Time back uses the brand gradient, and label/value
spacing increases slightly. Publik sign-in is a centered 320px button. Build my
studio shows a minimal 2.6-second Eva-cutting presentation transition before the
ready screen; it performs no fabricated backend curation. Answers remain saved
and the transition timer is cleaned up on unmount.

Validation: typecheck, 108 unit tests, 25 desktop contracts, web/desktop builds
pass. Chromium and WebKit cover the live-progress/finished-editor path with final
sync deliberately held, first-cut monotonic percentages, multi-video upload,
full onboarding including the intermediate transition, savings totals and orbit
behavior. Chromium also covers support and Settings regressions. Visual geometry
checks confirm chart centering, red Editing/gradient Time back, compact sign-in,
and header-only onboarding downloads. Target matching live web and verified
public/installed Mac 0.2.59; provider boundaries are fixtured for browser cases.


Web 189 is live from 3d89468 with runtime revision 3. All sixteen marketing/orbit
cases pass locally. Six changed-flow hosted cases pass in both Chromium and
WebKit, including the delayed-final-sync notification regression, active progress,
completed-editor reopening, visible percentages and full onboarding transition.
Browser provider requests remain fixtures and do not prove real model access.

Installed Mac 0.2.59 interface checks pass and restore genuine session/preferences;
owned QA records are removed. After final DMG verification, genuine-session
acceptance passes editor, motion, upload/workflow and native export. FFprobe:
H.264/AAC 854×480, 19.1 seconds. Normal macOS startup reaches ready with all three
existing projects. App, ZIP and branded DMG match and pass notarization, stapling
and Gatekeeper. Verified public Mac 0.2.59 is published; final metadata follows.


Complete: web 190 is live from 2c577dd with runtime revision 3 and matching
public/installed Mac 0.2.59. Final client assets, appearance bootstrap, Eva artwork
and cursor match packaged bytes. Public installer returns 200; final hosted
checks confirm header downloads target 0.2.59, six matte orbit tools omit Export,
and onboarding has no slide-area installer. Installed app is reopened normally,
all three original projects retained, and both source branches are pushed. No
real model job, support email, extra Publik link or account deletion was used for
this verification; genuine desktop authentication and export were verified.


## November 25 late evening — live processing activity and stable app dialogs

Replace frozen first-cut 0/33 percent labels with indeterminate activity, elapsed
wall time and completed-task counts. The provider does not consistently expose
measured within-stage progress; no timer-based percentage or fake completion is
introduced. Internal monotonic job progress remains persisted for recovery.
Caption creation yields a frame before its actual local work, with a short
background-tab fallback, so a selected caption stage can render. The saving stage
only completes after local persistence succeeds.

Completion notifications now keep Eva, copy/action and close in three columns.
The former extra action child occupied the narrow close column and pushed the
close control into another row. In the editor, completion is a minimal Eva/message
notice; away from the editor it retains View edit beneath the copy. Messages
accurately distinguish cuts, captions, or both, and keep the latest-document
navigation fix. The duplicate upload video-count line is removed.

Edits deletion uses a themed in-app dialog with filename, Cancel/Delete, pending
and error/retry states. A failed server deletion leaves the local project intact.
Photo-action hover remains dark with white icons. The sign-in title, description
and larger 400px button align in one centered column. Five minutes per video is
below EditAI estimate and the legend has stable width to avoid moving the grid.
All five new strings have eight locale translations.

Validation: typecheck, 108 unit tests, 25 desktop contracts and web/desktop builds
pass. Chromium covers nine changed/regression flows; six focused WebKit flows
pass. Explicit checks cover deletion cancel, failure, retry and media cleanup,
actual caption-stage rendering, mobile completion bounds, delayed-save finished
navigation, elapsed activity and full onboarding. Geometry/visual checks confirm
aligned account copy/action, centered chart and under-label estimate. Native QA
cleanup scripts now use the new project-delete dialog. Target matching hosted
web and public/installed Mac 0.2.60; provider requests remain browser fixtures.


Web 191 is live from b8587c5 with runtime revision 3. Six changed-flow hosted
cases pass in Chromium and WebKit, including project delete cancellation/failure/
retry and actual storage cleanup, elapsed activity, caption-stage paint, compact
mobile completion, delayed-save navigation and onboarding. Local geometry checks
confirm aligned account text/button and the under-label estimate. Live client
asset hashes match the build. Provider requests remain fixtures in browser QA.

Installed Mac 0.2.60 interface checks pass, including in-app project deletion
through QA cleanup; genuine session/preferences are restored and owned QA rows
removed. After final DMG verification, genuine-session installed acceptance passes
editor, motion, upload/workflow and export. FFprobe: H.264/AAC 854×480, 19.1 seconds.
Normal macOS startup reaches ready with all three existing projects. App, ZIP and
branded DMG match, are notarized/stapled and pass Gatekeeper. Verified public Mac
0.2.60 is published; final web download metadata follows.


Complete: web 192 is live from 2811ed7 with runtime revision 3 and matching
public/installed Mac 0.2.60. Final client assets, appearance bootstrap, Eva artwork
and cursor match packaged bytes; the public installer returns 200. Final hosted
checks confirm the 0.2.60 header download and aligned 400px account copy/action.
Installed app is reopened normally with all three original projects retained.
Both source branches are pushed. No real model job, support email, additional
Publik link, or user account deletion was used during verification; genuine
native authentication and export were verified. Project deletion tests remove
only owned QA records and restore the original library.


## November 25 — Google sign-in wording

Use the requested sentence: “Create or link a free Publik account with Google to
open EditAI and save your edits. A subscription is optional.” Google has a small
inline multicolor G and semibold name, kept together without duplicating its
accessible text. All eight translations preserve the brand name. Sign-in still
uses Publik’s official flow. Typecheck, 108 unit tests, 25 desktop contracts and
web/desktop builds pass; the existing full onboarding flow and exact copy/logo
checks pass. Target matching live web and public/installed Mac 0.2.61.


Web 193 is live from 19a32f1. Exact wording and the inline Google mark pass in
hosted Chromium and WebKit. Installed Mac 0.2.61 passes interface checks, restores
genuine session/preferences, and removes owned QA records. After final installer
verification, genuine-session editor/motion/upload/export acceptance and normal
macOS startup pass with all three original projects. Export is H.264/AAC 854×480,
19.1 seconds. App, ZIP and DMG match and pass Apple notarization, stapling and
Gatekeeper. Public 0.2.61 is published; final web metadata follows. No real AI
job, extra Publik link, support email or account deletion was used for this change.


Complete: web 194 is live from b5583c5 with runtime revision 3 and matching
public/installed Mac 0.2.61. Exact copy and Google logo pass in hosted Chromium
and WebKit. Final asset, appearance, Eva and cursor hashes match; the installer
returns 200. Installed app is reopened normally, all three original projects
remain, and both source branches are pushed.


## November 25 — Clearer launch planning and optional contact replies

Make support/contact reply email optional with the requested label, preserving
validation and Reply-To when supplied. Public contact still rejects attachments,
honeypots and cross-origin posts, and retains its rate limits. Use Contact EditAI
in sentence case. Replace vague comparison rows with a labeled planning example
(60 minutes manual / 15 minutes review; four videos weekly), clear headings and
a fixed 80-hour chart with a 20-video weekly cap. Keep estimates explicitly
illustrative. Raise the pricing actions, link to official Publik plans with an
external arrow, mention Eva in the FAQ, match the closing Mac download, tighten
the feature/gallery transition, and add one topbar iOS announcement.

Typecheck, 108 unit tests, 25 desktop contracts and production build pass. Sixteen
marketing/contact browser checks pass, including optional blank-email submission
through a controlled mail boundary; no real support email was sent. Genuine
existing desktop Publik wallet returns 200 / claimed, choice Publik, no recurring
plan and 99% prepaid remaining. No new install, paid AI job, purchase or card
submission was performed. Official plans lead to Publik wallet sign-in and the
linked wallet returns the official /wallet/add billing URL. Checkout/card
acceptance is not established by these read-only checks. Target Mac 0.2.62 and
matching live web publication.


Web 195 is live from 6dfab09 with unchanged runtime revision 3. Chromium
marketing/contact checks pass (16); WebKit passes the corresponding suite with
the frame-sampling ruler check passing on isolated rerun after concurrent signing
load. Hosted checks verify contact, calculator, FAQ, badge, readable headings,
external arrow and app entry. A final web-only style correction applies the same
filled pill treatment to the closing download (the component and URL already
match the top action); its layout checks pass. Mac 0.2.62 from 6dfab09 is signed,
notarized, installed and retained; final CI image and genuine export acceptance
are in progress. Publik’s add-credit and wallet sign-in pages return 200 with
Google sign-in. A completed purchase remains unverified.


Mac 0.2.62 and its final DMG pass Apple notarization/stapling/Gatekeeper and
byte-for-byte app/ZIP/image verification (CI 45766928509, source 6dfab09).
Installed interface, all eight languages, appearance, account confirmation and
optional blank-email submission pass. The mail boundary was intercepted; no
actual email was sent. Genuine session/preferences were restored and owned QA
records removed. After final signing verification, unmocked authentication,
editor/motion/upload checks, native local export and normal LaunchServices
startup pass. All three original projects remain. Export completes in 14.064
seconds and probes as H.264/AAC 854×480, 19.1 seconds. Public release and final
web metadata publication follow; no actual plan purchase is claimed.


Complete: web 196 is live from 4efcc19 with unchanged runtime revision 3 and
public/installed Mac 0.2.62. Final hosted contact/calculator/app-entry checks pass,
including blank-email submission through a fixture boundary. Top and closing
downloads both use filled rounded pills linked to 0.2.62. Nine client assets, five
Eva parts, appearance bootstrap and cursor match the packaged build. Public DMG
returns 200 (200,972,228 bytes). Installed Mac is reopened normally; all three
original projects remain. Both source branches are pushed without rewriting
history. Genuine desktop sign-in and prepaid access are verified; customer card
checkout completion is not verified by this work.


## November 25 — Paired actions and estimate transition

Move the requested full planning explanation from above the calculator into its
footer, replacing the former disclaimer. Use pink and an EditAI gradient for
chart lines, endpoints and fill. Keep both pricing actions side by side, and put
the closing Open EditAI Web and outlined Install for Mac actions side by side,
including narrow screens. The closing installer retains architecture/version.
Remove the per-video caption from onboarding. Drive its red-to-green editing
color with the existing savings progress so reduced motion/offscreen behavior
remain intact. Sign-in now says Create a free Publik account with Google…,
preserving the Google mark and all eight translations.

Typecheck, 108 unit tests, 25 desktop contracts and production build pass. Fourteen
marketing checks and two onboarding checks pass. Exact copy/logo checks pass in
Chromium and WebKit; both action pairs stay on one row at 375/390/550px. Target
matching live web and signed/notarized public and installed Mac 0.2.63.


Web 197 is live from 8dcdbc4 with runtime revision 3. Hosted action pairs stay
side by side at 375/390/550px, and the closing installer uses the outlined
architecture/version style. Exact sign-in copy and Google mark pass in Chromium
and WebKit. The hosted animation records 60 distinct colors from red to green;
its per-video caption is absent. WebKit onboarding allocation checks also pass.
Mac 0.2.63 is signed, notarized and installed from the same UI source. Native
graph checks verify red/green endpoints and the removed caption, then restore
the genuine session. Settings/languages pass and owned QA records are cleared.
Final CI installer, genuine export and publication remain in progress.


Mac 0.2.63 is public and installed. App/ZIP/final disk image match, pass Apple
notarization, stapling and Gatekeeper (CI 45772187474, UI source 8dcdbc4).
Installed copy/logo, red-to-green graph and removed caption are verified.
Settings, all languages and restored preferences pass. Unmocked authentication,
editor/motion/upload checks and real local export pass; the first action-icon
frame-count read raced its hover start, and the unchanged acceptance passed on
isolated rerun. Export is H.264/AAC 854×480, 19.1 seconds, completed in 13.551
seconds. Normal startup passes. Final website download metadata targets 0.2.63.
Final packaging uses an isolated checkout because unrelated working-tree changes
arrived during release verification; those changes are preserved and excluded.


Complete: web 198 is live from 4924f69 with runtime revision 3 and public and
installed Mac 0.2.63. Final hosted tests verify paired actions down to 375px,
outlined installer/architecture/version and both download links to 0.2.63.
Exact Create wording and Google mark pass in Chromium and WebKit. The final
hosted fade records 61 distinct colors; the per-video caption is absent. Nine
client assets, five Eva parts, appearance bootstrap and cursor match the isolated
package. Public DMG returns 200 (200,971,337 bytes). An owned Batch 2 fixture
metadata row left by the export test’s delayed save is removed through the
authenticated API; normal startup confirms exactly the three original projects.
The installed app is reopened normally. Unrelated working-tree edits remain
preserved and excluded from this deployment; both authorized branches are pushed.

## Private AI service — November 25, 2026

Owner authorized keeping the editor open source while moving AI instructions and
editorial inference to a private server. Preserve history without force-pushing.
Move prompts, examples and review orchestration out of current public source and
Mac packages; keep source-safe edit validation public. Use an owner-private Sites
Worker behind the existing authenticated web gateway, with per-user Publik auth,
explicit consent, transient personal keys, recoverable jobs, scoped data deletion
and bounded inference. Add release checks for private code and prompt signatures.
Target matching web and signed/notarized public+installed Mac 0.2.64.
Verification and publication results follow in docs/VERIFICATION.md.


## November 25 — Interactive planning calculator

On first viewport entry, demonstrate weekly volume from 4 to 15 over 1.6 seconds.
Pause when hidden/offscreen, respect reduced motion and stop permanently on user
input/focus. Both plot lines, endpoints and labels support vertical dragging
through pointer capture and arrow/Home/End keys, synchronized with the range
control. Promote the EditAI endpoint into an icon/gradient-wordmark pill. Add a
brief Eva hint with her happy squint and resting hand. Use a smaller CourierPrime
footnote across the available width (two desktop lines; readable mobile wrapping).
Keep the existing numeric assumptions and manual 1–20 video range.

Typecheck, 108 unit tests, 25 desktop contracts and production build pass. Eighteen
Chromium marketing/calculator checks pass, including intro cancellation, line
and pill dragging, keyboard access, resting-hand artwork and footnote layout.
The native acceptance harness waits for hover animation startup rather than
sampling its first frame. Isolate this release from concurrent unrelated working
changes. Target matching live web and public/installed Mac 0.2.64.

- Private AI service v2 is owner-private and passes 17 private checks, including
  durable deletion fencing and literal prompt-echo rejection. Public relay uses
  Worker-compatible manual redirect rejection and has two actual Workerd tests.
  Web 201 routes genuine summary/Eva/automatic selection through the private
  service; source-word safety is preserved. Concurrent calculator changes are
  merged additively. Mac 0.2.64 source is ready; owner explicitly deferred signing
  until the missing editai-notary profile is restored. Verified public/installed
  0.2.63 remains available. Historical public copies are not erased.

- Server work complete: web 202 is live with the private AI gateway and latest
  combined calculator UI; owner-private service v3 retains all 19 passing private
  checks. Real Publik summary, Eva and selection passed through the new boundary.
  Public tests (106), desktop contracts (37), hosted editor checks (4), builds,
  source/artifact leak checks and final secret scan pass. Installed 0.2.63 is
  preserved and reopened. Mac 0.2.64 publication remains explicitly deferred by
  the owner until their notarization profile is restored.


## November 26 — Gentler intro, concise features and cropped previews

Slow the calculator introduction from 1.6 to 3.2 seconds with a smooth start and
finish. Preserve one-time playback, user interruption and reduced-motion behavior.
Shorten all feature explanations; remove temporary-workspace language from Analyze
and Transcribe. Compact heading/body spacing keeps desktop descriptions within
the reserved detail slot, so the gallery does not move when a tool is selected.
Frame the four original iPhone screenshots with a viewport cropping 150 source
pixels from the top and 96 from the bottom. Status/home bars are hidden while app
controls and original image files remain intact.

Typecheck, 106 unit tests, 37 desktop contracts and production/public-boundary
build pass. Chromium marketing/calculator/contact/layout checks pass (22), as do
six focused WebKit checks. Tests verify the gentler intro, two-line descriptions,
unchanged gallery position and screenshot crop geometry. No real AI job or email
was sent. Mac notarization remains explicitly owner-deferred; verified installed
and public Mac 0.2.63 is preserved. Reconciled hosted/GitHub history by merge.


Complete: web 203 is live from ab7e065 with runtime revision 4 unchanged. Six
focused hosted WebKit checks pass. Hosted Chromium passes five cases plus an
isolated successful rerun of its initial scroll-stability timeout. The slower
intro, manual interruption, concise two-line feature cards, fixed gallery
position and cropped original screenshot frames are verified on the live site.
Nine client assets, five Eva parts, appearance bootstrap and cursor match the
package; the download still points to verified Mac 0.2.63 under the standing
owner deferral. Source is pushed to both authorized branches without force.


## November 26 — Continuous estimates, natural text and final cut verification

The 4-to-15 calculator introduction now uses continuous visual values instead of
whole-video steps. Manual input, graph dragging, reduced motion and one-time
playback remain intact. A one-second browser sample advanced on all 60 frame
intervals (61 samples).

Caption and manual-text layout measures complete words, including nonbreaking
spans, and reserves padding. Narrow boxes expand instead of compressing glyphs
horizontally. Extremely long words and multiline text fit uniformly inside the
frame. Preview, export, typing and selection handles share this layout; resize
handles begin from the measured visible box.

Local quiet-cut verification subtracts timed words and independently detected
speech from existing acoustic candidates. Source-anchored speech regions survive
project storage, media remapping, final edge trims and short-fragment cleanup.
Version-6 cached and partially recovered projects recheck local audio for version
7 without submitting another transcription job. Missing captions alone never
create a cut. A real packaged Silero run on a generated 207 ms “No.” detected and
preserved the utterance at the new 96 ms minimum; the old 500 ms minimum missed
it. Final retained source range 0.996–1.308 covers audible 1.00006–1.19481.
No external audio request was made. Very low-gain speech can still evade VAD;
classification is not a guarantee of perfect cuts or complete speech detection.

The owner-private AI service v4 adds a bounded final review of flagged correction
and restart contexts: at most eight contexts, 200 original words, 1,800 output
tokens and a 20-second optional-pass deadline, without a larger retry. Clean
fixtures retain two model calls; flagged fixtures use three total. Its 29 tests
pass. Prompts and editorial implementation remain outside public source and
artifacts. The public HTTP contract is unchanged.

Typecheck, 118 public unit tests, 37 desktop contracts, web and desktop source
builds pass. Public-boundary scans pass across 985 files. Sixteen focused
Chromium checks and sixteen WebKit checks cover the intro, real font metrics,
actual narrow selection boxes, styled preview/export, all four Send options,
transcription recovery, completed-edit reopening, caption stages and completion
notifications. Two final Chromium text checks also pass after the nonbreaking-
span refinement. Fixture authentication does not prove genuine Publik access;
private-service genuine acceptance is recorded separately when observed.

Mac publication remains explicitly owner-deferred pending restoration of the
Apple notarization profile. Installed and public verified Mac 0.2.63 stay intact;
these matching desktop source changes build successfully but are not installed.


Release verified: public web 204 is live from
76caa95da5bdf096a72f4389cc0260572a83b509 with runtime revision 4 preserved.
Nine hosted Chromium checks and seven hosted WebKit checks pass. Nine client
assets, five Eva parts, appearance bootstrap and rotation cursor match the tested
package. The public download remains verified Mac 0.2.63 under the owner deferral.

The separate owner-private AI service is now v6, source
737df6cfa45c64160be96bf30d906a4c831fa0c2, with 31 passing private tests and a
successful Worker build. Owner-only access is preserved; anonymous health access
returns 401. Real native-gate → public → private → Publik selection checks returned
200, preserved stable source IDs, and recovered the same result by saved-job GET.
No new transcription or synthetic telemetry was submitted. The first real check
removed a correction phrase while retaining its corrected wording, but left a
repeated prefix. Investigation found malformed word-text references; v5 constrained
reference fields to allowed original IDs. The one authorized v5 regression proved
provider/schema compatibility through public 204 in 12.524 seconds, but exposed
an overcut that removed unique completion words. V6 rejects that exact proposal
atomically and keeps the prior validated plan; the opposite valid prefix removal
also passes its regression. V6's narrow guard is fixture-verified, not a fresh
real-provider quality pass. No further paid retries were made. These results do
not establish perfect restart removal or a guarantee of no remaining dead space.

Public source, tested web/desktop builds and deployed UI are complete. The new Mac
binary remains intentionally unpublished and uninstalled until the owner restores
their notarization profile. Verification artifacts are under outputs/fit204 and
outputs/audio-final-check; private acceptance details stay in ignored outputs.


## November 26 — Shorter save labels

Shorten successful save feedback to “Saved” / “Autosaved” and the failure status
to “Not saved”; retain “Saving…” and existing persistence behavior. Update all
eight translations and the existing autosave acceptance expectation. Typecheck,
118 unit tests, production web build and matching desktop source build pass.
Mac installation/publication remains under the owner's standing notarization
deferral; verified installed/public 0.2.63 is preserved.


Complete: web 205 is live from 9afa5bc with runtime revision 4 unchanged. The
existing autosave browser acceptance passes locally and on the live site,
including delayed writes, “Saving…” and the completed “Autosaved” label. No
persistence or AI behavior changed. Desktop source builds; installed/public
Mac 0.2.63 remains preserved under the standing owner deferral.


## November 26 — Preview text dragging and magnetic timeline endpoints

Text hit areas now capture a drag directly instead of opening typing immediately.
A tap still edits text; a separate move handle remains mounted while typing so
its pointer capture survives the transition into moving. Gestures preserve one
undo boundary and support cancellation. Existing overlay resize/rotation remains
intact.

Timeline pointer moves/trims magnetize within eight screen pixels to endpoints
across video, captions/manual text, overlays and audio. Layer moves consider both
edges. Text uses projected caption timing, and main-track trim snapping accounts
for playback speed and ripple duration. Main-video moves keep their existing
gapless reorder behavior. Option/Alt bypasses magnetism; ordinary source limits,
minimum lengths and lane collision checks remain authoritative.

Typecheck, 121 unit tests, 37 desktop contracts and web/desktop source builds
pass. Added regression coverage for cross-track movement/trim, reciprocal video
and text endpoints, non-unit speed and outside-radius gestures. Browser checks
exercise direct dragging, dragging while typing, undo, tap-to-edit, reciprocal
trim snapping and existing overlay rotation/export. No provider calls are needed
for these fixture checks. Mac publication/installation remains under the owner's
standing notarization deferral; verified installed/public Mac 0.2.63 is preserved.


Complete: web 206 is live from 9e53d771791ab419e10f67969fa997337776453c,
with runtime revision 4 unchanged. All three focused local Chromium and WebKit
checks pass. The new direct-drag/typing-handle/undo/reciprocal-snap acceptance
also passes against the deployed site in both engines. Public boundary checks
pass across 987 files. The owned local QA server is stopped; installed/public
Mac 0.2.63 remains preserved under the existing owner deferral. Source is pushed
to both main and codex/desktop-migration without rewriting history.


## November 27 — Development-only workflow and isolated local environments

The owner requested a safe development environment and deliberate releases.
This supersedes the previous default to push completed work to main and publish
interface changes. Ordinary changes now stay local on codex/desktop-migration;
source backup and production release require the owner's corresponding request.
Main, Site publishing, release tags, desktop distribution and replacement of the
installed Mac app are release operations, not ordinary development steps.

Added npm run dev:setup, loopback-only web development and npm run desktop:dev.
Setup preserves existing secret files without reading them, creates a private
local encryption configuration only if missing, and applies all four migrations
only to .wrangler/development using a placeholder local D1 identity. Built-server
QA continues to use .wrangler/state. Repeated setup preserves the existing secret
file inode/mtime and reports no pending migrations. The local web landing page
returns 200 and renders correctly. Genuine local web sign-in returns the expected
503 configuration error because no developer web Publik app token was supplied;
no production credential was copied and no authentication bypass was added.

All unpackaged desktop launches now use EditAI Dev, separate userData/sessionData,
and an OS-encrypted Publik vault within that development profile. An actual
Electron smoke launch verified the application name, unpackaged status, separate
EditAI Desktop Development paths, one window, DO_NOT_TRACK=1 and telemetry=false.
The installed application and its data were not replaced or migrated. This smoke
check does not certify authenticated editing, genuine provider connectivity, a
packaged release, or installed-to-next-version updating. Source AI requests still
use the genuine hosted gateway and can consume real credits. Web HMR requests
force DNT; desktop development opts out before the genuine gate runs.

A worktree-specific Git pre-push hook rejects main/master, tags, deletions and
mixed-ref pushes unless a deliberate release push opts in. The existing shared
privacy/history hook still runs, including with release opt-in. Older worktrees
continue to resolve the original shared hook. Tests exercise protected refs,
normal development refs, explicit opt-in and rejection by a prior hook; direct
execution of the installed hook also passes. No Git push was performed. This is
a local safeguard, not server-side branch protection. PR QA was added without
any deployment/publication step. Developer documentation explains checkpoints,
source backups, local services, manual releases, API/migration compatibility and
current manual desktop update behavior.

Validation: typecheck, all 123 unit tests, all 37 desktop contracts, production web
build and desktop source build pass. The targeted Chromium landing/sign-in-entry
regression passes against a freshly started built Worker. Its authentication is
fixture-scoped and does not prove Publik connectivity. Public artifact boundary
checks pass. No paid AI inference or transcription acceptance was run. Development
and QA servers were stopped after verification. Live web 206 and the verified
installed/public Mac 0.2.63 remain unchanged; the standing notarization deferral
remains in force. All work is saved as a local development commit only.


## November 27 — Larger project deletion actions (local only)

The project delete dialog now uses its own action layout instead of the compact
editor toolbar button row. Cancel/Delete share equal width, a 52px minimum height,
15px labels and a 12px gap. Dialog copy has more readable sizing and spacing;
destructive text follows the theme background for contrast. Cancel remains the
initial focus and deletion/error/retry behavior is unchanged.

Typecheck, 123 unit tests, production web and shared desktop builds pass. The
existing project reload/delete/storage-cleanup acceptance passes in Chromium and
WebKit, including cancellation and failed-delete retry. Isolated Chromium visual
checks confirm 185x52 desktop and 144x52 mobile actions, no dialog overflow, and
retained Cancel focus. Desktop/light and mobile/light/dark screenshots were
inspected under ignored outputs/dialog-cleanup. The final dark contrast refinement
was rebuilt and visually rechecked. Authentication/AI are browser-test fixtures,
not evidence of real Publik connectivity; no paid provider call was made.
Local commit only: no push, deployment, installer release or installed-app change.


## November 27 — Skip post-install cleanup prompts (local only)

Choose the owner's leave-installer-alone option. Once EditAI is in Applications,
startup returns directly to the normal gate/app flow with no eject/delete prompt,
installer discovery, disk detach, Trash operation or welcome-marker write. Remove
the unused cleanup implementation. The initial Install and Open action, existing-
copy replacement confirmation and manual guidance on move failure remain intact.

All 37 desktop contracts pass, including six installation cases covering first
and subsequent installed launches, move/relaunch, cancellation, failed/refused
moves, replacement confirmation and development/other-platform startup. The
shared desktop source build and public artifact boundary checks pass. Installation
branch behavior is dependency-fixture verified; a new signed/notarized installer
and installed-to-next-version upgrade were not exercised or published. This is
local source work only; the verified installed/public Mac 0.2.63, live web 206 and
remote branches remain unchanged. The owner's existing development server was
left running; only the separate QA server was stopped.


## November 27 — Upload-preview playback readiness (local only)

The owner clarified that footage would not play in upload review before Send,
and that desktop-browser uploads missing on mobile were also still before Send.
Those uploads are local drafts: importFiles saves them in scoped IndexedDB, while
Send's save flow writes the remote project and attempts source backups. Localhost
and production storage are deliberately separate. Clarified the existing behavior
and current automatic backup limits in WEB-PARITY.md; no synchronization, account
identity, cloud quota, or production behavior was changed for this report.

A targeted regression reproduced a definite preview-control lock before the fix:
with the review's canplay notification withheld, real imported video metadata was
available but Play remained disabled. UploadFlow now permits a user-initiated play
request before automatic buffering finishes; metadata enables Send, and actual
playing also confirms readiness and clears a recovered playback error. Preparing
and decode-error protections remain. This addresses the reproduced lock, not a
claim that the owner's outdoor connection or physical phone was the exact cause.
Safari user-gesture behavior reference:
https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari

Typecheck, 123 unit tests, 37 desktop contracts, production web and shared desktop
builds pass. On the final freshly started built Worker, the new withheld-readiness
regression and existing multi-clip review/Send acceptance pass in Chromium and
WebKit (two per engine), using real video decoding, advancing playback and keyboard
pause/resume with fixture account/AI boundaries. No genuine AI request was made;
these tests do not prove real-provider connectivity or physical iPhone acceptance.
The read-only live error-log check returned no recent Worker errors; that does not
exclude a client-side media/network failure. No customer data or live settings were
modified. Public boundary checks pass. Saved locally only, without push, deployment,
installer publication or replacement of the installed Mac app. The user's dev
server remains running; the separate QA server is stopped after verification.


## November 27 — Percentage progress and authorized combined release

The owner requested percentage progress instead of elapsed time, removal of the
completed-task count, and production publication of this conversation's changes.
Upload processing now displays a monotonic presentation estimate between actual
stage/provider milestones, advancing through consecutive integer percentages.
Only actual completion can reach 100; the estimate is explicitly labeled in all
eight translations. The bar follows the number and retains activity feedback.
Elapsed/task-count UI is removed; real stage labels and cancellation remain.
No saved job, provider result, usage metric, or billable request is fabricated.

Typecheck, 124 unit tests, 37 desktop contracts, web and desktop builds pass.
Six focused Chromium and six WebKit cases pass, including successive one-point
increments during a held response, background/resume, caption stages, preview
readiness, source persistence and cancel/error/retry deletion. The percentage
screen was visually inspected. React review confirms effect cleanup, a single
processing timer, bounded updates, named imports, accessible progress values and
reduced-motion activity handling. Provider boundaries in these browser checks
are fixtures, not proof of fresh provider connectivity.

This release includes the prior larger deletion actions, upload-preview readiness
fix, and removal of desktop installer-cleanup prompts. Development remains local
by default after this explicitly authorized release. Apple Developer ID and the
editai-notary Keychain profile passed preflight; signed installer acceptance and
production deployment evidence will be recorded after completion.


Combined release desktop acceptance: Mac 0.2.64 is signed, notarized, installed,
and published at the verified versioned GitHub release. The source app ZIP and
CI-assembled DMG match archive 9d1b638d4904ea0f1b89e04dcbf68ff8483c776cc3b613c4c6a5224f9b29b517.
Installer CI 46117315585 passed; local disk-image assembly remains unavailable
because mounted writable images are forced read-only. The actual installed app
passes genuine gate restoration and normal LaunchServices startup, retained library,
foreground/background close behavior, preview, native/composited export, source
speech detection, editor/motion/text/workflow checks, Settings/languages and the
separately identified mascot/savings/UI fixtures with preferences restored. Final
real export took 14.064 seconds; no paid AI inference was performed. A UI-fixture
cleanup race was resolved by reloading before deleting only its owned QA project;
a fresh genuine cleanup also passed. No user project was removed.

The current download metadata selects verified 0.2.64. The older installed app
is retained under ignored outputs/release207/mac-before. Previous notarization
profile deferral is resolved. A Windows QA test identified direct Node execution
of a shebang hook as nonportable; the development guard now delegates interpreter
selection to Git and still chains the existing privacy rejection. Local tests pass;
Windows remains internal QA, without a public installer. Web deployment follows.


Release complete: public web 207 is live at https://editai.it.com from Site source
2c5c654cd65d61e677b083a6d3fcd00fb8434303, with runtime-secret revision 4 preserved.
Its source tree exactly matches public GitHub efe99ad (tree
5f6b5f79f03794326e21ca8bb6d52dcdcad03fd0). The deployed archive was saved and
published through Sites without replacing history or changing access/storage.
All six targeted hosted Chromium checks and all six WebKit checks pass for
percentage increments, removed elapsed/task count, background progress, caption
stages, preview playback and delete/error/retry/storage cleanup. These hosted
interaction checks use explicit client-side account/AI fixtures, not production
bypasses. A separate unmocked public /api/session returns 200 with the genuine
Publik gate. This establishes gate availability, not a new paid AI quality pass.

The hydrated live homepage advertises Mac 0.2.64; the DMG HEAD returns 200 and
200,957,802 bytes. The public GitHub release is not a draft and contains verified
DMG, ZIP, blockmap, updater manifest, matching native source and checksums. The
updater manifest returns 200 and version 0.2.64. A raw-HTML download assertion
was inapplicable because the platform-specific link appears on hydration; the
actual live browser link was checked against the verified versioned URL.
The installed Mac archive matches the signed/notarized app, ZIP and DMG and
passed installed genuine authentication/export and separate UI fixture gates.
No Windows installer was published. At final handoff the optional matrix QA
run remained in progress; local 124 tests/37 native contracts and the dedicated
macOS installer workflow passed. Main and development source pushes preserve
history. The prior app backup and private QA reports remain under ignored
outputs/release207. The separate built QA server was stopped; local HMR remains
available. Routine future work is still development-only unless a release is
explicitly requested.
