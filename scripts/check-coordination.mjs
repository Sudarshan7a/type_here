/**
 * Coordination gate: read every shard under `docs/coordination/events/`, derive
 * state by replay, and fail if the fleet is unsafe or the memory is corrupt.
 *
 * A thin wrapper on purpose — all the logic is in scripts/coordination.mjs and all
 * of that is unit-tested, so this file only does I/O, formatting and the exit
 * code. `--now` exists so the ledger of leases is reproducible in tests and in a
 * bisect, and `--dir` so the same gate can be pointed at a fixture directory.
 *
 *   node scripts/check-coordination.mjs [--now <iso>] [--dir <path>]
 *
 * Exit 0 with a printed summary of who holds what; exit 1 on any error-severity
 * problem. Warnings print and do not block.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { agentFromShardFile, deriveState, parseShard } from "./coordination.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DIR = join(root, "docs", "coordination", "events");

/**
 * @param {string[]} argv
 * @returns {{dir: string, now: string|undefined}}
 */
export function parseArgs(argv) {
  /** @type {{dir: string, now: string|undefined}} */
  const options = { dir: DEFAULT_DIR, now: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--now") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--now needs an ISO-8601 instant");
      // Fail here rather than deep inside toEpochMs, where the message loses the flag.
      if (Number.isNaN(Date.parse(value)))
        throw new Error(`--now is not a valid instant: ${value}`);
      options.now = value;
      index += 1;
      continue;
    }
    if (flag === "--dir") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--dir needs a path");
      options.dir = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${flag}`);
  }
  return options;
}

/**
 * Read every shard in a directory.
 *
 * A shard file name that is not a valid agent id is a hard error rather than a
 * skipped file: silently ignoring `events/scoped by me.jsonl` would hide exactly
 * the state this gate exists to see.
 *
 * @param {string} dir
 * @returns {{shards: Record<string, Record<string, unknown>[]>, problems: string[]}}
 */
export function readShards(dir) {
  /** @type {Record<string, Record<string, unknown>[]>} */
  const shards = {};
  /** @type {string[]} */
  const problems = [];
  if (!existsSync(dir)) return { shards, problems };

  for (const fileName of readdirSync(dir).sort()) {
    const agent = agentFromShardFile(fileName);
    if (agent === null) {
      if (fileName.endsWith(".jsonl"))
        problems.push(`shard file name is not a valid agent id: ${fileName}`);
      continue;
    }
    if (shards[agent] !== undefined) {
      problems.push(`two shard files claim agent id ${agent} (duplicate shard)`);
      continue;
    }
    shards[agent] = parseShard(readFileSync(join(dir, fileName), "utf8"), agent);
  }
  return { shards, problems };
}

/** @param {number} ms */
function formatDuration(ms) {
  if (ms <= 0) return `EXPIRED ${Math.round(-ms / 1000)}s ago`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

/** @param {string[]} values */
function orDash(values) {
  return values.length === 0 ? "—" : values.join(", ");
}

/**
 * @param {ReturnType<typeof deriveState>} state
 * @returns {string[]} report lines
 */
export function formatReport(state) {
  const lines = [];
  const width = (rows, column) => Math.max(...rows.map((row) => row[column].length), 0);

  const header = (rows) => {
    if (rows.length === 0) return [];
    const widths = [0, 1, 2, 3].map((column) => width(rows, column));
    return [
      ["TASK", "AGENT", "SCOPES", "TTL LEFT", "DEPENDS ON"]
        .map((cell, index) => cell.padEnd(widths[index]))
        .join("  ")
        .trimEnd(),
      ...rows.map((row) =>
        row
          .map((cell, index) => cell.padEnd(widths[index]))
          .join("  ")
          .trimEnd(),
      ),
    ];
  };

  const claimRows = (claims) =>
    claims.map((claim) => [
      claim.task,
      claim.agent,
      orDash(claim.scopes),
      claim.status === "released"
        ? `released: ${claim.release?.outcome}`
        : formatDuration(claim.ttlRemainingMs),
      orDash(claim.dependsOn),
    ]);

  lines.push(`Active claims (${state.active.length}):`);
  lines.push(...header(claimRows(state.active)));
  if (state.active.length === 0) lines.push("  (none — every scope is claimable)");

  if (state.expired.length > 0) {
    lines.push("");
    lines.push(`Expired leases (${state.expired.length}) — these scopes are free again:`);
    lines.push(...header(claimRows(state.expired)));
  }

  if (state.released.length > 0) {
    lines.push("");
    lines.push(`Released (${state.released.length}):`);
    lines.push(...header(claimRows(state.released)));
  }

  if (state.proposals.length > 0) {
    lines.push("");
    lines.push(
      `Ledger proposals for the integrator (${state.proposals.length}) — agents never edit the ledger:`,
    );
    for (const proposal of state.proposals) {
      lines.push(
        `  ${proposal.row}: ${proposal.fromStatus} -> ${proposal.toStatus}  (${proposal.agent}, ${proposal.task}, ${proposal.pr})`,
      );
      lines.push(`      evidence: ${proposal.evidence}`);
    }
  }

  if (state.warnings.length > 0) {
    lines.push("");
    lines.push(`Warnings (${state.warnings.length}) — these do not block:`);
    for (const warning of state.warnings) lines.push(`  - [${warning.code}] ${warning.message}`);
  }

  return lines;
}

/**
 * Run the gate and return the exit code, so the CLI body and the tests share one
 * path.
 *
 * @param {{dir: string, now: string|undefined, log?: (line: string) => void, error?: (line: string) => void}} options
 * @returns {number}
 */
export function run(options) {
  const log = options.log ?? ((line) => console.log(line));
  const error = options.error ?? ((line) => console.error(line));

  const { shards, problems: shardProblems } = readShards(options.dir);
  const state = deriveState(shards, options.now ?? Date.now());
  const readOnlyProblems = shardProblems.map((message) => ({
    code: "MALFORMED_EVENT",
    severity: /** @type {"error"} */ ("error"),
    agent: "?",
    task: null,
    message,
  }));

  const problems = [...readOnlyProblems, ...state.problems];
  const errors = problems.filter((entry) => entry.severity === "error");
  const warnings = problems.filter((entry) => entry.severity === "warning");

  if (errors.length > 0) {
    error(
      `Coordination check FAILED — ${errors.length} problem${errors.length === 1 ? "" : "s"}:\n`,
    );
    for (const entry of errors) error(`  - [${entry.code}] ${entry.message}`);
    if (warnings.length > 0) {
      error(`\n  and ${warnings.length} warning${warnings.length === 1 ? "" : "s"}:`);
      for (const entry of warnings) error(`  - [${entry.code}] ${entry.message}`);
    }
    error(
      "\nProtocol: docs/coordination/PROTOCOL.md. An active lease is released by emitting a release event; a lease that expires needs no human. Ledger rows are applied by the integrator from ledger_proposal events, never edited directly.",
    );
    return 1;
  }

  log(formatReport(state).join("\n"));
  log("");
  log(
    `Coordination check passed: ${state.eventCount} events across ${state.agents.length} shard${state.agents.length === 1 ? "" : "s"}, ${state.active.length} active claim${state.active.length === 1 ? "" : "s"}, ${state.proposals.length} ledger proposal${state.proposals.length === 1 ? "" : "s"}${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ""}.`,
  );
  return 0;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  process.exit(run(options));
}

// Only run as CLI when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
