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
| D1 | Name/domain/brand | "RealType" working title; check name, domain, trademark before public beta | | |
| D2 | Open-source stance | Open-core: engine open (permissive), hosted service private | | |
| D3 | Age policy | **18+ only at launch** (India DPDP: under 18 = child) | | |
| D4 | Authentication | Managed provider: email + Google + GitHub | | |
| D5 | Hosting | Static host + one API service + managed MongoDB (free tiers first) | | |
| D6 | Code-track languages | JS/TS(JSX), Python, Java, SQL, HTML/CSS | | |
| D7 | Layouts | QWERTY US/UK, Dvorak, Colemak/Colemak-DH, AZERTY, QWERTZ | | |
| D8 | Analytics | Privacy-friendly, strict event allowlist | | |
| D9 | Error tracking | Managed, with scrubbing verified | | |
| D10 | Email provider (V1) | Decide at V1 | | |
| D11 | Payments (V1) | Decide at V1 (consider regional methods) | | |
| D12 | Content sources | Original + public-domain + permissive only | | |
| D13 | LLM usage | None at MVP | | |
| D14 | Raw log retention | 30 days (verified/flagged excepted) | | |
| D15 | Testing stack | Fast unit runner + 3-engine browser e2e + CI budgets | | |
| D16 | Mobile scope | Honest mobile message + responsive site | | |
| D17 | Accessibility target | WCAG 2.2 AA (non-test UI) + typing-specific rules | | |

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

## Entries
(Add below.)
