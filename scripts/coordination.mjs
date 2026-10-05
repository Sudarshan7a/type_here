/**
 * Agent-coordination core: a write-ahead log of claims, replayed to derive state.
 *
 * THE PROBLEM. This repo is built by several AI agents in parallel, each in its
 * own git worktree, all targeting the same `main`. Two failure modes have already
 * nearly bitten us, and both come from the same root cause — agents hold no
 * shared, ordered memory of who is touching what:
 *
 *   1. SILENT OVERWRITE. Two agents edit `docs/FEATURE-LEDGER.md`,
 *      `BUILD-LOG.md`, `package.json`, `.github/workflows/ci.yml` or
 *      `eslint.config.mjs`. Each commits from its own worktree; the second merge
 *      either conflicts confusingly or clobbers the other's work.
 *   2. DEADLOCK. Agents block on each other: circular waits, a crashed agent
 *      holding a lock forever, an agent waiting for a review that will never come.
 *
 * THE SHAPE OF THE SOLUTION. This is the Write-Ahead-Log + Lease + HeartBeat +
 * Fixed-Partitions pattern set, transplanted from database internals to agent
 * coordination. No state is stored anywhere. State is DERIVED by replaying an
 * append-only log, exactly the way a database derives its tables from its WAL.
 *
 * WHY THE LOG IS SHARDED PER AGENT — this is the crux of the whole design.
 * `docs/coordination/events/<agent-id>.jsonl`: one file per agent id, one JSON
 * object per line, append-only. The obvious alternative — a single shared
 * `events.jsonl` — would reintroduce precisely the problem we are trying to
 * eliminate. A shared append-only file is still a single shared mutable file:
 * two agents appending near the end of it produce overlapping hunks, `git merge`
 * conflicts, and whoever merges second resolves by discarding one agent's line.
 * That is the silent-overwrite bug with a different filename.
 *
 * With per-agent files, two agents can never write the same path, so merges are
 * CONFLICT-FREE BY CONSTRUCTION — git has nothing to merge in the log directory,
 * so a merge can only fail on files the two agents actually share, which is
 * precisely where a conflict is *information* rather than noise. The
 * "replication layer" is git itself; the "log store" is the working tree. The
 * cost is that reads must merge the shards, which is why everything here is built
 * as a fold over shards rather than a single mutable structure.
 *
 * INTEGRITY. Each event carries `prev` (the previous event's `hash` in the same
 * shard, 64 zeros for genesis) and `hash` (sha256 over a canonical serialisation
 * of the event excluding `hash` itself). Per-agent `seq` starts at 1 and strictly
 * increments. Together these make truncation, tampering and out-of-order writes
 * detectable rather than merely unlikely — see `verifyChain`.
 *
 * KNOWN LIMIT, STATED PLAINLY. A hash chain proves order and content *within* a
 * shard; it cannot prove a shard is complete, because nothing outside the shard
 * knows how many events it should contain. Deleting or reordering an event in the
 * MIDDLE of a shard is caught (seq gap, or a `prev` that no longer matches).
 * Truncating the TAIL of a shard — dropping an agent's most recent events —
 * leaves a perfectly valid prefix and is undetectable from the log alone. Closing
 * that hole needs an external anchor (a signed commit, or a merged counter that
 * is itself chained), which is out of scope here. The practical mitigation is
 * procedural and in PROTOCOL.md: a release event is committed in the same commit
 * as the work it releases, so a truncated shard is visible in the git history
 * even when the chain cannot see it.
 *
 * ANTI-DEADLOCK. Every claim carries a TTL. A claim is active only while
 * `now - lastLifecycleTs(task) < ttlMs`, and a lifecycle event (heartbeat or the
 * claim itself) is the only thing that extends it. A crashed, killed or
 * abandoned agent therefore stops renewing on its own and its scopes become
 * claimable again with no human intervention. There is no `unlock` command that
 * can be forgotten, because there is no lock — only a lease that expires.
 * `outcome: "partial"` and `"abandoned"` release the scopes completely, so an
 * agent that gives up on a blocked task frees the fleet instead of wedging it.
 *
 * SINGLE WRITER. Agents never edit `docs/FEATURE-LEDGER.md` or `BUILD-LOG.md`.
 * They emit `ledger_proposal` events and the integrator applies them. That is the
 * one file where N writers cannot be made safe by partitioning, because every row
 * of the table lives in the one file.
 *
 * This module is the pure core: no filesystem access, no clock, no dependencies.
 * `scripts/check-coordination.mjs` is the thin CLI over it.
 *
 * CANONICALISATION (exact rule, so a third party can reproduce a hash):
 *   canonicalize(v) is defined recursively —
 *     null            -> "null"
 *     boolean         -> "true" / "false"
 *     number          -> JSON.stringify(v); a non-finite number THROWS
 *     string          -> JSON.stringify(v) (RFC 8259 escaping: `"` and `\` are
 *                        backslash-escaped, U+0000–U+001F use the short escapes
 *                        \b \f \n \r \t where they exist and \u00XX otherwise,
 *                        non-ASCII characters are emitted literally as UTF-8)
 *     array           -> "[" + elements canonicalised, comma-joined, in ORDER
 *                        (arrays are never sorted: order is data)
 *     plain object    -> "{" + `"key":value` pairs, comma-joined, with keys
 *                        SORTED by UTF-16 code unit (default JS `<` order), and
 *                        with keys whose value is `undefined` OMITTED (so an
 *                        absent optional field hashes the same as an absent one)
 *     anything else   -> THROWS (functions, symbols, undefined at top level)
 *   No whitespace anywhere. `hash` is never included in its own input: callers
 *   hash the event minus the `hash` key, and `hashEvent` does the deletion so no
 *   caller can get that wrong.
 */

