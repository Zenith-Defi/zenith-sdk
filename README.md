# @zenithpay/sdk

TypeScript SDK for [Zenith](https://github.com/Elizabethxxx/zenith-api), a non-custodial crypto checkout on Stellar. Create invoices, list payments, verify webhooks, and send a customer to the hosted checkout page.

This is the SDK layer of a three-repository project.

- [zenith-api](https://github.com/Elizabethxxx/zenith-api) — the REST API, which owns the OpenAPI document this SDK is generated from.
- **@zenithpay/sdk** (this repo) — the client.
- [zenith-web](https://github.com/Elizabethxxx/zenith-web) — the checkout page and dashboard, which use this SDK.

Dependencies point one way: api, then sdk, then web. See [docs/multi-repo.md](docs/multi-repo.md).

## Install

```bash
pnpm add @zenithpay/sdk
```

This is a `0.1.0-rc.1` prerelease. Not published to the public npm registry yet; install from git or link locally (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Quickstart

```ts
import { Zenith } from "@zenithpay/sdk";

const zenith = new Zenith({
  apiKey: process.env.ZENITH_API_KEY!,
  baseUrl: "http://localhost:8787",
});

// Amounts are integer stroops as strings: 12.5 USDC is "125000000".
const invoice = await zenith.invoices.create(
  {
    amount: "125000000",
    asset: { code: "USDC", issuer: "GA5ZSE...KZVN" },
    memo: "order-4821",
  },
  { idempotencyKey: "order-4821" },
);

console.log(invoice.checkoutUrl);   // send the customer here
console.log(invoice.muxedAddress);  // or let them pay this address directly
```

List and fetch:

```ts
const page = await zenith.invoices.list({ limit: 20 });
const one = await zenith.invoices.get(invoice.id);
const payments = await zenith.payments.list({ limit: 20 });
await zenith.invoices.cancel(invoice.id);
```

## Verifying webhooks

Verify the raw request body before parsing it. `verify` checks the HMAC with a constant-time comparison and rejects a timestamp outside a five-minute window, then returns a typed event.

```ts
import { webhooks, WebhookVerificationError } from "@zenithpay/sdk";

// e.g. inside an Express/Hono handler with the raw body available
try {
  const event = webhooks.verify(rawBody, req.headers["x-zenith-signature"], endpointSecret);
  switch (event.type) {
    case "invoice.paid":
      fulfil(event.data.invoice.id);
      break;
    case "invoice.underpaid":
      // event.data.invoice is typed
      break;
  }
} catch (err) {
  if (err instanceof WebhookVerificationError) {
    // respond 400; do not process
  }
}
```

## Browser

The `@zenithpay/sdk/browser` entry carries only the checkout helpers and no Node built-ins, so it is safe to bundle into a page.

```ts
import { redirectToCheckout, stellarPayUri } from "@zenithpay/sdk/browser";

redirectToCheckout(invoiceId, { baseUrl: "https://pay.example.com" });
const uri = stellarPayUri({ destination: muxedAddress, amount: "12.5", assetCode: "USDC" });
```

## Errors

Every non-2xx response throws a `ZenithApiError` with `status` and a stable `code` (`not_found`, `unauthorized`, `idempotency_conflict`, ...). Branch on `err.code`, not the message.

## Compatibility

The major version tracks the API protocol version. This table is the source of truth and is updated in the same pull request that changes compatibility.

| SDK version | API version | Testnet | Mainnet |
|---|---|---|---|
| 0.1.x | v0.1.2 | yes | no |

## Types come from the API

`src/generated/openapi.ts` is generated from the API's committed `openapi.json`. Do not hand-edit it. To refetch and regenerate:

```bash
pnpm sync:openapi          # from the published api repo
# or against a local API:
ZENITH_OPENAPI_URL=http://localhost:8787/openapi.json pnpm sync:openapi
```

## Status

Built to roughly 65%. Covered: invoices, payments, webhook endpoints, `webhooks.verify`, and the browser checkout helpers, with unit tests against a mocked API and one integration test against a local stack. Not built and filed in [ISSUES.md](ISSUES.md): auto-pagination iterators, transient-error retries, and vault-mode types (which wait on the API's vault contract).

Unaudited and Testnet-only. See [SECURITY.md](SECURITY.md).

## License

Apache-2.0.
