# Merge trail finding (Session 2, Block A1)

**Question:** how were the Session 1 slices merged, and do real pull requests exist?

**Finding:** No real GitHub pull requests exist. The `gh` CLI was never installed (no admin auth), so every Session 1 slice was merged locally with `git merge --no-ff` and pushed to main (protocol ADR-001 in `docs/decisions/decision-log.md`). The git graph confirms real merge commits with two-parent topology for all 14 merges — history is readable, but the per-PR review artifact (PR description, review record) never existed on GitHub.

**Branch-level CI gating existed only from `task/p0-m0-05b` onward.** Earlier slices (docs-import, M0-02, M0-03, M0-04a-d, M0-05) were merged on local gates (lint/typecheck/test/build) alone, because the CI workflow did not exist until M0-05 and only ran on all branches from M0-05b. Every slice from M0-10a onward has a green branch CI run recorded in its pr-log file.

**Corrections applied by Session 2:** from this session forward, each slice writes `docs/pr-log/<task-id>.md` in the same branch before merging (Session 2 prompt Section 2.1), and the human's pending branch-protection change will block direct main pushes.

**Run IDs (all 16 CI runs, chronological):** 36346448802 (main, success), 36348242094 (ci-gate-proof, failure — deliberate), 36349212150 (main, success), 36351794478 (10a, success), 36354786531 (10b, failure), 36358426211 (10b debug, failure), 36359581299 (10b, success), 36360384347 (main, success), 36361611182 (10c, failure), 36362668007 (10c, success), 36363192758 (main, success), 36372272261 (m0-12, success), 36372749159 (main, success), 36373415709 (m0-09, success), 36373740260 (main, success), 36374192332 (main, success).