import { createHash } from "node:crypto";

/** `prev` of the first event in a shard: sha256 of the empty string, by convention. */
export const GENESIS_HASH = "0".repeat(64);

/** The event types the protocol defines. An unknown type is a malformed event. */
export const EVENT_TYPES = ["claim", "heartbeat", "release", "ledger_proposal", "note"];

/**
 * `release.outcome` values. All three release the scopes — "partial" and
 * "abandoned" included. A lease that is only released on success is a lock, and a
 * lock is what we are building our way out of.
 */
export const RELEASE_OUTCOMES = ["done", "partial", "abandoned"];

/**
 * Agent ids are file names, so they are restricted to what is safe as a path
 * component: a traversal in an agent id would let a log write escape the shard
 * directory, and a path separator would collide with the one-file-per-agent rule.
 */
const AGENT_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

/** ISO-8601 with a zone designator. Wall clock only — these timestamps are logs, not durations. */
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Cap on generated witnesses per pattern, so a pathological glob cannot stall the gate. */
const WITNESS_CAP = 256;

/** Filler segment names used when a wildcard has no literal segment to borrow. */
const WITNESS_FILLERS = ["x", "src", "tests"];

/**
 * Problem codes, with the severity the gate exits on. Kept as data so PROTOCOL.md,
 * the CLI report and the tests all read from one list.
 *
 * error   — the fleet is unsafe or the memory is corrupt; CI fails.
 * warning — worth a human's eye, not a reason to block a merge.
 */
export const PROBLEM_CODES = {
  MALFORMED_EVENT: "error",
  FOREIGN_EVENT: "error",
  SEQ_GAP: "error",
  CHAIN_BROKEN: "error",
  BAD_HASH: "error",
  SCOPE_CONFLICT: "error",
  SCOPE_OVERLAP_SAME_AGENT: "warning",
  DUPLICATE_TASK: "error",
  DEPENDENCY_CYCLE: "error",
  RELEASE_UNKNOWN_TASK: "error",
  RELEASE_CONFLICT: "error",
  HEARTBEAT_UNKNOWN_TASK: "error",
  HEARTBEAT_AFTER_RELEASE: "error",
  CLAIM_REVISION: "error",
  PROPOSAL_CONFLICT: "error",
  DEPENDENCY_PLANNED: "warning",
};

/**
 * @typedef {object} Problem
 * @property {string} code one of PROBLEM_CODES
 * @property {"error"|"warning"} severity
 * @property {string} agent shard the problem was found in, or "?"
 * @property {string|null} task task the problem concerns, or null
 * @property {string} message one line, written to be read by an agent in a hurry
 */

/**
 * @param {keyof PROBLEM_CODES} code
 * @param {string} message
 * @param {{agent?: string|null, task?: string|null}} [where]
 * @returns {Problem}
 */
function problem(code, message, where = {}) {
  return {
    code,
    severity: PROBLEM_CODES[code],
    agent: where.agent ?? "?",
    task: where.task ?? null,
    message,
  };
}

// --- time ------------------------------------------------------------------

/**
 * Normalise an instant to epoch milliseconds. Accepts what the CLI and tests
 * realistically pass: an ISO string, a `Date`, or a number.
 *
 * @param {string|number|Date} value
 * @returns {number}
 */
export function toEpochMs(value) {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new TypeError(`coordination: not a valid instant: ${JSON.stringify(value)}`);
}

// --- canonical form and hashing ---------------------------------------------

/**
 * Canonical JSON serialisation. See the module header for the exact rule; the
 * short version is sorted keys, no whitespace, and a throw on anything JSON
 * cannot round-trip losslessly.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalize(value) {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "boolean") return value ? "true" : "false";
  if (type === "number") {
    // NaN and Infinity serialise to `null` in JSON.stringify, which would make
    // two different broken events hash identically. Fail loudly instead.
    if (!Number.isFinite(value))
      throw new TypeError("coordination: cannot canonicalise a non-finite number");
    return JSON.stringify(value);
  }
  if (type === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  if (type === "object") {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new TypeError(`coordination: cannot canonicalise a value of type ${type}`);
}

/**
 * sha256 (hex) of the canonical form of `event` with `hash` removed.
 *
 * `hash` is deleted rather than skipped so that an event can never be hashed with
 * a stale `hash` field left in place by a caller that spread a previous event.
 *
 * @param {Record<string, unknown>} event
 * @returns {string} 64 lowercase hex characters
 */
export function hashEvent(event) {
  const withoutHash = { ...event };
  delete withoutHash.hash;
  return createHash("sha256").update(canonicalize(withoutHash), "utf8").digest("hex");
}

// --- scope patterns ---------------------------------------------------------

/** @type {Map<string, RegExp>} */
const matcherCache = new Map();

