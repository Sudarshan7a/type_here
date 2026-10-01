# SESSION 6 REPORT — RealType

**Date:** 2026-10-01 · Session 6. The first session driven by owner steering
(`docs/handoff/STEER-1.md` and `docs/handoff/STEER-2.MD`, the latter arriving
mid-session). Two real PRs, both merged with `--merge` after CI green.

## Section 1 gate check

`docs/handoff/` contained `STEER-1.md` and `STEER-2.MD` — no `HANDOFF-<n>.md` and
no `RESPONSE-<n>.md`, so state = **continue**, not AWAITING HUMAN. STEER files are
applied as top-priority changes and never halt the loop (Section 18.12).

## Baseline (clean `git worktree` at `7e75445`, before any edit)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Done in 9.4s |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm typecheck` | exit 0, all packages |
| `pnpm test` | exit 0 — **265 tests, 0 failures** (engine 78, telemetry 97, schemas 56, api 4, web 19, recorder 11) |
| `pnpm build` | exit 0 |
| `pnpm check:bundle` | 71.3 KB gzip of a 200 KB budget |
| `pnpm check:licenses` | no copyleft licenses in production dependencies |
| `pnpm check:ledger` | 216 rows, all statuses and tags valid |

Coverage: engine 96.21 / 93.17 / 95.23 / 97.46.

**No discrepancy with the previous session's figures.** BUILD-LOG claimed 265
tests; this session measured 265. The figures that had gone stale before
(Session 3's 232, Session 5's 258) were already corrected.

## Task 1 — the owner's question: 216 rows, 196 counted

**The 20 were never missing from the ledger. The report was dropping them.**

The ledger's counts table is correct and always was: `MVP 97 | V1 74 | V2 12 |
LATER 13 | UNTAGGED 20 | total 216`. What lost the 20 is the progress format
that Section 18.10 requires every session report, halt file and handoff to
print. Its slots are MVP / V1 / V2 / LATER / LAUNCH-GATED / BLOCKED-EXTERNAL /
REJECTED. There is no `UNTAGGED` slot, so every report printed
`97 + 74 + 12 + 13 = 196` beside `overall x/216`.

The 20, verified at source rather than assumed:

| Count | Rows | Evidence |
|---|---|---|
| 17 | `NFR-01`..`NFR-17` | `docs/spec/master-spec-v1.md` §8 is `\| ID \| Area \| Requirement (targets are proposals) \|` — **no tag column exists** |
| 3 | `INT-10`, `BIZ-06`, `RET-21` | The spec tags them literally: `**INT-10 [Policy]**`, `**BIZ-06 [Policy]**`, `**RET-21 [Policy]**` |

`UNTAGGED` is therefore the truthful tag, not a seeding gap. Labelling them MVP or
V1 would have meant inventing source metadata the spec does not contain, so it was
not done. `NFR-04`, `NFR-05` and `NFR-12` do carry `[V1]` markers, but inside
their requirement text for a sub-clause only.

**Fix, in two parts.** The format gains an `UNTAGGED` slot; and `check-ledger.mjs`
§7 now checks the **report**, which it had never done. It verifies every bucket
holding rows is counted, each denominator equals the ledger's count for that
family, denominators sum to the overall denominator, numerators to the overall
numerator, and the overall denominator equals the row count.

The gate could not see the defect before because it only ever inspected the
tracker — and the tracker was right. That is the whole lesson: a gate that
recomputes a document's internal consistency cannot catch a *consumer* of that
document being wrong.

Evidence (rule 6, bad case on the real files, not only fixtures):

```
BAD  gate vs the documents as they shipped -> exit 1, three findings:
  - UNTAGGED: 20 rows exist but the reported progress line does not count them
  - reported tag denominators sum to 196, but the line claims overall 216
  - the documented progress format has no UNTAGGED slot
