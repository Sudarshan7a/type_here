#!/usr/bin/env node
/**
 * Dev-stack start-up gate.
 *
 * `pnpm dev` is the first command a new contributor runs, and for a long time it
 * reported success in three situations where the developer was, in fact, looking
 * at a broken or half-running stack:
 *
 *   F3  port 3000 is busy  -> `apps/api/src/server.ts` called process.exit(1) on
 *       EADDRINUSE, but the dev script is `tsx watch src/server.ts` and tsx watch
 *       does not propagate a non-zero child exit. pnpm's --parallel run saw the
 *       web app up, printed a healthy-looking stack and kept going with a dead
 *       API.
 *   F2  port 5173 is busy  -> vite has strictPort:true and exits 1, so pnpm does
 *       fail loudly, but the `tsx watch` API child survived the failure and kept
 *       port 3000 bound. A clean error message plus a silently occupied port.
 *   F1  a typo in the root `--filter` list (e.g. @realtype/webb) -> pnpm prints
 *       "No projects matched the filters" and then runs the filters that DID
 *       match, exiting 0. Verified on pnpm 11.2.2: `--fail-if-no-match` does not
 *       help either, because it only fires when *no* filter matched at all. So a
 *       typo silently produces a half-stack.
 *   F9  a new service is added to the workspace with a `dev` script and the
 *       hard-coded filter list is not updated -> it is silently omitted, with no
 *       warning that anything was skipped.
 *
 * Every one of those is a "the tool told me it was fine" failure, and a failure
 * mode nobody notices is the worst kind to ship: it costs a newcomer an hour and
 * teaches everyone else to distrust the output. So this script asserts the
 * FAILING direction on purpose, on the real repository, by occupying the ports
 * and running the real command. A gate that has only ever passed is
 * indistinguishable from no gate at all (the same argument that
 * scripts/check-policies.mjs makes about policy rows).
 *
 * It also asserts the GOOD direction — that a clean `pnpm dev` really does bring
 * both servers up and that stopping it really does free both ports — because a
 * gate that only ever fails is equally useless, and because the README's "Ctrl-C
 * stops both" claim (F4) was unverified until now.
 *
 * Ports are overridable (`--api-port` / `--web-port`, or the matching env vars
 * the launcher reads) because a checker that cannot run on a machine where the
 * developer already has the stack up is a checker that gets skipped. Defaults are
 * the real ports, so CI exercises the real thing.
 *
 * Every server this script opens is closed in a `finally`, on every path,
 * including the failing ones.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
// Imported rather than used as a global: this repo's ESLint config for
// scripts/** allowlists console/process/performance/URL only, so a bare
// setTimeout is a no-undef error. Naming the module is also just true — these
// are Node's timers, and the global ones are the same ones by accident.
import { setTimeout, clearTimeout } from "node:timers";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The launcher's own tree-kill, so the gate tests the shipped implementation
// rather than a copy of it. dev-stack.mjs only runs main() when invoked
// directly, so importing it here starts nothing.
import { killTree as realKillTree } from "./dev-stack.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LAUNCHER = join(ROOT, "scripts", "dev-stack.mjs");

/**
 * Hosts a blocker must cover. The API binds 0.0.0.0 (apps/api/src/server.ts) and
 * vite binds `localhost`, which resolves to 127.0.0.1 or ::1 depending on the
 * host. On Windows a 0.0.0.0 bind does NOT block a ::1 bind (observed while
 * writing this gate), so both families have to be covered or the blocker is
 * trivially bypassed on one of them.
 */
const BLOCK_HOSTS = ["0.0.0.0", "::1"];

const IS_WINDOWS = process.platform === "win32";

/**
 * How to invoke pnpm.
 *
 * On Windows `pnpm` is a `.cmd` shim, and Node >= 18.20 refuses to spawn a batch
 * file without a shell (EINVAL). `shell: true` would work for `pnpm dev`, but it
 * concatenates unescaped args (DEP0190) and it destroys any argument containing a
 * space — running `node scripts/dev-stack.mjs` through it fails outright with
 * "'C:\Program' is not recognized", because process.execPath is
 * "C:\Program Files\nodejs\node.exe". So the shell is invoked explicitly, once,
 * as `cmd /d /s /c "<command line>"`, and plain `node` runs with no shell at all.
 */
