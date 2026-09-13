import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WebhookVerificationError } from "../src/errors.js";
import { verify } from "../src/webhooks.js";

const secret = "whsec_test";

function sign(t: number, body: string, withSecret = secret): string {
  const v1 = createHmac("sha256", withSecret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

const event = {
  id: "b3f1c2a4-0000-0000-0000-000000000000",
  type: "invoice.paid",
  createdAt: "2026-09-13T10:00:00.000Z",
  data: { invoice: { id: "42", status: "paid" } },
};

describe("webhooks.verify", () => {
  const body = JSON.stringify(event);
  const now = () => 1_700_000_000;

  it("accepts a valid signature and returns the typed event", () => {
    const header = sign(1_700_000_000, body);
    const result = verify(body, header, secret, { now });
    expect(result.type).toBe("invoice.paid");
    if (result.type === "invoice.paid") {
      expect(result.data.invoice.id).toBe("42");
    }
  });

  it("rejects a forged signature", () => {
    const header = sign(1_700_000_000, body, "wrong-secret");
    expect(() => verify(body, header, secret, { now })).toThrow(WebhookVerificationError);
  });

  it("rejects a tampered body", () => {
    const header = sign(1_700_000_000, body);
    expect(() => verify(body + " ", header, secret, { now })).toThrow(WebhookVerificationError);
  });

  it("rejects a stale timestamp outside the five-minute window", () => {
    const stale = 1_700_000_000 - 301;
    const header = sign(stale, body);
    expect(() => verify(body, header, secret, { now })).toThrow(/tolerance/);
  });

  it("accepts a timestamp at the edge of the window", () => {
    const edge = 1_700_000_000 - 300;
    const header = sign(edge, body);
    expect(() => verify(body, header, secret, { now })).not.toThrow();
  });

  it("rejects a missing or malformed header", () => {
    expect(() => verify(body, null, secret, { now })).toThrow(/Missing/);
    expect(() => verify(body, "garbage", secret, { now })).toThrow(/Malformed/);
  });
});
