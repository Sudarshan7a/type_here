#!/usr/bin/env node
/**
 * API port preflight.
 *
 * `apps/api/src/server.ts` already does the right thing: it calls
 * `process.exit(1)` when `app.listen()` rejects with EADDRINUSE. The reason that
 * never reached the developer is `tsx watch`. The dev script used to be
 *
 *     "dev": "tsx watch src/server.ts"
 *
 * and `tsx watch` does not propagate a non-zero exit from its child — it logs
 * the crash and keeps watching. So the API died on start-up, pnpm's `--parallel`
 * run saw the web app up, printed a healthy-looking dev stack and carried on
 * with a dead API behind it. That is defect F3 in scripts/check-dev-stack.mjs,
 * and it is the worst shape a tooling bug can take: the tool says it is fine.
 *
 * The alternative fix — dropping `watch` so the exit propagates — would work, but
 * it costs file watching, which is the entire reason to use `tsx watch` in the
 * first place. Trading reload-on-save for a clearer error message is the wrong
 * trade for the tool a developer stares at all day.
 *
 * So the check moves to where the exit is still honest: BEFORE the watcher
 * starts. `node scripts/preflight-port.mjs && tsx watch src/server.ts` — if the
 * port is taken the watcher never launches, the `&&` short-circuits, and the
 * package's dev script exits non-zero, which `pnpm --parallel` and
 * scripts/dev-stack.mjs both propagate.
 *
 * The trade-off this does not eliminate: there is a window between the preflight
 * closing its probe socket and the watcher binding, so a process that grabs the
 * port in that millisecond still fails the old way. Narrowing it further would
 * mean binding the port ourselves and handing the fd to the server, which is a
 * much larger change to apps/api/src/server.ts for a race nobody hits in
 * practice. server.ts keeps its own exit(1) as the backstop.
 *
 * `portIsFree` is exported so scripts/dev-stack.test.mjs can assert both
 * directions against a real socket.
 */
import { createServer } from "node:net";

/** The port apps/api/src/server.ts listens on. Kept in step with it. */
const PORT = Number(process.env.PORT ?? 3000);

/**
 * Try to bind `port` on `host`, and release it again.
 * Resolves true when the port was available.
 */
export function portIsFree(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", (err) => resolve(err.code !== "EADDRINUSE"));
    probe.listen({ port, host, exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

async function main() {
  if (await portIsFree(PORT)) {
    console.log(`api preflight: port ${PORT} is free`);
    return;
  }

  // Deliberately plain prose, no colour and no spinner: this is the message a
  // developer reads when something is already wrong, and the one thing it must
  // do is say what to do next.
  console.error(`
api preflight: port ${PORT} is already in use, so the API did not start.

  Something else is listening there — usually a previous \`pnpm dev\` that was
  not stopped, or another checkout of this repo.

  Find it:      netstat -ano | findstr :${PORT}      (Windows)
                lsof -i :${PORT}                     (macOS / Linux)
  Stop it, or start this server on another port:

                PORT=3001 pnpm dev                   (macOS / Linux)
                set PORT=3001 && pnpm dev            (Windows)

  Nothing was started, and no watcher is running.
`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
