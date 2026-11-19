# Verification record

## What has actually been exercised

November 15, 2026. The new app is independently deployed through Sites at https://editai-web.givingarmadillo8.chatgpt.site. The original iOS project and its production Supabase functions have not been modified. The existing private marketing/waitlist website has not been modified.

`npm run typecheck` and the production Worker build pass. Fifteen model/security tests pass: source-safe split/cut/duplicate and caption anchors; atomic AI operations; crop/audio bounds; overlap-safe quiet-pause evidence; AES-GCM authentication/random IVs; cross-origin request rejection; bounded JSON; safe payment links; nullable Publik account handles; and bounded recovery of a lost one-time install credential.

Nine Playwright browser tests pass against the final production build (16.9 seconds) and public deployment version 3 (28.3 seconds), source commit `304b59dd9a9a380d77afdd322a7f8f78c813e835`:

1. Public homepage requires the Publik gate; responsive desktop/mobile layout.
2. Real browser video import, split, undo/redo, GPU exposure adjustment, square canvas, text, real MP4 export, persistent reopen, and mobile editor layout.
3. AI 402 recovery preserves the timeline (fixture error response).
4. Actual browser MediaRecorder recording, teleprompter, WebM duration repair and import, with a generated camera/audio source.
5. Image overlay + imported audio, actual exported media.
6. Batch creates independent persistent projects (AI disabled for this fixture test).
7. Deployed mutation endpoint rejects foreign-origin requests before data access.
8. Chirp upload/job/poll contract with word timestamps and transcript caching (fixture backend).
9. Actual browser-decoded reference image frames are attached to the chat request (fixture reply).

The authenticated UI tests use Playwright-only API route fixtures. They do **not** install a production authentication bypass and do **not** prove real Publik connectivity. Real video decoding, compositing, audio, WebAssembly, export and IndexedDB remain active in those tests. Generated media contains no real person's recordings.

Inspected exported file: H.264 + AAC, 854×854, 30 fps, about 4.16 seconds. A decoded output frame contains the actual source and text overlay. Images: `outputs/editor-desktop.png`, `outputs/editor-mobile.png`, `outputs/export-frame.png` (local, ignored). Decoded audio is non-silent (RMS approximately 0.070 in the main export and non-silent in the layered export). Automated camera coverage uses a generated stream; actual OS camera/microphone permission and physical-device behavior require a manual check.

The final regression caught an empty MediaRecorder output when the Mac physical audio clock froze despite a running AudioContext. Export now uses the supported silent output sink while retaining the real audio graph/capture destination, checks clock progress, rejects empty captures, and restores the prior output afterward. Final upload/edit/export and generated-camera tests pass with this change. Physical audio output remains outside automated coverage. Reference: https://developer.chrome.com/blog/audiocontext-setsinkid

## Real Publik integration status

- Hosted-web checklist approved by owner.
- Builder device approval received after completing Review → Approve in the browser.
- Listing registered: https://publikhq.com/editai-studio, `held_for_review`; public catalog URL may return 404 until Publik clears review.
- Hosted app token minted for `ai.chat` and `ai.transcribe`, stored as a secret runtime variable. No app token or install key is committed or included in frontend assets.
- Real `/installs` call returned 201. A real initial chat call returned 402 on an unlinked install, with the documented claim recovery link; no successful paid call is claimed from that attempt.
- The deployed app's real gate provisioned a browser install, and the owner completed its official claim. Publik returned `claim_state: claimed`, available credit, a stable key ID, and a null public handle. That real response exposed an account-mapping defect, fixed with verified linked-key scope and covered by regression tests.
- Real chat returned HTTP 200 and the requested connection-verification phrase. Direct Chirp upload → signed PUT → job creation → polling completed with 51 word timestamps for a 19-second synthetic recording.
- A second, unmocked browser run used the exact production Worker build with isolated local D1/R2 and the already-approved owner-test credential. It exercised real wallet authentication, plan connection, AI consent, WAV extraction in FFmpeg, authenticated streaming upload, Chirp polling, 12 caption phrases, and editor chat applying the Warm look. No browser exceptions. The official claim was completed on the live install; only its encrypted test credential was placed in the isolated test DB to avoid another human sign-in. There is no production auth bypass.
- Real server summary and full-recording editorial selection + independent review passed against Publik. A forged audio-upload ticket was rejected with 403. These checks used retained real ASR words; they did not repeat transcription.
- Browser testing exposed Google's missing upload CORS headers. The corrected app streams bounded WAV audio through the authenticated Worker using a short-lived encrypted owner-bound ticket, exact-length stream and fixed Google host; no entire video is buffered. Actual upload/job completion passed after this change.
- Follow-up live verification completed on November 15 at 19:20 UTC against the actual public URL, with normal linked-session cookies and **no API route fixtures or injected credentials**. The public app generated 51 real Chirp words and 12 caption phrases. Version 5 passed real editor chat, summary, full editorial selection/review, and MP4 export. A fresh browser restored the real project and byte-identical private R2 source. The final AI-edited export is H.264/AAC, 854×480, about 14.97 seconds. Report: `outputs/deployed-real-verification.json`; artifact: `outputs/deployed-real-ai-export.mp4` (ignored).
- A nondeterministic model reply failed the chat schema on the first public attempt. The server now includes the full output schema in the system instructions in addition to the API response format, validates before applying edits, and reports rejected edits as recoverable 502 responses. The repeated public request passed and preserved unrelated cuts/captions.
- No synthetic leaderboard activity or credit burning. Automated test context sends DNT and disables telemetry. Owner/test usage is excluded by Publik's fellowship rules.

