# pr-log: S4-A — main-branch audit + Block B bundle-gate blind-spot hunt

- **Task ID:** Session 4, Block A (audit) and Block B (blind-spot hunt)
- **Branch:** task/s4-a-audit (Block B's throwaway probe branches deleted after use)
- **Files touched:** `scripts/check-bundle-size.mjs` (rewritten to measure the whole `dist/`), `BUILD-LOG.md`
- **Tests added:** none as unit tests; the gate's correctness is proven by red/green on real build output (below), which is stronger than a fixture.

## Block A — main-branch audit (A2: clean, with one material gap)

| Check | Evidence |
|---|---|
| Direct commits to main | Every task's work sits behind a merge commit; `git log --format="%h\|%p\|%s"` over 30 commits shows all 2-parent entries are merges. |
| The S4 repair | `bcc233e` (the disclosed direct commit) is a parent of merge `f8237f7`; the other parent is the pr-log/incident commit. |
| History rewritten? | **No.** `git reflog show main` contains zero `reset`/force entries; exactly one `commit:` entry (bcc233e) and every other move is `merge ...: Merge made by the 'ort' strategy`. The repair was append-only. |
| Numbers | Clean `git worktree` at 5aff79d: install → lint → format:check → typecheck → test → build → check:bundle all green. engine 56/56 tests, coverage 95.82/92.7/95.08/97.07; schemas 56, telemetry 97, api 4, web 8, recorder 11 — 232 tests, 0 failures; bundle 66.3 KB. Matches Session 3. |
| HEAD CI | run 36711540608 success. |
| Red runs attached to main commits | Six, all previously disclosed and superseded within minutes (CRLF format ×3, lockfile drift ×2, prototype HTML ×1). No undisclosed red run on main. |

**GAP: branch protection is NOT enabled.** A throwaway commit on a scratch
branch was dry-run pushed to `main`; GitHub **accepted** it
(`5aff79d..9576ce6 HEAD -> main`, exit 0). Remote verified unchanged via
`git ls-remote` (still `5aff79d`), so nothing was written. Direct pushes to
main remain possible — which is *why* the merge protocol was violated twice in
Session 3. Logged for human action.

## Block B — blind-spot hunt: two MORE blind spots found and fixed

Probes were built to be realistic: incompressible payloads decoded at runtime
(so tree-shaking could not simply delete them — an earlier naive probe measured
nothing because the bundler folded it away), each on a throwaway branch deleted
afterwards.

| Vector | Result | Evidence |
|---|---|---|
| Dynamic `import()` chunk | **CAUGHT** | 300 KB incompressible chunk → 287.9 KB gzip total → gate failed (exit 1). |
| Web worker (`new Worker(new URL(...))`) | **CAUGHT** | 400 KB worker chunk → 360.8 KB gzip total → gate failed (exit 1). |
| Base64 data URI inlined in CSS | **BLIND SPOT** | 533 KB CSS shipped; gate reported 66.3 KB and **passed**. |
| Large static asset from `public/` | **BLIND SPOT** | 200 KB asset copied verbatim into `dist/`; gate reported 66.3 KB and **passed**. |

**Fix:** the gate now walks the entire `dist/` (source maps excluded), gzips
every shipped file, and compares the total against the one budget — so a new
file type cannot go blind later. The WASM hard-fail rule is retained.

**Proof on the same throwaway case:** red — `Total shipped: 606.2 KB gzip` →
exit 1; green — probes removed → `Total shipped: 66.6 KB gzip` → exit 0.

- **Default decisions relied on:** one budget for everything the test page
  downloads (simplest rule that cannot go blind); source maps excluded because
  browsers do not fetch them without devtools open; HTML included.
- **Deferred:** the budget itself (200 KB) stays as-is — tightening it is a
  separate decision once the real surface exists.
