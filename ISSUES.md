# Open work — zenith-sdk

The remaining SDK work, filed for contributors. Labels: `good first issue`, `intermediate`, `advanced`. The matching API and web work lives in `zenith-api/ISSUES.md` and `zenith-web/ISSUES.md`.

Claim an issue by commenting on it.

## Idempotency-key auto-generation

`good first issue`. `invoices.create` takes an optional `idempotencyKey`. Add a helper that generates a stable key from the caller's own order id so retries are safe by default.

Acceptance criteria: an opt-in option derives a key; documented in the README; a test shows two calls with the same order id hitting the API once when combined with the mocked idempotent response.

## Auto-paginating iterator

`good first issue`. `invoices.list` and `payments.list` return one page with a `nextCursor`. Add an async iterator that walks all pages.

Acceptance criteria: `for await (const invoice of zenith.invoices.listAll())` yields every invoice across pages; stops when `nextCursor` is null; tested against a mocked two-page response.

## Retry on transient errors

`intermediate`. Network blips and `429`s should retry with backoff; `4xx` other than `429` should not.

Acceptance criteria: configurable retry count and base delay; retries only on network errors, `429`, and `5xx`; respects a `Retry-After` header; a test asserts a `404` is not retried.

## Widen the browser bundle

`intermediate`. The browser entry has the redirect helper and a SEP-0007 URI builder. Add a small client that opens the SSE stream and reports invoice status, as the foundation for the embeddable widget.

Acceptance criteria: a browser-safe function subscribes to `/v1/invoices/:id/events` and calls back on status change; no Node built-ins in the browser bundle; documented.

## Vault-mode types

`advanced`. When the API gains vault mode (see `zenith-api/ISSUES.md`), the SDK needs the vault-specific fields and any new endpoints, generated from the updated OpenAPI document and hand-wrapped.

Acceptance criteria: `pnpm sync:openapi` pulls the vault-enabled document; vault fields typed and exported; the compatibility table updated in the same pull request; no break to muxed-mode callers.
