export interface ZenithErrorBody {
  error: { code: string; message: string };
}

// Thrown for any non-2xx API response. Carries the HTTP status and the API's
// structured error code so callers can branch on `err.code` rather than parse
// a message string.
export class ZenithApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ZenithApiError";
    this.status = status;
    this.code = code;
  }
}

// Thrown by webhooks.verify when a signature is missing, malformed, forged, or
// stale. Kept distinct from ZenithApiError so a verification failure is never
// mistaken for a transport error.
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}