Update this section only with observed live results. Do not describe unverified integration as complete.

## Reproducing browser checks

Install dependencies with Node 22.13+ and a compatible Playwright Chromium. Start a fresh built Worker after any rebuild; an older Worker can retain stale asset manifests. `TEST_BASE_URL` selects local or deployed tests.

Generate fixtures with `node scripts/make-fixture.mjs` against its configured local origin. FFmpeg converts the generated WebM to `outputs/fixture.mp4`; create an overlay PNG and short PCM sine-wave WAV for the layer tests. No real user videos or paid AI calls are needed for the fixture suite.

`npm run test:e2e` runs fixture tests. `node scripts/verify-live.mjs` performs a separate real authentication/AI flow; it needs human Publik sign-in and an account with available plan/grant credit. Its HTTP-only test-session state is kept under ignored `outputs/` with mode 0600. Never commit it.

For an already approved owner test install, `scripts/verify-linked-local.mjs` accepts `LIVE_TEST_KEY_HEADER_PATH` pointing to its private authorization-header file. It seeds only isolated local D1 with an encrypted credential and a random test cookie, runs a fresh production Worker on 5186, and stops it afterward. Never use this to modify production sessions. `LIVE_CONTRACTS_ONLY=1` checks summary/editorial contracts using the prior retained transcript. These are real paid test requests; run intentionally, not in CI. Reports under ignored `outputs/` contain verification results, and private browser state is mode 0600.

## WebKit acceptance

Playwright WebKit 27.2 is installed and used through `TEST_BROWSER=webkit`. WebKit testing found a Blob/File IndexedDB backing-store failure; media now falls back to 4 MB ArrayBuffer chunks with an atomic manifest, reassembly validation and deletion cleanup. Grid tracks now explicitly constrain the inspector so its lower controls remain clickable above the footer.

Ten browser checks pass locally in Chromium (17.9 seconds) and WebKit (28.4 seconds), including upload/edit/export, generated-camera recording, batch, captions/references, and a padded MP4 crossing the chunk boundary that survives a full reload and is completely removed on deletion. The generated camera fixture retains its MediaDevices object to survive WebKit's wrapper lifecycle. This validates WebKit engine behavior; physical camera/microphone permissions and an actual Safari/iPhone device check remain manual. The fixture suite does not make real AI calls.

Final public-deployment regression: version 6 (app source `7ef1caf474237e5b9c6d12d7ffacd0f6818ab910`) passed all ten Chromium checks in 27.6 seconds and all ten WebKit checks in 38.8 seconds. The deployed harness now waits for the visible signed-in studio before setting hidden file inputs; this removes a test-only race with the asynchronous sign-in gate. No AI responses are mocked in the separate deployed real-AI verification above.

## Marketing rebuild — November 16, 2026

Local implementation on `codex/desktop-migration`; not deployed or pushed. Read every supplied screenshot and sampled the 12.750167-second, 60 fps recording, including original-resolution frames at 2s and 9s. `REFERENCE_AUDIT.md` maps references to sections. Marketing UI, scoped styles, a central typed content manifest and `/sign-in` presentation were added; original editor/API/native contracts and installer verification remain intact.

Validation:

