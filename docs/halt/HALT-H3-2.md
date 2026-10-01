# HALT-H3-2 — budget pause (Session 7)

**Type:** H3 (budget pause, Section 11 / Section 18.9). **Not** H1 and **not** H2.
**Date:** 2026-10-02 · Session 7 · commits `f6f503d` (PR #5) and `d27fc47` (PR #6) on `main`
**Driver:** re-launch on H3. The program continues.

## Ledger counts (Section 18.10)

    MVP 6/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 |
    LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 6/216

23 IN PROGRESS, 186 NOT STARTED, 216 rows total.

## Ledger rows moved this session

| Row | From | To | Why |
|---|---|---|---|
| `CUS-01` | IN PROGRESS | **DONE-VERIFIED** | Restored on the test it was demoted for. AC6 and the SSR test now query the live and server-rendered markup for `dialog`, `[role=dialog]`, `[role=alert]`, `[role=alertdialog]`, `[popover]`, `.modal`, `.popup`, `.toast` and `.tooltip` and require the list to be empty |
| `ENG-09` | NOT STARTED | IN PROGRESS | An engine defect was found and fixed: auto-inserted characters reached neither the produced text nor the metrics |
| `A11Y-01` | NOT STARTED | IN PROGRESS | Non-colour cues, reduced motion, the accessible name, one polite live region and 24px targets now ship with the surface, asserted on computed style |
| `INT-10` | NOT STARTED | IN PROGRESS | Enforced by `scripts/check-policies.mjs` |
| `BIZ-06` | NOT STARTED | IN PROGRESS | Partially enforced by the same gate; the billing-flow half stays review-enforced |
| `RET-21` | NOT STARTED | IN PROGRESS | Policy, enforced by review — now made non-skippable by requiring a written record |

The three policy rows were deliberately **not** marked `DONE-VERIFIED`. A gate that has
only ever passed against injected violations has not verified a policy.

## Counted tasks (Section 17.2)

A task counts only if it moves a ledger row's status or adds its tests. Both qualify.

| # | Task | PR | Ledger rows moved | Tests added |
|---|---|---|---|---|
| 1 | The STEER-2 typing surface on the real engine path | #5 | CUS-01, ENG-09, A11Y-01, ENG-02, ENG-03 (notes) | 62 |
| 2 | The three `[Policy]` rows enforced by a gate | #6 | INT-10, BIZ-06, RET-21 | 20 |

Two counted tasks, above the `[SET: 5]` floor's absence but **below** it in count.
Section 17.2 says not to write an H3 file before five counted tasks. That floor was not
met and is recorded here rather than glossed: this session's budget went on the typing
slice the owner ordered as the session's first and only priority, and on the work that
slice turned up — three defects, two of them pre-existing and invisible to any gate,
including one that had left the entire app unstyled since it was first written. Five
would have meant either rushing the slice or padding with tasks the owner explicitly
deprioritised ("no more gate, ledger-tooling or report-format work until the slice runs").
The shortfall is disclosed rather than papered over.

## Progress events (Section 6)

1. **The typing surface exists and all six STEER-2 acceptance criteria pass**, each with
   a test named for the criterion it proves, and non-vacuity demonstrated on the real
   files.
2. **An engine defect fixed** (ENG-09): auto-inserted characters were in neither the
   produced text nor the metrics, so every character after an auto-pair was scored
   against the wrong target position.
3. **A pre-existing defect fixed**: the app has been shipping completely unstyled since
   it was first written, which had left one of my own gates passing vacuously.
4. **A pre-existing UX defect fixed**: the finished panel's Restart and New passage
   buttons swallowed every click, because losing focus inserted a block above them
   between mousedown and mouseup.
5. **A gate added** for three prohibitions that previously had nothing behind them, with
   each proven to fail on the real repository.
6. **Seven of my own mistakes found and recorded**, including a metric conversion I
   duplicated inside the change written to prevent exactly that.

## Verification at close (on merged `main`)

    pnpm lint                           0
    pnpm format:check                   clean
    pnpm typecheck                      0
    pnpm test                           0 — 336 tests, 0 failures
    pnpm build                          0
    pnpm check:bundle                   73.5 KB gzip / 200 KB budget
    pnpm check:licenses                 pass
    pnpm check:ledger                   216 rows, all statuses and tags valid
    pnpm check:policies                 INT-10, BIZ-06, RET-21 hold; 95 files scanned
    node --test scripts/check-ledger.test.mjs    16/16
    node --test scripts/check-policies.test.mjs  20/20
    pnpm e2e                            10/10 across three browser projects

336 unit + 36 script + 10 e2e. CI: PR #5 runs 36879410876 (red — the test-first commit,
intended) and 36908571267 (green); PR #6 run 36910022081 (green). Both merged `--merge`.

