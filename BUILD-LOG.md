# BUILD LOG

## Current Position
Phase: Phase 1 (M1 engine) — Session 6 complete. First session driven by owner steering (`docs/handoff/STEER-1.md`, `STEER-2.MD`).
Last completed task: the errorMode contract bump — CONTRACT_VERSION 1.2.0 → **1.3.0** with `no-backspace` (D03) and `word-locked` (D04), every enum consumer updated, and the D04 word-locked engine behaviour implemented. PR #2. Before that, PR #1 answered the owner's question about the 216-vs-196 ledger discrepancy.
Next task, in the owner's stated order:
1. **D03 + D04 fixtures** (`ENG-FIXTURE-D03`, `ENG-FIXTURE-D04`) — unblocked as of PR #2 and now the cheapest executable work, since the expectations are already derived.
2. **F3 / F2 / F1-F9 dev-script defects** (STEER-1: "before starting Phase 4"). F3 is the real one: `pnpm dev` reports success with a dead API when port 3000 is busy.
3. **The STEER-2 thin vertical slice of the real typing surface** — the six acceptance criteria are written out in `STEER-2.MD`. Not started. This is the Phase 3 foundation, not a throwaway.
Not started: E3 Caps Lock, E5 dead keys, E6 graphemes, E7 paste + server backstop, E8 dual-key, A03 long test (the rest of the Chapter 4 edge fixtures); the weakness model; the content pipeline.
Open defects: F1–F4/F9 from the Session 5 attack pass (see HUMAN-ACTIONS.md). Also carried: `input-adapter.ts` writes marker timestamps as absolute `performance.now()` while key events are origin-relative, and no test asserts any marker `t` (recorded against ENG-01).
Ledger: MVP 5/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 | LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 5/216 (19 IN PROGRESS, 191 NOT STARTED)
Baseline: **288 tests, 0 failures** (engine 84, telemetry 101, schemas 69, api 4, web 19, recorder 11) + 16 script tests in `scripts/check-ledger.test.mjs`; bundle 71.3 KB of 200 KB; engine coverage 96.21/93.17/95.23/97.46.
Sessions since last human contact: 0 — the owner filed two STEER files this session.
Last updated: 2026-10-01

## Session 6 — the ledger's missing 20 (the owner's question)

**Answer: the 20 were never missing from the ledger. The report was dropping them.**

`docs/FEATURE-LEDGER.md` counts itself correctly — `MVP 97 | V1 74 | V2 12 | LATER 13 | UNTAGGED 20 | total 216` — and always did. What lost the 20 is the *progress format* that every session report, halt file and handoff is required to print (Section 18.10). Its slots are MVP / V1 / V2 / LATER / LAUNCH-GATED / BLOCKED-EXTERNAL / REJECTED. There is no UNTAGGED slot, so every report printed `97+74+12+13 = 196` next to `overall 5/216`.

What the 20 are, verified at source rather than assumed:

| Count | Rows | Evidence |
|---|---|---|
| 17 | `NFR-01`..`NFR-17` | `docs/spec/master-spec-v1.md` §8 is a three-column table, `\| ID \| Area \| Requirement (targets are proposals) \|`. **No tag column exists.** |
| 3 | `INT-10`, `BIZ-06`, `RET-21` | The spec tags them literally: `**INT-10 [Policy]**`, `**BIZ-06 [Policy]**`, `**RET-21 [Policy]**`. |

So `UNTAGGED` is the truthful tag, not a seeding gap. Giving them MVP or V1 labels would have been inventing source metadata the spec does not contain. (NFR-04/05/12 carry `[V1]` markers *inside* their requirement text for a sub-clause only; the row itself is untagged.)