- `npm run typecheck` and `npm run build` pass.
- All 15 model/security tests and all 9 desktop contract tests pass.
- 24 browser cases were exercised in Chromium and WebKit. WebKit's full run passed all 24 in 35.9 seconds. Chromium's full run passed 23; its upload/edit/export/reopen test timed out once at 76% rendering, then passed unchanged in an isolated 6.7-second rerun. An earlier Chromium run had already passed that real media export; its only failure was an outdated assertion expecting the dashboard to hide supported Mac downloads. That assertion now checks that the sign-in surface is removed, retaining separate installer device tests.
- The final glyph refinement was followed by fresh production build/server and **all 8 marketing/media cases passing again in both Chromium (9.5s) and WebKit (8.2s)**. These cover exact title/copy, section order, real sign-in navigation, honest pending content, pricing state/disabled checkout, keyboard FAQ, sticky/active navigation, hover/focus pause, opposing loops, reduced motion, all seven viewport widths, real generated video playback, one audible player, user pause, offscreen/document visibility, canvas DPR bounds and observer/rAF cleanup.
- Inspected the actual regression export with FFprobe: H.264 video + AAC audio, 854×854, 4.173833 seconds.
- New marketing source/test lint: zero errors; eight framework advisory warnings for native `<img>` usage. Native sized/lazy image primitives are used for shared browser/Electron compatibility. Full-repository lint still reports existing editor/native/vendor errors; it is not claimed clean. Logs: `outputs/marketing/lint.log`, `lint-marketing.log`.
- Full-page captures at 1536, 1440, 1280, 1024, 768, 390 and 375 pixels show no page or headline overflow in either engine. Desktop/mobile/sign-in and individual section captures were inspected against the local references. The first product preview's CSS class collision was corrected; two-row content order, CTA contrast, explicit iOS availability, FAQ plus/minus controls and nav section coverage were refined during QA.
- Active pointer captures and section captures: `outputs/marketing/hero-pointer-left.png`, `hero-pointer-right.png`, `section-*.png`. Browser full pages: `outputs/marketing/chromium-1536.png`, `chromium-390.png`, corresponding WebKit captures and sign-in views. Full-page/section contact sheets and reference comparison remain ignored under `outputs/marketing/`. `scripts/capture-marketing.mjs` reproduces visual evidence without provider traffic. Its `visual-check.json` records browser errors and a 90-frame timing sample; timing is a local headless observation, not a physical-device performance guarantee.

Intentional content differences: factual capability cards replace unverified ratings/reviews/metrics/profiles. Branded posters replace missing authentic videos; authored, labeled web editor previews replace missing screenshots. The authentic review strip/wall infrastructure is tested with explicitly isolated fixtures. Pricing remains a clearly labeled preview with no fabricated prices/quotas/trials and disabled checkout. Terms/Google/email/password auth are not invented; existing Publik authentication and real privacy/support destinations are retained. iOS is explicitly coming soon.

These fixture browser checks do **not** establish new real Publik connectivity. No new paid AI request was made for the marketing rebuild. The credential-free local Worker returns 503 for a real session request until its existing server-side configuration is supplied; public presentation and fixture flows remain testable without credentials. Real authentication evidence above is historical and was not silently reclassified. Actual Safari/iPhone hardware, authentic owner media and live checkout remain outside this task's verified scope.

Owner insertion keys and asset paths: `docs/MARKETING.md`, `lib/marketing/content.ts`.

## Marketing publication authorization — November 16, 2026

Following local acceptance, the owner explicitly authorized pushing all changes to GitHub `main` and updating `https://editai.it.com`. The domain was confirmed active with active TLS on the existing public Sites project. The GitHub repository previously had only `codex/desktop-migration`, so `main` is created from that history without force-pushing or replacing an existing branch. The existing Sites source repository uses `main`; publication packages the exact verified source commit and retains its audience, database, media storage and runtime secrets. Historical local-only entries above describe the initial implementation phase.

## Superseding marketing design — November 16, 2026

The owner supplied `Website resources/cutai new` and explicitly removed the former value/metric, laurel/award and mini-profile block. Only the seven-feature/ribbon section is retained from the previous visual design. All ten new references were inspected before coding: eight depict the replacement site and two depict unrelated restaurant menus. `REFERENCE_AUDIT.md` records the mapping. The owner's exact scissors image now supplies the logo, PNG/ICO favicon and Apple touch icon; the full-resolution canonical copy is `public/brand/editai-icon.png`. The original E favicon and old hero-canvas module are removed.

