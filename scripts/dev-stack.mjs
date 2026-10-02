#!/usr/bin/env node
/**
 * Dev-stack launcher: what `pnpm dev` actually runs.
 *
 * This exists because the plain `pnpm --filter a --filter b --parallel dev` it
 * replaced could report success while the stack was broken, and because
 * pnpm 11.2.2 has no option that closes that hole:
 *
 *   - `tsx watch` does not propagate a non-zero child exit, so a server that
 *     died on start-up (EADDRINUSE, a bad migration, a syntax error) looked like
 *     a running service. `pnpm --parallel` saw the other service up and carried
 *     on. Two of the four defects in scripts/check-dev-stack.mjs come from this
 *     one behaviour.
 *   - `--fail-if-no-match` does NOT catch a mistyped filter. Measured on
 *     pnpm 11.2.2: `pnpm --filter @realtype/webb --fail-if-no-match list` exits
 *     0, because that flag only fires when *no* filter matched at all. With one
 *     typo among several filters, pnpm prints "No projects matched the filters
 *     ..." and starts the rest, exit 0 — a silent half-stack.
 *   - the filter list was a hard-coded allowlist, so a workspace package added
 *     later with its own `dev` script would simply be missing, with nothing to
 *     say so.
 *
 * So the launcher validates before it starts anything, and supervises the
 * children itself rather than delegating to `--parallel`:
 *
 *   1. every declared package really exists in the workspace (F1),
 *   2. every declared package really has a `dev` script (a rename would
 *      otherwise be a silent no-op),
 *   3. every package under `apps/` that HAS a `dev` script is declared (F9) —
 *      so the next service added cannot be quietly left out,
 *   4. the first child to exit ends the whole stack, and the launcher exits with
 *      that child's non-zero status (F3), and
 *   5. whichever way it ends, every child is killed as a process TREE (F2) —
 *      killing only the direct child leaves `tsx watch`'s grandchild holding
 *      port 3000, which is the defect this exists to remove.
 *
 * Ports can be moved with REALTYPE_API_PORT / REALTYPE_WEB_PORT. Defaults are
 * unchanged (3000 / 5173); the overrides exist so that
 * `scripts/check-dev-stack.mjs` can run on a machine where the developer
 * already has the stack up, and they are what let that gate prove its own
 * overrides are honoured.
 *
 * `checkDevStack` is exported and pure so scripts/dev-stack.test.mjs can assert
 * the failing directions on fixtures, the same way scripts/check-policies.mjs
 * and scripts/check-licenses.mjs are tested.
 */
import { spawn, execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const IS_WINDOWS = process.platform === "win32";

/**
 * `pnpm` is a `.cmd` shim on Windows, and Node >= 18.20 refuses to spawn a batch
 * file without a shell (EINVAL). `shell: true` would also make Node concatenate
 * the args unescaped (DEP0190). So the shell is named explicitly once, as
 * `cmd /d /s /c "<command line>"`, which is both safe and silent.
 */
function pnpmInvocation(args) {
  if (!IS_WINDOWS) return { command: "pnpm", args, shell: false };
  // Unquoted on purpose: Node quotes the `/c` argument for us and cmd's `/s`
  // strips the outer pair. Quoting here as well makes Node backslash-escape the
  // quotes, which cmd reports as '\"pnpm ...\"' is not recognized.
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", ["pnpm", ...args].join(" ")],
    shell: false,
  };
}

/**
 * The declared dev stack. Adding a service means adding it here; `checkDevStack`
 * then refuses to start until it is here, so the list cannot rot.
 *
 * `apps/` is the scope of the completeness check (see checkDevStack). It is
 * deliberately NOT the whole workspace: `tools/fixture-recorder` has its own
 * `dev` script (a standalone Vite UI) and is a tool, not part of the dev stack,
 * so requiring it would be noise.
 */