**Fixed in two parts (PR #1).** The format gains an `UNTAGGED` slot; and `check-ledger.mjs` §7 now checks the **report**, which it had never done — every bucket holding rows must be counted, each denominator must equal the ledger's count for that family, denominators must sum to the overall denominator, numerators to the overall numerator, and the overall denominator to the row count. The gate could not see this before because it only ever inspected the tracker, and the tracker was right.

## Session 6 — decisions taken by the owner (STEER-1, applied and recorded)

- **errorMode enum:** APPROVED as proposed → CONTRACT_VERSION 1.3.0, `no-backspace` + `word-locked` (PR #2). The hand-written unions in the engine, fixtures and recorder were **deleted** rather than extended, so each now derives `ErrorMode` from `@realtype/schemas` and drift is a typecheck error. Telemetry cannot import schemas, so `packages/telemetry/tests/enum-drift.test.ts` pins `ERROR_MODES` to `ErrorModeSchema.options` exactly — a drift that had already occurred once inside this very change.
- **Retest cadence:** day 0/30. 0/30/60 and 0/14/30 stay as presets.
- **Branch protection:** OFF by owner decision. Re-confirmed via the API this session (`gh api …/branches/main/protection` → HTTP 404 "Branch not protected"). Marked ACCEPTED BY OWNER and not raised again.
- **`gh`:** authenticated. Real PRs from this session: **#1** and **#2**, both `--merge` (never squash, never fast-forward), each verified green before merge.
- **Manual engine test:** the owner's call at the end; the loop does not wait for it.

## Session 6 — mistakes found in my own work

- **A PowerShell `Set-Content -Encoding UTF8` rewrote `check-ledger.mjs` with a BOM and mojibake'd every em-dash.** Caught by reviewing the diff; the file was reverted and redone with encoding-safe edits only. Checked: no BOM, 6 em-dashes intact, 0 mojibake, and `git diff -w` shows the change is purely additive apart from one import line.
- **Three of my own ledger-gate fixtures were wrong and the implementation was stricter than my assertions.** `97+74+12+13+25` is 221, not 220; a fixture whose numerators summed to the claimed total was passing for the wrong reason and would have let a genuinely wrong numerator through. Both fixed, and both cases are now pinned by name in the test file.
- **One word-locked test fixture was wrong and the engine was right.** I read `cat` as taking four presses and expected a fourth character inside the word; it takes three, so the fourth press is already leaving it. Tests corrected, not the implementation. A duplicate test block left by that edit was removed.
- **The telemetry allowlist drift was caught only because I thought to check it** after widening the schema — not by any gate. That is why the drift test exists now.

## Autonomous decisions made
(Newest first. Format: date | decision | 1-2 sentence reasoning | which section of this prompt justified it)

- 2026-10-01 | **The 20 untagged rows stay UNTAGGED rather than being assigned MVP/V1 tags.** The master spec's NFR table has no tag column and the three policy rows are tagged `[Policy]`, so any MVP/V1 label would be invented metadata. The smallest truthful fix was to report the bucket and gate the report. Recorded in `docs/FEATURE-LEDGER.md` and enforced by `check-ledger.mjs` §7. | Section 13 rule 2 (never fabricate), Section 9 (smallest reversible change), Section 4 item 10
- 2026-10-01 | **`check-ledger.mjs` was made importable** by wrapping the gate in `main()` behind the same `import.meta.url` guard `check-licenses.mjs` already uses, so the pure checks can be unit-tested. Without this the test file could not import the module at all — it exited the process on load. | Section 2 rule 3 (test-first), Section 4 item 12 (attack)
- 2026-10-01 | **The report gate checks only `BUILD-LOG.md`'s "Current Position"**, not historical session reports. An older report legitimately records older counts; checking those would make the gate lie about history. "Current Position" is current by definition. | Section 4 item 10 (blind spots become regression tests)
- 2026-10-01 | **`@realtype/schemas` added as a devDependency of `@realtype/telemetry`** so the enum-drift test can compare the allowlist to the contract instead of to a hand-written copy. Dev-only, workspace-internal, MIT. | Section 2 rule 7 (close a blind spot at the source), AGENTS.md rule 3
- 2026-10-01 | **Real PRs via `gh` for every merge from this session**, per STEER-1. PR #1 and PR #2, both merged `--merge` after CI green. | Section 3 preferred workflow, STEER-1
- 2026-09-28 | Session 3 subagent diagnostic: the Session 2 "provider response headers timed out after 300000ms" failures are reported by the Session 3 brief to be provider-side on the previous API and not applicable now. This session therefore delegates only *after* verifying with tiny isolated probes, and every subagent output is verified locally before merge (Section 1 rule 11). | Section 1 rule 11 + brief note

## Session 3 pre-flight findings (Block A)

Verified in a clean `git worktree` at HEAD 8b50e0d, exactly as a new
contributor would: `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm check:bundle` — all green.

| Session 2 claim | Verified value | Verdict |
|---|---|---|
| engine coverage 98% | 98.45 / 97.34 / 96.29 / 98.78 (stmts/branch/funcs/lines) | ✅ CONFIRMED |
| bundle 66.3 KB | 66.3 KB gzip (budget 200 KB) | ✅ CONFIRMED |
| engine tests: 30 | **29** | ✏️ WRONG — see F1 |
| telemetry tests: 97 | 97 | ✅ CONFIRMED (my first measurement of 194 was polluted by F1) |
| docs/pr-log entries match real merges | 3 spot-checks (b1-contracts, b2-recorder, a5-web-headers) map to merges 8670208, 79a5616, 1ce9c90 | ✅ CONFIRMED |
| chapter corrections recorded | 4 Chapter 4 entries + 4 carried-forward | ✅ CONFIRMED (numbering below) |

### F1 — vitest discovered compiled test files in `dist/` (REAL DEFECT, FIXED)

**Finding:** every package's vitest config used the default include glob, so
after `tsc` emitted into `dist/`, the compiled copies of the test files
(`dist/tests/*.test.js`) were executed as a second suite. Measured: telemetry
194 tests instead of 97 (exactly 2×), engine 30 instead of 29.

**Why it matters:** a stale compiled test can pass while the source test fails,
which defeats rule 3 (test-first) and rule 5 (no vacuous gates). CI never saw
it because CI runs unit tests *before* build — so this only bit developers who
ran `build` then `test`, which is the common local loop.

**Fix:** each vitest config now pins `include: ["tests/**/*.test.ts"]` (web:
`*.test.ts?(x)`), so only sources are discovered.

**Proof the fix is non-vacuous (rule 5):** with `dist/` present, engine = 29
tests and telemetry = 97 — identical to the pre-build counts. Before the fix,
the same runs reported 30 and 194.

### F2 — Session 2 report claimed 30 engine tests (DOCUMENTATION)

Off by one, caused by F1's duplicate discovery. True count: **29** (7 fixture
suites × 2 + 13 unit + 2 contract). Session 2's report figure was never
verified against a clean tree — exactly the gap Block A exists to close.

### F3 — Session 3 prompt cross-references are off by one (PROMPT, not repo)

The prompt cites "corrections-file item 4" for the Ch8 plateau decision and
"item 7" for the levels-05 decision. In the file those are **item 5** and
**item 8** (items 1–4 are the Chapter 4 corrections; 5–8 are carried forward).
The repo file is internally consistent; no action needed beyond noting it.

## Session 3 subagent diagnostic (Section 5 requirement)

Three deliberately tiny, isolated probes (list directories; read one exported
constant; one arithmetic question) were dispatched in parallel.

**Verdict: subagents function normally on the current API.** All three
completed in a single round-trip with correct, minimal answers. The Session 2
`Provider response headers timed out after 300000ms` failures were therefore
**provider-side on the previous API**, not a runner timeout, task-size problem,
or model-specific limit — nothing to configure differently. Delegation is
available again for any task, including critical path, subject to rule 11.

**Rule 11 caught something real immediately:** probe C recomputed the flat
series and reported a predicted 14-day change of −0.100 WPM, contradicting the
−0.0500 in `docs/recompute-plateau.mjs`. Re-deriving by hand settled it: the
x values `[0,2,4,…,14]` are **day indices**, so the fitted slope is already
per-day and no unit conversion applies. My recorded numbers stand; the probe's
conversion was wrong. The plateau verdict is unaffected under either reading
(both are far inside the 0.2107 population SD), but the corrected arithmetic is
what goes in the record. This is the verification rule earning its keep.

## Process incidents (logged plainly)

- 2026-09-28 | **Second direct commit to main (S4).** The S4 commit was made
  while `main` was checked out, so it landed on main with no merge commit and
  the intended task branch was left empty. Repaired append-only: the branch was
  fast-forwarded onto the commit, the missing `docs/pr-log/` entry and this
  record were added, and the branch was then merged with `--no-ff`. Nothing was
  force-pushed and no history was rewritten; main's CI for the content commit
  (run 36705446131) was green before the merge. Root cause: chaining a `git
  checkout` and a later `git commit` in separate commands without re-checking
  which branch is active. Mitigation going forward: every commit command starts
  with an explicit `git checkout <branch> || exit 1` and the commit is
  preceded by `git status` in the same command.
- 2026-09-28 | **I merged a red CI run.** Block A's branch (task/s3-a-preflight,
  run 36693421192) came back `failure` at the Format check, and I merged it
  anyway in the same command that read the status. That is exactly the mistake
  the merge protocol exists to prevent. Root cause: the five hand-written
  vitest configs were written with PowerShell here-strings (CRLF), which
  prettier rejects — CI is right, I was wrong. Fixed forward in the next
  commit and re-verified; the merge is now green. Note for the record: local
  `pnpm format:check` had not been run after those files were written.

