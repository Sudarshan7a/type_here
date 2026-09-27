# BUILD LOG

## Current Position
Phase: Phase 0 — Validate + Set Up (Track B: technical; Track A pending human action)
Last completed task: M0-02 (repo conventions, licenses, decision log)
Next task: M0-04 (tooling choices and configuration)
Last updated: 2026-09-27

## Autonomous decisions made
(Newest first. Format: date | decision | 1-2 sentence reasoning | which section of this prompt justified it)

- 2026-09-27 | Merge protocol while `gh` CLI is absent: branch per task, local gates (lint/typecheck/test), local `--no-ff` merge to main, push. Merge commit + branch serve as the PR record (ADR-001 in the Decision Log). | gh is not installed; PRs cannot be created; this preserves the branch-per-task audit trail without halting. | Section 7
- 2026-09-27 | "All CI checks green" interpreted as local gates passing until GitHub Actions CI exists (M0-05); after that, CI on the pushed branch is checked before merge where tooling allows. | No CI pipeline exists yet at the time of the first tasks; local gates are the only executable check. | Section 0 step 11 + Section 7
- 2026-09-27 | Session budget: no explicit daily usage cap was set by the user in Section 6; operating until the session naturally ends, a stop condition, or a phase block, and reporting at that boundary. | Section 6 was not amended with a budget line; Section 0 step 13 requires stopping at "run budget ends" and the closest equivalent without a number is the session boundary. | AUTONOMOUS-BUILD-EXECUTION-PROMPT Section 6 / Section 0 step 13
- 2026-09-27 | Phase 0 Track A (interviews, waitlist, usability tests, real-keyboard fixture recording) is pending human action and is NOT treated as a blocker for Track B / Phase 1 technical work; every place a real Track A input would replace a synthetic placeholder will be flagged here. | Explicitly pre-decided by the operating prompt. | Section 6

## Flagged for human review
(Newest first. Anything from Section 9, or a test you suspected was wrong but did not change.)

- 2026-09-27 | M0-02 items 5-6: enable branch protection on main (require PR + passing CI + review) and turn on dependency vulnerability alerts + secret scanning on github.com/Sudarshan7a/type_here. Cannot be done without GitHub admin access/CLI; direct pushes to main are currently possible and should be blocked.
- 2026-09-27 | M0-01: create cloud accounts with 2FA (hosting for web + API, managed MongoDB, error tracking, analytics, domain registrar) and store credentials in a password manager. All human-only (real credentials). Free/hobby tiers per D5.
- 2026-09-27 | M0-08 item 4-5: third-party skills (frontend-design, web-design-guidelines, vercel-react-best-practices, emil-design-eng, review-animations, Context7 is on) must be vetted by a human before installing. Project skills from the kit are installed and allowed (opencode.jsonc).
- 2026-09-27 | Install the GitHub CLI (`gh`) and authenticate, to restore real PR + review flow (see ADR-001).

## Task history
(Newest first. Format: date | task ID | branch | PR link | status [merged/awaiting human merge/blocked] | tests added | one-line summary)

- 2026-09-27 | M0-02 | task/p0-m0-02 | local merge (ADR-001) | merged | n/a | Project README, .gitignore conventions, NOTICE, MIT LICENSEs for engine+schemas, seeded Decision Log (D1-D17 accepted, D2/D3/D6/D7 explicitly confirmed)
- 2026-09-27 | M0-03 | task/p0-m0-03 | local merge (ADR-001) | merged | n/a | Folder structure per AGENTS.md: apps/web, apps/api, packages/engine, packages/schemas, e2e, docs/decisions, content — each with a purpose note
- 2026-09-27 | M0-08 (items 1-3) | task/p0-docs-import | local merge (ADR-001) | merged | n/a | Imported docs/ (spec, deep-dives, content library) and installed the OpenCode starter kit (AGENTS.md, .opencode/, opencode.jsonc) at repo root
- 2026-09-27 | M0-01 | — | — | awaiting human action | n/a | Accounts/2FA/password manager — human-only; logged above under Flagged for human review
