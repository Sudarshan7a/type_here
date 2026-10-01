# HALT-H3-1 — budget pause (Session 6)

**Type:** H3 (budget pause, Section 11 / Section 18.9). **Not** H1 and **not** H2.
**Date:** 2026-10-01 · Session 6 · commit `9652472` on `main`
**Driver:** re-launch on H3. The program continues.

## Why this halt, and why it is not the others

- **Not H1.** `pnpm check:ledger` reports **19 IN PROGRESS** and **191 NOT
  STARTED**. Section 18.8 requires zero rows in either state.
- **Not H2.** Three progress events landed, each with evidence (below).
- **Not H4.** Nothing destructive, irreversible, legally or financially
  consequential, and nothing privacy-contract-changing occurred.
- **H3 applies.** Work remains and the session boundary is here. "Roadmap work
  remains" is never a reason to stop *without* this file; it is exactly the
  situation this file exists to record.

## Progress events this session (Section 6)

1. **A documentation defect fixed, and made impossible to reintroduce.** The 20
   untagged ledger rows were never missing from the ledger — the mandated report
   format had no `UNTAGGED` slot, so every report printed denominators summing to
   196 beside `overall 5/216`. Fixed, and `check-ledger.mjs` §7 now checks the
   *report* itself, with 16 tests.
2. **A public data contract changed, additively and with back-compat proof.**
   `CONTRACT_VERSION` 1.2.0 → 1.3.0; `errorMode` widened to five values; every
   consumer updated; four tests prove a 1.2.0 log still parses unaltered.
3. **Six latent-drift blind spots closed.** Hand-written `errorMode` unions in
   four files deleted in favour of types derived from the contract, plus four new
   telemetry tests pinning `ERROR_MODES`/`MODES`/`LAYOUTS` to the schemas enums.

## Counted tasks (Section 17.2)

A task counts only if it moves a ledger row's status or adds its tests. Three
qualify:

| # | Task | PR | Tests added |
|---|---|---|---|
| 1 | Report-progress-line gate + format fix | #1 | 16 (`scripts/check-ledger.test.mjs`) |
| 2 | `errorMode` 1.3.0, all consumers, back-compat tests | #2 | 13 (schemas) |
| 3 | D04 word-locked engine behaviour | #2 | 6 (engine) |
| 4 | Telemetry enum-drift guard | #2 | 4 (telemetry) |

Four counted tasks, above the `[SET: 5]` floor for writing an H3 file. No hygiene
or tooling work is counted here.

**Ledger rows moved this session: none.** Status is not marked for partial work,
so `ENG-03` stays `IN PROGRESS` even though its blocker cleared.

## Ledger counts (Section 18.10)

    MVP 5/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 |
    LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 5/216

19 IN PROGRESS, 191 NOT STARTED, 216 rows total. The `UNTAGGED` denominator is
now part of the format; it was the missing 20.

## Verification at close

    pnpm lint              0
    pnpm format:check      clean
    pnpm typecheck         0
    pnpm test              0 — 288 tests, 0 failures
    pnpm build             0
    pnpm check:bundle      71.3 KB gzip / 200 KB budget
    pnpm check:licenses    pass
    pnpm check:ledger      216 rows, all statuses and tags valid
    node --test scripts/check-ledger.test.mjs    16/16

CI: PR #1 runs 36850614189 (red — the test-first commit, intended) and
36852643188 (green); PR #2 run 36858729219 (green). Both PRs merged `--merge`,
never squash, never fast-forward, never a red run.

## Exact next tasks, in the owner's stated order

1. **`ENG-FIXTURE-D03` and `ENG-FIXTURE-D04`.** Unblocked by PR #2 and now the
   cheapest executable work — the engine behaviour exists and the expectations are
   already derived. Per the arithmetic protocol the numbers must be recomputed
   independently from the master-spec §6.1 formulas by a script that imports
   nothing from `packages/engine`, before the fixture is written.
2. **F3 / F2 / F1-F9, the dev-script defects.** STEER-1: "before starting Phase
   4". F3 is the one that matters: `pnpm dev` reports **success with a dead API**
   when port 3000 is busy, because `tsx watch` swallows the child's `exit(1)`.
   F2 orphans the API on 3000 when 5173 is busy; F1/F9 start a silent half-stack
   on a mistyped `--filter`. Each needs a bad-case → fail proof.
3. **The STEER-2 thin vertical slice of the real typing surface.** The six
   acceptance criteria are written out in `docs/handoff/STEER-2.MD`; the first
   requirement is that it use the real engine path and be the foundation of
   Phase 3, not a throwaway. Rows advance to `IN PROGRESS` only — `DONE-VERIFIED`
   requires the row's full spec met with a real test. The browser pre-check
   (Section 16) or the Playwright fallback applies, and `HUMAN-ACTIONS.md` must
   then say "Typing surface ready to try" with the exact command.
4. Then the rest of the Chapter 4 edge fixtures: E3 Caps Lock, E5 dead keys, E6
   graphemes, E7 paste + the server-side backstop, E8 dual-key, A03 long test.

## External dependencies

Unchanged and not blocking: live-keyboard layout confirmation, AltGr/dead-key
resolution, recorded fixtures on real keyboards, real-device spike numbers,
prototype usability test, Firefox/WebKit e2e, cloud accounts, professional legal
review, and the manual engine test (the owner's call at the end — the loop does
not wait for it, per STEER-1).

Branch protection is OFF **by owner decision** and is not to be raised again.

## What I got wrong this session

Logged in full in `docs/sessions/SESSION-6-REPORT.md`. In short: a PowerShell
`Set-Content -Encoding UTF8` corrupted a source file with a BOM and mojibaked
every em-dash (caught by reading the diff, reverted, redone); three of my own test
fixtures were wrong and the implementation was stricter than my assertions, one of
them passing for the wrong reason; one word-locked fixture was wrong and the
engine was right; and `check-ledger.mjs` turned out not to be importable at all.