The new flat cool-gray/cyan design includes a single full-width header, a centered editorial hero with flat opposing strips, four independently authored/labeled workflow previews, the retained feature section with redesigned icon tiles, framed owner-video slots, a factual workflow comparison, user-input planning calculator, three pricing cards, grouped FAQ and a crossed-out/circled closing headline with a quiet oversized footer wordmark. No old metric/award/profile section or vertical review wall remains in the rendered page. Real editor, auth, API, source word IDs, native logic, verified installer URL and open-source licenses remain unchanged.

Validation on a fresh production Worker:

- `npm run typecheck`, `npm test` (15 model/security tests) and `npm run build` pass.
- All **26 browser cases pass in Chromium (31.2s) and WebKit (36.6s)**. This includes all existing editor upload/edit/export/recording/storage/captions/batch/auth-popup and installer-device checks, plus new section removal/order, owner logo/favicon, workflow selection, price/cadence selection with disabled pending checkout, calculator changes and zero-clamp, categorized keyboard FAQ, full-width/active header, opposing strips, retained icon movement, hover/focus pause, reduced motion and observer disposal.
- `npm run desktop:build` and all nine desktop contract tests pass. No release binaries were replaced or published.
- Targeted marketing/source-test ESLint: zero errors; eight advisory native-image warnings. Native sized/lazy image primitives support the shared web/Electron renderer.
- Browser captures at 1536, 1440, 1280, 1024, 768, 390 and 375 pixels have no document/headline overflow in either engine. Narrow comparison tables scroll within a focusable region with a visible scroll hint; creator cards use a horizontal snap gallery. Desktop and mobile captures and every main section were visually inspected against the new references. A reproducer is `scripts/capture-marketing.mjs`; output is ignored under `outputs/new-design/`, including `desktop.png`, `mobile.png`, `hero.png`, `section-*.png`, both engines' width captures and sign-in views. Reference sheets are under `outputs/new-design-reference/`.

Content boundaries remain explicit. Creator media and reviews are not fabricated. Pricing is a presentation-ready three-card preview with no invented price/trial or checkout. Calculator results are hypothetical targets derived solely from editable user inputs, not measured EditAI time savings or creator statistics. The workflow images are labeled illustrations until authentic screenshots are supplied. iOS remains coming soon. Factual defaults and media insertion fields live in `lib/marketing/content.ts`; the updated handoff is `docs/MARKETING.md`.

Fixture browser checks do not establish new real Publik connectivity. They exercise real browser media and exports with intercepted authentication/AI responses; no production bypass or paid AI request was introduced. Physical Safari/iPhone hardware and future owner-supplied media/checkout remain outside these automated checks.

## App-icon palette and footer refinement — November 16, 2026

Replaced marketing teal/cyan accents with the owner's icon-derived pale blue, lavender and blush CTA gradient, readable indigo accents and lavender-on-ink feature tiles. The calculator's SVG now consumes the same scoped marketing tokens. Reduced the intentionally cropped footer wordmark from 300px to a 220px desktop cap and from 24vw to 20vw on mobile; lower-edge cropping remains deliberate. Editor/auth/API behavior and original logo artwork are unchanged.

`npm run typecheck`, `npm test` (15 tests) and a fresh `npm run build` pass. All seven marketing browser cases pass against that fresh production Worker in Chromium (7.9s) and WebKit (7.0s), including seven responsive widths, sign-in entry, pricing/FAQ/calculator controls and animation behavior. Inspected desktop hero, feature and footer captures plus mobile hero/footer; both 1536px and 390px checks confirm no document overflow and intentional footer-wordmark clipping. Captures, geometry and logs: ignored `outputs/brand-refinement/`. No browser page errors were recorded. Fixture authentication remains a presentation-test boundary; no new paid Publik request was made.

## EditAI blue primary accent — November 16, 2026

At the owner's request, the marketing primary accent now uses the existing editor brand colors from `app/globals.css`: blue `#598fd9`, readable control/text blue `#326ab4` and pale blue `#c4e0ff`. Headings, CTAs, navigation, feature icons, illustrated previews, calculator and selected plans follow these tokens; lavender/blush remain secondary in the unchanged owner icon and subtle decoration. The smaller intentionally cropped footer is retained.

Typecheck, all 15 model/security tests and production build pass. All seven marketing checks pass in Chromium and WebKit against a freshly started production Worker, including seven responsive widths, real sign-in entry presentation, calculator/pricing/FAQ controls and animations. Desktop hero/features/footer and mobile captures were generated without page errors under ignored `outputs/blue-accent/`. No auth/editor/API behavior changed and no paid provider request was made; fixture authentication does not establish new Publik connectivity.

