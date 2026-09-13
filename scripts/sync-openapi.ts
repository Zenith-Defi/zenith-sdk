/*
 * Refetch the OpenAPI document from zenith-api and regenerate the types.
 *
 *   pnpm sync:openapi                       # from the published repo on main
 *   ZENITH_OPENAPI_URL=http://localhost:8787/openapi.json pnpm sync:openapi
 *
 * The document is the interface contract; the SDK does not invent its own. After
 * syncing, `pnpm generate` runs to rewrite src/generated/openapi.ts.
 */
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DEFAULT_URL =
  "https://raw.githubusercontent.com/Zenith-Defi/zenith-api/main/openapi.json";
const url = process.env.ZENITH_OPENAPI_URL ?? DEFAULT_URL;

async function main() {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  const doc = await res.text();
  // Validate it parses before writing over the vendored copy.
  JSON.parse(doc);
  writeFileSync("openapi/openapi.json", doc.endsWith("\n") ? doc : doc + "\n");
  console.log(`Wrote openapi/openapi.json from ${url}`);
  execSync("pnpm generate", { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
