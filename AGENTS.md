# EditAI Studio

This is the independent web editor. Do not modify the sibling iOS project or the older private marketing website. Work on `codex/desktop-migration`; do not push or merge to main without a newer user instruction.

Read `plan.md` and `docs/VERIFICATION.md` before claiming completion. Tests using fixture authentication do not prove real Publik connectivity. Do not add production authentication bypasses or fake AI responses. Native editing contracts and editorial safety checks live under `lib/ios`; keep stable source word IDs and validate AI edits atomically.

## publik API
- Base URL: https://publikhq.com/api/v1 (OpenAI Chat Completions, Responses, Anthropic Messages).
- Chat models: publik-fast, publik-balanced, publik-smart only; never a vendor model name on Publik chat.
- Word-timed transcription: audio/uploads -> signed PUT -> audio/transcriptions with chirp-3, verbose_json and word timestamps -> poll; do not POST a new paid job to check progress.
- Sign in with publik: the request-scoped module gate runs before the first application screen; it also sends usage telemetry.
- Hosted keys stay server-side, encrypted in D1; session cookies are HTTP-only. No global shared visitor key.
- App token: hosted PUBLIK_APP_TOKEN secret. Never read .env files to find a credential.
- 402: show error.message and its one error.top_up_url.
- Show use as wallet used_percent, never money or per-call cost in product screens.
- Telemetry: official app_opened and active_session only; require signed-in genuine activity and honor opt-out. No synthetic users/engagement/credit consumption.
- Never print, log, or commit keys. No secrets in frontend assets, screenshots, or .openai/hosting.json.
- Docs: https://publikhq.com/llms.txt, https://publikhq.com/developers, https://publikhq.com/skills/api.md.

## Checks
`npm run typecheck`, `npm test`, `npm run build`. Browser tests require a running production build and fixture media generated with scripts/make-fixture.mjs plus FFmpeg. Hosted smoke tests set TEST_BASE_URL. See docs/VERIFICATION.md for fixture authentication boundaries. Use a freshly started built server after rebuilding; an older Worker process can retain stale asset manifests.