## Exact bright cyan reference palette — November 16, 2026

The owner supplied a screenshot explicitly superseding the subdued editor-blue palette. Matched the browser-rendered reference accent exactly: `#11e9fb` for the highlighted headline, solid primary buttons, icon glyphs, chart and selected borders; `#0a1520` ink and `#eef2f6` paper. Added the reference's cyan button glow and cyan atmospheric sweep. Small accent text and keyboard focus retain a readable deeper cyan. Original app icon, wording, editor/auth behavior and smaller cropped footer remain intact.

The source screenshot's Color LCD profile was respected by rendering it in Chromium before sampling. Raw screenshot pixel comparison confirms both its button and the implemented button are `#11e9fb`; evidence: ignored `outputs/cyan-reference/color-match.txt`, `browser-reference.png` and `hero.png`. Desktop section/mobile captures have no page errors. Typecheck, all 15 model/security tests and production build pass; all seven marketing checks pass in Chromium (7.2s) and WebKit (7.1s) on a fresh production Worker. Fixture authentication is limited to browser UI verification and does not establish new real Publik connectivity; no paid provider request was made.

## Hero Mac installer and consistent logo accent — November 16, 2026

Added a hero Install for Mac action beside the existing web action. It reuses the existing release verification allowlist and device gate, targets the signed/notarized/tested v0.2.1 Apple silicon DMG and shows its architecture/version. iPhone, Android and iPad desktop mode do not receive a Mac installer; a narrow Mac window retains it. Header/footer/sign-in wordmark AI text now shares the bright cyan headline token. The original scissors artwork is unchanged.

Typecheck, all 15 model/security tests and production build pass. All 11 targeted browser checks pass in Chromium and WebKit: seven marketing interaction/responsive cases plus the four expanded device cases covering hero, sign-in and authenticated dashboard. The actual GitHub DMG URL returns HTTP 200 after redirects for a HEAD request; no release artifact was replaced. Desktop hero/section and mobile captures under ignored `outputs/mac-hero/` show no browser page errors. Fixture browser checks do not establish new real Publik connectivity; no paid AI request was made.

## Native EditAI palette, smooth ruler and hero-only Codex motion — November 16, 2026

The owner's native-app screenshots supersede the neon-cyan reference. Read only the requested sibling source `EditAI/EditAI/AppTheme.swift` and `ProfileUploadTheme.swift`; no sibling files were changed. Exact light-mode logo stops `90DCE8/C9BDF2/F8E894` color the complete wordmark and key headings; premium `D1F2F7/E6E0FF/FFE3D9` colors primary actions; individual `DDF1F6/EAE6F8/F7EACB/DFF2E4` fills color feature cards/icons. The original app artwork, verified Mac installer, iOS availability and cropped footer remain intact.

The calculator now has a 101-tick ruler with a traveling peaked wave, floating count and native accessible range control. One interruptible exponential animation synchronizes thumb/count, chart/axis and numeric results. Editable current/target assumptions remain available in a details disclosure, and estimates remain explicitly hypothetical. Responsive SVG geometry retains readable mobile labels. The Codex movie was re-inspected at 2s and 9s; a bounded pointer-driven circular/directional glyph field and native-color atmosphere render only inside the hero. Offscreen/hidden/reduced-motion/coarse-pointer states stop rendering, DPR is capped at 1.5, and listeners/observers/frames are disposed.

Validation:

- `npm run typecheck`, `npm test` (15 model/security tests) and production build pass.
- Full 28-case regression passes in Chromium (38.0s) and WebKit (43.9s), including real browser media upload/edit/export/restore, recording, captions, storage, auth popup/recovery and installer devices.
- After the final compact chart-label refinement, all 12 marketing/media cases pass again in Chromium (14.3s) and WebKit (15.7s). New checks observe intermediate animated values from the actual input event, ruler dragging/keyboard limits, reduced motion, genuine pointer-driven canvas pixels, hero confinement, DPR and offscreen suspension. The existing isolated component harness verifies media and complete observer/rAF cleanup. An initial WebKit animation sampler started too late after an automation round-trip; sampling now begins on the input event so it observes the transition deterministically.
- Targeted marketing/test ESLint: zero errors, five native-image advisory warnings. No new dependency or production fixture route was added.
- Desktop/mobile/section visuals and actual cursor trails were inspected. Seven viewport widths have no document/headline overflow in both engines. A separate touch context confirms no cursor animation or Mac installer. Evidence lives under ignored `outputs/hero-calculator/`: `hero-pointer.png`, `calculator-14.png`, mobile captures, logs and `inspection.json`. A 90-frame local headless sample averaged about 16.5ms with a 17.4ms p95; this is a local observation, not a physical-device frame-rate guarantee.

