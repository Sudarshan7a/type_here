# 16 — Top Skills & Expertise Map

Two meanings of "skills" are covered: (A) **agent skills** to install in OpenCode (ready files in `skills/`), (B) **human/engineering skills** needed to ship and steer this at award level (with a learning order for a MERN developer).

## A. OpenCode agent skills (in `skills/`)
Install: copy each folder into `.opencode/skill/<name>/` in the repo (or `~/.config/opencode/skill/` for global). *Check the current OpenCode docs for the exact skills directory and frontmatter rules — they evolve. Folder name must equal `name`; names are lowercase-hyphen.*
| Skill | Loads when the agent… |
|---|---|
| `cadence-typing-engine` | works on input, metrics, text model, layouts, replay, anti-cheat |
| `cadence-adaptive-learning` | works on curriculum, generators, coach, spaced review |
| `cadence-design-system` | builds any UI (tokens, type, themes, components) |
| `cadence-motion` | adds/changes any animation, transitions, sound-linked visuals |
| `cadence-ux-states-copy` | designs flows, states, microcopy, empty/error screens |
| `cadence-code-content` | builds Code Lab content, generators, snippet pipeline |
| `cadence-quality-gate` | finishes any task (a11y/perf/design/tests checklist) |
Optional public skills worth adding alongside (search the OpenCode/Claude skills ecosystems and **review before installing third-party skills**): frontend-design guidance, webapp-testing (Playwright), a11y audit, Next.js best-practices, MongoDB schema/indexing, Web Audio, Canvas performance.

## B. Top human/engineering skills (ranked by impact on this product)
1. **High-performance input handling** — keyboard events, `event.code` vs `key`, IME/composition, hidden-input pattern, high-resolution timestamps, avoiding re-renders. *(06)*
2. **Deterministic state machines & testing** — pure engine, seeded PRNG, property-based tests, replay. *(06 §13)*
3. **Rendering performance** — DOM vs Canvas, layout thrash avoidance, `transform` animation, `content-visibility`, Chrome Performance panel mastery. *(06 §8, 11 §13)*
4. **Design systems & theming** — CSS custom properties, tokens, Tailwind v4 theming, contrast maths, theme validation. *(09)*
5. **Typography craft** — type scale, tabular numerals, mono font behaviour, optical alignment, font loading without CLS. *(09 §3)*
6. **Motion design** — easing, timing, choreography, FLIP/shared layout, View Transitions API, restraint, reduced motion. *(11)*
7. **Data visualisation** — D3/visx, Canvas heatmaps, accessible charts, uPlot, designing for insight not decoration. *(10 §8)*
8. **Learning science & adaptive algorithms** — deliberate practice, spaced repetition, interleaving, EMA models, difficulty targeting, bigram/trigram modelling. *(07)*
9. **Accessibility engineering** — WCAG 2.2, ARIA live regions, focus management, screen-reader testing. *(13)*
10. **Local-first architecture & sync** — IndexedDB/Dexie, outbox pattern, conflict policies, PWA/service workers. *(14 §5)*
11. **Web Audio** — buffer pre-decoding, latency, round-robin sample variance. *(05 F-SET-4)*
12. **Backend integrity & anti-cheat** — server replay validation, rate limiting, secure auth. *(06 §10, 14)*
13. **Content engineering** — corpus building, licence compliance, difficulty scoring, grammar-based generators. *(14 §7, 07 §10)*
14. **Product copy/UX writing** — microcopy, voice consistency, empty/error states. *(12)*
15. **Prompting/steering AI agents** — spec-driven development, small PRs, acceptance-criteria-first, review loops. *(15)*

## C. Suggested learning order for Sudarshan (MERN → this stack)
1. **Next.js App Router + TypeScript strict** (you know React; learn RSC, route handlers, streaming).
2. **Canvas 2D + requestAnimationFrame** (build the ribbon prototype first — 1 day).
3. **Keyboard events deep-dive** (build a 100-line key logger that prints `code/key/timeStamp`).
4. **Zustand + Dexie** (local-first data).
5. **CSS tokens + Tailwind v4 theming** (build 3 themes + switcher).
6. **Motion library + View Transitions** (do the result-reveal choreography).
7. **Playwright + Vitest + fast-check** (tests for the engine).
8. **Web Audio basics** (key sounds).
9. **MongoDB indexing + auth** (you already know Mongo; add Better Auth).
10. **Lighthouse/perf profiling** (make it a habit).
Interview bonus: this project demonstrates systems thinking, performance engineering, accessibility, design systems and testing — strong SDE-1 portfolio signals (mention numbers: key→paint ms, Lighthouse scores, test coverage).

## D. First 7-day sprint plan
Day 1 tokens + shell + themes · Day 2 engine v0 (text model + metrics + tests) · Day 3 TypingField + caret + perf trace · Day 4 results + chart + ribbon · Day 5 persistence + stats basics + coach v0 · Day 6 settings + two more themes + sound · Day 7 polish + quality gate pass + demo video.
