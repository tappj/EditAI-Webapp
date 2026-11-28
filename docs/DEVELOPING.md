# Developing EditAI

Independent web version of the EditAI iOS video editor. Live: https://editai.it.com · Source: https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration

The original iOS app and older private marketing/waitlist site remain independent. Work on `codex/desktop-migration`. **Development stays local until the owner explicitly requests sharing or releasing it.** The November 27 instruction supersedes the former automatic main-push/publication default. `main` is reserved for released source; preserve remote history and never force-push.

## Everyday development

Think of your laptop as a workshop and production as the shop customers visit.
Saving files changes your workshop. A Git commit saves a checkpoint locally.
Pushing your development branch backs up source to GitHub. Deploying the website
or publishing a desktop release changes what customers can use. These are separate
operations, and you can make frequent checkpoints without releasing anything.

On this checkout, dependencies are already installed. On a fresh clone, run
`npm ci` first (Node 22.13+, Node 24 recommended), then:

```sh
npm run dev:setup
npm run dev
```

Open **http://127.0.0.1:5173** for the local website. Saved source changes reload
there. The command binds to loopback and fails if that port is already occupied.
Local D1/R2 storage is simulated on your computer, separate from customer data;
do not enable remote bindings. Setup applies migrations only to the local
development database under `.wrangler/development`; the built-server QA profile
under `.wrangler/state` stays separate. Re-run `npm run dev:setup` after pulling
schema changes. Local IndexedDB belongs to this local browser
origin. Setup creates an ignored `.dev.vars` with a fresh local encryption key
only if none exists. It never reads, copies, or overwrites existing credentials.

Real local web sign-in also needs a developer-authorized, web-app-scoped
`PUBLIK_APP_TOKEN` configured privately in `.dev.vars`. It is deliberately not
copied from production, and desktop's public bootstrap belongs to the desktop
app. Without that web configuration, public pages work but real web sign-in
reports unavailable. Do not bypass it. The development-only Sites sign-in
emulation is separate from Publik and does not authenticate an EditAI user.

For the desktop version:

```sh
npm run desktop:dev
```

This builds the shared editor and opens **EditAI Dev**, without replacing
`/Applications/EditAI.app`. Re-run after changes; desktop currently rebuilds
rather than hot reloading. All unpackaged source launches, including
`npm run desktop:start`, use `EditAI Desktop Development` under the OS application
data folder. On Mac this is `~/Library/Application Support/EditAI Desktop Development`.
Projects, local backups, browser storage, and OS-encrypted Publik credentials
are separate from the installed release. Sign in through the genuine Publik
gate independently; no production account data is copied. The existing public
desktop bootstrap resource supports source installations. Update installation
is available only in a packaged release. Development telemetry is disabled.

**Local does not mean every external service is a sandbox.** Signed-in AI actions
still call Publik and the hosted EditAI AI gateway, can use real credits, and may
store recoverable AI jobs there. Desktop support submissions use the live support
endpoint. Use test projects and deliberate requests; do not delete a real account
as a test. Local web dev requests send DNT to suppress engagement telemetry.
Browser tests use their documented fixtures instead of paid provider calls.

Save a checkpoint whenever it helps; it need not be a large update:

```sh
git status
git add <the-files-you-changed>
git commit -m "Describe the change"
```

These commands do not upload or release anything. When the owner requests an
off-device source backup, `git push origin codex/desktop-migration` shares the
development branch and runs QA without deploying the site or publishing a
desktop release. Other people with repository access can see pushed source.

Setup installs a checkout-local pre-push guard that rejects pushes to `main`,
`master`, and release tags, including deletions and multi-ref pushes. It also
preserves the existing `.git/hooks/pre-push` privacy/history check. Its hook path
is configured for this worktree only, so older worktrees retain their original
privacy guard even when they do not contain `.githooks`. Normal pushes
default to the current branch. Git hooks are an accident-prevention measure;
they do not replace GitHub branch protection and do not prevent direct Sites
publishing or GitHub UI actions. Run setup again after cloning. Do not bypass
the hook during development.

## Deliberate releases

Use small development commits and batch them into a release when ready. A bug
fix can justify an immediate small release; there is no required update size.
Only begin this sequence when the owner explicitly asks to release:

1. Review the accumulated changes against current `origin/main`; fetch first,
   preserve history, and open a pull request from `codex/desktop-migration` to
   `main`. Run `npm run typecheck`, `npm test`, `npm run build`,
   `npm run test:desktop`, and `npm run desktop:build`, plus relevant browser
   acceptance using a freshly started production build. PR QA never publishes.
2. For an owner-authorized local push to `main` or a release tag, prefix that one
   command with `EDITAI_ALLOW_RELEASE_PUSH=1`. The existing privacy guard still
   runs. This technical switch is not release authorization and does not deploy.
   A reviewed GitHub PR merge is another way to update `main`.
