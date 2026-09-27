# START HERE — How to Hand This to Your IDE AI (and What to Expect)

**First actions:** follow `WEEK-0-2-PLAN.md` (parallel validation + engine build, AI autonomy rules, Day 1–3 prompts).

**Short answer:** the AI will **not** build it "exactly." It will build a *good first version of each small task you give it*, and it drifts unless you steer it. Dumping every file in at once makes drift **worse**. Use the steps below.

---

## 1. What to give it (and what not to)

**Give (via the kit, already organized):**
| File | Role | How the AI reads it |
|---|---|---|
| `AGENTS.md` | Always-on rules and stack | Loaded automatically every session |
| `.opencode/skills/*` (12 skills) | Detailed rules per area | Loaded **on demand** by name |
| `docs/spec/master-spec-v1.md` | *What* to build (requirements) | Read only the section for the current task |
| `docs/spec/implementation-guide.md` | *How* to build it, step by step | Read **one chapter at a time** |
| `docs/spec/retention-and-mastery-playbook.md` | Habit/practice design | Only for retention and drill work |
| `docs/spec/award-playbook.md` | Craft and performance targets | Only for polish/audit work |

**Do NOT give (background only, superseded):** `typing-website-requirements.md` (v0.1), `typing-website-programmer-track.md` (v0.2), `typing-websites-analysis.md`, `typing-website-audit-report.md`. They conflict with the master spec in places. The OpenCode build playbook is for **you**, not the agent.

**Why not paste everything:** the docs total roughly 400 KB (on the order of 100k tokens). Loading it all crowds out the code and the task, and agents follow long documents less reliably. Small, focused reads work better.

**If your IDE AI isn't OpenCode:** `AGENTS.md` is read by many tools, but the `.opencode/` folder (skills, agents, commands) may need to be moved or converted. OpenCode also reads `.claude/skills` and `.agents/skills`; for any other tool, check its docs.

---

## 2. What the docs do NOT contain (you must supply these)

- **Real research:** the interviews, waitlist test, and prototype tests in Phase R0 haven't happened. The product could change after them.
- **Visual design:** there are no mockups or wireframes, only rules and descriptions. Someone has to choose an art direction and design the screens.
- **Content:** no practice passages, quotes, or code snippets exist yet. You must write or source them (with licenses).
- **Decisions D1–D17** (name, license stance, auth provider, hosting, languages…) are defaults, not made.
- **Calibrated numbers:** thresholds, weights, latency targets, and level criteria are proposals.
- **Legal review** of privacy/terms. The docs are not legal advice.
- **Proof the kit works:** I checked file structure, not a live OpenCode run.

---

## 3. The handoff procedure

**Step 0 — Set up the repo (you, ~1 hour).** Put the kit contents in the repo root. Open the IDE AI in that folder. Confirm it can see the skills.

**Step 1 — Make the AI prove it understands the rules.** Ask: *"List the non-negotiable rules from AGENTS.md, and tell me which skills you would load to build the typing engine."* Correct any mistakes before continuing.

**Step 2 — Start with M0, not "build the app."** Prompt: *"Read chapter 3 (M0) of docs/spec/implementation-guide.md only. Propose a plan for tasks M0-01 to M0-12. Don't write code yet."*

**Step 3 — One task at a time, always plan first.** Use this loop for every task:
1. Give the task ID, the requirement IDs, and **which section to read**.
2. Ask for a **plan** (steps, files, risks, tests). Read it. Push back.
3. Approve, then ask for the **smallest testable slice**.
4. Run tests, typecheck, lint. Run the review command (`/spec-check`, `/a11y`, `/anim-audit`, `/perf`, `/habit-audit`) or the review subagent.
5. **Read the diff yourself.** If you can't explain it, ask the AI to explain it before merging.
6. Commit with the task ID. Note surprises in the Decision Log.

**Step 4 — Follow the order.** R0 (validate) → M0 (setup) → design foundation → M1 (engine + metrics) → content → M2 (typing surface) → M3 (results + backend) → M4 (learning engine) → M5–M6 (programmer track) → retention → M7 (polish) → M8 (beta). Don't skip ahead.

---

## 4. Gates: do not continue until these pass

| After | Gate |
|---|---|
| R0 | Evidence supports going ahead (written go/no-go memo) |
| M0 | CI green; staging + production shells deployed; error scrubbing verified |
| M1 | Fixtures pass in **browser and Node**; property tests pass; replay reproduces text |
| M2 | Latency and bundle budgets pass in CI; accessibility scan clean; keyboard-only works; layouts verified on real keyboards |
| M3 | Forged/replayed results rejected; export and delete tested; retention job tested |
| M4 | Weakness profile → drill → retest works with real testers |
| M5–M6 | Levels 1–30 playable; no code execution; safety and license audit passed |
| M7 | Accessibility audit, legal pages, SUS ≥ 75 |
| M8 | Beta metrics and instrumentation verified |

---

## 5. Where AI agents typically go wrong here (and the guard)

| Risk | Guard |
|---|---|
| Adds per-keystroke UI state (slow typing) | Skill `typing-caret-rendering`; latency test in CI |
| Changes a metric formula "helpfully" | Skill `typing-metrics-spec`; golden fixtures; you approve any formula change |
| Sends typed text to analytics/error tracking | Skill `keystroke-privacy`; canary test on every deploy |
| Copies GPL/AGPL code or word lists | License register; content pipeline gate; `security-auditor` |
| Adds Redis/queues/sockets too early | AGENTS.md rule; reject in plan review |
| Invents library APIs | Use the Context7 connector; check versions |
| Skips accessibility/reduced motion | `/a11y`, `/anim-audit` before merge |
| Builds guilt-based streak copy | `habit-gamification-rules`; `/habit-audit` |
| Silently deviates from the spec | `/spec-check <IDs>` after each slice |
| Installs an unsafe third-party skill | Vet first; keep permission at "ask" |

---

## 6. Your first three prompts

1. *"Read AGENTS.md. Summarize the non-negotiable rules and the MVP scope in 10 lines."*
2. *"Read chapter 3 of docs/spec/implementation-guide.md. Propose the repo scaffold and CI plan for M0. List every dependency you want with a one-line reason. No code yet."*
3. *"Read chapter 2 (Phase R0). Draft my interview guide, waitlist page copy (three concepts, no promises), and the list of six technical spikes with pass/fail criteria."*

---

## 7. Realistic expectations

- **Expect:** solid scaffolding, tests, and a working core loop if you keep tasks small and review everything.
- **Expect to correct:** UI polish, edge cases (layouts, IME, time zones), performance tuning, and any place the docs are ambiguous.
- **Expect to decide:** design direction, content, pricing, and what to cut when time runs short (see the scope-cut ladder, guide §16.6).
- **Timeline:** the guide's 12–16 weeks assume one full-time developer; part-time is 2–3× longer. AI speeds scaffolding, not validation, content, or calibration.
- **Quality bar:** your review and the tests are what make it "exactly right," not the documents alone.
