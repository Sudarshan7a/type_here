import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EVENT_TYPES,
  GENESIS_HASH,
  PROBLEM_CODES,
  RELEASE_OUTCOMES,
  agentFromShardFile,
  appendEvent,
  canonicalize,
  deriveState,
  findDependencyCycle,
  findScopeOverlap,
  foldState,
  hashEvent,
  makeEvent,
  parseShard,
  replay,
  scopeMatches,
  scopeSetsOverlap,
  serializeEvent,
  shardFileName,
  toEpochMs,
  validateEvent,
  validateState,
  verifyChain,
} from "./coordination.mjs";
import { parseArgs, readShards, run } from "./check-coordination.mjs";
import { appendOne, buildPayload, parseLogArgs, resolveAgent } from "../docs/coordination/log.mjs";

/**
 * Tests for the coordination core. As with check-policies.test.mjs, the majority
 * assert the FAILING direction: overlapping scopes, a dependency cycle, a lapsed
 * lease, a rewritten log, a retried event. A coordination gate that has only ever
 * reported green is indistinguishable from no gate at all, and the failure it is
 * supposed to prevent — two agents silently overwriting the same file — is exactly
 * the failure that would not show up in a passing test run.
 *
 * The fixtures are built with the module's own `appendEvent`, which is the point:
 * the append primitive is exercised by every test, and no fixture has to be
 * hand-written with correct hashes.
 */

const T0 = "2026-01-15T09:00:00.000Z";
const T1 = "2026-01-15T09:05:00.000Z";
const T2 = "2026-01-15T09:10:00.000Z";
const HOUR = 3_600_000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Append a list of `{ts, type, task, ...payload}` specs to one agent's shard.
 *
 * @param {string} agent
 * @param {Array<Record<string, unknown>>} specs
 * @returns {Record<string, unknown>[]}
 */
function buildShard(agent, specs) {
  return specs.reduce((shard, spec) => appendEvent(shard, { agent, ts: T0, ...spec }).shard, []);
}

/** @param {Array<{code: string}>} problems */
const codes = (problems) => problems.map((entry) => entry.code);

/** @param {Array<{code: string}>} problems */
const codeSet = (problems) => new Set(codes(problems));

/** @param {{problems: Array<{code: string}>}} state */
const stateCodes = (state) => codeSet(state.problems);

/** @param {{problems: Array<{code: string}>}} state */
const errorCodes = (state) =>
  [...stateCodes(state)].filter((code) => PROBLEM_CODES[code] === "error");

// --- canonical form ---------------------------------------------------------

describe("canonical form — the hash input must be reproducible by a third party", () => {
  it("sorts keys, keeps array order, emits no whitespace", () => {
    assert.equal(canonicalize({ b: 1, a: [3, { d: 2, c: 1 }] }), '{"a":[3,{"c":1,"d":2}],"b":1}');
    // Order is data in an array: reversing it must change the bytes.
    assert.notEqual(canonicalize([1, 2]), canonicalize([2, 1]));
  });

  it("drops keys whose value is undefined, so an absent field hashes like a missing one", () => {
    assert.equal(canonicalize({ a: 1, b: undefined }), canonicalize({ a: 1 }));
  });

  it("refuses anything JSON cannot round-trip losslessly", () => {
    assert.throws(() => canonicalize({ a: Number.NaN }), TypeError);
    assert.throws(() => canonicalize({ a: Number.POSITIVE_INFINITY }), TypeError);
    assert.throws(() => canonicalize({ a: () => 1 }), TypeError);
  });

  it("hashes the event without its own hash field, even when a stale one is present", () => {
    const event = makeEvent({
      seq: 1,
      ts: T0,
      type: "note",
      agent: "a1",
      task: "T",
      prev: GENESIS_HASH,
      payload: { text: "hi" },
    });
    assert.equal(hashEvent(event), hashEvent({ ...event, hash: "0".repeat(64) }));
    assert.notEqual(hashEvent(event), hashEvent({ ...event, task: "OTHER" }));
    assert.notEqual(hashEvent(event), hashEvent({ ...event, text: "bye" }));
    assert.match(hashEvent(event), /^[0-9a-f]{64}$/);
  });
});

// --- append and chain -------------------------------------------------------

