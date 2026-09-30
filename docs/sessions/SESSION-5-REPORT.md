# SESSION 5 REPORT — RealType

**Date:** 2026-10-01 · Session 5. One merged block (A: dev script + README
corrections) plus the Section 1 audit that found it. No engine code changed.

## Section 1 gate check

`docs/handoff/` does not exist, so state = **continue** (not AWAITING HUMAN).
Neither `HANDOFF-<n>.md` nor `RESPONSE-<n>.md` is present. Nothing gated.

## Baseline (clean `git worktree` at `main`, before any edit)

Per Section 1 step 8, in a throwaway worktree so nothing local could mask a
problem:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Done in 8.9s |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm typecheck` | exit 0, all 7 packages |
| `pnpm test` | exit 0 — **258 tests, 0 failures** |
| `pnpm build` | exit 0, all 7 packages |
| `pnpm check:bundle` | 71.1 KB gzip of a 200 KB budget |
| `pnpm check:licenses` | no copyleft licenses in production dependencies |

Coverage: engine 96.11 / 92.82 / 95.16 / 97.40 · schemas 100 / 100 / 100 / 100 ·
telemetry 100 / 92.62 / 100 / 100 · api 100 / 80 / 100 / 100 · web 84.84 / 85.71 / 80 / 84.37.

Test counts: engine 73, telemetry 97, schemas 56, api 4, web 17, fixture-recorder 11.

**Discrepancy found and resolved (Section 1 step 10).** SESSION-4-REPORT's Block A
table reports "engine **56/56** tests ... = **232 tests**" for `5aff79d`. This
session measures **73** engine tests and **258** total. Cause: measurement, not
regression. The 232 figure was captured at `5aff79d`, which predates Blocks C
(layouts, +9) and D (robustness, +8) — 56 + 9 + 8 = 73, and 232 + 26 = 258. Both
numbers are correct for their commits; the report simply predates the work. No
code change was needed. Recorded so the next session does not read it as a
regression.

## Repo-state defect: two commits were stranded off `main`

`git status` showed the working tree on `task/s4-block-f`, **two commits ahead of
`main` and unmerged**, both already green in CI (run 74, all 14 steps including
e2e). The Session 4 report, the updated BUILD-LOG/HUMAN-ACTIONS and the run
instructions existed only on the branch. Anyone cloning `main` would not have
had them.

`gh` is **not installed** (confirmed: no binary on PATH), so Section 3's
fallback applies: confirm CI green, write `docs/pr-log/`, `git merge --no-ff`.
Branch protection is still off — logged, did not stop the block.

## Block A — what changed and why

Two documentation defects and one missing script, all found by **running** the
documented commands rather than reading them.

1. **Phantom command.** README documented `pnpm dev`. No root script existed.
   Proven failing first: `Command "dev" not found`, exit 1.
2. **Malformed run block.** The "run it yourself" section was un-fenced prose with
   trailing whitespace.
3. **Stale status.** Still said Phase 0 and "wired up when the M0-10 scaffold
   lands"; M0-10 landed in Session 2.

Added `"dev": "pnpm --filter @realtype/web --filter @realtype/api --parallel dev"`.
Two alternatives were probed and rejected with evidence: `pnpm -r dev` starts
servers **serially** (the second never gets a terminal); `pnpm -r --parallel dev`
reports `Scope: 7 of 8` and also starts the fixture recorder on 5174, which is
not part of running the app. The filter form reports `Scope: 2 of 8`.

Verified good case: web HTTP 200 on 5173, API HTTP 200 on 3000.

**Why no gate caught the README defects:** `.prettierignore` excludes `*.md` by
design, so `format:check` cannot see Markdown. That exclusion is correct — spec
documents must stay character-identical to their sources — so it was left alone
and the gap was recorded instead of narrowed.

## ATTACK pass (Section 4 item 12)

A subagent whose only instruction was "find a failing case" returned **9
findings**. Four were defects in this session's own first commit:

| # | Defect | Status |
|---|---|---|
| F5 | README gave `/health` as `{"status":"ok"}`; actual body also carries `service` and `time` | **Fixed**, re-verified live |
| F6 | The pr-log documented the command form it had **rejected**, and claimed three dev servers for a script that starts two | **Fixed** |
| F7 | `pnpm test` comment omitted `tools/fixture-recorder` (11 tests) | **Fixed** |
| F8 | Status said results "not built yet" 30 lines above a section describing a results panel | **Fixed** |

The README metrics list was also checked line-by-line against
`ResultsPanel.tsx`: all 10 labels now match exactly.

Five findings were **pre-existing conditions, not introduced here**, and were
logged in `HUMAN-ACTIONS.md` rather than dropped:

- **F3 (most serious):** port 3000 busy → `tsx watch` swallows the child's
  `exit(1)`, so `pnpm dev` reports **success with a dead API**. Harmless now
  (the test surface makes no API calls); a real trap in Phase 4.
- **F2:** port 5173 busy → pnpm exits loudly but orphans the API on 3000.
- **F1/F9:** a typo'd `--filter` starts a silent half-stack and exits 0; the
  filter list is a hard-coded allowlist, so a future third service is silently
  omitted.
- **F4:** the README's "Ctrl-C stops both" could not be verified (the harness
  cannot deliver Ctrl-C to the process group). Left as an unverified claim
  rather than asserted as tested.

[FIX → SECOND INDEPENDENT CHECK, Section 2 rule 7] After fixing, re-ran the full
gate suite (all exit 0) and re-verified F5 against a live server:
`{"status":"ok","service":"realtype-api","time":"2026-10-01T..."}`. Gates after
the fix: lint 0, format clean, typecheck 0, test 258 passing, build 0.

## Phase exit criteria status

Phase 1 (Core Engine and Metrics) — **unchanged, still open.** Its exit
criteria are all 40 `ENG-*` scenarios plus parity and property tests. The tail
fixtures (E3 Caps Lock, E5 dead keys, E6 graphemes, E7 paste, E8 dual-key, A03
long test, D02 stop-on-error, D03 no-backspace, D04 word-locked) are untouched
and remain the next executable work. This session did not advance the phase.

## Commits

- `03019ec` — root dev script + README corrections
- `3d755c0` — A2: the 4 attack-pass fixes

Both on `task/s4-block-f`, gates green, awaiting the `--no-ff` merge to `main`.

## External dependencies

Unchanged and still open in `HUMAN-ACTIONS.md`: branch protection, `gh` install,
live-keyboard layout confirmation, AltGr/dead-key resolution, recorded fixtures,
real-device spike numbers, prototype usability test, Firefox/WebKit e2e, cloud
accounts, and the legal review. **None of these stopped this block.**

New this session: F1–F4/F9 logged as open defects (no human decision needed).

## Halt condition

**None applies.** H1 fails: the roadmap has ample executable work (the entire
Phase 1 tail). H2 does not apply — three progress events landed (a real
documentation defect fixed and merged, a missing script added and proven, five
latent defects found and logged). H3 budget not reached. H4 did not trigger.

Per Section 14, the next task is selected automatically: the Phase 1 tail,
starting with the edge-case fixtures that need no contract change (E3, E5, E6,
E8, A03, D02, D03), test-first per Section 2 rule 3.
