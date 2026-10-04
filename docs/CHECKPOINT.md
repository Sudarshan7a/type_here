# CHECKPOINT — session state

**Written:** end of session. **Resume from here.**

## Ledger position

**15/216 DONE-VERIFIED** · 17 IN PROGRESS · 183 NOT STARTED · 1 REJECTED
MVP 14/97 | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 1/20

`MOT-01` stays `REJECTED-BY-ANTI-GOAL` (ADR-006) — that is the correct terminal
state for it, not a gap.

## main

`bd72a1a` — WAVE 0.12 closeout. All gates green: `pnpm test`, `lint`,
`typecheck`, `format:check`, `build`, `check:bundle` (190.7 KB / 200 KB gzip),
`check:policies`, `check:licenses`, `check:content-licenses`.

### Merged this session

| PR | Requirement | Substance |
|---|---|---|
| #41 | PRG-05 | `copy-claims/no-outcome-promises` ESLint rule + string-table/`copy.ts` corpus test. 41 rule tests, every banned pattern exercised, 3 allowlist entries pinned. |
| #42 | PRG-04 | `sanitizeSnippet` in the engine + renderer-ban scan. 7/7 mutants killed. |
| #43 | CNT-07 | Content-corpus licence gate. 20 unit tests, 746 items / 18 files / 53 register rows. |

## Two finished branches awaiting review + merge

Both are **pushed** (durable) and committed. Neither is on `main`. Review the
diffs before merging; do not blind-merge.

### 1. `task/coordination` @ `75e00d6` — MERGE THIS FIRST

The multi-agent safety architecture. Every later agent depends on it, so it
lands before more parallel work is dispatched.

Problem it solves: N agents in N worktrees on one repo, with no protection
against (a) two agents overwriting the same file and (b) agents deadlocking on
each other.

Pattern set: **Write-Ahead Log + Lease + HeartBeat + Fixed Partitions**.

- **Log is sharded per agent** — `docs/coordination/events/<agent-id>.jsonl`,
  append-only, one file per agent. This is the crux: a single shared log would
  itself be the contended file we are eliminating. Per-agent shards mean two
  agents can never write the same path, so **git merges are conflict-free by
  construction**. Git is the replication layer.
- **State is derived, never stored** — `deriveState(shards, now)` replays the
  log. Replay order is `(agent id, seq)`, not wall-clock: agent clocks are not
  a total order.
- **Integrity** — per-shard `prev`/`hash` chain over a canonical JSON
  serialisation (sorted keys, omitted `undefined`, non-finite numbers throw).
  Detects tampering, reordering and mid-shard deletion. *Honest limit, documented:
  tail truncation of a shard is undetectable from the log alone.*
- **Leases are the anti-deadlock mechanism** — a claim is active iff
  `now - lastEventTs < ttlMs`. A crashed agent's scope frees itself. There is
  no unlock command, so no lock can be inherited. `partial` and `abandoned`
  both free scopes, so a blocked agent that gives up does not wedge the fleet.
- **Gate fails CI on** `SCOPE_CONFLICT` (the overwrite bug, caught by
  constructive glob-witness search — sound, so never a false positive),
  `DEPENDENCY_CYCLE` (3-colour DFS, reports the actual loop path),
  `DUPLICATE_TASK`, `SEQ_GAP`/`CHAIN_BROKEN`/`BAD_HASH`, `FOREIGN_EVENT`,
  malformed events, release/heartbeat protocol violations, `CLAIM_REVISION`
  (a lease cannot be silently widened), `PROPOSAL_CONFLICT`.
- **Single-writer rule** — agents never edit `docs/FEATURE-LEDGER.md` or
  `BUILD-LOG.md`. They emit `ledger_proposal` events; the integrator applies
  them.
- 59 tests, mostly asserting the failing direction, plus a no-mutation control.
  5/5 mutants killed.

