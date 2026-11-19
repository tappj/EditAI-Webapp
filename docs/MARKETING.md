# EditAI marketing handoff — current design

The owner's `Website resources/cutai new` screenshots supersede the previous rounded blue/glass page. The old metric cards, award cards and mini-profile block are removed. The seven-feature grid and four-icon ribbon are the only retained old section, rebuilt with the native EditAI pastel tiles and the new flat card treatment. See `REFERENCE_AUDIT.md` for every supplied reference.

The current palette is copied from the owner's native source, read-only: `EditAI/EditAI/AppTheme.swift` and `ProfileUploadTheme.swift`. The mixed wordmark/title gradient is `#90DCE8 → #C9BDF2 → #F8E894` at 135°. The premium action gradient is `#D1F2F7 → #E6E0FF → #FFE3D9` at 135°, and the supporting action gradient is `#A8F0F0 → #C4E0FF` at 90°. Individual feature/ribbon fills use `#DDF1F6`, `#EAE6F8`, `#F7EACB`, `#DFF2E4`. Ink/muted/surface/control colors also follow native AppTheme. The prior neon cyan palette is superseded. The scissors artwork and intentionally cropped footer (220px desktop cap, 20vw mobile) are preserved. Tokens are scoped in `app/marketing.css`; the editor and sibling iOS project are unchanged.

## Design and routes

The page uses a white canvas, dark Inter headings, native gradient CTAs and pastel surfaces, a full-width fixed header, thin borders and restrained radii. The order is hero + opposing flat card strips → four-step workflow → retained features → framed creator gallery → editing-options comparison + volume estimate → three pricing cards → categorized FAQ → graphic closing CTA + footer. All brand images and favicons derive from the owner's exact scissors artwork, not the reference competitor identity.

The hero uses two rounded badge pills: four overlapping owner-provided circular portraits with “saved 250+ hours of editing”, and a larger laptop icon with Web + macOS. Open EditAI Web and Install for Mac share a 190×48px button footprint; See it in action is on its own row beneath them. The top header is transparent until scrolling past 20px or opening the mobile menu, when its frosted surface returns. AI Edit is the featured step, using the native brand gradient on its text with no pill, border or box shadow. The old hero metadata line and creator-showcase pending line are removed. The installer CTA reuses the existing signed/notarized/tested release allowlist and mobile/iPad gate in `components/desktop-downloads.tsx`, with Apple silicon/Intel and version labels derived from `lib/desktop-releases.json`. The complete header/footer/sign-in wordmark uses the same native mixed gradient as the highlighted hero/comparison titles.

`/` still opens the studio for an already authenticated visitor, preserving existing behavior. An anonymous visitor sees the marketing page. `/sign-in` presents the existing official Publik gate with the new styling; provider calls, popup isolation, recovery links, consent and sessions are unchanged. Use a private browser window to inspect the public page when already signed in.

The latest owner-supplied `AGENTS.md` requires work on `codex/desktop-migration` and prohibits pushing or merging to main without a newer instruction; this supersedes the earlier main-push authorization. Current review/capture evidence is recorded in `VERIFICATION.md`. The original iOS project, private marketing repository, signed desktop releases and native editing contracts are separate and unchanged.

## Editable content and assets

Edit `lib/marketing/content.ts`:

