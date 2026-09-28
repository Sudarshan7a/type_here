# BUILD LOG

## Current Position
Phase: Phase 0 — Validate + Set Up (Track B; Track A pending human action) · Session 2 running Block A
Last completed task: A3+A4 (toolchain record, HUMAN-ACTIONS.md)
Next task: A5 (web security headers), then A2 red-proofs (coverage/bundle/e2e), then Block B
Last updated: 2026-09-28

## Autonomous decisions made
(Newest first. Format: date | decision | 1-2 sentence reasoning | which section of this prompt justified it)

- 2026-09-28 | A3+A4 combined into one branch: both are documentation-only acceptance lines (toolchain record + HUMAN-ACTIONS.md), one small reviewable slice. | Sections 1.2, 3 (Block A3/A4)
- 2026-09-28 | License gate made fail-closed: undetectable (UNKNOWN) licenses now fail the gate, per the MASTER-BUILD-CONTRACT standing rule (unverified facts are not trusted by default); fixture tests prove both directions (CI run 36423835116 green). | Sections 2.3, 7
- 2026-09-28 | A1 backfill slice is 16 files, above the ~10-file guidance; kept as one slice because it is a single reviewable reconstruction of existing git/CI history. | Sections 1.2, 2.1
- 2026-09-28 | A1 finding: no real GitHub PRs exist for Session 1 (gh never installed); all merges were local --no-ff merges pushed to main per ADR-001; branch-CI gating only from M0-05b onward. Full trail + all 16 run IDs recorded in docs/pr-log/README.md. | Section 3 Block A1