function invocation(command, args) {
  if (!IS_WINDOWS) return { command, args, shell: false };
  // The command line is passed UNQUOTED: Node quotes the `/c` argument itself,
  // and cmd's `/s` then strips the outer pair. Pre-quoting here made Node escape
  // the quotes with backslashes, which cmd does not understand — it reported
  // '\"pnpm.cmd dev\"' is not recognized.
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].join(" ")],
    shell: false,
  };
}

const PNPM = invocation(IS_WINDOWS ? "pnpm.cmd" : "pnpm", ["dev"]);

function parseArgs(argv) {
  const opts = {
    apiPort: Number(process.env.REALTYPE_API_PORT ?? DEFAULT_API_PORT),
    webPort: Number(process.env.REALTYPE_WEB_PORT ?? DEFAULT_WEB_PORT),
    timeoutMs: 25_000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--api-port") opts.apiPort = Number(argv[++i]);
    else if (a === "--web-port") opts.webPort = Number(argv[++i]);
    else if (a === "--timeout") opts.timeoutMs = Number(argv[++i]) * 1000;
  }
  return opts;
}

/** Bind one host:port. Resolves with the Server on success, rejects otherwise. */
function bindPort(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ port, host, exclusive: true }, () => {
      server.removeListener("error", reject);
      resolve(server);
    });
  });
}

/**
 * Fail unless the port is bindable on every host the dev servers might use.
 * Returns a list of hosts that could not be bound (empty = free).
 */
async function busyHosts(port) {
  const busy = [];
  for (const host of BLOCK_HOSTS) {
    try {
      const s = await bindPort(port, host);
      await new Promise((r) => s.close(r));
    } catch (err) {
      // EADDRINUSE means genuinely occupied. Anything else (e.g. ::1 unavailable
      // on an IPv6-disabled host) must not be reported as "busy" or the gate
      // would fail for a reason that has nothing to do with the dev stack.
      if (err && err.code === "EADDRINUSE") busy.push(host);
    }
  }
  return busy;
}

/** Occupy a port on every host the dev servers might bind. Always released. */
async function occupyPort(port) {
  const servers = [];
  for (const host of BLOCK_HOSTS) {
    try {
      servers.push(await bindPort(port, host));
    } catch (err) {
      if (err && err.code !== "EADDRINUSE") throw err; // ::1 unsupported: fine
      if (err && err.code === "EADDRINUSE") {
        await release(servers);
        throw new Error(`port ${port} on ${host} is already in use before the gate started`, {
          cause: err,
        });
      }
    }
  }
  return {
    port,
    async release() {
      await release(servers);
    },
  };
}

function release(servers) {
  return Promise.all(servers.map((s) => new Promise((r) => s.close(() => r()))));
}

/**
 * Kill a whole process tree.
 *
 * This is the LAUNCHER'S OWN `killTree`, imported rather than reimplemented.
 * A gate that carries its own copy of the thing it is testing is a gate that
 * can report the launcher is fine while testing a different implementation —
 * and this one already did: the checker's copy used a POSIX process-group kill
 * that missed the launcher's detached grandchildren, so the gate leaked the same
 * servers the launcher was supposed to be judged on. One implementation, so
 * there is nothing left to drift.
 */
async function killTree(child) {
  if (!child.pid) return false;
  try {
    await realKillTree(child.pid);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a command to completion or to `timeoutMs`, collecting its output.
 * `spawnEnv` lets a case inject the port overrides the launcher reads.
 *
 * The hard deadline exists because of F2. Node's `close` event waits for the
 * stdio pipes to close, and an orphaned `tsx watch` grandchild inherits them —
 * so when the dev stack leaks a server (exactly the bug under test) `close`
 * never fires and the gate would hang forever. The gate must be able to report
 * "the stack leaked a server" rather than wedging on it, so after the kill
 * attempt it stops waiting either way and records `timedOut`.
 */
function run(invocation, { timeoutMs, spawnEnv }) {
  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: ROOT,
      env: { ...process.env, ...spawnEnv },
      // Detached on POSIX so the child gets its own process group and the whole
      // group can be signalled at once.
      detached: !IS_WINDOWS,
      shell: invocation.shell,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d;
    });
    child.stderr.on("data", (d) => {
      output += d;
    });

    let timedOut = false;
    let settled = false;
    let killTimer = null;

    const finish = async (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      await delay(150); // let the OS finish releasing the port
      resolve({ code, signal, output, timedOut });
    };

    killTimer = setTimeout(() => {
      timedOut = true;
      void killTree(child).then(() => delay(4000).then(() => finish(null, "TIMEOUT")));
    }, timeoutMs);

    child.on("close", (code, signal) => {
      void finish(code, signal);
    });
  });
}

