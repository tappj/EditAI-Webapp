# Browser-only Unslop trial — November 20, 2026

Requested scope: EDITAI WEB browser only, published at https://editai.it.com.
Desktop 0.2.10 and the installed Mac app remain unchanged.

Unslop by Damir Sokolovsky (@heydamir), CC BY 4.0:
https://github.com/heydamir/unslop
Installed using the Codex skill installer from `skills/unslop`. Local skill:
`~/.codex/skills/unslop/SKILL.md` (available in subsequent turns).

Direction: a calm, precise editing workspace. Graphite surfaces, restrained
lavender selection, real media and existing film artwork carry the color.
The existing logo, content, features and section order remain.

The nine passes consolidate spacing, neutralize chrome, retain existing Lucide
icons and factual copy, soften typography, left-align the hero, align control
radii, retain authentic product/media visuals and stop decorative looping motion.
No generated images or paid AI calls were used. Existing editorial content is
preserved, including owner-supplied review copy and brand artwork.

Isolation: only `app/layout.tsx` loads `app/web-unslop.css` and adds the
`data-web-ui` document attribute. Electron imports `app/page.tsx` and shared
styles directly, so it receives neither this stylesheet nor its activating marker.
No shared runtime behavior, desktop source, authentication or AI contracts change.

## Rollback

Baseline source: `feed360562ddd2f02545d6d0924e593c1e20f947`.
Baseline latest saved Sites version: 99. Site project:
`appgprj_6af95fdc9ed88191b384189c2b670f4f`.

The trial is one named commit, `Try Unslop design in the web browser only`.
To undo, locate that exact commit with `git log`, run `git revert <trial-sha>`
on `codex/desktop-migration`, run the required checks, push normally to the
migration branch and main, package and publish the resulting web version to the
same Sites project. This restores the prior presentation while retaining history.
Do not reset or force-push. A source revert alone does not update the live app.

## Verification

Typecheck, all 33 web model/security tests, desktop contracts and production
web build pass. Browser fixture checks exercise real upload, timeline edits,
MP4 export/reopen, onboarding, own-key settings, editor geometry and controls.
Chromium and WebKit cover responsive layouts and light/dark Home. Inspected
actual landing and dark Home captures; corrected button contrast and dark cards.
Marketing regression expectations now assert static, scrollable review strips,
solid headings and the persistent readable header rather than removed effects.
These are explicit authentication/provider fixtures and do not prove new real
Publik connectivity. No production bypass or fake AI response was added.
