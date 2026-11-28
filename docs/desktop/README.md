# EditAI Desktop 0.2.5

Primary source: https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration
Web: https://editai-web.givingarmadillo8.chatgpt.site
Desktop listing: https://publikhq.com/editai-desktop (submitted; held for review).
macOS arm64 download: https://github.com/tappj/EditAI-Webapp/releases/download/v0.2.5/EditAI-0.2.5-mac-arm64.dmg

## Architecture and parity

The macOS preview targets macOS 15 or newer (verified locally on Apple silicon, macOS 15.6). Electron 45 embeds the same React editor locally. It does not load the hosted website. A sandboxed renderer has no Node access or credentials; narrow, origin-checked IPC invokes native media services. The existing backend API is shared through an environment/provider factory, using SQLite and local files on desktop and the existing D1/R2 Worker on web.

Original selected files are read directly from disk through UUID-based, byte-range streaming URLs. They are never deleted when projects are removed. Keep originals in place. Recordings and optional backup copies are managed in the app's data directory. Project drafts persist in the editor's scoped IndexedDB with SQLite metadata. Desktop copies are local; web R2 backups and existing web sessions remain on the hosted service. Automatic cross-device web/desktop project synchronization is not implemented. No migration of user media or identities is performed.

Native FFmpeg extracts 16 kHz audio for Publik Chirp, remuxes recordings, mixes audio and encodes exports. Clean cuts/speed/fit/fill use a native filter graph. Filters, transformations, text, captions and overlays use the existing preview compositor, seek each frame offline, then feed PNG frames with backpressure into native FFmpeg. H.264 VideoToolbox is probed on Mac with a libx264 fallback. Playback uses Chromium's GPU decode. Native export requests automatic hardware decode where available. No HDR preservation is claimed.

Tauri 2 was evaluated: its macOS WKWebView would require repeating WebKit media compatibility work and a separate Rust service bridge. Electron keeps the tested Chromium preview and TypeScript backend. Its runtime is larger and does not inherently accelerate editing. The measured improvement comes from native processing and offline export.

## Develop and verify

Use Node 24: `npm ci`, `node node_modules/electron/install.js`, `npm run desktop:build`, `npm run desktop:start`. Run `npm run typecheck`, `npm test`, `npm run test:desktop`. FFmpeg binaries are platform-specific; build on the target host. On Mac, `npm run desktop:native` builds FFmpeg/FFprobe 9.0.2 with pinned static x264 and system frameworks/zlib, creates the complete matching source archive, and records SHA-256 provenance. It requires Xcode Command Line Tools and pkg-config. An independent rebuild from that archive passed the same nine native/telemetry tests. Only Apple system libraries are linked; no Homebrew runtime libraries are required. Preview CI falls back to the pinned FFmpeg 6.1.1 package and matching SHA-256 FFprobe; both executables are run during build to catch architecture errors. macOS arm64 is the local verified target. Windows CI built and silently installed NSIS, passed native processing tests and the packaged real Publik self-test, and verified the anonymous official gate and renderer isolation. Interactive signed-in Windows editing remains unverified.

`PUBLIK_SELF_TEST=1 DO_NOT_TRACK=1 npm run desktop:start` runs the official connectivity self-test. `node desktop/test-live.mjs` drives real sign-in/transcription/chat/export (uses small amounts of authorized AI credits). `EDITAI_RESUME_TEST=1` reuses the latest synthetic captioned project to avoid repeated inference. These are acceptance tools, not production authentication overrides.

## Authentication and Publik

The official TypeScript desktop module runs in main before the editor. Sign-in uses the normal external-browser claim URL, wallet polling and plan/own-key choice. Credentials and the local backend encryption key are encrypted using Electron's async OS safeStorage API; there is no plaintext fallback. Session persistence avoids repeating successful sign-in. Logout forgets the SDK credential and reopens the official gate. The editor cannot access private API keys.

`desktop/publik-app-token.txt` is the official **public app-scoped bootstrap resource** required for source installs. Per-install `pk_` keys and builder `pbt_` tokens are private and must never be committed. The desktop and web listing bootstrap tokens are separate. An explicit desktop override uses PUBLIK_DESKTOP_APP_TOKEN; the desktop build never embeds the generic hosted PUBLIK_APP_TOKEN variable.

The desktop module sends official `app_opened` and `active_session` events; periodic events require a visible focused app with recent trusted input, and opt-out is honored. Automated acceptance uses opt-out. Built desktop self-tests and real AI requests were observed; genuine human telemetry attribution/leaderboard inclusion still needs Publik review. We do not count tests as active users.

Current official docs provide no Google replacement, embedded credential entry, supported callback/deep link, combined listing contract or repository-edit endpoint. Web uses an isolated popup and wallet polling; media isolation headers may prevent automatic popup closing. Returning to EditAI triggers an immediate session refresh. The existing one-year HTTP-only web session persists. Desktop returns focus after its official gate. There is no second EditAI account layer.

The approved desktop manifest was submitted as `editai-desktop`, macOS, version 0.2.0, new source repository, chat and transcription products. Registration returned `held_for_review`; no unsigned public artifacts were submitted. The existing `editai-studio` web listing, token, credits, encrypted sessions and public URL are preserved. Updating that listing's repository reference requires Publik's supported dashboard/maintainer process; no undocumented write endpoint is used.