/**
 * Normalise a path or pattern: forward slashes, no `./` prefix, no duplicate or
 * trailing slashes. Both sides of every comparison go through this, so
 * `packages/engine/` and `./packages/engine` are the same scope.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizePath(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

/**
 * Glob rule (gitignore-flavoured, path-scoped):
 *   - `*`  matches zero or more characters within ONE path segment
 *   - `?`  matches exactly one character within one path segment
 *   - a `**` that is a whole segment matches zero or more whole path segments,
 *     so a pattern `a/<star-star>/b` matches `a/b`, `a/x/b` and `a/x/y/b`
 *   - `dir/**` additionally matches `dir` itself. Standard glob does not, but an
 *     agent claiming `packages/engine/**` plainly means to own that tree, and a
 *     rule that made the directory itself unclaimable would push agents into
 *     writing `dir/**` and `dir/*` as two scopes.
 *   - A bare `**` is the whole repository. That is what an agent doing a
 *     repo-wide sweep means, and reading it as "zero or more segments, and then
 *     nothing" — the literal reading of the rule above — would make it match the
 *     empty path only, which is not a scope anybody wanted.
 *   - Patterns are matched against whole paths, never as substrings, and `*`
 *     never crosses a `/`. Claim `scripts/**`, not `*.mjs`, for "every script".
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function scopeMatcher(pattern) {
  const cached = matcherCache.get(pattern);
  if (cached !== undefined) return cached;

  const segments = normalizePath(pattern)
    .split("/")
    .filter((segment) => segment !== "");
  if (segments.length === 1 && segments[0] === "**") {
    return finishMatcher(pattern, "^.*$");
  }

  let source = "^";
  for (const [index, segment] of segments.entries()) {
    const isLast = index === segments.length - 1;
    if (segment === "**") {
      // Trailing `**`: the directory and everything under it. Leading `**/`:
      // zero or more whole segments, and it supplies its own slashes.
      source += isLast ? "(?:/[^/]+)*" : "(?:[^/]+/)*";
      continue;
    }
    source += segmentToRegex(segment);
    // Separator between this segment and the next. It is needed before a `**` that
    // sits in the middle (`a/<star-star>/b` must match `a/b`, which is why the slash
    // goes in even when the next segment is a wildcard) but NOT before a trailing
    // `**`, which supplies its own leading slashes (`a/<star-star>` must match `a`).
    const nextIsTrailingGlobstar =
      segments[index + 1] === "**" && index + 1 === segments.length - 1;
    if (!isLast && !nextIsTrailingGlobstar) source += "/";
  }
  source += "$";
  return finishMatcher(pattern, source);
}

/**
 * @param {string} pattern
 * @param {string} source regex source
 * @returns {RegExp}
 */
function finishMatcher(pattern, source) {
  const compiled = new RegExp(source);
  // Unbounded growth is not a real risk (patterns come from a handful of files in
  // the repo) but an unbounded cache in a CI process is still a smell; cap it.
  if (matcherCache.size > 512) matcherCache.clear();
  matcherCache.set(pattern, compiled);
  return compiled;
}

/**
 * @param {string} segment one path segment, no slashes
 * @returns {string} regex source
 */
function segmentToRegex(segment) {
  let out = "";
  for (const character of segment) {
    if (character === "*") out += "[^/]*";
    else if (character === "?") out += "[^/]";
    else out += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return out;
}

/**
 * Does a scope pattern cover a concrete path?
 *
 * @param {string} pattern
 * @param {string} path
 * @returns {boolean}
 */
export function scopeMatches(pattern, path) {
  return scopeMatcher(pattern).test(normalizePath(path));
}

/**
 * Literal segments appearing in a set of patterns. These are the names a `*` or a
 * `**` in the OTHER pattern could legitimately expand to, and borrowing them is
 * what lets witness generation catch the case that matters:
 *
 *     packages/<star>/tests   vs   packages/engine/<star-star>
 *
 * Substituting the filler "x" for `*` misses the real shared path
 * `packages/engine/tests`. Substituting the other pattern's literal segment "engine"
 * finds it. Overlap detection is therefore sound (every witness really is a member
 * of its own pattern, so a reported overlap is never a false positive) and
 * incomplete only for globs built from alternations that appear in neither pattern.
 *
 * @param {string[][]} patternSets
 * @returns {string[]}
 */
function literalVocabulary(patternSets) {
  const vocabulary = new Set(WITNESS_FILLERS);
  for (const patterns of patternSets) {
    for (const pattern of patterns) {
      for (const segment of normalizePath(pattern).split("/")) {
        if (segment !== "" && segment !== "**" && !/[*?]/.test(segment)) vocabulary.add(segment);
      }
    }
  }
  return [...vocabulary].sort();
}

/**
 * A concrete path that satisfies a wildcard segment, or null if none can be built.
 * Replacing `*` and `?` with "x" always satisfies the segment's own regex, because
 * every other character in the segment is a literal.
 *
 * @param {string} segment
 * @returns {string|null}
 */
function fillSegment(segment) {
  const filled = segment.replaceAll("*", "x").replaceAll("?", "x");
  return new RegExp(`^${segmentToRegex(segment)}$`).test(filled) ? filled : null;
}

/**
 * Expand a pattern into concrete member paths, borrowing segment names from the
 * sibling pattern so cross-pattern overlaps surface. Capped at WITNESS_CAP.
 *
 * @param {string} pattern
 * @param {string[]} vocabulary
 * @returns {string[]}
 */
function witnessPaths(pattern, vocabulary) {
  const segments = normalizePath(pattern)
    .split("/")
    .filter((segment) => segment !== "");
  /** @type {string[][][]} per-segment lists of alternatives, each alternative being the segments it expands to */
  const alternatives = segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    if (segment === "**") {
      const zero = [[]];
      const one = vocabulary.map((name) => [name]);
      const two = isLast ? [] : vocabulary.flatMap((a) => vocabulary.map((b) => [a, b]));
      return [...zero, ...one, ...two];
    }
    if (!/[*?]/.test(segment)) return [[segment]];
    const names = new Set();
    const filled = fillSegment(segment);
    if (filled !== null) names.add(filled);
    for (const name of vocabulary) {
      if (new RegExp(`^${segmentToRegex(segment)}$`).test(name)) names.add(name);
    }
    // One alternative PER name, not one alternative holding all of them: each
    // alternative is a whole path segment, and a single segment never contains a
    // slash.
    return [...names].sort().map((name) => [name]);
  });

  /** @type {string[][]} */
  let paths = [[]];
  for (const group of alternatives) {
    /** @type {string[][]} */
    const next = [];
    for (const prefix of paths) {
      for (const alternative of group) {
        next.push([...prefix, ...alternative]);
        if (next.length >= WITNESS_CAP) break;
      }
      if (next.length >= WITNESS_CAP) break;
    }
    paths = next;
  }
  return paths.map((segments_) => segments_.join("/")).filter((path) => path !== "");
}

/**
 * Find one concrete path that two scope sets both claim, or null.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {{witness: string, patternA: string, patternB: string}|null}
 */
export function findScopeOverlap(a, b) {
  const vocabulary = literalVocabulary([a, b]);
  for (const flipped of [false, true]) {
    const mine = flipped ? b : a;
    const theirs = flipped ? a : b;
    for (const pattern of mine) {
      for (const witness of witnessPaths(pattern, vocabulary)) {
        for (const other of theirs) {
          if (!scopeMatches(other, witness)) continue;
          // Keep patternA from set `a` and patternB from set `b` whichever side the
          // witness came from, so the reported pair reads in the caller's order.
          return flipped
            ? { witness, patternA: other, patternB: pattern }
            : { witness, patternA: pattern, patternB: other };
        }
      }
    }
  }
  return null;
}

/**
 * Do two scope sets share at least one file? This is the overwrite bug, decided
 * before anybody edits anything.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
export function scopeSetsOverlap(a, b) {
  return findScopeOverlap(a, b) !== null;
}

// --- events -----------------------------------------------------------------

/**
 * Shard file name for an agent id. The naming convention belongs with the protocol,
 * not with the one caller that happens to read the directory today.
 *
 * @param {string} agent
 * @returns {string}
 */
export function shardFileName(agent) {
  if (!AGENT_ID.test(agent))
    throw new TypeError(`coordination: invalid agent id: ${JSON.stringify(agent)}`);
  return `${agent}.jsonl`;
}

/**
 * Recover the agent id from a shard file name, or null if the name is not a shard.
 *
 * @param {string} fileName
 * @returns {string|null}
 */
export function agentFromShardFile(fileName) {
  if (!fileName.endsWith(".jsonl")) return null;
  const agent = fileName.slice(0, -".jsonl".length);
  return AGENT_ID.test(agent) ? agent : null;
}

/**
 * Structural validation of one event. Separated from `verifyChain` so a malformed
 * line produces ONE precise problem instead of a cascade of derived ones.
 *
 * @param {unknown} event
 * @param {string|null} [expectedAgent]
 * @returns {Problem[]}
 */
export function validateEvent(event, expectedAgent = null) {
  if (typeof event !== "object" || event === null || Array.isArray(event)) {
    return [problem("MALFORMED_EVENT", "event is not a JSON object")];
  }
  const e = /** @type {Record<string, unknown>} */ (event);
  const at = expectedAgent ?? "?";
  /** @type {string[]} */
  const bad = [];

  if (!Number.isInteger(e.seq) || /** @type {number} */ (e.seq) < 1)
    bad.push("seq must be an integer >= 1");
  if (typeof e.ts !== "string" || !ISO_TS.test(e.ts) || Number.isNaN(Date.parse(e.ts))) {
    bad.push("ts must be an ISO-8601 instant with a zone designator");
  }
  if (typeof e.type !== "string" || !EVENT_TYPES.includes(e.type)) {
    bad.push(`type must be one of ${EVENT_TYPES.join(", ")}`);
  }
  if (typeof e.agent !== "string" || !AGENT_ID.test(e.agent))
    bad.push("agent must be a valid agent id");
  if (typeof e.task !== "string" || e.task.trim() === "")
    bad.push("task must be a non-empty string");
  if (typeof e.prev !== "string" || !SHA256_HEX.test(e.prev))
    bad.push("prev must be 64 lowercase hex characters");
  if (typeof e.hash !== "string" || !SHA256_HEX.test(e.hash))
    bad.push("hash must be 64 lowercase hex characters");

  // Cross-shard integrity: the file name claims one agent, the event body another.
  // Nothing stops an agent from writing into a shard that is not its own, and if
  // that is allowed the per-shard chain stops being a per-AGENT chain.
  if (expectedAgent !== null && typeof e.agent === "string" && e.agent !== expectedAgent) {
    return [
      problem(
        "FOREIGN_EVENT",
        `shard ${expectedAgent} contains an event whose agent is ${e.agent}`,
        {
          agent: expectedAgent,
          task: typeof e.task === "string" ? e.task : null,
        },
      ),
    ];
  }

  const strings = (value, label) =>
    Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "")
      ? null
      : `${label} must be an array of non-empty strings`;

  if (e.type === "claim") {
    const scopes = strings(e.scopes, "scopes");
    if (scopes !== null) bad.push(scopes);
    const dependsOn = strings(e.dependsOn, "dependsOn");
    if (dependsOn !== null) bad.push(dependsOn);
    if (!Number.isInteger(e.ttlMs) || /** @type {number} */ (e.ttlMs) <= 0) {
      bad.push("ttlMs must be an integer > 0");
    }
  }
  if (e.type === "release") {
    if (typeof e.outcome !== "string" || !RELEASE_OUTCOMES.includes(e.outcome)) {
      bad.push(`outcome must be one of ${RELEASE_OUTCOMES.join(", ")}`);
    }
    if (e.notes !== undefined && typeof e.notes !== "string")
      bad.push("notes must be a string when present");
  }
  if (e.type === "ledger_proposal") {
    for (const key of ["row", "fromStatus", "toStatus", "evidence", "pr"]) {
      if (typeof e[key] !== "string" || /** @type {string} */ (e[key]).trim() === "") {
        bad.push(`${key} must be a non-empty string`);
      }
    }
  }
  if (e.type === "note" && (typeof e.text !== "string" || e.text.trim() === "")) {
    bad.push("text must be a non-empty string");
  }

  if (bad.length === 0) return [];
  return [
    problem(
      "MALFORMED_EVENT",
      `event ${at}#${String(e.seq ?? "?")} is invalid: ${bad.join("; ")}`,
      {
        agent: at,
        task: typeof e.task === "string" ? e.task : null,
      },
    ),
  ];
}

