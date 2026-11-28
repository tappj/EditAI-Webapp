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

### Restore original EditAI presentation — November 19, 2026

At the owner's correction, restored the pre-CutAI onboarding styling from d5701b3: original icon tiles, flat pastel choices, corner selection checkmarks, centered headings and bordered white panel. Retained the segmented progress bar at the top, eight-step sequence and existing motion accessibility. Shared web/desktop styling is updated. Typecheck, 16 unit/security tests and both builds pass; both onboarding regressions pass in Chromium and WebKit against a fresh production Worker. The built desktop gate passes its fixture handoff check and the restored desktop screen was visually inspected. These fixture checks do not prove new Publik connectivity; the public desktop installer remains 0.2.2.

## Editor suite native interaction parity — November 19, 2026

Read the sibling editor's current Swift views, timeline/session model and chat
operations, plus its editor/core-editing/caption documentation. The current Swift
`makeOverlay` moves the selected source clip while retaining another main clip;
the older documentation's copy behavior is superseded. The iOS checkout is
read-only. Feature mapping and remaining platform differences are in
`docs/WEB-PARITY.md`.

Implemented upload-to-automatic-first-cut entry, safe error/cancellation fallback,
original-timeline Undo, a visible proportional timeline playhead, source-frame
thumbnails, ruler scrubbing, zoom, grouped edge trims and clip reordering. Left
trims keep the opposite edge fixed during the drag and close the gap on release.
Text/overlay/audio rows support moving, source-bound trimming, split, duplicate
and delete; audio respects its neighbors on three lanes. Selected visual layers
can be moved and resized on the preview. Main-track image append, independent
layer decoders, overlay/audio speed and volume, audio replacement/mute, project
font defaults/style scope and fullscreen preview use the shared browser/Electron
renderer. The request-based EditAI button replaces the manual best-takes CTA and
uses all 29 native operation names with actual imported layer context and atomic
validation. Home and Edits layouts are unchanged; the focused editor returns via
My creations.

`npm run typecheck`, **21 unit/security checks**, **11 desktop checks**, production
web build and desktop build pass. The desktop compositor regression now mutes
the main track, includes both retimed overlay sound and imported audio, exports
through real FFmpeg, and verifies audible output with volumedetect. New component
and timeline-helper ESLint checks pass. Existing broad editor-file lint debt is
not claimed clean.

Fixtures were freshly generated with `scripts/make-fixture.mjs`, then FFmpeg
converted the browser recording to MP4 and generated the PNG/PCM sound assets.
Browser auth and provider results are intercepted only in Playwright. Because
upload now invokes AI automatically, the suite explicitly intercepts the default
AI failure boundary too; specific AI tests override it. An earlier test fell
through to the unconfigured local Worker and left Chromium's font request
pending; that is not evidence of a configured provider failure. Font preparation
is also cached per player and requested only when the set of text fonts changes.
A direct gesture test was corrected to scroll the trim grip into view before
using mouse coordinates after clicking Undo.

No production authentication bypass, fabricated production AI response, secret
read, paid provider call, push, merge, hosted publication or signed installer
release was performed. Fixture acceptance does not establish fresh real Publik
or OpenAI connectivity, installed desktop release acceptance, actual Safari
hardware behavior, or equivalence to AVFoundation HDR/frame timing.

Final production-browser acceptance: **all 23 studio cases pass in Chromium
(36.7 seconds) and WebKit (53.7 seconds)** against a freshly started built Worker
on port 5181. This includes automatic first-cut entry with exactly one fixture
transcription/edit request, original restoration with Undo/Redo, actual source
layer context in EditAI requests, both trim grips/opposite-edge geometry,
selection without seeking, preview manipulation, image append, global typography
inheritance, imported-audio replacement/mute, real MP4 exports, storage recovery,
recording, cached Chirp jobs, visual references and existing Home/Edits/auth flows.
Desktop/narrow captures were inspected under ignored `outputs/`; the emitted
regression MP4 was probed as H.264 + AAC, 854×854, 4.169 seconds. The new component
lint and `git diff --check` pass. Historical live-provider evidence above is not
reclassified as verification of this change.

## Consent and library persistence across sign-out — November 19, 2026

Root cause: sign-out deleted the install credential. For linked Publik wallets
without a public account ID/handle, ownership falls back to that verified key ID;
a new install therefore looked like a different account, hiding saved projects
and their existing consent. The live database still contains five project rows
across four owner scopes and three source-asset rows; this observation does not
establish that every missing original was uploaded or associate those scopes
with one person.

Sign-out now revokes the active session by rotating its server-side bearer and
retains the encrypted connection behind a separate HTTP-only, Secure, SameSite
cookie. A signed-out visitor cannot read projects. Explicit Continue re-runs the
genuine Publik wallet gate, restores only the matching verified owner, and rotates
the active session. Use another account forgets the connection without deleting
projects or source media. Allow and decline both remain persisted in account
preferences. Desktop pauses telemetry and retains its OS-encrypted install until
explicit account switching; matching-owner personal-key settings survive local
session recreation. Settings disclose remembered-connection behavior.

The client flushes the current edit before sign-out, captures IndexedDB ownership
before asynchronous writes, and cancels stale account-library synchronization.
This prevents the final edit or a delayed response being written under a later
account's storage scope. Original media is retained across session changes.

Validation: typecheck, 21 web unit/security tests, all 12 desktop checks and both
production builds pass. A new backend integration test uses real SQLite, AES-GCM,
local bucket bytes and cookie rotation with fixture provider transport: allow /
decline persistence, original-byte retrieval, old-session rejection, explicit
resume, revoked-key rejection, and other-account isolation all pass. Full studio
Chromium: 24/24 (40.2s). WebKit's preceding 23 cases pass; its new resume case
initially needed a more specific marketing Sign in selector. Final sign-out and
resume checks, expanded to split immediately before logout and verify that edit
on return, pass in Chromium (2 cases, 3.7s) and WebKit (2 cases, 11.5s) against the
fresh final build. Authentication/provider fixtures do not prove a new live
Publik sign-in.

Recovery boundary: old sessions already deleted by the previous implementation
cannot be safely mapped to a new handle-less install. This change prevents that
loss of association going forward; it does not silently merge old owner scopes
or promise recovery of originals never backed up. A stable public account ID or
handle still permits account-scoped lookup across installs; otherwise the
retained same-device connection is required. Existing cloud file/quota limits
and browser-clearing limitations remain disclosed.

## Reference studio workspace — November 19, 2026

Applied the supplied desktop editor references to the editor suite only, retaining
EditAI's existing components, branding and pastel colors. The compact header,
source thumbnail grid, media search/filters, real import/append controls, center
monitor, right inspector and full-width layered timeline replace the old workspace
distribution. Numbered captions and expandable text styling retain existing editing
actions. Sequential automatic captions share a lane; overlapping captions and
manual text retain independent lanes. Track gutters, zoom buttons and the visible
playhead use matching timeline coordinates for seeking and drag edits.

Waveforms are derived from actual source audio across all channels, lazily decoded
for visible clips, serialized and cached as peaks. Sources over five minutes or
32 MiB omit this optional decoration, as do unsupported codecs; no synthetic peaks
are shown. Playback and export remain independent of thumbnail/waveform decoding.
Source word IDs, editorial validation, account persistence and Home/Edits layouts
are unchanged.

Typecheck, 21 web unit/security tests, 12 desktop tests, production web and desktop
builds, and lint on the three new/updated editor components pass. Chromium passes
all 25 studio scenarios, including real MP4 export and the new media/caption/audio
layout scenario (40.5s); WebKit also passes all 25 (1.3m) against a freshly started
production Worker. Screenshots inspected at 1440x900, 1280x720 and 390px mobile are
under ignored outputs/studio-reference-*.png. Layout checks require the monitor,
inspector and timeline to fit the desktop viewport and prevent mobile horizontal
overflow. Authentication and AI use test fixtures; these checks do not establish
fresh real Publik connectivity. The shared desktop source is updated; the public
signed installer remains 0.2.2.

## Editor surface corrections — November 19, 2026

Corrected encoded thumbnail proportions, including portrait video, and removed the
blue padding around clip filmstrips. Video/overlay media fills the strip. Video
waveforms are removed; audio waveforms use actual decoded peaks extending upward
from a baseline. Occupied timeline rows alone have a faint backdrop ending at the
video duration, before the append button. Removed the track gutter border bump,
zoom slider/buttons, duplicate tool strip, clip count, jump/reorder arrows and
Rebuild automatic cut. That action reran the initial AI selection; automatic first
cut on import and request-based EditAI chat remain available. Centered playback
uses a plain triangle. Timeline supports trackpad ctrl-wheel pinch and Safari
gesture events, with the zoom anchored under the gesture.

Manual Text and Auto captions now have separate tools. The text inspector has a
blue add button and editable text, with searchable real font samples and style
previews rather than font-name dropdowns or numbered timestamp boxes. Font samples
start with 12 choices and expand on request. Curved undo/redo controls have explicit
hover descriptions, as do split/duplicate/delete. Fixed uppercase Shift+Z handling
for keyboard redo. A top-corner help dialog documents supported tools/shortcuts
with keyboard focus trapping and Escape dismissal.

Extract audio uses the existing real web/native FFmpeg pipeline to create a WAV
source for the selected source interval. It preserves clip speed, project position
and volume on an available audio lane and mutes the video atomically. The original
file stays intact. Saved media is retained through undo/redo and project reopening.
Returning to My creations now flushes edits and refreshes its project snapshot,
fixing a stale card that could reopen the pre-extraction version immediately after
an edit. No provider/authentication or editorial word-ID contract changed.

Typecheck, 21 web tests, 12 desktop tests and web/desktop production builds pass.
Browser coverage includes real extraction/export, source trim/speed alignment,
button and keyboard undo/redo, pinch zoom, help, persistence, portrait thumbnail
aspect ratio, full-height filmstrips, centered playback and hover descriptions.
The extracted-audio export is H.264/AAC and non-silent. Provider/authentication
fixtures remain explicit; this does not establish fresh real Publik connectivity.
Shared desktop source is updated; the signed downloadable installer remains 0.2.2.

All 27 studio cases pass in Chromium (45.6s) and WebKit (1.6m). The final rail-width
and fallback-copy refinement passes all three targeted layout, extraction and
portrait checks in each browser after a fresh build/server restart. Portrait/source-strip and text-style
screenshots are inspected under ignored outputs/. UI component lint has no errors;
the pre-existing Wordmark img performance advisory remains.

## Direct media editing — November 20, 2026

Delete and Backspace share the toolbar's deletion action for selected main clips,
text, overlays and audio. Typing fields, modal dialogs and active operations keep
their own keyboard handling. The final main clip remains protected. Drag cancellation
handles Escape, deletion, window blur, pointer cancellation and outside drops; a
stale drag cannot overwrite a later document edit.

Source cards carry project-local source IDs through native drag data. Timeline
rows accept these or real File objects from the OS. Video/images insert at the
nearest clip boundary, sound enters a free audio lane, and overlay-row drops place
overlays. Multi-file insertion advances from the actual inserted boundary. The new
placement helper validates complete documents, respects source/media bounds and
does not rewrite existing source word IDs. Existing ingestion, persistence and
cloud backup paths handle external files; there is no fake upload or auth bypass.

Reordering renders a lifted thumbnail/name ghost and insertion marker while the
original row remains in place. Only an inside release commits the reorder; outside
returns to the original. Main trims mask/offset fixed source-wide filmstrips rather
than shrinking images or re-sampling the trimmed range. Adjacent clips close the
gap on release. Frames are lazily shared per source/range to avoid duplicate decode
jobs across many cuts; the cache holds at most 48 completed sets. Library samples
use original proportions up to 1280x720, timeline samples up to 164px high, JPEG .9,
and 12 source-wide samples; static images keep their original URL.

Playhead position uses a compositor transform updated on browser animation frames
from the real player's clock, independently of the 100ms app time-label updates.
The cursor itself can be grabbed to scrub; pointer seeks paint its position directly.
This follows available browser frame cadence rather than promising a device FPS.
The new cadence test samples 12 actual browser frames with a longer real clip;
storage/resume checks navigate away to pause rather than racing a short clip's end.

Visual changes: pastel logo-colored EditAI button background, aligned one-line
Captions label with a small sparkle, Text inspector heading, actual file size below
source names, centered append icon, no source note/separator, and no timeline options
bar. Home and Edits appearance remain unchanged. Ignored screenshots include
outputs/editor-drag-lifted.png and outputs/editor-media-drop.png.

Typecheck, 22 model/security tests, 12 desktop checks, both production builds and
lint on the changed editor components/placement helper pass. Browser tests cover
keyboard deletion/typing isolation, drag cancellation/reorder commit, fixed filmstrip
width during trims, library drag, real video/audio File drops, frame cadence and
caption-tab alignment, alongside existing real exports and account persistence.
Provider/authentication fixtures remain explicit; these checks do not establish
fresh real Publik connectivity. Shared desktop source is updated; the public signed
installer remains 0.2.2.

Full studio regression: Chromium 30/30 (49.3s), WebKit 30/30 (2.1m). Final drag
cancellation guards pass four focused checks in Chromium (6.0s) and WebKit (27.4s)
after the final production rebuild, including Delete during a lifted drag followed
by mouse release without resurrecting the deleted clip.

## Text and precision controls — November 20, 2026

Trim controls are mounted only for the selected item, avoiding both visual clutter
and invisible keyboard stops on small clips. Removed PREVIEW from the monitor.
Visible text can be tapped on the canvas to edit it in place; blur or Cmd/Ctrl+Enter
commits, Escape cancels, and typing remains isolated from timeline deletion keys.
Compact corner grips scale text and edge grips change box width/height and position.
The round resize dot is removed. Optional boxHeight is bounded and honored by the
real preview/export renderer. Imported sources and source-word IDs remain intact.

Extract audio now creates a source-range audio reference synchronously instead of
encoding/uploading a second WAV. It keeps sourceStart, speed, volume and placement,
mutes the main clip and remains one undoable edit. Playback/export use the existing
independent media/gain paths; there is no progress modal, new source upload, or paid
provider request for extraction. Real extraction/export tests verify source range,
non-silent audio, undo/redo and reopening with the original video source reference.

Waveforms cache up to 16,384 real RMS bins per source and render a continuous upper
envelope with point count adapted to clip width (64–8,192). Zoom changes visible
detail without decoding again. Lazy serialized decoding is capped at five minutes
and 128 MiB, with unsupported codecs omitting the optional waveform. No synthetic
peaks or mirrored lower waveform is used.

Clicks in clips and empty timeline space seek directly. The cursor line allows
pointer events through to clips; its top cap remains draggable, preventing it from
intercepting a repeated clip drag at the same position. Informational notices expire
after five seconds, errors after eight, while retaining manual dismissal and links.

Track allocation is capped at 3 audio, 7 text and 7 video-overlay lanes. Sequential
items reuse lanes. The shared allocator validates concurrent occupancy and explicit
lane bounds. Collision drags first stop at neighbors; continued movement beyond a
24px blocked-distance threshold can occupy another available lane. A full set stays
constrained. AI/application edits are validated atomically and cannot exceed limits.

Typecheck, 24 model/security tests, 12 desktop tests, both production builds and
changed-component lint pass. All 31 studio scenarios pass in Chromium (55.0s) and
WebKit (2.1m), with real exports and local media active. The new browser scenario
checks selected handles, direct text editing, corner/edge geometry, instant extraction
without a modal, zoom-dependent waveform points and timed notice dismissal. New
model tests cover collision/continued movement, full-track behavior, seven-track
acceptance and eighth-track rejection. Authentication and AI remain explicit test
fixtures; these checks do not prove fresh real Publik connectivity. Shared desktop
source is updated; the downloadable signed installer remains 0.2.2.

## Guided desktop installation — November 20, 2026

Added the packaged-Mac Install and Open/relaunch flow, existing-install confirmation, optional disk-image eject/Trash cleanup and clearer installer instructions. Validated in an isolated checkout: typecheck, 24 web tests, 18 desktop tests and both builds pass. App/DMG signing, Apple notarization, Gatekeeper, packaged self-test, exact CI image identity and native mounted-image discovery pass. Installed 0.2.3 and preserved the prior app. Public release remains 0.2.2 pending the owner's actual first-run privacy choice and the release script's installed-app export acceptance. No consent was chosen for the owner. Detailed evidence and limits are in docs/desktop/VERIFICATION.md.

## Selected inspector and crop — November 20, 2026

Clip/Text/Filter replaces the Layers inspector. Selection controls one media item;
opacity stays in Clip, Extract audio follows Volume, and the caption rail reads Auto
without a sparkle. Filter thumbnails decode the selected source and display the
existing native presets. Compact playback/filter/adjustment/crop resets remain;
focused or hovered sliders support R, documented only in Help. Split, Duplicate and
Delete use short action labels.

Section navigation measures the sticky inspector tabs and positions the complete
category heading below them. Direct crop handles/pinch map display-space rectangles
back into source coordinates across all rotations/flips. Overlay corner scaling and
independent side stretching persist dimensions used by the actual compositor.

