import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __PARITY: { a: Record<string, number>; b: Record<string, number> };
  }
}

const spikeDir = fileURLToPath(new URL(".", import.meta.url));

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function startServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const urlPath = (req.url ?? "/").split("?")[0];
    const rel = urlPath === "/" ? "page.html" : urlPath.replace(/^\/+/, "");
    let body: string;
    try {
      body = readFileSync(join(spikeDir, rel), "utf8");
    } catch {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const ext = rel.slice(rel.lastIndexOf("."));
    res.setHeader("content-type", MIME[ext] ?? "application/octet-stream");
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        port,
        close: () =>
          new Promise((done) => {
            server.close(() => done(undefined));
          }),
      });
    });
  });
}

test("stats.ts + logs.ts run identically in the browser and Node (to 1e-9)", async ({
  page,
  browserName,
}) => {
  const expected = JSON.parse(readFileSync(join(spikeDir, "parity.expected.json"), "utf8"));

  const fileUrl = new URL("./page.html", import.meta.url).href;
  let via = "file://";
  await page.goto(fileUrl);
  try {
    await page.waitForFunction(() => window.__PARITY !== undefined, undefined, { timeout: 2000 });
  } catch {
    const { port, close } = await startServer();
    via = `http://127.0.0.1:${port} (file:// module fetch blocked by ${browserName})`;
    try {
      await page.goto(`http://127.0.0.1:${port}/page.html`);
      await page.waitForFunction(() => window.__PARITY !== undefined, undefined, { timeout: 5000 });
    } finally {
      await close();
    }
  }

  const actual = await page.evaluate(() => window.__PARITY);
  expect(actual).toBeTruthy();

  let maxAbsDiff = 0;
  for (const logName of ["a", "b"] as const) {
    for (const key of Object.keys(actual[logName])) {
      const browserValue = actual[logName][key];
      const nodeValue = expected[logName][key];
      const diff = Math.abs(browserValue - nodeValue);
      maxAbsDiff = Math.max(maxAbsDiff, diff);
      expect(
        diff,
        `${logName}.${key}: browser=${browserValue} node=${nodeValue}`,
      ).toBeLessThanOrEqual(1e-9);
    }
  }

  const note = `${browserName} via ${via}: maxAbsDiff=${maxAbsDiff}; ${JSON.stringify(actual)}`;
  console.log(note);
  test.info().annotations.push({ type: "note", description: note });
});
