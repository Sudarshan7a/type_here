# Week 0–2 Plan — Validate + Build the Engine in Parallel (AI-Driven)

**Recorded answers (add to your Decision Log today):**
| Question | Answer | What it changes |
|---|---|---|
| Capacity | AI works continuously ("24x7") | Building isn't the bottleneck; **review, validation, content, and design decisions are** |
| Goal | **Real product for public users** | Legal, privacy, accessibility, security, support, and integrity are **not optional** |
| Start | **Validate + build the engine in parallel** | Two tracks (below). Safe because the engine is the least product-dependent part |

All other defaults (D1–D17 in the implementation guide §1.2) are **accepted unless you change them**. D2 (open-core: open engine, private service) still needs your explicit confirmation before the repo is created.

---

## 1. "24x7 AI" — what works and what doesn't

**Works well unattended (bounded):** running tests, writing fixtures from your spec, scaffolding, documentation, drafting content for your review, refactors with tests, generating reports.

**Does not work unattended:** product decisions, metric formulas, privacy behavior, authentication, integrity thresholds, payments, adding dependencies, deleting data, production deploys. Agents also drift, loop, or "fix" tests instead of code when left alone.

**What only humans can do (AI cannot):** interviews, watching real people use a prototype, physically typing on real keyboards and layouts, choosing a visual direction, legal review, license judgment calls, deciding what to cut.

### Bounded-autonomy rules (paste at the start of every autonomous run)
1. **One task ID per run** (for example M1-03). Do nothing outside it.
2. **Work on a branch**; never commit to main; open a pull request with the requirement IDs, a plain-language summary, and test results.
3. **Stop and report** if: tests fail after 3 attempts; the change touches more than ~10 files; a dependency is needed; a spec conflict appears; a metric, privacy, integrity, or auth behavior would change; anything is ambiguous.
4. **Never** use production credentials, deploy to production, install unvetted skills, delete data, or disable tests/CI/lint.
5. **Never fix a failing test by weakening it.** Explain the failure instead.
6. **Finish with:** what changed, how it was verified, open questions, and the next suggested task.
7. **Respect the budget:** stop when the model-usage cap for the run is reached.

### Your review budget
- **Daily (60–90 minutes):** read the PR summaries and diffs for the day's tasks; merge or send back; answer questions.
- **Weekly (2 hours):** metrics and validation review, Decision Log, plan the next week.
- Anything you can't explain, the AI must explain before you merge.

---

## 2. The two tracks (Days 1–14)

**Track A — You (validation, decisions, real-world tasks).**
**Track B — AI (setup and the typing engine).**

| Day | Track A (you) | Track B (AI) | Notes |
|---|---|---|---|
| 1 | R0-01: write hypotheses and pass/fail numbers. R0-02: start recruiting 12–15 people. R0-08: create the license register. Confirm D2. | M0-01 to M0-03: repo, structure, protections (you create accounts; AI proposes structure) | Kit copied in; skills vetted |
| 2 | Finalize the interview guide; book sessions. Start the design brief (§4.1). | M0-04, M0-05: tooling and CI gates | Vet third-party skills yourself |
| 3 | Approve the waitlist copy (three concepts, no promises). | M0-06, M0-07, M0-10, M0-12: environments, observability, scaffold, security baseline | Deploy "hello world" to staging |
| 4 | Interviews (2–3 per day). | R0-07 spikes S2 (timing capture) and S3 (browser/server parity) in a **scratch repo** | Spikes are throwaway |
| 5 | Interviews. **Record real typing fixtures** on your keyboard(s) (see §4). | M1-01 data contracts; M1-02 fixture plan and hand-computed expectations | You review contracts |
| 6–7 | Interviews + synthesis (R0-04). Design foundation: typography and color choices. | M1-03 text model; M1-04 input adapter design; spikes S1 (latency), S6 (hidden tab) | |
| 8 | **Launch the waitlist page** (AI builds it; you post it). | M1-05 log recorder; M1-06 state machine | |
| 9 | **Prototype test** with 5 people (R0-06); AI builds a static clickable mock the day before. | M1-07 error modes; M1-08 auto-inserted flags | |
| 10 | Synthesize; compare with thresholds. | M1-09 metrics library (largest task) | |
| 11 | Competitor hands-on audit (R0-09). | M1-10 replay; M1-11 browser/server parity harness | |
| 12 | Waitlist results; refine decision. | M1-12 property tests; M1-13 performance benchmarks | |
| 13 | Draft the go/no-go memo (R0-10). | M1-14 review and engine contract doc; spike report | |
| 14 | **Gate review (2 hours).** | — | Decide next step (below) |