Fixture auth/AI checks do not prove new real Publik connectivity; no new paid request was made. No native iOS changes, release binaries or production auth/API behavior were introduced.

## Clean cursor streak and stationary fade — November 16, 2026

Corrected the hero glyph interpretation after reviewing the full Codex recording at 4 fps, 8 fps close-ups and late movement frames. The reference's loop follows a looped pointer path; it is not a radial emitter. Movement/fade observations are recorded in `REFERENCE_AUDIT.md`. Replaced the circular stamps and idle ambient glyphs with a narrow event-fed grid ribbon. Only actual pointer displacement emits cells; the draw loop only fades existing cells in place. Repeated identical coordinates and subpixel jitter do not extend their life. The bounded 480-cell trail expires after 720ms and stops scheduling frames once empty. The native palette, CSS atmosphere, calculator, Mac installer and other product behavior are preserved.

Validation: typecheck, all 15 model/security tests and production build pass. Targeted ESLint has no errors or warnings. All 13 marketing/media checks pass in Chromium (19.4s) and WebKit (19.4s). The new regression measures a horizontal trail wider than 100px and less than 40px high; verifies opacity declines and reaches exactly zero while stationary move events continue; verifies zero pending animation frames after fade; then resumes movement and checks clearing on pointer leave. Existing tests retain hero confinement, DPR bounds, offscreen/reduced-motion suspension, UI actions, responsive calculator behavior, media playback and unmount cleanup.

Visual captures under ignored `outputs/cursor-streak/` show a clean streak, fading strokes and a completely empty stopped state. The sampled opacity mass decreases from 21,617 at 14.5ms to 5,213 at 332.2ms and zero at 981.4ms after stopping; the screenshot sampler's own delays are included. No page errors were recorded. No new paid AI request, production fixture route, auth/API change or native iOS modification was introduced; fixture tests do not establish fresh real Publik connectivity.

## Hero badges, actions, ombre stars and raised comparison — November 17, 2026

Updated the paired hero badges to the supplied pill proportions, with overlapping native-color tool icons and a larger laptop icon. The message and Web + macOS availability remain factual. Web/install buttons now share a 190×48px footprint and See it in action is centered beneath them. The fixed header is transparent at the top and gains its frosted surface after 20px of scroll or when the mobile menu opens; its scroll listener is disposed. AI first cut has a permanent premium-gradient highlight, and authentic screenshot insertion fields remain ready.

Replaced the workflow label with five native-ombre SVG stars on capability cards, preserving factual product copy and marking these decorative stars aria-hidden. Approved reviews retain genuine rating semantics. A visual SVG inspection caught a paint-coordinate bug that originally made the stars look blue; object-bounding gradients now display the full aqua/lavender/gold colors, verified by rasterizing the actual rendered SVG and checking its gold/lavender pixels. Removed the hero EDIT/CAPTION/TRANSCRIBE/EXPORT metadata and creator-showcase pending line.

The comparison follows DIY / hire an editor / EditAI, with applicable reference wording and a continuous raised EditAI column, border, shadow, native-gradient top accent and stronger type. Authentic prices remain pending. The graph now labels its endpoints Without EditAI and EditAI Users, removes the duplicate legend and editing-time disclosure, and uses back every week / back every month. Per-video assumptions remain configurable in the content manifest, and the concise illustrative note explains the four-week planning month and lack of measured user results.

Validation: typecheck, all 15 model/security tests and production build pass. All **31 browser cases pass in Chromium (41.6s) and WebKit (46.9s)**, including existing editor upload/edit/export/restore, layers/audio, camera, storage, captions, batch, popup/recovery and installer devices. New checks cover badge visibility, exactly matching CTA sizes, demo placement below both actions, actual ombre SVG colors, requested removals, raised-column alignment, transparent/scrolled/returned-to-top header states and the simplified volume calculator. Cursor streak/fade/idle cleanup and media/motion regressions remain active. Targeted ESLint: zero errors and four native-image advisories.

Desktop, mobile and section captures were inspected under ignored `outputs/hero-polish/`; inspection reports no page errors or document overflow, no removed graph legend and no editing-time controls. Fixture authentication/replies remain browser-test boundaries and do not establish new real Publik connectivity. No paid provider call, native iOS change or production auth/API bypass was introduced.