describe("append + verifyChain — a shard that was tampered with must not verify", () => {
  const agent = "a1";
  const shard = () =>
    buildShard(agent, [
      { type: "claim", task: "ENG-01", scopes: ["packages/engine/**"], ttlMs: HOUR, dependsOn: [] },
      { ts: T1, type: "heartbeat", task: "ENG-01" },
      { ts: T2, type: "release", task: "ENG-01", outcome: "done" },
    ]);

  it("CONTROL: an untampered shard verifies with zero problems", () => {
    const events = shard();
    assert.deepEqual(verifyChain(events, agent), []);
    assert.equal(events[0].seq, 1);
    assert.equal(events[0].prev, GENESIS_HASH);
    assert.equal(events[1].prev, events[0].hash);
    assert.equal(events[2].seq, 3);
  });

  it("a seq gap is detected when an event is deleted from the middle", () => {
    const events = shard();
    const truncated = [events[0], events[2]];
    assert.ok(codeSet(verifyChain(truncated, agent)).has("SEQ_GAP"));
  });

  it("a rewritten payload is detected even when the hash is recomputed, because the next link breaks", () => {
    const events = shard();
    const tampered = events.map((event) =>
      event.seq === 2
        ? { ...event, scopes: ["apps/web/**"] } // someone widened a claim in place
        : event,
    );
    // Honest edit: hash does not match its own contents.
    assert.ok(codeSet(verifyChain(tampered, agent)).has("BAD_HASH"));
    // Sophisticated edit: recompute the hash of the tampered event, so only the
    // linkage of the FOLLOWING event exposes it. This is the whole reason `prev`
    // exists — a hash chain is not a set of independent checksums.
    const forged = tampered.map((event, index) =>
      index === 1 ? { ...event, hash: hashEvent({ ...event, hash: undefined }) } : event,
    );
    const found = codeSet(verifyChain(forged, agent));
    assert.ok(found.has("CHAIN_BROKEN"), `expected CHAIN_BROKEN, got ${[...found].join(",")}`);
    assert.ok(!found.has("BAD_HASH"));
  });

  it("reordering two events is detected", () => {
    const events = shard();
    const swapped = [events[0], events[2], events[1]];
    assert.ok(codeSet(verifyChain(swapped, agent)).has("SEQ_GAP"));
  });

  it("a foreign agent's event inside someone else's shard is rejected", () => {
    const events = shard();
    const foreign = makeEvent({
      seq: 4,
      ts: T2,
      type: "note",
      agent: "intruder",
      task: "ENG-01",
      prev: events[2].hash,
      payload: { text: "x" },
    });
    const found = codeSet(verifyChain([...events, foreign], agent));
    assert.ok(found.has("FOREIGN_EVENT"));
  });

  it("malformed events are rejected on their own terms, before any chain reasoning", () => {
    const bad = [
      {
        seq: 0,
        ts: T0,
        type: "claim",
        agent: "a1",
        task: "T",
        scopes: [],
        ttlMs: 1,
        dependsOn: [],
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
      },
      {
        seq: 1,
        ts: "not-a-date",
        type: "note",
        agent: "a1",
        task: "T",
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
        text: "x",
      },
      {
        seq: 1,
        ts: T0,
        type: "claim",
        agent: "a1",
        task: "T",
        scopes: [],
        ttlMs: -5,
        dependsOn: [],
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
      },
      {
        seq: 1,
        ts: T0,
        type: "release",
        agent: "a1",
        task: "T",
        outcome: "finished",
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
      },
      {
        seq: 1,
        ts: T0,
        type: "teleport",
        agent: "a1",
        task: "T",
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
      },
      {
        seq: 1,
        ts: T0,
        type: "note",
        agent: "../escape",
        task: "T",
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
        text: "x",
      },
      {
        seq: 1,
        ts: T0,
        type: "ledger_proposal",
        agent: "a1",
        task: "T",
        prev: GENESIS_HASH,
        hash: GENESIS_HASH,
        row: "ENG-01",
      },
    ];
    for (const event of bad) {
      assert.equal(
        validateEvent(event, null).length,
        1,
        `expected a malformed verdict for ${JSON.stringify(event)}`,
      );
      assert.equal(validateEvent(event, null)[0].code, "MALFORMED_EVENT");
    }
    assert.equal(EVENT_TYPES.length, 5);
    assert.deepEqual([...RELEASE_OUTCOMES], ["done", "partial", "abandoned"]);
  });

  it("appendEvent refuses a seq that would fork the chain", () => {
    const events = shard();
    assert.throws(
      () =>
        appendEvent(events, {
          agent,
          ts: T0,
          type: "note",
          task: "T",
          seq: 9,
          payload: { text: "x" },
        }),
      RangeError,
    );
  });
});

describe("parseShard — comments are free, corruption is not", () => {
  const agent = "a1";
  const events = () =>
    buildShard(agent, [
      {
        ts: T0,
        type: "claim",
        task: "ENG-01",
        scopes: ["packages/engine/**"],
        ttlMs: HOUR,
        dependsOn: [],
      },
      { ts: T1, type: "heartbeat", task: "ENG-01" },
      { ts: T2, type: "release", task: "ENG-01", outcome: "done" },
    ]);

  it("CONTROL: comments and blank lines are ignored and do not consume seq", () => {
    const shard = events();
    const text = `# shard for ${agent}\n\n${serializeEvent(shard[0])}\n\n# a note\n${serializeEvent(shard[1])}\n${serializeEvent(shard[2])}\n`;
    assert.deepEqual(verifyChain(parseShard(text, agent), agent), []);
  });

  it("an unparseable line is one precise problem, and the rest of the shard still reads", () => {
    const shard = events();
    const text = `${serializeEvent(shard[0])}\n{"seq":2,"oops"\n${serializeEvent(shard[2])}\n`;
    const parsed = parseShard(text, agent);
    assert.equal(parsed.length, 3);
    assert.ok(codeSet(verifyChain(parsed, agent)).has("MALFORMED_EVENT"));
  });
});