## Session 4 — Block A: main-branch audit (trust nothing; verified against git, CI, and a clean checkout)

**Verdict: A2 — Session 3's repairs confirmed clean**, with one material gap
found in the enforcement itself (below).

| Check | Method | Result |
|---|---|---|
| Direct commits to main | `git log --format="%h|%p|%s" main`, parents per commit | Every task's work sits behind a **merge commit** (2 parents). The "direct" entries in the log are branch commits reachable *through* those merges, which is normal topology. |
| The S4 repair | parents of `bcc233e`, `2595ecc`, `f8237f7` | `bcc233e` (the disclosed direct-to-main commit) is now a **parent of merge `f8237f7`**, whose other parent is the pr-log/incident commit. The work is behind a merge. |
| Was history rewritten? | `git reflog show main` | **No `reset` and no force-move entries.** Main's history contains exactly one `commit:` entry (bcc233e, 16:23) and every other movement is `merge ...: Merge made by the 'ort' strategy`. The repair was append-only, as claimed. |
| Numbers | clean `git worktree` at 5aff79d, `pnpm install --frozen-lockfile` → lint → format:check → typecheck → test → build → check:bundle | All green. **engine 56 tests / 56 passed / 0 failed**, coverage **95.82 / 92.7 / 95.08 / 97.07**; schemas 56, telemetry 97, api 4, web 8, recorder 11 = **232 tests, 0 failures**; bundle 66.3 KB gzip. Matches Session 3's claims exactly. |
| Current HEAD CI | run 36711540608 (main @ 5aff79d) | **success** |
| Red runs still attached to main commits | all 64 runs cross-referenced against main | Six, **all previously disclosed**: 621140c + adb5259 (CRLF format, Session 3), 2b5b141 + 45ff6bd (lockfile drift, Session 2), 73a8e1c (prototype HTML format, Session 2), 05fba6c (D3 test file format, caught and fixed before merging). Each was superseded by a fix within minutes; none is undisclosed. |

