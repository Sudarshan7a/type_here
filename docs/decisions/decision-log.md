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

### 2026-09-27 · ADR-001: Repository and merge protocol without GitHub CLI
- **Decision:** Branch-per-task (task/<phase>-<id>), local gates, local --no-ff merge to main, push. No GitHub PRs for now.
- **Options considered:** (a) install gh CLI myself, (b) halt until human sets up PRs, (c) local merges with branch history preserved.
- **Reasoning:** gh is not installed; halting contradicts the autonomous-execution prompt; local --no-ff merges preserve the branch-per-task audit trail and push cleanly. Branch protection on GitHub still needs the human (see BUILD-LOG "Flagged for human review").
- **Approver:** autonomous run (Section 7 mechanism).
- **Revisit trigger:** gh CLI installed / branch protection enabled.
