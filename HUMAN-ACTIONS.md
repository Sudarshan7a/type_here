# HUMAN-ACTIONS.md

Ordered by what blocks soonest. The agent keeps this current; check items off
as you do them and note the date. Format: [ ] title | why it matters | time
estimate | what it blocks | how you will know it is done.

## Open defects found by the Session 5 attack pass (no human decision needed yet)

Recorded so they are not lost and not rediscovered. No human action is required
to proceed; full evidence in `docs/pr-log/s4-block-f-close.md`.

- [ ] **F3 (highest): `pnpm dev` reports success with a dead API when port 3000 is busy** | `apps/api/src/server.ts` calls `process.exit(1)` on `EADDRINUSE`, but `tsx watch` swallows the child's exit, so pnpm never sees a failure and the web app comes up looking fine. Invisible today because the test surface makes no API calls; a real trap in Phase 4 when results depend on the API. | 30 min | Phase 4 | An occupied port 3000 makes `pnpm dev` fail loudly (bad case → fail) |
- [ ] **F2: port 5173 busy orphans the API on 3000** | pnpm exits loudly, but the `tsx watch` child survives and keeps port 3000 bound — a clean prompt plus a silently occupied port. | 20 min | Phase 4 | Killing the root leaves no listener on 3000 |
- [ ] **F1/F9: a typo in the root `dev` filter yields a silent half-stack** | `pnpm --filter @realtype/webb ...` prints "No projects matched" but still starts the remaining filters and exits 0. Today's filters are correct (verified), so this is latent. It matters because the list is a hard-coded allowlist: a third service added later is silently omitted rather than flagged. | 20 min | Nothing yet; real when a third service is added | A bad filter name fails loudly |
- [ ] **F4: the README's "Ctrl-C stops both" is unverified** | The harness could not deliver Ctrl-C to the process group, so that claim rests on reasoning, not on a test. | 10 min | Nothing | Confirmed while doing the manual engine test below (starting/stopping the servers is the same act) |

## EXTERNAL DECISION REQUIRED (blocks nothing technical; answer with a `docs/handoff/RESPONSE-<n>.md`)

### Retest cadence — day 0/30, day 0/30/60, or day 0/14/30

- **ITEM:** Choose the retest cadence for baselines and the efficacy readout.
- **STATUS:** `EXTERNAL DECISION REQUIRED`
- **WHY REQUIRED:** Three different cadences coexist in the project's own sources, and this changes **metric semantics** — it alters what a "retest" means in a number that gets published. Section 18.11 rule 5 forbids picking silently. The sources disagree:
  - `master-spec-v1.md` §6.6 — **day 0 → day 30**
  - `master-spec-v1.md` §7.5 (programmer baseline) — **day 0 / 30 / 60**
  - `BUILD-ROADMAP-START-TO-END.md` Phase 5 — **day 0 / 14 / 30**
- **TECHNICAL WORK COMPLETED:** ADR-008 records the conflict. The cadence is implemented as a **configuration value**, not a hardcoded constant, with day 0/30 as the default and the other two as named presets. Dependent code (ANA-09 efficacy instrumentation, PRG-17 programmer baseline, MOD-05 baseline) is isolated behind that config, so switching costs one value and a test-fixture change.
- **TECHNICAL WORK REMAINING:** The presets' fixture sets (which text is "matched difficulty" at each retest) depend on the content pipeline (Phase 2) and cannot be written until content exists.
- **EXACT EVIDENCE REQUIRED:** `docs/handoff/RESPONSE-<n>.md` containing one line: `RETEST CADENCE: day-0-30 | day-0-30-60 | day-0-14-30`
- **PREPARED AUTOMATION:** `pnpm check:ledger` verifies the ledger stays consistent; the cadence value is a single exported config with tests on all three presets.
- **PREPARED TEST:** Each preset has a determinism test asserting the retest interval in days for day 14, 30 and 60.
- **PREPARED ANALYSIS:** The efficacy readout template (Phase 8) already parameterises the interval, so a later change does not invalidate collected data.
- **LAST CHECKED:** 2026-10-01 (Session 5, recorded with ADR-008)