### GAP FOUND — branch protection is NOT enabled (the reason rules 2–3 were breakable)

`gh` is not installed. I tested protection empirically: created a throwaway
commit on a scratch branch and ran `git push --dry-run origin HEAD:main`.
**GitHub accepted it** (`5aff79d..9576ce6  HEAD -> main`, exit 0); the remote
ref was verified unchanged afterwards (`git ls-remote` still `5aff79d`), so
nothing was written. Direct pushes to main remain possible.

This is the mechanical reason the merge protocol was violated twice in Session
3: the rules are honor-system only, with nothing to stop a bad push. Until
branch protection is on, every future slice's safety depends on this agent
remembering the rules. **Logged for human action (top of HUMAN-ACTIONS.md).**

## Autonomous decisions made
(Newest first. Format: date | decision | 1-2 sentence reasoning | which section of this prompt justified it)

- 2026-09-28 | Session 3 subagent diagnostic: the Session 2 "provider response headers timed out after 300000ms" failures are reported by the Session 3 brief to be provider-side on the previous API and not applicable now. This session therefore delegates only *after* verifying with tiny isolated probes, and every subagent output is verified locally before merge (Section 1 rule 11). | Section 1 rule 11 + brief note
- 2026-09-28 | F1 fix: pin vitest `include` to `tests/**` rather than adding `exclude: ["dist/**"]`. A narrow include is the stronger statement of intent (sources are tests) and cannot be defeated by a new build-output directory. | Section 1 rules 3, 5

