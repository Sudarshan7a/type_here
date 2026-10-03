# Decision Log

**Entry format:** date · decision · options considered · reasoning · evidence link · approver · revisit trigger.
Never overwrite; add a new entry that references the old one.

## Recorded on Day 1
| Item | Decision | Status |
|---|---|---|
| Capacity | AI works in bounded, continuous runs; human review is the bottleneck | Accepted |
| Goal | Real product for public users | Accepted |
| Start | Validate + build the engine in parallel | Accepted |

## Defaults (D1-D17): confirm or change
| # | Decision | Default | Your choice | Date |
|---|---|---|---|---|
| D1 | Name/domain/brand | "RealType" working title; check name, domain, trademark before public beta | Accepted (working title; trademark check still due before beta, M7) | 2026-09-27 |
| D2 | Open-source stance | Open-core: engine open (permissive), hosted service private | **Accepted, explicitly confirmed** — engine + schemas MIT (LICENSE files in packages/); rest proprietary | 2026-09-27 |
| D3 | Age policy | **18+ only at launch** (India DPDP: under 18 = child) | **Accepted, explicitly confirmed** — age gate on first visit; no child-directed copy | 2026-09-27 |
| D4 | Authentication | Managed provider: email + Google + GitHub | Accepted (M3) | 2026-09-27 |
| D5 | Hosting | Static host + one API service + managed MongoDB (free tiers first) | Accepted — assumed Vercel (web) + Render/Fly.io (api) + MongoDB Atlas until changed | 2026-09-27 |
| D6 | Code-track languages | JS/TS(JSX), Python, Java, SQL, HTML/CSS | **Accepted, explicitly confirmed** — priority order: JS/TS, Python, Java, SQL, HTML/CSS | 2026-09-27 |
| D7 | Layouts | QWERTY US/UK, Dvorak, Colemak-DH, AZERTY, QWERTZ | **Accepted, explicitly confirmed** — QWERTY-US first, then one per PR | 2026-09-27 |
| D8 | Analytics | Privacy-friendly, strict event allowlist | Accepted (M0-07) | 2026-09-27 |
| D9 | Error tracking | Managed, with scrubbing verified | Accepted (M0-07) | 2026-09-27 |
| D10 | Email provider (V1) | Decide at V1 | Accepted (defer) | 2026-09-27 |
| D11 | Payments (V1) | Decide at V1 (consider regional methods) | Accepted (defer) | 2026-09-27 |
| D12 | Content sources | Original + public-domain + permissive only | Accepted | 2026-09-27 |
| D13 | LLM usage | None at MVP | Accepted (defer) | 2026-09-27 |
| D14 | Raw log retention | 30 days (verified/flagged excepted) | Accepted (M3 implementation) | 2026-09-27 |
| D15 | Testing stack | Fast unit runner + 3-engine browser e2e + CI budgets | Accepted — Vitest (unit), Playwright (e2e) | 2026-09-27 |
| D16 | Mobile scope | Honest mobile message + responsive site | Accepted | 2026-09-27 |
| D17 | Accessibility target | WCAG 2.2 AA (non-test UI) + typing-specific rules | Accepted | 2026-09-27 |

Defaults accepted on 2026-09-27 per `docs/WEEK-0-2-PLAN.md` ("accepted unless you change them") and the AUTONOMOUS-BUILD-EXECUTION-PROMPT (Sections 1-2), which explicitly re-affirmed D2, D3, D6, D7 and set tooling defaults (pnpm workspaces, Vitest, Playwright, Tailwind, React context-first state).

## Pre-set thresholds (write BEFORE collecting data)
| Signal | Threshold | Decision if missed |
|---|---|---|
| Interviewees who would try it | | |
| Waitlist conversion | | |
| Prototype completion unaided (of 5) | | |
| Latency spike | | |
| Engine parity | | |
| PMF "very disappointed" | 40% (rule of thumb) | |
| D7 return | | |
| Efficacy (adaptive vs control) | | |

Thresholds pending human decision (Track A, `docs/WEEK-0-2-PLAN.md` §3) — the AI cannot pre-register these.

## Entries
(Add below.)