// --- scope matching ---------------------------------------------------------

describe("scopeSetsOverlap — the rule the overwrite check is built on", () => {
  it("CONTROL: disjoint trees do not overlap", () => {
    assert.equal(scopeSetsOverlap(["packages/engine/**"], ["apps/web/**"]), false);
    assert.equal(scopeSetsOverlap(["docs/FEATURE-LEDGER.md"], ["BUILD-LOG.md"]), false);
    assert.equal(
      scopeSetsOverlap(["packages/engine/**", "scripts/**"], ["apps/api/**", "e2e/**"]),
      false,
    );
  });

  it("a directory tree overlaps an exact file inside it", () => {
    assert.equal(
      scopeSetsOverlap(["packages/engine/**"], ["packages/engine/src/metrics.ts"]),
      true,
    );
    // `dir/**` covers the directory itself as well as everything under it.
    assert.equal(scopeMatches("packages/engine/**", "packages/engine"), true);
    assert.equal(scopeMatches("packages/engine/**", "packages/engineFoo"), false);
  });

  it("an exact file overlaps a tree that contains it", () => {
    assert.equal(scopeSetsOverlap(["docs/FEATURE-LEDGER.md"], ["docs/**"]), true);
    assert.equal(scopeSetsOverlap(["docs/FEATURE-LEDGER.md"], ["docs/FEATURE-LEDGER.md"]), true);
  });

  it("a single segment wildcard never crosses a slash", () => {
    assert.equal(scopeSetsOverlap(["scripts/*.mjs"], ["scripts/check-ledger.mjs"]), true);
    assert.equal(scopeSetsOverlap(["scripts/*.mjs"], ["scripts/nested/check-ledger.mjs"]), false);
  });

  it("globs meet where a segment is shared, even when neither names it literally", () => {
    // `packages/*/tests` x `packages/engine/**` share packages/engine/tests.
    const overlap = findScopeOverlap(["packages/*/tests"], ["packages/engine/**"]);
    assert.ok(overlap !== null);
    assert.equal(overlap.witness, "packages/engine/tests");
  });

  it("a whole-segment wildcard matches zero or more segments", () => {
    assert.equal(scopeMatches("packages/**/tests", "packages/tests"), true);
    assert.equal(scopeMatches("packages/**/tests", "packages/engine/tests"), true);
    assert.equal(scopeMatches("packages/**/tests", "packages/a/b/c/tests"), true);
    assert.equal(scopeMatches("packages/**/tests", "packages/a/tests/x"), false);
    assert.equal(scopeMatches("packages/**/checks", "packages/tests"), false);
    // A bare `**` is the whole repository, which is what a repo-wide sweep means.
    assert.equal(scopeMatches("**", "package.json"), true);
    assert.equal(scopeMatches("**", "apps/web/src/App.tsx"), true);
  });

  it("reports which two patterns collided and on which file", () => {
    const overlap = findScopeOverlap(["apps/web/src/**"], ["apps/web/src/pages/Home.tsx"]);
    assert.deepEqual(overlap, {
      witness: "apps/web/src/pages/Home.tsx",
      patternA: "apps/web/src/**",
      patternB: "apps/web/src/pages/Home.tsx",
    });
  });
});

// --- leases and expiry ------------------------------------------------------

