# 13 — Accessibility, Performance & Quality Gate (award-level bar)

## 0. Why this file exists
Awwwards-style juries weight **Design 40%, Usability 30%, Creativity 20%, Content 10%** (source: Awwwards criteria guides, see 02) and punish jank, slow loads and weak mobile. "Award-level" here means: flawless fundamentals (Design + Usability = 70%), **one original idea executed cleanly at 60fps** (the Cadence Ribbon + hero-is-the-product), real content, and the same quality on a phone as on a 27" display. Treat this file as a **release gate**, not advice.

## 1. Accessibility (WCAG 2.2 AA minimum; AAA text option)
- **Contrast:** text ≥ 4.5:1 (pending text included), UI/graphics ≥ 3:1; theme validator enforces (09 §8). High-contrast themes ≥ 7:1.
- **Keyboard:** everything reachable/operable; visible focus ring (`--focus-ring`, 2px + 2px offset); no keyboard traps; logical order; skip-link "Skip to typing field".
- **Screen readers:** landmarks (`header nav main footer`), headings hierarchy, `aria-live="polite"` region for test state (start, end, errors in batches), results summary readable; chart data-table alternative; Ribbon text summary; decorative SVG `aria-hidden`.
  Typing field announces: "Typing test. 30 seconds. Start typing to begin." Errors announced per setting: *Off · Per word · Per error*.
- **Colour independence:** errors use underline + wash + (optional) sound, not colour alone; finger colours include glyph initials; charts add shapes/patterns.
- **Motion:** respects `prefers-reduced-motion`; in-app Motion setting; no flashing > 3Hz.
- **Zoom/reflow:** works at 400% zoom, no horizontal scroll (code panes excepted), text spacing overrides don't break layout.
- **Targets:** ≥ 24×24 CSS px (WCAG 2.2) and ≥ 44px on touch.
- **Cognitive:** plain language, consistent patterns, no timeouts on UI (tests are the only timed thing), clear error recovery, "Reset section" everywhere.
- **Dyslexia/low vision options:** OpenDyslexic/Lexend/Atkinson Hyperlegible Mono, letter-spacing sliders, line-height presets, large-caret option, high-visibility focus.
- **Motor:** sticky-keys-safe, one-handed mode, no hold-to-confirm without alternative (provide confirm dialog fallback).
- **Testing:** axe-core in CI (0 serious/critical), manual NVDA+Chrome, VoiceOver+Safari, keyboard-only run-through per release, Windows High Contrast mode.

## 2. Performance budgets (mobile-first, mid-range Android over 4G as the reference)
| Metric | Budget |
|---|---|
| LCP | ≤ 1.6s (4G), ≤ 1.0s desktop |
| INP | ≤ 100ms (p75); typing key→paint p95 ≤ 16ms |
| CLS | 0.00 on `/` (reserve all space; font metrics override to avoid swap shift) |
| TBT | ≤ 100ms |
| JS on `/` (gzipped) | ≤ 170KB initial (engine + field + shell); route-split everything else |
| CSS | ≤ 40KB gz critical |
| Fonts | ≤ 3 families, subset; typing font preloaded; total ≤ 120KB |
| Images | none required; SVG/Canvas; any raster AVIF/WebP |
| Lighthouse | ≥ 95 Performance/A11y/Best-Practices/SEO |
| Time to first keystroke | ≤ 2s on 4G cold load |
**How:** SSR/SSG for `/`, inline critical CSS, defer analytics, dynamic-import charts/Motion extras/GSAP, `content-visibility:auto` below the fold, preconnect, service worker precache of shell + word lists, avoid hydration of non-interactive sections (islands/RSC), compress word lists with brotli, no layout thrash in input path (06 §8).
**CI gates:** Lighthouse CI on `/`, `/learn`, `/stats`; bundle-size check (size-limit); Playwright perf trace for typing loop (no long task > 50ms over 120s @ 15 keys/s).

## 3. Reliability & correctness
- Engine unit/property tests (06 §13) ≥ 95% coverage in `/packages/engine`.
- Replay determinism test: 1,000 random sessions replay to identical final state.
- Time source tests: mock `performance.now`, verify metrics.
- Cross-browser matrix: Chrome, Edge, Firefox, Safari (macOS/iOS), Android Chrome.
- Data safety: IndexedDB migration tests; export→import round trip equality.

## 4. Security & privacy gate
CSP strict (no inline scripts except hashed theme bootstrap), HTTPS/HSTS, SameSite cookies, CSRF protection, rate limiting, input validation (Zod) on every API, event-log size limits, dependency audit (npm audit/OSV), secrets in env only. Privacy: no third-party trackers by default; privacy-friendly analytics (self-hosted Plausible/Umami) opt-out; GDPR/DPDP-style delete/export; cookie banner only if needed.

## 5. Design quality gate (screen-by-screen checklist)
For **every screen** before merge:
- [ ] Uses tokens only (lint passes) · [ ] correct in dark + light + one high-contrast theme
- [ ] Exactly one memorable element; the rest quiet (08 §11)
- [ ] Type scale respected; line length ≤ 68ch; tabular numerals on data
- [ ] All states implemented (loading/empty/error/offline/partial) (12 §3)
- [ ] Motion uses tokens; reduced-motion variant exists (11 §14)
- [ ] Responsive at 360, 768, 1024, 1440, 1920; no horizontal scroll
- [ ] Keyboard-only pass + screen-reader pass
- [ ] Copy follows voice rules (12 §8) — no placeholder/lorem text
- [ ] Screenshot reviewed for alignment, optical spacing, orphan/widow text
- [ ] Lighthouse + axe clean

## 6. "Award criteria" mapping (self-audit before launch)
| Criterion | What we must show |
|---|---|
| **Design (40%)** | Distinct identity (Night Ink/Daylight + Cadence Ribbon), refined typography, systematic spacing, polished states, consistent iconography, beautiful data viz |
| **Usability (30%)** | Instant start, clear IA, excellent mobile, accessible, fast, forgiving, no dark patterns, perfect keyboard flow |
| **Creativity (20%)** | Hero-is-the-product; Ribbon; keycap physics; theme View Transition reveal; replay & ghost; diagnostic storytelling |
| **Content (10%)** | Real word lists/snippets/quotes, honest method page, great microcopy, real changelog, no lorem |
Additional: Awwwards Mobile Excellence-style check (Google mobile criteria), Developer Award-style checks (semantic HTML, clean code, SEO, performance, security headers).
Submission readiness: public case-study page `/about/how-its-built`, accessible, with performance numbers and design rationale.

## 7. Launch checklist
- [ ] All P0 features (05) pass AC · [ ] Perf/A11y/Sec gates green · [ ] Legal pages · [ ] Favicon/PWA icons/OG images (generated per mode) · [ ] Error monitoring (Sentry) · [ ] Backups/migrations · [ ] Content licences verified (word lists, quotes, snippets) · [ ] Browser/OS matrix verified · [ ] Press kit (logo, screenshots, ribbon animation) · [ ] Feedback channel (GitHub Discussions/Discord) · [ ] Changelog v1.0