Typecheck, 25 model/security tests, 18 desktop tests and web/desktop production builds
pass. Browser coverage includes heading visibility at 1440×900, 1280×720, 1024×768
and 390×844, real filter previews, focused/hovered R resets, manual crop and reset,
rotation, selected-only overlay controls, opacity reset and independent edge resizing.
Authentication and AI responses in these browser checks are fixtures; they do not
prove fresh real Publik connectivity. The shared desktop source/build is updated;
this change does not publish a replacement signed installer.

All 32 studio scenarios pass in Chromium (59.4s) and WebKit (2.3m) against a freshly
started production Worker. Changed-component lint has no errors; the existing
Wordmark image optimization advisory remains. Home/Edits appearance is unchanged.

## Inline microphone and editor toolbar — November 20, 2026

My Edits replaces My creations in the studio. The title and pencil open a centered
rename input; Enter/blur commit, Escape cancels. Timeline history and microphone sit
at left, split/duplicate/delete at right; the redundant Add media action is removed.
Microphone recording requests audio-only default-device access on click, shows a red
indicator and saves a real mono WAV at the recording's starting cursor position.
Stopping, leaving the editor and the bounded duration timer release capture tracks.
The callback uses the current document so edits made during recording survive.
Audio supports seven lanes across insertion, rendering, gestures, validation and AI.

Typecheck, 27 unit/security/model tests, 18 desktop tests and web/desktop builds pass.
The new browser case verifies denied permission/retry, real MediaRecorder encoding
of a generated audio stream, WAV decode and waveforms, current text edits surviving,
placement, undo/redo, title commit/cancel, centered title and responsive overflow.
Unit checks cover WAV header/signed PCM and seven-lane acceptance/eighth rejection.
Microphone input in automated tests is a generated stream; actual OS permission UI
and a physical microphone remain device checks. Authentication and AI remain test
fixtures and do not prove fresh Publik connectivity. Shared desktop source/build is
updated; no replacement signed installer is published by this change.

All 33 studio scenarios pass against the fresh production build in Chromium (1.1m)
and WebKit (2.4m), including real existing media export and microphone-generated
recording checks. Changed-component lint passes without errors. The deployment
verification script now follows the renamed My Edits action.

## Slider and text refinement — November 20, 2026

Adjust and Reset share one row. Shared editor sliders use slim rails/vertical thumbs,
major/minor ticks, free precision, exact numeric entry and release-only snapping near
major marks (Alt bypass). Speed/volume retain their steps; R resets remain supported.
Text starts with an empty stored value and a Text display placeholder. Both inspector
and preview typing replace the placeholder. Entry/exit animation cards show labeled
animated samples and respect reduced motion. Text/outline/background/shadow colors
have native full-color pickers and exact hex entry.

Internal Ctrl/Cmd+C/V copies the selected media/text layer into the same edit at the
cursor, with fresh item IDs and preserved source references/word IDs. Typing fields
retain native copy/paste. Placement respects audio/text/video lane limits and rejects
invalid pastes atomically. All paste/delete changes are undoable. Text fully past the
video is removed on opening or shortening; partial text is clipped to the video end.
Dropping text wholly into the timeline void deletes it; outside-suite drops cancel.

Typecheck, 30 model/security/unit checks, 18 desktop checks and both production builds
pass. New model coverage verifies text cleanup, copied source ranges/word IDs and
bounded paste placement. The new browser scenario checks compact reset alignment,
fine slider values, snap/bypass, placeholder typing, animation selection, custom hex,
copy/paste/undo, void-drop deletion and restoration. Authentication and AI remain
fixtures; these UI checks do not prove fresh real Publik connectivity. Shared desktop
source/build is updated; this change does not publish a new signed installer.

All 34 studio scenarios passed in Chromium. WebKit passed 33 in the full run; its
existing microphone scenario hit the fixture's three-second auto-stop while editing.
Using two real fixture clips gives that check adequate recording time; it then passed
in isolation. The new refinement scenario also passes after the final theme/compact
value CSS corrections in both engines. Screenshots of the actual increments and
animation/color panel were inspected. Changed-component lint has no errors, with
only the pre-existing Wordmark image optimization advisory.

## Timeline track order — November 20, 2026

Moved overlay rows above the main video and captions/text rows below it, keeping
audio last. This changes row rendering order only. Typecheck, 30 unit/model/security
checks, web build and shared desktop build pass. The existing real overlay/audio
import/export browser check passes against a fresh production build with fixture
authentication; it does not prove fresh Publik connectivity.

## Inspector layout, numeric drafts and magnetic sliders — November 20, 2026

Shared web/Electron editor changes remove Adjust/Filters/Overlays from the left
rail and Precision trim from the inspector. Filter contains adjustments and opacity;
Crop and Overlays sit next to Split/Duplicate in the timeline toolbar. Opening the
overlay library preserves the right inspector. An empty overlay row accepts initial
source drops; library mode does not override the user's chosen destination row.

Numeric fields retain temporary blank/incomplete drafts, commit valid in-range
numbers on Enter/blur, revert invalid values, and cancel with Escape. Volume and
all opacity controls display percentages, speed has a separate fixed x, and numeric
displays use at most two decimal places without rounding stored typed values.
Dragging snaps within nine pixels of major marks, endpoints and the neutral value;
Alt bypass and exact numeric entry remain available. Speed/volume have symmetric
increasing tapered tracks. Search focus uses the surrounding border without an
inner outline or shadow. Adjustment reset also resets opacity atomically.

Validation: typecheck, all 30 web model/security/unit tests, all 18 desktop tests,
and both production builds pass. Changed-component ESLint has no errors and only
the existing Wordmark image advisory. Fresh production Worker on port 5191, freshly
recorded fixture via scripts/make-fixture.mjs and FFmpeg conversion: WebKit passes
all 35 studio cases (1.5m). Chromium passes 34 in the full run (1.3m); the remaining
extraction case still referenced the intentionally removed Precision trim. Updated
it to use keyboard-operated timeline handles and verify the actual trimmed source
range; its unchanged product code then passes extraction, reopen and real MP4
export in a focused rerun (5.9s). All 35 Chromium scenarios have therefore passed.
The three focused inspector/slider cases also pass in both engines. Actual final
wedge controls were visually inspected. Logs/capture: outputs/control-*.log and
outputs/editor-wedge-controls.png (ignored).

Authentication and AI are explicit fixtures in these browser checks; they do not
prove fresh Publik connectivity. No production auth bypass or fake AI response was
added. The shared desktop build is updated; this task does not publish a new signed
installer or hosted deployment. The owner's newer standing instruction authorizes
committing/pushing completed work to main, superseding the older branch restriction.

## Portrait media, caption settings and nonmodal feedback — November 20, 2026

Moved six/four/single-word grouping exclusively into Auto captions and use the saved
format when generating captions. Auto uses one panel surface. The text-add plus is
black inside its pastel button; reset icons retain their theme contrast. EditAI's
pastel tool fills the entire rail cell with a dark icon/label and no blue selection
border. Style-reference upload validates image/video MIME types and displays an
actual decoded JPEG frame for either kind. Quick prompts are Add captions, Give it
a warmer look, and Make the cuts more relaxed. Source-bound chat instructions
explicitly restore natural pauses/fillers/lead-ins using trim/addClip, preserving
unrelated edits and rejecting fabricated footage through existing atomic validation.

Source and project previews are 4:5 with full media visible. Image-first projects
also render an actual image. Read the native CreationsView grid/list implementation
without modifying iOS; the shared Edits page now has a persistent grid/list toggle
with thumbnail, metadata and actions in each row. Recording defaults to 9:16 and
supports 1:1, 16:9 and 4:5. Canvas capture crops the actual recording, keeping original
microphone audio; the preview uses the same centered crop. Recorded takes have real
thumbnails. Camera/capture tracks, frame loops and thumbnail URLs are released.
Canvas aspect ratio/framing are in Clip settings; monitor expansion is at the left.

Only AI operations use the progress dialog. Import/open/export/profile/preferences/
reference preparation/backups use compact bottom-left status, progress and cancel
controls, followed by temporary notifications. Simplified errors omit the redundant
heading. Routine operations do not capture modal focus. Serialize asynchronous jobs;
media additions merge into the latest document after decoding and avoid overwriting
another project's state. A browser regression adds text in the same event as import
and confirms both the new source and text survive.

Validation on the final shared production builds: typecheck, all 31 web unit/model/
security tests, all 18 desktop tests and web/desktop builds pass. Changed Recorder,
ProjectCard, SelectedMediaInspector and reference helper lint has no errors, with
one framework img advisory. Final fresh Worker runs on port 5192. WebKit passes all
37 studio cases (1.6m), including real recording/import/export and the two new
workflows. Chromium passes 36 in the full run (1.3m); the existing export test still
looked for canvas controls while Filter was selected. Updating it to open Clip
passes the real export/reopen case in a focused rerun. The final five affected
Chromium cases pass again after the last dark-theme CSS fixes (13.7s). All 37
Chromium scenarios have passed across those runs. The new model test restores a
removed source-word range, retains original word/source/segment IDs and appearance,
regenerates its captions, and verifies atomic rejection beyond source duration.

Inspected final dark editor/reference/notification and portrait-grid captures:
outputs/editor-ai-reference-polish.png and outputs/portrait-edits-grid.png.
Logs: outputs/media-polish-*.log (ignored). Browser MediaRecorder dimensions are
verified as 9:16 from real encoded frames using a generated camera/audio stream;
physical camera permission/device acceptance is still manual. Authentication and
AI responses are explicit fixtures, so no fresh real Publik connectivity or AI
judgment quality is claimed. No production authentication bypass or fake AI was
added. Shared desktop source is updated; no new signed installer or hosted site
publication is performed as part of this main-branch push.

## Live web and desktop publication — November 20, 2026

Owner requested that all completed changes be committed/pushed and visible in the
actual browser and desktop versions. Both GitHub main and codex/desktop-migration
contain the completed shared editor. Sites public version 90 deploys runtime source
8995cc151679b13ea6b54827ea8f655da296572b to the existing public Site/custom domain,
https://editai.it.com, retaining its audience, runtime secrets, database and bucket.
No new Site or account store was created. Follow-up publication updates the homepage
Mac download metadata to the verified 0.2.6 installer.

Five affected workflows pass on the actual public domain in Chromium (21.4s) and
WebKit (25.4s): real generated-camera recording/import, inspector/crop/reset controls,
editable/magnetic numeric controls, caption/reference/relaxed-cut/grid-list workflow,
and edits surviving nonmodal source import. These hosted browser tests still use
explicit authentication/AI fixtures and do not prove real provider inference.
The genuine signed installed desktop session, new controls/source thumbnails and
real native MP4 export pass separately without provider/auth fixtures or paid AI;
see desktop/VERIFICATION.md for artifact identity, Apple checks and exact results.

Desktop v0.2.6 is publicly released and installed in Applications, with the prior
app preserved. Its signed/notarized DMG, ZIP, updater metadata/blockmap, complete
matching native source and checksums are published. The public Mac download contract
test reads the verified release manifest rather than pinning an old installer URL.
All 31 web unit/model/security checks, 18 desktop checks, typecheck and production
builds pass. Evidence remains ignored under outputs/release026-*.log, the signing/
installed-acceptance JSON reports, and desktop026-editor-controls.png. No iOS or
older marketing project was modified.

## Restored shortcuts and compact Edits — November 20, 2026

Owner clarification applies each web/desktop request to the shared product unless
explicitly limited. Restore Overlays to the left rail, keep Filter off the rail,
and restore Adjust as a shortcut to the Adjust heading inside Filter. The shortcut
preserves the left workspace and selects primary media if audio was selected. Crop
stays in the timeline toolbar; the duplicate Overlays toolbar action is removed.

Volume now precedes Speed. Only Volume uses the tapered track; Speed uses a straight
rail. Native thumbs have an explicit eight-pixel border-box width. Tick centers,
custom rails and fill use the same half-thumb inset and explicit input-width-minus-
thumb travel. Exact numeric input is retained by step=any; bounded keyboard stepping
still uses the control's intended increment. This fixes both endpoint drift and
speed-entry quantization. Edits uses compact square thumbnails in desktop cards up
to 176px, three phone columns, square list thumbnails, and high-contrast over-image
actions. Remove the Edits Upload clips button; Home import remains available.

Typecheck, 31 unit/model/security tests, 18 desktop tests and both production builds
pass. All 38 studio scenarios pass in Chromium (1.2m). The four affected inspector/
slider/library scenarios pass in WebKit (14.4s). The new regression checks the real
DOM tick/rail travel geometry to 0.1px, exact Speed entry and keyboard stepping,
Volume-before-Speed order, Adjust scrolling, unchanged overlay library, square
176px desktop bounds, three phone columns, square list thumbnails, decoded artwork
and Home-only import. Inspected actual slider and compact-grid captures. Component
lint has no errors, with the existing Wordmark image advisory.

Public Sites version 92 deploys source 57678d019fd66481778134d67c8a584bb1c13635
at https://editai.it.com, preserving existing access/storage/secrets. The new workflow
passes on the actual public domain in Chromium (4.3s, after one unchanged sign-in
fixture timing rerun) and WebKit (3.5s). These are explicit browser auth/AI fixtures,
not new real provider-connectivity or AI-quality evidence.

Desktop source and version-pinned packaging contracts are prepared as 0.2.7. The
Developer ID app passes deep/strict signature verification and packaged Publik
self-test; its signed app is ready for Apple submission. Publication is pending:
notarytool reports “No Keychain password item found for profile: editai-notary”,
including with the explicit login Keychain path. The profile worked for 0.2.6 but
is no longer available on this signing host. Asked the owner to restore it securely
in Terminal or supply the name of its replacement; no credential was requested in
chat or extracted from environment files. v0.2.7 remains a private draft, and the
verified installed/downloadable desktop remains 0.2.6 until notarization, signed-DMG
verification and installed acceptance can finish. Staging input:
outputs/release027-notary-input.zip. No notarization or publication guard was bypassed.


## Compact media, precise volume and blue accents — November 20, 2026

Shared runtime source 9f49c95dd01492225229a356c36bc6bf3b7877a9 rounds Volume
to integer percentages, improves dark Home artwork contrast, and applies the trial
EditAI blue to feature/editor surfaces. Actual logo artwork and user content colors
remain intact. Source cards use bounded media aspect ratios, compact fitted names,
94px audio squares and 36px audio timeline rows. External drag previews identify
the destination row/time with a short marker and honor explicit overlay/audio lanes.

Unused sources have a direct permanent-delete action without a confirmation or
success notice. Used media stays protected until its timeline instances are removed.
Deletion compacts source indexes, preserves stable word IDs, serializes project
saves before purging, clears undo resurrection paths and retains files referenced
by other saved projects. App-managed local/cloud copies are deleted; external
original files remain. Authenticated API tests cover used-asset retention and
unused-asset removal; model tests cover source remapping and explicit drop lanes.

Typecheck, 33 unit/model/security tests, 18 native desktop contracts and both
production builds pass. Full Chromium: 39/39; affected WebKit: 4/4. Final focused
Chromium workflow: 1/1. Public-domain new workflow passes in Chromium (3.7s) and
WebKit (5.6s). Checks cover integer entry, bounded source geometry, audio sizing,
track-local previews, silent library removal, used-source protection, remaining
playback and dark Home/blue contrasts. Captures were inspected. Browser fixture
authentication does not establish real Publik connectivity or AI quality.

Sites version 93 publishes this runtime at https://editai.it.com. No sibling iOS
or older marketing source was modified.

Desktop 0.2.7 is now published and installed, resolving the earlier missing-Keychain
profile blocker. Final Mac CI 44841429707, Apple acceptance and mounted-image checks
verify the matching signed/notarized installer. Installed real acceptance restores
the genuine session, exercises unused-media removal and exports H.264/AAC in 0.821s;
no auth/AI fixture or inference request is used. Detailed provenance and limits are
in docs/desktop/VERIFICATION.md. Homepage metadata now links the verified 0.2.7 DMG.


## Light Home illustration restored — November 20, 2026

Remove only the unthemed product film-strip overrides. Light Home now inherits
the original pastel gradient, lavender back card, pale borders and white play icon.
Dark Home retains the explicit blue surfaces and white play icon. Shared renderer
applies the correction to both web and desktop; version-pinned native packaging
contracts advance to 0.2.8. Typecheck, all 33 web tests, all 18 desktop contracts,
web production build and desktop production build pass. Manual browser inspection
with explicit session fixtures checks the light and dark front/back computed colors,
borders and gradients in Chromium and WebKit. The restored light capture was
visually inspected. This is presentation verification, not real provider-connectivity
evidence; no external AI requests are needed for the correction.


## Original palette restored; film-only dark adaptation — November 20, 2026

Owner rejects the blue-accent trial. Remove the trial's product/body token overrides,
Batch color override, text/overlay overrides and EditAI overrides. Restore the
original editor premium gradient, lavender drag ghost and purple icon/label colors.
Functional compact-media, permanent cleanup, volume and row-local drop behavior
remain. Light film artwork is exactly the original pastel version. Only dark film
artwork adapts: cyan #85c8d8 and lavender #b4a4e3 match the existing dark feature
cards, with a dark play icon for contrast. No other theme or card colors change.

