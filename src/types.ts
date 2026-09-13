import type { components } from "./generated/openapi.js";

// Ergonomic aliases over the generated component schemas. The generated names
// are stable because they come from the committed openapi.json, so re-exporting
// them keeps the public surface readable without duplicating the shapes.
export type Invoice = components["schemas"]["Invoice"];
export type Payment = components["schemas"]["Payment"];
// Asset is inlined in the OpenAPI document rather than a named component, so it
// is recovered from the invoice shape instead of a schema alias.
export type Asset = Invoice["asset"];
export type CreateInvoice = components["schemas"]["CreateInvoice"];
export type WebhookEndpoint = components["schemas"]["WebhookEndpoint"];
export type CreateWebhookEndpoint = components["schemas"]["CreateWebhookEndpoint"];
export type ApiKey = components["schemas"]["ApiKey"];
export type CreateApiKey = components["schemas"]["CreateApiKey"];
export type Merchant = components["schemas"]["Merchant"];
export type WebhookDelivery = components["schemas"]["WebhookDelivery"];

export type InvoiceStatus = Invoice["status"];

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export interface ListParams {
  limit?: number;
  cursor?: string;
}

// The webhook event catalogue, mirrored from the API. A verified event is one
// of these; the union lets a handler switch on `event.type` with the right
// `data` shape narrowed.
export interface WebhookEventMap {
  "invoice.created": { invoice: Invoice };
  "invoice.paid": { invoice: Invoice };
  "invoice.underpaid": { invoice: Invoice };
  "invoice.expired": { invoice: Invoice };
  "refund.created": { refund: Record<string, unknown> };
  "settlement.completed": { settlement: Record<string, unknown> };
}

export type WebhookEvent = {
  [K in keyof WebhookEventMap]: {
    id: string;
    type: K;
    createdAt: string;
    data: WebhookEventMap[K];
  };
}[keyof WebhookEventMap];