/**
 * Build and seal one event: fills in `prev`, computes `hash`, and returns the
 * object in the order the protocol writes it (`seq, ts, type, agent, task,
 * ...payload, prev, hash`) so an event read in a debugger is in protocol order.
 * `serializeEvent` writes it to disk in canonical (key-sorted) form regardless, so
 * the bytes on disk are the bytes that were hashed.
 *
 * @param {object} fields
 * @param {number} fields.seq
 * @param {string} fields.ts ISO-8601 instant
 * @param {string} fields.type
 * @param {string} fields.agent
 * @param {string} fields.task
 * @param {string} fields.prev 64 hex, or GENESIS_HASH
 * @param {Record<string, unknown>} [fields.payload]
 * @returns {Record<string, unknown>}
 */
export function makeEvent(fields) {
  const { seq, ts, type, agent, task, prev, payload = {} } = fields;
  const event = { seq, ts, type, agent, task, ...payload, prev, hash: "" };
  event.hash = hashEvent(event);
  return event;
}

/**
 * The WAL append primitive. Pure: it does not touch the filesystem, it returns the
 * new event and the new shard, and the caller writes one line. Keeping it pure is
 * what lets the tests build whole histories without a temp directory.
 *
 * `seq` is derived, not supplied, unless it is passed explicitly — an explicit
 * `seq` that disagrees with the shard length is a caller bug and throws rather
 * than quietly forking the chain.
 *
 * @template {Record<string, unknown>} T
 * @param {T[]} shard existing events for this agent, in append order
 * @param {Record<string, unknown> & {ts: string, type: string, agent: string, task: string}} fields
 *   the event body; everything that is not `ts`/`type`/`agent`/`task` is payload
 * @returns {{event: Record<string, unknown>, shard: T[]}}
 */
