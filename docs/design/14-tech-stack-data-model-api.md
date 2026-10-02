# 14 — Tech Stack, Architecture, Data Model & API

> `[Recommendation]` throughout. Versions: use latest stable at build time and **verify compatibility** (React/Next/Tailwind majors move fast). Chosen to match a MERN-comfortable developer while meeting award-level performance.

## 1. Stack
| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript (strict)** everywhere | shared engine types, fewer runtime bugs |
| Framework | **Next.js (App Router) + React** | SSR/SSG for instant `/`, route-level code-splitting, RSC for static sections |
| Styling | **Tailwind CSS v4** bound to CSS variable tokens (09) + CSS modules for complex components | token-driven theming, small CSS |
| Primitives | **Radix UI** (or React Aria) | accessible headless components |
| Motion | **Motion (motion/react)**, **GSAP** (marketing only), View Transitions API | see 11 |
| State | **Zustand** (UI/settings) + engine class (typing state outside React) + **TanStack Query** (server data) | typing path must not re-render React per key |
| Local DB | **Dexie (IndexedDB)** | local-first, offline, large event logs |
| Charts | **visx / D3** + **uPlot** + Canvas | pixel-exact, light |
| Validation | **Zod** | shared client/server schemas |
| Backend | **Node.js** — Next route handlers for v1; split to **Fastify** service if WebSockets/race needed | MERN familiarity |
| DB | **MongoDB Atlas** (users, results summaries, leaderboards, texts) — *or Postgres if you prefer relational* | MERN-aligned; event logs stored as compressed blobs/GridFS or object storage |
| Realtime (P2) | **Socket.IO** or **PartyKit/Cloudflare Durable Objects** | rooms, authoritative race state |
| Auth | **Better Auth / Auth.js** (email magic link, GitHub, Google) | quick, secure |
| Audio | **Web Audio API** | low latency key sounds |
| i18n | **next-intl / Lingui** (ICU messages) | |
| PWA | **Serwist/Workbox** service worker | offline + installable |
| Testing | **Vitest**, **fast-check**, **Playwright**, **Storybook + a11y**, **axe-core**, **Lighthouse CI** | gates in 13 |
| Lint/format | ESLint (+ custom token rule), Prettier, stylelint | |
| Monorepo | **pnpm + Turborepo** | engine package reuse |
| Hosting | **Vercel** (web) + **Atlas** + object storage (S3/R2) | |
| Observability | Sentry, self-hosted Umami/Plausible | privacy friendly |

## 2. Repository layout
```
cadence/
├─ AGENTS.md                      # agent rules (from 15)
├─ docs/spec/                     # THIS spec pack (00–16)
├─ .opencode/skill/<name>/SKILL.md  # skills (see /skills)
├─ apps/
│  └─ web/                        # Next.js app
│     ├─ app/(marketing)/ about, method, changelog, help
│     ├─ app/(app)/ page.tsx(Test), learn, practice, code, real-world, race, stats, settings, themes, layouts, text, onboarding
│     ├─ components/ (ui/, typing/, stats/, learn/, keyboard/)
│     ├─ styles/ tokens.css, themes/*.json
│     ├─ lib/ (db, sync, audio, theme, analytics)
│     └─ public/ fonts, icons, sounds
├─ packages/
│  ├─ engine/                     # framework-agnostic typing engine (06)
│  ├─ content/                    # word lists, quotes, snippets, generators (07)
│  ├─ layouts/                    # keyboard layout JSONs + finger maps
│  ├─ stats/                      # metrics, transition model, coach (05, 07)
│  ├─ ui-tokens/                  # tokens + theme validator
│  └─ schemas/                    # Zod schemas shared
└─ tooling/ (scripts for corpus build, licence check, theme validation)
```

