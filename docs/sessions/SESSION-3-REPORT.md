# SESSION 3 REPORT — RealType

**Date:** 2026-09-28 · **Status:** Session 3 complete. Every block landed on a
branch, verified green in CI, and merged with `--no-ff`.

## Blocks

| Block | Outcome | Evidence |
|---|---|---|
| **A — pre-flight** | **DONE, one real defect found** | Clean worktree at 8b50e0d: install/lint/format/typecheck/test/build all green. **F1 REAL DEFECT: vitest discovered compiled tests in `dist/`** (telemetry 194 vs 97, engine 30 vs 29); fixed by pinning `include: tests/**`; proven non-vacuous (identical counts before/after build). Session 2's "30 engine tests" was wrong — true count 29. Coverage 98.45% and bundle 66.3 KB confirmed. 3 pr-log spot-checks match real merges. |
| **B — carried decisions** | **DONE** | Ch8 plateau: population SD decided; the chapter's claim fails under **both** variants (predicted 0.8333 vs pop SD 0.7714), so `WM-FIXTURE-009a/-009b` were constructed fresh and are unambiguous under both. levels-05 `;` drill: 15 targets + 14 anchors = 29 keystrokes. **New finding: §2.4's `@` illustration shows 6 targets against §2.2's 15-keystroke rule** — logged, human action. |
| **C — S4 + parity** | **BOTH DONE** | **S4:** real Tree-sitter WASM reproduces chapter 9 §9.2.1's token map exactly. Runtime 112.7 KB gzip + one grammar 55–79 KB (code mode ≈ 192 KB). Licences MIT + Unlicense — no blocker. Findings: the chapter's example string is syntactically incomplete; a naive `nodeType.includes("if")` classifier matches `identifier`. **Gate gap closed:** a `?url` .wasm import shipped 647 KB while the JS-only gate passed — the gate now fails on any WASM in the test-page build (proven red/green). **Parity:** `ENG-PARITY-01/02` — all 9 fixtures plus alignment/aggregation/finger-tagging identical in Node and Chromium (1e-9), running the engine's own compiled output on both sides. |
| **D — engine** | **D1 + D2 + D3 DONE** | D1: full §4.10 transition table + ENG-STATE-01..07 + ENG-STATE-PROP-01 (1,000 random sequences; state-set and `submitted`-only-via-`finished` invariants). D2: §4.11 alignment with the documented transposition rule + ENG-FIXTURE-H01/I01/I02/I03 + ENG-ALIGN-PROP-01 (~1,900 generated pairs with injected ground truth). D3: self-relative 3×-median outlier exclusion (185 ms / n=4, not the chapter's naive 388 / n=5) + layout-dependent finger tagging; unmapped layouts return "unknown" rather than a guess. Engine: 29 → 56 tests, coverage 95.8% stmts. Test-before-implementation ordering preserved on all three slices. |
| **E — close** | This file, BUILD-LOG, HUMAN-ACTIONS. | |

## Subagent diagnostic verdict

Three tiny isolated probes (list dirs / read one constant / one arithmetic
question) all completed correctly in a single round-trip. **The Session 2
`Provider response headers timed out after 300000ms` failures were provider-side
on the previous API** — not a runner timeout, task size, or model limit. Nothing
to configure; subagents are usable, subject to rule 11.

Rule 11 immediately earned its keep: probe C reported a predicted 14-day change
of −0.100 WPM against the script's −0.0500. Re-deriving by hand showed the x
values are day indices, so the fitted slope is already per-day and no unit
conversion applies — my recorded numbers stand, the probe's conversion was wrong.

## PHASE 0 RISK

1. **S4 / code-mode weight:** ~192 KB gzip (runtime + one grammar) on first
   load of the programmer track — roughly 1.5× the entire current test-page
   budget. Legitimately lazy-loadable and off the typing page, but a real cost
   to measure in the field in Phase 6, not a blocker.
2. **Latency margin unchanged from Session 2:** p95 15.2 ms against a *proposed*
   16 ms, on a minimal page, lab proxy. The human's `manual.html` run is still the gate.
3. **Grammar/runtime pairing is a runtime-only failure mode:** 0.27 refuses the
   prebuilt grammars (`need dylink section`); the working pair is
   `web-tree-sitter@0.25.10` + `tree-sitter-wasms@0.1.13`. Pinned; add a smoke
   test per shipped grammar in Phase 6.

## REAL-DEVICE PENDING (unchanged from Session 2)

S1 latency and S6 hidden-tab manual runs; real-keyboard fixtures from
`tools/fixture-recorder` (parity now runs on synthetic fixtures only until those
exist); all Track A validation.

## Process incidents (all logged in BUILD-LOG)

1. **Merged a red CI run** (Block A, format-check failure) — fixed forward.
2. **Committed S4 directly to main** with no merge commit — repaired
   append-only (branch fast-forwarded, pr-log + incident record added, then
   merged `--no-ff`); nothing force-pushed, no history rewritten.
3. **D3's first CI run was red** (unformatted committed test file) — caught
   before merging this time, fixed and re-run green.

## Next suggested run

1. **Remaining chapter-4 catalog items:** edge-case fixtures
   `ENG-FIXTURE-E-CAPS`, `E-DEADKEY`, `E-EMOJI`, `E-PASTE`, `E-DUALKEY`, plus
   A02 (very short), A03 (2,000+ characters, numeric precision), D02
   (stop-on-error), D03 (no-backspace/exam), D04 (word-locked).
2. **Wire the engine into apps/web** — the first real consumer, with the
   no-per-keystroke-React-state rule enforced by the caret/perf work.
3. **Re-run parity against real fixtures** once the human records some.
4. Nothing ships before the human's real-device spike runs and the Track A gate.

## Subagent diagnostic verdict

Three tiny isolated probes (list dirs / read one constant / one arithmetic
question) all completed correctly in a single round-trip. **The Session 2
`Provider response headers timed out after 300000ms` failures were provider-side
on the previous API** — not a runner timeout, task size, or model limit. Nothing
to configure; subagents are usable, subject to rule 11.

Rule 11 immediately earned its keep: probe C reported a predicted 14-day change
of −0.100 WPM against the script's −0.0500. Re-deriving by hand showed the x
values are day indices, so the fitted slope is already per-day and no unit
conversion applies — my recorded numbers stand, the probe's conversion was wrong.

## PHASE 0 RISK

1. **S4 / code-mode weight:** ~192 KB gzip (runtime + one grammar) on first
   load of the programmer track — roughly 1.5× the entire current test-page
   budget. Legitimately lazy-loadable and off the typing page, but a real cost
   to measure in the field in Phase 6, not a blocker.
2. **Latency margin unchanged from Session 2:** p95 15.2 ms against a *proposed*
   16 ms, on a minimal page, lab proxy. Human's `manual.html` run is still the gate.
3. **Grammar/runtime pairing is a runtime-only failure mode:** 0.27 refuses the
   prebuilt grammars (`need dylink section`); the working pair is
   `web-tree-sitter@0.25.10` + `tree-sitter-wasms@0.1.13`. Pinned; add a smoke
   test per shipped grammar in Phase 6.

## REAL-DEVICE PENDING (unchanged from Session 2)

S1 latency and S6 hidden-tab manual runs; real-keyboard fixtures from
`tools/fixture-recorder` (the parity harness needs them); all Track A validation.

## Process incidents (both logged in BUILD-LOG)

1. **Merged a red CI run** (Block A, format-check failure) — fixed forward.
2. **Committed S4 directly to main** with no merge commit — repaired
   append-only (branch fast-forwarded, pr-log + incident record added, then
   merged `--no-ff`); nothing force-pushed, no history rewritten.

## Next suggested run

1. **Finish the save-point merge** (steps above), then **D3**: per-key and
   per-bigram aggregation (§4.12) — outlier exclusion beyond ~3× the item's own
   median, hesitation-event counting, layout-dependent finger tagging, with
   `ENG-AGG-FIXTURE-01/-02` and `ENG-AGG-PROP-01`, test-first.
2. **ENG-PARITY-01/02** — every engine fixture through Node and Chromium,
   1e-9, once real fixtures exist.
3. Then Phase 1's remaining items; nothing ships before the human's real-device
   spike runs and Track A gate.
