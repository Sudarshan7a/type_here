# Coordination protocol

**Read this before you touch a file that might belong to another agent.** It is
short because it has to be read every time, not skimmed once.

You are one of several AI agents working in parallel, each in its own git worktree,
all targeting the same `main`. Two things go wrong without this protocol, and both
have already come close to happening:

1. **Silent overwrite.** Two agents edit the same file — usually
   `docs/FEATURE-LEDGER.md`, `BUILD-LOG.md`, `package.json`,
   `.github/workflows/ci.yml` or `eslint.config.mjs` — and whoever merges second
   either conflicts confusingly or discards the other's work.
2. **Deadlock.** Agents block on each other: circular waits, a crashed agent
   holding a lock forever, an agent waiting on a review that will never come.

This protocol removes both. There is no lock and no lock file: there is a
**write-ahead log**, replayed to derive state, with **leases** that expire on their
own.

---

## The whole thing in five commands

Your agent id is the name of your worktree's branch, slugified — `task/coordination`
→ `task-coordination`.

```bash
# 1. Is the ground free? (read-only; run this BEFORE choosing scopes)
node scripts/check-coordination.mjs

# 2. Take the ground. Append one event to YOUR shard, then commit it.
node docs/coordination/log.mjs claim \
  --task ENG-07 \
  --scope "packages/schemas/**" \
  --ttl 90m \
  --depends ENG-01

# 3. Keep the lease alive while you work (every ~30 min).
node docs/coordination/log.mjs heartbeat --task ENG-07

# 4. Hand the ground back — ALWAYS, including when you failed.
node docs/coordination/log.mjs release --task ENG-07 --outcome done
node docs/coordination/log.mjs release --task ENG-07 --outcome partial --notes "blocked on ENG-01"

# 5. Read the table again: who holds what, and for how much longer.
node scripts/check-coordination.mjs
```

`docs/coordination/events/<agent-id>.jsonl` is your shard. It is yours alone —
append to it, never rewrite it, never write to another agent's file. `log.mjs`
writes the event with a correct `seq`, `prev` and `hash` for you; if you hand-write
a line instead, the gate will reject your own work.

Ledger rows are **proposals**, not edits:

```bash
node docs/coordination/log.mjs ledger_proposal \
  --task ENG-07 \
  --row ENG-07 --from "NOT STARTED" --to "IN PROGRESS" \
  --evidence "packages/schemas tests green, 92% lines" \
  --pr "#142"
```

---

## The scope-ownership rule

**A scope is owned by whoever has the live claim on it. Touch nothing else.**

Two claims whose scopes overlap are a hard CI failure (`SCOPE_CONFLICT`), and the
failure names the exact file both of you claim. This is the overwrite bug caught
before either of you wastes an hour.

The matching rule, exactly:

| Pattern | Means |
| --- | --- |
| `packages/engine/**` | the directory `packages/engine` and everything under it |
| `packages/**/tests` | `packages/tests`, `packages/engine/tests`, `packages/a/b/tests` |
| `scripts/*.mjs` | `.mjs` files directly in `scripts/` — `*` never crosses a `/` |
| `scripts/?.mjs` | one character in that position |
| `package.json` | that one file |
| `**` | the whole repository — a repo-wide sweep; expect to be asked to narrow it |

Write the narrowest scope that covers your work. `docs/coordination/**` is a
whole-directory claim and will collide with any other agent touching coordination
docs; prefer the file. If your work genuinely spans two trees, list both scopes on
one claim.

Every claim names at least one scope. If you are not editing anything — an agent
working only from proposals, say — you do not need a claim; write a `note`.

## The TTL, and what happens when it runs out

Every claim carries a TTL (`--ttl`, default 60 minutes). A claim is **active** while
`now - lastEventTs < ttlMs`, where `lastEventTs` is your `claim` or your most recent
`heartbeat`. When the TTL runs out the claim is **expired** and owns nothing.

**This is the anti-deadlock mechanism.** There is no `unlock` command to forget and
no lock to inherit: if you crash, get killed, or lose your network, you stop
renewing and your scopes become claimable again with no human intervention. Nobody
is ever blocked by an agent that no longer exists.

So: **heartbeat while you work.** A task that takes longer than one TTL needs a
heartbeat every few minutes, not one at the end. And if you are stuck, **release
`partial`** — a lease that is only released on success is a lock, and locks are what
we are removing.

`release` outcomes, and what each frees:

| Outcome | Meaning | Frees the scopes? |
| --- | --- | --- |
| `done` | the work is finished and committed | yes |
| `partial` | partly done, blocked, or handed to another agent | **yes** |
| `abandoned` | started, giving up | **yes** |

All three free the ground. Always pick the truthful one — a wrong `done` corrupts
the ledger's evidence column, which is worse than an honest `partial`.

## `dependsOn`, and not waiting for each other

`--depends ENG-01` records "I will start after ENG-01 lands". It is a statement, not
a wait. Two claims whose dependencies form a **cycle** are a hard CI failure
(`DEPENDENCY_CYCLE`) with the loop printed: `ENG-01 (a1) → ENG-02 (a2) → ENG-01`.
That is the deadlock, detected before anyone sits waiting.

Depending on a task nobody has claimed is a **warning**, not an error: it is usually
planned work, and occasionally a typo in a requirement id. A typo there is an
invisible hang, so read the warning.

## The single-writer rule for the ledger and build log

`docs/FEATURE-LEDGER.md` and `BUILD-LOG.md` cannot be partitioned — every row lives
in the one file — so they have exactly one writer: **the integrator**.

You never edit either file. You emit a `ledger_proposal` (or a `note`) carrying the
row, the transition, the evidence and the PR, and the integrator applies it:

