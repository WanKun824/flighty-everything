import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  root: "native",
  publicDir: "../public",
  base: "./",
  plugins: [react(), {
    name: "native-build-provenance",
    closeBundle() {
      writeFileSync(resolve("native-shell/build-info.json"), JSON.stringify({
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        version: "0.3.1",
        buildNumber: process.env.GITHUB_RUN_NUMBER ?? "local",
        builtAt: new Date().toISOString(),
      }, null, 2));
    },
  }],
  define: {
    "process.env.NEXT_PUBLIC_MAPBOX_TOKEN": JSON.stringify(""),
  },
  build: {
    outDir: "../native-shell",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },
});