Typecheck, all 33 web tests, all 18 desktop contracts and both production builds
pass. The existing compact media/volume/drop/removal browser workflow passes in
Chromium with its color expectations restored to the original theme. Manual
Chromium/WebKit checks verify original light/dark Batch colors and theme-specific
film front/back colors; both captures were reviewed. These checks use explicit
session fixtures and do not establish new real provider connectivity. Runtime
packaging advances to 0.2.9, superseding the prior 0.2.8 illustration correction.

The original palette correction is live at https://editai.it.com (Sites version 96).
Installed desktop 0.2.9 passed real UI/media removal and native export in 1.322s
after final signed/notarized DMG verification. The existing native acceptance
gradient assertion was corrected from the rejected blue trial to the original
premium gradient. All synthetic projects from the interrupted check and rerun
were removed. See docs/desktop/VERIFICATION.md for provenance and fixture limits.


## Compact bottom-right notification stack — November 20, 2026

One shared stack anchors success, errors and operation progress at bottom-right
with safe-area offsets. Short notices fit their text; long messages wrap within
360px or the viewport minus 32px. A three-column grid aligns the leading icon,
message and fixed 24px close button. Remove all legacy editor/mobile toast position
overrides. Preserve status/alert roles, cancellation, error links and existing
colors/timers. Existing profile-save regression now expects the right edge.

Typecheck, 33 web tests, 18 desktop contracts and both production builds pass.
Chromium's profile-save, AI-error recovery and compact-media scenarios pass (3/3).
Manual Chromium/WebKit checks exercise actual profile saving/dismissal, verifying
a 44px-high content-sized notice and aligned close control. Explicit visual
fixtures check stacked long error/link and progress notices at 1280px/390px in
both themes: 16px right/bottom inset, no overlap and no horizontal overflow.
Captures were inspected. These browser checks use session/provider fixtures and
do not establish real Publik connectivity. Shared native packaging advances to
0.2.10; editor and product color palettes remain intact.

Notification layout is live at https://editai.it.com (Sites version 98). Desktop
0.2.10 is signed/notarized, installed and published after matching mounted-DMG
verification and real installed-app export in 0.821s. Detailed provenance and
fixture limits are recorded in docs/desktop/VERIFICATION.md.

## Automatic Settings, brand themes and media controls — November 20, 2026

General now contains display name, bounded/cropped photo upload and removal,
app language, saved-edit count and the native feedback address. Remove the separate
profile page's color choices and manual save actions. Automatic saves coalesce
changes, serialize in-flight requests, retain the latest inputs on errors, expose
Retry and the server error/payment link, and flush before navigation/sign-out.
Name/photo, appearance, own-key, AI consent and telemetry save through the existing
authenticated settings endpoint. Language and brand themes persist on the device,
matching the native theme store; no authentication/storage schema change.

Copy native EditAI/Aurora/Sunset/Midnight light/dark palettes; add Rose, Ocean,
Forest and Citrus from the existing native avatar palette references. Scope brand
variables exclusively to the logo (preserving original scissors artwork), iOS
badge, EditAI tool and four Home tiles. System/light/dark remains independent.
Dark page/surface/ink/muted/border tokens match AppTheme.swift. Main controls,
export gradients and media/content colors are unaffected. The selected sparkle
fills #c4e0ff with the existing blue outline.

Remove shared, login and marketing Privacy & data footer buttons. Settings retains
privacy details/choices and onboarding retains its explicit disclosure. Source
cards remove append/In edit badges, retain used-source deletion protection and
place kind top-left, duration bottom-left, trash bottom-right with visible white
icons. Home removes its raw-takes heading, uses Your edits / View → and exposes a
compact Mac download in the top bar with existing mobile/device gating.

Typecheck, 33 web tests, 18 desktop contracts and both production builds pass.
Browser cases cover genuine decoding/export with explicit auth/provider fixtures;
they do not prove fresh Publik connectivity or AI quality. New regressions cover
coalesced/in-flight name changes, uploaded photo reload/removal, failed-save Retry,
consent/telemetry persistence, all eight themes in both modes without changing
control/export tokens, theme/language reload, footer removal, media control geometry
and selected sparkle fill. Targeted Chromium and WebKit cases pass; light/dark
Home, General and 390px Settings captures are inspected without horizontal overflow.
A broad run passed 39 cases but its final reload hit stale assets during a rebuild;
a fresh production server passes the affected cases. Final suite/publication evidence
follows. Desktop 0.2.11 signed/notarized acceptance is pending.

Final fresh-server Chromium suite passes 40/40 (1.4m); affected final Chromium and
WebKit cases pass 2/2 per engine. Eight targeted WebKit checks passed before the
final error-message refinement. On public editai.it.com, six Chromium checks pass
(21.8s) and two WebKit checks pass (15.6s), covering theme/profile persistence,
media controls and device-gated downloads. Sites version 102 publishes runtime
48e5ffbb25491cace61046f0a62f612f6a28d06e. Browser authentication/AI remain
explicit fixtures. New hook/theme/library lint has no errors; full application
lint still includes pre-existing app-wide warnings/errors and is not claimed clean.

Final refinement prevents an AI-provider switch from refreshing over pending profile
inputs: finish pending settings writes and update only provider state. A delayed-save
regression covers changing the name immediately before selecting another provider.
The selected sparkle now uses Export's blue stop #c4e0ff. These changes are rebuilt
for web and desktop; affected own-key and media checks pass in both engines; the new provider-switch
assertion initially used an incorrect exact label locator. With the accessible
combobox locator corrected, the final full autosave/theme/provider scenario passes
in Chromium and WebKit (11.4s each). Required typecheck/unit/native checks pass again.

Also preserve the latest name when asynchronous image decoding finishes after a
subsequent name edit. The browser regression deliberately delays photo decoding
while typing another name, then verifies saved name/photo and reload. Final own-key,
media-control and autosave/theme/provider/photo scenarios pass 3/3 in Chromium
(14.2s) and WebKit (14.9s). Typecheck, all 33 web tests, 18 native contracts and both
production builds pass on this final renderer. No provider inference is performed.

Desktop 0.2.11 is signed/notarized, installed and published. Final installer/archive
verification and genuine existing-session UI/media/export acceptance pass, with
native H.264/AAC export in 0.824s and both synthetic projects removed. No inference
or provider/auth fixture was used in installed acceptance; automated telemetry was
disabled and privacy choices preserved. Download metadata targets the verified
release. See docs/desktop/VERIFICATION.md for hashes, CI and platform limits.

Final public Sites version 103 publishes source
7eaf9502adb24a7aa9cf58240d35b76ea9fd8686 at https://editai.it.com, including all
provider/photo save refinements, selected #c4e0ff sparkle and the verified 0.2.11
download. Final public checks pass 7/7 Chromium (22.0s) and 3/3 WebKit (17.7s).
Direct installer HEAD resolves to HTTP 200. Existing public audience, D1/R2 and
runtime secrets are preserved. Both main and codex/desktop-migration are pushed;
only documentation changes follow this deployed runtime.

## Slim selections and native-style fades/motion — November 21, 2026

Read-only comparison with iOS EditorTimeline.swift, CaptionEditorView.swift and
EditorSuiteView.swift. Native has audio-layer fades and caption animations; visual
clip/overlay animation extends that same motion evaluator to media. No iOS source
was modified. Primary/overlay fade fields and visual motion fields are optional,
so existing documents retain identity rendering. New names/durations/fades validate
before edits persist; unsafe operations fail atomically. Native split semantics
clear internal fade/animation edges, duplicates retain settings, and move-to-overlay
and audio extraction preserve fades. Source word IDs are untouched.

Audio envelopes scale both requested fades proportionally to fit rendered duration.
Browser preview/capture and native FFmpeg mixing share that contract, including
retimed primary audio and overlay/imported tracks. Independent entrance and exit
use native cubic easing, pop overshoot, fade/zoom/slide opacity and stable full-text
layout for typewriter. Browser and desktop frame exports use Player.draw; visual
animations explicitly exclude the direct native fast path so no effect is lost.

Clip shows audio fades directly below Volume with an envelope and numeric seconds.
Text has its own expandable animation controls; Filter has clip animation controls.
IN/OUT, duration and replay previews use the same evaluator on real thumbnails or
text, with visibility cleanup and reduced-motion handling. Font choice no longer
reorders the list. Selection outlines are one pixel, heavy handles become clear
hit targets with a small cue, and input focus loses the thick double border. Crop's
expanded clipping allowance retains the complete larger target in WebKit. Canvas
is a closed top-right preview menu. Toolbar order: Split, Overlay, Crop, Duplicate,
Delete. The existing keep-one-primary-clip safety applies to Overlay and Delete.

Typecheck, all 37 web model/security tests, all 19 desktop contracts and both builds
pass. New model tests cover proportional envelopes, independent/overshooting motion,
optional legacy defaults, split/copy/move/AI atomics and invalid settings. Native
FFmpeg tests measure rising/falling PCM levels on a short retimed clip with long
fades and prove animated clips use the compositor. Browser checks use explicit
auth/provider fixtures; no production auth bypass or fake AI response is added.
The new workflow checks Canvas, toolbar, hairline selection and functioning edge
resizes, stable font order, visual previews, real exported video pixels/audio levels,
reload and extracted-audio fade preservation in Chromium and WebKit. An earlier
40/41 run exposed an obsolete slider count, and WebKit identified clipped crop hit
areas; both are corrected. Final full-suite and publication evidence follows.

Final fresh-server Chromium passes all 41 scenarios (1.6m). Final affected WebKit
workflow/crop/drop cases pass 3/3 (22.5s), following five exercised WebKit scenarios.
Inspected the light and dark Clip/Filter/Text layouts and 390px Canvas menu. Both
engines report no horizontal overflow and zero running sample animations with
reduced motion enabled. Component quality review has no reported issues. These
browser checks remain fixture-authenticated; they do not prove fresh provider
connectivity. Native installed animation/compositor acceptance is pending.

Sites version 104 publishes runtime bd3515543b7d977465a3404294c8b009061afb7c
at https://editai.it.com. Public Chromium workflow/crop/drop checks pass 3/3
(25.1s); public WebKit workflow/crop checks pass 2/2 (22.4s), including actual
exported pixel/audio checks and font/selection persistence. Authentication/AI are
explicit browser fixtures. No fresh provider connectivity is claimed. The matching
0.2.12 app is Apple-notarized; installer/installed acceptance remains pending.

Desktop 0.2.12 is signed/notarized, installed and published. Genuine existing-session
acceptance verified audio fades, clip/text animation, font order and thin selection,
then completed an actual animated H.264/AAC compositor export in 12.968s. Both
synthetic projects were removed. No inference or fixture authentication/provider
response was used in this installed check; automated telemetry was disabled and
privacy choices preserved. See the desktop verification record for hashes and CI.
The final download-metadata build is isolated from concurrent audio-library work;
that separate uncommitted feature is preserved and excluded from this release.

Final isolated Sites version 105 publishes source
937a7a322e6cfdd7160a2fceb3afa45ada9c7e00 at https://editai.it.com with the
verified 0.2.12 installer link. Final public checks pass 3/3 Chromium (22.8s) and
2/2 WebKit (22.4s), including real browser exports, crop/resize interactions and
Mac download device gating. Installer HEAD returns HTTP 200. The actual installed
animated export is H.264/AAC, 854×480, 19.1 seconds. Concurrent audio-library work
was excluded from the build and preserved; it is a separate subsequent change.
Existing Site access, D1/R2 and secrets are unchanged. Main and the working branch
contain the completed motion/fade implementation and verification records.

## Audio-session rollback — November 21, 2026

Owner requested undoing all audio-library/Instagram changes from this conversation.
All application code matches pre-audio source 937a7a322e6cfdd7160a2fceb3afa45ada9c7e00
byte-for-byte. The independent final motion/fade verification above is preserved.
Bundled music/UI/provenance/tests and the session's native solo-mix change are
removed. Uncommitted Instagram server/model/native changes and both new modules
are removed; no Meta app secrets or live connections were configured. User media
and saved projects are not deleted.

The live Site was immediately restored to verified version 105. Required
TypeScript, 37 web unit tests, 19 native contracts and web/desktop builds pass.
Fresh production-server Chromium passes 41/41 (1.7m). Public WebKit motion/fades
and original imported-audio/export checks pass 2/2 (27.3s), with explicit browser
auth/AI fixtures. These browser checks do not prove fresh Publik connectivity.
The signed/notarized 0.2.12 backup matches its original release ZIP and passes
Gatekeeper. /Applications/EditAI.app is restored to it. Genuine existing-session
acceptance (no auth/provider fixtures or inference) passes motion controls and
actual native export in 15.522s, without browser errors. Both synthetic QA projects
are removed. Public 0.2.13 is withdrawn into a draft; 0.2.12 is again the latest
release. Original signatures, release assets and Git history are preserved.
The matching source rollback is committed and published next.

Final restored-source publication: Sites version 108 publishes rollback commit
75da99b2e036fd3417eed1716f35f5562056d500 at https://editai.it.com. Final deployed
UI verification confirms the original Your audio / Import audio controls, no
bundled catalog or Instagram controls, and the 0.2.12 download link after hydration.
That browser check uses explicit isolated auth/AI fixtures. Installed archive
inspection confirms no bundled music directory; GitHub latest is 0.2.12 and its
installer returns HTTP 200. The requested rollback is complete on source, live
web and the installed Mac app; only verification documentation differs from the
pre-audio implementation.

## Native upload review, explicit Send and pill handles — November 21, 2026

UI source `9d8764c99eacb17ffbe270055103fd2c726dc582` follows the sibling app's `VideoReviewView.swift`, `EditingLoadingView.swift` and `EditingProgress.swift`, read without modifying the iOS project. Home uploads prepare up to 50 videos and open the full-screen cover preview: circular Exit/Play, duration and size, selectable Video pills, Retake and Send. Multiple clips produce one timeline; Batch remains separate projects. Retake commits a complete valid replacement, reuses the pending draft and preserves the previous preview when the picker is cancelled or replacement validation fails. No AI request occurs before Send. Recorded takes preserve immediate-send behavior.

Send uses the existing real source-word transcription and atomic editorial validation. The full-page processing view uses a source thumbnail, actual reported progress, native Transcribe/Edit states and a 24%-perimeter pastel segment travelling around a 24px rounded rectangle every 2.4 seconds. Its SVG uses CSS-pixel coordinates so narrow screens retain the same corner radius. Animation pauses when hidden and stops under reduced motion. Cancellation aborts processing, returns Home and retains the locally saved originals; failures and denied AI consent retain manual editing. Existing pending transcription jobs remain recoverable.

Restored the full text/crop selection outline at 1px, 6px corners, eight visible 16×3px pill grips and transparent 20px hit targets. All resize/crop pointer gestures, text editing, undo and export remain active.

Validation: TypeScript, 37 model/security tests, production web build, 19 native/desktop tests and desktop build pass. The full 44-case editor browser suite passes locally (1.7 minutes). Four targeted cases pass in Chromium and WebKit, including the final narrow-screen orbit correction (15.4s / 18.7s), multiple previews/playback, no AI before Send, processing/cancel recovery, atomic replacement, disabled-consent manual editing, all eight pill grips, crop/resize, stable fonts and actual H.264/AAC export with measured audio fades and animation pixels. Captures are under ignored `outputs/upload-*.png` and `outputs/motion/`.

Authenticated browser checks use test-only Playwright API fixtures, with real decoding, FFmpeg, media persistence, compositing and export. They do not establish fresh real Publik connectivity or introduce a production bypass. No new paid inference or synthetic engagement was generated. A broader marketing run was stopped after unrelated review-fixture-count and FAQ/privacy checks failed (the review check expected 24 fixtures; 8 rendered); marketing source was not changed in this request. The completed editor regression is reported separately above.

Installed verification caught the native Mac drag strip intercepting Exit above the preview. The upload/processing presentations now reserve a 48px window-control row and explicitly exclude their content from native drag regions. A browser regression reproduces the drag overlay and checks pointer access to Exit and Cancel; the targeted Chromium cases pass (15.6s). Interrupted verification media was removed without selecting user projects. Corrected installed-app acceptance passed before publication.

Matching Mac 0.2.14 passed genuine installed-app acceptance with the signed/notarized app in `/Applications/EditAI.app`: normal Publik gate, two uploaded previews, native playback/pause, working Exit, explicit Send, no AI request before Send, media removal, existing fade/motion/font controls and a real 13.486-second export. FFprobe confirms H.264 + AAC, 854×480, 30fps and 19.1 seconds; audio is non-silent (mean −16.6dB, peak −2.2dB). The two batch QA projects and upload-preview QA draft were removed. No fresh AI inference was performed in export-only acceptance. The installed archive hash is `490902d4422059cbd1367b65dc0e26a8a175581df9f33ebdb6513355f487fde4`; signing/installer CI run `44969678990` verifies the matching ZIP and DMG.

Publication complete: Sites version 109, source `becc085222c8bd79bbbeb66c97c85f987f2b191f`, is live at https://editai.it.com and https://editai-web.givingarmadillo8.chatgpt.site. All 44 editor browser checks pass against the live custom domain (2.7 minutes), plus the four targeted WebKit checks (23.8 seconds). This includes the actual production assets, preview/Send/loading flow, Mac drag-overlay regression, first-cut/undo originals, 402 recovery, persisted drafts, media actions, crop, thin pill handles and real browser exports. Fixture-authentication/provider boundaries above still apply. Mac 0.2.14 is the latest public GitHub release; its generated homepage/header download resolves HTTP 200 (170,424,441 bytes). The installed app and verified public release are identical. Source and verification records were pushed to `main` and `codex/desktop-migration` without rewriting history.

