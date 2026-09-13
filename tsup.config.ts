import { defineConfig } from "tsup";

// Two entry points: the default server client and a browser bundle that carries
// only the checkout redirect helper, so a checkout page does not pull the whole
// client into the browser.
export default defineConfig({
  entry: { index: "src/index.ts", browser: "src/browser.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
