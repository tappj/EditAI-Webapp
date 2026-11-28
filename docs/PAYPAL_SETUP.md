# PayPal billing preparation

The server-only `lib/server/paypal.ts` connector is prepared for monthly USD
Starter ($8) and Pro ($10). The draft allowance metadata follows the iOS plan's
10 and 100 AI edit starts per month; it does not change current web/Mac access.
The owner chose to keep current Publik requirements, then clarified that the
proposed browser/Mac paid plans should be funded through the app owner’s
server-side OpenAI credential. Browser/Mac prices intentionally differ from
Apple plans. That credential is not configured on this host.

**Checkout is not exposed or enabled.** No PayPal merchant account, credentials,
products, plans or webhook registration have been connected. No customer can be
charged by this code. Current product pricing and Publik wallets remain intact.
An Apple/RevenueCat subscription is not a PayPal subscription and is not imported.

## What is implemented

- Explicit live/sandbox separation and server-only OAuth credentials.
- Monthly plan verification against the exact USD price/cadence, with no setup
  fee, trial, quantity-based price or additional tax percentage accepted.
- Server-created subscription approval links restricted to the correct PayPal
  origin and fixed merchant return origin.
- Stable checkout-attempt IDs forwarded as PayPal idempotency keys. An eventual
  route must persist/reuse each account's pending attempt instead of generating
  a new ID after a timeout.
- Account/plan-bound status verification; redirect parameters or APPROVED alone
  cannot grant access. Cancellation checks ownership before contacting PayPal.
- PayPal signature verification for webhook events. The eventual webhook handler
  must deduplicate event IDs in durable storage, reread authoritative subscription
  state using the bound account/plan, and apply it transactionally. Never trust a
  webhook's unverified resource or allow late events to overwrite newer status.
- Tests cover pricing mismatch, ownership, pending/active status, environment
  separation, missing credentials and invalid webhook signatures. These use a
  controlled transport and do not establish live merchant connectivity.

## Activation handoff

1. Confirm what the two paid tiers include on web/Mac and how AI is funded.
   Paid plans are intended to use the owner’s server-side OpenAI credential,
   gated by verified paid entitlements and enforced usage allowances. Connect
   that credential securely before offering funded access; never route an
   anonymous/unpaid visitor onto the owner’s key. The requested free Publik
   pool needs a verified sponsorship/credit-sharing method from Publik; existing
   per-install wallets do not allocate an owner grant to newly linked accounts.
   Do not advertise funded access before those funding paths are configured.
2. Connect a PayPal Business REST app through the hosting provider's secure secret
   settings. Supply client ID/secret server-side, an explicit live/sandbox mode,
   the HTTPS return origin, separate active plan IDs, and webhook ID. Never put
   merchant secrets into browser JS, Electron assets, source control or chat.
3. Create the product and two monthly USD plans in the merchant account. The
   connector checks the configured plan definitions before creating checkout.
4. Integrate authenticated checkout/return/cancel routes and a signature-verified,
   idempotent webhook route with durable account subscriptions/attempts/usage.
   Keep the browser UI and any future Mac hosted-checkout link hidden until all
   of these are configured and tier entitlements are enforced server-side.
5. Verify real sandbox approval, cancellation, renewal, failed payment, replayed
   and out-of-order webhooks, cross-account access, and timeout retries. Then
   connect live credentials and explicitly enable the reviewed purchase flow.

References: [PayPal subscriptions](https://developer.paypal.com/subscriptions/integrate/v6),
[REST subscriptions](https://developer.paypal.com/api/subscriptions/v1/),
[webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/).
