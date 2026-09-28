# pr-log: A1 — merge-trail finding + pr-log backfill

- **Task ID:** Session 2, Block A1
- **Branch:** task/s2-a1-pr-log · see git for the commit SHA of this slice
- **Files touched:** docs/pr-log/README.md (finding), docs/pr-log/p0-*.md (15 backfill files), BUILD-LOG.md
- **Tests added:** none (documentation slice)
- **Verification:** branch CI (see run on this branch); reconstruction cross-checked against `git log --merges`, per-merge `git diff --name-only`, and all 16 CI runs from the GitHub API (IDs in the README).
- **Key finding:** no real GitHub PRs exist for Session 1; all merges were local `--no-ff` merges pushed to main (ADR-001). Branch-level CI gating existed only from M0-05b onward. From this session, every slice writes its pr-log file before merging.
- **Default decisions relied on:** the backfill is 16 files — above the ~10-file slice guidance but kept as one slice because it is a single reviewable reconstruction of existing history (logged in BUILD-LOG).
- **Deferred:** none.
