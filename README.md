# EditAI Web and Desktop

Independent web version of the EditAI iOS video editor. Live: https://editai-web.givingarmadillo8.chatgpt.site · Source: https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration

The original iOS app and older private marketing/waitlist site remain independent. Development is on `codex/desktop-migration`; do not merge or push to main without owner approval.

React/TypeScript + Vinext, Cloudflare Worker through Sites, D1 project metadata, optional private R2 source backup, browser IndexedDB and FFmpeg. Preview and MP4 export share the same nondestructive compositor. Publik supplies linked-user AI chat, editorial selection, analysis and Chirp word timestamps; a user can alternatively connect an OpenAI key.

Node 22.13+: `npm ci`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Production builds use `node <sites-plugin>/scripts/build-site.mjs`; publication uses its source workflow and `.openai/hosting.json`. Sites applies the versioned D1 migrations. No separate render worker or paid subscription was provisioned.

Runtime secrets: `PUBLIK_APP_TOKEN` and a base64 32-byte `SESSION_ENCRYPTION_KEY`, configured through hosting secret management. Never read existing environment files to recover credentials, place keys in browser variables, log them, or commit private browser test state. Do not rotate the encryption key without a credential migration. Visitor install/API keys are encrypted at rest; session cookies are HTTP-only.

Read [feature parity](docs/WEB-PARITY.md), [actual verification and limits](docs/VERIFICATION.md), [domain/cost research](docs/DOMAINS-AND-COSTS.md), and [progress](plan.md). In particular, accounts whose Publik wallet lacks a public identity use browser-scoped persistence; source backups are optional; browser exports are re-encoded SDR; catalog review and physical camera/Safari checks remain outstanding.

Desktop 0.2.1: shared local Electron editor, native FFmpeg and OS-encrypted Publik credentials. The [signed and notarized macOS arm64 installer](https://github.com/tappj/EditAI-Webapp/releases/download/v0.2.1/EditAI-0.2.1-mac-arm64.dmg) has a rounded macOS app icon and passed installed-app acceptance; macOS 15 or newer is required. See [desktop architecture, benchmarks, release process and remaining limits](docs/desktop/README.md). Windows is still internal QA and has no public installer. [Migration verification and remaining boundaries](docs/desktop/VERIFICATION.md) record the 24 deployed browser checks, real AI workflow, native tests and platform build results.

## License

EditAI-authored code is available under the [MIT License](LICENSE). Bundled
FFmpeg and other third-party components retain their own licenses, including
the GPL. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the applicable
notices, full license texts and source/build links.