**Recommendation** (a recommendation, not a decision): **day 0/30**. It is the cadence the master spec states as the efficacy design, it has the most evidence behind it, and a 30-day gap is long enough to show real change and short enough that people still remember the first test. Choosing it costs nothing, because all three remain available as presets.

## Blocks soonest

- [ ] **Try the manual engine test now** | It is the first artifact where you can feel the engine's latency and correctness on a real keyboard (Block E). `pnpm dev` (starts web + api together), pick a passage, press Start, type it. Report anything that feels wrong: latency, wrong counts, caret drift, mis-marked characters. | 10 min | Confidence in M1 before Phase 2 UI work | A note in BUILD-LOG with what you observed (and any bug report)
- [ ] Enable branch protection on main (require CI, no direct pushes) | **Session 4 verified empirically that protection is NOT on**: a dry-run push of a throwaway commit to `main` was ACCEPTED by GitHub. Direct pushes remain possible, which is why the merge protocol was violated twice in Session 3. | 10 min | Everything in Section 1 rules 2–3 depends on this | A real (non-dry-run) direct push to main is rejected by GitHub
- [ ] Live-driver confirmation of the six verified layout maps | The finger maps were derived from physical key positions and cross-checked (same-finger rates land at 14.8–16.0%, matching touch-typing research), but no human has typed on each layout with a debugger open | ~15 min per layout | Phase 3 layout support | One word typed per layout with a key-event inspector, logged in BUILD-LOG
- [ ] Resolve the AltGr / dead-key characters (QWERTY-UK, AZERTY, QWERTZ) | They currently return `unknown` instead of a guess, which is correct but leaves those symbols un-attributable | 30 min with a live keyboard | Phase 6 token attribution on symbol drills | Each character verified against a real driver and added to (or removed from) `UNKNOWN_LAYOUT_CHARACTERS` in `packages/engine/src/layout-fingers.ts`
- [ ] Install and authenticate the GitHub CLI (`gh`) | Restores real PRs with review records instead of local merges (ADR-001 interim) | 10 min | Real PR flow; the GitHub project board; branch protection via CLI | `gh pr list` works; agent opens PRs instead of merging locally
- [ ] Set the daily AI usage cap | The agent currently stops at session boundaries only; you wanted budget-based stops | 5 min | Run-budget honesty (Section 2.5 / Section 0 step 13) | A number exists in the execution prompt Section 6; the agent cites it in BUILD-LOG
- [ ] Recruit Track A: name list, then 12-15 interviews | Scheduling takes days and gates the Phase 0 go/no-go decision | start today; ~2-3 weeks elapsed | Phase 0 exit criteria; the Day-14 gate memo | 10+ interviews synthesized into a one-page summary
- [ ] Save the Session 1 autonomous prompt as docs/AUTONOMOUS-BUILD-EXECUTION-PROMPT.md | Preserves the standing rules as in-repo background | 5 min | Nothing technical (background reference) | The file exists in docs/

## Blocks the engine's realistic tests (after Block B)

