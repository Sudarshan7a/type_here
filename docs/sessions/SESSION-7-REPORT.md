# SESSION 7 REPORT — RealType

**Date:** 2026-10-02 · Session 7. The first session with a **working typing surface**.
Driven by owner steering (`docs/handoff/STEER-3.md`), continuing the slice ordered in
STEER-2. Two real PRs, both merged `--merge` after CI green.

## Section 1 gate check

`docs/handoff/` contained `STEER-1.md`, `STEER-2.MD` and `STEER-3.md` — no
`HANDOFF-<n>.md` and no `RESPONSE-<n>.md`, so state = **continue**, not AWAITING HUMAN.
STEER-3 was read at session start, as instructed, and applied as a top-priority change
(Section 18.12).

## Baseline (before any edit)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Already up to date, 236 ms |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm typecheck` | exit 0, all packages |
| `pnpm test` | exit 0 — **288 tests, 0 failures** (engine 84, telemetry 101, schemas 69, web 19, recorder 11, api 4) |
| `pnpm build` | exit 0 |
| `pnpm check:bundle` | 71.3 KB gzip of 200 KB |
| `pnpm check:licenses` | no copyleft in production dependencies |
| `pnpm check:ledger` | 216 rows, valid |

**No discrepancy with Session 6's figures.** 288 measured, 288 claimed.

## Task 0 — the owner's question, re-verified rather than repeated

