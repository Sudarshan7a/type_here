/**
 * Append one event to your coordination shard. This is the only supported way to
 * write to `docs/coordination/events/<agent-id>.jsonl`: hand-writing a line means
 * computing `prev` and `hash` by hand, and the gate rejects anything that does not
 * verify.
 *
 * It lives under docs/ rather than scripts/ because it is part of the protocol, not
 * of CI — same reason docs/recompute-fingermap.mjs lives where it does.
 *
 *   node docs/coordination/log.mjs claim     --task ENG-07 --scope "packages/schemas/**" --ttl 90m --depends ENG-01
 *   node docs/coordination/log.mjs heartbeat --task ENG-07
 *   node docs/coordination/log.mjs release   --task ENG-07 --outcome partial --notes "blocked on ENG-01"
 *   node docs/coordination/log.mjs propose   --task ENG-07 --row ENG-07 --from "NOT STARTED" --to "IN PROGRESS" --evidence "tests green" --pr "#142"
 *   node docs/coordination/log.mjs note      --task ENG-07 --text "read PROTOCOL.md before editing"
 *
 * Agent id resolution, in order: --agent, $COORDINATION_AGENT, the current git
 * branch slugified. It must match the shard file name, because the gate derives the
 * owner from the file and rejects a foreign event.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { appendEvent, parseShard, serializeEvent, shardFileName, validateEvent } from "../../scripts/coordination.mjs";

const EVENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "events");
const DEFAULT_TTL_MINUTES = 60;

/**
 * Parse `node log.mjs <type> --flag value ...` into an event body.
 *
 * Repeatable flags (--scope, --depends) collect into arrays; every other flag takes
 * the single value after it.
 *
 * @param {string[]} argv
 * @returns {{type: string, flags: Record<string, string[]>}}
 */
export function parseLogArgs(argv) {
  const [type, ...rest] = argv;
  if (type === undefined || type.startsWith("--")) throw new Error("first argument must be an event type");
  /** @type {Record<string, string[]>} */
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (!flag.startsWith("--")) throw new Error(`expected a --flag, got "${flag}"`);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
    const name = flag.slice(2);
    flags[name] = [...(flags[name] ?? []), value];
    index += 1;
  }
  return { type, flags };
}

/**
 * Agent id from the flag, the environment, or the checked-out branch.
 *
 * @param {string[]} [flagValues]
 * @returns {string}
 */
export function resolveAgent(flagValues = []) {
  const candidate = flagValues[0] ?? process.env.COORDINATION_AGENT ?? currentBranch();
  if (candidate === undefined || candidate === "") {
    throw new Error("no agent id: pass --agent, or set COORDINATION_AGENT, or run inside a worktree");
  }
  return candidate.trim().replaceAll("/", "-").toLowerCase();
}

/** @returns {string|undefined} */
function currentBranch() {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Turn parsed flags into the payload for one event type.
 *
 * @param {string} type
 * @param {Record<string, string[]>} flags
 * @returns {Record<string, unknown>}
 */
export function buildPayload(type, flags) {
  const one = (name) => {
    const values = flags[name];
    if (values === undefined || values.length === 0) throw new Error(`--${name} is required`);
    if (values.length > 1) throw new Error(`--${name} takes one value`);
    return values[0];
  };
  const task = one("task");

  if (type === "claim") {
    const scopes = flags.scope ?? [];
    // No empty claims. If you are not editing anything, you do not need a claim —
    // write a note. A claim with no scope exists only to make the lease table lie.
    if (scopes.length === 0) throw new Error("--scope is required at least once; if you are not editing files, write a note instead");
    const ttlMs = (flags.ttl === undefined ? DEFAULT_TTL_MINUTES : Number.parseInt(one("ttl"), 10)) * 60_000;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new Error("--ttl must be a whole number of minutes, e.g. 90m");
    return { task, scopes, ttlMs, dependsOn: flags.depends ?? [] };
  }
  if (type === "heartbeat") return { task };
  if (type === "release") {
    const notes = flags.notes?.[0];
    return { task, outcome: one("outcome"), ...(notes === undefined ? {} : { notes }) };
  }
  if (type === "ledger_proposal") {
    return {
      task,
      row: one("row"),
      fromStatus: one("from"),
      toStatus: one("to"),
      evidence: one("evidence"),
      pr: one("pr"),
    };
  }
  if (type === "note") return { task, text: one("text") };
  throw new Error(`unknown event type "${type}": claim, heartbeat, release, ledger_proposal, note`);
}

/**
 * Append one validated event and return its file and serialised line.
 *
 * Exported for tests. Pure apart from the append itself, which is why a test can
 * point it at a temporary directory.
 *
 * @param {{agent: string, type: string, payload: Record<string, unknown>, eventsDir?: string, ts?: string}} request
 * @returns {{file: string, line: string, event: Record<string, unknown>}}
 */
export function appendOne(request) {
  const agent = request.agent;
  const file = join(request.eventsDir ?? EVENTS_DIR, shardFileName(agent));
  const shard = existsSync(file) ? parseShard(readFileSync(file, "utf8"), agent) : [];
  const { event } = appendEvent(shard, {
    agent,
    ts: request.ts ?? new Date().toISOString(),
    type: request.type,
    ...request.payload,
  });
  // Fail closed. An event the gate will reject is worse than no event at all: it
  // turns the author's next commit red for a reason they did not cause.
  const invalid = validateEvent(event, agent);
  if (invalid.length > 0) throw new Error(`refusing to write an invalid event: ${invalid[0].message}`);
  mkdirSync(join(request.eventsDir ?? EVENTS_DIR), { recursive: true });
  const line = serializeEvent(event);
  appendFileSync(file, `${line}\n`);
  return { file, line, event };
}

function main() {
  const { type, flags } = parseLogArgs(process.argv.slice(2));
  const agent = resolveAgent(flags.agent);
  const { file, event } = appendOne({ agent, type, payload: buildPayload(type, flags) });
  console.log(`appended ${type} to ${file}`);
  console.log(`  seq ${event.seq}  task ${String(event.task)}  hash ${String(event.hash).slice(0, 12)}…`);
  if (event.type === "claim") {
    // `expiresAt` is a derived field of the fold, not part of the event, so the
    // preview has to do the same arithmetic the reader will.
    const expires = new Date(Date.parse(String(event.ts)) + Number(event.ttlMs));
    console.log(`  lease expires ${expires.toISOString()} unless you heartbeat`);
    console.log("  now COMMIT this file, or the claim does not exist for anybody else.");
    console.log("  heartbeat every few minutes while you work; release even when you fail.");
  } else {
    console.log("  now COMMIT this file, or the event does not exist for anybody else.");
  }
}

// Only run as CLI when invoked directly (not when imported by a test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}