- [ ] Record typing fixtures with tools/fixture-recorder on every keyboard and layout you have | The engine cannot invent realistic human timing; synthetic fixtures are placeholders until then | ~15 min per layout | M1 engine tests against real rollover/repeat/pause behavior | fixture-<scenario>-<layout>-<yyyymmdd>.json files exist and are checked into the repo
- [ ] Run spikes/s1-latency/manual.html and spikes/s6-hidden-tab/manual.html on a real laptop and fill spikes/RESULTS-TEMPLATE.md | Headless synthetic latency is a LAB PROXY; real input-to-paint p95 and background throttling need real hardware. The lab p95 (15.2 ms) sits only 5% under the 16 ms proposed budget | ~10 min each | REAL-DEVICE evidence for Phase 0 spikes S1 and S6 | RESULTS-TEMPLATE.md filled with real-device numbers
- [ ] Run the first-session prototype test with 5 people (prototypes/first-session/) | Usability of the core diagnose-drill-retest loop is a Phase 0 exit criterion | ~1 hour total | Phase 0 exit criteria (4 of 5 unaided) | Observation notes exist; 4/5 completion recorded
- [ ] Retry `pnpm --dir spikes/s1-latency exec playwright install firefox webkit` when the network allows | All browser results so far are Chromium-only; the 3-engine matrix in the implementation guide is unverified | ~5 min | Spikes S1/S2/S3/S6 browser coverage | Firefox/WebKit runs appear in spikes/*/results/ and the two commented projects in each playwright.config.ts are re-enabled

## Privacy stop condition (after Block B4)

- [ ] Choose the waitlist form provider | The waitlist form ships DISABLED because collecting emails is new personal-data collection (stop condition #2) | 30 min research | Any live waitlist signup; conversion-rate measurement | A provider is chosen and a privacy notice exists; the form's action URL is configured

## Before M0-06/M0-07 connections (not needed for Phase 1 engine work)

- [ ] Create cloud accounts: Vercel (web), Render or Fly.io (API), MongoDB Atlas, error tracking, analytics — free/hobby tiers, 2FA on, credentials in a password manager | Deploys and telemetry connections are blocked without them | ~1-2 hours | M0-06 staging/production shells + rollback drill; M0-07 real error/analytics wiring | "Hello world" deploys to both environments and the health endpoint responds
- [ ] Vet third-party skills before installing any (frontend-design, web-design-guidelines, vercel-react-best-practices, emil-design-eng, review-animations) | Skills run with agent permissions; the project requires human vetting | ~30 min | Optional design/quality skills in the agent's toolset | Each skill read end to end; permission left at "ask" initially

## Later

- [ ] Create the project board (Backlog, Ready, In Progress, In Review, Done) with M1-M8 epics | Task visibility outside BUILD-LOG | 20 min (needs gh) | M0-11 remainder | The board exists with the first 10 tasks entered
- [ ] Find a privacy or data-protection professional for a scoping call | Legal pages and privacy notices must be professionally reviewed before beta | 1 call | Phase 7 legal review | A review is scheduled or completed
- [ ] Set the real API origin in vercel.json `connect-src` when the domain is chosen | The CSP currently carries a placeholder origin (https://api.realtype.example) | 5 min | The web app's production API calls once both deploy | connect-src names the real API origin and the config test is updated
- [ ] Decide Chapter 8 §8.7.1 (plateau example SD) | **DONE (Session 3):** population SD decided; the chapter's claim fails under both variants, so `WM-FIXTURE-009a/-009b` were constructed fresh and are unambiguous. No action needed. | — | — | ✅ Resolved in `docs/CHAPTER-ARITHMETIC-CORRECTIONS.md` item 5
- [ ] Resolve levels-05 §2.3 (`;` drill: 8 semicolons vs 15 target keystrokes + 14 anchors) | **DONE (Session 3):** 15 targets + 14 anchors = 29 keystrokes, 50/50 interleaved. No action needed. | — | — | ✅ Resolved, item 8
- [ ] Resolve levels-05 §2.4 (`@` illustration shows 6 targets against §2.2's 15-keystroke rule) | Found in Session 3 while resolving the item above: §2.4's heading claims a full-length drill but shows 6 `@` in a 3-and-3 pattern, matching neither §2.2's 15-keystroke rule nor any multiple of its own stated pattern | 10 min | Phase 6, T0-GEN-001 | A written decision in `docs/decisions/decision-log.md`
- [ ] Supply real recorded fixtures so the parity harness can run on human data | `ENG-PARITY-01/02` currently proves Node/Chromium agreement on synthetic fixtures only; the engine's realistic timing paths (rollover, repeat, pauses) are still unproven against real typing | ~15 min per layout with tools/fixture-recorder | Full confidence in M1 correctness; Phase 1 sign-off | fixture JSON files exist and a parity run against them is logged green
