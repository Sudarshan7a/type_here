// Minimal static file server for the S4 spike. WASM cannot be fetched from
// file://, so the spike page is served over http. No dependencies, no network
// beyond localhost, nothing leaves the machine.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = process.cwd();
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".cjs": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    // Strip leading separators first: on Windows normalize("/") becomes "\".
    // normalize("") also returns "." (the current directory), so the root
    // path must be special-cased BEFORE normalizing or readFile hits EISDIR.
    const stripped = decodeURIComponent(url.pathname).replace(/^[/\\]+/, "");
    const rel = stripped === "" ? "index.html" : normalize(stripped);
    const path = join(ROOT, rel);
    if (!path.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": TYPES[extname(path)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

const port = Number(process.env.PORT ?? 5175);
server.listen(port, "127.0.0.1", () => {
  console.log(`s4 spike server on http://127.0.0.1:${port}/`);
});
