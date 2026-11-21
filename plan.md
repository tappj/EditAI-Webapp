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
