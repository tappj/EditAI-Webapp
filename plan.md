# EditAI Web execution record

Source: ../EditAI/EditAI. Independent repository tappj/EditAI-Webapp, branch codex/desktop-migration. Preserve original iOS and private tappj/editai-web marketing projects.

## Architecture
React/TypeScript with Vinext App Router, Cloudflare Worker via Sites; D1/R2 for authenticated data. Browser FFmpeg worker for extraction and MP4 export, IndexedDB media/drafts. Nondestructive source-anchored timeline shared by preview/export/AI/captions. Server-only Publik credentials, per-visitor install identity/wallet and HTTP-only sessions. Port existing pure editorial/summary algorithms; do not bypass existing Supabase/iOS entitlements.

## Tasks
- [x] Audit iOS features/design/algorithms, fellowship handbook and Publik docs.
- [x] Create independent project and hosting identity; preserve older projects.
- [x] Approve hosted-web listing, device authorization, mint server token (catalog held for Publik review).
- [x] Multi-source import, recording/teleprompter, batch, persistent library.
- [x] Timeline split/trim/reorder/duplicate/delete, speed/volume, crop/filters/history.
- [x] Captions/text, video/image overlays, audio lanes.
- [x] Publik transcription, full-recording editorial selection, summary, editor chat (real provider tests passed).
- [x] Matching playback and MP4 export.
- [x] Settings/profile/consent/privacy/deletion and resilient errors.
- [x] Algorithm/security tests; real browser upload/edit/export and AI tests (see verification boundaries).
- [x] Deploy the independent web app and document parity/validation.
- [x] Publish final integration fixes and pass the public deployment regression suite.
- [ ] Publik catalog review (external).

## Fellowship
Nov 9–Dec 15, 2026. Sunday check-ins Nov 15/22/29, Dec 6/13; no automation requested. WAU requires 25 min in a day or use on two days. Owner/bot/extra-account use excluded. Compute is eligible paying-user spend. Only official app_opened/active_session telemetry during actual use. Credits expire Dec 31; wallet must confirm available grants.

## Constraints
Publik checklist and browser approvals mandatory before integration/publication. Hosted web has no binary release and requires sign-in gate before application. Browser exports cannot promise AVFoundation HDR/VFR fidelity; measure memory limits. Apple IAP/DeviceCheck/Photos/camera torch require web alternatives. Domain purchase requires approval. No functionality claimed complete until verified.

## Validation
TypeScript and production builds pass; fifteen model/security tests and nine fixture browser tests. Actual H.264/AAC export inspected with FFprobe. Live hosted app and database deployed; the original nine browser checks pass on public version 3, and the expanded ten-check suite covers browser-reload recovery and deletion. All ten checks pass against the public deployment in both Chromium and WebKit. Real linked Publik chat returned 200; Chirp returned 51 timed words. Real backend browser authentication/consent/transcription/captions/chat and real server summary/editorial review pass. The real public authenticated workflow now passes, including R2 source backup/restore, chat, summary, editorial review and final MP4 export. Google upload CORS is handled with a bounded authenticated streaming proxy. WebKit Blob storage falls back to bounded ArrayBuffer chunks, and inspector scrolling is corrected. See docs/VERIFICATION.md and docs/WEB-PARITY.md for evidence and limits.

## Outstanding
- Publik catalog is held for their review.
- No domain purchased: editai.com is registered; geteditai.com is a candidate pending registrar confirmation.
- Physical camera/microphone permissions and actual Safari/iPhone device checks remain manual; WebKit engine checks pass.
- Publik wallets without a public account identifier use verified linked-key storage scope, disclosed in Settings; cross-browser account sync cannot be promised for these accounts.

## Webapp migration and desktop release — November 16, 2026

Primary source migrated with complete web history to tappj/EditAI-Webapp, branch codex/desktop-migration. iOS is unchanged; main was not pushed. Shared Electron/native FFmpeg desktop editor, encrypted Publik sessions, official separate registration, popup/recovery onboarding, benchmarks and guarded GitHub release/update tools are implemented. Production web version 8 and 24 deployed browser checks plus real AI/restore/export acceptance passed. Developer ID signed/notarized macOS arm64 v0.2.0 passed installed-DMG acceptance and was published with matching native source and updater metadata. See docs/desktop/VERIFICATION.md for exact evidence and remaining limits. No unsigned download is advertised. Existing web listing repository migration and desktop catalog review need Publik's supported process. Desktop backups are local and automatic cross-device project synchronization remains unimplemented.