## 3. Data model
### Client (IndexedDB via Dexie)
```ts
Test        { id, ts, mode, length, difficulty, errorMode, layout, language, seed, textHash, metricsVersion, engineVersion,
              netWpm, rawWpm, acc, cons, chars:{c,i,e,m}, durationMs, symbolWpm?, codeWpm?, tags[], synced:boolean }
EventLog    { testId, blob(compressed) }                 // lazily loaded for replay
KeyStat     { key, mod, speedMs, errRate, n, lastSeen }
PairStat    { a, b, ms, errRate, n, cls, lastSeen }
WordStat    { word, errs, n, lastSeen }
Session     { id, startTs, endTs, minutes, plan?, tests[] }
Progress    { track, level, stars, bestWpm, bestAcc, completedTs }
Settings    { json, updatedTs }   Texts { id, title, body, tags }   Achievement { id, ts }
```
### Server (MongoDB collections)
```ts
users        { _id, handle, email, createdAt, privacy:'public'|'unlisted'|'private', layout, prefsRef }
tests        { _id, userId, ts, mode, difficulty, errorMode, layout, language, seedOrHash, metrics{...}, valid:boolean, flags[] }
eventLogs    { testId, storageKey, bytes, sha256 }            // object storage pointer
leaderboard  { boardKey, userId, score, testId, ts }          // boardKey = mode|len|difficulty|errorMode|layout|period
progress     { userId, track, level, stars, ... }
syncState    { userId, deviceId, cursor }
themes       { _id, ownerId, name, tokens, public:boolean, likes }
snippets     { _id, language, license, source, attribution, text, difficulty, tags }   // curated corpus
challenges   { date, seed, mode, config }
```
Indexes: `tests(userId, ts desc)`, `leaderboard(boardKey, score desc)`, `users(handle unique)`, `snippets(language, difficulty)`.

## 4. API (REST, JSON, Zod-validated, versioned `/api/v1`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/tests` | submit result (+ optional event log upload URL) → returns validity + PB flags |
| GET | `/tests?cursor=` | history (paginated) |
| GET | `/tests/:id` · `/tests/:id/events` | detail / replay log (owner or public) |
| POST | `/sync/push` · GET `/sync/pull?cursor=` | append-only sync of tests/keystats/progress/settings |
| GET | `/leaderboards/:boardKey?period=` | board |
| GET | `/challenges/today` · POST `/challenges/today/submit` | daily |
| GET/PUT | `/me` · `/me/settings` | profile/settings |
| GET | `/profiles/:handle` | public profile |
| GET | `/content/snippets?language=&difficulty=` · `/content/quotes` | content |
| POST | `/themes` · GET `/themes?sort=` | community themes (P2) |
| WS | `/race` | rooms: `join, ready, progress, finish` (server-authoritative) |
Rules: rate-limit per IP/user; idempotency keys on `/tests`; max event-log size 2MB; reject unknown fields; return problem+json errors.

## 5. Sync strategy (local-first)
- Client is source of truth offline. Each mutation appends `{id(ULID), deviceId, ts, type, payload}` to an outbox.
- `push` sends batches; server dedups by id; `pull` returns server-side changes since cursor.
- Settings: last-write-wins per key. Stats: recomputed from events when possible; otherwise merge EMA by weighted n.
- Anonymous→account merge: user chooses (default merge); idempotent.

## 6. Server-side validation of runs (leaderboards)
Run the same `engine` package in Node to **replay the uploaded event log** against the seed/text; recompute metrics; compare to claimed; apply heuristics (06 §10). Store `valid`, `flags`. Only valid runs enter boards.

## 7. Content pipeline (offline scripts in `/tooling`)
1. Word lists: frequency data (check licence) → clean/dedupe/profanity-filter option → sort by rank → JSON (brotli).
2. Quotes: public domain only; length bucketed.
3. Code corpus: pull permissively-licensed repos → `licensee`/SPDX detection → chunk → strip secrets/URLs → compute difficulty features → human spot-check → import into `snippets`.
4. Layouts: JSON per layout validated by schema + visual check in Storybook.
5. Theme validator in CI.

## 8. Security notes
Auth cookies httpOnly+Secure+SameSite=Lax; CSRF tokens for mutations; validate `handle` (reserved words); sanitise custom text on import; never execute user code; snippet rendering via text nodes only; rate-limit magic links; log minimal PII; GDPR/DPDP delete pipeline removes tests + logs + leaderboard rows.

## 9. Observability
Core product events (privacy-safe): `test_completed(mode,len,difficulty,wpmBucket)`, `lesson_*`, `drill_*`, `coach_*`, `theme_changed`, `export`. Web-vitals reporting (LCP/INP/CLS) + custom `keypaint_ms` metric sampled 1%.