## Centered upload preview correction — November 21, 2026

The owner requested the uploaded video to sit in the middle of the page like the processing thumbnail. Replaced the viewport-filling cover video with a bounded, rounded preview card on the same adaptive light/dark background. The card preserves the source aspect ratio and uses contain framing so portrait and landscape recordings remain fully visible. A viewport-height limit keeps it compact. Duration/size, multi-video selection, Retake and Send sit beneath the card; Exit remains clear of Mac window controls. Processing and AI behavior are unchanged.

Typecheck, all 37 model/security tests, 19 desktop/native tests and the production build pass. Four focused browser checks pass in Chromium (16.3s) and WebKit (19.7s), including actual preview playback, multi-clip selection, Retake/cancel, Send, original recovery and actual export. The revised preview regression uses both portrait and landscape media, checks its centered bounds at desktop/mobile sizes, full-frame contain rendering, controls below the video, and dark appearance. The final dark-layout case also passes (1.9s). Captures are under ignored `outputs/centered-review-*.png`.

The full 44-case editor regression also passes (1.7 minutes). Genuine installed Mac 0.2.15 acceptance verifies the centered card's bounds and full-frame contain rendering, controls below the clip, multi-clip playback, working Exit and explicit Send without AI requests. The actual native export completes in 13.499 seconds: H.264/AAC, 854×480, 30fps, 19.1 seconds. No renderer errors; all QA projects were removed. App archive SHA-256 `0b93a852c12c74b497645e4fc9b96ab324a5899a7235b1196b87ea05f77505f8`; matching installer CI `44975170804`. The signed/notarized release is published and installed. Browser authentication/provider fixtures do not establish new real AI connectivity; installed authentication and export are genuine, with telemetry disabled and no paid inference repeated.

Published as Sites version 110, source `fde911e6910005e3126ddeafc4bd242d144d37a1`, at https://editai.it.com and https://editai-web.givingarmadillo8.chatgpt.site. All four targeted live Chromium cases pass (22.9s) and all four live WebKit cases pass (24.4s), including the centered full-frame preview at desktop/mobile sizes and dark appearance. Fixture boundaries above apply. The matching 0.2.15 installer is GitHub's latest public release and resolves HTTP 200 (170,425,059 bytes). The verified matching Mac app is installed; source and evidence are committed/pushed to both `main` and `codex/desktop-migration` with history preserved.

## Text appearance and selection scope correction — November 22, 2026

Compared selection CSS with the revision immediately before `bd35155`. Removed that pass's timeline overrides, restoring the original 2px blue selection borders, blue 12px trim grips and selected-layer padding for video/text/audio. Preview-layer frames use the classic square corners and straight edge bars at slightly slimmer dimensions with a fine outline; diagonal pills are removed. All preview resize targets remain 20px and crop styling is independent. The user-requested scope is the video-preview selection only, not timeline selections.

Removed Replay previews because the visible animation samples already loop; reset and entrance/exit controls remain. Removed the Style previews tiles and exposed direct native-style Text controls for color/opacity, None/Black/White/custom backgrounds with opacity/padding/corner radius, border color/thickness, and shadow opacity/color/blur/offset. Timing/alignment/spacing remain under Timing & layout, and fonts keep their existing order. Dimensional controls display meaningful pixel values using the native 1080px reference while preserving normalized document values. These controls use the existing real renderer/export fields and autosave/undo paths; no AI/auth changes or iOS/marketing source edits.

Typecheck, 37 model/security tests, 19 desktop/native tests, production build and all 45 editor browser tests pass (1.9 minutes). Focused Chromium and WebKit tests verify font ordering, classic preview handles, real resize gestures, restored video/text/audio selections, directly usable styling, actual canvas colors, undo, reload persistence and decoded color pixels in genuine H.264/AAC exports. The final focused WebKit cases pass in 24.7 seconds. Test-only auth/provider route fixtures do not establish fresh real Publik connectivity; original media decoding/compositing/export remain active. Captures are under ignored `outputs/text-appearance-*.png`.

An added compatibility check opens an older saved white box with omitted optional opacity/radius fields and verifies readouts of 100% and 0px, matching the existing renderer without changing its appearance. New boxes still use the native preset defaults. The compatibility flow passes (9.1s), including real color export and restored audio selections. The initial 0.2.16 installed acceptance passed real authentication, classic preview handles, restored timeline grips, direct style controls and decoded colored export pixels in 13.49s; a follow-up 0.2.17 patch carries the older-project readout correction to the installed app.

Live web version 111 (source `3b21806a0139d2a28a400307cd8414fa9282ff99`) passes both focused Chromium cases (31.9s) and both WebKit cases (34.0s), including exported style pixels, older-box defaults, audio/video/text selection borders and classic preview resizing. The fixture/provider boundary above applies. Final Mac 0.2.17 passed genuine installed authentication, direct style controls, classic preview handles, restored timeline borders, and a decoded colored-text export in 13.739s, with no renderer errors or new paid inference. Its archive SHA-256 is `e5809ae7ea28ec55c69ef6f568fe16ac5106b2711344679f5ce8c5ec32cbac05`; matching installer CI is `45078019038`. Apple acceptance/stapling/Gatekeeper passed; the release is public and installed. QA preview and batch projects were removed.

Final publication: Sites version 112, source `f21594a17376115fd61e770b2b74bc84eb0521d3`, is live at https://editai.it.com and https://editai-web.givingarmadillo8.chatgpt.site with matching 0.2.17 installer metadata. Styling/selection code is unchanged from the verified live version 111; this final deployment updates download metadata and evidence only. The 0.2.17 download returns HTTP 200 (170,424,703 bytes), and GitHub latest is v0.2.17. The same verified app is installed locally. All source/evidence is committed and pushed to main and the migration branch without rewriting history.

## Official font, compact text colors and timeline fade curves — November 22, 2026

Replaced the static TikTok Sans semibold face incorrectly declared as all weights
with the unmodified official variable font from Google Fonts. Its binary axis
metadata verifies genuine 300–900 weight, 75–150 width, 12–36 optical size and
−6–0 slant; normal width and the default 36 optical size are retained. New text
uses Medium (500), subtle shadow and an optional 2px-at-1080 border; stored text
properties and the legacy 600 fallback remain. Added real weight selection and
matched on-preview editing typography. Provenance, upstream links, digest and
OFL license are recorded in THIRD_PARTY_NOTICES.md. TikTok's newsroom article
was accessible; no PDF was needed.

Text, outline, background and shadow colors use 39 scrollable circular swatches,
an accessible HSV disc/brightness control, hex input and system picker. The
screen eyedropper uses the browser API with cancellation; a preview-pixel sampler
covers browsers without it. The latter is verified against real canvas RGB data,
including Escape cancellation. No CapCut code/assets are copied. Text Start/End
fields and the fade explanatory sentence/graph are removed. Layout, timeline
text timing gestures and actual DSP envelopes remain. Audio clip bodies and
waveforms taper with effective rendered-time fades; strong 2px blue selections
and trim targets remain rectangular and independent. Preview text frames use a
fine white line and four visible circular corner grips; edge resize targets stay
available on hover/focus with all eight resizing gestures preserved.

Required typecheck, all 40 unit/security/font tests, 19 native contract tests,
web production build and desktop build pass. A fresh final production Worker
passes all 45 editor tests (1.9m). Focused local WebKit passes 2/2 (25.0s), with
real canvas sampling, weight persistence, RGB styling, reload, resizing, audio
clip fade shape and H.264/AAC exports. During an earlier run, rebuilding assets
under the server caused stale-manifest 404s; that run was stopped and replaced
by the clean final run above. Browser fixtures isolate sign-in and provider
responses; they do not prove fresh Publik connectivity or perform paid AI work.

Sites version 113 publishes source 4e839edd52c4fecb691093c588d09553d4c183b1.
Both focused live custom-domain cases pass in Chromium (29.5s) and WebKit
(42.2s), including actual exported text pixels and audio-fade behavior.
Mac 0.2.18 and its installer are signed, Apple-notarized and published. The exact
matching app is installed in /Applications/EditAI.app. Genuine normal-gate
acceptance (no sign-in/provider fixtures, no paid inference, telemetry disabled)
passes real font weights, palette/wheel, removed timing controls, white preview
frame, original timeline selections, actual timeline fade curves and decoded
colored text pixels. Its actual export completes in 14.076 seconds: H.264/AAC,
854×480, 30fps, 19.1 seconds. There are no renderer errors, and all three QA
projects are removed. App archive SHA-256:
669c291b819f2cc327a11c6bf984189220770f0efa326c021cd9a3d41afcfe8d.
Installer CI: 45081941095. Acceptance explicitly selects TikTok Sans for the
native export and tolerates subpixel preview lines on Retina displays. Final
web metadata publication follows to advertise the verified 0.2.18 installer.

Final publication: Sites version 114, source
990ac25e3bb5b65c1b5a72c02e741e71e05d7a7d, is live at https://editai.it.com
and the existing Sites URL. Final hosted text/sampler/reload/export and Mac
installer-gating checks pass 2/2 (14.9s). The deployed font CSS references the
variable asset, whose downloaded SHA-256 exactly matches the official file.
GitHub latest is public 0.2.18; its generated installer link resolves HTTP 200
(170,850,594 bytes). The matching verified Mac app is installed. Source and
records are committed/pushed to main and codex/desktop-migration without
rewriting history. Owned preview servers were stopped. Fixture boundaries above
still apply; no fresh paid inference or synthetic telemetry was generated.

## Expressive specimens and faithful on-preview typing — November 22, 2026

All 59 fonts now have independent short specimens matching their character,
such as Splendid, KAPOW!, Groovy and Storytime. They no longer repeat the current
caption. TikTok Sans remains the default and font order/search remain stable.

The typing surface previously used the unscaled font size and a white field,
while the canvas renderer fitted text into its box. Extracted the existing
wrapping/fit calculation into text-layout.ts and reused it for the typing
surface. Styled text continues to render on the canvas during typing, preserving
its exact colors, boxes, outlines, shadows, wrapping and fit. The typing surface
is transparent, with native caret, selection, keyboard and IME support. Drafts
render live; Escape restores the document, blur/Ctrl-Enter commit one undoable
change, and resize/drag remain active. No timeline selection styling changed.

Required typecheck, 40 unit/security tests, 19 native contract tests and web/
desktop builds pass. A fresh final production Worker passes all 45 editor
browser tests (1.9m). The explicit oversized-font/short-box regression checks
fit below 0.8, identical before/during screenshot pixels, unchanged frame bounds,
real-time canvas changes, Escape restoration, commit, undo/redo and subsequent
resize. It also checks font specimens and retained TikTok default. Focused
WebKit passes (10.0s). An earlier local Worker stopped during the broader run;
connection-refused results were discarded and replaced by the fresh complete
run above. Browser sign-in/provider fixtures remain isolated and do not prove
fresh Publik connectivity. The installed acceptance harness mutes speaker output
only; capture and exported audio remain part of verification. Matching Mac
0.2.19 is being signed/notarized and installed acceptance follows.

Web UI publication: Sites version 115, source
98485a4964f9d2677bd0319db4dc20e555baf9b2, passes both focused live Chromium
cases (21.8s) and the live WebKit fitted-typing case (10.1s). These include
identical pre-edit/during-edit screenshot pixels, oversized-font fitting,
real draft changes, Escape, commit, undo/redo, resize, and actual styled export.

Mac 0.2.19 and its installer are signed, Apple-notarized and published; the exact
matching app is installed in /Applications/EditAI.app. Genuine installed
acceptance passes the normal gate without authentication/provider fixtures,
font specimens, fitted typing with identical screenshots, live updates,
Escape/commit, existing styles, timeline fades and actual decoded export pixels.
Native export takes 13.556 seconds: H.264/AAC, 854×480, 30fps, 19.1 seconds.
No renderer errors; all three synthetic QA projects removed. No fresh paid AI
inference or synthetic telemetry. Speaker playback is muted in the test harness.
App archive SHA-256:
9f23f4ca6f9fc61dff4d79038bedaa195dfba902d2e1d612b25dfd3aa84d02d3.
Matching installer CI: 45086026799. Final web download metadata publication follows.

Completed publication: Sites version 116, source
db133488adcf18caf01c31d0804a2e714eb86738, publishes the matching verified
0.2.19 download at https://editai.it.com and the existing Sites URL. Final live
fitted-typing and Mac download-gating checks pass 2/2 (11.4s). GitHub latest is
public 0.2.19; the installer resolves HTTP 200 (170,851,229 bytes). Native export
audio remains non-silent (mean −16.6dB) with speaker playback muted. Source and
verification records are pushed to main and codex/desktop-migration with remote
history preserved. Owned local preview servers are stopped; browser fixture and
no-new-inference boundaries above remain unchanged.

## Independent preview text frames and audio-only fade controls — November 22, 2026

Preview text activation is local to the video preview rather than inherited from
timeline selection. Explicit text clicks activate its frame/typing; outside
pointer or focus changes commit the current draft and dismiss the frame without
clearing the selected timeline item. A synchronous commit precedes new timeline
gestures, and a consumed draft reference prevents duplicate blur commits. Escape
cancels and dismisses; typing, fit, resizing, undo and overlay controls remain.

Fade controls now appear only for audio tracks, including extracted sound. Video
and overlay Playback retain volume/speed; visual animations remain in Filter.
The audio body and waveform stay rectangular. Two translucent gray cubic paths
grow from the left/right ends according to the effective rendered-time fades,
matching the supplied reference. Selection borders/grips and DSP remain intact.
Legacy stored fade data and native editorial contracts are preserved.

Typecheck, all 40 unit/security tests, 19 native contract tests and web/desktop
builds pass. The full browser run passes 44 cases; its remaining overlay test
expected the old four Playback sliders. Updated it to two sliders and absent
fade controls; that case passes separately (5.2s), covering all 45 editor cases.
Focused Chromium verifies independent selection, click-away draft commit, live
text, cancel/undo, and real audio-ramp/export behavior. Both focused WebKit cases
pass (23.0s). The waveform remains unmasked with two actual SVG fade overlays.
Browser authentication/provider fixtures are isolated and do not establish new
real Publik connectivity. Mac 0.2.20 signing and installed acceptance follow.

Web UI version 117, source c9f8751220a9ddc5d0830fe4b9ac3c445a514d67,
passes three focused live Chromium cases (29.4s) and both focused live WebKit
cases (26.6s), covering independent preview selection, click-away commit,
resizing/crop/overlay compatibility, audio-only fades, curved overlays and actual
export/reload. Browser fixture boundaries above still apply.

Mac 0.2.20 and its installer are signed, notarized, public and installed. Genuine
installed acceptance verifies normal-gate authentication without fixtures,
independent preview/timeline text selection, outside-click dismissal, faithful
typing, audio-only controls, unmasked waveform overlays and decoded styled text
in a real export. An initial QA run sampled export second 1 after placing its
caption around second 10; publication stayed private. The harness now explicitly
seeks to zero before creating that caption. The exact unchanged installed build
passes the corrected acceptance and exports in 13.544 seconds: H.264/AAC,
854×480, 30fps, 19.1 seconds, non-silent audio (mean −16.6dB). All five QA
projects from both runs are removed; no renderer errors, paid inference or
synthetic telemetry. Speaker output stays muted during acceptance.
App archive SHA-256:
5e4c11dc6a0c079c761bdf0bb7729d257403e0fe0241c38b730149174cfcc63c.
Installer CI: 45089098776. Final web download metadata publication follows.

Completed publication: Sites version 118, source
9c1287d7878d539a03625458e2f3b04444c7b257, is live at https://editai.it.com
and the existing Sites URL. Final live preview-selection/typing and Mac download
checks pass 2/2 (12.2s). Public GitHub latest is 0.2.20; the installer link returns
HTTP 200 (170,850,142 bytes). The matching verified app is installed. Source and
records are committed/pushed to main and codex/desktop-migration with remote
history preserved. Owned preview servers are stopped. Browser fixture and
no-new-inference boundaries above still apply.

## Caption timing recovery, chat keyboard flow and Adjust response — November 22, 2026

The strict client parser rejected an entire transcription for any zero-duration
word, small backward start, missing word-field alias or slightly rounded source
boundary. Both Publik and own-key paths now share a bounded normalizer. It keeps
recognized zero-duration tokens on adjacent measured speech intervals, bundles
small overlapping jitter conservatively, and uses provider-measured segment
intervals when word alignment is unavailable. It never guesses word durations,
drops recognized text, changes stored source IDs or permits arbitrary out-of-
source timing. Unrecoverable provider data still fails safely and atomically.
Server responses retain segments for this fallback. OpenAI's reference timing
implementation explicitly processes nonzero word durations separately:
https://github.com/openai/whisper/blob/main/whisper/timing.py . Provider word/job
shape and repeat-GET recovery follow https://publikhq.com/developers .

Before transcription, canonical PCM is checked for exact digital silence and
missing audio streams are identified separately from codec failures. Quiet
nonzero audio remains eligible; silent sources do not block audible sources in
mixed uploads. Missing audio shows “No audio detected.” Existing transcription
jobs are resumed through GET and already accepted words are reused. Original
media and all manual text remain. The manual-text caption note is removed.

