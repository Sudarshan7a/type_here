---
name: award-readiness-review
description: Rubric-based review of the built site against award criteria (Design, Usability, Creativity, Content, Developer/engineering, Mobile) including special pages (404, loading, empty, offline, error), Core Web Vitals, accessibility, and reduced motion. Use before design critiques, usability tests, or award submissions.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  source: docs/award-playbook
---

## Purpose
Give an honest, evidence-based readiness score. Do not flatter. Cite files, URLs, or screenshots for every claim.

## Rubric (Awwwards weights; use as a lens, not a promise)
- Design 40%: one clear art direction, typography, layout consistency, polish, motion language.
- Usability 30%: navigation clarity, speed, keyboard-first flow, mobile, accessibility, error handling.
- Creativity 20%: originality; signature moments that are meaningful (not decorative) and do not touch the typing path.
- Content 10%: microcopy, "How we calculate", changelog/roadmap, honesty about claims.
- Developer/engineering: performance, accessibility, semantics, browser support, no console errors.
- Mobile: fast, tappable, battery-friendly; honest phone experience.

## Hard checks (fail = blocker)
1. Typing surface: no decorative motion, no popups/modals, no per-keystroke React updates (see `typing-caret-rendering`, `typing-motion-tokens`).
2. Core Web Vitals targets at p75 in field/RUM or lab proxy: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1. Internal typing-latency target p95 <= 16 ms (proposal).
3. axe clean on every page and theme; keyboard-only core loop works; reduced-motion path tested.
4. Special pages designed, not default: 404, loading/skeleton, empty states, offline banner, error states.
5. No claims that promise speed gains, programming ability, or hireability.
6. Privacy behavior matches the policy (see `keystroke-privacy`).

## Scoring output
Return a table:
| Criterion | Score (1-10) | Evidence | Top fixes |
Then: "Blockers", "Quick wins (<1 day)", "Needs user testing", "Not verifiable from code". State uncertainty; do not invent scores without evidence.

## Usability data to request
SUS scores (target >= 80 before submission), task success, time to first keystroke, first-test completion rate. If missing, list it under "Needs user testing".

## Do not
- Add motion to raise a Creativity score at the expense of Usability or latency.
- Treat lab-only performance as field truth; recommend RUM (web-vitals) when absent.