export const DEV_STACK = [
  {
    name: "@realtype/api",
    dir: "apps/api",
    defaultPort: 3000,
    // apps/api/src/server.ts reads PORT; the launcher maps the nicer
    // REALTYPE_API_PORT onto it so both services are configured the same way.
    portEnv: "PORT",
    // apps/api/src/server.ts already reads PORT, so no CLI flag is needed.
    portArgs: () => [],
  },
  {
    name: "@realtype/web",
    dir: "apps/web",
    defaultPort: 5173,
    portEnv: "REALTYPE_WEB_PORT",
    // vite.config.ts pins server.port and strictPort:true, so the CLI flag is
    // what lets the port be moved without editing apps/web (which this task must
    // not touch). --strictPort is repeated so the contract is explicit at the
    // call site rather than inherited from a config file.
    portArgs: (port) => ["--port", String(port), "--strictPort"],
  },
];

/**
 * Read every workspace package.
 *
 * The shape mirrors pnpm-workspace.yaml rather than being guessed: `apps/*`,
 * `packages/*` and `tools/*` are globs, but `e2e` is a single package. Listing
 * it alongside the globs and calling readdirSync on it finds nothing — which is
 * how the first version of this function lost @realtype/e2e, and the unit test
 * that reads the real repository caught it.
 */
export function readWorkspacePackages(root = ROOT) {
  const out = [];
  const add = (dir) => {
    const manifest = join(root, dir, "package.json");
    if (!existsSync(manifest)) return;
    if (!statSync(join(root, dir)).isDirectory()) return;
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    out.push({ dir, name: pkg.name, hasDev: Boolean(pkg.scripts && pkg.scripts.dev) });
  };

  for (const area of ["apps", "packages", "tools"]) {
    const areaDir = join(root, area);
    if (!existsSync(areaDir)) continue;
    for (const entry of readdirSync(areaDir)) add(`${area}/${entry}`);
  }
  add("e2e");

  return out;
}

/**
 * The pure validation. Returns human-readable problems; empty means the declared
 * dev stack can be started as written.
 *
 * `declared` defaults to DEV_STACK's names, but callers may pass a subset (that
 * is how `pnpm dev --filter X` is expressed). The completeness check is skipped
 * for an explicit subset on purpose: someone starting one service on purpose
 * should not be told the dev stack is incomplete.
 */
export function checkDevStack({ declared, workspacePackages } = {}) {
  const wanted = (declared ?? DEV_STACK.map((s) => s.name)).map((s) =>
    typeof s === "string" ? s : s.name,
  );
  const byName = new Map((workspacePackages ?? []).map((p) => [p.name, p]));
  const problems = [];
  /** Names already explained above, so the checks below never double-report. */
  const explained = new Set();

  for (const name of wanted) {
    const pkg = byName.get(name);
    if (!pkg) {
      // The F1 case. Say what it looked for and what does exist: a typo is
      // obvious next to the real names, and invisible next to nothing.
      const known = [...byName.keys()].sort().join(", ");
      problems.push(
        `dev filter "${name}" matches no workspace package. Known packages: ${known || "(none)"}`,
      );
      explained.add(name);
      continue;
    }
    if (!pkg.hasDev) {
      problems.push(`dev filter "${name}" matches ${pkg.dir}, which has no "dev" script`);
      explained.add(name);
    }
  }

  const isSubset = declared !== undefined;
  if (!isSubset) {
    // F9. A service added to the workspace with a dev script is expected to be
    // running during development; omitting it from the stack would be a silent
    // half-stack of exactly the kind this file exists to remove.
    for (const pkg of workspacePackages ?? []) {
      if (!pkg.dir.startsWith("apps/")) continue;
      if (!pkg.hasDev) continue;
      if (wanted.includes(pkg.name)) continue;
      problems.push(
        `workspace package "${pkg.name}" (${pkg.dir}) has a "dev" script but is not in the dev stack; ` +
          `add it to DEV_STACK in scripts/dev-stack.mjs`,
      );
    }
  }

  // The unguarded hole this function had for two sessions, found by
  // owner-proxy review 1 (ALERT-1's sibling finding, D6).
  //
  // `--filter tools/fixture-recorder` names a package that EXISTS and HAS a
  // `dev` script. Every loop above passes it: the name resolves, the dev script
  // is there, and because an explicit `--filter` is a deliberate subset the F9
  // completeness check is (correctly) skipped. But `services` is
  // `DEV_STACK.filter(...)` — and that package is not in DEV_STACK — so the list
  // comes back EMPTY. The launcher then supervises zero children, `firstFailure`
  // stays null, and it exits 0.
  //
  // So `pnpm dev --filter <something valid but not in the stack>` prints nothing,
  // starts nothing, waits for nothing, and reports success. That is the exact
  // "the tool said it was fine" shape F1, F2 and F3 exist to kill, reached
  // through the one path the validation was written to allow.
  //
  // The fix is to check the thing that actually matters: did every name I was
  // asked for resolve to a service the launcher knows how to start? Not whether
  // the package exists — whether the launcher will RUN it.
  for (const name of wanted) {
    if (explained.has(name)) continue;
    if (!DEV_STACK.some((s) => s.name === name)) {
      const pkg = byName.get(name);
      const how =
        pkg === undefined
          ? "it matches no workspace package"
          : pkg.hasDev
            ? "it has a dev script but is not in the dev stack"
            : "it has no dev script";
      problems.push(
        `dev filter "${name}" cannot be started by this launcher: ${how}. ` +
          `Declared services: ${DEV_STACK.map((s) => s.name).join(", ")}`,
      );
    }
  }

  return problems;
}