Adjust scrolls to its section and applies a repeatable light-blue background
fade for 750ms (250ms under reduced motion). Chat Enter sends, Shift-Enter adds
a line, and Up/Down at the first/last logical line recalls sent user prompts and
restores an unsent draft. Cursor restoration is cancelled on typing/focus changes;
a full regression caught and fixed a stale-animation-frame caret race. Busy
operations cannot enqueue duplicate messages. The selected sparkle keeps the
existing #c4e0ff fill with a black #111 stroke.

Typecheck, all 47 unit/security/typography/transcript tests, 20 native contracts,
web/desktop builds and the complete 47-case browser editor regression pass
(1.9m). Four final focused WebKit cases pass (7.9s). The tests cover real audio
decoding with explicit provider-shaped fixtures, zero-length words, punctuation,
small jitter, aliases, measured-segment fallback, invalid timing rejection,
exact silence versus quiet speech, caption generation via Enter, manual-title
preservation, prompt recall/drafts, no-audio messaging, repeatable fading Adjust
feedback and black sparkle strokes. Publik recovery creates only one job.

Read-only live Site job/project metadata was inspected without keys or mutations.
The exact user's failed provider payload was not available. These browser/API
fixtures prove client/server handling, not fresh real Publik inference. No paid
transcription was issued to diagnose progress, no production bypass/fake AI was
added, and no synthetic telemetry/credit use was generated. Mac 0.2.21 signing,
installed acceptance and live publication follow.

UI is published as Sites version 119, source
9611cfe07ce2f1f46e492731b7ce24ec10b85ecf. The four focused live Chromium
cases pass (11.3s), and the four focused live WebKit cases pass (20.6s). They
exercise caption timing recovery through chat, one-job Publik reuse, silent-track
messaging, history/Enter behavior and repeatable Adjust response. Their provider
and authentication fixtures remain explicit; the exact user's response is not
represented as live-inference verification. The user was told to refresh and
retry the same request on the website.

Mac 0.2.21 is signed, Apple-notarized, public and installed. Genuine normal-gate
installed acceptance verifies the actual Adjust highlight, retained black
sparkle stroke/blue fill, Shift-Enter, existing editor/selection/fade controls
and decoded styled pixels in an actual 13.564-second export: H.264/AAC,
854×480, 30fps, 19.1 seconds, non-silent audio (mean −16.6dB). No renderer
errors; both batch QA projects are removed and upload-review cancellation is
verified. Speaker playback stays muted, no provider inference was repeated and
no synthetic telemetry was generated. App archive SHA-256:
918326a3573f731034dc920d27492174523c3f97e83e542214b406b40f8a32fa.
Matching installer CI: 45092357880. Final web download metadata publication follows.

Completed publication: Sites version 120, source
feb21226c778b83fb6c75a7dab0fd46418e03063, is live at https://editai.it.com
and the existing Sites URL. Final deployed caption/chat and Mac download-gating
checks pass 2/2 (4.8s). GitHub latest is public 0.2.21; the installer returns
HTTP 200 (170,849,944 bytes). The matching verified app is installed. Source and
records are committed/pushed to main and codex/desktop-migration without rewriting
history. Owned preview servers are stopped. The exact-user-payload and
provider-fixture verification boundaries above remain explicit.

## Reference text, placement and pacing — November 22, 2026

Reference matching now sends high-detail text frames, ordered six-tile 30Hz
motion strips (eight windows), bounded local scene/motion/repetition measurements
and optional local audio energy pauses. It retains the authenticated 2MB request
limit and existing consent gate. Adding a reference never sends it to a provider;
reference audio is decoded locally, not uploaded/transcribed. Target transcripts
are reused/prepared before video-reference planning. Font weight joins supported
font/size/fill/stroke/background/shadow/animation patches. Instructions distinguish
creator text from platform UI and match target verbatim speech and normalized
placement, with explicit text-only scope preservation.

`speedRange` supports short source-grounded emphasis without guessed split UUIDs,
with all-or-nothing validation, .1-second piece limits, preserved outside rates,
source word IDs, source coverage and anchored caption timing. Real FFmpeg export
of a 1/.75/1 rate sequence passes exact-duration H264/AAC and non-silent-audio
checks. Continuous speed ramps/optical-flow interpolation remain unsupported.

Changed portrait text is measured with the shared canvas wrapping/font layout,
including background/stroke/shadow margins, and fitted minimally into the optional
x=.11–.72, y=.14–.65 social guide. Unrelated text/landscape remain unchanged.
The checkbox allows intentional exact placement. See docs/REFERENCE_MATCHING.md
for sources: TikTok's official variable-zone guidance and downloaded standard LTR
ad template were inspected; Meta's original pages redirected to login/blocking,
so no unverified Meta numeric specification is claimed. The combined organic
preview guide is conservative EditAI behavior, not a compliance guarantee.

Actual supplied 48.937375s Spotify video was read locally. Browser preparation
finished in 21.91 seconds with 10 detailed frames, eight motion strips, 12 possible
scene boundaries, measured audio and 1,201,356 base64 image bytes. Repetition near
4.078s and 15.942s corroborates independently inspected slowdown candidates.
Caption placement around y=.742 needs moving upward for the conservative guide.
Exact original font identity/playback rates cannot be established from baked
footage; no exact one-to-one generated match is claimed.

Typecheck, all 52 unit/security/reference tests, 21 native contracts, production
web/desktop builds, and all 48 editor browser cases pass. The full run passed
47/48, then its older reference/pacing fixture was updated to supply the now
required target transcript, and it and the new reference case both passed (7.8s).
Two focused WebKit reference checks pass (5.9s). Coverage includes real browser
reference decoding, ordered strips and numeric evidence, no provider request on
attachment, pre-planning word timings, real font-weight styling, whole-box safe
placement, localized speeds, stable word IDs and one-step undo. Provider and
authentication responses in these browser cases are explicit fixtures. No fresh
paid reference inference or exact-font/rate fidelity audit is claimed; no
production auth bypass, fabricated AI output or synthetic telemetry was added.
Shared web publication and signed/notarized installed Mac 0.2.22 follow.

Web UI is live as Sites version 121, source
312741ae6c4071bf0e69f5a2afa9b644fb8b2c32. Three focused deployed Chromium
reference/pacing cases pass (15.3s), and two deployed WebKit reference cases pass
(10.0s). Provider/auth fixtures remain explicit; actual local frame/audio decoding,
measured safe placement and edit/undo behavior run in both engines.

Mac 0.2.22 is signed, Apple-notarized, public and installed. Normal-gate installed
acceptance passes with genuine local video reference sampling/audio measurements,
checkbox/removal behavior, unchanged editing controls and a 13.552-second real
export. No renderer errors. Upload review/cancellation and batch cleanup pass;
no paid reference inference or synthetic engagement was issued. App archive
SHA-256: c989f23f31ab3123ff82491091e5dcb2ab80b7c687f6d76392ed223570d29154.
Matching signed installer CI: 45094783020. Final matching download metadata
publication follows.

Completed publication: Sites version 122, source
a8f2bdc0557e580aebf84e528af089c46fada54f, is live at https://editai.it.com
and the existing Sites URL. Final deployed reference and Mac download checks pass
2/2 (6.7s). GitHub latest is public 0.2.22, with the signed installer returning
HTTP 200 (170,865,806 bytes). The installed app reports 0.2.22. Its actual export
is H264/AAC, 854×480, 30fps, 19.1 seconds, mean audio −16.6dB. Both branches
contain the product changes and release metadata; final records are pushed without
rewriting history. Owned local Workers are stopped. Exact-font/rate reconstruction,
Meta-primary-access and fresh-inference verification limits above remain explicit.

## Reference picker cleanup and speech alignment recovery — November 22, 2026

The reference picker again shows only preview, filename and removal action.
Categories, scene/audio diagnostics, placement checkbox and automatic technical
safe-area suffix are removed. Matching instructions and existing analysis stay
internal. Installed acceptance now requires the clean picker as well as real
local reference preparation.

The user reported failures for transcription and cutting using Publik credits.
Read-only production job metadata showed the latest relevant job completed, but
its accepted source had no saved words. The prior saved web-test session was
expired; a separate normal desktop credential could not read that web job (404).
No production session/auth bypass was introduced, no secrets were printed, no
new primary paid job was posted, and the exact failed provider response remains
unavailable to replay. This is a client timing-validation failure class, not
proof of any particular malformed provider timestamp.

When primary measured timing and existing segment fallback cannot be used,
EditAI now obtains alternate real timestamped speech sections, each at most 100
seconds under the existing multipart limit. The original Chirp job is retained;
it is not restarted to check progress. Valid primary timing does not invoke the
alternate service. Alternate recognition is actual provider processing under the
existing AI consent/account choice, never fabricated timing or a fake response.
Its first use is a separate transcription request; completed sections are cached
to avoid repeating successful work. Ordinary provider/balance/network failures
still retain originals and their genuine error messages.

Recovery saves an internal job/cursor with accepted words after every section.
The cursor is validated against source duration and complete section boundaries.
A later failure resumes only the unfinished section with stable prior word IDs.
Accepted alternate timing is also cached privately by owner/source/job/section/
language before returning it. Access requires an owned completed job, and media,
project and account deletion remove the cache, including local-only sources.
The native bucket allows only the constrained alignment suffix. First-cut error
sync now uses the latest persisted project so partial recovery is not overwritten
by its stale original. Editorial plans still use stable source word IDs and apply
atomically; no cut is accepted solely to hide a transcription failure.

Typecheck, 53 unit/security tests, 22 native/backend contracts, web build, all 50
editor browser cases (2.0m) and three focused WebKit cases (10.5s) pass. Provider
fixtures cover an unusable completed Chirp response, real browser audio extraction,
alternate alignment feeding an actual first cut, subsequent caption generation
without another job, a failed second section resuming at 100 seconds, stable word
IDs, cached response reuse with one provider call, cross-job denial and private
cache deletion. Fixtures prove the paths, not fresh real Publik alignment success.
The clean reference picker retains preview/removal and hidden matching behavior.
Live publication and signed/notarized installed Mac 0.2.23 follow.


## Resumed speech-recovery release handoff — November 22, 2026

Recovered the previous session's checkpoint and release logs. Product source is
`bd42bb76a47bee42c626d2f1025b5aac2dfbf614`. Mac signing/installation/acceptance
had completed, but publication stopped on a GitHub TLS handshake timeout. Retried
the guarded publisher successfully; v0.2.23 is now the latest public release.
Public installer HEAD returns HTTP 200, 170,854,743 bytes. The generated download
manifest now selects 0.2.23. Release notes describe this release's actual speech
recovery and reference-picker changes, including the provider-fixture boundary.

Fresh checks: typecheck, all 53 unit/security tests, all 22 native/backend contracts
and production build pass. A freshly started built Worker on 5290 passes three
focused cases in Chromium (8.4s) and WebKit (11.4s): local reference preparation
and clean picker, unusable Publik timing through first-cut/captions without a new
primary job, and interrupted recovery resuming with prior word IDs intact. Browser
and backend provider responses are explicit fixtures, not fresh Publik inference.
Current official https://publikhq.com/developers documentation still supports the
short-file whisper-1 multipart endpoint and verbose word timing used by recovery.
The exact user's failed payload remains unavailable; no new paid job was created
just to check an existing job's status.

Live web remains version 122. Sites get_site can read public metadata, but both
create_source_repository_write_credential and list_site_versions return
project_not_found (404). The owner confirmed this Codex session uses a different
ChatGPT account because the owner account ran out of credits. Existing Site write
access is required to deploy; no new Site, audience change or authentication
bypass is used. Source changes/download metadata are prepared for authorized
publication. These local results do not represent a deployed web recovery check.

## Completed web publication after restored access — November 23, 2026

Sites write access was restored in the continued session. Opened the existing
source repository, rebuilt and packaged source f371022df21aaaafcd73ccb0735fa598383042e8,
and deployed existing public Site version 123. The update is live at
https://editai.it.com and the existing Sites domain, with matching public and
installed Mac 0.2.23. No replacement Site, audience change or auth bypass was used.
Final deployed Chromium reference/recovery/download checks pass 4/4; deployed
WebKit reference and recovery checks pass 3/3 (18.8s). They verify the clean picker,
first-cut/caption recovery and interrupted-section resume against the served build.
Authentication/provider fixtures remain explicit; the exact failed provider
payload and fresh live inference remain unverified. Source and final records
are pushed to main and codex/desktop-migration with history preserved.

Final Chromium detail: three cases passed on the first run; the multi-section
case encountered a generated fixture overwritten by the concurrent WebKit run.
Its isolated deployed rerun passed (9.1s), completing coverage of all four cases.
The recovery fixture now includes the worker PID in its filename to prevent
cross-process replacement. This was a fixture file-lifetime failure; no product
code changed after deployment.

## Editor model answer handling — November 23, 2026

Live logs show two /api/ai/chat 502 responses matching the user's report. The
plain-string-only parser rejected other final-answer shapes; low completion
budgets also left no recovery for an empty/truncated reply. The exact provider
body was not logged and is not claimed as reproduced. The parser now reads final
text blocks and structured parsed JSON, excludes reasoning/refusals, and supplies
8192 output tokens minimum. Empty or length-truncated responses get one bounded
16384-token recovery attempt (publik-smart for Publik; same personal model for
own-key users). This recovery is real provider processing under existing consent;
it can consume additional usage. No fake output, unlimited retry or validation
bypass is introduced. All operations remain atomically validated before applying.

Typecheck, production build, 54 unit/security tests and 22 native/backend contracts
pass. Backend integration covers empty length-limited response then structured
text success, and browser caption/chat plus failure-preservation checks pass 2/2.
Provider/auth fixtures are explicit; exact-user-payload and fresh-inference limits
remain. Shared web and signed/notarized installed Mac 0.2.24 publication follow.

Published editor fix as web version 124, source
ba3e7a1422fef46c7861275c9d2da9e5334435fa. Deployed chat/failure checks pass
2/2 (6.7s); deployed reference caption/style editing passes (5.8s), including real
editor changes and undo with a controlled provider reply. User confirmed the
prompt was “add the same text and captions that match this style” with a reference
video. This test covers that editing path, not a fresh inference on the exact
user reference. Recent production error-log inspection found no new AI errors.

Mac 0.2.24 is signed, notarized, public and installed. Genuine installed acceptance
passes with zero renderer errors and a real export rendered in 14.056 seconds.
Installer CI: 45104291380. Final matching website download publication follows.

Completed: web version 125, source 1dea9098665ab1aa1884eb615d95bcbc04c7bc5d,
is live at https://editai.it.com with verified public/installed Mac 0.2.24.
Final deployed caption/chat and download checks pass 2/2 (6.2s). Source and final
records are pushed to main and the migration branch; no history was rewritten.
Exact-reference fresh inference remains unverified as noted above.

## Reference title/caption fidelity and concise chat — November 23, 2026

Fixed three deterministic defects: addText ignored its supplied style; generic
portrait placement forced text toward the center; generated caption padding
created overlapping adjacent intervals and extra lanes. addText now applies its
style atomically to the newly resolved title UUID. Reference fitting protects
frame edges (.05–.95 horizontally, .07–.88 vertically) without relocating ordinary
upper titles/lower captions into an ad-layout preset. Vision instructions measure
both boxes independently for every reference, distinguish glyphs from stroke,
prefer genuine TikTok Sans where matching, and explicitly detect title outlines.
No reference-specific coordinates are hardcoded into the matching prompt.

Automatic caption origin is persisted separately from manual text; legacy anchors
remain recognized. Caption padding is bounded by the next caption, with genuine
shared-start intervals merged without dropping recognized words or inventing
source timing. Auto captions and Text have separate labeled timeline rows/lane
assignment. Timing edits preserve origin; original word IDs/media remain. Heading
styles include the supplied outline/font/weight/size/position on creation.

Assistant instructions require a short confirmation without internal analysis.
Display keeps the first sentence with a 24-word cap, preserving full user prompts
and underlying chat history. Bubbles align user right/assistant left with rounded
corners. Conversation scrolls to the latest message, while its composer remains
visible in compact windows. No new inspector tabs or diagnostics were added.

Typecheck, 57 unit/security tests, 22 backend/native contracts, production build
and all 51 editor browser cases pass (2.0m). A dedicated WebKit case passes (3.7s),
verifying inline outlined title creation, independent .29/.77 test-input heights,
10 consecutive captions in one Auto captions row, a separate Text title row and
brief opposing bubbles. Final focused composer/visual checks pass after removing
the conversation area's old minimum height; CSS computed flow/flex alignment
aliases are both accepted. Controlled ASR/model replies remain explicit fixtures;
actual canvas text, timeline application and undo remain active. This does not
claim fresh exact-font identification on the user's private reference. Shared web
and verified installed Mac 0.2.25 publication follow.

Web UI 126 is live, source 0783e42fc75e2a3ee8873ec9c5df15b8c4c8fb97.
Three focused deployed Chromium cases pass (14.7s), and the new title/caption/chat
case passes deployed WebKit (5.0s). These verify application of controlled reference
styles, outlines, separated heights, one sequential caption row, Text title row,
brief bubbles and visible composer. They do not claim fresh vision inference.

