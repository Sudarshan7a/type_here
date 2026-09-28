# HUMAN-ACTIONS.md

Ordered by what blocks soonest. The agent keeps this current; check items off
as you do them and note the date. Format: [ ] title | why it matters | time
estimate | what it blocks | how you will know it is done.

## Blocks soonest

- [ ] Enable branch protection on main (require CI, no direct pushes) | Nothing currently enforces "never commit to main"; the agent's local --no-ff merges are protocol-only | 10 min | Enforceability of the merge protocol; merge-trail trust | A direct `git push origin main` from a non-PR context is rejected by GitHub
- [ ] Install and authenticate the GitHub CLI (`gh`) | Restores real PRs with review records instead of local merges (ADR-001 interim) | 10 min | Real PR flow; the GitHub project board; branch protection via CLI | `gh pr list` works; agent opens PRs instead of merging locally
- [ ] Set the daily AI usage cap | The agent currently stops at session boundaries only; you wanted budget-based stops | 5 min | Run-budget honesty (Section 2.5 / Section 0 step 13) | A number exists in the execution prompt Section 6; the agent cites it in BUILD-LOG
- [ ] Recruit Track A: name list, then 12-15 interviews | Scheduling takes days and gates the Phase 0 go/no-go decision | start today; ~2-3 weeks elapsed | Phase 0 exit criteria; the Day-14 gate memo | 10+ interviews synthesized into a one-page summary
- [ ] Save the Session 1 autonomous prompt as docs/AUTONOMOUS-BUILD-EXECUTION-PROMPT.md | Preserves the standing rules as in-repo background | 5 min | Nothing technical (background reference) | The file exists in docs/

## Blocks the engine's realistic tests (after Block B)

- [ ] Record typing fixtures with tools/fixture-recorder on every keyboard and layout you have | The engine cannot invent realistic human timing; synthetic fixtures are placeholders until then | ~15 min per layout | M1 engine tests against real rollover/repeat/pause behavior | fixture-<scenario>-<layout>-<yyyymmdd>.json files exist and are checked into the repo
- [ ] Run spikes/s1-latency/manual.html and spikes/s6-hidden-tab/manual.html on a real laptop and fill spikes/RESULTS-TEMPLATE.md | Headless synthetic latency is a LAB PROXY; real input-to-paint p95 and background throttling need real hardware | ~10 min each | REAL-DEVICE evidence for Phase 0 spikes S1 and S6 | RESULTS-TEMPLATE.md filled with real-device numbers
- [ ] Run the first-session prototype test with 5 people (prototypes/first-session/) | Usability of the core diagnose-drill-retest loop is a Phase 0 exit criterion | ~1 hour total | Phase 0 exit criteria (4 of 5 unaided) | Observation notes exist; 4/5 completion recorded

## Privacy stop condition (after Block B4)

- [ ] Choose the waitlist form provider | The waitlist form ships DISABLED because collecting emails is new personal-data collection (stop condition #2) | 30 min research | Any live waitlist signup; conversion-rate measurement | A provider is chosen and a privacy notice exists; the form's action URL is configured

## Before M0-06/M0-07 connections (not needed for Phase 1 engine work)

- [ ] Create cloud accounts: Vercel (web), Render or Fly.io (API), MongoDB Atlas, error tracking, analytics — free/hobby tiers, 2FA on, credentials in a password manager | Deploys and telemetry connections are blocked without them | ~1-2 hours | M0-06 staging/production shells + rollback drill; M0-07 real error/analytics wiring | "Hello world" deploys to both environments and the health endpoint responds
- [ ] Vet third-party skills before installing any (frontend-design, web-design-guidelines, vercel-react-best-practices, emil-design-eng, review-animations) | Skills run with agent permissions; the project requires human vetting | ~30 min | Optional design/quality skills in the agent's toolset | Each skill read end to end; permission left at "ask" initially

## Later

- [ ] Create the project board (Backlog, Ready, In Progress, In Review, Done) with M1-M8 epics | Task visibility outside BUILD-LOG | 20 min (needs gh) | M0-11 remainder | The board exists with the first 10 tasks entered
- [ ] Find a privacy or data-protection professional for a scoping call | Legal pages and privacy notices must be professionally reviewed before beta | 1 call | Phase 7 legal review | A review is scheduled or completed
- [ ] Set the real API origin in vercel.json `connect-src` when the domain is chosen | The CSP currently carries a placeholder origin (https://api.realtype.example) | 5 min | The web app's production API calls once both deploy | connect-src names the real API origin and the config test is updated
