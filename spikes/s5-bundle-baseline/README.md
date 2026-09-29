# Spike S5 — Bundle baseline

## Question

What does the current shell cost against the 200 KB gzip budget for the test
page's JavaScript, and what headroom does that leave for the typing surface,
themes, a motion library, and analytics?

## Method

Read the current production build size from the CI-enforced bundle gate
(scripts/check-bundle-size.mjs, apps/web build). No new code.

## Result

PASS (LAB PROXY — size measured from the local production build; the gate re-verifies in CI on every push).

- Current shell: **66.3 KB gzip** (React 19 + ReactDOM + minimal app code; raw 214.6 KB).
- Budget (test-page JS, starting point per implementation guide M0-05): **200 KB gzip**.
- Headroom: **~133.7 KB gzip**.

Indicative allocation of the remaining headroom (planning figures, not caps, and every line gets re-measured as features land):

| Area | Indicative allowance (gzip) | Notes |
|---|---|---|
| Typing surface (text model, char states, caret, input adapter) | ~40 KB | No per-keystroke React state; DOM-diff-free updates |
| Themes + design tokens (CSS is not JS; JS for token switching only) | ~5 KB | Themes ship as CSS custom properties, not JS |
| Motion (if any library at all; tokens-first, most motion is CSS) | 0-15 KB | Small utilities only; nothing heavy; reduced-motion path required |
| Analytics + error scrubbing (Block D package, stubbed vendor adapter) | ~10 KB | Allowlist-driven, no vendor SDK before review |
| CodeMirror 6 + Tree-sitter WASM (programmer track) | **outside this budget** | Lazy-loaded on demand per AGENTS.md; must never touch the test page's initial JS |
| Reserve for growth + mistakes | ~60 KB | The point of a budget |

## Evidence

- `pnpm build && pnpm check:bundle` output (recorded in CI on every push):
  `index-*.js 214.6 KB raw, 66.3 KB gzip` — budget 200 KB, PASS.
- Session 2 gate proof: a deliberately bloated build (moment ×2, lodash ×2,
  luxon, jszip) reached 234.1 KB gzip and CI run 36486751130 failed at the
  bundle step — the gate is enforced, not decorative.

## Risks

- React itself (66 KB) is 33% of the budget before any product code exists.
  If the headroom ever runs out, the escape hatch is dropping React for the
  typing surface only (the engine is framework-agnostic by design) — not
  raising the budget.
- Vendor analytics SDKs commonly cost 20-80 KB; the Block D telemetry package
  is allowlist-first with a thin adapter precisely to avoid importing one.

## Recommendation

Keep the 200 KB budget. Re-measure at every M-milestone that adds JS to the
test page; keep CodeMirror/Tree-sitter strictly behind lazy imports
(verified in S4); do not admit a vendor analytics SDK without a bundle-size
line in its review.