Mac 0.2.25 is signed, Apple-notarized, public and installed. Genuine normal-gate
acceptance and real native export pass (14.048-second render). Installer CI:
45107916577. Matching final web download metadata publication follows.

Completed: existing public web version 127, source
e3a0dcd9e7f5cf7a9d2d269cd81a59c03c8e2f37, is live at https://editai.it.com
with matching verified public/installed Mac 0.2.25. Final deployed title/caption/
chat and Mac download checks pass 2/2 (6.8s). Installer HEAD returns HTTP 200,
170,858,260 bytes. Genuine installed export passed with zero renderer errors.
Final source and records are pushed to main and codex/desktop-migration without
rewriting history. All owned local Workers are stopped. Existing generated text
requires rerunning the reference match/regenerating captions to use the new
layout; no unrelated stored user edits were silently rewritten. Exact-reference
fresh vision inference remains unverified as noted above.


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

## November 24: honest processing progress and background recovery

Clean UI typography, monotonic completed-work progress, actual phase headings,
Back versus explicit Cancel, background status, saved first-cut tasks and private
owner/input-scoped model checkpoints are implemented. Native window close hides
the active renderer; ordinary Quit waits for completion. Account/provider changes
are blocked during work. Startup recovery waits for the signed-in owner's storage
scope and existing AI consent. Polling never creates inference; failed/expired
model stages require explicit retry. Completed stages are reused, including the
final result. Account deletion purges the checkpoint cache.

WebKit exposed fetch rejection while an old document was unloading, which could
mark the recoverable task failed before the new page read it. Page teardown now
preserves pending state; it is distinct from explicit cancellation. A persistent
recovery notice initially covered timeline controls; it now belongs inside Home.
Recorded takes retain automatic editor entry. These findings were corrected.

Typecheck, 66 unit/security tests, 23 native/backend tests and production build
pass. All 55 Chromium editor checks pass (2.2m); final focused upload, cancellation,
recording, background completion and reload checks pass 5/5 Chromium (9.8s),
2/2 WebKit (4.7s). The new reload test proves one transcription submission and
one edit submission, followed by recovery of a completed result. Backend tests
prove owner separation, no inference on polling, atomic duplicate exclusion,
input binding and reuse of completed stages on explicit retry. A provider timeout
is tested as 504, distinct from an authentication failure. Browser/provider
responses are explicit fixtures, not new proof of paid Publik inference.

The broad browser run also found three unrelated marketing assertions failing:
review-card count (expected 24, rendered 8), FAQ/privacy selector, and hero badge
portrait assertion. Marketing files were not changed in this task. The broad run
was stopped to correct the editor notice; the complete editor suite then passed.
React review: hooks remain unconditional; task recovery is owner-scoped; operation
mutual exclusion is preserved; no hidden navigation cancels a job; background
controls have accessible labels and explicit cancellation.

Actual production logs showed authenticated /api/ai/chat and /api/ai/edit requests
returning 503 after approximately 91–93 seconds; no sign-in rejection was shown.
The previous 90-second model abort was mislabeled as unreachable. It is now a
180-second deadline with specific timeout handling. No account/provider choice
was changed and no fresh paid inference was issued merely to check the account.

Limits: this is checkpoint recovery, not a permanent hosted queue. A fully closed
web browser, Force Quit or power loss cannot execute browser-local audio analysis.
Saved upload work resumes on reopening; completed hosted responses are recovered.
Ordinary Mac window close and Quit preserve active work in the native process.
Live web and matching installed Mac 0.2.31 publication follow.

Web 138 is live at https://editai.it.com, source
62ce2f7ffab73869932860d26a74fd57a27b3164. Deployed Chromium centered upload /
processing and background completion pass 2/2 (9.7s); deployed reload recovery
passes Chromium (9.8s) and WebKit (10.1s). The first two checks immediately after
publication reached an old cached UI (old Cancel and rotating stage labels);
fresh checks reached the new version and passed. Real local media and speech
assets remained enabled; provider responses were fixture boundaries.
Mac 0.2.31 app signing/notarization passed; installer CI 45372748100 uses the
same source. Installed acceptance and final download metadata follow.

Final background-chat review found that the generic background action left the
old editor visible. It now pauses playback and returns Home, keeping timeline
controls away from the in-flight snapshot. The validated chat edit is persisted
before busy state clears, so immediate reopening cannot restore an older draft.
The new real-browser check verifies Home navigation, hidden timeline, exact saved
trim and reopening. Final focused checks pass 4/4 Chromium (7.0s), 2/2 WebKit
(4.8s), including existing caption chat and upload recovery. Mac staging is being
rebuilt before publication to include this behavior; the initial installer has
not been installed or published. No previous public release was replaced early.

Web 139 is live, source 4b4af05b358ad55d557dea3370c265fae978941e. Final
public-site background completion, reload recovery and background chat pass 3/3
Chromium (17.0s). The final Mac source build passes the normal real Publik gate,
background window-close IPC/retained renderer, packaged speech assets, editor UI,
stationary preview, native MP4 export (13.799s) and Downloads saving, with zero
renderer errors and no paid AI inference. This last run is explicitly unpackaged
(runtime.packaged=false); it is not installed-release acceptance.

Final desktop publication is blocked: `xcrun notarytool history --keychain-profile
editai-notary` now returns “No Keychain password item found for profile:
editai-notary”, including when the login Keychain is supplied explicitly. The
profile worked for the first staging build but is unavailable for the final
revision. Requested unlocking/restoring it through the user input tool; no secret
was requested in chat. The first finisher was stopped before installation or
publication, after the final background-snapshot fix became necessary. Public
GitHub v0.2.31 remains a draft; the installed Mac is still 0.2.30. Source and web
are pushed; no unverified updater metadata was published. Resume final build with
outputs/build-progress2-release.mjs, then its matching new CI run and
outputs/finish-progress2-release.mjs. These ignored helpers use fresh artifact
paths so they cannot reuse the previous staging installer parts.

## Generalized real-media editorial evaluation — November 24, 2026

The exact requested prompt and same original edited reference were used through
the real editor with both private recordings. Final first timeline 63.55s / MP4
63.566667s is close to the 63.666667s reference. Final second timeline 20.61s / MP4
20.625s retains its own content, removes its abandoned take and copies the general
reference styling. Both have verbatim retained-speech caption coverage, no caption
overlap, separate persistent titles, no detected black intervals and no tiny
wordless clips. Original recordings and reference were not modified. Real linked
Publik calls succeeded; one actual Chirp job per original source was polled/reused.
No fixture authentication was used for these provider/media evaluations.

Actual shipping native VAD failed before this task because its import selected a
backend absent from the package. Matching web's explicit WASM alias fixes it;
real recordings now complete local analysis through the normal renderer path.
Previous injected detector tests are not evidence for that earlier import path.
Measured waveform boundaries retain stable ASR IDs, safe word cores and low-SNR
fallbacks. A narrow restart adjudicator no longer removes isolated deliberate
repetition as its own replacement. Whole-script review and reference planning
use Publik's smart alias after faster semantic routes failed genuine comparisons.
No vendor model names or sample-specific prompts/ranges were added.

Optional packaged on-device OCR supplies text bounds; pixel rings estimate dark
outlines independently of font fill weight. Shared canvas font measurement fits
reference geometry; captions keep their own source words, balanced line breaks
and emoji, with independent title/caption tracks. Source-token validation can
repair an off-by-one endpoint only when the complete retained transcript matches.
Font matching remains approximate; unsupported scripts retain visual fallback.

Typecheck, 78 unit/security and 23 native/backend checks pass. Full production
Chromium editor suite passes 56/56 (2.3m). Real OCR runs in the browser fixture;
initial spelling assertion was corrected for OCR's I/l ambiguity rather than
suppressing detection. Prior affected Safari checks pass 4/4 (14.6s); final onset
changes receive fresh focused checks before publication. Detailed private trial
records, including rejected outputs and timing measurements, remain ignored under
outputs/editor-evaluation. See EDITORIAL-EVALUATION.md for the generalized changes
and evaluation limits. Live web and matching local desktop staging follow.

Final acoustic cache revision and caption-decoration preservation pass fresh
focused checks 6/6 Chromium (13.2s) and 6/6 WebKit (18.6s), including real local OCR,
caption/title layout, upload progress, reload recovery, timing recovery and
background chat. Final checks: typecheck, 78 unit/security, 23 native/backend,
web production build and desktop build pass. Final files are preserved in Downloads
under new EditAI sample names; exact export copies were SHA-256 verified.

Web version 140 is live at https://editai.it.com from source
1609b106296f14130e43e8905c0b11a83362e8bc. Deployed Chromium checks pass 4/4
(22.7s); deployed WebKit checks pass 3/3 (18.4s), including actual packaged local
OCR, measured text layout and background completion. These deployed tests have
explicit provider/auth fixture boundaries. The historical saved web automation
session has expired; new genuine hosted sign-in/inference is not claimed. Current
real provider evidence comes from the owner's normal linked desktop session.

Matching local Mac 0.2.31 is Developer ID signed and installed at
/Applications/EditAI.app, archive SHA-256
94affa6bdbfa319d49afcfb95a0f63aded81861fcb20dbd478adf82efe8ca70a.
The prior notarized app is preserved under
outputs/editor-evaluation/mac-before-editorial/EditAI.app. Installed acceptance
passes real linked Publik startup, sandbox/context isolation, shared editor and
reference controls, background close, stationary export preview, native MP4 export
(0.827s for its test project), and zero renderer errors. A separate normal
LaunchServices launch passed the gate and displayed both final saved projects.
The injected detector diagnostic in the installed harness is not the canonical
import-path proof; actual supplied-recording runs above establish that path.

This is a locally installed signed source build, not an Apple-notarized public
release. The editai-notary Keychain profile remains unavailable; no alternative
Apple environment credential or repository CI notarization credential is present.
The public installer/updater remains at the prior verified release. The older
v0.2.31 draft is stale and must be rebuilt from current source before publication.
When notarization is restored, a public version bump or explicit reinstall will
also update this same-version local source build. No public release verification
was weakened. Both source branches were pushed without rewriting history.

Sixteen owned evaluation projects and thirteen owned temporary Downloads exports
were removed; unrelated projects and original source files were preserved. The
finished projects remain in Edits and the two SHA-256-verified final exports remain
in Downloads. The owned local Worker was stopped after verification.

## Creation workflow refresh — November 24, 2026

Implemented independent Send options, recorder duration pills/progress/deletion,
combined recording review, local Batch thumbnails, personalized Home and compact
action cards. Analyze/Transcribe start after upload without a second action;
their results remain temporary and separate from saved projects. Leave/Stay and
account-scoped Don’t show again protect navigation, with local media cleanup and
standard browser unload warnings (custom confirmation for Mac window close).
The analyzer keeps the video’s intrinsic ratio beside its summary.

The initial focused Chromium suite passes 9/9: all four cut/caption combinations,
real generated-camera MediaRecorder with multiple takes/deletion/combined import,
Batch thumbnail decoding, automatic analysis/transcription, no cloud project
writes for temporary tools, Stay/discard/suppression/media cleanup, first-name
welcome, aligned card headings and desktop/mobile camera-flip visibility. These
provider-boundary fixture tests do not prove real Publik connectivity. Full and
cross-browser checks and matching release acceptance are recorded below.

Local validation: typecheck, production build, all 78 unit tests and 23 desktop
contract tests pass. The full Chrome run passed 61 checks and found one obsolete
Home-copy assertion; that assertion is updated and the final 10 affected Chrome
checks pass, including actual portrait video geometry beside the summary. The
initial Safari run passed all 9 affected checks; final Safari acceptance and
installed Mac/publication evidence follow. Browser fixtures do not exercise
physical camera permissions or real paid provider calls.

Final affected acceptance passes 10/10 in Chromium and 10/10 in WebKit. The
public version-141 build (runtime ca82f05312fcbf082e8675a9494e7263c37ad2cd)
passes 6/6 creation-workflow checks in each engine. These isolated API fixtures
are explicitly distinct from real provider connectivity.

Matching Mac 0.2.32 is installed in /Applications/EditAI.app. Normal
LaunchServices startup passed the genuine Publik gate and retained both prior
final editing projects. The installed, sandboxed app passes the new recorder,
Send-default and Batch-preview checks; existing text, animation, audio-fade,
selection, background-window-close and actual export checks also pass without
renderer errors or provider fixtures. Native export took 1.318 seconds; the
composited animation/text export took 14.054 seconds. This acceptance made no
paid AI request, kept the owner’s privacy preference, and removed its two owned
QA projects/exports.

App archive SHA-256:
477b7ca720dc007d0089c31740a855409eb318d8c6a468e908b3f96255b4d831.
Developer ID, Apple notarization/stapling, Gatekeeper, matching native source,
ZIP/blockmap/updater digests and DMG archive equality all pass. Local DMG assembly
hit a read-only-volume error; GitHub run 45473226187 assembled and inspected the
exact signed ZIP instead. Its DMG then passed local Apple notarization and
verification. The guarded publisher released v0.2.32 with its matching source and
checksums. Public Mac download metadata now points to this verified release.
Prior installed app is preserved at outputs/workflow-ui/mac-before/EditAI.app.

Final web 142 is live from 508df1f3e88e848bbf71ab419e77f4dc02fd60f3.
Device-specific installer/Home checks pass 5/5 each in Chrome and Safari. The
served page references the freshly built asset containing the 0.2.32 Mac link;
that asset and the public notarized installer return HTTP 200. GitHub latest is
public v0.2.32. All requested UI changes are published on web and the matching
verified Mac app; original iOS/private marketing projects remain untouched.

## Required name onboarding and profile persistence — November 24, 2026

Added an authenticated final name step matching the native app’s “Who runs this
studio?” screen: first name required/max 40, last name optional/max 39. Values
save through an owner-authenticated endpoint into the existing profile table;
submission failures retain the inputs for retry. Returning named accounts skip
the step. Settings rejects blank or over-80-character names; saved changes update
Home and survive reload. Server tests verify persistence through real route/SQL
sign-out/resume and preserve account isolation, using isolated provider fixtures.

Investigation found Jadon in the live website profile data while the Mac local
profile table was empty. The initial check queried Mac only; it did not establish
that the website had lost the saved name. The two linked-install owner scopes
are different; no profile is copied by guessing another owner’s identity. The
owner explicitly supplied Jadon for completing the Mac onboarding verification.
Typecheck/build, 79 unit and 23 desktop contracts pass; five Chrome acceptance
checks pass. Final release/cross-browser evidence follows.

Name onboarding acceptance passes: all 63 Chromium browser checks, 5/5 focused
WebKit checks, and hosted web-143 name/profile checks 3/3 in each engine. Live D1
still contains the owner’s saved Jadon profile; it was not erased by the rollout.
Browser/provider fixtures are not claimed as genuine Publik connectivity.

Installed 0.2.33 passed the actual first-name screen with the owner-provided
Jadon value: blank submission disabled, 40-character limit present, real profile
write successful, reload and full normal LaunchServices restart both restore
“Welcome, Jadon”. The signed-in Mac profile table now contains Jadon. Genuine
Publik authentication, existing final-project preservation, all editor/text/
animation/audio-fade/background-close checks, and native/composited exports pass
with no renderer errors or paid AI request. Native export took 0.815 seconds;
composited export took 13.545 seconds. Three owned QA projects were removed, and
a post-close read confirms none remain. User privacy choices remain unchanged.

The final acceptance harness needed its Batch selector scoped to the Home tools
because a previous owned QA project had the same prefix; this was a verification
selector ambiguity, with no application change. Native archive SHA-256:
921d461a8ead00710e3dd2d129f09bee5a188c5970cb1018e233ed529a5d5966.
App and CI-assembled DMG (run 45477182854) pass Developer ID, Apple notarization/
stapling, Gatekeeper, exact archive/native-source and updater verification. The
guarded publisher released v0.2.33; download metadata selects it. Prior installed
0.2.32 is backed up at outputs/name-onboarding/mac-before/EditAI.app.

Final web 144 is live from 68571bca3fd736c84aee9a655e5a4c2765b92e42.
Name onboarding/Settings/Home checks pass 2/2 per engine on the final public
build. Its HTML references the freshly built client asset containing the verified
0.2.33 download; page, asset and public installer return HTTP 200. Both requested
platforms are published, the Mac installation is verified, and name persistence
is checked without merging different linked-owner identities.

## Home action motion correction — November 24, 2026

Replaced whole-SVG Batch/audio/sparkles motion with per-part movement. Batch
shares the website’s stack keyframes, easing, duration and layer delays. Audio
bars change amplitude individually inside a stationary frame. Three four-point
Analyze stars pulse slightly at their own centers without rotation/translation;
small stars scale 1.28x and the center 1.14x. Reduced-motion disables descendants
as well as the frame. Record reads Record your ideas.

Storage investigation confirms automatic source backup limits (100 MB/file,
500 MB/linked owner), explicit backup of older source media, JSON metadata export
without original video files, and owner-scoped EditAI deletion without deleting
the Publik account. The current UI has no JSON restore action. These facts were
explained; no storage action or redesign was authorized/performed.

