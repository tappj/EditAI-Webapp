# EditAI marketing handoff

Implementation stays in this independent web/desktop repository on `codex/desktop-migration`. The initial implementation was local-only; the owner subsequently authorized pushing all changes to `main` and publishing to `https://editai.it.com`. See `VERIFICATION.md` for validation and publication evidence. Native code, Publik endpoints, credentials, billing APIs and editorial contracts are unchanged.

## Content and assets

Edit **`lib/marketing/content.ts`**. Keep all claims owner-approved. Local reference screenshots and the animation recording are never runtime assets.

| Key                                          | What to supply                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero.firstLine`, `hero.secondLine`          | Editable provisional headline. `hero.subtitle` is the required exact sentence.                                                                                                                                                                                                   |
| `ios.label`, `ios.href`                      | Currently `iOS coming soon`, linking to the availability note. Replace only when the real iOS onboarding funnel is published.                                                                                                                                                    |
| `links.app`, `links.support`, `links.source` | Actual app entry, current support email, desktop source. Signed installer destinations remain maintained by the existing `lib/desktop-releases.json` release verifier, not a marketing-only list.                                                                                |
| `reviews[]`                                  | Authentic `id`, `title`, `text`, `author`, `source`, optional `rating`/`avatar`; set `approved: true` only after approval. Both horizontal strips and the vertical wall consume this array. Empty production state uses factual workflow cards, without ratings or endorsements. |
| `awards[]`                                   | Approved `quote`, `source`, optional `rating`, unique `id`, and `approved: true`. Empty state uses neutral brand statements.                                                                                                                                                     |
| `creators[]`                                 | Approved `id`, `name`, `portrait`, optional real `platform` and `followers`, `approved: true`. Empty state uses capability cards.                                                                                                                                                |
| `metrics[]`                                  | Verified metric text and labels, or retain the truthful nonnumeric benefits.                                                                                                                                                                                                     |
| `comparison.before`, `comparison.after`      | Add `src`, `poster`, `title`, `description`. Equal-duration comparison previews receive gentle time correction; differently timed edits play independently.                                                                                                                      |
| `demos[0..2].image`, `.alt`                  | Authentic UI screenshots and accurate alternative text. Empty values render independently authored, clearly labeled interface illustrations.                                                                                                                                     |
| `features[]`, `capabilities[]`, `workflow[]` | Real product descriptions. Keep the seven feature cards and four-icon Edit / Caption / Transcribe / Export ribbon.                                                                                                                                                               |
| `videos[0..2]`                               | Authentic portrait `src` and `poster`, `title`, `description`; optional approved `creator` object. No supplied videos means branded poster states.                                                                                                                               |
| `pricing.plans[]`                            | Approved plan names, descriptions, real benefits and `monthly` / `annual` objects: `{ price: "owner-approved display string", checkoutUrl: "https://actual-checkout..." }`. `null` offers have no checkout.                                                                      |
| `pricing.approved`                           | Remains `false`. Enable only after actual pricing and valid HTTPS checkout URLs are configured. Selection works now; no price, quota, discount, trial or commercial offer is invented.                                                                                           |
| `faqs[]`, `footer`                           | Actual answers, real links and editable closing copy. Only implemented privacy/account destinations are shown.                                                                                                                                                                   |

Suggested owner asset names, after approval:

- `public/marketing/before.mp4`, `before.webp`, `after.mp4`, `after.webp`
- `public/marketing/creator-01.mp4`, `creator-01.webp` (repeat for 02 / 03)
- `public/marketing/demo-first-cut.webp`, `demo-library.webp`, `demo-export.webp`
- `public/marketing/creator-01-avatar.webp` and approved review avatars

Use the corresponding `/marketing/...` paths in the manifest. These files are suggestions, not broken links shipped in the current manifest. Supply actual EditAI media; don't copy competitor content. Use compressed poster images and browser-compatible H.264 MP4 with AAC audio. Aspect-ratio containers reserve space before load. Players load on intersection, autoplay muted when visible, pause offscreen/background, honor user pause and reduced motion, and allow only one audible video. Native video/image primitives also work in the existing Electron renderer.

## Routes and code

- `/`: public marketing before authentication; existing authenticated visitors still reach the studio, preserving current behavior.
- `/sign-in`: the existing request-scoped Publik gate, with new visual presentation. Official popup approval, blocked-popup recovery, retry and errors remain in `app/page.tsx`. No Google/email/password provider was fabricated.
- Privacy links open the existing disclosure and retain keyboard focus/Escape behavior. Support remains `editaiapp@gmail.com`. Terms/cookie documents are not invented.
- `components/marketing/landing.tsx`: section components, nav, cards, marquees, seven-feature layout, review wall, FAQ and footer.
- `components/marketing/ambient-hero.tsx`: low-opacity deforming gradient layers and one canvas; interpolated pointer velocity affects expiring curved glyph trails. Intersection/document visibility pause, capped DPR, coarse-pointer fallback and full disposal.
- `components/marketing/video-player.tsx`: lazy media lifecycle, explicit controls, error poster and exclusive audio.
- `components/marketing/pricing.tsx`: usage, cadence and plan state; safe disabled checkout until approved offers exist.
- `app/marketing.css`: presentation styles. No editor design tokens were replaced.

## Local verification

Use a **fresh** production Worker after each rebuild; stale Worker processes can retain old asset manifests.

```sh
npm run typecheck
npm test
npm run build
npm run start -- --port 5190
TEST_BASE_URL=http://127.0.0.1:5190 node scripts/make-fixture.mjs
ffmpeg -y -i outputs/fixture.webm -c:v libx264 -pix_fmt yuv420p -c:a aac outputs/fixture.mp4
TEST_BASE_URL=http://127.0.0.1:5190 npm run test:e2e
TEST_BROWSER=webkit TEST_BASE_URL=http://127.0.0.1:5190 npm run test:e2e
```

The existing regression suite also needs `outputs/overlay.png` and `outputs/music.wav`, as documented in `VERIFICATION.md`. Marketing media tests compile an isolated component harness and serve generated fixture media through Playwright request interception. The harness/review fixtures are **never** production routes or assets. Fixture authentication and replies do not prove real Publik connectivity. No new paid AI calls are needed for this marketing change.

`tests/browser/marketing.spec.ts` captures the page at 1536, 1440, 1280, 1024, 768, 390 and 375 pixels. Images live under ignored `outputs/marketing/`, including sign-in desktop/mobile views. `tests/browser/marketing-media.spec.ts` exercises configured video playback, exclusive sound, focus pause, review loops, reduced motion, visibility, DPR bounds and teardown. `REFERENCE_AUDIT.md` maps every supplied image and the sampled video frames to the implementation.

Full-repository lint currently includes substantial existing errors in editor/native/vendor code. Report that baseline honestly; don't weaken checks or rewrite unrelated logic to hide it. New marketing files use explicit image sizing/lazy loading; the framework image-plugin rule emits advisory native-image warnings.
