import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/index.cjs",
  // better-sqlite3 is a native module; resolve it from node_modules at runtime.
  external: ["better-sqlite3"],
  logLevel: "info",
  sourcemap: false,
});

console.log("Server bundled -> dist/index.cjs");
