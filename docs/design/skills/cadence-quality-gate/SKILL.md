---
name: cadence-quality-gate
description: Run before declaring any Cadence task done — checks accessibility (WCAG 2.2 AA), performance budgets, token compliance, state completeness, motion rules, responsive behaviour, security and test coverage against the award-level bar.
---

# Cadence quality gate

Source: `docs/spec/13-accessibility-performance-quality-gate.md`.

## Checklist (all must pass; report ✔/✘ with evidence)
**Design:** tokens only · dark+light+high-contrast verified · one memorable element · type scale/line length ok · no lorem · differentiation check (08 §11).
**States:** loading/empty/error/offline/partial implemented (12 §3).
**Motion:** tokenised, reduced-motion variant, 60fps @4× throttle, CLS 0, no long task >50ms while typing (11 §14).
**A11y:** keyboard-only pass, focus visible, axe 0 serious/critical, screen-reader live regions, contrast ≥4.5:1 text/≥3:1 UI, colour-independent errors, targets ≥24px (44px touch).
**Performance:** LCP ≤1.6s (4G), INP ≤100ms, CLS 0, `/` JS ≤170KB gz, Lighthouse ≥95; key→paint p95 <16ms.
**Responsive:** 360/768/1024/1440/1920 with no horizontal scroll (code panes excepted).
**Quality:** unit+property+e2e tests green; engine coverage ≥95%; lint/stylelint/type-check clean.
**Security/privacy:** inputs validated (Zod), no trackers by default, CSP intact, no secrets committed.

## Output format
Reply with: summary of changes · AC checklist · metrics (Lighthouse, bundle size, key→paint) · screenshots (dark+light, desktop+mobile) · known gaps and follow-ups.