/**
 * HTTP GET that resolves to true on any response at all — a 404 or a 500 still
 * proves a server is listening and serving, which is all this gate asks.
 * node:http rather than fetch, so there is no AbortSignal to arrange a timeout
 * with (and no dependence on the host's fetch/undici availability).
 */
function httpOk(host, port, path, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path, timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

/**
 * Ask a port on both loopback families.
 *
 * vite binds `localhost`, which on a Windows host with IPv6 preference resolves
 * to ::1 ONLY — observed here, where a vite dev server on :5173 held [::1]:5173
 * and nothing on 127.0.0.1. Probing only 127.0.0.1 therefore reports a perfectly
 * healthy web server as down. The API binds 0.0.0.0 and answers on either, but
 * the same helper is used for both so the check never depends on the host's
 * address-family preference.
 */
async function anyHttpOk(port, path = "/") {
  for (const host of ["127.0.0.1", "::1"]) {
    if (await httpOk(host, port, path)) return true;
  }
  return false;
}

/** Wait until both dev servers answer, or the budget runs out. */
async function waitForStack(apiPort, webPort, budgetMs) {
  const deadline = Date.now() + budgetMs;
  const seen = { api: false, web: false };
  while (Date.now() < deadline) {
    if (!seen.api) seen.api = await anyHttpOk(apiPort, "/health");
    if (!seen.web) seen.web = await anyHttpOk(webPort, "/");
    if (seen.api && seen.web) return seen;
    await delay(500);
  }
  return seen;
}

/**
 * Wait until both ports are free, or the budget runs out.
 *
 * The stop side needs this for the same reason the start side does. The first
 * version slept a flat second between the tree kill and the port probe, and CI
 * failed on exactly that: the kill is delivered immediately but the kernel
 * reaps the tree and releases the sockets a beat later, so on a loaded runner
 * the probe ran first and reported `ports still bound after stop` for a stack
 * that had in fact stopped. The launcher was never broken; the measurement was
 * racing it.
 *
 * A sleep is a guess about someone else's timing. Polling until the thing we
 * actually care about is true, with a budget, is a measurement — and the budget
 * still means a genuine leak fails rather than hanging.
 *
 * @returns {Promise<string[]>} the hosts still holding a port, empty if all free
 */
async function waitForPortsFree(apiPort, webPort, budgetMs) {
  const deadline = Date.now() + budgetMs;
  let leftBound;
  do {
    leftBound = [
      ...(await busyHosts(apiPort)).map((h) => `${apiPort}/${h}`),
      ...(await busyHosts(webPort)).map((h) => `${webPort}/${h}`),
    ];
    if (leftBound.length === 0) return [];
    await delay(250);
  } while (Date.now() < deadline);
  return leftBound;
}

// --- Cases -----------------------------------------------------------------

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (detail) console.log(detail.replace(/^/gm, "      "));
}

/** The ports the dev stack will actually bind for a given run. */
function envFor(opts) {
  return { REALTYPE_API_PORT: String(opts.apiPort), REALTYPE_WEB_PORT: String(opts.webPort) };
}

const ERROR_RE = /EADDRINUSE|already in use|ERR_PNPM|ELIFECYCLE|Failed|FAIL|error/i;

/**
 * "Failed loudly" means exactly one thing: the command exited, on its own,
 * with a non-zero status and a message saying why.
 *
 * It does NOT include "we had to time out and kill it". A hang is what happens
 * when the stack leaks a server that keeps the inherited stdio pipes open, and
 * treating a hang as a loud failure would let the very defect under test score
 * as a pass — which is what the first run of this gate did.
 */
function failedLoudly(r) {
  return !r.timedOut && typeof r.code === "number" && r.code !== 0;
}