### 2026-10-01 — ADR-003: Full-scope build (owner decision, not inferred)
- **Decision:** Build the **entire** feature set in `master-spec-v1.md`, `retention-and-mastery-playbook.md` and `implementation-guide.md` — every row tagged MVP, V1, V2 and LATER. Recorded as an owner decision; not inferred from the roadmap.
- **Supersedes:** the earlier reading of Section 5 (roadmap Phases 1–8) as the whole job. Section 5's phase lists are now the **first part** of the work, not the end of it. Phases 1–8 deliver the MVP; V1, V2 and LATER follow.
- **Mechanism:** `docs/FEATURE-LEDGER.md` is the source of truth for "what remains" (Section 18.2). One row per spec ID, seeded from all three spec documents plus the roadmap's test IDs. Status vocabulary: `NOT STARTED` / `IN PROGRESS` / `DONE-VERIFIED` / `LAUNCH-GATED` / `BLOCKED-EXTERNAL` / `DEFERRED-BY-HUMAN` / `REJECTED-BY-ANTI-GOAL`.
- **Build order:** dependency-first, then roadmap Phases 1–8, then V1, then V2, then LATER.
- **Reasoning:** the owner is the only party who can weigh effort against value across the whole backlog; the roadmap's phase order was a sequencing aid, not a scope limit.
- **Approver:** human owner (explicit instruction, 2026-10-01).
- **Revisit trigger:** the owner issues a `STEER` file, or a `RESPONSE` file defers rows.

### 2026-10-01 — ADR-004: V1 ordering overridden to dependency order
- **Decision:** Where the spec says V1 order "must be re-prioritized from real beta data", use **dependency order plus tag order** instead.
- **Reasoning:** the beta data that would drive re-prioritization does not exist, and Phase 8 cannot produce it until V1 exists. Waiting for it is circular.
- **Risk accepted (recorded, not resolved):** the resulting V1 build order may not match the order real users would have valued most. Phase 8's evidence is therefore *more* important after this override, not less, because it is now the only input allowed to shape V1 — and it arrives after the fact. Mitigation: the ledger records `depends-on` explicitly, so a wrong guess is visible and cheap to reorder; nothing is baked into a migration or public contract that reordering would break.
- **Approver:** human owner (Section 18.3).
- **Revisit trigger:** beta evidence exists (Phase 8), or a `STEER` file sets a different order.

### 2026-10-01 — ADR-005: Validation gates become launch gates, not build gates
- **Decision:** Specs that say "do not build X until Y is validated" (Levels 31–60, Stack Packs, Train on Your Own Code, Edit Tasks, certificates, exam simulator, consumer subscription) are now **built anyway**, behind a feature flag that is **OFF by default**. The row becomes `LAUNCH-GATED` with the gate named. Only a `RESPONSE` or `STEER` file can turn a flag on.
- **Supersedes:** Section 2 rule 15 and Section 5 Phase 6, which said Tiers 7–12 / Levels 31–60 remain UNBUILT. Those tiers are now built after Phase 6's exit criteria are met, flag OFF.
- **Why this is not merely "build everything":** the anti-goals in Section 18.5 are unaffected and remain absolute. A spec row that requires an anti-goal is logged as a spec conflict (Section 9) and the offending part is not built at all — not flagged, not deferred. The distinction is between *validation gates* (removable, becomes a flag) and *product principles* (permanent, becomes a rejection).
- **Anti-goals that are NOT gates and will never be built (Section 18.5):** ads/upsell during typing, selling paid competitive advantage, streak shaming and loss-framing, hidden trials or surprise renewals, selling or sharing raw keystroke data, GPL/AGPL content, outcome claims (ability/hireability/health), under-18 features, executing snippet code, single-attempt progress gating.
- **Dependency gates that remain build-order constraints:** no public leaderboard, race or ranking code path is enabled until INT-05…INT-08 exist and pass (INT-10); server recomputation, signed sessions and the privacy canary are never skipped or flagged away; a flag-OFF feature leaves no trace in the typing flow, network traffic or analytics.
- **Approver:** human owner (Section 18.4).
- **Revisit trigger:** a `RESPONSE` file enables a flag, or a `STEER` file re-gates a row.

### 2026-10-01 — ADR-006: Streak threshold — 3 minutes, weekly-goal primary
- **Decision:** A day counts at **>= 3 focused minutes**, and the **weekly-goal streak is primary** (with an optional daily streak).
- **Conflict:** master spec MOT-01 says >= 5 focused minutes. The retention playbook (RET-05/06/07 and its section 10.3 edit table) explicitly replaces MOT-01 with >= 3 minutes and a weekly primary.
- **Reasoning:** the playbook is the later, more explicit decision and states that it supersedes MOT-01. Section 9's conflict protocol prefers the later explicit decision. `[INFERRED]` — the playbook's edit table reads as a correction of MOT-01, not a parallel option; if that reading is wrong the threshold is a single config value and changes cheaply.
- **Approver:** resolved under Section 9 from existing documented decisions; no new human decision required.
- **Revisit trigger:** the owner disagrees, or efficacy data shows the threshold is mis-set.