/** `--filter X` may be repeated; anything else is ignored. */
function parseFilterArgs(argv) {
  const filters = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--filter" || argv[i] === "-F") filters.push(argv[++i]);
  }
  return filters;
}

function portFor(service) {
  const raw =
    service.portEnv === "PORT" ? process.env.REALTYPE_API_PORT : process.env[service.portEnv];
  return Number(raw ?? service.defaultPort);
}

/**
 * Snapshot every descendant of `rootPid`, deepest last.
 *
 * `ps -eo pid=,ppid=` is the whole process table in one call. Reading it costs
 * one fork; guessing at process groups costs a leaked server holding a port.
 */
async function descendantPids(rootPid) {
  const { stdout } = await promisify(execFile)("ps", ["-eo", "pid=,ppid="]);
  const childrenOf = new Map();
  for (const line of stdout.split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
    if (!childrenOf.has(ppid)) childrenOf.set(ppid, []);
    childrenOf.get(ppid).push(pid);
  }
  const out = [];
  const seen = new Set([rootPid]);
  const stack = [rootPid];
  while (stack.length > 0) {
    const pid = stack.pop();
    for (const kid of childrenOf.get(pid) ?? []) {
      if (seen.has(kid)) continue; // guards a cyclic table, which ps cannot have
      seen.add(kid);
      out.push(kid);
      stack.push(kid);
    }
  }
  return out;
}

/**
 * Kill a whole process tree, and mean "tree" by parentage rather than by
 * process group.
 *
 * The group kill (`process.kill(-pid)`) was wrong here, and wrong in a way that
 * only shows up off Windows. This launcher spawns each service with
 * `detached: true`, which on POSIX gives every service its OWN process group.
 * A group kill of the launcher's group therefore never reaches vite or
 * `tsx watch` — they survive, holding ports 3000 and 5173, and the dev stack
 * reports success with a dead API behind it. That is defect F3's twin.
 *
 * Windows never showed it because `taskkill /T` walks the parent/child
 * relationship, which is what we actually meant. So this walks that
 * relationship on POSIX too, via `ps`.
 *
 * Order matters. The root is killed FIRST so `tsx watch` cannot restart the
 * server we are about to kill; the descendants are then killed deepest-first,
 * so a parent is never reparented onto init while a child of its is still
 * running. The snapshot is taken BEFORE any kill, because afterwards the table
 * has already changed.
 *
 * @param {number|undefined} pid
 * @returns {Promise<void>}
 */
export async function killTree(pid) {
  if (!pid) return;
  if (IS_WINDOWS) {
    await new Promise((resolve) => {
      execFile("taskkill", ["/pid", String(pid), "/T", "/F"], () => resolve());
    });
    return;
  }
  let descendants = [];
  try {
    descendants = await descendantPids(pid);
  } catch {
    // No `ps` (or it failed): fall back to the group kill, which is still
    // better than signalling the root alone.
  }
  const signal = (target) => {
    try {
      process.kill(target, "SIGKILL");
    } catch {
      /* already gone, or not ours to kill */
    }
  };
  signal(pid);
  for (let i = descendants.length - 1; i >= 0; i -= 1) signal(descendants[i]);
}

