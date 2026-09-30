# SESSION 3 REPORT — RealType

**Date:** 2026-09-28 · **Status:** saved mid-slice, resumable. Branch
`task/s3-d1-state-machine` is green locally and pushed; **one mechanical step
remains (CI → merge)**. Block E is NOT closed.

## Save point — how to resume

Everything needed is committed and pushed. The next session should:

1. `git checkout task/s3-d1-state-machine && git pull`
2. Confirm CI green (the branch's run; see "Where each block stands")
3. `git checkout main && git merge --no-ff task/s3-d1-state-machine -m "Merge task/s3-d1-state-machine: D1 state machine + D2 alignment" && git push origin main`
4. Continue at **D3** (per-key/per-bigram aggregation, §4.12)

Nothing is uncommitted. No branch is mid-edit. The working tree was clean at
the moment of saving.

## Blocks

| Block | Outcome | Evidence |
|---|---|---|
| **A — pre-flight** | **DONE, one real defect found** | Clean worktree at 8b50e0d: install/lint/format/typecheck/test/build all green. **F1 REAL DEFECT: vitest discovered compiled tests in `dist/`** (telemetry 194 vs 97, engine 30 vs 29); fixed by pinning `include: tests/**`; proven non-vacuous (identical counts before/after build). Session 2's "30 engine tests" was wrong — true count 29. Coverage 98.45% and bundle 66.3 KB confirmed. 3 pr-log spot-checks match real merges. |
| **B — carried decisions** | **DONE** | Ch8 plateau: population SD decided; the chapter's claim fails under **both** variants (predicted 0.8333 vs pop SD 0.7714), so `WM-FIXTURE-009a/-009b` were constructed fresh and are unambiguous under both. levels-05 `;` drill: 15 targets + 14 anchors = 29 keystrokes, resolved. **New finding: §2.4's `@` illustration shows 6 targets against §2.2's 15-keystroke rule** — logged, unresolved, human action. |
| **C — S4 + parity** | **S4 DONE; parity harness NOT done** | S4: real Tree-sitter WASM reproduces chapter 9 §9.2.1's token map exactly. Sizes: runtime 112.7 KB gzip + one grammar 55–79 KB (code mode ≈ 192 KB gzip). Licences: MIT + Unlicense — no blocker. **Findings:** (1) the chapter's example string is syntactically incomplete; (2) a naive `nodeType.includes("if")` classifier matches `identifier` and misclassifies every identifier as a keyword. **Gate gap closed:** a `?url` .wasm import shipped 647 KB while the JS-only bundle gate passed — the gate now fails on any WASM in the test-page build (proven red/green). ENG-PARITY-01/02 (browser vs Node over every fixture) is **not started**. |
| **D — engine** | **D1 + D2 DONE; D3 not started** | D1: full §4.10 transition table + ENG-STATE-01..07 + ENG-STATE-PROP-01 (1,000 random sequences, state-set and ordering invariants). D2: §4.11 alignment with the documented transposition rule + ENG-FIXTURE-H01/I01/I02/I03 + ENG-ALIGN-PROP-01 (~1,900 generated pairs with injected ground truth). Engine: 29 → 47 tests, coverage 96.42/93.83/94.44/97.4. Test-before-implementation ordering preserved on both slices. |
| **E — close** | This file + BUILD-LOG + HUMAN-ACTIONS. | |

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
