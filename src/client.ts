import { ZenithApiError, type ZenithErrorBody } from "./errors.js";
import type {
  ApiKey,
  CreateApiKey,
  CreateInvoice,
  CreateWebhookEndpoint,
  Invoice,
  ListParams,
  Merchant,
  Page,
  Payment,
  WebhookDelivery,
  WebhookEndpoint,
} from "./types.js";

export interface ZenithOptions {
  apiKey: string;
  baseUrl?: string;
  // Injectable for tests and non-standard runtimes. Defaults to global fetch.
  fetch?: typeof fetch;
}

export interface CreateInvoiceOptions {
  // Passed as the Idempotency-Key header. A repeat with the same key returns the
  // first invoice instead of creating a second.
  idempotencyKey?: string;
}

const DEFAULT_BASE_URL = "http://localhost:8787";

export class Zenith {
  readonly invoices: InvoicesResource;
  readonly payments: PaymentsResource;
  readonly webhookEndpoints: WebhookEndpointsResource;
  readonly apiKeys: ApiKeysResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ZenithOptions) {
    if (!options.apiKey) throw new Error("Zenith: apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new Error("Zenith: no fetch available; pass options.fetch");

    this.invoices = new InvoicesResource(this);
    this.payments = new PaymentsResource(this);
    this.webhookEndpoints = new WebhookEndpointsResource(this);
    this.apiKeys = new ApiKeysResource(this);
  }

  /** The merchant this key belongs to. */
  me(): Promise<Merchant> {
    return this.request<Merchant>("GET", "/v1/me");
  }

  /** @internal */
  async request<T>(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; query?: Record<string, string | number | undefined> } = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.fetchImpl(url.toString(), {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as unknown) : undefined;

    if (!res.ok) {
      const body = parsed as ZenithErrorBody | undefined;
      const code = body?.error?.code ?? "http_error";
      const message = body?.error?.message ?? `Request failed with ${res.status}`;
      throw new ZenithApiError(res.status, code, message);
    }
    return parsed as T;
  }
}

class InvoicesResource {
  constructor(private readonly client: Zenith) {}

  create(input: CreateInvoice, options: CreateInvoiceOptions = {}): Promise<Invoice> {
    const headers = options.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : undefined;
    return this.client.request<Invoice>("POST", "/v1/invoices", { body: input, headers });
  }

  get(id: string): Promise<Invoice> {
    return this.client.request<Invoice>("GET", `/v1/invoices/${encodeURIComponent(id)}`);
  }

  list(params: ListParams = {}): Promise<Page<Invoice>> {
    return this.client.request<Page<Invoice>>("GET", "/v1/invoices", { query: { limit: params.limit, cursor: params.cursor } });
  }

  cancel(id: string): Promise<Invoice> {
    return this.client.request<Invoice>("POST", `/v1/invoices/${encodeURIComponent(id)}/cancel`);
  }
}

class PaymentsResource {
  constructor(private readonly client: Zenith) {}

  list(params: ListParams = {}): Promise<Page<Payment>> {
    return this.client.request<Page<Payment>>("GET", "/v1/payments", { query: { limit: params.limit, cursor: params.cursor } });
  }
}

class ApiKeysResource {
  constructor(private readonly client: Zenith) {}

  // The returned key includes `plaintext` exactly once; store it then.
  create(input: CreateApiKey = {}): Promise<ApiKey & { plaintext: string }> {
    return this.client.request("POST", "/v1/api-keys", { body: input });
  }

  list(): Promise<{ data: ApiKey[] }> {
    return this.client.request("GET", "/v1/api-keys");
  }

  revoke(id: string): Promise<ApiKey> {
    return this.client.request("POST", `/v1/api-keys/${encodeURIComponent(id)}/revoke`);
  }
}

class WebhookEndpointsResource {
  constructor(private readonly client: Zenith) {}

  create(input: CreateWebhookEndpoint): Promise<WebhookEndpoint & { secret: string }> {
    return this.client.request("POST", "/v1/webhook-endpoints", { body: input });
  }

  list(): Promise<{ data: WebhookEndpoint[] }> {
    return this.client.request("GET", "/v1/webhook-endpoints");
  }

  delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/v1/webhook-endpoints/${encodeURIComponent(id)}`);
  }

  deliveries(id: string, params: ListParams = {}): Promise<{ data: WebhookDelivery[] }> {
    return this.client.request("GET", `/v1/webhook-endpoints/${encodeURIComponent(id)}/deliveries`, {
      query: { limit: params.limit, cursor: params.cursor },
    });
  }

  replay(deliveryId: string): Promise<{ deliveryId: string }> {
    return this.client.request("POST", `/v1/webhook-deliveries/${encodeURIComponent(deliveryId)}/replay`);
  }
}
