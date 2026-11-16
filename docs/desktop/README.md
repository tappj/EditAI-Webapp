# EditAI Desktop 0.2 preview

Primary source: https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration
Web: https://editai-web.givingarmadillo8.chatgpt.site
Desktop listing: https://publikhq.com/editai-desktop (submitted; held for review).

## Architecture and parity

Electron 45 embeds the same React editor locally. It does not load the hosted website. A sandboxed renderer has no Node access or credentials; narrow, origin-checked IPC invokes native media services. The existing backend API is shared through an environment/provider factory, using SQLite and local files on desktop and the existing D1/R2 Worker on web.

Original selected files are read directly from disk through UUID-based, byte-range streaming URLs. They are never deleted when projects are removed. Keep originals in place. Recordings and optional backup copies are managed in the app's data directory. Project drafts persist in the editor's scoped IndexedDB with SQLite metadata. Desktop copies are local; web R2 backups and existing web sessions remain on the hosted service. Automatic cross-device web/desktop project synchronization is not implemented. No migration of user media or identities is performed.

Native FFmpeg extracts 16 kHz audio for Publik Chirp, remuxes recordings, mixes audio and encodes exports. Clean cuts/speed/fit/fill use a native filter graph. Filters, transformations, text, captions and overlays use the existing preview compositor, seek each frame offline, then feed PNG frames with backpressure into native FFmpeg. H.264 VideoToolbox is probed on Mac with a libx264 fallback. Playback uses Chromium's GPU decode. Native export requests automatic hardware decode where available. No HDR preservation is claimed.

Tauri 2 was evaluated: its macOS WKWebView would require repeating WebKit media compatibility work and a separate Rust service bridge. Electron keeps the tested Chromium preview and TypeScript backend. Its runtime is larger and does not inherently accelerate editing. The measured improvement comes from native processing and offline export.

## Develop and verify

Use Node 24: `npm ci`, `node node_modules/electron/install.js`, `npm run desktop:build`, `npm run desktop:start`. Run `npm run typecheck`, `npm test`, `npm run test:desktop`. FFmpeg binaries are platform-specific; build on the target host. The FFprobe download is pinned to the matching release and SHA-256, and both executables are run during build to catch architecture errors. macOS arm64 is the local verified target. Windows QA workflow prepares native tests and a packaged self-test; interactive Windows acceptance is a separate requirement.

`PUBLIK_SELF_TEST=1 DO_NOT_TRACK=1 npm run desktop:start` runs the official connectivity self-test. `node desktop/test-live.mjs` drives real sign-in/transcription/chat/export (uses small amounts of authorized AI credits). `EDITAI_RESUME_TEST=1` reuses the latest synthetic captioned project to avoid repeated inference. These are acceptance tools, not production authentication overrides.

## Authentication and Publik

The official TypeScript desktop module runs in main before the editor. Sign-in uses the normal external-browser claim URL, wallet polling and plan/own-key choice. Credentials and the local backend encryption key are encrypted using Electron's async OS safeStorage API; there is no plaintext fallback. Session persistence avoids repeating successful sign-in. Logout forgets the SDK credential and reopens the official gate. The editor cannot access private API keys.

`desktop/publik-app-token.txt` is the official **public app-scoped bootstrap resource** required for source installs. Per-install `pk_` keys and builder `pbt_` tokens are private and must never be committed. The desktop and web listing bootstrap tokens are separate.

The desktop module sends official `app_opened` and `active_session` events; periodic events require a visible focused app with recent trusted input, and opt-out is honored. Automated acceptance uses opt-out. Built desktop self-tests and real AI requests were observed; genuine human telemetry attribution/leaderboard inclusion still needs Publik review. We do not count tests as active users.

Current official docs provide no Google replacement, embedded credential entry, supported callback/deep link, combined listing contract or repository-edit endpoint. Web uses an isolated popup and wallet polling; media isolation headers may prevent automatic popup closing. Returning to EditAI triggers an immediate session refresh. The existing one-year HTTP-only web session persists. Desktop returns focus after its official gate. There is no second EditAI account layer.

The approved desktop manifest was submitted as `editai-desktop`, macOS, version 0.2.0, new source repository, chat and transcription products. Registration returned `held_for_review`; no unsigned public artifacts were submitted. The existing `editai-studio` web listing, token, credits, encrypted sessions and public URL are preserved. Updating that listing's repository reference requires Publik's supported dashboard/maintainer process; no undocumented write endpoint is used.

Official references: https://publikhq.com/skills/setup.md, https://publikhq.com/skills/api.md, https://publikhq.com/skills/publish.md, https://publikhq.com/sdk/publik.ts.md, https://www.electronjs.org/docs/latest/tutorial/security, https://tauri.app/reference/webview-versions/.

## Measured performance

One cold-browser / persisted-desktop trial on Apple M4 Max, 36 GB, macOS Darwin 24.6.0, same approximately four-second 320×180 source, 854×480 H.264/AAC export, 30 fps:

| Operation | Chromium web | Electron native | Observed ratio |
| --- | ---: | ---: | ---: |
| Clean export | 5.905 s | 0.830 s | 7.1× |
| Warm filter + text export | 5.380 s | 1.843 s | 2.9× |
| App ready (different authentication paths) | 0.398 s | 2.127 s | Not an equivalent startup comparison |

Run `node scripts/benchmark-desktop.mjs` against a running web build. Browser API fixtures isolate media performance and block telemetry; desktop uses the genuine persisted session with telemetry opted out. This is a short synthetic single-trial benchmark, not a claim about all footage or machines. A real 19-second captioned/filtered project exported in 13.86 s on desktop. No memory reduction or universal scrubbing improvement is claimed.

## Distribution and updates

Public releases require Developer ID Application signing, notarization, successful Gatekeeper/stapler checks, packaged Publik self-test and installed-app acceptance. An Apple Development-signed build/DMG is for local QA only. Do not remove quarantine or disable OS checks to make it launch.

`npm run desktop:release` fails closed without the proper identity, the `editai-notary` notarytool Keychain profile (override with APPLE_KEYCHAIN_PROFILE), and complete corresponding source for the native GPL binary distribution (EDITAI_FFMPEG_SOURCE_ARCHIVE). See desktop/THIRD-PARTY.md. No passwords or certificates belong in the repository.

The updater uses public GitHub Releases, checks only when requested in File → Check for updates, asks before downloading/restarting, and retains framework signature verification. The signed release needs both DMG and ZIP plus latest-mac.yml/blockmaps; Windows needs a signed NSIS artifact and update metadata. Publish only validated releases with their source archive. Never attach internal QA binaries to a public release.

Homepage metadata lives in lib/desktop-releases.json. Add only real versioned GitHub artifact URLs with `signed`, `tested` and (macOS) `notarized` verification after release acceptance. Empty metadata deliberately renders status/source information, without an unavailable download button. Automatic website metadata publication and an installed-to-next-version updater exercise remain to be verified with an actual signed release.
