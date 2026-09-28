import { readFileSync } from "node:fs";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The preview server (vite preview) serves the exact security headers from
 * vercel.json so the e2e security spec verifies what production will send
 * (Block A5). The typing surface must never need inline scripts or eval.
 */
function hostHeaders(): Record<string, string> {
  const vercel = JSON.parse(
    readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
  ) as {
    headers: { headers: { key: string; value: string }[] }[];
  };
  const entries = vercel.headers[0]!.headers.map((h) => [h.key, h.value] as const);
  if (entries.length === 0) {
    throw new Error("vercel.json headers block is empty");
  }
  return Object.fromEntries(entries);
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: hostHeaders(),
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