const DEFAULT_API_PORT = 3000;
const DEFAULT_WEB_PORT = 5173;

/**
 * Every port the stack is about to bind must be free, and the gate must be the
 * thing occupying it.
 *
 * Without this the cases are not merely inconvenient, they are WRONG: if a second
 * dev stack already holds the web port, then "occupy the API port and expect pnpm
 * dev to fail" passes for entirely the wrong reason — vite died, not the API —
 * and the F3 check would report a fix that was never made. A gate that can pass
 * for the wrong reason is worse than no gate, so an environment the gate does not
 * control is reported as a FAIL with its reason, never as a PASS.
 */
async function portsUsable(ports) {
  const busy = [];
  for (const port of [...new Set(ports)]) {
    busy.push(...(await busyHosts(port)).map((h) => `${port}/${h}`));
  }
  return busy;
}

/**
 * Ports this gate itself left bound by an earlier case.
 *
 * Without this, a case that leaks a server makes every LATER case report
 * `SKIPPED-BLOCKED: held by something this gate did not start` — which is a lie
 * about provenance, and a costly one: it turns a leak the gate found into a
 * skip the gate excuses, and points the reader at their own running dev server
 * instead of at the code under test. The first CI run of this gate did exactly
 * that, and read as a confusing three-way failure rather than the single
 * stop-path race it was.
 */
const leakedByThisGate = new Set();

function preconditionDetail(busy, opts) {
  const mine = busy.filter((b) => leakedByThisGate.has(b.split("/")[0]));
  if (mine.length > 0) {
    return (
      `SKIPPED-BLOCKED: ${mine.join(", ")} is still held by an EARLIER CASE OF THIS GATE, ` +
      `which is itself the defect — the stop path leaked a server. Fix that first; the cases ` +
      `after it cannot be measured while its ports are still bound.`
    );
  }
  return (
    `SKIPPED-BLOCKED: ${busy.join(", ")} already held by something this gate did not start ` +
    `(most likely a dev stack you already have running). Stop it, or pass ` +
    `--api-port ${opts.apiPort === 3000 ? "<n>" : opts.apiPort} --web-port ${
      opts.webPort === 5173 ? "<n>" : opts.webPort
    }.`
  );
}

async function caseApiPortBusy(opts) {
  const name = "F3: pnpm dev fails loudly when the API port is busy";
  const busy = await portsUsable([opts.apiPort, opts.webPort]);
  if (busy.length > 0) {
    record(name, false, preconditionDetail(busy, opts));
    return;
  }
  const blocker = await occupyPort(opts.apiPort);
  try {
    const r = await run(PNPM, {
      timeoutMs: opts.timeoutMs,
      spawnEnv: envFor(opts),
    });
    const failed = failedLoudly(r) && ERROR_RE.test(r.output);
    record(
      name,
      failed,
      `exit=${r.code} signal=${r.signal} timedOut=${r.timedOut}\n` +
        `--- output ---\n${r.output.trim()}\n--- end ---`,
    );
  } finally {
    await blocker.release();
  }
}

async function caseWebPortBusy(opts) {
  const name =
    "F2: pnpm dev fails loudly when the web port is busy, and leaves no orphan on the API port";
  const busy = await portsUsable([opts.apiPort, opts.webPort]);
  if (busy.length > 0) {
    record(name, false, preconditionDetail(busy, opts));
    return;
  }
  const blocker = await occupyPort(opts.webPort);
  // Declared without a value on purpose: if the try block throws, the function
  // propagates and these are never read, so an initial value would be dead.
  let orphan, orphanDetail;
  try {
    const r = await run(PNPM, {
      timeoutMs: opts.timeoutMs,
      spawnEnv: envFor(opts),
    });
    const failed = failedLoudly(r) && ERROR_RE.test(r.output);
    // F2: a loud failure is not enough. The failure must also leave no API
    // server holding port 3000 — that orphan is the part that was invisible.
    await delay(500);
    const stillBound = await busyHosts(opts.apiPort);
    orphan = stillBound.length > 0;
    orphanDetail = orphan
      ? `orphaned: port ${opts.apiPort} still bound on ${stillBound.join(", ")} after pnpm dev exited`
      : `no orphan: port ${opts.apiPort} is free after pnpm dev exited`;
    record(
      name,
      failed && !orphan,
      `exit=${r.code} signal=${r.signal} timedOut=${r.timedOut}\n${orphanDetail}\n` +
        `--- output ---\n${r.output.trim()}\n--- end ---`,
    );
  } finally {
    await blocker.release();
  }
}