/**
 * Prefix each child's output with its package name, the way `pnpm --parallel`
 * did. Line-buffered so a partial line is never emitted twice or split.
 */
function prefixStream(stream, name, sink) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) sink.write(`${name} dev: ${line}\n`);
  });
  stream.on("end", () => {
    if (buffer) sink.write(`${name} dev: ${buffer}\n`);
  });
}

async function main() {
  const filters = parseFilterArgs(process.argv.slice(2));
  const workspacePackages = readWorkspacePackages();

  // Validate the names AS TYPED, not the subset they resolve to. Filtering
  // DEV_STACK first would silently drop a typo'd name and leave an empty,
  // "valid" stack — the exact half-stack this launcher is here to prevent.
  const services = filters.length ? DEV_STACK.filter((s) => filters.includes(s.name)) : DEV_STACK;

  const problems = checkDevStack({
    declared: filters.length ? filters : undefined,
    workspacePackages,
  });

  if (problems.length > 0) {
    console.error("Refusing to start the dev stack:\n");
    for (const p of problems) console.error(`  - ${p}`);
    console.error("\nNothing was started. Fix the list, or pass --filter <package> for a subset.");
    process.exit(1);
  }

  /** @type {{service: object, child: import("node:child_process").ChildProcess}[]} */
  const running = [];
  let firstFailure = null;

  const stopAll = async () => {
    await Promise.all(running.map((r) => killTree(r.child.pid)));
  };

  for (const service of services) {
    const port = portFor(service);
    const extra = service.portArgs(port);
    // No `--` separator: pnpm 11.2.2 forwards a literal `--` to the script when
    // one is given (measured — vite received "--" as a positional argument and
    // silently kept the port from its config). Unrecognised flags after the
    // script name are passed straight through, which is what is wanted here.
    const args = ["--dir", service.dir, "run", "dev", ...extra];
    const invocation = pnpmInvocation(args);
    const child = spawn(invocation.command, invocation.args, {
      cwd: ROOT,
      // The api reads PORT from the environment; the web takes --port on the
      // command line. Injecting each the way that service already understands is
      // why the two are configured in different places here.
      env: { ...process.env, ...(service.portEnv ? { [service.portEnv]: String(port) } : {}) },
      detached: !IS_WINDOWS,
      shell: invocation.shell,
      stdio: ["ignore", "pipe", "pipe"],
    });
    prefixStream(child.stdout, service.name, process.stdout);
    prefixStream(child.stderr, service.name, process.stderr);
    running.push({ service, child });
    console.log(`${service.name} dev: starting on port ${port}`);
  }

  const onSignal = (signal) => {
    // Ctrl-C in a terminal already reaches every process in the group on POSIX;
    // this covers Windows consoles and the case where a child is mid-restart.
    void stopAll().then(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
  process.on("SIGINT", () => onSignal("SIGINT"));
  process.on("SIGTERM", () => onSignal("SIGTERM"));

  await Promise.all(
    running.map(
      ({ service, child }) =>
        new Promise((resolve) => {
          child.on("exit", (code, signal) => {
            // The first child to fail ends the whole stack. This is the F3 fix:
            // previously a dead API was reported as a running dev stack.
            if (!firstFailure && (signal !== null || code !== 0)) {
              firstFailure = { service, code: code ?? 1, signal };
              void stopAll();
            }
            resolve();
          });
          child.on("error", (err) => {
            // Spawn itself failed (pnpm missing, bad --dir). Without stopping the
            // siblings here, Promise.all would wait on a stack whose other half
            // is perfectly healthy — the same "reports success while broken"
            // shape as F3, reached a different way.
            if (!firstFailure) {
              firstFailure = { service, code: 1, signal: null };
              void stopAll();
            }
            console.error(`${service.name} dev: failed to start: ${err.message}`);
            resolve();
          });
        }),
    ),
  );

  await stopAll();

  if (firstFailure) {
    console.error(
      `\n${firstFailure.service.name} dev exited with ${
        firstFailure.signal ? `signal ${firstFailure.signal}` : `code ${firstFailure.code}`
      }. Stopping the dev stack.`,
    );
    process.exit(
      typeof firstFailure.code === "number" && firstFailure.code !== 0 ? firstFailure.code : 1,
    );
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