GOOD gate vs the fixed documents          -> exit 0
```

Test-first: commit `6c1bb2f` is red in CI (run **36850614189 = failure**),
implementation `6059d6a` green (run **36852643188 = success**). 16 tests in
`scripts/check-ledger.test.mjs`, wired into CI.

## Task 2 — STEER-1: the errorMode contract bump

`CONTRACT_VERSION` 1.2.0 → **1.3.0**, `no-backspace` (D03) + `word-locked` (D04).

**Every consumer that validates the enum, updated in the same change.** The
hand-written unions were *deleted* rather than extended — `text-model.ts`,
`metrics.ts`, `fixtures/helpers.ts` and `capture.ts` now derive `ErrorMode` from
`@realtype/schemas`, so a mode added to the contract and forgotten downstream is
a typecheck error, not a runtime surprise.

Telemetry has no dependency on schemas and could not derive the type, so
`packages/telemetry/tests/enum-drift.test.ts` pins `ERROR_MODES` to
`ErrorModeSchema.options` exactly and in order, and likewise `MODES` and
`LAYOUTS`. **This drift had already happened once inside this very change** — I
widened the schema and nearly shipped a telemetry allowlist still carrying three
modes. No gate would have caught it.

**D04 word-locked implemented** per `ENG-FIXTURE-D04`. Both halves of the spec
sentence are honoured, and the mode is deliberately *not* must-correct: a wrong
character inside a word is kept and visible, Backspace keeps working, and the
caret is held at the word boundary until the word matches. The last word of a
text with no trailing space is locked by the same rule.

Tests: schemas 56 → 69 (all five modes in bare settings *and* in a full InputLog,
unknown mode still rejected, and **four backward-compatibility tests** proving a
1.2.0 log still parses, is not coerced or stripped, and that `engineVersion
"1.2.0"` is still accepted); engine 78 → 84; telemetry 97 → 101.

Non-vacuity: deleting `word-locked` from telemetry's `ERROR_MODES` fails one
test; restoring it passes 101.

## Mistakes found in my own work

Recorded plainly, because the verification rules exist to catch exactly these.

1. **A PowerShell `Set-Content -Encoding UTF8` corrupted a source file.** It wrote
   `check-ledger.mjs` with a BOM and mojibake'd every em-dash (`—` → `â€”`).
   Caught by reading the diff. The file was reverted and redone with
   encoding-safe edits only. Verified after: no BOM, 6 em-dashes intact, 0
   mojibake, and `git diff -w` shows the change is purely additive apart from one
   import line. **Lesson: do not rewrite source files with PowerShell here.**
2. **Three of my own gate fixtures were wrong, and the implementation was
   stricter than my assertions.** `97+74+12+13+25` is 221, not 220 — so the sum
   check correctly stayed silent and my `expect(problems.length).toBe(3)` was
   wrong. Worse: one numerator fixture used `MVP 4/97 | V1 1/74 … overall 5/216`,
   where `4 + 1` *happens* to equal the claimed 5, so the test passed for the
   wrong reason and would have let a genuinely wrong numerator through. Both
   corrected; both now pinned by name.
3. **One word-locked fixture was wrong and the engine was right.** I read `cat` as
   taking four presses and expected a fourth character inside the word. It takes
   three, so the fourth press is already leaving it and the engine correctly
   refused it. Tests corrected, not the implementation. A duplicate test block
   left behind by that edit was also removed.
4. **`check-ledger.mjs` was not importable.** It ran its gate at module load and
   called `process.exit`, so the test file could not import the functions at all.
   Wrapped in `main()` behind the same `import.meta.url` guard
   `check-licenses.mjs` already uses.

## Phase exit criteria status

Phase 1 (Core Engine and Metrics) — **unchanged, still open.** `ENG-03`'s
blocker is now gone, but its D03/D04 fixtures are not written, so no status
changed. Next in the owner's stated order: D03 + D04 fixtures, then the F3/F2/F1
dev-script defects (STEER-1: before Phase 4), then the STEER-2 typing surface.

## Verification at session close

| Command | Result |
|---|---|
| `pnpm lint` | exit 0 |
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | exit 0 — **288 tests, 0 failures** (engine 84, telemetry 101, schemas 69, api 4, web 19, recorder 11) |
| `pnpm build` | exit 0 |
| `pnpm check:bundle` | 71.3 KB gzip of a 200 KB budget |
| `pnpm check:licenses` | pass |
| `pnpm check:ledger` | 216 rows, valid |
| `node --test scripts/check-ledger.test.mjs` | 16/16 |

**288 unit tests + 16 script tests = 304**, up from 265. CI: PR #1
36850614189 (red, intended) + 36852643188 (green); PR #2 36858729219 (green).

Coverage: engine 96.21 / 93.17 / 95.23 / 97.46.

## External dependencies

Resolved by the owner this session: the `errorMode` contract decision, the retest
cadence (day 0/30), branch protection (ACCEPTED BY OWNER, OFF, not to be raised
again), and `gh` install/authentication (real PRs now in use).

Still open in `HUMAN-ACTIONS.md`, unchanged: live-keyboard layout confirmation,
AltGr/dead-key resolution, recorded fixtures, real-device spike numbers, prototype
usability test, Firefox/WebKit e2e, cloud accounts, legal review, and the manual
engine test (the owner's call at the end — the loop does not wait for it).
**None of these stopped this session.**

## Halt condition

**H3 — budget pause.** Not H1: `check:ledger` reports 19 IN PROGRESS and 191 NOT
STARTED, so the program is nowhere near complete. Not H2: three progress events
landed (a documentation defect fixed with a permanent gate, a public contract
change with full back-compat tests, and six latent-drift blind spots closed).
Not H4: nothing destructive, legally or financially consequential occurred.

Halt file: `docs/halt/HALT-H3-1.md`.

## Browser bridge

Not used this session. Both tasks were backend/contract/gate work with no UI
surface to inspect (Section 16.2: "Do not use it for backend-only or engine-only
tasks"). It becomes mandatory at the STEER-2 typing-surface slice and at the
pre-gate pass; Playwright is the fallback. Status: **not yet checked**.

## Ledger counts

    MVP 5/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 |
    LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 5/216

(19 IN PROGRESS, 191 NOT STARTED. No row changed status this session — the work
was gates, contracts and the engine's word-locked mode, and the ledger rule is
that partial work is not marked verified.)

`[RULES BROKEN]`: none. Two standing rules were stretched rather than broken and
both are logged above: the Section 18.10 report format was extended with an
`UNTAGGED` slot (recorded as an autonomous decision, because the format as
written cannot satisfy its own "no percentage that is not computed from the
ledger" rule); and only `BUILD-LOG.md`'s "Current Position" is gate-checked for
its progress line, not historical session reports.