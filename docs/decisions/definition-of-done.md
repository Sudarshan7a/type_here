# Definition of Done (RealType)

From the master spec / implementation guide (M0-11). A task is done when ALL of these are true — no exceptions for "just infrastructure":

1. **Reviewed diff** — small PR tied to one requirement ID; anyone reviewing can explain every line.
2. **Tests** — unit tests added with the change and green; e2e coverage where the change is user-visible; no test was weakened to make a build pass.
3. **Accessibility** — for UI changes: keyboard navigation, screen-reader labels, no color-only cues, reduced-motion respected (WCAG 2.2 AA).
4. **Performance budget** — input-to-paint p95 ≤ 16 ms on the typing surface (proposed threshold, calibration pending); bundle-size gate green.
5. **Metrics docs** — if any metric formula changed: `modelVersion` bumped and `/how-we-calculate` updated (requires human approval — Section 9 stop condition).
6. **Privacy review** — no typed content, keystroke logs, or personal data in analytics, error reports, logs, or URLs.
7. **Feature flag and rollback plan** — for user-facing changes: how to turn it off and how to roll back.
8. **Analytics events** — event names and properties on the allowlist only; no content in payloads.

Process rules (from WEEK-0-2-PLAN bounded autonomy):

- One task ID per run; branch per task; never commit to main.
- Stop and flag if: tests fail after 3 attempts, the change exceeds ~10 files, a dependency is needed, a spec conflict appears, or a metric/privacy/integrity/auth behavior would change.
- BUILD-LOG.md entry for every task: what changed, how verified, open questions, next suggested task.