## Evidence labels — what is and is not claimed

Everything about the typing surface is **LAB PROXY (browser-inspected)**. The
Kimi WebBridge was unavailable this session (`webbridge_listTabs` → `fetch failed`), so
Section 16.3's Playwright fallback was used. That is synthetic input through a browser:
it does not exercise the OS keyboard layout, IME, dead keys, Caps Lock or physical key
positions. No `REAL-DEVICE CONFIRMED` evidence is claimed anywhere.

Input-to-paint p95 in the new surface is **still unmeasured** (ENG-02, NFR-01). The
surface is built so it *can* be measured — no React state per keystroke, one
rAF-batched DOM write, offsets cached rather than read per keystroke — but built is not
measured, and the lab proxy to beat is 15.2 ms against a 16 ms budget.

## Exact next tasks

1. **`ENG-FIXTURE-D03` and `ENG-FIXTURE-D04`.** Unblocked since PR #2 and still the
   cheapest executable work. Per the arithmetic protocol the expected numbers must be
   recomputed independently from the master-spec §6.1 formulas by a script importing
   nothing from `packages/engine`, before the fixture is written.
2. **F3 / F2 / F1-F9, the dev-script defects.** F3 is the one that matters most now:
   `pnpm dev` reports success with a dead API when port 3000 is busy, and that is the
   exact command the owner has been asked to run to try the surface.
3. **Measure input-to-paint in the real surface** (ENG-02 / NFR-01). The product surface
   now exists, so the 16 ms budget can finally be measured against something real rather
   than a spike page.
4. Then the rest of the Chapter 4 edge fixtures: E3 Caps Lock, E5 dead keys, E6
   graphemes, E7 server plausibility backstop, E8 dual-key, A03 long test.

## External dependencies

Unchanged and not blocking: live-keyboard layout confirmation, AltGr/dead-key
resolution, recorded fixtures on real keyboards, real-device spike numbers, prototype
usability test, Firefox/WebKit e2e, cloud accounts, and professional legal review.

**New:** the owner is asked to try the typing surface — `pnpm --dir apps/web dev`, then
type the passage. Per STEER-1 the loop does not wait for it, and HUMAN-ACTIONS.md names
exactly what to look for and why "felt fine" is not evidence either way when the budget
is 5% under target.

The Kimi WebBridge is a **human-only install on the human's machine**. It is
mandatory at the pre-gate pass (Section 16.7) and should be retried at the start of a
later session; until then the Playwright fallback stands.

Branch protection is OFF **by owner decision** and is not to be raised again.

## What I got wrong this session

Logged in full in `docs/sessions/SESSION-7-REPORT.md`. In short: five of my own test
fixtures were wrong and the engine was right in every case; I duplicated the
chars-to-WPM metric conversion inside the very change written to prevent that; the
capture was never created on mount so the surface looked inert; the first keystroke's
feedback was deferred to the second; three e2e assertions were wrong; one of my own
gates could pass on an unstyled page; and my new policy gate demanded that `RET-21`
satisfy its own rule. Every one was found by a test or a gate rather than by reading the
code, which is the only reason they are found at all.