Agent quickstart:
```bash
node scripts/check-coordination.mjs                    # who holds what
node docs/coordination/log.mjs claim --task ENG-07 --scope "packages/schemas/**" --ttl 90m --depends ENG-01
node docs/coordination/log.mjs heartbeat --task ENG-07  # every few minutes
node docs/coordination/log.mjs release --task ENG-07 --outcome done   # or partial
node docs/coordination/log.mjs propose --task ENG-07 --row ENG-07 --from "NOT STARTED" --to "IN PROGRESS" --evidence "…" --pr "#142"
```

### 2. `task/prg01-token` @ `ce3633b`

PRG-01 token-aware engine. 85 new engine tests (344 total), coverage 98%.
28 mutants attempted, 27 killed, 1 survivor that is redundancy rather than a
test gap (explained in the agent's report).

- `token-class.ts` — the 12 token classes from master spec §7.1.
- `language-profiles.ts` — languages as **data**; ships `javascript` (covers
  TS/JSX), `python`, `generic`.
- `token-map.ts` — lexer, span tiling, validators, queries. Regex-vs-division
  rule: `/` opens a regex iff the previous significant token cannot end a value.
- `grammar-refine.ts` — dependency-free lazy Tree-sitter seam.
- **No new dependency, no `apps/web` change**: `scripts/check-bundle-size.mjs`
  hard-fails on any `.wasm` in `dist`, so wiring a real grammar needs a fetch
  path outside the bundler graph. Bundle byte-identical.
- PRG-01 correctly stays **IN PROGRESS**. Covered TOK-FIXTURE-003/004/005;
  001/002/006 (keystroke attribution) and 007 (naming styles) are deferred to
  their owning requirements and the ledger row now says so.

## Known issue to fix

`pnpm check:ledger` **exits 1** — 3 status-count mismatches and 2 missing
evidence labels introduced by the WAVE 0.12 ledger edit. Pre-existing on
`main`, not caused by either open branch. The counts table at the top of
`docs/FEATURE-LEDGER.md` must be recomputed after the next status edits.

## Worktrees

```
type_here                              main        @ bd72a1a
type_here-wt/task-coordination         task/coordination @ 75e00d6   <- merge first
type_here-wt/task-prg01-token          task/prg01-token  @ ce3633b
```
Six empty scaffolding worktrees were removed. Windows sometimes refuses
`git worktree remove` with "Filename too long"; `git worktree prune` clears the
stale admin entries.

## Operating rules for the next session

1. **Merge `task/coordination` first.** Then every agent claims its scope
   before writing, heartbeats while working, releases when done — including
   `partial` when blocked. That is what prevents the overwrite and deadlock
   classes rather than merely detecting them after the fact.
2. **Never merge to `main` from a task worktree.** Push, open a PR, let CI
   gate it.
3. **Never edit the ledger or build log from a task branch** — emit proposals.
   One writer applies them.
4. **Do not weaken a gate to make it pass.** If a gate is wrong, change it
   deliberately and say why in the PR.
5. **Non-vacuity is the bar.** Assert the failing direction, prove mutants die,
   run a no-mutation control before believing a mutation harness.
6. If a requirement conflicts with `AGENTS.md`, stop and ask rather than
   inventing a resolution.

## Human-only items (cannot be closed by an agent)

`docs/HUMAN-ACTIONS.md`: CUS-01 owner eyeball, A11Y-01/NFR-11 screen-reader
pass, NFR-01 real-device latency, LOC-01 hardware sheet + live-driver AltGr,
ENG-07 server consumption (WAVE 1). These stay IN PROGRESS by design — the
loop's evidence rules require real-hardware evidence, not lab proxies.

## Craft note

The user's standing goal is Apple-level craft. When the UI work resumes, load
`typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui` and
`award-readiness-review` before writing components, and keep AGENTS.md rule 1
absolute: nothing decorative moves while someone is typing.