// Static file server for the parity harness. The browser loads the ENGINE'S
// OWN COMPILED OUTPUT (packages/engine/dist), not a copy, so parity compares
// the real shipping code across runtimes. Rooted at the repository root so
// ES module imports resolve across packages.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

// e2e/ sits directly under the repository root, so one level up is the root.
const ROOT = resolve(process.cwd(), "..");
const PORT = Number(process.env.PARITY_PORT ?? 5176);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const stripped = decodeURIComponent(url.pathname).replace(/^[/\\]+/, "");
    const rel = stripped === "" ? "e2e/parity/page.html" : normalize(stripped);
    const path = join(ROOT, rel);
    if (!path.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`parity server on http://127.0.0.1:${PORT}/`);
});
