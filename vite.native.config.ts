import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "native",
  publicDir: "../public",
  base: "./",
  plugins: [react()],
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