Local icon-motion verification passes 3/3 in Chromium and 3/3 in WebKit,
including actual website Batch timing comparison, sampled waveform matrices
(scale-X fixed at 1, amplitude 0.55 to 1.25), stationary star scale pulses,
reduced-motion suppression, Home layout and saved-name regression. Typecheck,
production build, all 79 unit and 23 desktop contracts pass. Provider boundaries
use isolated browser fixtures; no real AI connectivity is claimed from these
checks. Matching signed/notarized Mac 0.2.34 and hosted verification follow.

Public web 145/bd8e0fa passes 2/2 Home/motion checks in each browser. Matching
Mac 0.2.34 is installed and passes genuine Publik/normal LaunchServices startup,
existing final-project/name preservation, individual Batch/wave/star motion,
reduced-motion, and all prior editor/text/motion/fade/export/background guards.
No renderer errors, provider fixtures or paid AI requests. Native export:
0.804 seconds; compositor: 13.546 seconds. Owned QA projects are fully removed,
confirmed from the closed application’s store; Jadon remains saved.

App archive SHA-256:
c2bc0b2c42e8752aaa8d01425184bead0bba7c4dca9dd3544524c7894a068aa0.
A signed/notarized ZIP was built directly; CI 45487164051 assembled and inspected
the exact app in a branded DMG. Final app/DMG Developer ID, Apple notarization/
stapling, Gatekeeper, archive/source/updater verification all pass. The guarded
publisher released v0.2.34 and generated matching web download metadata. Prior
0.2.33 app is backed up at outputs/action-motion/mac-before/EditAI.app. Storage
controls/data remain untouched by this UI task; their purpose was explained.

Final web 146/69dcd2a is live with the matching 0.2.34 installer. The final icon
motion/reference/reduced-motion check passes in both Chromium and WebKit. HTML
references the current built asset; page, asset and public installer return HTTP
200. Both branches are pushed without rewriting history. Original iOS/private
marketing projects are untouched; storage controls and user data are preserved.

## Five-minute time-savings graph — November 24, 2026

The blue action converts editing time to Time back using five minutes per
video, with onboarding volume/frequency estimating monthly video count.
A 20-hour/17-video month leaves 85 editing minutes and 1115 saved minutes.
The graph and keys conserve 43200 minutes, including partial-hour cells.
Other activities remain fixed. Show current time reverses the comparison.
Reduced motion completes immediately; hidden/offscreen animations pause.
Replay, the redundant Back to EditAI link, and extra explanatory paragraphs
are removed. The logo still links home.

Production Chromium and WebKit each pass three focused onboarding/graph tests,
including reset, initial reveal, exact minute conservation, blue button and
reduced motion. Typecheck/build, 80 unit and 23 desktop contracts pass. These
onboarding UI checks use logged-out fixtures and do not establish provider
connectivity. A separate native fixture verifies the installed graph while
restoring the genuine account afterwards; genuine desktop acceptance remains
a distinct mandatory publishing check.

Hosted web 147/7a3374e passes the three focused tests in both browsers.
Installed Mac 0.2.35 graph fixture confirms exact allocations, blue button,
removed header link and restored genuine session. It is explicitly marked as
a fixture and does not prove provider connectivity. Separate genuine normal
Publik/LaunchServices and post-signing editor/motion/fade/text/export checks
pass, fixtures false, zero renderer errors. Jadon and both final projects
persist; closed-store audit confirms no owned synthetic Batch projects remain.
The compositor export completes in 14.054 seconds. No paid AI calls are needed.

The installed and CI-DMG app archive SHA-256 is
882111ba07261dc77b8ea6390298b1fe8a787039aa6dd9778b67f346867410f0.
App, ZIP and branded DMG from CI 45492942350 pass Developer ID, notarization,
stapling, Gatekeeper, matching archive, native-source and updater checks.
Prior Mac 0.2.34 is backed up at outputs/time-savings/mac-before/EditAI.app.
Final public release/download metadata verification follows.

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

## November 24 — rejected chat proposal recovery and signup cleanup

The owner chose to retain current Publik requirements. One official sign-in
replaces the duplicate Google-via-Publik CTA in browser/native onboarding.
Response validation now returns normalized unused fields; schema capabilities
match the requesting client. Invalid proposals receive one bounded regeneration
with schema-path-only diagnostics before returning any edit. Unknown/unsafe
operations still reject as a batch, and client editorial checks remain intact.
Cancellation and actual provider/credit errors do not trigger this repair loop.

87 unit and 24 desktop contract tests pass. The shared real API handler is
exercised with controlled provider transport for rejection→repair, smart-tier
retry, two-attempt cap and exact 402 message/top-up preservation. Typecheck/build
pass. Chromium signup/caption-chat/inline-typing browser checks pass 3/3. These
controlled fixture tests do not establish real Publik connectivity. Production
health reports auth/storage configured; a genuine installed account check and
Mac/web release verification follow separately.

PayPal is a prepared server connector only: exact $8/$10 monthly USD plan
verification, no setup fee/trial, owner/plan-bound ACTIVE checks, cancellation,
approval URL allowlisting and webhook signatures. Pricing/ownership/environment/
signature tests use a controlled transport. No merchant account or live checkout
has been connected. docs/PAYPAL_SETUP.md details the remaining activation work;
paid entitlements and shared owner credit funding are not claimed implemented.

Web 155 / 5390c1b is live; hosted single-signup and caption-chat checks pass
2/2 in each browser. Signed/notarized installed Mac 0.2.39 passes UI fixtures
separately from genuine provider verification. An unmocked Publik request against
the owner's actual saved sample returned HTTP 200 and captionStyle operations
that passed applyOperations/validate atomically. Neither input nor saved project
was changed. This exercised real AI inference, not an injected response; private
transcripts/credentials are not written into the report. Evidence:
outputs/chat-recovery/real-chat.json. Normal LaunchServices re-verifies the
actual Publik session, required name and both original projects. DMG CI
45514892503 succeeds; final notarization/export acceptance is still pending.

Final signing/native acceptance: CI DMG 45514892503 downloaded, locally signed,
notarized/stapled and Gatekeeper-verified against the installed/ZIP archive.
Genuine post-signing desktop acceptance passes all required editor, text,
workflow, motion, account persistence and export checks without renderer errors.
Native compositor export: 14.057 seconds. Private owner 0.2.38 backup remains
at outputs/chat-recovery/mac-before/EditAI.app. Final QA cleanup/public release
and web download metadata follow.

The owner clarified paid browser/Mac plans should use the app's OpenAI funding
with $8/$10 pricing, separate from Apple. Runtime inspection shows no OpenAI or
PayPal credentials on the web host. App source references server-side
OPENAI_API_KEY; Supabase is available but not yet installed/connected and was
offered for secure backend inspection. No actual sponsored inference or PayPal
charge was performed. Free owner-Publik grant allocation is requested but has
no verified platform-supported setup; current wallets are preserved. These are
explicit pending funding/merchant integration dependencies, not verified features.

Mac 0.2.39 is public and installed, with its guarded publisher accepting all
archive/signing/native/UI checks. Cleanup runs through the UI and confirms the
closed store has zero owned QA rows and both original final projects. Final
web download metadata and matching assets are next.

Final web 156 / 484cc38 is live with the verified public Mac 0.2.39 installer.
Final hosted single-signup/caption-chat cases pass 2/2 in Chromium and WebKit.
Six client scripts and two mascot PNGs match the final build; page/assets/DMG
return HTTP 200. Installed archive remains
fae69f543527ebc5318eaa34a397bef82d8c7800864360ae80f78457bdf4437c.
All owned QA processes are stopped. Source and verification records are pushed
to both authorized branches without rewriting history. PayPal checkout,
owner-funded paid OpenAI and a shared free Publik grant are NOT active: the
secure service/merchant connection and grant allocation support remain pending.

## November 24 — original floating character restoration

Restore the identity from 10eda7e's original atlas; do not adopt the legged
scissors reference as the robot body. V3 artwork has a continuous rounded
bottom, plain headphones, balanced scissors, softer cyan/lilac/peach palette,
large oval eyes and open smile. New generated layers retain their source RGB;
conservative alpha cleanup removes background remnants. The app composes
expressions and the articulated arm without swapping whole character frames.

Typecheck/build, 87 unit and 24 desktop contracts pass. Existing browser
behavior checks now also probe the body lower-center alpha to prevent a leg
notch regression. Visual previews in light/dark confirm the intended round
identity and no idle blush. Native release and final hosted checks follow.
No application AI/Publik inference was performed for this visual verification;
fixture UI checks
remain separate from genuine native authentication acceptance.

Web 157 / 061cbfb is live; hosted pose and inline-chat checks pass 2/2 in each
browser. Native UI verification passes for v3 body/arm assets and a solid lower
center (restoredFloatingDesign), aligned blink, continuous wave, zero idle blush,
reduced motion and chat. These are explicitly fixture UI checks; the genuine
account is restored and separate real gate/export acceptance follows. Signed,
notarized installed Mac 0.2.40 archive:
39a35a7783a8ef8116b7e650d57300741ce23d2c820004a22030429d7a4d6b84.
CI 45518578096 is assembling its branded DMG from the verified signed ZIP.

CI 45518578096 and final DMG signing/notarization/stapling/Gatekeeper checks pass.
Post-signing genuine native acceptance passes all required editor, text,
workflow, motion and persisted-profile checks without renderer errors. Real
native compositor export completes in 14.054 seconds. Normal LaunchServices
also confirms the real Publik account and both original final projects.
Prior installed Mac 0.2.39 is preserved at
outputs/mascot-restore/mac-before/EditAI.app. Public release and final web
metadata rollout are next.

The guarded publisher accepts and releases Mac 0.2.40. QA cleanup confirms zero
owned QA rows in the closed store and preserves both original final project IDs.
A metadata-only owned Batch 2 row required authenticated, owner-scoped API
cleanup after its local UI entry had gone; cleanup only targets the exact QA
allowlist and leaves user files/projects intact. Final web download metadata
and matching-asset verification remain.

Final web 158 / 9df9b1d is live with public/installed Mac 0.2.40. Six client
scripts and both v3 PNGs match the final build, and page/assets/installer return
HTTP 200. Final WebKit pose/inline-chat cases pass 2/2. First final Chromium
inline-chat startup timed out waiting five seconds for Home (pose case passed);
an unchanged rerun with tracing passed both cases. Earlier hosted 157 and local
production checks also passed in both engines. No source workaround or increased
wait hid the transient startup timing. All owned servers/application processes
are stopped; closed-store cleanup confirms zero owned QA rows and both original
final projects remain. Source/verification records are pushed to both authorized
branches without rewriting history.


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

## November 24 — Eva, undo and resizable timeline

Verify one-step slider undo/redo, repeated and same-turn consecutive history
commands, tooltip centers over their own icons, animation reset at the heading,
matching neutral reset colors, and pointer/keyboard timeline resizing with both
limits and responsive viewport changes. Resizing must not enter edit history.
Use the shared eva-acceptance helper in browser and installed-renderer tests.

The localized built-in image edit changes 644 pixels in each right-neck outline;
all pixels outside that region remain identical, keeping the scissors frames
aligned. Move the SVG headphone play to the optical center of its front cup.
Keep image prompts, matte verification and screenshots in outputs/eva-studio/.
Do not interpret fixture UI tests as real Publik provider verification. This
change does not alter AI routing or require another paid reference-generation
request; verify the genuine installed gate, project retention and native export.
The signed/notarized installed and public Mac release will be 0.2.46.

Typecheck/build, 90 unit tests and 24 desktop contracts pass. Focused Chromium
and WebKit checks pass; all six hosted edit/export/history/mascot cases pass on
web 168 (9d4339c). The notarized installed 0.2.46 app passes the shared Eva
controls, prior mascot/inline chat checks and normal LaunchServices startup
through the genuine Publik gate. The original final projects remain present.
CI 45552793951 produced the matching branded installer. Developer ID signing,
Apple acceptance, stapling, Gatekeeper, mounted-app/archive comparison and
updater integrity all pass. Full installed acceptance passes through genuine
authentication with native MP4 export (13.57 seconds), Downloads, still preview,
editor/text/motion/creation UI and background handling. Temporary QA projects
are removed from UI and closed SQLite store; original final edits are retained.
Mac 0.2.46 is public and installed. Web 169 is live from b615036 with the
matching installer link. Six live client scripts and five mascot layers match
the local build byte-for-byte. All four hosted device/download cases pass.
Public installer HEAD returns HTTP 200; release artifact digests match the
signing record. Owned app/server sessions are closed; unrelated servers remain
untouched. Both authorized branches receive the final verification record.

## November 24 — Home/Eva palettes and free overlay rotation

Native palette source: read-only ProfileUploadTheme.swift and ProfileAvatar.swift
in the sibling app. The four native dark Home schemes match their exact hex
values. Supplemental web schemes retain their app avatar palette. Every Eva
variant uses appPalette(theme, false).logo; EditAI keeps original unfiltered art.
No raster shapes or animation poses change. Verify light/dark renders against
one fixed backdrop to isolate material pixels from page background/position.

The optional overlay.rotation angle defaults to zero for existing projects and
is validated within -180...180 degrees. Preview, crop frame and compositor
export share this angle, while source quarter turns stay separate. Outside-corner
handles support one-step undo, cancellation, keyboard and rotated local resizing;
reset crop resets free rotation. Actual MP4 red-edge slope must match the preview
angle, and saved reopen retains it. Existing text selection and native motion
checks remain required. Shared installed UI checks stay separate from genuine
session/LaunchServices and full native-export acceptance. Mac target: 0.2.47.

Typecheck/build, 93 unit tests and 24 desktop contracts pass. Six focused
production-build browser cases pass in Chromium and WebKit, including encoded
rotation verification and all eight light/dark palette pairs. Four focused hosted cases pass on web 170 from cedcc35. All eight theme-pair
checks, native dark tiles and new rotation interactions pass in the installed
0.2.47 app, alongside existing Eva/chat controls and normal LaunchServices
startup through the genuine Publik gate. Test-only settings interception and
local preference restoration protect the original account appearance. Original
final edits remain present. The shared Node test helper uses explicit .ts
imports. CI 45557161424 built the matching installer. Signing, Apple acceptance,
stapling, Gatekeeper, mounted-app/archive comparison and updater hashes pass.
Full installed acceptance passes through genuine authentication, native MP4
export (14.103 seconds), Downloads, still preview, editor/text/motion controls
and background handling. Owned QA projects are cleared from UI and closed
SQLite store. Mac 0.2.47 is public and installed. Web 171 is live from b7b6141
with its download link. Six scripts, five mascot PNGs and the rotation cursor
match local assets byte-for-byte. Four hosted device/download cases pass. The
public installer returns HTTP 200 and public digests match the signing record.
Both authorized branches receive the final verification record. Owned app and
Worker sessions are closed; unrelated servers remain untouched.

## November 24 — Vibrant Eva mappings and resize-to-tilt corners

Eva's nondefault themes derive all three material colors from each light-mode
logo hue, using the same saturation/value mapping for every scheme. RGB material
masks follow the original cyan, violet and peach shading instead of washing the
whole canvas with one gradient. Neutral gloss and original dark face remain;
EditAI has no filter, and raster/pose geometry is unchanged. All eight themes
remain appearance-independent. Dark Home palettes retain native values.

Remove outside rotation hit areas. Overlay corners resize radially, then unlock
rotation after >14px deliberate tangential movement outside a 0.35 radial corridor.
Rebase from the last preview to avoid a size/angle jump; keep the original atomic
undo/cancel snapshot. Upright snaps within 3° and releases beyond 5°. Opposing
curved arrows appear only while rotating. Keyboard corner arrows/Home still work.
Visible overlay hits select the overlay row/inspector; text/caption hits stay above
those hits. Browser acceptance exercises pointer/keyboard, undo/cancel/reset,
click selection, save/reopen and actual compositor MP4 edge angle. Tests using
fixture sessions/settings/media do not establish fresh provider connectivity.
Signing, installed genuine gate/export and hosted verification follow below.

Typecheck/build, 96 unit tests and 24 desktop contracts pass. Six focused cases
pass in both Chromium and WebKit; the final two gesture/palette cases pass after
portrait-threshold and listener-cleanup refinement. Pointer angle assertions allow
browser coordinate rounding; keyboard and stored angles remain exact. Screenshots
under ignored outputs/eva-gesture show all eight soft multi-color variants.
Targeted React review has no errors and four existing native-image advisories.

Installed 0.2.48 passes all eight light/dark theme pairs and direct overlay
selection, diagonal resize, vertical breakaway, active-only cursor, upright snap,
cancel/undo/redo, keyboard, reset, original Eva/chat controls and normal
LaunchServices startup through the genuine Publik gate. Original final edits
remain. Fixture settings are restored and are not evidence of fresh provider
requests. CI 45562231365 assembled the exact signed app into the branded DMG;
Apple acceptance, stapling, Gatekeeper, matching mounted/archive content and
updater hashes pass. Genuine installed acceptance passes, including native MP4
export in 14.102 seconds, Downloads, still preview, editor/text/motion/creation UI
and background handling. Owned QA projects are cleared from UI and closed SQLite.
Mac 0.2.48 is public and installed. Final hosted publication follows below.

