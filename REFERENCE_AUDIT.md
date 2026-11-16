# Marketing reference audit — 2026-11-16

Local references: `/Users/jadontapp/Developer/Website resources`. All 14 PNGs inspected in labeled contact sheets; full-page image inspected separately. Every detailed screenshot is 3456×2234; full page is 3054×15806. Screenshot browser content corresponds to roughly 1440–1536 CSS pixels. Reference media stays outside public assets.

| Reference | Observed composition / recreation |
| --- | --- |
| cutai website/full view (harder to see).png | Entire sequence: hero, twin strips, availability, dark metric cards, proof panel, before/after, demo cards, seven features, reviews, gallery, pricing, FAQ, expansive footer. Preserve order. |
| top.png | Three independent floating pills; two-line center headline, blue CTA, glass card strips at hero bottom. |
| trust.png | Understated availability and three square midnight cards, luminous dimensional blue text. Use factual benefits pending approved metrics. |
| trust2.png | Three bordered award cards and three small creator cards, ample lower padding. No borrowed endorsements. |
| demo.png | Editorial left column and adjacent portrait Before/After frames; after outline blue. |
| carosels.png | Three bright blue demonstration cards with cropped device interfaces. Use independently authored web editor interface previews. |
| features.png | Four cards above three centered cards; filled blue icon tiles. Add separate four-icon looping ribbon. |
| reviews.png | Two-column clipped review wall and editorial underline. Authentic review slots only; factual workflow fallback. |
| showcase.png | Three portrait players on a soft blue shell, overlays and sound controls. Branded posters pending authentic media. |
| plans.png | Compact two-column panel, usage pills, billing toggle, three radio rows; benefits on right. No invented commercial offer. |
| qna.png | Three closed rounded rows, plus controls, optional expansion, support below. |
| footer.png | Large sky/lavender shell, centered dark/blue closing copy, roomy four-column footer. |
| sign-in page.png | Light blue/lavender viewport, floating logo, central glass card. Retain existing official Publik authentication; do not invent email/Google providers. |
| codex website/hero.png | Wide soft periwinkle, lavender and white cloud-like bands; independent implementation without reference branding. |
| codex website/codex animation.mov | FFprobe: 3456×2234, 60 fps, 12.750167s. Reviewed 0/2/4/6/8/10s contact sheet and original-resolution 2s/9s frames. Cursor moves left → lower left, sweeps across to right, then upper right; glyph rings expand into sparse arrow/dash rows and trails. Recreate with deforming layered gradients and one capped-DPR canvas; smooth pointer velocity, transient ring/streak samples, visibility/intersection pause and cleanup. |

Live usecutai.com inspected for structure/behavior in addition to primary local references. No competitor assets, content, reviews or numbers included.

## Existing application and boundaries

React 19 / TypeScript / Vinext App Router / Cloudflare Worker, local licensed Inter and rounded fonts, lucide icons, Playwright Chromium/WebKit. Root `app/page.tsx` contains the real editor and request-scoped Publik gate; ready sessions retain the editor. Add `/sign-in` as a presentation of the same gate, retaining official popup/recovery, validation, settings, APIs, billing, telemetry and native code. Existing signed/notarized installers remain provided by `DesktopDownloads`. `worker/index.ts` already has an unrelated local change; preserve it.

Verified code-backed capabilities: source-safe AI editorial selection and review; quiet pause evidence; captions; timeline editing; batch imports; appearance/text/audio/overlays; H.264/AAC MP4 exports. No claims of 4K, trials, customer counts or automatic cloud sync. iOS explicitly coming soon. Actual support: editaiapp@gmail.com. Privacy presentation reuses existing privacy disclosure. Pricing is clearly pending; three configurable preview options, disabled checkout until authentic configuration. Public content must remain truthful.

## Implementation and QA

One typed manifest in `lib/marketing/content.ts`; components under `components/marketing`; scoped CSS in `app/marketing.css`. Local-only work, no publication. Screenshots and extracted frames under ignored `outputs/reference-audit`; browser artifacts under `outputs/marketing`. Run typecheck, model/security tests, build, production-worker browser suites and section captures; inspect captured desktop/mobile geometry and refine. Fixture auth/AI tests never establish real Publik connectivity.