- 2026-09-28 | Subagent delegation was abandoned mid-session: two agents hit the 300 s provider response cap and one was cancelled. Their on-disk work was finished by the main agent (engine E2-E6, S6 spike) rather than respawning agents that would fail identically. The contracts.md ownership model is retained for a future session. | Session 2 Section 3 blocks C/D/E; practical provider limits
- 2026-09-28 | S6 model bug fixed, not the test: `wallStartMs === 0` was used as a "never started" sentinel, but the fake clock legitimately starts at 0, so wall duration was always 0. Replaced with a nullable sentinel. The four failing tests were correct. | Section 2.3 spirit (never weaken a test to pass)
- 2026-09-28 | API rate-limit tests now use explicit per-test keys: the @fastify/rate-limit default store is process-global, so the burst test was returning 429 to the health test in the same worker. Real bug found by the full-suite run. | Section 2.3
- 2026-09-28 | Spike configs run Chromium-only with firefox/webkit commented out and a documented re-enable command: Playwright browser downloads failed on every mirror (cdn.playwright.dev 30 s timeouts) in this environment. Results labelled "LAB PROXY (Chromium only) — Firefox/WebKit PENDING". | Sections 2.4, 3 Block C
- 2026-09-28 | B2: InputLog extended additively (optional markers[] + meta.recorder {userAgent, note?}) instead of encoding markers as fake KeyEvents; CONTRACT_VERSION 1.0.0 → 1.2.0 in one bump. Fixture textHash is an offline FNV-1a placeholder (real sha-256 at intake). CSP connect-src 'none' is declared by the page itself + a source-scan test proves no network/storage APIs — node smoke tests cannot enforce CSP (documented in README). | Sections 3 Block B2, 7

- 2026-09-28 | B2: InputLog extended additively (optional markers[] + meta.recorder {userAgent, note?}) instead of encoding markers as fake KeyEvents; CONTRACT_VERSION 1.0.0 → 1.2.0 in one bump. Fixture textHash is an offline FNV-1a placeholder (real sha-256 at intake). CSP connect-src 'none' is declared by the page itself + a source-scan test proves no network/storage APIs — node smoke tests cannot enforce CSP (documented in README). | Sections 3 Block B2, 7
- 2026-09-28 | B1: mode enum values (classic/real-world/numbers-symbols/custom/code) are provisional string forms of the MVP modes (spec §3.2); revisit at M2 when the mode bar is built. Percentages stored 0-100, ratios 0-1, full precision; textHash = 64-char sha-256 hex; expiresAt = ISO 8601 UTC. The prompt's explicit shape list was followed exactly; implementation-guide chapter 5 was not re-read for this slice. | Section 3 Block B1
- 2026-09-28 | A2 bundle-proof slip: bloat edits briefly landed on main's working tree (checked out between proof branches); caught via git status, fully reverted (no commit), redone on the branch. Logged here because a wrong working tree during proofs is exactly the kind of drift Section 2.3 exists to catch. | Sections 1.2, 2.3
- 2026-09-28 | A5: vercel.json is the single source of truth for host headers; vite preview serves the same headers (config-read) so e2e asserts what production sends. connect-src carries placeholder origin https://api.realtype.example (vercel.json is static; HUMAN-ACTIONS item covers the swap). Web coverage gate 60% activated with a real SSR-string render test (main.tsx excluded as the DOM entry point, like api's server.ts). Playwright Response.headerValue() is async — first spec version forgot to await (fixed). | Section 3 Block A5
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