### 2026-10-01 — ADR-007: Tier 0 exists; language set is the listed one
- **Decision (levels):** use the roadmap's **Tier 0 (Levels 0.1–0.5)** before Tier 1, and the spec's V2 tags for Tiers 10 and 12. The roadmap states Tier 0 corrects a sequencing gap identified mid-project, so it is the later correction.
- **Decision (languages):** build the **listed** set — JS/TypeScript/JSX, Python, Java, SQL, HTML/CSS — and record the count actually used. The "3–5 languages" phrasing contradicts the six-item list that immediately follows it; building the listed set is the reading that loses nothing.
- **Approver:** resolved under Section 9 from existing documented decisions.
- **Revisit trigger:** the owner picks a different language set, or demand data justifies a change.

### 2026-10-01 — ADR-008: Retest cadence is a config value, default day 0/30
- **Decision:** implement the retest cadence as a **configuration value**. Default **day 0/30**; day 0/30/60 and day 0/14/30 ship as named presets. Dependent code is isolated behind the config.
- **Conflict:** three cadences coexist in the sources — day 0/30 (master spec section 6.6), day 0/30/60 (programmer baseline section 7.5), day 0/14/30 (roadmap Phase 5).
- **Why this is EXTERNAL DECISION REQUIRED and not silently resolved:** Section 18.11 rule 5 states this changes **metric semantics**. Choosing silently would alter what a "retest" means across the efficacy readout, which is a published number. The config-value approach is the smallest reversible implementation that does not lock any cadence in.
- **Status:** `EXTERNAL DECISION REQUIRED` — registered in `HUMAN-ACTIONS.md` with the exact options. The default is not a recommendation that the others are wrong; it is the least-committal choice pending the owner's call.
- **Approver:** none yet. Requires a `RESPONSE` file.

### 2026-09-27 · ADR-001: Repository and merge protocol without GitHub CLI
- **Decision:** Branch-per-task (task/<phase>-<id>), local gates, local --no-ff merge to main, push. No GitHub PRs for now.
- **Options considered:** (a) install gh CLI myself, (b) halt until human sets up PRs, (c) local merges with branch history preserved.
- **Reasoning:** gh is not installed; halting contradicts the autonomous-execution prompt; local --no-ff merges preserve the branch-per-task audit trail and push cleanly. Branch protection on GitHub still needs the human (see BUILD-LOG "Flagged for human review").
- **Approver:** autonomous run (Section 7 mechanism).
- **Revisit trigger:** gh CLI installed / branch protection enabled.

### 2026-09-27 · ADR-002: Tooling stack and pins (M0-04)
- **Decision:** pnpm 11.2.2 workspaces; Node pinned to 24 (`.nvmrc`, engines >=24); TypeScript **6.0.3**; ESLint 10.11.0 flat config + typescript-eslint 8.70.1 + eslint-config-prettier; Prettier 3.9.9; Vitest 5.0.2 with `@vitest/coverage-v8` (coverage thresholds 85% for engine + schemas per execution-prompt Section 5; api 70% / web 60% configured when those apps are scaffolded in M0-10); Playwright for e2e (M0-10); license-checker for the copyleft gate.
- **Reasoning:** All versions are current registry "latest" except TypeScript, where latest (7.0.2) is outside typescript-eslint's supported range (`>=4.8.4 <6.1.0`) — pinned to the highest supported stable (6.0.3) instead of guessing at compatibility.
- **Commit convention (M0-04 item 6):** `<MILESTONE-TASK-ID> (<REQ-ID>): <short imperative subject>` — e.g. `M1-03 (ENG-02): add text model`.
- **Revisit trigger:** typescript-eslint ships TS 7 support; any pinned major goes EOL.
- **Note:** packages declare their own devDependencies (pnpm strictness) — TypeScript and Vitest are duplicated per-package by design, installed once on disk via the store.

### 2026-10-03 - ADR-009: ENG-08 MVP replay is in-panel only; /replay/:id waits on routing
- **Decision:** the MVP replay viewer lives inside the finished panel (Watch replay toggle over the retained in-memory log). The sitemap's /replay/:id route, persisted replay history, and deep links wait on M2-01 routing + retained-history storage, which are separate rows.
- **Conflict:** master-spec sitemap (:251) and replay page (:296-297) describe /replay/:id; implementation-guide M1-10 describes frames without mandating a route.
- **Why this resolution:** no router exists in the app and adding one for a single toggle would widen the slice; the in-panel viewer satisfies every M1-10 frame requirement and the M3-08 recent-test check for the just-finished attempt. Retention is documented as last-finished-only, in-memory, cleared on restart.
- **Approver:** autonomous loop (spec-checker reviewed, no AGENTS.md conflict).
- **Revisit trigger:** M2-01 routing lands, or the owner asks for shareable replay links.

