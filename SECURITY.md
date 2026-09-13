# Security Policy

`@zenithpay/sdk` targets Stellar Testnet only and is unaudited.

## Reporting a vulnerability

Report privately to security@zenith.example. Do not open a public issue. The same address is used across all three Zenith repositories.

## Sensitive surfaces in this repository

- **`webhooks.verify`** (`src/webhooks.ts`). This is the SDK's security-critical function. It must compare signatures in constant time and reject a timestamp outside the tolerance window. A change that compares with `===`, verifies a parsed body instead of the raw body, or widens the window without reason is a vulnerability. The forged-signature and stale-timestamp cases are covered by tests; keep them.
- **API key handling** (`src/client.ts`). The key is sent as a bearer token. The SDK must not log it or place it in a URL.

The SDK never handles a Stellar secret key. If a change introduces one, that is wrong.
