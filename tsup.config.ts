import { defineConfig } from "tsup";

// Two entry points: the default server client and a browser bundle that carries
// only the checkout redirect helper, so a checkout page does not pull the whole
// client into the browser.
//
// Declarations are emitted separately by tsc (see the build script), not by
// tsup's rollup-plugin-dts. The latter fails to parse the sources when a git
// consumer rebuilds this package in pnpm's isolated prepare step; tsc is
// resolution-independent and works in that context.
export default defineConfig({
  entry: { index: "src/index.ts", browser: "src/browser.ts" },
  format: ["esm", "cjs"],
  dts: false,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
