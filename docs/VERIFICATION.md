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
for web and desktop; affected own-key, media and autosave/theme checks pass in both
Chromium and WebKit (3/3 each). Required typecheck/unit/native checks are repeated.
