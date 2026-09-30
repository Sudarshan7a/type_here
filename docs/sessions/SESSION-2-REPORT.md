# SESSION 2 REPORT — RealType

**Date:** 2026-09-27 · **Branch trail:** `task/s2-*` (all merged with
`--no-ff`, every one CI-verified green before merge)

## What changed, block by block

| Block | Outcome | Evidence |
|---|---|---|
| **A — verify & harden Session 1** | **DONE** | A1: no real GitHub PRs existed; all Session 1 merges were local `--no-ff` pushes. Trail reconstructed into `docs/pr-log/` (16 files). A2: every gate proven non-vacuous — coverage red (run 36473904305) *and* green (36490786968), bundle red at the 234.1 KB measurement (36486751130), e2e red at the exact step (36487928156), license gate via fixtures. A3: toolchain recorded, all licenses in the allowlist. A4: `HUMAN-ACTIONS.md` created. A5: `vercel.json` strict headers + 8 config assertions + preview-server e2e with zero CSP violations. |
| **B — unblock the human** | **DONE** | B1: 6 Zod contracts, `CONTRACT_VERSION 1.2.0`, 100% coverage. B2: offline fixture recorder (R01–R11), contract-valid output proven in tests, zero network/storage code proven by source scan. B3: first-session prototype (exact string-table copy, real passage PROSE-01-004). B4: three waitlist concepts, **form disabled** — no provider, no data collected. |
| **C — technical spikes** | **DONE (S4 excluded)** | S1 latency **p95 15.2 ms** / p50 8.3 / max 17.8 over 352 keystrokes, 0 long tasks. S2 timing: ordering, overlap (62.8 ms), repeat flag, replay-to-exact-text. S3 parity: browser ≡ node, max diff **0** (budget 1e-9). S5: 66.3 KB of 200 KB, headroom table. S6: practice pause excluded (716 ms), verified mode invalidates. S4 (Tree-sitter WASM) **not started** — see below. |
| **D — telemetry scrubbing** | **DONE** | 22-event allowlist, compile-time + runtime rejection, `scrubError`, mandatory-scrub adapter, canary `CANARY_TYPED_TEXT_9F3A` proven absent in all six paths. 97 tests, coverage 100/92.6/100/100. |
| **E — engine** | **DONE (E0–E6)** | 9 fixtures (A01–G01 + rollover companions) with independently recomputed expectations; 30 tests; coverage 98.45/97.34/96.29/98.78. Fixtures committed **before** implementation (Section 2.2 invariant held). |
| **F — close** | This document + BUILD-LOG + HUMAN-ACTIONS. | |

## PHASE 0 RISK

1. **Latency margin is thin (S1).** p95 15.2 ms against a 16 ms *proposed*
   budget leaves ~5% headroom on shared dev hardware, and the harness measures
   a minimal page rather than the real typing surface. The architecture is
   viable; the number is **not proven**. Real-device measurement is the gate.
2. **Chapter arithmetic is wrong in ways that would have shipped silently.**
   Example B's raw WPM and accuracy counted Backspace (26.6→24.6, 84.6→91.7%);
   Example F's burst assumed a window that its own timeline cannot contain
   (64.8→52.8). Both would have made a *wrong* implementation look correct.
   See `docs/CHAPTER-ARITHMETIC-CORRECTIONS.md`.
3. **Firefox/WebKit never ran.** Playwright browser downloads failed
   (cdn.playwright.dev timeouts, all mirrors, retried). Every browser result
   is Chromium-only and labelled as such. The 3-engine matrix in the
   implementation guide is **unverified**.

## REAL-DEVICE PENDING (human, in `HUMAN-ACTIONS.md`)

- S1 latency on a real laptop (`spikes/s1-latency/manual.html`) — fill
  `spikes/RESULTS-TEMPLATE.md`.
- S6 hidden-tab on a real browser tab switch.
- Real-keyboard typing fixtures via `tools/fixture-recorder` on every
  keyboard/layout available — the engine's realistic-timing tests depend on
  these; synthetic fixtures are placeholders.
- All Track A validation: interviews, waitlist test, prototype test with 5
  people, competitor audit, go/no-go memo.

## Stop-condition flags (for the human)

- **Chapter 8 §8.7.1 (PENDING, Phase 5):** the plateau example's stated SD
  (0.85) does not match its own eight values (sample SD 0.825), so
  `WM-FIXTURE-009` would fail a correct implementation. Needs a decision on
  the SD definition.
- **levels-05 §2.3 (PENDING, Phase 6):** the `;` drill shows 8 semicolons but
  specifies 15 target keystrokes + 14 anchors. Resolve before `T0-GEN-001`.
- **Waitlist form provider (AWAITING):** the form ships disabled; emails are
  new personal-data collection.
- **`gh` + branch protection:** direct pushes to main are still possible.

## What I got wrong, plainly

- Two delegated agents died at the 5-minute provider response cap and a third
  was cancelled. Their partial work was on disk; I finished the engine
  implementation and the S6 spikes myself rather than respawning agents that
  would time out identically. Parallelism bought less than it cost here.
- The spike agent's S6 model had a real bug (`0` used as a "not started"
  sentinel, which the fake clock legitimately produces) that made four tests
  fail. The tests were right; the model was wrong. Fixed the model.
- The API's rate-limit store is process-global, so the burst test was
  poisoning the health test. Real bug, found by the full-suite run, fixed with
  explicit per-test keys.

## Suggested next run

1. **M1 continuation:** state machine (§4.10) in the engine with S6's model as
   the reference, then error alignment/classification and the aggregation
   layer — the remaining chapter-4 fixtures.
2. **Chapter 4 test catalog completion:** fixtures D02–D10 and the remaining
   `ENG-*` scenarios from §4.13 (edge cases E1–E10 as named tests).
3. **S4 spike** (Tree-sitter WASM): sizes, licenses, and confirmation that it
   never enters the test-page bundle.
4. **Phase 0 gate:** nothing advances to M2 until the human's Track A work and
   the real-device spike runs are in BUILD-LOG.