Web 172 is live from 7724801 with the verified 0.2.48 installer link. All eight
hosted feature/device/download cases pass, including the actual compositor
rotation export. Eight live JS/CSS assets, five mascot PNGs and the opposing-arrow
cursor match local bytes. Public installer HEAD returns 200 with matching size;
all four signed public artifact digests match the signing record. Both authorized
branches receive this final verification record. Owned app/server sessions are
closed; unrelated processes remain untouched.

## November 25 — Eva request validation, transform controls and support

Investigated owner screenshots against production Worker logs: POST /api/ai/chat
returned 400 at 06:49:41 and 06:52:26 UTC (request IDs 447a690f9eae3591286f66328bf0de65
and be0bdc73f3c4959c0ea4328364c7e05a). Prior logs omitted the validator category,
so the exact original rejected field cannot be recovered. Added bounded static
validation-category/request-ID diagnostics without logging prompts, images or keys.
Reproduced an audio-readable HEVC MOV returning zero video dimensions. Reference
preparation now converts unreadable video locally before capture, rejects invalid
duration early, and cannot send blank zero-size references. A forced-decoder
regression checks actual JPEG pixel variation and the server request contract.

Also aligned chat input with the editor's established 10ms primary/50ms media
boundary tolerance and its unlimited still-image overlay holds. Image overlays
longer than their nominal 10-second source and tiny legal source rounding no
longer fail the request validator. Video overruns, malformed tracks and atomic
AI edit checks remain enforced. No video-specific prompting or source-word changes.

The timeline resize bump no longer adds vertical space above the toolbar. Its
controls now have balanced top/bottom spacing. The rotation cursor is 22px, with
centered 11px hotspot. Rotation-mode radial movement scales the overlay around its
center while angular movement tilts; upright snapping and atomic undo remain.

The owner selected Resend and will connect it. In-app support has an optional
140-character title and required 5,000-character message, explicit failure with
preserved draft, and stable retry ID. Hosted /api/support authenticates the user,
limits requests, fixes the recipient to editaiapp@gmail.com, and sends plain text
through Resend with an owner-scoped idempotency key. Native relays only this fixed
route to editai.it.com using its real per-user Publik credential; the Resend key
is never bundled or exposed to the renderer. CSRF, unclaimed accounts, malformed
reports and excess sends are rejected. Fixture mail responses do not establish
real delivery. Production sending requires server secrets RESEND_API_KEY and
SUPPORT_FROM_EMAIL (a sender permitted by that Resend account). No real delivery
is claimed until those are configured and a genuine report is accepted.

Work is isolated in EditAI-Web-eva-support to preserve concurrent language edits
in the original checkout. Those uncommitted changes are not included or overwritten.

Typecheck/build, 100 unit tests and 25 desktop contracts pass. Seven focused
production-build cases pass in Chromium and WebKit, including forced unreadable
HEVC conversion with nonblank frame pixels, balanced toolbar, failed-report
preservation/retry, simultaneous resize/rotation and actual encoded MP4 angle.
Installed 0.2.50 passes the shared Eva/theme/history/transform/support UI checks.
The native support UI fixture intercepts renderer fetch because its main-process
relay is outside browser route interception; this fixture does not establish mail
delivery. Its failure/success responses are never production behavior.

A separate genuine installed Eva run used a clone of the saved transcribed project
and edited.mov with “Edit in this style and add captions”. Actual Publik response
was HTTP 200, generated captions with 37 phrases and captionStyle/reference-layout
changes. Source word IDs remained unchanged; the clone was removed and original
projects retained. This verifies shared provider/edit handling, not the unknown
exact reference/prompt from the owner's latest screenshot. Hosted Resend secrets
are still absent; email delivery remains explicitly unverified/pending owner setup.

CI 45569445482 assembled the exact signed app into the branded 0.2.50 DMG.
Apple acceptance, stapling, Gatekeeper, mounted-app/archive comparison and updater
hashes pass. Genuine installed acceptance passes, including native MP4 export in
15.627 seconds, Downloads, still preview, editor/text/motion/workflow controls and
background handling. Only explicitly owned QA titles are cleaned up; the two
original final edits remain. Mac 0.2.50 is public and installed. Fixture media was
copied into this isolated worktree; missing media paths on the first attempt were
test setup failures, corrected before the complete passing acceptance. Final web
publication and support-relay verification follow below.

## Settings and interface language — November 24, 2026

General now contains App language and bottom Feedback & help/Delete my account;
Projects & storage is removed. Appearance has an idle floating Eva, eight circular
named swatches and icon-based display choices; Privacy follows it with a 20px gap.
Independent columns remove grid-row whitespace. Locale dictionaries cover authored
studio controls/onboarding/status/recovery copy in eight languages plus English.
Automatic detection uses local transcript evidence and per-account user-message
language counts, defaults to English and preserves manual overrides. Text being
edited, filenames, project names and operation/word IDs are never translated by
interface rendering. AI response-language guidance changes prose only.

Typecheck, 101 unit tests, 24 desktop contracts and both production builds pass.
The browser suite passed 70 of 72 scenarios initially; the two older failures were
missing reference-transcription fixtures and an obsolete Home illustration/theme
selector. They were corrected without adding production fixtures or auth bypasses.
Focused Settings cases pass Chromium/WebKit: all locales, persisted manual choice,
automatic Spanish detection, original project names, layout, theme preview, hover
behavior and deletion cancel/confirm. Backend fixture checks exercise real local
SQLite/account/source/session deletion and preservation of a second owner. These
checks do not prove fresh Publik connectivity or paid inference. Final release and
hosted evidence will be appended after their acceptance.


## Settings release 0.2.51 — November 24, 2026

Integrated the concurrent Eva/support work additively; no remote history was
rewritten. The shared runtime is from c14c6ec. Final checks pass: typecheck,
105 unit tests, 25 desktop contracts, both production builds, all 74 Chromium
studio/reference scenarios and all three focused Settings cases in WebKit.
The earlier legacy fixture/selector failures are corrected and pass in the final
suite. Translation dictionaries cover all authored catalog keys and preserve
interpolation values, filenames, project names and native editing identifiers.

The signed/notarized installed Mac 0.2.51 passes genuine normal-gate restoration,
all Settings/language/theme checks, idle non-waving Eva, independent card gaps,
existing mascot/history/rotation/support UI fixtures and full genuine editor,
workflow, motion, text and native-export acceptance. Real export is H.264/AAC,
854×480, 19.1 seconds, in 14.068 seconds, with no renderer errors. Both newly
created export QA projects are removed; owned mascot QA rows are absent from the
closed native store. The four pre-existing project records remain. Original
preferences are restored after Settings checks. No fresh AI inference or genuine
account deletion was performed in acceptance; destructive deletion is covered by
isolated authenticated browser/backend fixtures, including all sessions and owner
isolation. Automated telemetry remains disabled during verification.

Installer CI 45570582160 assembled the branded image from the exact signed ZIP.
App, ZIP and DMG signatures, Apple acceptance, staples, Gatekeeper, archive identity,
packaged Publik self-test, corresponding native source and updater metadata pass.
App archive SHA-256: 4e1cce8984a9ca73c4e74dde5b162afe38aeb5560e774a21e691794dae7a167b.
DMG SHA-256: 06dbd230b4a576c74271bea14bc9414040abd00fe5e4d5ddfc32a9c8fecb0488.
Mac 0.2.51 is public and installed at /Applications/EditAI.app. The preceding app
is retained at outputs/settings-release51/mac-before/EditAI.app. The download
manifest now targets the verified release; live web publication follows.

Final combined state: concurrent Settings/language work is preserved. Web 173
published this task plus those merged changes from 350d136; all nine hosted
feature/device/download cases pass. Web 174 then published c7c852b with the
verified 0.2.51 link. Its eight live JS/CSS assets match the canonical original-
checkout build byte-for-byte (a separate worktree produces different chunk IDs),
and all five mascot layers plus the 22px cursor match. Native 0.2.51 is installed
and public; its installed archive matches the signing record and genuine export
acceptance. All four public artifact digests and the HTTP-200 installer size match.
The 0.2.50 release remains available, superseded by this combined verified release.

The genuine installed Mac-to-hosted /api/support relay authenticates successfully
and returns the expected 503 configuration-pending response, with no email
accepted and no fixtures. Resend delivery remains pending the owner's key/sender;
no fake success or external Gmail redirect is used. The real-reference test copy's
remaining server metadata was removed by exact owned ID/title, and its closed-
store count is zero. Other user projects are preserved. Combined typecheck/build,
105 unit tests, 25 desktop contracts and seven focused browser checks pass. Owned
servers/apps are closed; unrelated processes and original-checkout work remain.

## Settings publication verified — November 25, 2026

Web version 174 is live at https://editai.it.com from
c7c852b514e6b454c88c0dd141503216c90d0d32, with matching verified Mac 0.2.51.
All three hosted Settings scenarios pass in Chromium and WebKit, including all
language choices, automatic Spanish detection, persisted override, unchanged
project names, theme preview/layout and fixture deletion. The hosted deletion test
now waits for the intentional page reload before reading cleared preferences.
Eight client JS/CSS assets, all eight lazy locale scripts, five Eva rasters and
the rotation cursor match local production bytes. GitHub latest is v0.2.51;
public installer HEAD returns HTTP 200, 200,998,710 bytes, and public artifact
digests match the signing record. Backend/provider/delivery claims remain scoped
as above; hosted UI checks use explicit authentication/API fixtures. Source and
all additive concurrent history are preserved on both authorized branches.

## Publik listing README — November 25, 2026

Replaced the developer-facing root README with concise EditAI user copy, the
owner's unchanged Home screenshot first (Publik cover), editor screenshot,
five existing features, current web sign-in link and verified Mac 0.2.51 download.
Moved development/setup/security notes to docs/DEVELOPING.md and corrected its
relative links, live URL and superseded branch instruction. License remains last.
This changes listing documentation only; shared app runtime and installed release
remain at the previously verified web 174/Mac 0.2.51.

Typecheck, all 105 unit tests and production build pass. Both supplied screenshots
match the copied files byte-for-byte; all relative documentation links resolve.
Web sign-in and current public installer return HTTP 200; installer size is
200,998,710 bytes. Publik's public page still serves its cached former README at
this check. Dashboard refresh requires the owner's authenticated browser: Chrome
JavaScript automation is disabled and macOS accessibility automation is denied.
No Publik listing refresh or new screenshot submission is claimed here.

Publik refresh completed by the owner: the dashboard reported “Found v0.2.51.
The scan is clean and it is live now.” Public HTML now contains the Home image
as the eager main cover, both README screenshots, new user introduction and Mac
0.2.51 link, with the former developer introduction absent. Public GitHub README
and both images match committed bytes. The existing listing URL remains
https://publikhq.com/editai-desktop.

## Support images and save feedback — November 25, 2026

Implement chat-bubble Support and Help tooltips, and reference-counted local/remote
save activity with pending-edit coverage, a small muted refresh/check indicator and
reduced-motion handling. Support image previews/removal survive failed sends;
server validation bounds signatures, MIME, names, base64 and aggregate size. Native
relay and hosted body limits support the same bounded payload. Delivery remains
gated on the owner's genuine Resend configuration; no success is fabricated.

Initial typecheck, 107 unit tests, 25 desktop contracts and both builds pass.
Focused Chromium and WebKit tests pass real FileReader/preview/removal/limit UI,
failed-send retention and idempotent retry, delayed background saves and tooltips.
The backend fixture checks a native-authenticated attachment request above the
old 24KB limit and forwarding only validated image bytes to the fixed inbox.
These tests do not claim genuine email delivery. Full release acceptance follows.

The full Chromium studio/reference suite passes all 75 cases. Hosted web 175
from f3ca047 passes both support/autosave scenarios in Chromium and WebKit.
Installed Mac 0.2.52 passes the same attachment/autosave UI checks and all Settings
languages/themes, restoring its genuine session and original preferences.
The autosave harness now explicitly tests normal motion before reduced motion
and restores the inherited preference. Signed app and DMG notarization, stapling
and Gatekeeper verification pass. Fixture support sends remain distinct from
genuine email delivery, which still awaits the owner's Resend key and sender.

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

## Private AI boundary — November 25, 2026 (in progress)

Owner authorized an open-source editor backed by a private AI service, preserving
Git history without force-push. Current public source no longer contains the
Eva/selection/review prompts, reference examples or editorial orchestration.
Public request/reply contracts and atomic source-word validation remain. Public
web and desktop call an authenticated hosted gateway. The private implementation
uses a separate owner-private Sites deployment because the public Site permits
remixing; private source is not synchronized to the public Site or GitHub.

Typecheck, 108 public unit tests, 35 desktop contracts, web/desktop builds and
public-source/browser/desktop leak checks pass. Five focused Chromium cases and
four WebKit cases pass, including real browser MP4 export, reference frames,
caption flow and failure preservation; provider responses/auth in those cases
are fixtures. Twelve private fixtures cover editorial/provider behavior and the
private worker, including owner isolation, transient personal keys, saved jobs,
error handling and deletion. A deletion/in-flight-job race was found during
review; a durable generation fence is being added before enabling the public
gateway. No new live AI or completed release is claimed at this stage.


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

Private service v2 is deployed owner-private, with a versioned migration for
owner generations and checkpoints. Seventeen private checks pass. Deletion now
advances a generation atomically with cleanup: stale model requests cannot start
another pass or recreate usage/checkpoints. A long literal private-instruction
output guard rejects prompt echoes; it reduces accidental disclosure and is not
an extraction-proof guarantee. Anonymous private-service requests return 401.

Web 199 exposed an outbound connection failure, so web 198 was restored while
investigating. Web 200 added Cloudflare public fetch routing; genuine testing
then identified unsupported redirect:error in Workers. The relay now uses manual
redirects and rejects every 3xx without forwarding credentials. Two actual
Miniflare/Workerd regressions cover the native fetch implementation and all
redirect statuses, in addition to ten boundary contracts. Web 201 deployed the
fixed gateway plus the owner's concurrent calculator changes, preserving both
Git histories and the tested label-overlap follow-up.

Genuine source-built Mac-to-public-201-to-private-2-to-Publik requests pass with
normal existing authentication and no provider/auth fixtures: summary HTTP 200;
Eva HTTP 200 changes the selected clip volume to 0.8 and preserves source words;
automatic selection/review HTTP 200 returns one validated cut. Inputs were a
short synthetic transcript/document for this acceptance, not a fresh video or
transcription job. Automated telemetry was disabled. Initial ad-hoc Eva attempts
were rejected before inference because the test omitted normal mode/source
fields; the corrected request uses the editor's actual contract. No production
bypass or fake reply was added. No original project was edited or deleted.

Current public source is pushed to both authorized branches with no history
rewriting. Source, browser and desktop artifacts pass the public-boundary guard;
108 public tests and 37 desktop contracts pass. Five local Chromium/four WebKit
editor cases and four hosted editor cases pass; those UI/provider responses are
fixtures, separately from the genuine service evidence above. New privacy copy
is translated in all eight locales and describes hosted editing/summaries,
transient personal-key use and recoverable AI results.

Mac 0.2.64 source builds pass, but signing stopped at notarization preflight:
Apple reports no Keychain password item for editai-notary. Developer ID identities
remain available. The owner explicitly chose “Continue server work; I'll restore
it later.” Installed/public Mac 0.2.63 is preserved; no unsigned or unverified
release is advertised. README download stays on verified 0.2.63 and states that
the matching Mac migration is pending. Old public Git commits and old installers
still contain previously published AI logic; this migration protects future
service changes and does not claim to revoke those copies.

Final boundary review also moved the unused server-only delivery heuristics out
of lib/ios/selection.mjs; only source-safe public contracts remain. Its two
behavioral checks are retained privately. Final counts are 106 public unit tests,
37 desktop contracts and 19 private checks, all passing. The public guard also
rejects reintroducing the private selection module. Current web/Mac source builds
pass. The owner's latest compact calculator pill/footnote follow-up is merged;
final web publication follows. Mac signing remains explicitly deferred.

Final server publication: public web 202 is live from source
`dd7472b4f2cbc7f362e582b2a02de54056035bca`, containing the public GitHub
`5de5f76` runtime and the owner's latest calculator follow-up. Runtime revision 4
holds only the private-service connection settings server-side. Private service
v3 is owner-only from `7fd996189f10952d48b8c016371f615cbe07db46`; its Worker code
is unchanged from the genuine private-v2 acceptance, with two additional retained
private behavioral checks in source. The final 106/37/19 tests and all three
public-boundary modes pass. All four focused hosted editor cases pass on web 202.
Public health returns 200 with configured auth/storage, private anonymous health
returns 401, and scanning the final new public commits finds zero credential
matches. Source branches match without force-pushing. Installed Mac 0.2.63's
archive still matches its previous signed build exactly; it was reopened after
owned source-app verification. No Mac 0.2.64 installer was published or installed.
The local QA server is stopped. The only remaining release dependency is the
owner-deferred Apple notarization profile restoration.

Concurrent calculator task confirms final hosted web 202: five focused Chromium
checks and all four calculator WebKit checks pass. Coverage includes intro and
manual interruption, both pills and actual line-path dragging, keyboard controls,
compact gradient “with EditAI” label without the icon, normal gray footnote and
Eva expression. Extra real mouse checks drag both line paths and confirm slider
synchronization. No further interface source changes are pending from that task.


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
