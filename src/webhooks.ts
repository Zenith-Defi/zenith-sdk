import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookVerificationError } from "./errors.js";
import type { WebhookEvent } from "./types.js";

const DEFAULT_TOLERANCE_SECONDS = 300; // five minutes

interface VerifyOptions {
  toleranceSeconds?: number;
  // Injectable clock for tests. Seconds since the epoch.
  now?: () => number;
}

function parseHeader(header: string): { t: number; v1: string } | null {
  const parts = header.split(",").map((p) => p.trim());
  let t: number | undefined;
  let v1: string | undefined;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") t = Number(value);
    if (key === "v1") v1 = value;
  }
  if (t === undefined || Number.isNaN(t) || !v1) return null;
  return { t, v1 };
}

// Verify a webhook signature and return the typed event. Throws
// WebhookVerificationError on a missing, malformed, forged, or stale signature.
// The comparison is constant-time and the timestamp must be within the
// tolerance window, so a captured request cannot be replayed later.
export function verify(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  options: VerifyOptions = {},
): WebhookEvent {
  if (!signatureHeader) throw new WebhookVerificationError("Missing signature header");
  const parsed = parseHeader(signatureHeader);
  if (!parsed) throw new WebhookVerificationError("Malformed signature header");

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = options.now ? options.now() : Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > tolerance) {
    throw new WebhookVerificationError("Timestamp outside tolerance window");
  }

  const expected = createHmac("sha256", secret).update(`${parsed.t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WebhookVerificationError("Signature mismatch");
  }

  return JSON.parse(rawBody) as WebhookEvent;
}