| Key                                                   | Current behavior / insertion point                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero.firstLine`, `hero.secondLine`, `hero.subtitle`  | Provisional EditAI headline. Preserve the required exact supporting sentence until the owner changes it.                                                                                                                                                                                                                  |
| `ios.label`, `ios.href`                               | `iOS coming soon`, linking to the real availability note. Replace with the authentic onboarding funnel only after release.                                                                                                                                                                                                |
| `links`, `navigation`                                 | Real sign-in, support and source links; new header destinations are Creators, Pricing and FAQ. Workflow remains linked from the hero and footer.                                                                                                                                                                          |
| `reviews[]`                                           | Authentic reviews require `approved: true`. Optional genuine rating/avatar/source fields are supported. Empty state keeps factual capability copy and decorative five-star SVGs in the native ombre palette; these carry aria-hidden and do not claim a user rating. Authentic approved reviews retain their real rating. |
| `capabilities[]`                                      | Factual cards in the new hero strips and faint decorative background texture.                                                                                                                                                                                                                                             |
| `workflow[0..3]`                                      | Upload / Send / AI Edit / Export, using the four owner-supplied native app screenshots under `/marketing/workflow/`. `image`, `imageWidth`, `imageHeight` and `alt` define the original full-frame images and dimensions. Internal IDs remain stable.                                                                     |
| `features[]`                                          | Seven verified product capabilities. Keep the independent four-icon ribbon and the 4+3 desktop grid.                                                                                                                                                                                                                      |
| `videos[0..2]`                                        | Supply authentic `src`/`poster`, title and description. Optional `creator` needs `approved: true` plus a real name/portrait/platform; follower counts are optional and must be genuine.                                                                                                                                   |
| `comparisonRows[]`                                    | DIY / hire an editor / EditAI comparison. The raised EditAI column uses stronger type, a complete bordered surface and shadow. Prices remain configurable/pending; no competitor dollar figures or measured savings are invented.                                                                                         |
| `calculator`                                          | Configurable per-video minute assumptions plus the user-adjustable videos-per-week slider. Minute inputs are no longer shown. Results are explicitly hypothetical user estimates, not measured EditAI performance.                                                                                                        |
| `pricing.plans[]`, `pricing.approved`                 | Starter / Pro / Ultimate match the native iOS OnboardingPlan and paywall benefits. U.S. monthly prices: $9.99 / $19.95 / $49.99; annual totals: $79.90 / $159.00 / $399.00, displayed with native monthly equivalents $6.65 / $13.25 / $33.25. AI allowances: 10 / 100 starts / unlimited edits per month. Approved for display; iOS checkout remains unavailable on the website. Web/macOS uses Publik.                                                 |
| `faqs[]`, `faqCategories[]`                           | Twelve code-backed answers, grouped into three four-question filters. Update the category indices if rearranging questions.                                                                                                                                                                                               |
| `footer.product`, `footer.description`, `footer.note` | Real footer destinations, factual tagline and availability. The graphic closing statement lives in `ClosingCtaFooter`.                                                                                                                                                                                                    |

Suggested owner media paths (not current broken URLs):

- `public/marketing/workflow-import.webp`, `workflow-cut.webp`, `workflow-review.webp`, `workflow-export.webp`
- `public/marketing/creator-01.mp4`, `creator-01.webp` (repeat 02 / 03)
- `public/marketing/creator-01-avatar.webp`, plus approved review portraits

Set the corresponding `/marketing/...` paths in the manifest. Use EditAI-owned assets and browser-compatible H.264/AAC portrait MP4s. Current branded video posters and labeled workflow illustrations avoid implying supplied footage or screenshots exist.

The exact full-resolution owner artwork is `public/brand/editai-icon.png`. Header/poster variants are `editai-icon-192.png`, the 32px favicon is `editai-icon-32.png`, Apple touch icon is `editai-icon-180.png`, and `public/favicon.ico` contains the same scissors image. Only standard resizing/encoding was applied; artwork was not recreated or recolored.

## Hero savings badge

`hero.socialProof` defines the owner-supplied fixed “250+ hours” figure and the portrait order: Jadon, James, Max, Tyler. Exact input JPEGs are copied unchanged to `public/marketing/avatars/`. Their manifest `x`, `y` and `zoom` values frame each face within a circular CSS crop; the input artwork is unchanged. White portrait rings, negative margins, a pale pill and thin border follow the supplied reference. The adjacent Web + macOS badge stays intact. There is no synthetic counter or automatic increment.

## Authentic workflow screenshots and selection visibility

The published flow uses exact, uncropped copies of the supplied `Upload.png`, `Send.png`, `AI Edit.png` and `Export.png`, all 1170×2532. The missing attachment name `Edit.png` was resolved to the actual `AI Edit.png` input. Canonical public files are `public/marketing/workflow/upload.png`, `send.png`, `ai-edit.png`, `export.png`; the supplied originals remain at their local input paths. Browser images use natural proportions, explicit dimensions and `object-fit: contain`. Alt text identifies these as native iOS app previews; the existing iOS-coming-soon availability remains intact.

The reveal observer stores completion in `data-revealed`, independently of React-controlled selection classes. This fixes a confirmed live bug: switching workflow titles or pricing plans previously removed the observer's `revealed` class after it had already unobserved the card, leaving it permanently transparent. Selection can now change freely without resetting visibility. Regression checks sample opacity across repeated selections and scroll-away/return, validate all four decoded image dimensions, and exercise pricing selection as well.

## Hero and calculator motion

`ambient-hero.tsx` recreates the supplied Codex movie's path-following glyph streaks, with native EditAI atmosphere colors. It exists only in the hero. Actual pointer segments feed a narrow four-row glyph ribbon; turns follow the path and no circular/radial geometry is generated. Only pointer movement emits glyphs. Identical coordinates and subpixel jitter do not refresh the trail. Cells fade in place over 720ms, then the canvas is completely empty and its requestAnimationFrame loop stops. There are no idle glyphs or prerecorded cursor paths. Canvas DPR is capped at 1.5, the glyph grid is capped at 480 cells, and offscreen/hidden/reduced-motion/coarse-pointer states suspend rendering. All event listeners, observers and animation frames are released on unmount.

The calculator retains a native 1–50 range input for pointer, touch and keyboard interaction, with a custom 101-tick ruler, traveling Gaussian tick wave, floating video count and focus ring. One exponential interpolation updates the ruler position, count, chart, axis and result numbers together, interrupting rather than stacking animations. Reduced motion/offscreen/hidden pages settle immediately. Per-video minute assumptions live only in the content manifest. The graph endpoints read Without EditAI and EditAI Users; the redundant legend and editing-time disclosure are removed. Results read back every week / back every month, with a concise illustrative-assumption note that defines a four-week planning month. Compact viewBox geometry keeps mobile chart labels readable. No measured product savings are claimed.

## Interaction and accessibility

- Opposing seamless hero strips, hover/focus pause, hidden clones and reduced-motion static state.
- Independent four-tile icon ribbon, offscreen/background suspension and reduced-motion fallback.
- Workflow exploration buttons, live pricing selection and categorized keyboard-accessible FAQ.
- Calculator volume slider, a labeled SVG and synchronized result summaries. Configured minute assumptions remain explicit, and negative estimates clamp to zero.
- Gallery videos mount/load when in view, autoplay muted, pause offscreen/background, honor manual pause and reduced motion, and allow only one audible clip. A global gallery pause control appears when authentic video sources exist.
- Native sized/lazy image and video elements support the shared web/Electron frontend. The framework image linter emits advisory warnings; no optimization service is assumed.
- The cursor canvas is confined to the hero. No floating pill header, metric/award/profile panel or vertical review wall renders in this design.

## Verification

Use a freshly started production Worker after every rebuild.

```sh
npm run typecheck
npm test
npm run build
npm run start -- --port 5190
TEST_BASE_URL=http://127.0.0.1:5190 npm run test:e2e
TEST_BROWSER=webkit TEST_BASE_URL=http://127.0.0.1:5190 npm run test:e2e
TEST_BASE_URL=http://127.0.0.1:5190 node scripts/capture-marketing.mjs
```

Existing real-media regression tests require the generated fixture MP4, overlay PNG and WAV described in `VERIFICATION.md`. Tests use fixture authentication/replies; they do not prove new real Publik connectivity and do not make paid AI calls.

`tests/browser/marketing.spec.ts` checks removal/sequence, logo/favicon, workflow, pricing, user-input calculator, FAQ, header, icon/strip motion, responsive widths and sign-in. `marketing-media.spec.ts` uses an isolated browser harness, never a production route, to verify actual generated media playback, audio exclusivity, pause/reduced motion, rapid resize and observer teardown. Existing editor regression tests remain active.

Captures: ignored `outputs/new-design/` contains full-page Chromium/WebKit images at 1536, 1440, 1280, 1024, 768, 390 and 375 pixels, plus sign-in, individual section and desktop/mobile overview captures. New reference contact sheets are in `outputs/new-design-reference/`. These local reference files are not bundled into production.