## Authentic workflow screens and disappearing-card fix — November 18, 2026

Replaced all four rendered illustrative previews with the supplied full-frame Upload, Send, AI Edit and Export PNGs. The unavailable attachment name Edit.png was resolved to the actual local AI Edit.png. Canonical public copies are under `public/marketing/workflow/`; all are 1170×2532 and byte-for-byte identical to their inputs. Originals remain at their local input paths. Explicit dimensions, natural aspect ratio and object-fit contain preserve the whole screen. Titles/captions follow Upload → Send → AI Edit → Export. AI Edit is highlighted through gradient text alone; featured pill/border/shadow styling is removed.

Reproduced the reported bug on the live domain before changing code: all four workflow cards had opacity 1; selecting Review removed the manually added revealed classes from the old/new active cards and both settled at opacity 0. The observer had already unobserved them. Reveal completion now lives in a data-revealed attribute independent of React's className updates, fixing this root cause for both workflow and pricing selections.

Typecheck, all 15 model/security tests and production build pass. All **33 browser cases pass in Chromium (47.0s) and WebKit (53.0s)**, including new regressions that repeatedly cycle the four step titles, sample opacity across animation frames beyond the longest stagger, scroll away/return, verify all four decoded image dimensions/URLs/proportions and text-only AI Edit highlighting, and confirm pricing cards remain visible while plans change. Existing editor media/export/storage, authentication, installer, calculator, header, cursor fade and teardown checks remain active. Targeted ESLint: zero errors and four native-image advisories.

Desktop section and mobile captures were inspected under ignored `outputs/authentic-workflow/`, including the original live reproduction JSON, natural-image checks, unmodified-copy verification and mobile report. There is no document overflow or browser page error. These browser tests use fixture authentication/replies and do not establish new real Publik connectivity; no new paid provider request, API/auth bypass or sibling iOS change was introduced.


## Owner savings badge — November 18, 2026

Recreated the supplied hero pill using the four owner-provided portraits in their supplied order and the exact copy “saved 250+ hours of editing,” with the figure in bold. Native JPEGs are copied byte-for-byte into public/marketing/avatars; face framing uses configurable CSS crops, white circular rings and overlap. The Web + macOS badge, existing actions and editor behavior are preserved. The supplied figure is fixed content, with no synthetic counter.

Typecheck, all 15 model/security tests and production build pass. All **17 marketing/media browser cases pass in Chromium (22.6s) and WebKit (26.3s)** against a freshly started built Worker. The badge regression verifies exact copy, bold figure, four decoded 1080px images, square circular frames and ordered overlap. Existing seven-width overflow, responsive navigation, workflow selection, pricing, calculator, cursor fade and media lifecycle checks remain active. Targeted ESLint reports zero errors and five native-image advisories.

Desktop and 375px mobile screenshots were visually compared with the supplied reference under ignored outputs/portrait-badge; the inspection reports no page errors or document overflow. Authentication is fixture-scoped for these UI checks and does not establish fresh real Publik connectivity. No paid provider call or production API/auth change was introduced. Changes remain on codex/desktop-migration under the latest owner-supplied AGENTS.md; main and the public deployment are unchanged.


## Hero and review copy — November 18, 2026

Changed the gradient hero line to “edited videos in minutes.” and the review-placeholder footer to “Reviews coming soon.” Typecheck, all 15 model/security tests and production build pass. The existing layout/sign-in and seven-width responsive checks pass in Chromium and WebKit (two cases per engine). A direct browser check confirms the exact headline and all 24 repeated placeholder footers; inspected desktop/mobile captures under outputs/marketing-copy have no document overflow. These UI checks use fixture authentication and do not establish fresh Publik connectivity. Main and the public deployment remain unchanged under the current branch restriction.

## Native app pricing alignment — November 18, 2026

Matched the website pricing to the sibling iOS app's read-only `OnboardingState.swift` and `OnboardingPaywallView.swift`: Starter / Pro / Ultimate, 10 / 100 AI edit starts / unlimited AI edits per month, and their editor/transcription/caption/batch benefits. U.S. monthly prices are $9.99 / $19.95 / $49.99; annual totals are $79.90 / $159.00 / $399.00 with native monthly equivalents $6.65 / $13.25 / $33.25. Annual totals remain visible beside the monthly equivalent. Local App Store pricing is confirmed in the app; website checkout remains unavailable and web/macOS Publik access is disclosed separately. No iOS source was modified.

