# RealType — Agent Instructions

Typing trainer web app (working title). Goal: diagnose → drill → retest, with a language-agnostic programmer track.
Product truth lives in `docs/spec/master-spec-v1.md` (copy it there). **Read sections on demand, not all at once.**
Requirement IDs (ENG-01, LRN-02, PRG-10…) are the unit of work. Cite the ID in commits and PRs.
Step-by-step build instructions live in `docs/spec/implementation-guide.md` (task IDs R0-xx, M0-xx … M8-xx, V1-xx). **Read only the chapter for the current task.**
Habit/retention design: `docs/spec/retention-and-mastery-playbook.md`. Proof/efficacy/trust/first-users plan: `docs/spec/six-pillar-proof-plan.md` (templates in `docs/templates/`). Craft targets: `docs/spec/award-playbook.md`.

## Stack (MVP, "boring first")
- Frontend: React + TypeScript + Vite (SPA), CSS variables for themes, small state store (Zustand)
- Engine: framework-agnostic TS package in `packages/engine` (shared by client and server)
- API: Node.js + Express/Fastify (TypeScript), Zod schemas in `packages/schemas`
- DB: MongoDB. No Redis/queues/websockets until V1 (leaderboards, races).
- Lazy-loaded: CodeMirror 6 and Tree-sitter WASM (programmer modes only)

## Repo layout (create if missing)
- `apps/web` (UI) · `apps/api` (server) · `packages/engine` · `packages/schemas` · `docs/spec` · `e2e`

## Commands (live as of M0-10)
- Install: `pnpm install` · Dev (web): `pnpm --dir apps/web dev` · Dev (api): `pnpm --dir apps/api dev`
- Test: `pnpm test` · E2E: `pnpm e2e` · Lint/types: `pnpm lint && pnpm typecheck`
- Format: `pnpm format` / `pnpm format:check` · Build: `pnpm build` · Bundle gate: `pnpm check:bundle`
- License gate: `pnpm check:licenses` · Prod audit: `pnpm audit:prod`
- Run tests and typecheck before saying a task is done. CI runs on every branch push; the branch must be green before merge.

## Project decisions (confirmed, Decision Log D1-D17)
- Name: "RealType" (working title; trademark check before beta, M7)
- License: open-core — `packages/engine` and `packages/schemas` MIT; `apps/`, `content/`, docs proprietary
- Age policy: 18+ only at launch (age gate on first visit with the first user-facing release)
- Programmer-track languages (priority): JS/TS, Python, Java, SQL, HTML/CSS
- Keyboard layouts (build order): QWERTY-US fully first, then QWERTY-UK, Dvorak, Colemak-DH, AZERTY, QWERTZ (one PR each)
- Tooling pins: Node 24 (`.nvmrc`), pnpm 11.2.2, TypeScript 6.0.3 (typescript-eslint ceiling), Vitest 5 + Playwright; coverage gates: engine/schemas 85%, api 70%, web 60%

## Non-negotiable rules
1. **Typing surface is sacred:** no popups, modals, ads, or decorative motion while typing. Input must feel instant (target input-to-paint p95 ≤ 16 ms).
2. **Never `setState` per keystroke.** Keep engine state outside React; update the DOM via refs/motion values/external store.
3. **Metrics live only in `packages/engine`** and are used by client and server. Changing a formula requires bumping `modelVersion` and updating `/how-we-calculate`.
4. **Privacy:** never send keystroke content to analytics or error tracking. Composition text is not stored unless opted in. See skill `keystroke-privacy`.
5. **Never execute user or library code** (code snippets are display-only). Sanitize all rendered snippets.
6. **Licensing:** do not copy code, word lists, or quotes from GPL/AGPL projects (e.g., Monkeytype, Keybr). Every content item needs a license field.
7. **Accessibility:** WCAG 2.2 AA for non-test UI; respect `prefers-reduced-motion`; never color-only state cues. See skills `a11y-typing-ui`, `typing-motion-tokens`.
8. **Adults only (18+) at launch.** **No public leaderboards** until integrity work (INT-05…INT-08) is done.
9. **Claims:** never write UI/marketing copy that promises speed gains, better programming ability, or hireability.

## Skills to load (use the `skill` tool)
- Typing core: `typing-engine-core`, `typing-metrics-spec`, `typing-caret-rendering`
- UI/motion: `typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui`
- Programmer track: `token-drill-generators`
- Trust/privacy: `integrity-anti-cheat`, `keystroke-privacy`
- Quality: `typing-e2e-testing`, `award-readiness-review`
- Habit/retention/gamification: `habit-gamification-rules`
- Efficacy and experiments: `efficacy-and-experiments`
- If installed: `frontend-design`, `web-design-guidelines`, `emil-design-eng`, `review-animations`, `vercel-react-best-practices`

## Working style
- Plan first (Plan agent) for anything spanning >3 files; then build in small, tested slices.
- Prefer small PRs tied to one requirement ID. Add tests with the change.
- When unsure about a library API, use Context7 (`use context7`) rather than guessing.
- If a requirement conflicts with these rules, stop and ask.
