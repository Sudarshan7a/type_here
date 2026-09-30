# SESSION 4 REPORT — RealType

**Date:** 2026-09-28 · Session 4 complete. Every block landed on a branch, was
verified green in CI, and merged with `--no-ff`.

## Block A — main-branch audit (result: A2, clean, with one gap)

Trusting nothing from Session 3's own report:

| Check | Method | Result |
|---|---|---|
| Direct commits to main | `git log --format="%h\|%p\|%s"`, 30 commits | Every task's work sits behind a **merge commit**; "direct" entries in the log are branch commits reachable *through* those merges. |
| The S4 repair | parents of `bcc233e` / `2595ecc` / `f8237f7` | `bcc233e` is a parent of merge `f8237f7`; the other parent is the pr-log/incident commit. The work is behind a merge. |
| History rewritten? | `git reflog show main` | **No reset/force entries.** Exactly one `commit:` entry (the disclosed S4 one); everything else is `merge …: Merge made by the 'ort' strategy`. **Append-only, as claimed.** |
| Numbers | clean `git worktree` at 5aff79d, full pipeline | engine **56/56** tests, coverage **95.82 / 92.7 / 95.08 / 97.07**; schemas 56, telemetry 97, api 4, web 8, recorder 11 = **232 tests, 0 failures**; bundle 66.3 KB. Matches Session 3 exactly. |
| HEAD CI | run 36711540608 | success |
| Red runs on main commits | 64 runs cross-referenced | Six, **all previously disclosed** and superseded within minutes. No undisclosed red run. |

**GAP: branch protection is not enabled.** A throwaway commit dry-run pushed
to `main` was **accepted** (`5aff79d..9576ce6`, exit 0); `git ls-remote` confirms
the remote ref did not move. Direct pushes to main are still possible — the
mechanical reason the merge protocol was breakable. Now the top human action.

## Block B — bundle-gate blind-spot hunt: two MORE found

Probes were built to be realistic (incompressible payloads decoded at runtime,
so tree-shaking could not delete them — an early naive probe measured nothing
because the bundler folded it away). Each on a throwaway branch, deleted after.

| Vector | Result | Evidence |
|---|---|---|
| Dynamic `import()` chunk | **CAUGHT** | 300 KB chunk → 287.9 KB gzip → gate failed (exit 1) |
| Web worker (`new Worker(new URL(...))`) | **CAUGHT** | 400 KB worker → 360.8 KB gzip → gate failed (exit 1) |
| Base64 data URI inlined in CSS | **BLIND SPOT** | 533 KB CSS shipped; gate said 66.3 KB, **passed** |
| Static asset from `public/` | **BLIND SPOT** | 200 KB asset shipped; gate said 66.3 KB, **passed** |

**Fix:** the gate now walks the whole `dist/` (source maps excluded), gzips
everything, and compares the total to one budget. Proven on the same throwaway
case: red at 606.2 KB, green at 66.6 KB.

## Block C — layout verification (LAYOUT PROTOCOL)

All **six** in-scope layouts derived from physical key positions and verified
independently, stored as data in `packages/engine/src/layout-fingers.ts`
(full table in `docs/LAYOUT-VERIFICATION.md`). Same-finger letter-bigram rates
land at 14.8–16.0% across layouts — inside the range touch-typing research
reports, an independent structural check. The engine's QWERTY and Dvorak maps
were confirmed correct.

**Three errors in my own tests were caught** by the protocol (the
implementations were right): `c` is left-*middle* not left-index; AZERTY's `w`
is the bottom-left key; QWERTZ **swaps** `y`/`z` versus QWERTY. AltGr/dead-key
characters return `unknown` (human action).

## Block D — robustness fixtures (partial)

Added: **E09** (zero keystrokes → "not available", never 0 WPM), **A02**
(very short test, numeric stability), **corrupted-log** (out-of-order
timestamps, unmatched keyup, duplicate events, schema rejection). One of these
found a **real bug**: a negative timestamp produced a negative duration, now
clamped. Also implemented **E10 as a lint rule** (`Date.now()` banned in
`packages/engine`), proven to fail on a probe. Not done this session (deferred
honestly): E3 Caps Lock, E5 dead keys, E6 graphemes, E7 paste, E8 dual-key,
A03 long-test, D02–D04 modes. **D04 is a contract gap** — word-lock is not
representable in `TypingSettings`; logged, not invented.

## Block E — engine wired into the web app (the hands-on artifact)

`pnpm --dir apps/web dev` → pick a prose passage → Start → type with a **real
keyboard** → live metrics from `packages/engine`: net/raw/gross WPM, keystroke
and final accuracy, KSPC, consistency, burst, mean key interval, rollover, and
the engine's model version. Per-keystroke path touches only the DOM (refs); React
state changes on start/finish. Three e2e tests type through a real browser and
assert the numbers move with real input.

## Things worth your attention

1. **Branch protection is still off** — verified by dry-run, not assumed. It is
   the single mechanical gap in the merge discipline.
2. **The bundle gate was blind to an entire file category for three sessions.**
   Fixed generally this time (whole-dist measurement), not case-by-case.
3. **The LAYOUT PROTOCOL immediately paid for itself**: it caught three factual
   errors in tests I had written minutes earlier, and confirmed the engine's
   existing maps — none of which the chapters had been right about.
4. **Session 3's repair claim held up** under independent audit; the only
   red CI runs on main are the six already disclosed.

## Next run

1. Remaining Chapter 4 edge fixtures (E3, E5, E6, E7, E8, A03, D02, D03) — each
   needs a mode or input feature the engine does not yet have.
2. D04 word-locked mode requires a `TypingSettings` contract change
   (CONTRACT_VERSION bump) — decide scope first.
3. E7's server-side paste plausibility backstop, once the API can recompute.
4. Human: the manual engine test, the two manual spike pages, recorded fixtures.