describe("leases — a dead agent must not hold a scope forever", () => {
  const claim = (agent, task, scopes, ttlMs = HOUR) => ({
    shards: {
      [agent]: buildShard(agent, [{ ts: T0, type: "claim", task, scopes, ttlMs, dependsOn: [] }]),
    },
  });

  it("CONTROL: a fresh claim is active and its scopes are held", () => {
    const state = deriveState(claim("a1", "ENG-01", ["packages/engine/**"]).shards, T1);
    assert.equal(state.active.length, 1);
    assert.equal(state.active[0].status, "active");
    assert.equal(state.active[0].expiresAt, toEpochMs(T0) + HOUR);
    assert.equal(state.active[0].ttlRemainingMs, toEpochMs(T0) + HOUR - toEpochMs(T1));
    assert.deepEqual(state.problems, []);
  });

  it("an expired lease frees the scope: the other agent may take it", () => {
    const shards = {
      ...claim("a1", "ENG-01", ["packages/engine/**"]).shards,
      a2: buildShard("a2", [
        {
          ts: T1,
          type: "claim",
          task: "ENG-02",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
    };
    // While the lease holds, this is the overwrite bug.
    const contended = deriveState(shards, T1);
    assert.ok(stateCodes(contended).has("SCOPE_CONFLICT"));
    // One hour after the claim, with no heartbeat, agent a1 is presumed dead and
    // owns nothing. Nobody had to unlock anything.
    const lapsed = deriveState(shards, toEpochMs(T0) + HOUR + 1);
    assert.equal(lapsed.active.length, 1);
    assert.equal(lapsed.active[0].agent, "a2");
    assert.equal(lapsed.expired[0].agent, "a1");
    assert.ok(lapsed.expired[0].ttlRemainingMs < 0);
    assert.deepEqual(errorCodes(lapsed), []);
  });

  it("a heartbeat extends the lease, so a working agent is never displaced", () => {
    const agent = "a1";
    const shards = {
      [agent]: buildShard(agent, [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
        { ts: T2, type: "heartbeat", task: "ENG-01" },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-02",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
    };
    const afterExpiryOfOriginal = deriveState(shards, toEpochMs(T0) + HOUR + 1);
    assert.equal(afterExpiryOfOriginal.active.length, 1);
    assert.equal(afterExpiryOfOriginal.active[0].agent, "a1");
    assert.deepEqual(errorCodes(afterExpiryOfOriginal), []);
  });

  it("all three release outcomes free the scopes, including partial and abandoned", () => {
    for (const outcome of RELEASE_OUTCOMES) {
      const agent = "a1";
      const shards = {
        [agent]: buildShard(agent, [
          {
            ts: T0,
            type: "claim",
            task: "ENG-01",
            scopes: ["docs/FEATURE-LEDGER.md"],
            ttlMs: HOUR,
            dependsOn: [],
          },
          { ts: T1, type: "release", task: "ENG-01", outcome },
        ]),
        a2: buildShard("a2", [
          {
            ts: T0,
            type: "claim",
            task: "ENG-02",
            scopes: ["docs/**"],
            ttlMs: HOUR,
            dependsOn: [],
          },
        ]),
      };
      const state = deriveState(shards, T1);
      assert.equal(state.released[0].release?.outcome, outcome);
      assert.equal(state.active.length, 1, `${outcome} should have freed the scope`);
      assert.ok(!stateCodes(state).has("SCOPE_CONFLICT"), `${outcome} must free the scope`);
    }
  });
});

// --- deadlock ---------------------------------------------------------------

describe("findDependencyCycle — report the loop, not the word 'cycle'", () => {
  it("CONTROL: a linear chain is not a deadlock", () => {
    assert.equal(
      findDependencyCycle([
        { task: "A", dependsOn: [] },
        { task: "B", dependsOn: ["A"] },
        { task: "C", dependsOn: ["B"] },
      ]),
      null,
    );
  });

  it("a dependency on a task nobody claimed is waiting, not deadlocked", () => {
    assert.equal(findDependencyCycle([{ task: "A", dependsOn: ["NOT-CLAIMED"] }]), null);
  });

  it("a two-node cycle reports the actual path, closed", () => {
    assert.deepEqual(
      findDependencyCycle([
        { task: "A", dependsOn: ["B"] },
        { task: "B", dependsOn: ["A"] },
      ]),
      ["A", "B", "A"],
    );
  });

  it("a three-node cycle reports the whole loop, not the first repeated node", () => {
    assert.deepEqual(
      findDependencyCycle([
        { task: "A", dependsOn: ["C"] },
        { task: "B", dependsOn: ["A"] },
        { task: "C", dependsOn: ["B"] },
      ]),
      ["A", "C", "B", "A"],
    );
  });

  it("a self-dependency is a cycle of length one", () => {
    assert.deepEqual(findDependencyCycle([{ task: "A", dependsOn: ["A"] }]), ["A", "A"]);
  });

  it("a dangling edge between two non-cycle tasks is not reported as a cycle", () => {
    assert.equal(
      findDependencyCycle([
        { task: "A", dependsOn: [] },
        { task: "B", dependsOn: ["A", "Z"] },
      ]),
      null,
    );
  });

  it("the gate fails a live cycle and names every agent in it", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-02"],
        },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-02",
          scopes: ["apps/web/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-01"],
        },
      ]),
    };
    const state = deriveState(shards, T1);
    const cycle = state.problems.find((entry) => entry.code === "DEPENDENCY_CYCLE");
    assert.ok(cycle !== undefined, "expected a dependency cycle");
    assert.match(cycle.message, /ENG-01 \(a1\) → ENG-02 \(a2\) → ENG-01/);
    assert.equal(cycle.severity, "error");
  });

  it("the cycle disappears when one side gives up, because partial releases the scope", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-02"],
        },
        {
          ts: T1,
          type: "release",
          task: "ENG-01",
          outcome: "partial",
          notes: "blocked on ENG-02, handing back the scope",
        },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-02",
          scopes: ["apps/web/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
    };
    const state = deriveState(shards, T1);
    assert.ok(!stateCodes(state).has("DEPENDENCY_CYCLE"));
    assert.equal(state.active.length, 1);
  });

  it("a dependency on planned work warns without blocking the merge", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-99"],
        },
      ]),
    };
    const state = deriveState(shards, T1);
    assert.ok(stateCodes(state).has("DEPENDENCY_PLANNED"));
    assert.deepEqual(state.errors, []);
    assert.equal(state.warnings.length, 1);
  });
});