export function appendEvent(shard, fields) {
  const events = shard ?? [];
  const expectedSeq = events.length + 1;
  if (fields.seq !== undefined && fields.seq !== expectedSeq) {
    throw new RangeError(
      `coordination: seq ${String(fields.seq)} does not follow the shard (expected ${expectedSeq})`,
    );
  }
  const prev = events.length === 0 ? GENESIS_HASH : String(events[events.length - 1].hash);
  const { ts, type, agent, task, ...payload } = fields;
  // An explicitly passed seq is checked above and then re-derived here; leaving it
  // in the payload would write a second, contradictory seq into the event body.
  delete payload.seq;
  const event = makeEvent({ seq: expectedSeq, ts, type, agent, task, payload, prev });
  return { event, shard: [...events, event] };
}

/**
 * One JSONL line for an event: canonical, so the bytes on disk are the bytes that
 * were hashed. The newline is the caller's to add.
 *
 * @param {Record<string, unknown>} event
 * @returns {string}
 */
export function serializeEvent(event) {
  return canonicalize(event);
}

// --- parsing and chain verification ----------------------------------------

/**
 * Parse one shard file's text into events.
 *
 * Blank lines and lines starting with `#` are ignored: comments let a shard be
 * self-documenting without a sidecar file, and they do not consume `seq`, so a
 * commented shard verifies exactly like an uncommented one. Any other unparseable
 * line is returned as a synthetic malformed event rather than thrown, so one
 * corrupt line cannot hide the rest of the fleet's state.
 *
 * @param {string} text
 * @param {string} agent
 * @returns {Record<string, unknown>[]}
 */
export function parseShard(text, agent) {
  const events = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      events.push({
        __parseError: true,
        seq: events.length + 1,
        agent,
        task: "?",
        message: trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed,
      });
    }
  }
  return events;
}

/**
 * Verify one shard's hash chain and per-agent sequence.
 *
 * Checks, per event in file order: structural validity, `seq` continuity from 1,
 * `prev` linkage to the previous event's `hash`, and `hash` recomputation. After a
 * break the expectations resynchronise to the offending event rather than reporting
 * one problem per downstream event — a single dropped line must read as a single
 * defect, not as a cascade that trains people to skim the output.
 *
 * @param {Record<string, unknown>[]} events
 * @param {string|null} [agent] shard owner, when known
 * @returns {Problem[]}
 */