async function caseMistypedFilter(opts) {
  if (!existsSync(LAUNCHER)) {
    record(
      "F1/F9: a mistyped --filter in the dev stack fails with a non-zero exit",
      false,
      `MISSING: ${LAUNCHER} does not exist, so there is nothing that could detect an unmatched filter. ` +
        `The root dev script is a bare pnpm --filter list, which exits 0 on a partial typo.`,
    );
    return;
  }
  const r = await run(
    { command: process.execPath, args: [LAUNCHER, "--filter", "@realtype/webb"], shell: false },
    { timeoutMs: opts.timeoutMs, spawnEnv: {} },
  );
  const failed =
    r.code !== null && r.code !== 0 && /no workspace package|unknown|filter/i.test(r.output);
  record(
    "F1/F9: a mistyped --filter in the dev stack fails with a non-zero exit",
    failed,
    `exit=${r.code} signal=${r.signal}\n--- output ---\n${r.output.trim()}\n--- end ---`,
  );
}

async function caseGoodStack(opts) {
  const name = "GOOD/F4: a clean pnpm dev brings both servers up, and stopping it frees both ports";
  const busy = await portsUsable([opts.apiPort, opts.webPort]);
  if (busy.length > 0) {
    record(name, false, preconditionDetail(busy, opts));
    return;
  }
  const child = spawn(PNPM.command, PNPM.args, {
    cwd: ROOT,
    env: { ...process.env, ...envFor(opts) },
    detached: !IS_WINDOWS,
    shell: PNPM.shell,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => {
    output += d;
  });
  child.stderr.on("data", (d) => {
    output += d;
  });
  // Assigned in the try; the finally below always stops the stack first, so an
  // initial value here would never be read.
  let seen;
  try {
    seen = await waitForStack(opts.apiPort, opts.webPort, opts.timeoutMs);
  } finally {
    // "Ctrl-C stops both" (F4) is exactly this: signal the tree, then prove the
    // ports came back. Asserting the README sentence is the only way it can be
    // more than a hope. The wait polls rather than sleeps — see waitForPortsFree.
    await killTree(child);
  }
  const leftBound = await waitForPortsFree(opts.apiPort, opts.webPort, 15_000);
  // Remembered so the cases after this one report a leak as a leak, rather than
  // excusing it as a port the reader left bound themselves.
  for (const entry of leftBound) leakedByThisGate.add(entry.split("/")[0]);
  const ok = seen.api && seen.web && leftBound.length === 0;
  record(
    name,
    ok,
    `api responding=${seen.api} web responding=${seen.web}\n` +
      (leftBound.length > 0
        ? `ports still bound after stop: ${leftBound.join(", ")}`
        : "both ports released") +
      `\n--- output ---\n${output.trim()}\n--- end ---`,
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log(
    `Dev-stack gate: api=${opts.apiPort} web=${opts.webPort} timeout=${opts.timeoutMs}ms`,
  );
  // The good case runs FIRST on purpose. It is the harness's own self-test: it
  // proves the ports really are free, that the stack really binds the ports this
  // run asked for (so a stack that ignores the override cannot quietly make the
  // two bad cases pass for the wrong reason), and that stopping it releases both
  // ports. If the harness itself is not trustworthy, a green bad-case result means
  // nothing — so it is established before anything is scored against it.
  await caseGoodStack(opts);
  await caseApiPortBusy(opts);
  await caseWebPortBusy(opts);
  await caseMistypedFilter(opts);

  const failed = results.filter((r) => !r.ok);
  console.log("");
  if (failed.length > 0) {
    console.error(
      `Dev-stack check FAILED: ${failed.length} of ${results.length} cases did not hold.`,
    );
    for (const f of failed) console.error(`  - ${f.name}`);
    process.exit(1);
  }
  console.log(`Dev-stack check passed: ${results.length}/${results.length} cases.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