// --- duplicate ownership, idempotency, and the single-writer rule ------------

describe("ownership", () => {
  it("one task claimed by two live agents is a duplicate", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["apps/web/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
    };
    const state = deriveState(shards, T1);
    const duplicate = state.problems.find((entry) => entry.code === "DUPLICATE_TASK");
    assert.ok(duplicate !== undefined);
    assert.match(duplicate.message, /a1/);
    assert.match(duplicate.message, /a2/);
  });

  it("a task handed from one agent to another is a release then a claim, not a duplicate", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
        { ts: T1, type: "release", task: "ENG-01", outcome: "abandoned", notes: "handing to a2" },
      ]),
      a2: buildShard("a2", [
        {
          ts: T2,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
    };
    const state = deriveState(shards, toEpochMs(T2) + 1000);
    assert.deepEqual(state.problems, []);
    assert.equal(state.active.length, 1);
    assert.equal(state.active[0].agent, "a2");
    assert.equal(state.released.length, 1);
    assert.equal(state.released[0].agent, "a1");
  });

  it("CONTROL: two agents on disjoint scopes with a shared predecessor pass", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
        { ts: T1, type: "release", task: "ENG-01", outcome: "done" },
        {
          ts: T1,
          type: "claim",
          task: "ENG-07",
          scopes: ["packages/schemas/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-01"],
        },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-02",
          scopes: ["apps/web/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
        {
          ts: T1,
          type: "ledger_proposal",
          task: "ENG-02",
          row: "ENG-02",
          fromStatus: "NOT STARTED",
          toStatus: "IN PROGRESS",
          evidence: "ENG-02 metrics + tests green",
          pr: "#101",
        },
        { ts: T1, type: "note", task: "ENG-02", text: "careful: check-bundle-size.mjs is shared" },
      ]),
    };
    const state = deriveState(shards, T2);
    assert.deepEqual(state.problems, []);
    assert.equal(state.active.length, 2);
    assert.equal(state.released.length, 1);
    assert.equal(state.proposals.length, 1);
    assert.equal(state.notes.length, 1);
    // Replay is a deterministic total order: shards in agent order, events in seq
    // order. Two runs of the same input must agree, or the gate is not a function.
    assert.deepEqual(replay(shards), replay(shards));
    assert.deepEqual(
      replay(shards).map((event) => `${event.agent}#${event.seq}`),
      ["a1#1", "a1#2", "a1#3", "a2#1", "a2#2", "a2#3"],
    );
  });
});