**Why parallel is safe:** the typing engine and metrics library are needed no matter what the interviews say. The **programmer track, tokenizer, and levels wait** until after the gate.

---

## 3. Day-14 gate (decide before building further)

**Set your thresholds on Day 1.** Examples to adapt (your numbers, not mine):
| Signal | Example threshold |
|---|---|
| Interviewees who type daily and say they'd try a diagnose→drill tool | ≥ 60% |
| Waitlist visit-to-signup (with enough traffic) | ≥ 5% |
| Prototype: participants completing the first-session flow unaided | ≥ 4 of 5 |
| Programmers who'd use the symbol/number track weekly | Enough to justify building it |
| Spike S1: input latency within budget on 3 browsers | Pass |
| Engine parity: browser = server on all fixtures | Pass |

**Outcomes:** **Go** (continue to M2) · **Go with changes** (edit scope) · **Pivot** (new hypothesis; engine still reusable) · **Stop**.

---

## 4. Human-only tasks you must schedule now

1. **Recruit 12–15 people** for interviews and 5 for the prototype test (friends of friends, college groups, developer and typing communities). Aim for a mix: general upgraders, programmers/students, a couple of writers or professionals, one or two people with accessibility needs.
2. **Record real typing fixtures:** type the provided passages on your keyboard, and ideally on a second layout (or ask a friend). Include: slow and careful, fast and sloppy, pauses, many backspaces, holding a key, Caps Lock/Shift, symbols. The AI needs these to test the engine; **it can't invent realistic human timing.**
3. **Choose the design direction** (design brief §4.1) and typography.
4. **Vet third-party skills** before installing (implementation guide M0-08).
5. **Set the AI usage budget cap** (daily) and alerts.

---

## 5. Prompts for Days 1–3

**Day 1 (Plan agent):**
"Read AGENTS.md and chapters 1–3 of docs/spec/implementation-guide.md. For tasks M0-01 to M0-03, list exactly what I must do by hand (accounts, settings) and what you can do. Propose the repo structure. Do not write code. Also list which spikes (S1–S6) can start immediately in a scratch repo."

**Day 2 (Plan → Build):**
"Follow the bounded-autonomy rules in WEEK-0-2-PLAN.md. Task M0-04 and M0-05 only: propose tooling choices and the CI stages with quality gates (lint, typecheck, unit tests, build, bundle-size check, dependency and license audit, e2e smoke). List every dependency with a one-line reason. Wait for my approval before implementing."

**Day 3 (Build):**
"Bounded-autonomy rules apply. Tasks M0-06, M0-07, M0-10, M0-12: scaffold the web shell, API health endpoint, empty engine and schemas packages, and one e2e smoke test; set up error-tracking scrubbing and the analytics allowlist; add security headers and rate limiting. Do not add Redis, queues, or sockets. Deploy to staging only. Report how each item was verified."

---

## 6. What I still need from you (5 quick items)

1. **Confirm D2:** open-core (engine open under a permissive license; hosted service private)? Or another choice?
2. **Confirm the defaults** (name, stack, languages, layouts, age policy, hosting/budget, payments later, AI tool).
3. **Who can help recruit** 12–15 interview participants? (Even 5 friends who each bring 2 people works.)
4. **Who can type on real keyboards** for fixtures and matrix testing (you plus 1–2 others, on at least two layouts)?
5. **Daily AI usage budget** you're comfortable with, so runs can stop safely.

---

## 7. Risks specific to running AI continuously

| Risk | Guard |
|---|---|
| Silent drift from the spec | `/spec-check` on every PR; one task ID per run |
| Weakened tests / "green by cheating" | Rule 5; review test diffs first |
| Runaway cost | Per-run and daily caps; stop conditions |
| Unsafe skills/scripts | Vet; permissions stay at "ask"; scratch environment; no secrets |
| Sprawling PRs | Max ~10 files; split tasks |
| Review backlog | Cap active branches at 3; don't start new tasks until reviewed |
| Public-product blind spots | Legal, accessibility, security gates in M7 are mandatory before launch |

**For a public product, do not skip:** privacy behavior matching the policy, accessibility audit, license register, security review, backups and restore test, and a support path.
