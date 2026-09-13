import { describe, expect, it, vi } from "vitest";
import { Zenith } from "../src/client.js";
import { ZenithApiError } from "../src/errors.js";

function mockFetch(handler: (url: string, init: RequestInit) => { status: number; body: unknown }) {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const { status, body } = handler(input.toString(), init ?? {});
    return new Response(body === undefined ? "" : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

const invoice = {
  id: "42",
  status: "open",
  mode: "muxed",
  asset: { code: "USDC", issuer: null },
  amount: "125000000",
  amountReceived: "0",
  memo: null,
  currencyDisplay: null,
  muxedAddress: "MDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCYAAAAAAAAAAAAAR5G",
  checkoutUrl: "http://localhost:3000/pay/42",
  expiresAt: null,
  paidAt: null,
  createdAt: "2026-09-13T10:00:00.000Z",
};

describe("Zenith client", () => {
  it("creates an invoice and sends the API key", async () => {
    const fetchImpl = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:8787/v1/invoices");
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer zk_test_key");
      return { status: 201, body: invoice };
    });
    const zenith = new Zenith({ apiKey: "zk_test_key", fetch: fetchImpl });
    const created = await zenith.invoices.create({ amount: "125000000", asset: { code: "USDC", issuer: null } });
    expect(created.id).toBe("42");
  });

  it("passes the Idempotency-Key header", async () => {
    const fetchImpl = mockFetch((_url, init) => {
      expect((init.headers as Record<string, string>)["idempotency-key"]).toBe("abc123");
      return { status: 201, body: invoice };
    });
    const zenith = new Zenith({ apiKey: "k", fetch: fetchImpl });
    await zenith.invoices.create({ amount: "1", asset: { code: "XLM", issuer: null } }, { idempotencyKey: "abc123" });
  });

  it("builds list query params", async () => {
    const fetchImpl = mockFetch((url) => {
      expect(url).toContain("limit=5");
      expect(url).toContain("cursor=99");
      return { status: 200, body: { data: [invoice], nextCursor: null } };
    });
    const zenith = new Zenith({ apiKey: "k", fetch: fetchImpl });
    const page = await zenith.invoices.list({ limit: 5, cursor: "99" });
    expect(page.data).toHaveLength(1);
  });

  it("throws a typed error on a non-2xx response", async () => {
    const fetchImpl = mockFetch(() => ({ status: 404, body: { error: { code: "not_found", message: "No such invoice" } } }));
    const zenith = new Zenith({ apiKey: "k", fetch: fetchImpl });
    await expect(zenith.invoices.get("nope")).rejects.toMatchObject({
      name: "ZenithApiError",
      status: 404,
      code: "not_found",
    });
    await expect(zenith.invoices.get("nope")).rejects.toBeInstanceOf(ZenithApiError);
  });

  it("requires an apiKey", () => {
    expect(() => new Zenith({ apiKey: "" })).toThrow(/apiKey/);
  });
});