describe("idempotency — a retried event must not look like a second one", () => {
  const agent = "a1";

  it("a claim retried with identical content is still one claim", () => {
    const claim = {
      ts: T0,
      type: "claim",
      task: "ENG-01",
      scopes: ["packages/engine/**"],
      ttlMs: HOUR,
      dependsOn: [],
    };
    const state = deriveState({ [agent]: buildShard(agent, [claim, { ...claim, ts: T1 }]) }, T1);
    assert.equal(state.claims.size, 1);
    assert.equal(state.active.length, 1);
    assert.deepEqual(state.problems, []);
  });

  it("a claim rewritten in place with different scopes is caught, because a lease cannot be widened silently", () => {
    const state = deriveState(
      {
        [agent]: buildShard(agent, [
          {
            ts: T0,
            type: "claim",
            task: "ENG-01",
            scopes: ["packages/engine/**"],
            ttlMs: HOUR,
            dependsOn: [],
          },
          {
            ts: T1,
            type: "claim",
            task: "ENG-01",
            scopes: ["packages/engine/**", "apps/web/**"],
            ttlMs: HOUR,
            dependsOn: [],
          },
        ]),
      },
      T1,
    );
    assert.ok(stateCodes(state).has("CLAIM_REVISION"));
  });

  it("a release retried with the same outcome is idempotent, and a contradicting one is not", () => {
    const release = { ts: T1, type: "release", task: "ENG-01", outcome: "done" };
    const same = deriveState(
      {
        [agent]: buildShard(agent, [
          { ts: T0, type: "claim", task: "ENG-01", scopes: ["a/**"], ttlMs: HOUR, dependsOn: [] },
          release,
          { ...release, ts: T2 },
        ]),
      },
      T2,
    );
    assert.deepEqual(same.problems, []);

    const contradicted = deriveState(
      {
        [agent]: buildShard(agent, [
          { ts: T0, type: "claim", task: "ENG-01", scopes: ["a/**"], ttlMs: HOUR, dependsOn: [] },
          release,
          { ...release, ts: T2, outcome: "abandoned" },
        ]),
      },
      T2,
    );
    assert.ok(stateCodes(contradicted).has("RELEASE_CONFLICT"));
  });

  it("releasing a task that was never claimed is an idempotency violation", () => {
    const state = deriveState(
      {
        [agent]: buildShard(agent, [{ ts: T0, type: "release", task: "ENG-77", outcome: "done" }]),
      },
      T0,
    );
    assert.ok(stateCodes(state).has("RELEASE_UNKNOWN_TASK"));
  });

  it("heartbeating a released task, or one never claimed, is caught", () => {
    const afterRelease = deriveState(
      {
        [agent]: buildShard(agent, [
          { ts: T0, type: "claim", task: "ENG-01", scopes: ["a/**"], ttlMs: HOUR, dependsOn: [] },
          { ts: T1, type: "release", task: "ENG-01", outcome: "done" },
          { ts: T2, type: "heartbeat", task: "ENG-01" },
        ]),
      },
      T2,
    );
    assert.ok(stateCodes(afterRelease).has("HEARTBEAT_AFTER_RELEASE"));

    const neverClaimed = deriveState(
      { [agent]: buildShard(agent, [{ ts: T0, type: "heartbeat", task: "ENG-88" }]) },
      T0,
    );
    assert.ok(stateCodes(neverClaimed).has("HEARTBEAT_UNKNOWN_TASK"));
  });

  it("one agent may not hold two conflicting proposals for the same ledger row", () => {
    const proposal = {
      ts: T0,
      type: "ledger_proposal",
      task: "ENG-01",
      row: "ENG-01",
      fromStatus: "NOT STARTED",
      toStatus: "IN PROGRESS",
      evidence: "tests",
      pr: "#1",
    };
    const retried = deriveState(
      { [agent]: buildShard(agent, [proposal, { ...proposal, ts: T1 }]) },
      T1,
    );
    assert.deepEqual(retried.problems, []);

    const contradicted = deriveState(
      {
        [agent]: buildShard(agent, [proposal, { ...proposal, ts: T1, toStatus: "DONE-VERIFIED" }]),
      },
      T1,
    );
    assert.ok(stateCodes(contradicted).has("PROPOSAL_CONFLICT"));
  });
});

// --- the gate itself --------------------------------------------------------

const tempDirs = [];

after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/**
 * Write a set of shards to a throwaway directory, the way the gate reads them.
 *
 * @param {Record<string, Record<string, unknown>[]>} shards
 * @returns {string} the directory
 */
function writeFixtureDir(shards) {
  const dir = mkdtempSync(join(tmpdir(), "coordination-"));
  tempDirs.push(dir);
  for (const [agent, events] of Object.entries(shards)) {
    writeFileSync(
      join(dir, shardFileName(agent)),
      `${events.map((event) => serializeEvent(event)).join("\n")}\n`,
    );
  }
  return dir;
}

const cleanFleet = () => ({
  a1: buildShard("a1", [
    {
      ts: T0,
      type: "claim",
      task: "ENG-01",
      scopes: ["packages/engine/**"],
      ttlMs: 2 * HOUR,
      dependsOn: [],
    },
    { ts: T1, type: "heartbeat", task: "ENG-01" },
    {
      ts: T1,
      type: "ledger_proposal",
      task: "ENG-01",
      row: "ENG-01",
      fromStatus: "NOT STARTED",
      toStatus: "IN PROGRESS",
      evidence: "PRG-04 tests green",
      pr: "#101",
    },
  ]),
  a2: buildShard("a2", [
    {
      ts: T0,
      type: "claim",
      task: "ENG-02",
      scopes: ["apps/web/**"],
      ttlMs: 2 * HOUR,
      dependsOn: [],
    },
    {
      ts: T1,
      type: "note",
      task: "ENG-02",
      text: "check-bundle-size.mjs is shared, read it before editing",
    },
  ]),
});

const captured = () => {
  const out = [];
  return {
    log: (line) => out.push(line),
    error: (line) => out.push(line),
    text: () => out.join("\n"),
  };
};