export function verifyChain(events, agent = null) {
  const problems = [];
  let expectedSeq = 1;
  let expectedPrev = GENESIS_HASH;

  for (const [index, event] of (events ?? []).entries()) {
    const where = agent ?? "?";
    if (/** @type {{__parseError?: boolean}} */ (event).__parseError === true) {
      problems.push(
        problem(
          "MALFORMED_EVENT",
          `shard ${where} line ${index + 1} is not valid JSON: ${String(event.message)}`,
          {
            agent: where,
          },
        ),
      );
      continue;
    }

    const structural = validateEvent(event, agent);
    if (structural.length > 0) {
      problems.push(...structural);
      if (typeof event?.hash === "string" && SHA256_HEX.test(event.hash)) expectedPrev = event.hash;
      if (Number.isInteger(event?.seq)) expectedSeq = /** @type {number} */ (event.seq) + 1;
      continue;
    }

    const typed = /** @type {Record<string, unknown>} */ (event);
    const task = typeof typed.task === "string" ? typed.task : null;

    if (typed.seq !== expectedSeq) {
      problems.push(
        problem(
          "SEQ_GAP",
          `shard ${where} expects seq ${expectedSeq} but event ${index + 1} has seq ${String(typed.seq)} — an event was dropped, duplicated or reordered`,
          {
            agent: where,
            task,
          },
        ),
      );
    }
    if (typed.prev !== expectedPrev) {
      problems.push(
        problem(
          "CHAIN_BROKEN",
          `shard ${where}#${String(typed.seq)} has prev ${String(typed.prev).slice(0, 12)}… but the previous event hashes to ${expectedPrev.slice(0, 12)}… — the log was rewritten`,
          {
            agent: where,
            task,
          },
        ),
      );
    }
    const recomputed = hashEvent(typed);
    if (typed.hash !== recomputed) {
      problems.push(
        problem(
          "BAD_HASH",
          `shard ${where}#${String(typed.seq)} does not match its own contents (hash ${String(typed.hash).slice(0, 12)}…, recomputed ${recomputed.slice(0, 12)}…) — the event was edited after it was written`,
          {
            agent: where,
            task,
          },
        ),
      );
    }
    expectedPrev = String(typed.hash);
    expectedSeq = /** @type {number} */ (typed.seq) + 1;
  }

  return problems;
}

// --- replay and fold --------------------------------------------------------

/**
 * Flatten shards into one deterministic total order.
 *
 * The order is (agent id ascending, then `seq` ascending). It is deterministic
 * because git gives us a directory listing, not a merge history: there is no
 * cross-shard clock to order by, and `ts` from two agents' clocks is not a total
 * order either. So the log does NOT try to interleave shards by time. Every
 * lifecycle event for a task therefore lives in its owner's shard, where `seq`
 * already gives the right order, and the cross-shard phase (conflicts, cycles)
 * only ever compares whole claims.
 *
 * @param {Record<string, Record<string, unknown>[]>} shards
 * @returns {Record<string, unknown>[]}
 */
export function replay(shards) {
  return Object.keys(shards ?? {})
    .sort()
    .flatMap((agent) =>
      [...(shards[agent] ?? [])].sort((a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0)),
    );
}

/**
 * Do two claim events carry the same intent? Used for the Idempotent Receiver
 * rule: an agent that retried its `claim` after a crash-before-commit, and got a
 * second copy in, must not be told it double-claimed.
 *
 * `seq`, `ts`, `prev` and `hash` are excluded on purpose — a retry is a new event
 * at a new seq with a new timestamp that says the same thing.
 *
 * @param {{task: string, scopes: string[], ttlMs: number, dependsOn: string[]}} a
 * @param {Record<string, unknown>} b
 * @returns {boolean}
 */
function sameClaim(a, b) {
  const sorted = (value) => JSON.stringify([.../** @type {string[]} */ (value ?? [])].sort());
  return (
    a.task === b.task &&
    sorted(a.scopes) === sorted(b.scopes) &&
    a.ttlMs === b.ttlMs &&
    sorted(a.dependsOn) === sorted(b.dependsOn)
  );
}

/**
 * @typedef {object} Claim
 * @property {string} task
 * @property {string} agent
 * @property {string[]} scopes
 * @property {number} ttlMs
 * @property {string[]} dependsOn
 * @property {string} claimedTs
 * @property {string} lastTs last lifecycle event (claim or heartbeat) for this task
 * @property {number} expiresAt epoch ms at which the lease lapses
 * @property {number} ttlRemainingMs negative once lapsed
 * @property {"active"|"expired"|"released"} status
 * @property {{outcome: string, notes: string|null, ts: string}|null} release
 */

/**
 * Fold the shards into state. No clock reads, no filesystem: `now` is a parameter
 * so the lease tests are deterministic instead of racing the wall clock.
 *
 * @param {Record<string, Record<string, unknown>[]>} shards
 * @param {string|number|Date} [now]
 * @returns {object} base state (no cross-claim problems yet) — pass to `validateState`
 */
