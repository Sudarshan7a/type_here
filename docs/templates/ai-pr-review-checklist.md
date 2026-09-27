# AI Pull Request Review Checklist

**PR:** ______   **Task ID / requirement IDs:** ______   **Reviewer:** ______   **Date:** ______

Read the **tests first**, then the implementation.

1. [ ] **Scope:** only the task; <= ~10 files; no drive-by changes
2. [ ] **Tests:** new tests fail without the change; none weakened, skipped, or deleted; fixtures still pass
3. [ ] **Spec:** `/spec-check` run; acceptance criteria met
4. [ ] **Rules:** no per-keystroke UI state; no typed content in analytics/errors; no copied GPL/AGPL; no code execution
5. [ ] **Dependencies:** any new package justified, licensed, maintained
6. [ ] **Failure handling:** offline, bad input, partial failure, timeouts
7. [ ] **Accessibility/motion:** keyboard, focus, reduced motion, non-color cues
8. [ ] **Data:** migrations safe; retention respected; events allowlisted
9. [ ] **Clarity:** names and structure understandable
10. [ ] **Security:** validation, authorization, rate limits, injection
11. [ ] **Explainable:** I can explain the diff (or the AI explained it clearly)
12. [ ] **Rollback:** feature flag or clean revert
Decision: Merge / Send back / Split. Notes: ______

## Weekly independent audit (second reviewer)
- Module audited: ______ (rotate: metrics library, submission/verification, privacy jobs, results page, level engine)
- Reviewer (different model or human): ______
- Discrepancies vs spec: ______
- Defects found / fixed / deferred: ______
- Tests added: ______

## Test-the-tests (monthly)
Introduce a deliberate bug in a safe branch; confirm at least one test fails. Record result: ______

## Quality dashboard (weekly)
Open bugs by severity · escaped defects · flaky tests · latency p50/p95 · INP/LCP/CLS at p75 · accessibility issues open · engine coverage · dependency alerts · time to fix S1/S2.
