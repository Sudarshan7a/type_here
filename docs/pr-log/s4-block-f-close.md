# pr-log: S4-F — session 4 close, branch reconciliation, README corrections

- **Task ID:** Session 4, Block F (session close) + Session 5 Block A (repo reconciliation)
- **Branch:** `task/s4-block-f`
- **Commits merged:** `8f35ce0` (F: session 4 close), `519b124` (docs: local run instructions), plus this block's own commits
- **Files touched:** `BUILD-LOG.md`, `HUMAN-ACTIONS.md`, `README.md`, `docs/sessions/SESSION-4-REPORT.md`, `docs/pr-log/s4-block-f-close.md`, `docs/sessions/SESSION-5-REPORT.md`, `package.json`
- **Tests added:** none — this block is documentation and one dev-script addition, verified by running the commands it documents (see Verification)

## The defect this block fixes

Session 5's Section 1 audit found `task/s4-block-f` sitting **two commits ahead of
`main` and unmerged**, with both commits already green in CI (run 74, all 14
steps). The work existed; `main` did not have it. Any new contributor cloning
`main` would not have seen the Session 4 report or the run instructions. Fixed
by the Section 3 fallback merge (`--no-ff`, CI confirmed green first).

## Documentation defects found and corrected

`README.md` had drifted from the repository in three ways. All three were found
by **running the documented commands**, not by reading them.

1. **Phantom command.** The Commands block listed `pnpm dev  # dev servers (web + api)`.
   No root `dev` script existed. Verified failing before the fix:
   `pnpm dev` → `[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "dev" not found`, exit 1.
2. **Malformed run block.** The "run it yourself" section was un-fenced prose
   with trailing whitespace, so it rendered as a paragraph rather than commands.
3. **Stale status.** "Status" still said Phase 0, and the Commands preamble still
   said the set was "wired up when the M0-10 scaffold lands". M0-10 landed in
   Session 2 and the baseline is green today.

**Why no gate caught this:** `.prettierignore` excludes `*.md` by design, so
`pnpm format:check` cannot see Markdown defects. That exclusion is correct for
curated spec content (it must stay character-identical to its sources) and is
left alone. The gap is recorded in `HUMAN-ACTIONS.md` rather than papered over
by narrowing the ignore list.

## The `dev` script

Added at the root so the documented command exists and is exercised:

    "dev": "pnpm --filter @realtype/web --filter @realtype/api --parallel dev"

Two forms were probed and **rejected**, both for verified reasons:

- `pnpm -r dev` — starts the dev servers **serially**, so the second one never
  gets a terminal.
- `pnpm -r --parallel dev` — works, but `Scope: 7 of 8` and it also starts
  `tools/fixture-recorder` on port 5174. That is a dev-only recording tool, not
  part of running the app.

The filter form reports `Scope: 2 of 8` and starts exactly the two servers the
README names. Verified: web HTTP 200 on 5173, API HTTP 200 on 3000.

## Verification (actual output, this session)

Baseline re-run in a clean `git worktree` at `main` before any edit:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Done in 8.9s |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm typecheck` | exit 0, all 6 packages |
| `pnpm test` | exit 0 — engine 73, telemetry 97, schemas 56, api 4, web 17, recorder 11 = **258 tests, 0 failures** |
| `pnpm build` | exit 0, all 6 packages |
| `pnpm check:bundle` | 71.1 KB gzip of a 200 KB budget |
| `pnpm check:licenses` | no copyleft licenses in production dependencies |

Coverage: engine 96.11 / 92.82 / 95.16 / 97.40 · schemas 100 / 100 / 100 / 100 ·
telemetry 100 / 92.62 / 100 / 100 · api 100 / 80 / 100 / 100 · web 84.84 / 85.71 / 80 / 84.37.

The dev script was proven **bad case → fail** (`pnpm dev` before: exit 1) and
**good case → pass** (after: both dev servers start and answer HTTP). A command
in documentation that has never been executed is a claim, not a fact.

## ATTACK pass findings and what was fixed

An adversarial subagent was given only "find a failing case". Nine findings came
back. **Four were defects in this block's own commit and are fixed here;** the
rest are logged, not silently dropped.

Fixed in this block:

| # | Defect | Fix |
|---|---|---|
| F5 | README claimed `/health` returns `{"status":"ok"}`; it returns `{"status":"ok","service":"realtype-api","time":...}` | Corrected to `{"status":"ok", ...}` |
| F6 | **This pr-log documented the command form it had rejected**, and said "all three dev servers start" for a script that starts two | Rewritten to the shipped filter form, with both rejected forms and the evidence for rejecting them |
| F7 | README's `pnpm test` comment omitted `tools/fixture-recorder` (11 tests) | Package added to the list |
| F8 | Status said results were "not built yet" while 30 lines later the run instructions described a results panel | Narrowed to what is actually absent: saved results, accounts, the weakness model, drills |

Accepted and logged rather than fixed here, because each is a pre-existing
condition of `tsx watch` / port binding, not of this change:

| # | Finding | Disposition |
|---|---|---|
| F1 | A **typo'd** filter yields a silent half-stack (pnpm prints "No projects matched" but still starts the rest, exit 0). Latent, not live — today's filters are correct | Logged in `HUMAN-ACTIONS.md`; the failure mode is recorded so the next person who edits the filter knows the gate is silent, not loud |
| F2 | Port 5173 busy → pnpm exits loudly but **orphans the API** on 3000 | Pre-existing `tsx watch` behaviour; logged |
| F3 | Port 3000 busy → `tsx watch` swallows the child's `exit(1)`, so `pnpm dev` **reports success with a dead API** | Pre-existing; logged as the most serious of the three, because it fails silently |
| F4 | `(Ctrl-C stops both)` could not be verified by the harness (it cannot deliver Ctrl-C to the process group) | README claim stands as unverified rather than being asserted as tested |
| F9 | The filter list is a hard-coded allowlist; a third service added later is silently omitted (F1's failure mode) | Logged with F1 |

**F3 is the one that matters most.** A developer whose port 3000 is taken gets a
web app that appears to work and an API that is not there, with no error. That
is a worse failure than a loud one, and it is invisible until something calls
the API — which the current test surface never does. Logged as a real defect
against Phase 4, where the web app starts depending on the API for results.

## Default decisions relied on

- `BUILD-LOG.md` and `HUMAN-ACTIONS.md` are the state of record; the standing
  prompt is not. Nothing here changes a requirement, a contract or a metric.
- Adding a root script is the smallest reversible change that makes the
  documented workflow true. The alternative — rewriting the README to document
  two terminals — was rejected: two terminals is the real constraint today, but
  it is a worse instruction than a verified one-liner.
- Markdown stays prettier-ignored. The alternative (un-ignoring `*.md`) would
  reformat curated spec documents, which the ignore file exists to prevent.

## Deferred

- Branch protection is still off and `gh` is still not installed. Both are
  `EXTERNAL DEPENDENCY` items in `HUMAN-ACTIONS.md`; neither stopped this block.