Typecheck, all 15 model/security tests and production build pass. Three targeted browser checks pass in Chromium and WebKit against a freshly started production Worker: exact tier prices/allowances and cadence switching, seven-width responsive coverage, and selection visibility. Fixture authentication is scoped to UI checks and does not establish fresh Publik connectivity; no paid provider call was made.

## Web/desktop Publik pricing and personal-key onboarding — November 18, 2026

Supersedes the preceding iOS-pricing presentation for the fellowship web/desktop entry. Marketing now offers free EditAI editing, Publik Basic ($8/month plus taxes/fees), Publik Pro ($20/month plus taxes/fees), and a personal OpenAI API-key path. Prices and trial terms were checked against https://publikhq.com/pricing; the page links there for current terms. Comparison and FAQ distinguish separate iOS subscriptions. Entry links lead to the existing genuine Publik gate; no login bypass or shared visitor key was added.

Saving a personal OpenAI key now atomically selects own-key mode. Desktop persists that choice through its OS-encrypted credential store. A ready own-key session without a saved key opens Settings automatically. Settings explain direct OpenAI billing, separate ChatGPT billing, provider-specific consent and desktop/local versus hosted/server encrypted storage. Personal testing instructions are in docs/desktop/PERSONAL-TESTING.md.

Typecheck, all 15 web model/security tests, production web build, desktop build and all 10 desktop tests pass. The added isolated API test uses a real local SQLite store and encryption: saved key ciphertext, provider selection, OpenAI-only chat/transcription URLs, word timestamp request, and refusal of unclaimed sessions are checked with fixture provider transport. Four targeted browser checks pass in Chromium and WebKit against a fresh production Worker, covering pricing/entry links, responsive widths, revealed cards and missing-key setup/save/reload. These fixtures do not prove a real OpenAI call or new Publik connectivity. No personal API key was supplied during these automated checks.

Additional marketing regression exposed stale headline/FAQ assertions, which were updated to the existing hero copy and new subscription FAQ. Those two checks pass. The wider marketing run also reports an unrelated existing hero action width mismatch (2.40625px versus the test's 1px tolerance); the hero button CSS was not changed in this work. Targeted pricing, responsive and own-key checks above pass. GitHub Desktop QA run 44465746779 passes the web build and native macOS/Windows jobs.

Desktop 0.2.2 is now public with signed/notarized DMG and ZIP, updater metadata, matching native source and checksums. The actual DMG URL returns HTTP 200. Website download metadata targets 0.2.2. Installed real-auth/export acceptance is recorded in docs/desktop/VERIFICATION.md. The Pro owner's personal station is set to own-key mode with usage sharing off, and awaits account-side API credit activation and key entry; no OpenAI credit purchase, ChatGPT token reuse or real OpenAI call was performed.

## Shorter raised-choice onboarding — November 19, 2026

Inspected the owner's `Website resources/onboarding.mov` with a full-sequence contact sheet and closely sampled transition frames. Adapted its raised surfaces, circular selection controls, segmented progress and short motion to EditAI's existing gradients and desktop two-column choice dimensions. Removed the first two video/demo steps and their unused cut simulation, retaining all five EditAI questions, animated monthly estimate, studio guide and genuine account gate. Saved welcome/demo drafts migrate to the first question; later saved steps and answers persist. Onboarding remains explicitly light regardless of OS or studio theme. The desktop gate uses the same shared component and retains the EditAI wordmark.

Typecheck, all 16 web unit/security tests, all 11 desktop tests and production web/desktop builds pass. Six targeted production browser checks pass in Chromium and WebKit, covering initial question entry, legacy-draft migration, answer persistence and back navigation, Google-to-Publik handoff, free studio/Home, sign-out routing, marketing entry and responsive layouts. The built desktop gate passes its full shortened funnel and sign-in/free actions with an isolated fixture IPC bridge. Desktop and 390px/1440px web screenshots were inspected under ignored `outputs/`; no horizontal overflow. Additional browser inspection confirms press transforms, directional page entrance and reduced-motion disabling. Optional `navigator.vibrate` feedback is feature-detected and guarded; real hardware haptics are device-dependent and were not exercised on this Mac.

Browser authentication and desktop IPC are fixtures and do not establish fresh real Publik connectivity. No paid AI request, authentication bypass, production secret change or sibling-project edit was introduced. This updates shared desktop source/build; the public signed installer remains 0.2.2 until a separate installer release.