Official references: https://publikhq.com/skills/setup.md, https://publikhq.com/skills/api.md, https://publikhq.com/skills/publish.md, https://publikhq.com/sdk/publik.ts.md, https://www.electronjs.org/docs/latest/tutorial/security, https://tauri.app/reference/webview-versions/.

## Measured performance

One cold-browser / persisted-desktop trial on Apple M4 Max, 36 GB, macOS Darwin 24.6.0, same approximately four-second 320×180 source, 854×480 H.264/AAC export, 30 fps:

| Operation | Chromium web | Electron native | Observed ratio |
| --- | ---: | ---: | ---: |
| Clean export | 5.905 s | 0.835 s | 7.1× |
| Warm filter + text export | 5.366 s | 1.847 s | 2.9× |
| App ready (different authentication paths) | 0.376 s | 2.749 s | Not an equivalent startup comparison |

Run `node scripts/benchmark-desktop.mjs` against a running web build. Browser API fixtures isolate media performance and block telemetry; desktop uses the genuine persisted session with telemetry opted out. This is a short synthetic single-trial benchmark, not a claim about all footage or machines. A real 19-second captioned/filtered project exported in 14.104 s on desktop. No memory reduction or universal scrubbing improvement is claimed.

## Distribution and updates

The public macOS arm64 release has Developer ID Application signing, Apple notarization, Gatekeeper/stapler checks, the packaged Publik self-test and installed-app acceptance. An Apple Development-signed build/DMG is for local QA only. Do not remove quarantine or disable OS checks to make it launch.

The v0.2.0 installer image has a branded Retina Finder background with a clear arrow from EditAI to Applications. This refresh changed the disk-image presentation only; the signed application and updater ZIP are unchanged. The disk image was re-notarized and installed-app tested before replacing the release asset.

Version 0.2.1 rounds the macOS icon while preserving its existing scissors and gradient artwork. The Windows icon is unchanged. The updated app, ZIP and guided DMG were signed, notarized and installed-app tested as a new release, so existing 0.2.0 installations can detect a version change.

`npm run desktop:release` fails closed without the proper identity, the `editai-notary` notarytool Keychain profile (override with APPLE_KEYCHAIN_PROFILE), and the matching source archive generated by `npm run desktop:native` (override its path with EDITAI_FFMPEG_SOURCE_ARCHIVE). See desktop/THIRD-PARTY.md. No passwords or certificates belong in the repository. The native build is about 318 MB as an installed .app. This host forces writable image mounts read-only, so its standard DMG step cannot finish locally. The signed/notarized ZIP was placed in a private draft release; macOS CI assembled and checked the DMG from that exact SHA-256 ZIP with no private signing key on CI. The DMG was signed and notarized locally. `node scripts/verify-signed-desktop-release.mjs` checked the app, ZIP, DMG, matching archive and updater metadata. The app installed from the DMG restored 12 saved Publik captions and exported a real 19-second project in 13.379 s. Only this validated release was published.

The updater uses public GitHub Releases, checks only when requested in File → Check for updates, asks before downloading/restarting, and retains framework signature verification. The release includes DMG, ZIP, latest-mac.yml, blockmap, matching native source and checksums. `npm run desktop:publish` checks signing/notarization, the installed acceptance report and matching app archive, uploads artifacts to the private draft, then publishes it and generates homepage metadata. A next-version update installation has not yet been tested. Windows needs a signed NSIS artifact and update metadata. Never attach internal QA binaries to a public release.

Homepage metadata lives in lib/desktop-releases.json. Add only real versioned GitHub artifact URLs with `signed`, `tested` and (macOS) `notarized` verification after release acceptance. Windows stays hidden until a validated release exists. An installed-to-next-version updater exercise remains outstanding.

## Guided Mac installation (0.2.3)

Open the downloaded disk image and double-click EditAI. Choose **Install and Open** to move it into Applications and relaunch the installed copy automatically. If an older copy exists, EditAI asks before replacing it. Cancelling or a failed copy leaves manual installation available.

Dragging into Applications still works, but Finder copying an app cannot trigger its code. After dragging, open EditAI from Applications. The disk-image background explains both paths. The current development version proceeds directly into the normal app startup after installation, without an eject/cleanup prompt or automatic deletion of the downloaded DMG. The installer disk and download are left alone; users can manage them in Finder. This change is local source only until a verified desktop release is published. Sign-in and AI consent remain independent of installation.

## macOS window appearance (0.2.4)

The native grey title strip is replaced by EditAI's own light/dark header surface. The standard Mac close, minimize and fullscreen buttons remain native. Drag the header to move the window; normal header buttons, project-title editing and inputs remain interactive. The editor reserves the same control space as Home and Settings. Browser, Windows and Linux window frames are unchanged.

## Shared header labels (0.2.5)

Web and desktop headers use EditAI's regular UI font with a clearer breadcrumb. The Web Studio / Desktop Studio badge has a soft blue/lavender treatment while remaining a non-interactive label, with no tab stop or button behavior. Colors adapt to the current theme.