- 2026-09-28 | Fastify plugin registrations must be awaited. `void app.register(rateLimit, ...)` silently skipped the rate-limit onRequest hook (5 requests all 200, no x-ratelimit headers) while awaited registration worked; reproduced in isolation before fixing. | Sections 2 (verify, don't guess), 8
- 2026-09-28 | pnpm 11 removed `onlyBuiltDependencies`; build approvals live in `pnpm-workspace.yaml` under `allowBuilds` (map). This was the root cause of CI's ERR_PNPM_IGNORED_BUILDS on run 36354786531; confirmed via pnpm.io/11.x docs, fixed, and verified with a full fresh local install (deleted all node_modules) plus green CI run 36362668007. | Section 2
- 2026-09-28 | e2e package's Playwright script is named `e2e` (not `test`) so `pnpm -r test` stays a unit-test-only stage; CI runs e2e separately after browsers are installed. The earlier name collision failed CI run 36361611182. | Section 7
- 2026-09-28 | CI triggers on all branch pushes, not only main. Task branches get CI before merge (evidence: failing-test branch run 36348242094 = failure; same workflow green on main run 36346448802). Original trigger (main-only) let ungated branches exist; the merge protocol (ADR-001) needs pre-merge gating. | Sections 0 (step 8), 7
- 2026-09-28 | TypeScript pinned to 6.0.3, not latest 7.0.2: typescript-eslint 8.70.1 supports only TS <6.1.0. | Section 2 ("do not guess" — version compatibility verified against the registry)
- 2026-09-28 | License gate implemented as a workspace-aware script (scripts/check-licenses.mjs scanning each package's production deps via license-checker) instead of a root-only scan, because pnpm keeps per-package node_modules. | Section 7
- 2026-09-28 | Merge protocol while `gh` CLI is absent: branch per task, local gates + branch CI green, local `--no-ff` merge to main, push. Merge commit + branch serve as the PR record (ADR-001). | Section 7
- 2026-09-28 | "All CI checks green" interpreted as local gates passing until GitHub Actions CI existed; from M0-05 on, task-branch CI runs are verified green before merging. | Section 0 step 11 + Section 7
- 2026-09-28 | Session budget: no explicit daily usage cap was set by the user in Section 6; operating until the session naturally ends, a stop condition, or a phase block, and reporting at that boundary. | Section 6 / Section 0 step 13
- 2026-09-28 | Phase 0 Track A (interviews, waitlist, usability tests, real-keyboard fixture recording) is pending human action and is NOT a blocker for Track B / Phase 1 technical work; every place a real Track A input would replace a synthetic placeholder is flagged. | Section 6

## Toolchain record (A3, from `pnpm ls -r --depth 0`)

Exact pins (package.json + committed lockfile; CI installs --frozen-lockfile; packageManager pnpm@11.2.2; engines node >=24, pnpm >=11; .nvmrc 24):

| Workspace | Dependencies |
|---|---|
| root (realtype) | dev: @eslint/js 10.0.1, eslint 10.11.0, eslint-config-prettier 10.1.8, license-checker 25.0.1, prettier 3.9.9, typescript 6.0.3, typescript-eslint 8.70.1 |
| @realtype/api | prod: @fastify/helmet 13.1.1, @fastify/rate-limit 11.2.0, fastify 5.12.5; dev: @types/node 24.19.0, @vitest/coverage-v8 5.0.2, tsx 4.23.15, typescript 6.0.3, vitest 5.0.2 |
| @realtype/web | prod: react 19.3.0, react-dom 19.3.0; dev: @types/react 19.3.0, @types/react-dom 19.3.0, @vitejs/plugin-react 6.1.1, typescript 6.0.3, vite 8.3.1 |
| @realtype/e2e | dev: @playwright/test 1.63.0, typescript 6.0.3 |
| @realtype/engine | dev: @vitest/coverage-v8 5.0.2, typescript 6.0.3, vitest 5.0.2 |
| @realtype/schemas | dev: @vitest/coverage-v8 5.0.2, typescript 6.0.3, vitest 5.0.2 |

License flags (Section 2.5): every direct dependency is MIT except **typescript (Apache-2.0)**, **@playwright/test (Apache-2.0)**, and **license-checker (BSD-2-Clause)** — all inside the allowlist (MIT, Apache-2.0, BSD, ISC, 0BSD, CC0, BlueOak). No copyleft anywhere; 30 packages in 6 projects. Major bumps of pnpm, TypeScript, Vite, Vitest, ESLint, Fastify or React require a log entry + passing CI (Section 2.5).

## Flagged for human review
(Newest first. Anything from Section 9, or a test you suspected was wrong but did not change.)

- 2026-09-28 | Phase 0 Track A in full: interviews (12-15 people), waitlist 3-concept test, 5-person prototype usability test, competitor hands-on audit, REAL typing fixtures recorded on real keyboards (the engine's realistic-timing tests will need these; synthetic placeholders will be used and flagged until then), design direction + typography choice, Day-14 go/no-go memo. These gate Phase 1 advancement per the roadmap, though technical M1 work may proceed in parallel per WEEK-0-2-PLAN.
- 2026-09-28 | M0-06: staging/production deploys blocked on cloud accounts (shell "hello world" deploy + rollback drill). Suggested: Vercel (web), Render/Fly.io (api), MongoDB Atlas (per D5).
- 2026-09-28 | M0-07: error-tracking + analytics service connection blocked on accounts; scrubbing/allowlist code layer to be built next session against a fake sink.
- 2026-09-28 | M0-02 items 5-6: enable branch protection on main (require PR + passing CI + review) and turn on dependency vulnerability alerts + secret scanning on github.com/Sudarshan7a/type_here. Direct pushes to main are currently possible.
- 2026-09-28 | M0-08 item 4-5: third-party skills (frontend-design, web-design-guidelines, vercel-react-best-practices, emil-design-eng, review-animations; Context7 is on) must be vetted by a human before installing.
- 2026-09-28 | M0-11 remainder: create the GitHub project board (needs gh/admin); the issue templates and Definition of Done are in the repo.
- 2026-09-28 | Install the GitHub CLI (`gh`) and authenticate, to restore real PR + review flow (see ADR-001).

## Task history
(Newest first. Format: date | task ID | branch | PR link | status [merged/awaiting human merge/blocked] | tests added | one-line summary)

- 2026-09-28 | S2-A3+A4 | task/s2-a3-a4 | see docs/pr-log/s2-a3-a4.md | merged | n/a | Toolchain record (pnpm ls, license flags) in BUILD-LOG; HUMAN-ACTIONS.md created at repo root
- 2026-09-28 | S2-A2 (license half) | task/s2-a2-license-gate-test | run 36423835116 green; docs/pr-log/s2-a2-license-gate-test.md | merged | 4 fixture tests (node:test) | License gate core exported + fixture-proven; fail-closed on UNKNOWN licenses; CI step runs the fixture tests
- 2026-09-28 | S2-A1 | task/s2-a1-pr-log | run 36417412245 green; docs/pr-log/s2-a1-pr-log.md | merged | n/a | Merge-trail finding (no real PRs; local --no-ff only; branch CI from M0-05b) + 15 backfilled pr-log files
- 2026-09-28 | M0-09 + M0-11 | task/p0-m0-09 | run 36373415709 green, local merge | merged | n/a | AGENTS.md commands + confirmed decisions; feature/bug/spike/decision issue templates; Definition of Done doc
- 2026-09-28 | M0-12 | task/p0-m0-12 | run 36372272261 green, local merge | merged | 3 security tests (headers, burst 429, redaction pin) | API security baseline: helmet (CSP script-src none, XFO DENY), rate limiting (100/min default), log redaction constant, PR template with §8.10 checklist
- 2026-09-28 | M0-10 (part 3) | task/p0-m0-10c | run 36362668007 green, local merge | merged | e2e smoke (1) + bundle gate script | Playwright e2e project (Chromium smoke), bundle-size gate (66.3 KB gzip vs 200 KB budget), CI e2e + bundle stages
- 2026-09-28 | M0-10 (part 2) | task/p0-m0-10b | run 36359581299 green, local merge | merged | 1 health test (100% coverage) | Fastify API with /health endpoint; fixed pnpm 11 allowBuilds (CI was red on run 36354786531)
- 2026-09-28 | M0-10 (part 1) | task/p0-m0-10a | run 36351794478 green, local merge | merged | n/a | Vite + React web shell (RealType placeholder page, data-testid on title)
- 2026-09-28 | M0-05 | task/p0-m0-05 (+b) | local merges (ADR-001) | merged | gate proof: temp failing branch, run 36348242094 = failure | CI workflow with all quality gates; gate proven; proof branch deleted
- 2026-09-28 | M0-04 | task/p0-m0-04a/b/c/d | local merges (ADR-001) | merged | harness smoke tests (2) | pnpm workspace, TS 6.0.3 strict, ESLint 10 flat + Prettier, Vitest 5 with 85% coverage gates on engine+schemas, .gitattributes LF, stub packages
- 2026-09-28 | M0-02 | task/p0-m0-02 | local merge (ADR-001) | merged | n/a | Project README, .gitignore, NOTICE, MIT LICENSEs, seeded Decision Log (D1-D17 accepted; D2/D3/D6/D7 explicitly confirmed)
- 2026-09-28 | M0-03 | task/p0-m0-03 | local merge (ADR-001) | merged | n/a | Folder structure per AGENTS.md with purpose notes
- 2026-09-28 | M0-08 (items 1-3) | task/p0-docs-import | local merge (ADR-001) | merged | n/a | docs/ imported; OpenCode starter kit installed (AGENTS.md, .opencode/, opencode.jsonc)
- 2026-09-28 | M0-01 | — | — | awaiting human action | n/a | Accounts/2FA/password manager — human-only