export function foldState(shards, now = Date.now()) {
  const nowMs = toEpochMs(now);
  /** @type {Problem[]} */
  const chainProblems = [];
  /**
   * Claims are keyed `agent::task`, not by task alone. Two agents may hold the
   * same task id at DIFFERENT times — that is a handoff, and it is how work moves
   * between agents — so keying by task alone would make the second claim look like
   * a revision of the first. The per-shard fold below also needs a task map of its
   * own for the same reason: a lifecycle event may only ever refer to a task in
   * the shard it appears in.
   *
   * @type {Map<string, Claim>}
   */
  const claims = new Map();
  /** @type {Array<Record<string, unknown>>} */
  const proposals = [];
  /** @type {Array<Record<string, unknown>>} */
  const notes = [];
  /** @type {Map<string, Record<string, unknown>>} */
  const proposalsByRow = new Map();
  let eventCount = 0;

  for (const agent of Object.keys(shards ?? {}).sort()) {
    const events = replay({ [agent]: shards[agent] ?? [] });
    chainProblems.push(...verifyChain(events, agent));
    eventCount += events.length;

    /** @type {Map<string, Claim>} */
    const tasks = new Map();

    for (const event of events) {
      const e = /** @type {Record<string, unknown>} */ (event);
      if (validateEvent(e, agent).length > 0) continue;
      const task = String(e.task);
      const ts = String(e.ts);

      if (e.type === "claim") {
        const existing = tasks.get(task);
        if (existing === undefined) {
          tasks.set(task, {
            task,
            agent,
            scopes: [.../** @type {string[]} */ (e.scopes ?? [])],
            ttlMs: /** @type {number} */ (e.ttlMs),
            dependsOn: [.../** @type {string[]} */ (e.dependsOn ?? [])],
            claimedTs: ts,
            lastTs: ts,
            expiresAt: toEpochMs(ts) + /** @type {number} */ (e.ttlMs),
            ttlRemainingMs: 0,
            status: "active",
            release: null,
          });
          continue;
        }
        // Idempotent Receiver: the same claim twice is one claim.
        if (
          !sameClaim(
            /** @type {{task: string, scopes: string[], ttlMs: number, dependsOn: string[]}} */ (
              existing
            ),
            e,
          )
        ) {
          chainProblems.push(
            problem(
              "CLAIM_REVISION",
              `shard ${agent} claims ${task} twice with different content (first ${JSON.stringify(existing.scopes)}, then ${JSON.stringify(e.scopes)}). Re-claim only after a release — a claim in force cannot be silently rewritten`,
              { agent, task },
            ),
          );
        }
        continue;
      }

      const claim = tasks.get(task);

      if (e.type === "heartbeat") {
        if (claim === undefined) {
          chainProblems.push(
            problem(
              "HEARTBEAT_UNKNOWN_TASK",
              `shard ${agent} heartbeats ${task}, which it never claimed`,
              {
                agent,
                task,
              },
            ),
          );
          continue;
        }
        if (claim.release !== null) {
          chainProblems.push(
            problem(
              "HEARTBEAT_AFTER_RELEASE",
              `shard ${agent} heartbeats ${task} after releasing it`,
              {
                agent,
                task,
              },
            ),
          );
          continue;
        }
        claim.lastTs = ts;
        claim.expiresAt = toEpochMs(ts) + claim.ttlMs;
        continue;
      }

      if (e.type === "release") {
        if (claim === undefined) {
          chainProblems.push(
            problem(
              "RELEASE_UNKNOWN_TASK",
              `shard ${agent} releases ${task}, which was never claimed in that shard — a release of an unknown task is an idempotency violation, not a no-op`,
              { agent, task },
            ),
          );
          continue;
        }
        const outcome = String(e.outcome);
        const notesText = typeof e.notes === "string" ? e.notes : null;
        if (claim.release !== null) {
          // Idempotent Receiver: a retried release of the same outcome is fine.
          if (claim.release.outcome !== outcome) {
            chainProblems.push(
              problem(
                "RELEASE_CONFLICT",
                `shard ${agent} released ${task} as "${claim.release.outcome}" and then as "${outcome}". A task is released once; re-claim it instead`,
                { agent, task },
              ),
            );
          }
          continue;
        }
        claim.release = { outcome, notes: notesText, ts };
        claim.status = "released";
        continue;
      }

      if (e.type === "ledger_proposal") {
        const proposal = {
          agent,
          task,
          row: String(e.row),
          fromStatus: String(e.fromStatus),
          toStatus: String(e.toStatus),
          evidence: String(e.evidence),
          pr: String(e.pr),
          ts,
        };
        const key = `${agent}::${proposal.row}`;
        const previous = proposalsByRow.get(key);
        if (previous !== undefined) {
          const same =
            previous.fromStatus === proposal.fromStatus &&
            previous.toStatus === proposal.toStatus &&
            previous.evidence === proposal.evidence &&
            previous.pr === proposal.pr;
          if (!same) {
            chainProblems.push(
              problem(
                "PROPOSAL_CONFLICT",
                `shard ${agent} proposes two different transitions for ledger row ${proposal.row}. One agent, one proposal per row`,
                { agent, task },
              ),
            );
          }
          continue;
        }
        proposalsByRow.set(key, proposal);
        proposals.push(proposal);
        continue;
      }

      notes.push({ agent, task, text: String(e.text), ts });
    }

    // The shard's tasks are now fully folded; publish them under agent::task.
    for (const [task, claim] of tasks) claims.set(`${agent}::${task}`, claim);
  }

  for (const claim of claims.values()) {
    if (claim.release !== null) continue;
    claim.ttlRemainingMs = claim.expiresAt - nowMs;
    claim.status = nowMs < claim.expiresAt ? "active" : "expired";
  }

  const all = [...claims.values()];
  return {
    now: nowMs,
    eventCount,
    agents: Object.keys(shards ?? {}).sort(),
    claims,
    active: all
      .filter((claim) => claim.status === "active")
      .sort((a, b) => a.task.localeCompare(b.task)),
    expired: all
      .filter((claim) => claim.status === "expired")
      .sort((a, b) => a.task.localeCompare(b.task)),
    released: all
      .filter((claim) => claim.status === "released")
      .sort((a, b) => a.task.localeCompare(b.task)),
    proposals,
    notes,
    problems: chainProblems,
  };
}

/**
 * Find a dependency cycle among the given claims.
 *
 * Only edges between CLAIMS IN THE INPUT count. A claim that depends on a task
 * nobody has claimed is waiting on work, not deadlocked — treating a dependency on
 * an unclaimed task as a cycle would report every healthy queue as a deadlock.
 *
 * Iterative DFS with three-colour marking, iterating tasks in sorted order so the
 * reported cycle is reproducible rather than dependent on Map insertion order.
 *
 * @param {Array<{task: string, dependsOn: string[]}>} claims
 * @returns {string[]|null} the cycle as `[a, b, ..., a]`, first id repeated, or null
 */