describe("check-coordination — the gate, not just the core", () => {
  it("CONTROL: a clean fleet is green and the report says who holds what", () => {
    const dir = writeFixtureDir(cleanFleet());
    const io = captured();
    assert.equal(run({ dir, now: T2, log: io.log, error: io.error }), 0);
    assert.match(io.text(), /Active claims \(2\)/);
    assert.match(io.text(), /ENG-01\s+a1\s+packages\/engine\/\*\*/);
    assert.match(io.text(), /Ledger proposals for the integrator \(1\)/);
    assert.match(io.text(), /Coordination check passed: 5 events across 2 shards, 2 active claims/);
  });

  it("overlapping scopes fail the gate and name the contested file", () => {
    const dir = writeFixtureDir({
      a1: buildShard("a1", [
        { ts: T0, type: "claim", task: "ENG-01", scopes: ["docs/**"], ttlMs: HOUR, dependsOn: [] },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-02",
          scopes: ["docs/FEATURE-LEDGER.md"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
    });
    const io = captured();
    assert.equal(run({ dir, now: T1, log: io.log, error: io.error }), 1);
    assert.match(io.text(), /\[SCOPE_CONFLICT\]/);
    assert.match(io.text(), /docs\/FEATURE-LEDGER\.md/);
    assert.match(io.text(), /PROTOCOL\.md/);
  });

  it("a corrupted log fails the gate", () => {
    const dir = writeFixtureDir({
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: [],
        },
        { ts: T1, type: "heartbeat", task: "ENG-01" },
        { ts: T2, type: "release", task: "ENG-01", outcome: "done" },
      ]),
    });
    const path = join(dir, "a1.jsonl");
    // Drop the middle event: seq 1 and 3 remain, which is a gap and a broken link.
    const lines = readFileSync(path, "utf8").split("\n");
    lines.splice(1, 1);
    writeFileSync(path, lines.join("\n"));
    const io = captured();
    assert.equal(run({ dir, now: T1, log: io.log, error: io.error }), 1);
    assert.match(io.text(), /\[SEQ_GAP\]/);
    assert.match(io.text(), /\[CHAIN_BROKEN\]/);
  });

  it("a warning prints but does not block the merge", () => {
    const dir = writeFixtureDir({
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["packages/engine/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-99"],
        },
      ]),
    });
    const io = captured();
    assert.equal(run({ dir, now: T1, log: io.log, error: io.error }), 0);
    assert.match(io.text(), /Warnings \(1\) — these do not block/);
    assert.match(io.text(), /1 warning\(s\)/);
    assert.match(io.text(), /ENG-99/);
  });

  it("a shard file that is not named after a valid agent id fails, rather than being skipped", () => {
    const dir = writeFixtureDir({});
    writeFileSync(join(dir, "not an agent id.jsonl"), "{}\n");
    const io = captured();
    assert.equal(run({ dir, now: T0, log: io.log, error: io.error }), 1);
    assert.match(io.text(), /not a valid agent id/);
  });

  it("an empty events directory is green — a fleet that has not started is not a fault", () => {
    const io = captured();
    assert.equal(run({ dir: writeFixtureDir({}), now: T0, log: io.log, error: io.error }), 0);
    assert.match(io.text(), /\(none — every scope is claimable\)/);
  });

  it("the CLI process itself exits non-zero on a conflict", () => {
    const dir = writeFixtureDir({
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["package.json"],
          ttlMs: HOUR,
          dependsOn: [],
        },
      ]),
      a2: buildShard("a2", [
        { ts: T0, type: "claim", task: "ENG-02", scopes: ["**"], ttlMs: HOUR, dependsOn: [] },
      ]),
    });
    const result = spawnSync(
      process.execPath,
      ["scripts/check-coordination.mjs", "--now", T1, "--dir", dir],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Coordination check FAILED/);
    assert.match(result.stderr, /SCOPE_CONFLICT/);
  });

  it("--now and --dir are the only flags, and a bad --now is refused loudly", () => {
    assert.deepEqual(parseArgs(["--now", T0, "--dir", "somewhere"]), {
      now: T0,
      dir: join(process.cwd(), "somewhere"),
    });
    assert.equal(parseArgs([]).now, undefined);
    assert.throws(() => parseArgs(["--now", "yesterday"]), /not a valid instant/);
    assert.throws(() => parseArgs(["--now"]), /needs an ISO-8601/);
    assert.throws(() => parseArgs(["--dir"]), /needs a path/);
    assert.throws(() => parseArgs(["--wat"]), /unknown argument/);
  });

  it("reads shards keyed by agent id, in sorted order", () => {
    const { shards, problems } = readShards(writeFixtureDir(cleanFleet()));
    assert.deepEqual(Object.keys(shards), ["a1", "a2"]);
    assert.deepEqual(problems, []);
    assert.equal(shards.a1.length, 3);
  });

  it("shard naming round-trips, and rejects anything that is not an agent id", () => {
    assert.equal(agentFromShardFile(shardFileName("agent-7")), "agent-7");
    assert.equal(agentFromShardFile(".gitkeep"), null);
    assert.equal(agentFromShardFile("nested/a1.jsonl"), null);
    assert.equal(agentFromShardFile("..jsonl"), null);
    assert.throws(() => shardFileName("../escape"), TypeError);
  });
});