3. Publish the exact tested web commit through the existing Sites workflow,
   retaining the Site identity, access, secrets, D1 and R2. A GitHub source push
   alone does not publish this Site. Verify the resulting deployed version.
4. For desktop, bump version references together and use the existing signed,
   notarized release and installed-app acceptance process before publishing
   GitHub release assets/updater metadata. Do not publish internal QA artifacts.
   A working Apple notarization profile is required; never claim web/desktop
   release parity while a binary is deferred. The November 27 release resolved
   the prior profile deferral and verified the installed Mac app.
5. Record actual evidence and limits in `docs/VERIFICATION.md` and
   `docs/desktop/VERIFICATION.md`. Keep backend APIs compatible with installed
   older desktop clients. Use backward-compatible database migrations so
   rollback remains possible; reverting code does not undo database changes.

After web deployment, visitors get the new version on a new load or refresh;
an already open editor can keep its loaded version until reloaded. No download
or Git pull is required. For this desktop app, users currently choose **File →
Check for updates…**, approve **Download update**, then **Restart and install**.
They can also download a verified installer. Updates are not forced and users
do not run Git commands. The installed-to-next-version updater exercise remains
an outstanding release acceptance check; configuration alone does not prove it.

Production backend changes can affect existing desktop clients immediately even
before they install a new app, which is why API compatibility matters.
A hosted staging environment can be added later for testers, with its own Site,
database, media bucket, and secrets. This setup uses local development and does
not create a second hosted service or change production.

## Architecture and verification

React/TypeScript + Vinext, Cloudflare Worker through Sites, D1 project metadata, optional private R2 source backup, browser IndexedDB and FFmpeg. Preview and MP4 export share the same nondestructive compositor. Publik supplies linked-user AI chat, editorial selection, analysis and Chirp word timestamps; a user can alternatively connect an OpenAI key.

Node 22.13+: `npm ci`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Production builds use `node <sites-plugin>/scripts/build-site.mjs`; publication uses its source workflow and `.openai/hosting.json`. Sites applies the versioned D1 migrations. No separate render worker or paid subscription was provisioned.

Runtime secrets: `PUBLIK_APP_TOKEN` and a base64 32-byte `SESSION_ENCRYPTION_KEY`, configured through hosting secret management. Never read existing environment files to recover credentials, place keys in browser variables, log them, or commit private browser test state. Do not rotate the encryption key without a credential migration. Visitor install/API keys are encrypted at rest; session cookies are HTTP-only.

Read [feature parity](WEB-PARITY.md), [actual verification and limits](VERIFICATION.md), [domain/cost research](DOMAINS-AND-COSTS.md), and [progress](../plan.md). In particular, accounts whose Publik wallet lacks a public identity use browser-scoped persistence; source backups are optional; browser exports are re-encoded SDR; catalog review and physical camera/Safari checks remain outstanding.

Desktop: shared local Electron editor, native FFmpeg and OS-encrypted Publik credentials. The [signed and notarized macOS arm64 installer](https://github.com/tappj/EditAI-Webapp/releases/download/v0.2.64/EditAI-0.2.64-mac-arm64.dmg) has a rounded macOS app icon and passed installed-app acceptance; macOS 15 or newer is required. See [desktop architecture, benchmarks, release process and remaining limits](desktop/README.md). Windows is still internal QA and has no public installer. [Migration verification and remaining boundaries](desktop/VERIFICATION.md) record the 24 deployed browser checks, real AI workflow, native tests and platform build results.

## License

EditAI-authored code is available under the [MIT License](../LICENSE). Bundled
FFmpeg and other third-party components retain their own licenses, including
the GPL. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for the applicable
notices, full license texts and source/build links.

## AI service boundary

The public source contains the editor, media processing, source-word contracts
and an authenticated AI client. Eva, summaries and automatic editorial decisions
run on the private EditAI AI service; the implementation is not part of this repo
or the desktop package. Source builds call the official hosted gateway for AI.
Manual editing and export remain local.

The hosted gateway uses runtime secrets `EDITAI_AI_ORIGIN` and
`EDITAI_AI_SERVICE_TOKEN` for service access. Never put their values into this
repository, `.openai/hosting.json`, browser assets or desktop configuration.
Personal OpenAI keys are forwarded over HTTPS for AI requests and used
transiently by the private service; account/session key storage stays encrypted.
Deleting EditAI data also removes recoverable AI jobs from the service.

Run `npm run check:public` after building web and desktop. Release packaging
checks for private modules, known prompt signatures and source maps. Private
implementation and provider-specific evaluation cases are maintained separately.
Historical public Git commits and prior installers remain accessible; this
boundary protects future releases and does not revoke earlier public copies.