export function findDependencyCycle(claims) {
  const tasks = [...new Set(claims.map((claim) => claim.task))].sort();
  const dependencies = new Map(
    claims.map((claim) => [
      claim.task,
      [...new Set(claim.dependsOn ?? [])].filter((dep) => tasks.includes(dep)),
    ]),
  );

  /** @type {Map<string, 0|1|2>} 0 unvisited, 1 on the current path, 2 done */
  const colour = new Map(tasks.map((task) => [task, /** @type {0|1|2} */ (0)]));

  for (const root of tasks) {
    if (colour.get(root) !== 0) continue;
    /** @type {Array<{task: string, deps: string[], index: number}>} */
    const path = [{ task: root, deps: dependencies.get(root) ?? [], index: 0 }];
    colour.set(root, 1);
    while (path.length > 0) {
      const frame = path[path.length - 1];
      if (frame.index >= frame.deps.length) {
        colour.set(frame.task, 2);
        path.pop();
        continue;
      }
      const next = frame.deps[frame.index];
      frame.index += 1;
      const state = colour.get(next) ?? 0;
      if (state === 1) {
        const start = path.findIndex((entry) => entry.task === next);
        return [...path.slice(start).map((entry) => entry.task), next];
      }
      if (state === 2) continue;
      colour.set(next, 1);
      path.push({ task: next, deps: dependencies.get(next) ?? [], index: 0 });
    }
  }
  return null;
}

/**
 * Cross-claim checks. Everything here compares whole claims with each other, which
 * is why it can run after the per-shard fold without needing a global event order.
 *
 * @param {ReturnType<typeof foldState>} state
 * @returns {Problem[]} typed problems; errors are what fail the gate
 */
export function validateState(state) {
  /** @type {Problem[]} */
  const problems = [];
  const active = state?.active ?? [];

  // 1. Same task, two live agents. Either one will merge work the other has not
  //    seen, or they will each rebase onto a main that assumed the other's claim.
  /** @type {Map<string, typeof active>} */
  const byTask = new Map();
  for (const claim of active) {
    const existing = byTask.get(claim.task);
    if (existing === undefined) {
      byTask.set(claim.task, [claim]);
      continue;
    }
    existing.push(claim);
    problems.push(
      problem(
        "DUPLICATE_TASK",
        `${claim.task} is claimed by both ${existing[0].agent} and ${claim.agent}. One task, one owner — release one of them`,
        { agent: claim.agent, task: claim.task },
      ),
    );
  }

  // 2. Scope conflict: the overwrite bug. Only ACTIVE claims conflict — a lease
  //    that has lapsed or been released owns nothing, which is the entire point of
  //    having one.
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const left = active[i];
      const right = active[j];
      if (left.task === right.task) continue;
      const overlap = findScopeOverlap(left.scopes, right.scopes);
      if (overlap === null) continue;
      const sameAgent = left.agent === right.agent;
      problems.push(
        problem(
          sameAgent ? "SCOPE_OVERLAP_SAME_AGENT" : "SCOPE_CONFLICT",
          sameAgent
            ? `${left.task} and ${right.task} (both ${left.agent}) both claim "${overlap.patternA}" and "${overlap.patternB}", which share ${overlap.witness}`
            : `${left.task} (${left.agent}) and ${right.task} (${right.agent}) both claim "${overlap.patternA}" and "${overlap.patternB}", which share ${overlap.witness}`,
          { agent: right.agent, task: right.task },
        ),
      );
    }
  }

  // 3. Dependency cycle: the deadlock.
  const cycle = findDependencyCycle(active);
  if (cycle !== null) {
    const owners = cycle.map((task) => `${task} (${byTask.get(task)?.[0]?.agent ?? "?"})`);
    problems.push(
      problem(
        "DEPENDENCY_CYCLE",
        `active claims form a dependency cycle: ${owners.join(" → ")}. Nobody can start. Break it by releasing one with outcome "partial" and narrowing its scope`,
        { agent: byTask.get(cycle[0])?.[0]?.agent ?? "?", task: cycle[0] },
      ),
    );
  }

  // 4. A dependency on a task nobody has ever claimed is almost always a typo in
  //    a requirement id, and a typo here is an invisible hang: the claim waits for
  //    a task that will never exist. Warning, not error — depending on planned work
  //    is legitimate, and a gate that cries wolf gets switched off.
  const claimed = new Set([...(state?.claims?.values() ?? [])].map((claim) => claim.task));
  for (const claim of active) {
    for (const dependency of claim.dependsOn) {
      if (claimed.has(dependency)) continue;
      problems.push(
        problem(
          "DEPENDENCY_PLANNED",
          `${claim.task} (${claim.agent}) depends on ${dependency}, which no shard has claimed. If that is planned work, ignore this; if it is not, it is a typo that will hang silently`,
          { agent: claim.agent, task: claim.task },
        ),
      );
    }
  }

  return problems;
}

/**
 * The whole derivation: verify every shard, fold it, then cross-check.
 *
 * @param {Record<string, Record<string, unknown>[]>} shards
 * @param {string|number|Date} [now]
 * @returns {ReturnType<typeof foldState> & {problems: Problem[], errors: Problem[], warnings: Problem[]}}
 */
export function deriveState(shards, now = Date.now()) {
  const state = foldState(shards, now);
  const problems = [...state.problems, ...validateState(state)];
  return {
    ...state,
    problems,
    errors: problems.filter((entry) => entry.severity === "error"),
    warnings: problems.filter((entry) => entry.severity === "warning"),
  };
}