describe("docs/coordination/log.mjs — the writer an agent actually runs", () => {
  it("CONTROL: the events it appends pass the gate's own chain check", () => {
    const dir = mkdtempSync(join(tmpdir(), "coordination-log-"));
    tempDirs.push(dir);
    const first = appendOne({
      agent: "task-x",
      type: "claim",
      eventsDir: dir,
      ts: T0,
      payload: { task: "ENG-07", scopes: ["packages/schemas/**"], ttlMs: HOUR, dependsOn: [] },
    });
    const second = appendOne({
      agent: "task-x",
      type: "release",
      eventsDir: dir,
      ts: T1,
      payload: { task: "ENG-07", outcome: "done", notes: "same commit as the work" },
    });
    assert.equal(first.event.seq, 1);
    assert.equal(second.event.seq, 2);
    assert.equal(second.event.prev, first.event.hash);
    assert.deepEqual(verifyChain([first.event, second.event], "task-x"), []);
    // And the gate is green over the directory it just wrote.
    const io = captured();
    assert.equal(run({ dir, now: T1, log: io.log, error: io.error }), 0);
  });

  it("refuses to write an event the gate would reject", () => {
    const dir = mkdtempSync(join(tmpdir(), "coordination-log-"));
    tempDirs.push(dir);
    assert.throws(
      () =>
        appendOne({
          agent: "task-x",
          type: "claim",
          eventsDir: dir,
          ts: T0,
          payload: { task: "ENG-07" },
        }),
      /invalid event/,
    );
    assert.deepEqual(readShards(dir).shards, {});
  });

  it("repeatable flags collect, single flags do not repeat, and a missing value is an error", () => {
    const parsed = parseLogArgs([
      "claim",
      "--task",
      "ENG-07",
      "--scope",
      "a/**",
      "--scope",
      "b/**",
      "--ttl",
      "90m",
    ]);
    assert.equal(parsed.type, "claim");
    assert.deepEqual(parsed.flags.scope, ["a/**", "b/**"]);
    assert.equal(parsed.flags.ttl[0], "90m");
    assert.deepEqual(buildPayload("claim", parsed.flags), {
      task: "ENG-07",
      scopes: ["a/**", "b/**"],
      ttlMs: 90 * 60_000,
      dependsOn: [],
    });
    assert.throws(() => parseLogArgs(["--task", "ENG-07"]), /first argument must be an event type/);
    assert.throws(() => parseLogArgs(["claim", "task"]), /expected a --flag/);
    assert.throws(() => parseLogArgs(["claim", "--task"]), /--task needs a value/);
    assert.throws(() => buildPayload("claim", { task: ["ENG-07"] }), /--scope is required/);
    assert.throws(
      () => buildPayload("release", { task: ["ENG-07"], outcome: ["done", "done"] }),
      /takes one value/,
    );
    assert.throws(() => buildPayload("release", { task: ["ENG-07"] }), /--outcome is required/);
    assert.throws(() => buildPayload("teleport", { task: ["ENG-07"] }), /unknown event type/);
  });

  it("the agent id comes from the flag, the environment, or the branch — never invented", () => {
    assert.equal(resolveAgent(["task/Coordination"]), "task-coordination");
    const previous = process.env.COORDINATION_AGENT;
    process.env.COORDINATION_AGENT = "env-agent";
    try {
      assert.equal(resolveAgent(), "env-agent");
      assert.equal(resolveAgent(["flag-agent"]), "flag-agent");
      delete process.env.COORDINATION_AGENT;
      // Falls back to the git branch of the worktree the agent is standing in.
      // Asserted by shape, not by value: this suite also runs on main, where the
      // branch name is a PR ref and the literal would be a false failure.
      assert.match(resolveAgent(), /^[a-z0-9][a-z0-9._-]{0,63}$/);
    } finally {
      if (previous === undefined) delete process.env.COORDINATION_AGENT;
      else process.env.COORDINATION_AGENT = previous;
    }
  });
});

describe("foldState and validateState compose", () => {
  it("foldState does the per-shard work, validateState the cross-claim work", () => {
    const shards = {
      a1: buildShard("a1", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-01",
          scopes: ["docs/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-02"],
        },
      ]),
      a2: buildShard("a2", [
        {
          ts: T0,
          type: "claim",
          task: "ENG-02",
          scopes: ["docs/**"],
          ttlMs: HOUR,
          dependsOn: ["ENG-01"],
        },
      ]),
    };
    const folded = foldState(shards, T1);
    assert.deepEqual(folded.problems, []);
    const crossClaim = codes(validateState(folded));
    assert.ok(crossClaim.includes("SCOPE_CONFLICT"));
    assert.ok(crossClaim.includes("DEPENDENCY_CYCLE"));
  });

  it("validateState survives a missing state rather than throwing", () => {
    assert.deepEqual(validateState(undefined), []);
  });

  it("timestamps must be instants with a zone, and `now` accepts the three shapes a caller has", () => {
    assert.equal(toEpochMs("2026-01-15T09:00:00.000Z"), Date.parse(T0));
    assert.equal(toEpochMs(new Date(T0)), Date.parse(T0));
    assert.equal(toEpochMs(1234), 1234);
    assert.throws(() => toEpochMs("nope"), TypeError);
    assert.throws(() => toEpochMs(null), TypeError);
  });
});
