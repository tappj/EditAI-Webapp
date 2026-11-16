# Webapp migration and desktop execution record

Preserve the existing Sites project, D1/R2 bindings, hostname, encryption key, web slug and cookie. Do not modify iOS. Keep the complete independent web Git history and push only the feature branch to tappj/EditAI-Webapp after a redacted history audit.

## Implementation
- [x] Audit all eight reachable commits with Gitleaks (redacted, no leaks); no tracked environment/signing/iOS project files; migrate origin to public tappj/EditAI-Webapp on codex/desktop-migration. Legacy origin retained read-only; history preserved.
- [ ] Confirm Publik repository migration and distribution/listing constraints from official docs.
- [ ] Package the shared React editor locally in Electron with sandboxed renderer and narrow IPC.
- [ ] Share the backend API with a local SQLite/filesystem adapter and secure desktop credentials.
- [ ] Add native local media URLs, FFmpeg audio extraction and offline compositor/native encoding.
- [ ] Benchmark actual browser/native extraction and export, with measured limits.
- [ ] Simplify compliant web onboarding and persist desktop sessions; no unsupported Google account bypass.
- [ ] Build/test local macOS app and DMG; prepare signed/notarized release CI and Windows validation.
- [ ] Publish download CTAs only for signed, validated release artifacts.
- [ ] Run existing web regression suites and desktop real-workflow checks, deploy to the same Site.

## Initial findings
Electron selected because the existing editor depends on a verified Chromium media/WebGL/WASM path and the shared TypeScript services can also run in Node. Tauri uses WKWebView on macOS and would require a separate Rust/backend bridge. Electron has a larger bundled runtime; performance claims must come from the native processing benchmarks, not the shell itself.

Only an Apple Development identity is currently installed, not Developer ID Application. Public macOS downloads require Developer ID signing and notarization. Local QA artifacts must not be advertised as public downloads. No Windows testing is claimed from macOS.

The official Publik docs require the gate before app screens, independent install credentials, explicit plan/own-key choice, official events, and a built-binary self-test for desktop. No documented Google replacement, callback, embedded credential page, repository-edit endpoint or shared web/desktop listing contract has been found so far. Retain existing web identity until these constraints are resolved.
