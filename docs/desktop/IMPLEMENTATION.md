# Webapp migration and desktop execution record

Preserve the existing Sites project, D1/R2 bindings, hostname, encryption key, web slug and cookie. Do not modify iOS. Primary repository: tappj/EditAI-Webapp, branch codex/desktop-migration; no main push or force push.

- [x] Preserve the complete eight-commit independent web history and move the GitHub origin to the new public repository after redacted secret/history audits. Legacy origin is retained. No iOS source or signing credentials are included.
- [x] Evaluate Electron and Tauri; choose Electron for the existing Chromium compositor and shared Node/TypeScript services. Package local renderer assets, not a remote website window.
- [x] Share backend through adapters; add SQLite, scoped local projects, original-file references, range streaming, managed recordings/backups and OS-encrypted credentials.
- [x] Native audio extraction, recording remux, clean-cut FFmpeg render, offline shared-compositor frames, hardware encoder probe/fallback, audio mux, cancellation, cleanup and blocked network/playlist inputs.
- [x] Build native FFmpeg/FFprobe 9.0.2 from pinned source with static x264; package full matching source and build script. Independently rebuild the source archive and pass native tests. Enforce macOS 15 minimum for this preview.
- [x] Approve and register separate Publik desktop listing and public bootstrap resource. Genuine desktop sign-in, Chirp, chat, export and persisted credentials passed. Catalog status remains held_for_review. Opt-out/foreground/payload tests never send synthetic activity to Publik.
- [x] Improve compliant onboarding with popup, blocked-popup recovery, immediate return/focus refresh and persisted choices. Preserve isolation headers and the official gate. No unsupported Google or deep-link replacement.
- [x] Benchmark identical short exports. Browser 5.905/5.366 s, native 0.835/1.847 s (clean / Warm+text). These are single trials on M4 Max, not universal claims.
- [x] Build/verify local Apple Development-signed Mac app and ZIP installation; actual native9 installed app restored 12 caption layers and exported the 19-second project in 14.104 s. Packaged Publik self-test passed.
- [x] CI macOS DMG creation and mounted-app signature integrity; Windows NSIS build/install, real self-test, anonymous official gate and isolation. No unsigned artifacts uploaded; full Windows signed-in editing remains unverified.
- [x] Add guarded release/publishing tools, manual signature-verified updater and homepage versioned-download metadata. Unavailable downloads remain hidden.
- [x] Install Developer ID Application and `editai-notary` locally. Build and notarize the app, assemble DMG on macOS CI from the exact signed ZIP, then sign/notarize/staple and verify the DMG locally. Installed DMG app passed real persisted sign-in, caption restore and MP4 export. Publish validated macOS arm64 v0.2.0 with matching source/checksums. This Mac's writable-image restriction remains; CI does not receive the private signing key.
- [x] Create a rounded macOS icon from the existing artwork and release 0.2.1 with the guided Finder image. New signed app/ZIP and DMG passed notarization, Gatekeeper, Publik self-test, installed project restore and MP4 export. Public release includes matching source and checksums; Windows icon remains unchanged.
- [ ] Verify an installed-to-next-version update. No newer signed release exists yet.
- [ ] Publik review of desktop listing, genuine human activity attribution, and supported migration of the existing web listing's repository reference. Official docs expose no repository-edit or combined-listing contract; existing web identity is unchanged.
- [ ] Automatic cross-device web/desktop project synchronization; desktop backups currently stay local, web backups remain private R2. No user data or sessions are migrated or discarded.
- [ ] Physical desktop camera/microphone acceptance and full signed-in Windows editing/export.

See README.md here for architecture, measured limits and exact release commands. Final deployed web verification is recorded in VERIFICATION.md after publication.