- 2026-09-28 | **AWAITING HUMAN DECISION — waitlist form provider.** The waitlist form ships disabled (prototypes/waitlist): collecting emails is new personal-data collection (Section 6 stop condition #2). Enabling requires a provider choice + a privacy notice. Until then nothing is transmitted and the button reads "Not connected yet".

- 2026-09-28 | Phase 0 Track A in full: interviews (12-15 people), waitlist 3-concept test, 5-person prototype usability test, competitor hands-on audit, REAL typing fixtures recorded on real keyboards (the engine's realistic-timing tests will need these; synthetic placeholders will be used and flagged until then), design direction + typography choice, Day-14 go/no-go memo. These gate Phase 1 advancement per the roadmap, though technical M1 work may proceed in parallel per WEEK-0-2-PLAN.
- 2026-09-28 | M0-06: staging/production deploys blocked on cloud accounts (shell "hello world" deploy + rollback drill). Suggested: Vercel (web), Render/Fly.io (api), MongoDB Atlas (per D5).
- 2026-09-28 | M0-07: error-tracking + analytics service connection blocked on accounts; scrubbing/allowlist code layer to be built next session against a fake sink.
- 2026-09-28 | M0-02 items 5-6: enable branch protection on main (require PR + passing CI + review) and turn on dependency vulnerability alerts + secret scanning on github.com/Sudarshan7a/type_here. Direct pushes to main are currently possible.
- 2026-09-28 | M0-08 item 4-5: third-party skills (frontend-design, web-design-guidelines, vercel-react-best-practices, emil-design-eng, review-animations; Context7 is on) must be vetted by a human before installing.
- 2026-09-28 | M0-11 remainder: create the GitHub project board (needs gh/admin); the issue templates and Definition of Done are in the repo.
- 2026-09-28 | Install the GitHub CLI (`gh`) and authenticate, to restore real PR + review flow (see ADR-001).

## Task history
(Newest first. Format: date | task ID | branch | PR link | status [merged/awaiting human merge/blocked] | tests added | one-line summary)

- 2026-10-01 | S6-B (errorMode 1.3.0) | task/s6-b-errormode-130 | PR #2, run 36858729219 green, merged `--merge` | merged | 23 (schemas +13, engine +6, telemetry +4) | CONTRACT_VERSION 1.3.0 with `no-backspace` + `word-locked`; every enum consumer updated and the hand-written unions deleted in favour of types derived from the contract; D04 word-locked implemented; telemetry enum drift is now a test failure
- 2026-10-01 | S6-A (ledger report gate) | task/s6-a-ledger-progress-line | PR #1, runs 36850614189 (red, test-first) + 36852643188 (green), merged `--merge` | merged | 16 (scripts/check-ledger.test.mjs) | The 20 untagged rows were never missing from the ledger; the mandated report format dropped them. Format fixed, and check-ledger.mjs §7 now checks the report itself.

- 2026-09-28 | S4-E (wiring) | task/s4-e-wiring | run 36730995564 green, local merge | merged | 5 adapter + 6 UI + 3 e2e | Engine wired into the web app: type real text, see live engine metrics (the first hands-on artifact)
- 2026-09-28 | S4-D (robustness, partial) | task/s4-d-fixtures | run 36724471613 green, local merge | merged | 8 tests | E09 zero-keystrokes, A02 short-test, corrupted-log (fixed a real negative-duration bug); E10 as an enforced lint rule
- 2026-09-28 | S4-C (layouts) | task/s4-c-layouts | run 36723627616 green, local merge | merged | 9 tests | All six in-scope layouts verified from physical key positions; three errors in my own tests caught; AltGr chars return unknown
- 2026-09-28 | S4-A+B (audit + gate) | task/s4-a-audit | run 36721747229 green, local merge | merged | red/green proofs | Main-branch audit confirmed Session 3's repairs append-only; bundle gate found blind to CSS and public/ assets and now measures the whole dist
- 2026-09-28 | S3-C3 (parity) | task/s3-c3-parity | run 36710738039 green, local merge | merged | 2 e2e specs | ENG-PARITY-01/02: all 9 chapter-4 fixtures + alignment/aggregation/finger-tagging produce identical results in Node and Chromium (1e-9), running the engine's own compiled output on both sides

- 2026-09-28 | S3-C3 (parity) | task/s3-c3-parity | run 36710738039 green, local merge | merged | 2 e2e specs | ENG-PARITY-01/02: all 9 chapter-4 fixtures + alignment/aggregation/finger-tagging produce identical results in Node and Chromium (1e-9), running the engine's own compiled output on both sides
- 2026-09-28 | S3-D3 (aggregation) | task/s3-d3-aggregation | run 36709160465 green, local merge | merged | 9 tests | Self-relative 3x-median outlier exclusion (185 ms / n=4, not 388 / n=5) + layout-dependent finger tagging; unmapped layouts return "unknown" rather than a guess
- 2026-09-28 | S3-D1+D2 (engine) | task/s3-d1-state-machine | run 36708042536 green, local merge | merged | 18 tests | Full §4.10 state machine (scored duration excludes pauses exactly) and §4.11 alignment with the documented transposition rule; engine 29 -> 47 tests
- 2026-09-28 | S3-C (S4 spike) | task/s3-d-state-machine | run 36706234681 green, local merge | merged | 2 specs | Real Tree-sitter WASM reproduces chapter 9 §9.2.1's token map; found the WASM-blind bundle gate and closed it
- 2026-09-28 | S3-B (decisions) | task/s3-b-decisions | run 36696445156 green, local merge | merged | n/a | Ch8 population-SD decided + fresh WM-FIXTURE-009a/b; levels-05 `;` drill resolved; new §2.4 `@` finding logged
- 2026-09-28 | S3-A (pre-flight) | task/s3-a-preflight | local merge | merged | n/a | F1: vitest was running compiled tests from dist/ (telemetry 194 vs 97); fixed and proven

- 2026-09-28 | S2-E (engine E0-E6) | task/s2-e-engine | run 36685949292 green, local merge | merged | 30 tests (18 fixture + 12 unit), coverage 98/97/96/99 | Fixtures committed BEFORE implementation; input filter (repeat/untrusted/auto), text model (must-correct/stop-on-error), metrics core with corrected B01/F01/A01 expectations; ENGINE_MODEL_VERSION 1.0.0
- 2026-09-28 | S2-C (spikes) | task/s2-c-spikes-final | local merge | merged | 3 spike suites | S1 p95 15.2ms (LAB PROXY, Chromium only), S2 capture+replay, S3 parity max-diff 0, S5 baseline 66.3/200KB, S6 state machine + page, RESULTS-TEMPLATE; S4 (Tree-sitter) NOT started
- 2026-09-28 | S2-D (telemetry) | task/s2-d-telemetry | local merge | merged | 97 tests, coverage 100/92.6/100/100 | 22-event allowlist, compile-time + runtime rejection, scrubError with mandatory-scrub adapter, CANARY_TYPED_TEXT_9F3A proven absent in all six paths
- 2026-09-28 | S2-B3+B4 | task/s2-b3-prototype | run 36526155940 green, local merge | merged | n/a (human usability test) | First-session prototype (exact string-table copy, PROSE-01-004 passage) + three waitlist concepts with the form DISABLED
- 2026-09-28 | S2-B2 (fixture recorder) | task/s2-b2-recorder | run 36518534947 green, local merge | merged | 11 recorder tests + 5 schema tests | Offline recorder (R01-R11), marker events, disabled-until-typed export; contracts extended additively → CONTRACT_VERSION 1.2.0
- 2026-09-28 | S2-B1 (M1-01) | task/s2-b1-contracts | docs/pr-log/s2-b1-contracts.md | merged | 30 assertions, schemas coverage 100% | Zod 4 strict data contracts: KeyEvent, InputLog, TypingText, TypingSettings, ResultSummary, Session; CONTRACT_VERSION 1.0.0; limits + boundary/NaN tests
- 2026-09-28 | S2-A (harden) | task/s2-a1-pr-log, s2-a2-license-gate-test, s2-a3-a4, s2-a5-web-headers, s2-block-a-close | runs 36417412245, 36423835116, 36436819659, 36472034584, 36493689547 all green | merged | license fixtures + web config + preview e2e | Merge trail reconstructed; all gates proven non-vacuous; toolchain recorded; HUMAN-ACTIONS.md; vercel.json headers
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
