# Domains and operating costs

Checked November 15, 2026. No domain purchased; no payment plan upgraded.

## Domain
- `editai.com` has an existing Verisign registration through February 26, 2027. Its landing page displays a registrar renewal/expiration notice, which does **not** make it available to register. No verified acquisition price is published. Do not assume an expired-looking page means availability.
- `geteditai.com`: Verisign RDAP returned 404 (no current .com registration record). Candidate only; availability/premium pricing must be confirmed by a registrar immediately before purchase.
- `editaiapp.com` is registered through September 29, 2027; not assumed owned by this user.
- Keep the free temporary Sites URL until the owner selects a domain. Other naming candidates: `useeditai.com`, `editai.studio`; no verified availability quote for these.
- Namecheap's official .com page lists $12.08 first-year sale and $19.98 renewal, plus any checkout fees; promotional $6.48 new-customer terms also exist. This is a generic standard-domain price, **not a quote for editai.com**. https://www.namecheap.com/domains/registration/gtld/com/
- Cloudflare Registrar advertises at-cost registration/renewal; exact per-domain price must be checked. https://www.cloudflare.com/domains/

## Infrastructure
- Web hosting provisioned through Sites on Cloudflare Workers with D1/R2. No paid external compute worker or payment subscription was provisioned. Actual Sites billing follows the account plan; no unsupported promise of free unlimited hosting is made.
- Browser rendering/transcoding uses the visitor's device rather than a paid video render farm. FFmpeg downloads on demand, approximately 31 MB wasm plus wrapper; cacheable static assets.
- Cloud backup is opt-in, capped at 100 MB/source and 500 MB/account. Sources are private and account-authorized. Local-only source files consume no R2 storage.
- Publik chirp-3 is documented at $0.016/minute, rounded to billed whole minutes. A fifteen-minute source is about $0.24 before considering account credits. Keep under twenty minutes when asking for word timestamps; the product retains a fifteen-minute limit. https://publikhq.com/developers
- Chat uses Publik tier aliases with output-token bounds, per-user request limits and the existing two-stage editorial review. Actual grant availability requires the connected wallet; the handbook's $1,000 onboarding allocation cannot be assumed to have been applied.
- Owner/test use does not qualify for the fellowship leaderboard. Never generate activity or consume credits to inflate scores.

## Custom-domain preparation
After owner approval/purchase: call Sites add_custom_domain for the same project and selected hostname, apply the exact returned DNS targets at its authoritative DNS provider, refresh validation, then verify HTTPS and the complete auth/upload/export flow. Do not invent DNS records or alter the existing iOS marketing domain. Update the Publik hosted URL only after the new domain works.
