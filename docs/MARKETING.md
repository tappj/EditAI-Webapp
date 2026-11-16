# EditAI marketing handoff — current design

The owner's `Website resources/cutai new` screenshots supersede the previous rounded blue/glass page. The old metric cards, award cards and mini-profile block are removed. The seven-feature grid and four-icon ribbon are the only retained old section, rebuilt with ink/cyan tiles and the new flat card treatment. See `REFERENCE_AUDIT.md` for every supplied reference.

## Design and routes

The page uses a continuous cool-gray canvas, dark Inter headings, cyan CTAs, a full-width fixed header, thin borders and restrained radii. The order is hero + opposing flat card strips → four-step workflow → retained features → framed creator gallery → workflow comparison + editable estimate → three pricing cards → categorized FAQ → graphic closing CTA + footer. All brand images and favicons derive from the owner's exact scissors artwork, not the reference competitor identity.

`/` still opens the studio for an already authenticated visitor, preserving existing behavior. An anonymous visitor sees the marketing page. `/sign-in` presents the existing official Publik gate with the new styling; provider calls, popup isolation, recovery links, consent and sessions are unchanged. Use a private browser window to inspect the public page when already signed in.

The earlier owner instruction authorizes pushing changes to `main` and publishing to `https://editai.it.com`; current review/capture evidence is recorded in `VERIFICATION.md`. The original iOS project, private marketing repository, signed desktop releases and native editing contracts are separate and unchanged.

## Editable content and assets

Edit `lib/marketing/content.ts`:

| Key                                                   | Current behavior / insertion point                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero.firstLine`, `hero.secondLine`, `hero.subtitle`  | Provisional EditAI headline. Preserve the required exact supporting sentence until the owner changes it.                                                                                                                                                                  |
| `ios.label`, `ios.href`                               | `iOS coming soon`, linking to the real availability note. Replace with the authentic onboarding funnel only after release.                                                                                                                                                |
| `links`, `navigation`                                 | Real sign-in, support and source links; new header destinations are Creators, Pricing and FAQ. Workflow remains linked from the hero and footer.                                                                                                                          |
| `reviews[]`                                           | Authentic reviews require `approved: true`. Optional genuine rating/avatar/source fields are supported. Empty state shows factual workflow cards, with no fabricated testimonials or stars.                                                                               |
| `capabilities[]`                                      | Factual cards in the new hero strips and faint decorative background texture.                                                                                                                                                                                             |
| `workflow[0..3]`                                      | Import / AI first cut / Review / Export titles, descriptions and illustrative screen copy. Optional `image` and `alt` fields replace an authored workflow preview with an authentic screenshot; no broken placeholder image paths are shipped.                            |
| `features[]`                                          | Seven verified product capabilities. Keep the independent four-icon ribbon and the 4+3 desktop grid.                                                                                                                                                                      |
| `videos[0..2]`                                        | Supply authentic `src`/`poster`, title and description. Optional `creator` needs `approved: true` plus a real name/portrait/platform; follower counts are optional and must be genuine.                                                                                   |
| `comparisonRows[]`                                    | Factual workflow comparison. No invented competitor prices, revenue or measured time savings.                                                                                                                                                                             |
| `calculator`                                          | Initial user-editable planning assumptions: videos per week, current minutes and target minutes. Results are explicitly hypothetical user estimates, not measured EditAI performance.                                                                                     |
| `pricing.plans[]`, `pricing.approved`                 | Three interactive preview cards and monthly/annual selection. `approved` remains false, prices are unannounced and checkout is disabled. Add real `monthly`/`annual` `{ price, checkoutUrl }` objects and enable only after owner approval. Checkout URLs must use HTTPS. |
| `faqs[]`, `faqCategories[]`                           | Twelve code-backed answers, grouped into three four-question filters. Update the category indices if rearranging questions.                                                                                                                                               |
| `footer.product`, `footer.description`, `footer.note` | Real footer destinations, factual tagline and availability. The graphic closing statement lives in `ClosingCtaFooter`.                                                                                                                                                    |

Suggested owner media paths (not current broken URLs):

- `public/marketing/workflow-import.webp`, `workflow-cut.webp`, `workflow-review.webp`, `workflow-export.webp`
- `public/marketing/creator-01.mp4`, `creator-01.webp` (repeat 02 / 03)
- `public/marketing/creator-01-avatar.webp`, plus approved review portraits

Set the corresponding `/marketing/...` paths in the manifest. Use EditAI-owned assets and browser-compatible H.264/AAC portrait MP4s. Current branded video posters and labeled workflow illustrations avoid implying supplied footage or screenshots exist.

The exact full-resolution owner artwork is `public/brand/editai-icon.png`. Header/poster variants are `editai-icon-192.png`, the 32px favicon is `editai-icon-32.png`, Apple touch icon is `editai-icon-180.png`, and `public/favicon.ico` contains the same scissors image. Only standard resizing/encoding was applied; artwork was not recreated or recolored.

## Interaction and accessibility

- Opposing seamless hero strips, hover/focus pause, hidden clones and reduced-motion static state.
- Independent four-tile icon ribbon, offscreen/background suspension and reduced-motion fallback.
- Workflow exploration buttons, live pricing selection and categorized keyboard-accessible FAQ.
- Calculator slider and editable minute inputs, a labeled SVG and live result summaries. Negative estimates clamp to zero.
- Gallery videos mount/load when in view, autoplay muted, pause offscreen/background, honor manual pause and reduced motion, and allow only one audible clip. A global gallery pause control appears when authentic video sources exist.
- Native sized/lazy image and video elements support the shared web/Electron frontend. The framework image linter emits advisory warnings; no optimization service is assumed.
- No legacy hero canvas, floating pill header, metric/award/profile panel or vertical review wall renders in this design.

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