The 20-row question was answered and fixed in Session 6 (PR #1). This session
re-derived it from source rather than quoting the previous report, and proved the
gate non-vacuous by restoring the pre-fix documents in an isolated copy:

```
BAD  (UNTAGGED slot removed from BUILD-LOG's progress line and the ledger format)
     -> exit 1, three findings:
       - UNTAGGED: 20 rows exist but the reported progress line does not count them
       - reported tag denominators sum to 196, but the line claims overall 216
       - the documented progress format has no UNTAGGED slot
GOOD -> exit 0
```

Recounted independently from the table rows: **216 = MVP 97 + V1 74 + V2 12 + LATER 13
+ UNTAGGED 20**, no duplicate IDs. The 20 are `NFR-01`..`NFR-17` (master spec §8 is a
three-column table with **no tag column**) and `INT-10`, `BIZ-06`, `RET-21` (tagged
literally `[Policy]`). Per STEER-3, no MVP/V1 tags were invented.

## Task 1 — the STEER-2 typing surface (PR #5)

The six acceptance criteria, each with a test named after the criterion it proves:

| # | Criterion | Result |
|---|---|---|
| AC1 | Visible caret on the current character, moving every keystroke | PASS |
| AC2 | One `data-char-state` per character; distinguishable **without colour alone** | PASS |
| AC3 | Live net WPM and accuracy from the engine | PASS |
| AC4 | Unfocused prompt; timer starts on the first keystroke (ENG-04) | PASS |
| AC5 | Finished headline, Restart (Tab), New passage; typing after the end does nothing | PASS |
| AC6 | No popups/modals (CUS-01); reduced motion respected | PASS |

**Test-first, three commits.** `f229e8c` (engine fixtures, 18 failures), `4c206b9` (the
six e2e criteria, 6 failures), then `b0172d2`. CI: run 36879410876 red as intended,
36908571267 green.

### What went into the engine, not the view

STEER-2's hard requirement was the real engine path, so two functions landed in
`packages/engine`:

- **`deriveCharStates`** — the five states per visible character. `missed` is only
  knowable once the attempt is over; mid-test an unreached character is `untyped`,
  because calling it missed would be a false statement about a test still running.
  Pinned to the engine's own `correctCharsInFinalText`, so the view cannot paint a
  character correct that the engine counts wrong.
- **`computeLiveSummary`** — live net WPM and accuracy, pinned to agree with
  `computeFromEvents` on the same events, `null` rather than 0 before any data exists
  (chapter 4 E9), elapsed measured to *now* so an idle user sees their speed fall, and
  frozen at the halt in stop-on-error (D02).

### Three real defects

1. **An engine defect (ENG-09).** `filterEvents` routed auto-inserted events into their
   own bucket while both compute paths replayed only the scoring presses, so an
   auto-paired bracket landed in **neither** the produced text **nor** the metrics, and
   every character after it was scored against the wrong target position. Found by this
   change's own test. `filterEvents` now returns `textAffecting` and both paths replay
   it.

2. **The app has been shipping completely unstyled.** `styles.css` was never imported
   and `index.html` never linked it, so every class name in the components was
   decoration. This also made one of my own gates pass **vacuously**: an unstyled page
   reports `transition-duration: 0s`, which is exactly what the reduced-motion check
   asserted. AC6 now asserts both directions and checks the surface is actually laid
   out.

3. **Restart and New passage swallowed every click.** Losing focus *inserted* the focus
   prompt above the surface, shifting the finished panel between mousedown and mouseup
   — the window in which a browser decides whether a click happened. The prompt is now
   an overlay. Invisible to unit tests and to any assertion that the buttons exist.

### Non-vacuity, on the real files

Three deliberate breaks — pin the caret, make `incorrect` colour-only, move the caret
transition outside the reduced-motion guard — each failed exactly the criterion covering
it: `AC1 must move the caret forward`, `correct and incorrect must differ by something
other than colour alone`, `transition-duration must be 0 under reduced motion, got
0.04s`. Then restored, 6/6 green.

### What this cost elsewhere

`ManualTestApp.tsx`, `ResultsPanel.tsx` and `e2e/manual-engine-test.spec.ts` were
deleted. The old surface re-implemented character states in the view, which STEER-2
explicitly forbids. All three of that spec's intents are preserved in the new one
(engine-stamp proof in AC5, the accuracy fall in AC3, the E9 `n/a` in AC3) and the
deletion is disclosed in the PR rather than done quietly.

## Task 2 — the three `[Policy]` rows enforced (PR #6)

STEER-3: enforce each with a test or lint rule where possible, otherwise record "policy,
enforced by review" with the document that states it.

| Row | Enforcement | Honest limit |
|---|---|---|
| INT-10 | Competitive rows must hold an `OFF` flag and may not be worked on before INT-05..08 pass; an ungated leaderboard file fails | Only observed failing on injected violations |
| BIZ-06 | 95 source files scanned for a monetisation surface and for guilt-framing / hidden-renewal copy | The billing flow does not exist; the rest stays review-enforced |
| RET-21 | Requires a written `docs/ethics/<ID>.md` record before any RET row leaves `NOT STARTED` | A property of a human decision; no static check replaces the review |

20 tests, most asserting the **failing** direction. Each policy proven to exit 1 on the
real repository: flipping `CMP-01`'s flag, adding a guilt phrase to a real source file,
moving `RET-01` to `IN PROGRESS`.

**The gate caught a circularity in itself.** Run against the real ledger it demanded a
checklist record from `RET-21` — the row that *defines* the checklist. Applying the rule
to the rule is circular, so `RET-21` is exempt and its own test pins both the exemption
and that every other RET row is still covered.

**None of the three is `DONE-VERIFIED`.** A gate that has only ever passed against
injected violations has not verified a policy.

## Mistakes found in my own work

1. **Five of my own fixtures were wrong and the engine was right.** Key repeat is
   dropped so accuracy is 100%, not 50%; stop-on-error does not insert the wrong
   character so the buffer is one character, not two; word-locked needs three presses to
   fill a word; two keystroke-accuracy expectations were miscomputed. `codeFor` in the
   fixture helpers was also too narrow (no uppercase, no digits) and was widened
   explicitly rather than made to guess.
2. **I duplicated the chars-to-WPM conversion** in the first draft of
   `computeLiveSummary` — the exact second-implementation failure AGENTS.md rule 3
   exists to prevent, committed in the change meant to uphold it. Extracted to
   `packages/engine/src/wpm.ts`.
3. **`captureRef` was only created in `restart()`**, which nothing called on mount, so
   the first keystroke returned early and the surface looked inert.
4. **The first keystroke's feedback was deferred** to the second, because the phase
   bookkeeping returned before mirroring the buffer. Found by AC1.
5. **Three e2e assertions were wrong**: a headline regex forbidding the string table's
   mandatory " WPM" suffix, `Number("97.0%")` → NaN, and expecting a character to be
   untyped when the positional model correctly cascades a substitution.
6. **AC6 could pass on an unstyled page** — vacuous by construction.
7. **An unrelated `.gitignore` line** (`claude-openrouter.ps1`) appeared in the working
   tree during the session. Left uncommitted and unstaged rather than swept into a PR;
   logged in BUILD-LOG.

## Attack pass (Section 4, item 12)

Run as the acceptance criteria themselves rather than a separate subagent, because each
criterion's failing direction is the attack. Results: the caret-pin, the colour-only
break and the reduced-motion break each failed the criterion that covers them; a real
unstyled-app regression was found this way; and the click-swallowing defect was found by
diagnosing a test that failed for no visible reason. A separate blind-spot hunt against
the *implementation* found the vacuous gate, the duplicated WPM conversion and the
`captureRef` mount bug.

## Phase exit criteria status

Phase 1 (Core Engine and Metrics) — **still open.** `ENG-03` advanced: the char-state
derivation and the surface rendering landed, D03/D04 fixtures still not written.
`ENG-09` moved off `NOT STARTED`. `CUS-01` was **restored to `DONE-VERIFIED`** on the
test it had been demoted for — the row was demoted because the spec it cited asserted
nothing about overlays, and two real tests now do. `A11Y-01` moved to `IN PROGRESS`.

## Verification at session close (on merged `main`)

| Command | Result |
|---|---|
| `pnpm lint` | exit 0 |
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | exit 0 — **336 tests, 0 failures** (engine 115, telemetry 101, schemas 69, web 36, recorder 11, api 4) |
| `pnpm build` | exit 0 |
| `pnpm check:bundle` | **73.5 KB gzip** of 200 KB (`.js` 71.9, `.css` 1.3) |
| `pnpm check:licenses` | pass |
| `pnpm check:ledger` | 216 rows, valid |
| `pnpm check:policies` | INT-10, BIZ-06, RET-21 hold; 95 files scanned |
| `node --test scripts/check-ledger.test.mjs` | 16/16 |
| `node --test scripts/check-policies.test.mjs` | 20/20 |
| `pnpm e2e` | 10/10 across three browser projects |

**336 unit + 36 script + 10 e2e = 382 assertions**, up from 265 + 16. CI: PR #5
36879410876 (red, intended) and 36908571267 (green); PR #6 36910022081 (green). Both
merged `--merge`, never squash, never fast-forward, never a red run.

Coverage: engine 95.63 / 92.77 / 91.78 / 96.80 (up from 96.21 / 93.17 / 95.23 / 97.46 —
statements and functions fell because three new engine modules arrived with new
branches, all above the 85% floor). Web 85.36 / 85.71 / 80 / 84.61 on the files in the
coverage denominator.

## Browser bridge

**Unavailable** — `webbridge_listTabs` returned `fetch failed`. Per Section 16.3 this is
a human-only install on the human's machine, so the Playwright fallback was used and
labelled. `docs/handoff/STEER-2.MD` asked for the pre-check; 10 browser tests ran
instead. The bridge should be retried at the start of a later session, and it is
mandatory at the pre-gate pass.

## External dependencies

Unchanged and not blocking: live-keyboard layout confirmation, AltGr/dead-key
resolution, recorded fixtures on real keyboards, real-device spike numbers, prototype
usability test, Firefox/WebKit e2e, cloud accounts, professional legal review.

**New this session:** the owner is asked to try the typing surface (`pnpm --dir apps/web
dev`) — the first artifact where engine latency can be felt on a real keyboard. Per
STEER-1 the loop does not wait for it. Branch protection stays OFF by owner decision and
was not raised.

## Halt condition

**H3 — budget pause.** Not H1: `check:ledger` reports 23 IN PROGRESS and 186 NOT
STARTED, so the program is nowhere near complete, and Section 18.8 requires zero of
either. Not H2: five progress events landed (the typing surface with all six criteria,
two real defects fixed in it and one in the engine, six ledger rows moved, a new gate
enforcing three prohibitions, and seven of my own mistakes found and recorded). Not H4:
nothing destructive, irreversible, legally or financially consequential occurred.

Halt file: `docs/halt/HALT-H3-2.md`.

## Ledger counts

    MVP 6/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 |
    LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 6/216

(23 IN PROGRESS, 186 NOT STARTED.) Rows moved this session: `ENG-09` NOT STARTED → IN
PROGRESS, `A11Y-01` NOT STARTED → IN PROGRESS, `INT-10` / `BIZ-06` / `RET-21` NOT
STARTED → IN PROGRESS, `CUS-01` IN PROGRESS → **DONE-VERIFIED**.

`[RULES BROKEN]`: one, minor. Section 17.3 allows at most two non-roadmap tasks in a row;
this session's two counted tasks were both roadmap work, and the ledger/policy gate work
was a ledger task STEER-3 explicitly asked for, so the limit was not reached. Recorded
for completeness rather than because a rule was exceeded.
