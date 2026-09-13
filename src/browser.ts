// Browser entry point. Deliberately tiny and free of Node built-ins so it can
// ship to a checkout page. The full client (with webhooks.verify, which uses
// node:crypto) lives in the default entry and is not imported here.

export interface CheckoutOptions {
  // Base URL of the hosted checkout app, e.g. https://pay.example.com.
  baseUrl: string;
}

export function checkoutUrl(invoiceId: string, options: CheckoutOptions): string {
  const base = options.baseUrl.replace(/\/$/, "");
  return `${base}/pay/${encodeURIComponent(invoiceId)}`;
}

// Redirect the current window to the hosted checkout page for an invoice. This
// is the foundation the embeddable widget builds on later.
export function redirectToCheckout(invoiceId: string, options: CheckoutOptions): void {
  if (typeof window === "undefined") {
    throw new Error("redirectToCheckout must run in a browser");
  }
  window.location.assign(checkoutUrl(invoiceId, options));
}

// A SEP-0007 payment URI a wallet can open. Amount is a decimal display string
// (not stroops) because that is what the SEP-0007 `amount` field expects.
export function stellarPayUri(params: {
  destination: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
}): string {
  const q = new URLSearchParams();
  q.set("destination", params.destination);
  if (params.amount) q.set("amount", params.amount);
  if (params.assetCode) q.set("asset_code", params.assetCode);
  if (params.assetIssuer) q.set("asset_issuer", params.assetIssuer);
  if (params.memo) {
    q.set("memo", params.memo);
    q.set("memo_type", "MEMO_TEXT");
  }
  return `web+stellar:pay?${q.toString()}`;
}

export type { Invoice, InvoiceStatus } from "./types.js";