```
{"seq":3,"ts":"...","type":"ledger_proposal","agent":"task-coordination","task":"ENG-07",
 "row":"ENG-07","fromStatus":"NOT STARTED","toStatus":"IN PROGRESS",
 "evidence":"coordination gate green in CI","pr":"#142","prev":"...","hash":"..."}
```

Evidence is `LAB PROXY` or `REAL-DEVICE CONFIRMED` per the ledger's own header. A
proposal is a request; if it is wrong the integrator rejects it and tells you, rather
than both of you editing the row.

The same applies to `package.json`'s `scripts` block and `.github/workflows/ci.yml`
in practice: if you need a change there, claim the file, or propose it in a `note`
and let the integrator do it.

## Never do this

- **Do not edit `docs/FEATURE-LEDGER.md` or `BUILD-LOG.md` directly.** Propose. This
  is the single-writer rule, and it exists because those two files are the ones
  that have nearly been lost twice.
- **Do not claim a scope another live claim owns.** `check-coordination.mjs` will
  fail both your branch and theirs. Run the gate first; if it fails, either narrow
  your scopes or wait for the lease to expire — do not edit the shard to hide it.
- **Do not block waiting for another agent.** No agent waits on another agent's
  work. If you are blocked, `release --outcome partial`, note what you need, and
  move on to a task that is not blocked. A blocked agent holding a scope is how the
  fleet deadlocks.
- **Do not merge to `main` yourself.** Push your branch, open or update the PR, and
  let a human or the integrator merge. Two agents merging their own branches is how
  a silent overwrite happens with extra steps.
- **Do not rewrite, reorder or delete events.** The log is append-only and hash
  chained; the gate will report `BAD_HASH`, `CHAIN_BROKEN` or `SEQ_GAP`, and it will
  be right. Never `git checkout` somebody's shard to "fix" a conflict — resolve by
  keeping both files, since two agents can never legitimately write the same one.
- **Do not commit the same claim twice with different scopes.** That is
  `CLAIM_REVISION`; a lease in force cannot be silently widened. Release, then
  re-claim.
- **Do not write into another agent's shard.** `FOREIGN_EVENT`. Your file name is
  your agent id; that is what keeps merges conflict-free.
- **Do not leave a lease unrenewed while you keep working.** The expiry is a safety
  net, not a licence to stop heartbeating.
- **Do not invent requirement ids.** Task ids are the ledger's ids. A typo in
  `dependsOn` is an invisible hang, and in `task` it is a claim nobody can find.

## What the gate checks

`node scripts/check-coordination.mjs` (also `pnpm check:coordination`, and wired
into CI next to its own test). Errors fail the build; warnings print and do not.

| Code | Severity | What it means |
| --- | --- | --- |
| `SCOPE_CONFLICT` | error | two live claims cover the same file — the overwrite bug |
| `DEPENDENCY_CYCLE` | error | live claims wait on each other in a loop — the deadlock |
| `DUPLICATE_TASK` | error | one task, two live owners |
| `MALFORMED_EVENT` | error | a line is not a valid event (bad `seq`, `ts`, type, or payload) |
| `FOREIGN_EVENT` | error | someone else's event in your shard |
| `SEQ_GAP` | error | an event was dropped, duplicated or reordered |
| `CHAIN_BROKEN` | error | the log was rewritten; a `prev` no longer matches |
| `BAD_HASH` | error | an event was edited after it was written |
| `RELEASE_UNKNOWN_TASK` | error | releasing a task you never claimed |
| `RELEASE_CONFLICT` | error | releasing the same task with two different outcomes |
| `HEARTBEAT_AFTER_RELEASE` | error | renewing a lease you already handed back |
| `HEARTBEAT_UNKNOWN_TASK` | error | renewing a task you never claimed |
| `CLAIM_REVISION` | error | widening or rewriting a claim in force |
| `PROPOSAL_CONFLICT` | error | two different proposals for one row from one agent |
| `SCOPE_OVERLAP_SAME_AGENT` | warning | your own two claims overlap — usually a typo |
| `DEPENDENCY_PLANNED` | warning | `dependsOn` names a task nobody has claimed |

`--now <iso>` pins the clock so a lease table is reproducible in a test or a bisect.
`--dir <path>` points the gate at a fixture directory.

## Why the log is sharded per agent

One file per agent, `docs/coordination/events/<agent-id>.jsonl`. The obvious
alternative — a single shared `events.jsonl` — would reintroduce the exact problem
this exists to solve: a shared append-only file is still a shared mutable file, two
agents appending near its end produce overlapping hunks, and whoever merges second
resolves by discarding a line. With one file per agent, **two agents can never write
the same path, so merges are conflict-free by construction.** Git is the replication
layer; the log store is the working tree. State is never stored — it is derived by
replaying every shard in a deterministic order (agent id, then `seq`).

Each event is `{ seq, ts, type, agent, task, ...payload, prev, hash }`, where `hash`
is `sha256` over the canonical serialisation of the event without its own `hash`
field, and `prev` is the previous event's `hash` in the same shard (64 zeros for the
first). `scripts/coordination.mjs` documents the canonicalisation byte for byte;
`scripts/check-coordination.test.mjs` proves a reordered, dropped, or edited event
is detected.

### Known limit, stated plainly

A hash chain proves order and content **within** a shard; it cannot prove a shard is
complete, because nothing outside a shard knows how many events it should contain.
Dropping an event from the middle of a shard is caught. Truncating the **tail** of a
shard leaves a valid prefix and cannot be detected from the log alone. The
mitigation is procedural: **commit your release event in the same commit as the work
it releases**, so a truncated shard is visible in git history even when the chain
cannot see it.