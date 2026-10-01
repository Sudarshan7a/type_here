# HUMAN-ACTIONS.md

Ordered by what blocks soonest. The agent keeps this current; check items off
as you do them and note the date. Format: [ ] title | why it matters | time
estimate | what it blocks | how you will know it is done.

## Typing surface ready to try (Session 7, PR #5)

**The typing surface is ready to try.** Run this from the repository root:

```
pnpm install
pnpm --dir apps/web dev
```

Then open the URL it prints (http://localhost:5173) and type the passage on the
page. There is no Start button: click the text and start typing. **Tab**
restarts, **Escape** leaves the surface.

What to look for, and what it means:

- **Latency.** The first character of a word should feel instant. This is the
  first time the surface exists in the real app, so this is the first honest
  look at the 16 ms input-to-paint budget (NFR-01). The lab proxy is 15.2 ms,
  only 5% under budget, so this is worth your eyes.
- **Caret accuracy.** It should sit exactly on the character you are about to
  type, and land at the end of the line when the text wraps. If it drifts on a
  wrapped line, that is a real defect I did not catch — please say so.
- **Character states.** Correct characters are plain, a mistake gets a wavy
  underline, and a character you skipped is struck through. They must be
  distinguishable **without colour** — the rule the project does not bend. Try
  it in greyscale.
- **Live numbers.** Net WPM and accuracy update as you type and fall if you stop,
  because that is what is really happening.
- **Focus.** Clicking away pauses and shows "Paused"; clicking back continues.
- **Finished.** Headline net WPM + accuracy, plus Restart and New passage.

- [ ] **Try the typing surface and report anything that feels wrong** | It is the first artifact where you can feel the engine's latency and correctness on a real keyboard. What I cannot test here: your physical layout, Caps Lock, dead keys, IME, and how the caret feels at real typing speed | 10 min | Confidence in M1 before Phase 2 work, and the real-device half of NFR-01 | A note in BUILD-LOG with what you observed. **A "looks fine" is not evidence either way** — the latency budget is 5% under its target, so "felt fine" and "slightly laggy" may both be inside the noise. If you notice anything at all, that is the useful signal.
- [ ] **Try it on more than one keyboard layout** | The six layout maps were verified from physical key positions, but no human has typed on them with a debugger open | ~15 min per layout | Phase 3 layout support, Phase 6 token attribution | One word typed per layout, with anything that produced the wrong character or the wrong finger noted |

## Open defects found by the Session 5 attack pass (no human decision needed yet)

Recorded so they are not lost and not rediscovered. No human action is required
to proceed; full evidence in `docs/pr-log/s4-block-f-close.md`.

- [ ] **F3 (highest): `pnpm dev` reports success with a dead API when port 3000 is busy** | `apps/api/src/server.ts` calls `process.exit(1)` on `EADDRINUSE`, but `tsx watch` swallows the child's exit, so pnpm never sees a failure and the web app comes up looking fine. **Higher priority since Session 7:** the typing surface the owner is now invited to try runs behind this exact command, so a stale process on 3000 will look like a working app. Still invisible to the surface itself, which makes no API calls — and that is exactly what makes it a trap in Phase 4, when results depend on the API. | 30 min | Phase 4 | An occupied port 3000 makes `pnpm dev` fail loudly (bad case → fail) |
- [ ] **F2: port 5173 busy orphans the API on 3000** | pnpm exits loudly, but the `tsx watch` child survives and keeps port 3000 bound — a clean prompt plus a silently occupied port. | 20 min | Phase 4 | Killing the root leaves no listener on 3000 |
- [ ] **F1/F9: a typo in the root `dev` filter yields a silent half-stack** | `pnpm --filter @realtype/webb ...` prints "No projects matched" but still starts the remaining filters and exits 0. Today's filters are correct (verified), so this is latent. It matters because the list is a hard-coded allowlist: a third service added later is silently omitted rather than flagged. | 20 min | Nothing yet; real when a third service is added | A bad filter name fails loudly |
- [ ] **F4: the README's "Ctrl-C stops both" is unverified** | The harness could not deliver Ctrl-C to the process group, so that claim rests on reasoning, not on a test. | 10 min | Nothing | Confirmed while starting and stopping the servers for the typing-surface try-it above — same act, and the owner is doing it anyway |

### RESOLVED in Session 7 — the three `[Policy]` ledger rows

- **ITEM:** `INT-10` (no public leaderboards before the integrity layer), `BIZ-06` (no
  dark patterns) and `RET-21` (the ethics checklist in review for every engagement
  feature) were `NOT STARTED` with the note "absolute prohibition" and nothing behind
  them. A prohibition no gate can see is a wish.
- **STATUS:** `SATISFIED` — enforced by `scripts/check-policies.mjs` (PR #6), wired into
  CI beside the ledger gate, 20 tests.
- **WHAT LANDED:** INT-10 fails the build if `CMP-01`/`CMP-02` lose their `OFF` launch
  flag, if either is worked on before `INT-05..INT-08` are `DONE-VERIFIED`, or if a
  leaderboard/ranking/race source file appears without stating its own gate in its
  header. BIZ-06 scans all 95 shipped source files for a monetisation surface and for
  guilt-framing or hidden-renewal copy, at phrase level so it does not fire on
  legitimate vocabulary like "streak". RET-21 cannot be checked by any static analysis —
  it is a property of a human decision — so the gate makes the review non-skippable:
  any RET row moving past `NOT STARTED` requires a written record at
  `docs/ethics/<ID>.md`.
- **HOW THEY WERE VERIFIED:** each was made to fail on the real repository — flipping
  `CMP-01`'s flag, adding a guilt phrase to a real source file, and moving `RET-01` to
  `IN PROGRESS` each produced exit 1 naming the offending row. The gate also caught a
  circularity in itself: it demanded a checklist record from `RET-21`, the row that
  *defines* the checklist, so `RET-21` is now exempt and its own test pins that.
- **NOT CLAIMED:** the ledger rows are `IN PROGRESS`, not `DONE-VERIFIED`. A gate that
  has only ever passed against injected violations has not verified a policy. BIZ-06's
  billing-flow half stays review-enforced and must be re-verified by a human once
  `OPS-09` lands.
- **LAST CHECKED:** 2026-10-02 (Session 7, PR #6)

### RESOLVED in Session 6 — `errorMode` enum: add `no-backspace` (D03) and `word-locked` (D04)

- **ITEM:** Extend the public `errorMode` enum in `packages/schemas` from three values to five.
- **STATUS:** `SATISFIED` — approved as proposed by `docs/handoff/STEER-1.md`, Session 6.
- **WHAT LANDED:** `CONTRACT_VERSION` 1.2.0 → **1.3.0**. `ErrorModeSchema` in `packages/schemas/src/typing-settings.ts` is now named and exported, because five other files need the same list. Every consumer that validates the enum was updated in the same change, and the hand-written unions were **deleted** rather than extended: `packages/engine/src/text-model.ts`, `packages/engine/src/metrics.ts`, `packages/engine/fixtures/helpers.ts` and `tools/fixture-recorder/src/capture.ts` now derive `ErrorMode` from `@realtype/schemas`, so a mode added to the contract and forgotten downstream is a typecheck failure. `packages/telemetry` gained `packages/telemetry/tests/enum-drift.test.ts`, which pins `ERROR_MODES` to `ErrorModeSchema.options` exactly — that copy had already drifted once, in this very change.
- **ALSO LANDED:** the D04 word-locked engine behaviour (6 unit tests). Per chapter 4 part 2 / `ENG-FIXTURE-D04`: a wrong character inside a word is **kept and visible**, Backspace still works, and the caret is held at the word boundary until the word is correct. It is deliberately *not* must-correct, which rejects the wrong key instead.
- **LAST CHECKED:** 2026-10-01 (Session 6, PR #2)

## Retest cadence — RESOLVED: day 0/30

- **ITEM:** Choose the retest cadence for baselines and the efficacy readout.
- **STATUS:** `SATISFIED` — `day-0-30`, decided by `docs/handoff/STEER-1.md`, Session 6.
- **WHY THIS WAS OPEN:** three cadences coexisted in the project's own sources, and the choice changes **metric semantics** — what a "retest" means in a published number. Section 18.11 rule 5 forbids picking silently.
  - `master-spec-v1.md` §6.6 — day 0 → 30
  - `master-spec-v1.md` §7.5 (programmer baseline) — day 0 / 30 / 60
  - `BUILD-ROADMAP-START-TO-END.md` Phase 5 — day 0 / 14 / 30
- **WHY day 0/30:** it is the cadence the master spec states as the efficacy design, so it is the one the project's own evidence plan was written around. The other two remain implemented as presets (`0/30/60`, `0/14/30`), so the decision costs nothing to reverse.
- **STILL OPEN (unchanged):** the presets' fixture sets — which text counts as "matched difficulty" at each retest — depend on the content pipeline (Phase 2) and cannot be written until content exists.
- **LAST CHECKED:** 2026-10-01 (Session 6, `STEER-1.md`)

## Blocks soonest

- [ ] **Set the daily AI usage cap** | The agent currently stops at session boundaries only; you wanted budget-based stops | 5 min | Run-budget honesty (Section 2.5 / Section 0 step 13) | A number exists in the execution prompt Section 6; the agent cites it in BUILD-LOG
- [ ] **Enable branch protection on main** — **ACCEPTED BY OWNER (STEER-1, Session 6). Do not raise this again.** Session 4 proved empirically that protection was off; Session 6 re-confirmed it via the API (`gh api repos/:owner/:repo/branches/main/protection` → HTTP 404, "Branch not protected"). The owner has decided to run without it and to rely on the agent's merge discipline plus CI-before-merge instead. Recorded as an accepted risk, not an open request.
- [ ] Live-driver confirmation of the six verified layout maps | The finger maps were derived from physical key positions and cross-checked (same-finger rates land at 14.8–16.0%, matching touch-typing research), but no human has typed on each layout with a debugger open | ~15 min per layout | Phase 3 layout support | One word typed per layout with a key-event inspector, logged in BUILD-LOG
- [ ] Resolve the AltGr / dead-key characters (QWERTY-UK, AZERTY, QWERTZ) | They currently return `unknown` instead of a guess, which is correct but leaves those symbols un-attributable | 30 min with a live keyboard | Phase 6 token attribution on symbol drills | Each character verified against a real driver and added to (or removed from) `UNKNOWN_LAYOUT_CHARACTERS` in `packages/engine/src/layout-fingers.ts`
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
