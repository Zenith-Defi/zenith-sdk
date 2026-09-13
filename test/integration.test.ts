import { describe, expect, it } from "vitest";
import { Zenith } from "../src/client.js";

// Runs only against a locally running zenith-api with a real API key. Skipped
// otherwise, so CI stays green without the stack. To run it:
//   ZENITH_API_KEY=zk_test_... ZENITH_BASE_URL=http://localhost:8787 pnpm test
const apiKey = process.env.ZENITH_API_KEY;
const baseUrl = process.env.ZENITH_BASE_URL ?? "http://localhost:8787";

describe.skipIf(!apiKey)("integration against a local zenith-api", () => {
  it("creates and fetches an invoice", async () => {
    const zenith = new Zenith({ apiKey: apiKey!, baseUrl });
    const created = await zenith.invoices.create({
      amount: "10000000",
      asset: { code: "XLM", issuer: null },
      memo: "sdk-integration",
    });
    expect(created.id).toBeTruthy();
    expect(created.muxedAddress.startsWith("M")).toBe(true);

    const fetched = await zenith.invoices.get(created.id);
    expect(fetched.id).toBe(created.id);

    const page = await zenith.invoices.list({ limit: 5 });
    expect(Array.isArray(page.data)).toBe(true);
  });
});
