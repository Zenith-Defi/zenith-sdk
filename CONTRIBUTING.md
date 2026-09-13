# Contributing to zenith-sdk

Thanks for helping build the Zenith SDK. This gets you from a cold clone to a useful pull request in a day, even if you have never touched Stellar.

## What this repository is, and the other two

Zenith is a non-custodial crypto checkout on Stellar: a merchant creates an invoice, a customer pays it, and the money lands in the merchant's own account. This repository is the TypeScript client for it.

- **[zenith-api](https://github.com/Zenith-Defi/zenith-api)** — the REST API and the source of truth. It owns `openapi.json`, from which this SDK's types are generated.
- **zenith-sdk** (you are here) — the client: `Zenith`, `webhooks.verify`, and the browser checkout helpers.
- **[zenith-web](https://github.com/Zenith-Defi/zenith-web)** — the checkout page and dashboard, which use this SDK and never call the API directly.

Dependencies point one way: api, then sdk, then web, never reversed. This SDK depends on the API's published `openapi.json`; it never imports application code. The cross-repository rules are in [docs/multi-repo.md](docs/multi-repo.md).

## The domain in two minutes

A **Stellar account** is a public key starting with `G`. A **muxed account** (`M...`) is a base account plus a 64-bit id; a payment to it lands in the `G` account with the id attached, which is how one merchant account tells its invoices apart without custody. **Stroops** are the integer unit of an amount: one unit is 10,000,000 stroops, and every amount in the SDK is an integer stroop count carried as a string. **Horizon** is Stellar's HTTP API, which the API's watcher streams; the SDK does not talk to Horizon.

The normative contract is the API's `openapi.json`, vendored here at `openapi/openapi.json`. The generated types follow it and are not hand-edited.

## Repository map

```
openapi/openapi.json     vendored copy of the API contract
src/
  index.ts               public exports
  client.ts              the Zenith class and its resources
  webhooks.ts            webhooks.verify: signature and timestamp checks
  browser.ts             browser-safe checkout redirect and SEP-0007 URI
  types.ts               ergonomic aliases over the generated types
  errors.ts              ZenithApiError, WebhookVerificationError
  generated/openapi.ts   generated from openapi.json; do not edit
scripts/sync-openapi.ts  refetch the contract and regenerate types
test/
  client.test.ts         against a mocked fetch
  webhooks.test.ts       forged and stale signature cases
  integration.test.ts    against a local zenith-api; skipped without a key
```

`src/generated/openapi.ts` is generated. Regenerate with `pnpm generate` (or `pnpm sync:openapi` to also refetch the document); never hand-edit it.

## Getting set up

Prerequisites: Node 20 or newer, pnpm 9 (`corepack enable`). No deployment of your own is needed; the unit tests use a mocked API.

```bash
git clone https://github.com/Zenith-Defi/zenith-sdk
cd zenith-sdk
pnpm install
pnpm test          # unit tests, no network
pnpm build         # produces dist/
```

That passing test run proves your setup works.

To develop against a real API, run [zenith-api](https://github.com/Zenith-Defi/zenith-api) locally (its README has the steps), then:

```bash
ZENITH_API_KEY=zk_test_... ZENITH_BASE_URL=http://localhost:8787 pnpm test
```

which turns on the otherwise-skipped integration test.

To use your local build from the web app, link it:

```bash
pnpm build && pnpm link --global
# in zenith-web:
pnpm link --global @zenithpay/sdk
```

## Where to start

Issues carry `good first issue`, `intermediate`, or `advanced`. The full list with acceptance criteria is in [ISSUES.md](ISSUES.md); here it is ordered easiest to hardest.

1. **Idempotency-key auto-generation** (`good first issue`). Derive a key from a caller's order id. `src/client.ts`.
2. **Auto-paginating iterator** (`good first issue`). Walk all pages of a list. `src/client.ts`.
3. **Retry on transient errors** (`intermediate`). Backoff on network errors, `429`, and `5xx` only.
4. **Widen the browser bundle** (`intermediate`). A browser-safe SSE status client, the foundation of the embeddable widget. `src/browser.ts`.
5. **Vault-mode types** (`advanced`). The single largest piece: regenerate and hand-wrap the SDK when the API gains vault mode. It waits on the API's vault contract, so coordinate across repositories.

Claim an issue by commenting. Open a discussion first for anything that changes the public surface, since downstream code depends on it.

## Rules that matter here

**The types come from the API.** Do not hand-edit `src/generated/openapi.ts` and do not invent shapes that diverge from `openapi.json`. If the SDK needs something the API does not expose, the fix starts in the API.

**`webhooks.verify` stays constant-time and windowed.** Compare with `timingSafeEqual`, verify the raw body not a re-serialised one, and keep the timestamp tolerance. Weakening any of these breaks forgery and replay protection. The tests pin these; do not delete them.

**Amounts are strings of integer stroops.** The SDK never converts an amount to a `number`. A float in a money path is a defect.

**No secret keys.** The SDK handles an API key (a bearer token) and webhook signing secrets, never a Stellar secret key. Do not log the API key or put it in a URL.

## Code style

TypeScript, ES modules, Node 20. ESLint for linting; no separate formatter. [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, and so on. Branch names like `feat/auto-paginate`.

CI runs exactly these and they must pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Pull request checklist

- [ ] Branch off `main`, Conventional Commit messages.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- [ ] Changed the contract? `pnpm sync:openapi` run and `openapi/openapi.json` plus the generated types committed.
- [ ] Compatibility changed? The README table updated in this same pull request.
- [ ] New behaviour has tests; `webhooks.verify` changes keep the forged and stale cases.
- [ ] If this needs a matching change in zenith-api or zenith-web, that pull request is linked here.

## Releases

Maintainers publish to npm. The version follows semver, and the major tracks the API protocol version per the README table. A prerelease is `0.1.0-rc.1`; a release drops the `-rc`. Do not bump the version or edit the compatibility table for an unrelated change.

## Security

Report vulnerabilities privately per [SECURITY.md](SECURITY.md), never in a public issue. The sensitive surface here is `webhooks.verify`. Zenith is unaudited and Testnet-only.

## Community

Design discussion happens in GitHub Discussions. A change to the public API surface needs agreement there first, because zenith-web and other consumers depend on it. Two merged pull requests earn triage rights on request. Commit rights on the SDK are granted after review work, since a bad release reaches every consumer at once.
