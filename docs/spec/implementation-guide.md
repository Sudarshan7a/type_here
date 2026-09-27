# RealType — Implementation Guide (No-Code Build Manual)

**Version:** 1.0 · **Date:** 20 Sep 2026
**Purpose:** a start-to-finish, step-by-step manual for building the RealType typing website with OpenCode. It says **what to do, in what order, how to do it, how to check it, and what can go wrong.** It contains **no program code**.
**Builds on:** `typing-website-master-spec-v1.md` (what to build), `typing-website-opencode-build-playbook.md` (tools/skills/flows), `typing-website-award-playbook.md` (craft targets), `typing-website-retention-and-mastery-playbook.md` (training and habit design), and the starter kit zip.

**A note on size:** you asked for a very large document. A single response can't hold a million tokens, so this is the largest, densest version I can produce in one pass, organized so that any chapter can be expanded into its own deeper volume on request. Where a chapter says **"Expand on request,"** ask for it by chapter number.

---

## Contents

**Part I — Orientation**
0. How to use this guide
1. Decisions to lock before building
2. Phase R0 — Validate before building (Weeks 0–2)
3. Milestone M0 — Project setup (Days 1–3)
4. Design foundation (Weeks 1–2)

**Part II — Core typing product** *(next sections in this document)*
5. M1 — Typing engine and metrics
6. Content system
7. M2 — Typing surface, themes, motion, accessibility
8. M3 — Results, storage, backend, integrity, privacy
9. M4 — Learning engine, analytics, baseline, efficacy

**Part III — Programmer track and retention**
10. M5–M6 — Programmer track
11. Retention and habit system
12. M7 — Polish, QA, legal, usability, award readiness

**Part IV — Launch and beyond**
13. M8 — Beta launch and learning loop
14. V1 features, step by step
15. V2 outline, operations, and long-term maintenance
16. Master checklists, risk triggers, glossary

---

# PART I — ORIENTATION

## 0. How to Use This Guide

### 0.1 What each chapter contains
Every feature is written with the same template so you can scan quickly:
1. **Goal and requirement IDs** (from the spec).
2. **Before you start** (dependencies and inputs).
3. **Decisions** (what to choose and how).
4. **Steps** (numbered, in order; each says *Do*, *How*, and *Check*).
5. **Edge cases and failure modes.**
6. **Tests** (what to test, at which layer).
7. **Done when** (acceptance criteria).
8. **OpenCode instructions** (which skills to load, which agent/commands to use, and a plain-English prompt outline).
9. **Events and metrics** (analytics names; never typed content).

### 0.2 Conventions
- **Task IDs:** `R0-xx` (validation), `M0-xx` … `M8-xx` (milestones), `V1-xx` (V1 features). Use them in your issue tracker, commit messages, and OpenCode prompts.
- **Requirement IDs** (ENG-01, LRN-02, PRG-10, RET-01, MST-01…) come from the spec and the retention playbook.
- **Tags:** **[MVP]** must ship first · **[V1]** next · **[V2]** later · **[H]** hypothesis to test · **[proposal]** a starting value to tune.
- **"Check"** means a concrete pass/fail verification, not a feeling.
- **No code:** if a step needs code, the step tells you *what behavior to ask OpenCode to build* and *how to verify it*.

### 0.3 Your working loop with OpenCode
For every task, follow this loop:
1. **Pick one task** (small enough for one focused session; if it touches more than three areas, split it).
2. **Plan first.** Switch to the Plan agent. Give it the task ID, the requirement IDs, the relevant spec section (tell it *which sections* to read, not "read everything"), and the skills to load. Ask for: a step list, a file/area list, risks, and the tests it will write. Read the plan critically.
3. **Approve or adjust** the plan. Push back on anything that violates the non-negotiable rules in `AGENTS.md`.
4. **Build in a small slice.** Switch to Build. Ask for the smallest vertical slice that can be tested.
5. **Verify.** Run the tests, typecheck, and lint. Run the relevant review command (`/spec-check`, `/anim-audit`, `/a11y`, `/perf`) and, for UI, the `@ui-reviewer` subagent.
6. **Read the diff yourself.** You are the accountable engineer. If you don't understand a change, ask OpenCode to explain it in plain language before merging.
7. **Commit** with the task ID and requirement ID. Update the task board.
8. **Write down surprises** in a decision log (see §1.3), especially anything that changes the spec.

### 0.4 Rules of engagement
- **Never let an agent change a metric formula, privacy behavior, or integrity rule without your explicit approval.** Those are product decisions.
- **Keep sessions short and focused.** Long, sprawling sessions produce sprawling diffs.
- **Prefer boring solutions.** If two options work, choose the one with fewer moving parts.
- **Vet before you install** any third-party skill (see §3.8).
- **Stop and ask** if a requirement conflicts with another, or if the agent proposes adding a service (Redis, queues, sockets) before its milestone.

### 0.5 Roles (even if you're solo)
| Role | What you do |
|---|---|
| **Product owner** | Decide scope, approve plans, run user research |
| **Engineer** | Read diffs, run tests, own quality |
| **Designer** | Own the design brief, tokens, and visual QA |
| **QA** | Run the manual test matrices |
| **Ops** | Watch deployments, backups, incidents |
Write the current hat on each task so you don't skip a role.

### 0.6 Timeline at a glance
| Phase | Weeks (1 FTE) | Output |
|---|---|---|
| R0 Validate | 0–2 | Go/no-go with evidence |
| M0 Setup | Days 1–3 (can overlap R0) | Repo, CI, deploys, OpenCode ready |
| Design foundation | 1–2 | Brief, tokens, themes, components list |
| M1 Engine + metrics | 2–3 | Tested engine and metrics library |
| M2 Typing surface | 3–4 | Fast, accessible typing page |
| M3 Results + backend | 5–6 | Verified results, guest-first, privacy |
| M4 Learning engine | 7–9 | Weakness map, drills, baseline, efficacy |
| M5–M6 Programmer track | 9–12 | Token engine, Levels 1–30 |
| Retention (MVP part) | woven into M3–M7 | First-session win, goals, weekly streak |
| M7 Polish | 13–14 | Accessibility, motion, legal, usability |
| M8 Beta | 15–16 | 50–100 users, first retests |
Part-time builders: multiply by 2–3. AI assistance speeds scaffolding, but validation, testing and calibration still take real time.

---

## 1. Decisions to Lock Before Building

### 1.1 Why decide now
Some choices are expensive to reverse (data model, licensing stance, auth provider, privacy defaults). Decide them early, write them down, and revisit only with evidence.

### 1.2 Decision table
| # | Decision | Options | Recommended default | How to decide | Lock before |
|---|---|---|---|---|---|
| D1 | Name, domain, brand | Working title vs final | Keep "RealType" as a working title; check name/domain/trademark before public beta | Search domains, app stores, trademark databases; ask 5 users for associations | M7 |
| D2 | Open-source stance and license | Closed; open-core (engine open); fully open | **Open-core**: open-source the typing engine and metrics library under a permissive license; keep hosted service private | Weigh trust vs cloning risk; check that no GPL/AGPL code or content was copied | M0 (repo setup) |
| D3 | Age policy | Adult-only; teens allowed | **Adult-only (18+) at launch** (India's DPDP law treats anyone under 18 as a child and requires verifiable parental consent); no child-directed features | Have counsel review any plan to allow under-18s | M3 |
| D4 | Authentication | Managed provider vs self-hosted sessions | **Managed provider** with email + Google + GitHub | Compare setup time, cost, data residency, lock-in | M3 |
| D5 | Hosting | Static host + API host + managed DB | Static hosting for the web app; one small API service; managed MongoDB | Compare free tiers, region latency, cold starts | M0 |
| D6 | Initial language skins | Any 3–5 | **JavaScript/TypeScript (incl. JSX), Python, Java, SQL, HTML/CSS** | Pick where you can validate content quality; add more later | M5 |
| D7 | Initial keyboard layouts | 5 | QWERTY US/UK, Dvorak, Colemak/Colemak-DH, AZERTY, QWERTZ | Match the spec; test each on a real keyboard | M1 |
| D8 | Analytics | Privacy-friendly analytics | Cookie-light analytics with a strict event allowlist | Check that no typed content can be sent | M0 |
| D9 | Error tracking | Managed service | Managed service with scrubbing rules | Confirm scrubbers work with a test event | M0 |
| D10 | Email provider (V1) | Managed transactional email | Decide at V1 | Deliverability, price | V1 |
| D11 | Payments (V1) | Regional + card options | Decide at V1; consider UPI/regional methods | Fees, compliance | V1 |
| D12 | Content sources | Original, public-domain, permissive | **Original + public-domain + permissive only** | License register; no GPL/AGPL content | M0 |
| D13 | LLM usage | None, content, coach | **None at MVP**; consider for V1 composition prompts with cost caps | Cost, quality, privacy | V1 |
| D14 | Raw keystroke log retention | 30 vs 90 days | **30 days** (flagged/verified excepted) | Balance debugging vs privacy | M3 |
| D15 | Test/tooling stack | Unit, e2e, load | Fast unit runner, browser e2e across three engines, CI budgets | Match `typing-e2e-testing` skill | M0 |
| D16 | Mobile scope | Honest mobile only vs mobile mode | **Honest mobile message + responsive site** at MVP | Usage data after beta | M2 |
| D17 | Accessibility target | WCAG 2.2 AA | AA for non-test UI, plus typing-specific rules | Match spec | M2 |

### 1.3 The decision log (do this)
- Create a single document (or issue-tracker section) called the **Decision Log**.
- For each decision record: **date, decision, options considered, reason, evidence link, who approved, revisit trigger**.
- When you change a decision, add a new entry that references the old one; don't overwrite.
- Any change that alters the spec must also be reflected in the spec's changelog.

### 1.4 Decisions that need special care
- **D2 (open-source):** Do not copy code, word lists, or quotes from GPL/AGPL projects (for example, Monkeytype's GPL-3.0 assets). If you choose to license your project under a copyleft license, you gain reuse options but accept obligations. Record the reasoning either way.
- **D14 (retention):** Whatever you choose, make the retention job real (a scheduled deletion that is tested), not just a policy statement.
- **D3 (age):** Launch **18+ only**. If you later allow under-18s, you need a verifiable parental-consent workflow, and tracking, behavioral monitoring, and targeted advertising directed at children are prohibited under India's DPDP rules; revisit privacy, notifications, and gamification rules for minors with counsel.

---

## 2. Phase R0 — Validate Before Building (Weeks 0–2)

**Goal:** confirm that people want a diagnose→drill loop and a programmer token track, and that the core technical bets are feasible. This phase produces a **go/no-go decision** with evidence. It can overlap M0.

### R0-01 Write down hypotheses and thresholds
1. Open the spec's assumption register (A1–A8).
2. For each assumption, write a testable statement and **the number that would make you pivot** *before* you collect data (for example, the minimum share of interviewees who would switch tools, and the minimum waitlist conversion).
3. Record them in the Decision Log.
**Check:** every assumption has a method, a threshold, and a date.

### R0-02 Recruit participants
1. **Target 12–15 people** with a spread: 4–5 general upgraders (30–70 WPM), 4–5 programmers/CS students, 2–3 writers/professionals, 1–2 adult re-learners, and (if possible) 1–2 users with accessibility needs.
2. **Where:** friends-of-friends, college groups, developer communities, typing/keyboard hobby communities, writing groups, LinkedIn/X posts. Avoid only recruiting people who already like you.
3. **Screener:** ask how they practice typing now, how often they type at work/study, whether they code, and their approximate speed (self-report). Exclude people who are typing-competition experts unless you want the competitor persona.
4. **Consent:** explain the purpose, that you will take notes, and how you'll store them. Offer to delete notes on request. Offer a small thank-you if budget allows.
**Check:** at least 10 sessions are scheduled with the mix above.

### R0-03 Run problem interviews
1. **Length:** 30–40 minutes, video or in person.
2. **Structure:**
   1. Warm-up: what they type, how much, why.
   2. Current practice: tools used, frequency, what they like/dislike, what made them quit.
   3. Trust: cheating, ads, upsells, rigid gates.
   4. Improvement: what they do after a test to improve; what's missing.
   5. Programmer probes: symbols/numbers/brackets that slow them; syntax recall habits; layout issues.
   6. Writer probes: words per day, interruptions, what blocks flow.
   7. Motivation: what keeps them coming back; what annoys them (streaks, notifications).
   8. Value: what would make them switch; what would they pay or support (don't ask "would you pay?" first; ask what they pay for now).
3. **Show, don't sell.** Near the end, show a rough mock of the results page with "your top 3 weak spots" and ask for reactions. Don't defend it.
4. **Take notes in a fixed template:** quotes, behaviors, pains, current workarounds, surprises.
5. **Ask permission** before recording; if recorded, delete after synthesis.
**Check:** you have raw notes for ≥ 10 interviews and one-line summaries per person within 24 hours of each.

### R0-04 Synthesize
1. Put each observation on a separate note (physical or digital) and **cluster** by theme.
2. Count how many participants mention each theme. Mark **strong** (≥ 60%), **moderate** (30–59%), **weak** (< 30%).
3. Compare with the spec's pain points (PP-01…PP-26): confirm, weaken, or add.
4. Write a **one-page summary**: top 5 problems, top 5 desired outcomes, features people got excited about, features people ignored, and any surprises.
5. Update the spec's priorities if reality disagrees with assumptions.
**Check:** the summary exists, and at least one spec priority changed *or* you explicitly recorded that none needed to.

### R0-05 Waitlist test (demand signal)
1. **Build one simple page** (you can use the same stack later or a page builder for now) with a single call to action: join the waitlist.
2. **Prepare three concept variants** with different headlines but the same layout:
   - Concept A: "Find what slows your typing and fix it in 15 minutes a day."
   - Concept B: "Symbols, numbers, and naming: typing practice built for programmers."
   - Concept C: "Train on your own code without uploading it." (Note: describe as a concept; don't imply it exists.)
3. **Copy rules:** no promises of speed gains, better programming, or hireability. State what the product will do ("diagnose", "practice").
4. **Collect only email plus one optional question** (role: student/developer/writer/other).
5. **Traffic:** post in a few relevant communities and share with participants; if you buy ads, keep the budget small and equal per variant. Record the source of each signup.
6. **Measure:** visit-to-signup rate by variant and by source; role breakdown.
7. **Decision rule:** compare against your pre-set thresholds. Low absolute traffic means low confidence; treat it as directional.
**Check:** ≥ 200 visits per variant (or acknowledge low confidence) and a written comparison.

### R0-06 Prototype the first-session win (paper/clickable)
1. Sketch the flow: land → 60-second test → results with weak spots → 2-minute drill → retest → delta → dismissible save prompt.
2. Build a clickable mock (design tool, slide deck, or a static HTML mock made with OpenCode; keep it disposable).
3. **Test with 5 people:** give tasks without guiding ("Take a typing test", "Find what to work on", "Practice that", "See if you improved"). Watch silently; note hesitation, confusion, and delight.
4. Ask the Single Ease Question after each task (how easy was it, 1–7).
5. Fix top issues and re-test with 2–3 new people if the flow was confusing.
**Check:** ≥ 4 of 5 participants complete the flow unaided; you have a list of changes to the flow.

### R0-07 Technical spikes (feasibility)
Run each as a **time-boxed** spike (max 1–2 days). Use OpenCode to build throwaway prototypes in a scratch repo. Record results in a spike report.

| Spike | Question | How | Success criteria |
|---|---|---|---|
| S1 Input latency | Can we render keystroke feedback within a frame across browsers? | Prototype a typing area with cached character positions and a transform-moved caret; measure input-to-paint over 300+ keystrokes in Chromium, Firefox, WebKit | p95 within the proposed budget on a reference laptop; no long tasks |
| S2 Timing capture | Do keydown/keyup timestamps behave (order, rollover, key repeat)? | Log events while typing quickly with overlaps; replay | Log reproduces text; rollover captured |
| S3 Engine parity | Can the same metrics logic run in browser and Node with identical output? | Implement metrics on fixtures in both | Identical numbers on 5 fixtures |
| S4 Token parsing | Can Tree-sitter WASM run in the browser for 3 languages within bundle budget? | Load lazily; tokenize sample snippets | Works; lazy-loading keeps the main test page light |
| S5 Bundle baseline | How big is the baseline app? | Build a minimal shell | Test page JS under budget |
| S6 Hidden-tab behavior | Can we detect and neutralize background throttling? | Switch tabs during a test | Elapsed time cannot be inflated |

**Check:** a spike report with pass/fail per spike and any risks.

### R0-08 Legal and licensing pre-checks
1. Create the **license register** (a table: asset, source, license, allowed use, attribution, decision).
2. Register every asset you intend to use in R1: fonts, word lists, quotes, code snippets, icons, sound files, libraries.
3. Mark GPL/AGPL sources as **do-not-copy**.
4. For the 136M-keystroke dataset: note "released for scientific use"; decide whether to contact the authors about commercial use, or rely only on published model descriptions and your own data.
5. Confirm library licenses for the editor and parser you plan to use.
**Check:** no asset in the plan lacks a license entry.

### R0-09 Competitor hands-on audit
1. Use each competitor for 20–30 minutes as a first-time and as a returning user (Monkeytype, Keybr, TypingClub, Ratatype, Typing.io, SpeedTyper.dev, TypeRacer, Nitro Type).
2. For each capture: first-run experience, time to first keystroke, results screen contents, how it handles errors, settings, ads/upsells, keyboard navigation, mobile behavior, accessibility basics.
3. Save screenshots and short notes in a shared folder; do not copy their assets.
4. Write "what to match" and "what to beat" lists.
**Check:** a one-page comparison per competitor.

### R0-10 Go / no-go gate
1. Compare evidence to thresholds.
2. Decide: **Go**, **Go with changes** (list them), **Pivot** (state the new hypothesis), or **Stop**.
3. Write a one-page decision memo: evidence, decision, scope changes, risks, next actions.
4. If go: freeze MVP scope from the spec §3.2, updated by R0 learnings.
**Done when:** the memo exists and the Decision Log is updated.

---

## 3. Milestone M0 — Project Setup (Days 1–3)

**Goal:** a working repository, environments, CI, deployments, and OpenCode configured so every later task starts from a safe, consistent base.

### M0-01 Create accounts and access
1. **Source hosting:** create the repository host account/org; enable two-factor authentication.
2. **Cloud services:** hosting for the web app, hosting for the API, managed database, error tracking, analytics, domain registrar/DNS.
3. **Secrets manager:** use the host's environment-variable facility; never store secrets in the repository.
4. **Password manager** for all credentials.
**Check:** every service has 2FA and a recovery method stored safely.

### M0-02 Create the repository
1. Create one repository (monorepo) named after the project.
2. Add a **README** describing purpose, structure, and how to run things (fill in later).
3. Choose the license per D2 and add a LICENSE file; add a NOTICE/attribution file for third-party assets.
4. Add `.gitignore` conventions for editors, env files, build outputs.
5. Enable branch protection on the main branch: require pull requests, passing CI, and at least your own review (yes, even solo).
6. Turn on dependency vulnerability alerts and secret scanning.
**Check:** direct pushes to main are blocked; alerts are enabled.

### M0-03 Decide and create the folder structure
Create these top-level areas (empty or with a short README each):
- **apps/web** — the user-facing app.
- **apps/api** — the server.
- **packages/engine** — typing engine and metrics (framework-agnostic, shared by client and server).
- **packages/schemas** — shared data-shape definitions and validation rules.
- **e2e** — end-to-end tests.
- **docs/spec** — the master spec (copy it here) plus the playbooks.
- **docs/decisions** — the Decision Log and architecture decision records.
- **content** — corpora, snippet libraries, license register (with strict review).
**Check:** the structure matches `AGENTS.md`; each folder has a one-paragraph purpose note.

### M0-04 Tooling choices and configuration (decisions, not code)
1. **Package management and workspaces:** one workspace manager for all packages; lock dependency versions.
2. **Language and strictness:** typed language with strict checking for all packages.
3. **Formatting and linting:** one formatter, one linter, shared config; run on commit and in CI.
4. **Testing:** a fast unit runner for engine/schemas; a browser e2e tool across Chromium, Firefox, WebKit; a coverage report for the engine package.
5. **Build tooling:** fast dev server for the web app; production build with bundle analysis.
6. **Commit conventions:** short imperative subject with task ID and requirement ID.
7. **Node version and package manager version:** pin them in a version file so everyone (and CI) uses the same.
**Check:** a fresh clone can install, lint, typecheck, test, and build with one documented command each.

### M0-05 Continuous integration (CI) pipeline
Define pipeline stages (in words) and quality gates:
1. **Install** with a frozen lockfile.
2. **Lint and format check.**
3. **Typecheck** all packages.
4. **Unit tests** for engine and schemas, with a minimum coverage bar for the engine (set a bar and raise it over time).
5. **Build** all apps.
6. **Bundle-size check** against the budget (test page JavaScript ≈ 200 KB gzip as a starting point).
7. **E2E smoke test** on Chromium (full matrix later).
8. **Dependency audit** and **license check** (fail on copyleft licenses in production dependencies unless approved).
9. **Preview deployments** for pull requests (web app) if your host supports it.
**Check:** a deliberately failing test blocks the merge; a passing PR shows all stages green.

### M0-06 Environments
| Environment | Purpose | Data | Access |
|---|---|---|---|
| Local | Development | Local database or a dev cluster | You |
| Staging | Pre-release checks | Synthetic data only | You + testers |
| Production | Users | Real data | Restricted |
1. Create separate database projects/clusters and API services for staging and production.
2. Use different credentials per environment.
3. Add environment banners in the UI (visible in staging only).
4. Document how to promote a build from staging to production and how to roll back.
**Check:** you can deploy "hello world" for the web app and API to staging and production and roll back once.

### M0-07 Observability basics
1. **Error tracking:** connect frontend and backend; configure **scrubbing** so typed text, keystroke logs, and personal data never leave. Verify by triggering a test error that contains a fake typed string and confirming it's redacted.
2. **Uptime checks** on the web app and API health endpoint.
3. **Privacy-friendly analytics:** configure with an **event allowlist** (names and allowed properties). Block any property not on the list.
4. **Logging policy:** structured logs; never log request bodies that contain keystroke logs or typed text.
**Check:** the scrubbing test passes; the analytics allowlist rejects an unknown property.

### M0-08 Install and vet the OpenCode kit
1. **Install OpenCode** following its official docs; confirm it runs in the repo root.
2. **Copy the starter kit** into the repository root: AGENTS.md, opencode config, `.opencode/` folder, and `docs/spec` files.
3. **Restart OpenCode** and confirm the project skills appear in its skill list.
4. **Third-party skills — vet each one before installing:**
   1. List what a skill contains before installing (use the skills CLI's list option).
   2. Read the skill's instructions completely.
   3. Check for scripts; prefer skills without scripts; read any script fully.
   4. Look for instructions to send data anywhere, download and run things, or override safety rules; reject if found.
   5. Prefer official sources (Anthropic, Vercel Labs, MongoDB, Microsoft, GreenSock, Emil Kowalski, Addy Osmani).
   6. Optionally run a skill scanner.
   7. Install into OpenCode only; keep the permission at "ask" until you have used and trusted it.
5. **Recommended must-installs at this stage:** the official frontend-design skill, the web-design-guidelines and React best-practices skills, the two Emil Kowalski skills, and the Context7 documentation connector.
6. **Permission review:** confirm the config keeps third-party skills at "ask", allows only safe shell commands, and keeps the browser-testing connector off until needed.
7. **Do not run OpenCode with real secrets in your environment** while trying new skills; use a throwaway shell or a container.
**Check:** the project skills load on request; a test prompt that says "load typing-engine-core" works; third-party skills prompt before loading.

### M0-09 Customize AGENTS.md
1. Fill in the **commands section** with the actual install, dev, test, e2e, lint, typecheck, build commands once scaffolded.
2. Add **project-specific rules** you have decided (license stance, initial languages, layouts).
3. Keep the spec out of the always-loaded instructions; keep the "read on demand" rule.
4. Keep the file short (aim under ~100 lines); move detail to skills.
**Check:** a new OpenCode session can answer "what are the non-negotiable rules?" correctly without reading the whole spec.

### M0-10 Scaffold the apps (first Plan → Build session)
1. **Plan:** ask the Plan agent to propose a minimal scaffold that satisfies the folder structure and CI; require it to list every dependency it wants to add with a one-line reason.
2. **Review the plan** and remove anything not needed (no Redis, queues, sockets, or state libraries beyond the minimum).
3. **Build:** scaffold the web app shell (one page that says "RealType"), the API with a health endpoint, the empty engine and schemas packages, and the e2e project with one smoke test.
4. **Verify:** run all commands from M0-04; confirm CI passes on a pull request.
5. **Deploy** the shell to staging and production; verify the health endpoint and error tracking.
**Check:** the shell is live on both environments; CI is green; you can roll back.

### M0-11 Project board and Definition of Done
1. Create a board with columns: Backlog, Ready, In Progress, In Review, Done.
2. Enter the milestone tasks (M1–M8) as epics; add the first 10 tasks from the Plan agent.
3. Write the **Definition of Done** (from the spec): reviewed diff; unit and e2e tests; accessibility check; performance budget met; metrics docs updated if formulas changed; privacy review; feature flag and rollback plan; analytics events without content.
4. Add issue templates for: feature (with requirement IDs), bug (with steps and environment), spike, decision.
**Check:** a sample task moves through the board with the DoD checklist attached.

### M0-12 Security baseline
1. Enforce HTTPS and secure headers on both apps (strict content-security policy, no inline scripts by default).
2. Set up rate limiting on the API (even at MVP).
3. Store secrets only in the hosting provider's secret store.
4. Add a **security review checklist** (see §8.10) to your pull-request template.
**Check:** a header scan shows the intended headers; the rate limiter blocks a burst test.

**M0 Done when:** repo protected; CI green with all gates; staging and production shells deployed; error tracking scrubbing verified; OpenCode kit loaded; Decision Log started; board ready.

---

## 4. Design Foundation (Weeks 1–2, in Parallel with M1)

**Goal:** a written design brief and a working token/theme/component foundation so UI work is consistent from day one and meets the award-level bar (see the award playbook).

### 4.1 Write the design brief (Day 1–2)
1. **Audience:** list personas P1/P2 and their contexts (late-night coding, office work, study).
2. **Feeling in three words** (for example calm, precise, adult). Pick words you can test.
3. **Design pillars:** typing surface is quiet; insight is the reward; developer-native accents in the programmer area; honest data.
4. **Do-nots:** no ads/popups in the typing flow; no childish gamification; no guilt copy; no decorative motion on the typing surface.
5. **Reference sites:** collect 15 references across typing tools, learning products, and well-crafted tools. For each note what you'd borrow and what you'd avoid.
6. **Art direction choice:** select from the options in the award playbook (recommended: calm editorial base with developer-native accents).
**Check:** a one-page brief signed off in the Decision Log.

### 4.2 Typography (Day 2–3)
1. **UI font:** choose a highly legible sans with open licensing; confirm its license permits web embedding.
2. **Typing font(s):** choose 3–5 monospace options users can pick from, including one dyslexia-friendly option; confirm licenses; confirm consistent character widths.
3. **Scale:** define a modular type scale (about 7 steps) for UI; define text sizes for the typing surface with user-adjustable scaling.
4. **Line height and letter spacing:** set generous line height for the typing surface; test at 200% zoom.
5. **Ligatures:** default off in typing modes; user setting.
6. **Font loading:** plan self-hosting, subsetting, and fallbacks; avoid layout shift.
**Check:** a specimen page (in the app's design page) shows every size, weight, and font with real content.

### 4.3 Color and themes (Day 3–5)
1. **Semantic tokens first** (background, surface, text tiers, accent, borders, feedback colors, and the five typing states).
2. **Build light and dark themes**, then 2–3 presets (for example a warm neutral, a cool developer theme, a high-contrast theme).
3. **Contrast verification:** for every theme, verify text contrast ≥ 4.5:1 and UI component contrast ≥ 3:1; verify typing-state colors are distinguishable and **paired with non-color cues** (underline, strike, outline).
4. **Color-blind checks:** simulate common color-vision types on the typing states and heatmaps.
5. **Heatmap palette:** choose a sequential palette that works for color-blind users; define light/dark variants.
6. **Default theme** follows the OS preference; the choice persists locally.
**Check:** a token table with computed contrast ratios for each theme; no failing pairs.

### 4.4 Spacing, shape, elevation
1. Define a spacing scale (4-based), radius scale, and minimal elevation (prefer borders over shadows).
2. Define grid and breakpoints (mobile 320+, tablet, desktop, wide).
3. Define the reading/typing column width (comfortable character count per line).
**Check:** a layout page demonstrates spacing and breakpoints.

### 4.5 Iconography and illustration
1. Choose one icon set with a consistent stroke and open license.
2. Decide the illustration stance (likely minimal: data visuals over decorative art).
3. Define the logo lockup and favicon requirements (design later; placeholder now).
**Check:** an icon sheet with licenses recorded.

### 4.6 Motion language
1. Adopt the motion tokens from the `typing-motion-tokens` skill as the starting point.
2. **Write the rules in plain language:** what may animate, what may not; durations and easings by type; exit faster than entrance; stagger limits; celebration rules; reduced-motion policy.
3. List every microinteraction with trigger, feedback, duration, and reduced-motion alternative (start from the catalog).
4. Decide the tech per need: simple transitions in styles; component transitions with the animation library; per-frame values via values that don't re-render the UI.
**Check:** a one-page motion guide; each planned interaction has a reduced-motion alternative.

### 4.7 Sound stance
1. Decide: no sound at MVP (recommended), optional sound packs in V1.
2. If added: off by default; never the only feedback; no latency impact; license all files.
**Check:** decision logged.

### 4.8 Component inventory and states
1. Take the inventory in `typing-design-tokens` and refine it.
2. For each component list: purpose, variants, required states (default, hover, focus-visible, active, disabled, loading, empty, error), accessibility notes, and motion.
3. Prioritize components for M2: typing surface, mode bar, settings controls, toast, skeleton, empty state, button/toggle/select/tabs.
**Check:** an inventory table with states and priorities.

### 4.9 Page templates and special pages
1. Define templates: test page, results, dashboard, level map, settings, content page (docs/legal), marketing page.
2. Design the **special pages** now: 404, loading skeletons, empty states, offline banner, generic error, maintenance. (Award juries and real users notice these.)
**Check:** wireframes for each template and special page.

### 4.10 UX writing guide
1. Voice: calm, adult, direct, curious. No hype, no guilt.
2. **Banned phrases:** anything promising speed gains, better programming, hireability; guilt about streaks; fake urgency.
3. **Microcopy templates:** empty states (one clear next action), errors (what happened + what to do), success (brief), tooltips (plain language), onboarding (short).
4. **Number formatting and units:** consistent WPM display, accuracy, decimals.
5. **Explainers:** plain-language descriptions for every metric with a link to the "How we calculate" page.
**Check:** a one-page voice guide with 20 sample strings.

### 4.11 Implement the design foundation in the app (M2 prerequisite)
1. **Plan session:** ask OpenCode (loading `typing-design-tokens` and `typing-motion-tokens`) to propose how to implement tokens, themes, and the design page. Require: token names, theme switching approach, and a "design system page" listing all tokens and components.
2. **Build slice 1:** tokens and light/dark themes with the specimen page.
3. **Build slice 2:** the five presets and the contrast table page.
4. **Build slice 3:** primitives with all states.
5. **Review:** run `@ui-reviewer` and `@a11y-auditor` on the design page; fix findings.
6. **Freeze v1 of the tokens** (rename later only with a migration note).
**Check:** the design page shows every token, theme, and primitive; contrast table passes; reduced-motion behaviors verified.

**Design foundation Done when:** brief approved; tokens/themes implemented; typography loaded without layout shift; motion guide written; special pages designed; UX writing guide published; primitives built and reviewed.

---

# PART II — CORE TYPING PRODUCT

## 5. M1 — Typing Engine and Metrics (Weeks 2–3)

### 5.0 Goal and scope
**Goal:** a framework-independent, heavily tested engine that records keystrokes, runs the test lifecycle, classifies errors, computes metrics, and replays sessions, identically in the browser and on the server.
**Requirements:** ENG-01 … ENG-13, spec §6 (metrics), OPS-06 (model versioning).
**Depends on:** M0 (repo, CI), R0 spikes S1–S3 and S6.
**Skills to load in OpenCode:** `typing-engine-core`, `typing-metrics-spec`.
**Why first:** every later feature (results, analytics, drills, verification, races) trusts these numbers. Mistakes here spread everywhere.

### 5.1 Architecture decisions (write them down)
1. **Boundary:** the engine package contains *no* page/UI logic. It exposes: a way to create a test from text and settings; a way to feed it input events; a way to read state; a way to finish and get results; a way to replay from a log; and a way to compute metrics from a log.
2. **Time source abstraction:** the engine never reads the clock directly; time arrives with each event (timestamps). Tests can therefore feed synthetic time.
3. **Determinism:** the same log and settings always produce the same results. No randomness inside the engine.
4. **Immutability of logs:** once a test ends, its log is frozen.
5. **Versioning:** the engine reports a **model version** with every result; formula changes bump the version.
6. **Contracts live in the schemas package** so client and server agree on shapes.
7. **Layers:** (a) data contracts → (b) text model → (c) input processing and state machine → (d) metrics → (e) replay → (f) extensions (token attribution, added in M5).

### 5.2 Steps

#### M1-01 Define the data contracts
**Do:** specify, in the schemas package, the shapes (with units, ranges, and validation rules) for:
1. **Event:** which key (physical code and produced character), whether down or up, timestamp (milliseconds since test start, with fractional precision), modifier state, and whether the character was auto-inserted.
2. **Log:** ordered events plus test metadata (mode, text identifier and hash, layout, settings, engine version, session identifier).
3. **Text:** identifier, content, language, content type, difficulty band, license, source.
4. **Settings:** error mode, auto-indent/auto-pair choices, layout, difficulty options.
5. **Result summary:** all metrics, model version, difficulty band, verified flag, flags.
6. **Session:** identifier, seed, nonce, text hash, expiry (for server verification later).
**How:** ask OpenCode to draft the contracts from the spec, then review each field: is the unit clear? is there a maximum size? what happens with unknown fields?
**Check:** each contract has a written purpose, field list, limits (for example maximum events per test, maximum text length), and versioning rule; the server will reject anything outside limits.

#### M1-02 Build the fixture library (test-first)
**Do:** before any logic, create a fixtures folder of recorded and hand-built logs with **expected outputs**.
**How:**
1. Use your R0 recording spike to capture real typing samples: slow and careful, fast and sloppy, with pauses, with many backspaces, with rollover, with key repeat (holding a key), with Caps Lock and Shift, and on different layouts.
2. For each fixture, compute expected results **by hand or in a spreadsheet** (do not use the engine to generate its own expectations). Record: net/raw/gross WPM, accuracy variants, KSPC, rollover ratio, consistency, burst, per-second series, error class counts.
3. Add synthetic fixtures for the five vectors in `typing-metrics-spec`.
4. Add adversarial fixtures: zero-length test, one keystroke, huge log, out-of-order timestamps, duplicate events, keyup without keydown, key held forever, impossible speeds, text with emoji/accents/combining marks.
5. Add layout fixtures for QWERTY, Dvorak, Colemak, AZERTY, QWERTZ (same text typed on each).
**Check:** ≥ 25 fixtures, each with a description and expected values, reviewed by you.

#### M1-03 Text model
**Do:** define how a target text becomes a sequence of comparable units.
**How:**
1. **Normalize** the text (consistent Unicode form; consistent newline and whitespace rules; no invisible characters).
2. **Units:** decide whether the unit is a code point or a user-perceived character (grapheme). Recommendation: user-perceived characters for display; keystroke mapping handles multi-key characters (accents) explicitly.
3. **Words and lines:** define word boundaries (spaces and punctuation) and line breaks for display; keep these separate from typing semantics.
4. **Extra and missed characters:** define what "extra" (typed beyond a word's end) and "missed" (skipped) mean in each error mode.
5. **Alignment for error classification:** define an alignment method (edit-distance style) that classifies each difference as substitution, omission, insertion, or transposition. Set a rule for ambiguous alignments (prefer the interpretation with fewer edits; document tie-breaks).
**Check:** a text-model specification page with examples in words; fixture expectations reference it.

#### M1-04 Input adapter (the thin DOM layer)
**Do:** specify how the web app feeds the engine.
**How (decisions):**
1. **Key sink:** a real focusable input element (visually hidden or styled) receives keyboard input; the visible text is separate. Set attributes that turn off auto-capitalization, autocomplete, autocorrect, and spellcheck.
2. **Events:** listen for key down, key up, composition start/update/end, blur/focus, visibility change, paste, drop, and (for untrusted detection) inspect whether the event is trusted.
3. **What counts as typing:** printable characters, Backspace, Space, Enter (in multi-line modes), Tab only where a mode needs it. **Tab is reserved for restart**; document how users can still tab out (Esc).
4. **Key repeat:** when the key is held, repeated key-down events are marked as repeats and **not** counted as new keystrokes for speed (define the rule and test it).
5. **Modifiers:** Shift/AltGr/Caps affect characters; Ctrl/Cmd combos are ignored except allowed editing shortcuts in V1; never swallow browser shortcuts users need (reload, dev tools) unless the mode requires.
6. **IME/composition:** during composition, do not score partial input as separate keystrokes; score the committed text; **document** unsupported IME cases and show a notice rather than silently mis-scoring.
7. **Dead keys:** treat as part of a two-key character; map correctly for layouts that use them.
8. **Mobile:** MVP shows an honest note; V1 introduces a separate mobile mode.
9. **Focus rules:** on load the typing surface is focused; clicking away pauses (practice) or invalidates (verified); Esc exits focus predictably.
10. **Paste/drop/autofill:** blocked in typing surfaces; in verified sessions, any occurrence invalidates the run.
**Check:** a documented list of every listened event, what it does, and what it ignores; manual checks on three browsers.

#### M1-05 Log recorder
**Do:** capture events reliably with minimal overhead.
**How:**
1. Append events to a pre-allocated buffer (avoid reallocation on the typing path).
2. Timestamps come from the high-resolution event time; store relative to the test start.
3. Enforce a maximum event count; if exceeded, end the test with a clear notice.
4. Provide an **encoding step** for upload later: convert to compact deltas; compress before sending (server will decode and revalidate).
5. Never send logs during a test.
**Check:** a 60-second, 400-keystroke test produces a log under a few kilobytes when encoded; recording adds no measurable delay in the latency harness.

#### M1-06 Test state machine
**Do:** implement the lifecycle: idle → ready → running → paused → finished → submitting → submitted / failedOffline, plus invalid.
**How:**
1. Define **each transition** as a pure decision: current state + event → next state (or ignored).
2. **Start:** first accepted keystroke.
3. **End conditions:** timer (computed from timestamps, never from a running interval), word/character count reached, or last character in fixed-text modes.
4. **Pause and invalidation:** practice tests pause on blur/hidden; verified tests become invalid on blur/hidden or untrusted input.
5. **Timers:** the visible countdown may use a display timer, but the *scored* elapsed time uses timestamps. On resume after pause, exclude paused time in a documented way.
6. **Restart:** resets state; decides whether to reuse the same seed/text (setting).
7. **Submission states:** the engine ends at "finished"; submission is handled outside the engine.
**Check:** a transition table (every state × every event) with expected outcomes; unit tests for each cell.

#### M1-07 Error modes
**Do:** implement three MVP modes and design the rest.
**How:**
1. **Free:** typed characters appear; errors are marked; Backspace edits; the test continues.
2. **Must-correct:** the caret cannot advance past an error until fixed; define behavior for word-level vs letter-level enforcement (choose letter-level for MVP).
3. **Stop-on-error:** the run ends (or the set restarts) on a wrong character; used for accuracy drills.
4. Define **how each mode affects metrics** (for example, in must-correct, accuracy counts uncorrected errors differently) and document it publicly.
5. **V1 modes:** no-backspace (exam style) and word-locked; **editing keys** (delete-word, arrows) with efficiency metrics.
**Check:** a behavior table per mode with expected results for the same fixture typed in each mode.

#### M1-08 Typed vs auto-inserted characters
**Do:** support flags so code modes can add auto-indent and auto-pair without corrupting metrics.
**How:** events carry an "auto" flag; metrics compute "typed" and "with-auto" variants; document which is the headline (typed-only).
**Check:** a fixture with auto-inserted characters yields distinct numbers with and without auto.

#### M1-09 Metrics library
See §5.3 for the detailed procedure per metric.

#### M1-10 Replay
**Do:** reconstruct the typing session deterministically.
**How:**
1. Replay consumes a log and yields frames: text state, caret position, keys down, error markers, and timestamp.
2. Speed control is a display concern (scale time), not a scoring concern.
3. Replay must reproduce the final text exactly; if not, mark the log as corrupted.
**Check:** replaying each fixture reproduces the exact final text and error markers.

#### M1-11 Server-parity harness
**Do:** prove the engine gives identical results in the browser and on the server.
**How:** create a test that runs every fixture through the engine in the server runtime and in a real browser and compares all metrics within a tiny tolerance; fail CI on any difference.
**Check:** all fixtures pass on both.

#### M1-12 Property tests
List invariants and test them with many random logs:
1. Elapsed time never decreases; scored time is within [0, max].
2. 0 ≤ accuracy ≤ 100 for all variants.
3. Net ≤ gross ≤ raw (or the documented relationship).
4. Replay reproduces the final text for any valid random log.
5. Adding a pause never increases net WPM.
6. Shuffling non-overlapping events in time changes results only as expected.
7. Doubling the time scale halves speeds (linearity).
8. Corrupt logs (out-of-order, duplicates) are rejected or repaired according to policy, never crash.
**Check:** property suite runs in CI with a fixed number of cases and seeds recorded for reproducibility.

#### M1-13 Performance and memory
1. Benchmark processing time for logs of 500, 5,000, and 50,000 events; set budgets (metrics for a 60 s test must be effectively instant).
2. Verify memory does not grow across repeated tests.
3. Confirm the server can validate a log within the API latency budget.
**Check:** a benchmark report with numbers.

#### M1-14 Review and documentation
1. Run `/spec-check` for ENG-01…ENG-13 and confirm gaps.
2. Write the **engine contract document**: inputs, outputs, states, errors, limits, versioning.
3. Update the `/how-we-calculate` draft with formulas in plain language.
4. Record any spec deviations in the Decision Log.
**M1 Done when:** all fixtures pass in browser and Node; property tests pass; contracts documented; latency for the log recorder verified; `/spec-check` shows no missing P0 items.

### 5.3 Metrics library: detailed procedure
For each metric, implement exactly what `typing-metrics-spec` defines, following these steps.

**1. Prepare the log.**
1. Validate ordering and limits; drop key-repeat events; collapse unmatched key ups.
2. Identify the accepted keystrokes (printable/edit keys) and their timestamps.
3. Determine the **scored interval**: from first accepted keystroke to end condition, minus paused periods.

**2. Reconstruct the final text.** Apply the typed sequence under the active error mode to obtain the final typed text and the aligned comparison to the target.

**3. Count characters.** Total typed keystrokes (including corrected), final text characters, correct characters, incorrect, extra, missed.

**4. Speed metrics.**
- **Raw:** printable keystrokes ÷ 5 ÷ minutes.
- **Gross:** final text characters ÷ 5 ÷ minutes.
- **Net (headline):** correct final characters ÷ 5 ÷ minutes; correction time is included automatically.
- Provide a **display rounding rule** (one decimal) but store full precision.
- **Short tests:** confirm linear scaling (the 10-second vector).

**5. Accuracy metrics.**
- **Keystroke accuracy:** correct keystrokes ÷ total printable keystrokes (a corrected mistake stays a mistake).
- **Final accuracy:** correct characters ÷ total characters at the end.
- Define how each error mode changes the numerator/denominator and document it.

**6. KSPC.** Total keystrokes including Backspace ÷ final text characters.

**7. Rollover ratio.** Count accepted keystrokes whose key-down occurred while the previous key was still down. Ignore modifier keys and key-repeat events. Define "previous key" as the previous accepted keystroke. Report as a ratio.

**8. Inter-key intervals (IKI).** Time between consecutive accepted key-downs; exclude gaps above five seconds from statistics; store the distribution summary (median, spread, percentiles).

**9. Per-second series and consistency.**
1. Bucket the scored interval into one-second bins; compute per-second net speed (use a smoothing rule or cumulative approach, document which).
2. Exclude the first two seconds for consistency.
3. Compute variability and convert to the consistency score (100 × (1 − CV), clamped 0–100).
4. Document limits (very short tests give unstable consistency; show "n/a" under a minimum duration).

**10. Burst.** Find the best rolling five-second window of net speed; require a minimum number of characters to avoid noise.

**11. Error classification.** Using the alignment from M1-03, count substitutions (and whether the substituted key is physically adjacent on the user's layout), omissions, insertions, transpositions, capitalization errors, punctuation errors.

**12. Statistics for learning (feeds M4).**
1. **Per-key stats:** for each target character, record attempts, errors, and time-to-press (time from the previous keystroke to this one).
2. **Per-bigram stats:** for each adjacent pair in the target, record the interval between the two keystrokes and whether either was wrong.
3. **Per-trigram** similarly, for frequent trigrams only.
4. **Rules:** only count pairs where both keystrokes were accepted and adjacent in time (no pause > threshold); tag pairs as same-hand/alternate-hand/same-finger using the user's layout.
5. Store aggregates compactly; never store the typed text.

**13. Difficulty band (prose).** Compute the typability score for the target text (see §6.5) and attach the band. Do **not** alter WPM.

**14. Versioning and change control.**
1. Every result carries the model version.
2. To change a formula: write the change proposal; update fixtures and vectors; bump the version; add a public changelog entry; decide whether to recompute old results (default: no, keep versions).
3. Never change a formula silently.

**15. Edge cases.**
- Zero or one keystroke: report speeds as not available.
- Extremely short elapsed time: cap or mark unreliable.
- Text with characters requiring multiple keys (accents): decide counting rule (one character, multiple keystrokes) and document.
- Very long pauses: net speed drops; burst does not.
- Results with implausible speeds: engine reports them; the **server** applies plausibility checks (M3).

### 5.4 Test plan summary
| Layer | What | Where |
|---|---|---|
| Unit | Each metric on fixtures and vectors | CI |
| Property | Invariants on random logs | CI |
| Parity | Browser = server | CI |
| Manual | Real keyboards: Windows/macOS/Linux × Chromium/Firefox/WebKit × five layouts | Before M2 exit |
| Manual | Hidden tab and blur behavior | Before M2 exit |
| Manual | IME: document behavior for at least one Asian-language IME | Before M7 |

### 5.5 Failure modes and debugging
- **Numbers differ between browser and server:** check rounding, time units, and event filtering; compare intermediate values.
- **Speeds look too high:** check that key-repeat and paused time are handled.
- **Replay mismatch:** check dead keys, composition, and auto-inserted characters.
- **Flaky property tests:** record seeds; fix the underlying invariant or the generator, never the test tolerance alone.

### 5.6 OpenCode instructions for M1
- **M1-01 (Plan):** "Load typing-engine-core. Read only ENG-01…ENG-13 in the spec. Propose the data contracts with units, limits, and versioning. Do not write code."
- **M1-02:** "Help me design the fixture set: list categories and the expected values I should compute by hand. Do not compute expectations with the engine."
- **M1-06:** "Produce the state transition table for the test lifecycle; then implement it with tests for every cell."
- **M1-09:** "Load typing-metrics-spec. Implement the metrics exactly as defined; each metric gets tests from the fixtures. Show me the plan first."
- Always finish with `/spec-check ENG-01 ENG-05 ENG-09` and read the report.

### 5.7 Events and metrics
No analytics events fire from the engine. It exposes counters (for example, dropped events, invalid runs) that the web app may report as **counts only**.

---

## 6. Content System (Weeks 2–4, overlapping M1–M2)

### 6.0 Goal and scope
**Goal:** a licensed, reviewed, well-tagged library of practice content plus rules for choosing content per user.
**Requirements:** CNT-01…CNT-11, MOD-01…MOD-04, PRG content (CNT-04, CNT-05).
**Skills:** `token-drill-generators` (for generated content), `typing-metrics-spec` (difficulty bands).
**Why now:** the typing surface is useless without good text, and licensing mistakes are costly to unwind.

### 6.1 Content types and MVP targets [proposal]
| Type | Purpose | MVP target | Source |
|---|---|---|---|
| Common-word lists | Classic mode | 1 list of ~200 and 1 of ~1,000 words | Public-domain or permissive frequency list; or build from public-domain corpus |
| Quotes | Classic quotes mode | ~300 (short/medium/long) | Public domain or original |
| Real-World Prose | Realistic default | ~300 passages | Original + public domain; mixed case, punctuation, digits, names, URLs |
| Numbers/symbols sets | Numbers mode | Generators | Synthetic |
| Code snippets | Code mode | ~100 per initial language | Permissive licenses, cleaned |
| Programmer generators | Levels 1–30 | Generators for tiers 1–6 | Synthetic |
| Composition prompts | Composition/Draft Sprint | ~50 [V1] | Original |

### 6.2 License register and policy (do first)
1. Create a table with: **asset ID, type, source URL, license, license text saved, allowed use, attribution text, date checked, reviewer**.
2. **Allowlist** licenses: public domain, CC0, MIT, Apache-2.0, BSD, CC BY (with attribution). **Blocklist** for copying: GPL, AGPL, CC BY-SA (share-alike) unless you accept obligations, and any unlicensed material.
3. Save a copy of the license text and a snapshot reference of the source.
4. **Never import** Monkeytype's word lists/quotes or other GPL assets.
5. For contributed content (V1), require a contributor license statement.
**Check:** every content item links to a register entry.

### 6.3 Sourcing steps by type

#### Word lists
1. Identify a frequency list with a permissive license, or derive frequencies yourself from a public-domain corpus.
2. Filter out offensive words and proper nouns unless intended.
3. Keep only lowercase forms for the classic list; create punctuation/case variants later via generators.
4. Record the source and computation method.

#### Quotes and prose
1. **Original writing:** write short passages in varied styles (email, notes, explanations, instructions, storytelling). Follow a style guide: 20–120 words, mixed sentence lengths, natural punctuation, some numbers, names, and simple URLs.
2. **Public-domain sources:** choose books/essays clearly in the public domain; extract passages; modernize nothing; verify jurisdiction rules.
3. **Avoid** news, blogs, forum posts, and anything copyrighted.
4. **Review:** two-pass review (accuracy, offensiveness, PII, licensing).

#### Real-world business text [V1 for full set; MVP a starter]
1. Write realistic but fictional emails, chat messages, tickets, meeting notes, and README-style text with invented names and companies.
2. Include realistic punctuation, capitalization, numbers, times, and URLs (use example domains).
3. Avoid real people, brands with trademark issues, and sensitive topics.

#### Code snippets
1. **Sourcing:** from projects with permissive licenses; record repository, file, commit, license, and attribution.
2. **Selection criteria:** self-contained, 5–30 lines, no secrets, no long generated blocks, representative of typical syntax (functions, conditionals, loops, data structures, config).
3. **Cleaning:** normalize indentation, remove trailing whitespace, cap line length, strip credentials/URLs with tokens, remove license headers in the snippet body but keep attribution in metadata.
4. **Validation:** confirm each snippet parses cleanly with the language grammar; reject those with syntax errors.
5. **Balance:** tag by token-class mix and difficulty; ensure a range from easy to symbol-dense.
6. **Attribution page:** list sources and licenses.

#### Synthetic generators
Follow `token-drill-generators`: seeded, deterministic, documentation-range IPs, example domains, random UUIDs, no real secrets.

### 6.4 The content pipeline (stages and gates)
1. **Ingest:** add raw items with source and license data.
2. **Clean:** normalize whitespace, quotes, and characters; remove invisible characters.
3. **Filter:** flag profanity, sensitive topics, PII (emails, phone numbers, IDs), secrets.
4. **Deduplicate:** exact and near-duplicate removal.
5. **Normalize length:** assign length bands; split long items at sentence boundaries.
6. **Tag:** language, content type, domain, length, character-class mix (uppercase, digits, symbols), token-class mix for code.
7. **Score difficulty:** compute the typability score and band (§6.5) for prose; compute token mix for code.
8. **Review queue:** human review for a sample or all items in early releases; record reviewer and decision.
9. **Publish:** mark status as live; version the content set; keep an audit trail.
**Gates:** an item cannot go live without a license entry, a review decision, and a difficulty tag.

### 6.5 Typability scoring (difficulty bands)
**Goal:** a transparent Easy / Typical / Hard label for prose, following the published feature families, without multiplying WPM.
**Steps:**
1. **Choose features** (from the model family): share of lowercase letters among non-space characters; share of high-frequency words; average bigram frequency; share of right-side keys; total keystrokes; syllables per word; share of symbols; share of non-dictionary words.
2. **Gather resources:** a word-frequency list, a dictionary/word list, a bigram-frequency table, a syllable counting method. **Check each resource's license**; prefer permissive or compute them from your own public-domain corpus.
3. **Define each feature precisely** in a written spec (numerator, denominator, treatment of punctuation/digits/case).
4. **Combine features** using a simple, documented weighting (start with published directions of effect; use conservative equal-ish weights and label as v0).
5. **Choose band thresholds** so that roughly a third of your content lands in each band; store thresholds in the versioned model config.
6. **Validate offline:** sanity-check that obviously hard texts (many symbols/digits/rare words) score Hard and simple lowercase common-word texts score Easy.
7. **Validate with users (beta):** for each user, compare their speeds across bands; check the ordering holds within-user; log the correlation.
8. **Document limits:** English prose only; not valid for code or symbol-heavy text.
9. **Version and changelog** the scoring model.
**Check:** a scoring spec, a resource/license list, a band distribution chart, and a validation note.

### 6.6 Weakness-targeted selection (retrieval)
**Goal:** choose natural sentences that cover the user's weak items without gibberish.
**Steps:**
1. **Index the content:** for each passage/sentence, precompute which bigrams/trigrams/characters/tokens it contains and how often.
2. **Input:** the user's weakness profile (top weak keys, transitions, symbols), content type, target difficulty band, desired length.
3. **Score candidates:** reward coverage of weak items (weighted by weakness severity and item frequency), penalize repeats already seen recently, penalize length mismatch, keep difficulty in band.
4. **Compose a drill:** select several short items to fill a set; order them from easier to harder within the set.
5. **Variety rules:** avoid the same sentence twice in a week; mix domains; cap repeated weak items per set so the drill isn't monotonous.
6. **Cold start:** with no data, use a balanced starter set; after the first test, use the first weakness estimate.
7. **Fallbacks:** if coverage is poor, use generated pseudo-words *only* if the user opted in, or broaden the target.
8. **Evaluate quality:** run review samples; check that drills feel natural and truly contain the weak items; measure improvement later (M4).
**Check:** for 20 synthetic weakness profiles, the selector returns natural sets with high coverage and no immediate repeats.

### 6.7 Code snippet library specifics
1. Store per snippet: language, text, size, token-class mix, difficulty, license, attribution, source reference, review status.
2. Provide **auto-indent variants:** with leading indentation typed vs auto-filled (feeds PRG-15).
3. Provide **safe rendering:** treat all snippet text as data; never interpret it; sanitize for display.
4. **Update process:** re-verify licenses periodically; support takedown requests promptly.

### 6.8 Content QA checklist
- [ ] License entry present and verified
- [ ] No PII, secrets, or real credentials
- [ ] No offensive or sensitive content
- [ ] Passes syntax validation (code)
- [ ] Length and difficulty tags present
- [ ] Reviewed by a second person or a second pass
- [ ] Attribution text ready

### 6.9 Storage and delivery
1. Store content in the database with versions and status; keep a read-only export for offline bundles later.
2. **Selection on the server** issues a signed session that includes the text hash (M3); the client fetches text by identifier.
3. Cache popular content; ensure the typing page needs no network beyond fetching the text (and can fall back to a bundled starter set if offline).
4. Track **seen items per user** (aggregate identifiers only) to avoid repeats.

### 6.10 Ongoing content operations
- Set a weekly cadence to add and review items.
- Track content health: usage per item, skip rates, error hotspots (do not track typed text), user reports.
- Provide a **report** button on content; route to the admin queue; act within a target time.
- Maintain the license register as content grows.

### 6.11 Tests and Done-when
**Tests:** license completeness audit; pipeline gate tests (an item missing a license cannot publish); duplicate detection; selector quality checks; syntax validation for snippets; PII/secret scans.
**Done when:** the register is complete; MVP content targets met; pipeline gates enforced; typability bands implemented and documented; selector works on synthetic profiles; attribution page drafted.

### 6.12 OpenCode instructions for the content system
- "Load token-drill-generators and typing-metrics-spec. Propose the content data model and pipeline gates. Do not add any dependency without justification."
- "Implement the license gate: content without a register entry cannot be published. Add tests."
- "Design the weakness-targeted selector using the scoring rules in section 6.6 of the implementation guide. Show the plan and the test cases first."
- Use `@security-auditor` to review sanitization and PII/secret scanning.

---

## 7. M2 — Typing Surface, Themes, Motion, Accessibility (Weeks 3–4)

### 7.0 Goal and scope
**Goal:** a typing page that feels instant, looks calm, works with real keyboards and layouts, is accessible, and holds its performance budget.
**Requirements:** CUS-01…CUS-03, ENG-02, ENG-03, ENG-06, MOD-01…MOD-04, A11Y-01, A11Y-02, LOC-01, MOB-01, OPS-07.
**Depends on:** M1 (engine), design foundation (§4), content (§6, at least starter content).
**Skills to load:** `typing-caret-rendering`, `typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui`, `typing-e2e-testing`.

### 7.1 Decisions
1. **Rendering:** only the visible window of text (about three lines plus a buffer) is on the page; characters are individual elements carrying a state attribute; the caret is one separate element.
2. **State flow:** the engine holds typing state outside the UI framework; the UI reads it through narrow subscriptions and updates character states and the caret through direct, batched updates. **No UI state updates per keystroke.**
3. **Caret movement:** position from cached character offsets; moved using transform-only movement; optional short smoothing with a snap-if-behind rule.
4. **Line advance:** instant or a very short slide of the text container; never blocks input.
5. **Settings storage:** local-first; namespaced and versioned; sync later.
6. **Focus mode:** header and other chrome fade while typing; return on finish or Esc.
7. **Where mode choices live:** a compact mode bar above the text; advanced options in a popover reachable by keyboard.

### 7.2 Steps

#### M2-01 App shell and routing
1. Define routes for MVP: test (home), results, replay, practice hub, learn, code hub, dashboard, profile, settings, account, how-we-calculate, help, legal, about/roadmap/changelog/feedback. Build placeholder pages for those not yet ready with proper empty states.
2. **Layout:** header (logo, primary nav, account), main region, footer (links). The header fades in focus mode.
3. **Error boundaries:** a friendly error page that never shows raw error text; report to error tracking (scrubbed).
4. **Special pages:** implement 404, generic error, offline banner, and maintenance from the design foundation.
5. **Titles and metadata:** unique titles and descriptions per page; social preview basics.
**Check:** every route renders; keyboard navigation works; special pages exist and follow tokens.

#### M2-02 The typing surface (in slices)
**Slice A — static text.** Render a passage with correct fonts and wrapping; no interaction. Verify at 200% zoom and 320 px width.
**Slice B — windowing.** Compute lines once per text and width; render only the window. Decide the wrapping strategy so the caret's line changes are predictable.
**Slice C — character states.** Pending, correct, incorrect, extra, missed with tokens and non-color cues. Verify contrast in all themes.
**Slice D — caret.** One element positioned from cached offsets; blinking only when idle (respect reduced motion); a solid caret while typing.
**Slice E — engine connection.** Attach the input adapter; feed events to the engine; apply state changes to characters and the caret through batched updates each frame.
**Slice F — line reveal.** When the caret reaches the last visible line, advance the window with an instant or very short translate; ensure the offsets cache for the new window is ready before display.
**Slice G — resize/zoom/font changes.** Recompute offsets on resize, zoom, font load, and font-setting changes; keep the caret on the right character; never lose typed progress.
**Slice H — long/odd content.** Handle very long words, no-break sequences (URLs, hashes), emoji and combining characters, and right-to-left content (note as unsupported or limited for MVP).
**Slice I — performance pass.** Profile with CPU throttling; remove any per-keystroke layout reads and allocation; confirm no long tasks.
**Check for each slice:** the checklist in `typing-caret-rendering` plus a short manual test description; keep a running "known issues" list.

#### M2-03 Mode bar and test setup
1. Modes for MVP: **Classic** (time, words, quote, custom), **Real-World Prose**, **Numbers & Symbols**, **Code** (available once M5 provides content; hide until then), and **Baseline** entries.
2. Options: durations (15/30/60/120/custom), word counts, difficulty band display, punctuation/number toggles for Classic.
3. **Keyboard operation:** every control reachable by keyboard; a documented shortcut for restart (Tab) and opening options; shortcuts inactive while typing except restart/escape.
4. **Persistence:** remember last choices per content type.
5. **Default:** 60-second Real-World Prose test with Classic one click away.
**Check:** a keyboard-only user can change mode and duration and start a test without a mouse.

#### M2-04 Live stats and finish transition
1. Live stats are optional (default off in focus mode); when on, update sparingly (a few times per second) without affecting typing latency.
2. **Finish:** on end condition, freeze the surface, compute results via the engine, and transition to the results view **without a modal**.
3. Provide a **"restart" and "next test"** action that works by keyboard.
**Check:** latency harness shows no regression with live stats on.

#### M2-05 Settings
1. **Categories:** Typing (error mode, focus mode, live stats, caret style), Appearance (theme, font, size, ligatures), Layout & Keyboard (layout, finger map display), Accessibility (reduced motion, no-timer practice, high contrast, dyslexia-friendly font, text spacing), Code (auto-indent, auto-pair), Data & privacy (consent, export, delete), Engagement (gamification level, notifications later).
2. **Behavior:** changes apply immediately; settings persist locally; provide "reset to defaults."
3. **Validation:** ignore unknown/corrupt stored settings gracefully.
4. **Explanations:** every setting has a one-line description; risky settings (must-correct, stop-on-error) explain their effect on metrics.
**Check:** settings survive reload; corrupt settings do not crash the page.

#### M2-06 Layout and keyboard support
1. **Layouts:** QWERTY US/UK, Dvorak, Colemak/Colemak-DH, AZERTY, QWERTZ. For each define: physical key positions, produced characters (with Shift/AltGr), and finger assignments.
2. **Layout selection UX:** first-run prompt with a best guess and an easy override; explain why it matters (finger maps, symbol reach).
3. **Detection:** use browser hints cautiously; never rely on detection alone.
4. **OS quirks:** Mac vs Windows modifiers; ANSI vs ISO differences; keyboards with unusual keys; document known limits.
5. **Hardware test:** type a standard passage on each layout using a real keyboard (or a keyboard emulation setting) and compare with expected characters.
**Check:** the layout test sheet is filled for all five layouts on at least two operating systems.

#### M2-07 Motion implementation
1. Implement the small set of MVP motions from the microinteraction catalog: caret movement, restart fade, results reveal, toast, route fade.
2. Use the motion tokens; add no other motion.
3. Implement all three reduced-motion layers (OS preference in styles and scripts, the animation library's setting, and an in-app toggle).
4. **Verify** with the emulation tools in each browser; verify that feedback still exists under reduced motion (short fades).
**Check:** `/anim-audit` passes; the reduced-motion checklist is complete.

#### M2-08 Accessibility pass
1. **Structure:** landmarks, headings, labels, focus order, skip link.
2. **Typing surface:** accessible name and instructions; results announced once at finish through a polite live region; no per-keystroke announcements.
3. **Focus:** visible focus ring on every interactive element; Esc leaves the typing surface; nothing traps focus.
4. **Keyboard:** all functions reachable; shortcuts documented on the help page.
5. **Color and shape:** all typing states have non-color cues.
6. **Targets and zoom:** ≥ 24×24 px targets; layouts work at 200% zoom and 320 px width.
7. **No-timer practice** mode implemented.
8. **Screen-reader script:** with a screen reader on each major OS, complete these tasks: reach the test, start it, finish it, hear results, change theme, open settings.
9. **Automated checks:** run the accessibility scanner in CI on all pages and themes.
**Check:** `/a11y` reports no blockers; manual screen-reader script passes; scanner clean.

#### M2-09 Performance pass
1. **Latency harness:** in CI, type 300+ keystrokes; record input-to-paint per keystroke; compute median and 95th percentile; fail above the budget on the reference runner.
2. **Bundle:** measure the test page's JavaScript and CSS; keep under budget; lazy-load anything not needed for the test.
3. **Long tasks:** capture traces and fail on tasks above ~50 ms during typing.
4. **Throttled tests:** repeat with CPU throttling and slow network.
5. **Fixes list:** prioritize by impact; re-run until under budget.
6. **Real-user monitoring:** add a lightweight collector for LCP, INP, CLS per page (no typed content).
**Check:** budgets pass in CI; a baseline report is stored for regression comparison.

#### M2-10 Offline-safe basics
1. Bundle a small starter set of content so the typing page works if content fetch fails.
2. Detect offline status and show a small banner; results queue locally (full sync in M3).
3. Verify the core test runs with the network disabled.
**Check:** turning off the network mid-session does not break the test.

#### M2-11 Custom text mode
1. Allow pasting text into a local field (not the typing surface); validate length, characters, and remove unsupported characters; show a preview.
2. Store locally; never upload by default.
3. Apply the same difficulty scoring locally if possible; otherwise show "difficulty unknown."
**Check:** oversized or unusual input is handled gracefully with clear messages.

#### M2-12 Help and shortcuts page
Document shortcuts, modes, error modes, layouts, and accessibility features in plain language.

#### M2-13 Cross-browser and hardware matrix
1. Run the manual matrix from §5.4 on real hardware.
2. Log bugs with browser, OS, layout, and steps.
3. Triage: blockers (input lost, wrong characters), majors (layout errors), minors.
4. Fix blockers and majors before exit.
**Check:** matrix sheet complete; no blockers.

#### M2-14 Review
Run `/spec-check ENG-02 ENG-03 ENG-06 CUS-01 A11Y-01`, `/anim-audit`, `/a11y`, `/perf`, and `@ui-reviewer`.
**M2 Done when:** latency and bundle budgets pass in CI; axe clean; keyboard-only flow works; reduced motion verified; five layouts verified; special pages exist; matrix has no blockers.

### 7.3 Edge cases (typing surface)
- Text changes width while typing (window resize): recompute; keep progress.
- Fonts finish loading mid-test: recompute offsets; avoid layout shift.
- User zooms mid-test: recompute; caret stays correct.
- Browser autofill or extensions inject text: ignore or invalidate in verified mode.
- Users type before the page is ready: buffer or ignore with a clear rule.
- Multiple tabs: warn if a second tab starts a verified session.
- Very fast typing bursts: ensure no dropped events.
- Text with trailing spaces or double spaces: follow the text model rules.

### 7.4 OpenCode instructions for M2
- "Load typing-caret-rendering, typing-design-tokens, typing-motion-tokens. Plan the TypingSurface in slices A–I from the implementation guide. Do not write code until I approve."
- "Build slice C and D only. Add the latency harness. Then run /perf and /anim-audit."
- "Run @a11y-auditor on the typing page and produce a table; propose fixes but do not apply."

### 7.5 Events (allowlist; no content)
`test_started`, `test_restarted`, `test_paused`, `test_finished`, `setting_changed`, `layout_changed`, `offline_detected`, `queue_flushed`. Properties limited to mode, content type, duration bucket, layout, difficulty band, and counts.

---

## 8. M3 — Results, Storage, Backend, Integrity, Privacy (Weeks 5–6)

### 8.0 Goal and scope
**Goal:** verified results end to end, guest-first local storage, optional accounts, privacy controls that really work, and a minimal but safe backend.
**Requirements:** ANA-01, ANA-08, ENG-07, ENG-08, USR-01…USR-04, INT-01…INT-04, ADM-01, OPS-02, OPS-05, OPS-06, OPS-13, NFR-08, NFR-09.
**Skills:** `integrity-anti-cheat`, `keystroke-privacy`, MongoDB skills (when installed), `typing-e2e-testing`.
**Depends on:** M1, M2.

### 8.1 Backend decisions
1. **API style:** simple resource-oriented JSON API with strict input validation (shared schemas). Version the API path.
2. **Validation:** validate every request body/query against shared schemas; reject unknown fields; enforce size limits.
3. **Auth:** managed provider issues tokens; the API verifies them and maps to internal user IDs. Guests use anonymous session tokens with lower limits.
4. **Idempotency:** result submission carries a client-generated key; duplicates return the original response.
5. **Errors:** consistent format with a code, a human message, and a request identifier; never leak internals.
6. **Rate limits:** per IP, per account, per device; tighter for anonymous.
7. **Time:** the server is the source of truth for session start/expiry.
8. **Logging:** structured logs with request IDs; never log bodies with logs/text.
9. **No Redis/queues yet:** scheduled jobs (cron-style) handle retention and aggregates.

### 8.2 Steps

#### M3-01 Data model
1. Define collections (see spec §9.3): users, sessions, results, keystroke_logs, key_stats, token_stats (later), progress, content, experiments, model_versions, feedback.
2. For each: fields, types, required/optional, relationships, and **indexes** (query patterns: by user and date; by session; by content; by TTL).
3. **TTL fields** on logs and sessions.
4. **IDs:** use non-guessable identifiers; never expose internal sequential IDs.
5. **Guest identity:** anonymous user records created lazily; merge on sign-in.
6. **Schema versioning** and a migration procedure (document how to add fields safely).
7. Estimate storage per 1,000 users and per million tests; verify against budget.
**Check:** a data dictionary (fields, meaning, retention, sensitivity) reviewed against `keystroke-privacy`.

#### M3-02 Authentication and accounts
1. **Provider setup:** enable email (with verification), Google, GitHub. Configure redirect URLs per environment.
2. **Flows:** sign up, sign in, sign out, password reset (if email/password), email verification, account linking (same email across providers), and deletion.
3. **Sessions:** short-lived access tokens with refresh; secure cookie or token storage decisions documented; log out everywhere option.
4. **Edge cases:** unverified email; provider account removed; conflicting emails; user changes email; expired tokens mid-test (keep local result and retry).
5. **Guest → account migration:** on first sign-in, offer to import local history; deduplicate by result IDs; handle partial failures; never lose local data until the server confirms.
6. **Account deletion:** immediate deactivation, scheduled purge, confirmation email, and a clear statement of what is deleted (results, stats, logs, settings).
**Check:** all flows tested with new and returning users; migration tested with 100 local results; deletion verified in the database.

#### M3-03 Signed sessions
1. **Create session:** `POST` a session request with mode and settings; server picks text/seed (or accepts a client-chosen custom text with a "custom" flag), stores a session record with nonce, text hash, expiry (short TTL, e.g., a few minutes past the test duration), and returns it.
2. **Single use:** mark used on submission; reject reuse.
3. **Anonymous sessions** allowed but flagged lower trust; **custom text** sessions are never verified for boards.
4. **Client behavior:** the client requests a session when the user starts or when the page loads; if the server is unreachable, the test still runs locally in "unverified" mode and queues.
**Check:** tests for expired, reused, mismatched-hash, and missing sessions.

#### M3-04 Result submission and verification
**Pipeline (server):**
1. **Authenticate/authorize** (guest allowed with limits).
2. **Validate** shape and size; reject oversized logs.
3. **Session check:** exists, unexpired, unused, matches the text hash and settings.
4. **Decode the log** and re-run the shared engine to recompute all metrics.
5. **Compare** recomputed metrics to the client's summary; tolerate tiny differences; reject or downgrade larger mismatches.
6. **Plausibility checks (flags, not bans):** physical key-rate ceilings; minimum inter-key intervals; impossible rollover; zero-variance timing; perfectly constant intervals; improbable accuracy at extreme speed; session duration mismatches. Assign a **risk score** and store flags.
7. **Store** the result summary; store the log only if policy says so (verified/ranked/flagged, or within retention for debugging); otherwise discard after computing aggregates.
8. **Update aggregates** (key/bigram stats) for the user.
9. **Respond** with the verified summary, difficulty band, and coaching data (weak spots) so the client shows server-verified numbers.
10. **Failure handling:** on transient errors the client keeps the result in a local queue and retries with backoff, using the idempotency key.
**Check:** forged logs, replayed sessions, impossible timings, and mismatched metrics are rejected or flagged in tests; a fast human fixture is not flagged.
**Rules:** never auto-ban at MVP; never expose thresholds to the client; results marked "unverified" are still shown to the user privately.

#### M3-05 Results page
1. **Data needed:** headline metrics, difficulty band, per-second series, error markers, weak spots (top three), comparisons (PB, rolling median for this content type), replay link.
2. **Layout order:** headline → graph → "What to fix" with Practice button → comparisons → details → save prompt (guests only).
3. **Weak spots at MVP:** derive from this test plus the user's aggregates; if data is too thin, say so plainly and offer a baseline.
4. **States:** loading skeleton; verified vs unverified label; offline note; error with retry.
5. **Comparisons:** show a noise band; avoid over-reading one test.
6. **Motion:** reveal with stagger; reduced-motion fallback.
7. **Accessibility:** results announced on arrival; graph has a text summary and a table alternative.
**Check:** numbers on the page match the server response; accessibility scan clean; empty states clear.

#### M3-06 Local-first storage
1. **What's stored locally:** settings, guest history, queued results, seen-content identifiers, local goals.
2. **Storage choice and limits:** choose a persistent local store; set caps (for example, keep the last N results and all aggregates); handle quota errors.
3. **Corruption handling:** validate on read; discard invalid entries; never crash.
4. **Versioning:** version the local schema; migrate on load.
5. **Privacy:** never store typed text or full logs locally beyond what's needed for replay of recent tests (set a small cap).
6. **Clear data:** a button that wipes local data.
**Check:** simulated corruption and quota errors are handled.

#### M3-07 History and profile (basic)
1. History list by content type with rolling medians and personal bests.
2. Profile page: stats, activity calendar, privacy toggles (public/private/hidden from boards).
3. Empty states with one clear action.
**Check:** history matches stored results; privacy toggles persist.

#### M3-08 Replay page
1. Replay from the log for recent tests (if retained locally or on the server); speed control; error markers.
2. If the log is no longer available, show a friendly note.
3. Accessibility: keyboard controls; text summary.
**Check:** replay reproduces the final text for fixtures and recent real tests.

#### M3-09 Privacy implementation
1. **Data map:** document each data type, purpose, storage location, retention, and access.
2. **Consent screens:** research/calibration opt-in (off by default); composition text opt-in (later); explain in plain language; allow withdrawal.
3. **Retention job:** a scheduled task deletes expired raw logs; test with a fake clock; log counts (not contents).
4. **Export:** generate CSV/JSON of the user's results and settings; deliver securely; test with a large account.
5. **Delete:** remove personal data, results, logs, stats; verify with an audit query; confirm irreversible after the grace period.
6. **Analytics enforcement:** a central function that only allows allowlisted events/properties; tests fail on unknown properties.
7. **Error tracking scrubbers:** confirm typed text and logs never appear; run a canary test on every deploy.
8. **Admin access:** role-based; every access to user data logged; no bulk export.
9. **Policies:** draft Privacy Policy and Terms from the data map (get legal review before launch).
**Check:** privacy checklist in `keystroke-privacy` all green; export and delete e2e tests pass.

#### M3-10 Admin console (lite)
1. **Roles:** admin, reviewer (content), support (read-limited).
2. **Features:** content CRUD with license fields; feature flags; user lookup (minimal fields); result review queue for flags; feedback inbox.
3. **Audit log:** who did what and when.
4. **Safety:** no viewing typed content (there is none); no raw logs by default; break-glass access documented.
**Check:** actions are audited; roles enforced.

#### M3-11 Rate limiting and abuse controls
1. Set limits per endpoint and identity type; return clear "retry later" responses.
2. Add a lightweight bot-mitigation fallback only on anomalies; never in the normal typing flow.
3. Alert on spikes.
**Check:** burst tests trigger limits; legitimate fast users are not blocked.

#### M3-12 API observability
1. Dashboards: request rate, latency percentiles, error rate, verification rejections, flags by type.
2. Alerts: high error rate, elevated rejections, database latency, job failures.
3. Health endpoint and uptime monitor.
**Check:** a simulated failure triggers an alert.

#### M3-13 Security review (use §8.10 checklist)
Run `@security-auditor` and manual checks; fix findings by severity.

#### M3-14 Backup and load checks
1. Configure automated backups; perform a **restore test** to a fresh database.
2. Load test the result endpoint at 10× expected MVP traffic; check latency and errors.
**Check:** restore works; load results recorded.

#### M3-15 Review
Run `/spec-check INT-01 INT-02 INT-03 USR-04 ANA-08` and `@security-auditor`.
**M3 Done when:** verified results flow works for guests and accounts; forged/replayed logs are rejected or flagged; results page is accurate and accessible; export/delete tested; retention job tested; admin lite works with audit logs; security review completed; backups restored once.

### 8.10 Security review checklist (use in every PR touching the API)
- [ ] All inputs validated with shared schemas; size limits enforced
- [ ] Authentication and authorization checks on every non-public route
- [ ] Rate limits applied; anonymous limits stricter
- [ ] No sensitive data in logs, errors, analytics, or URLs
- [ ] Session nonce single-use and expiring
- [ ] Server recompute is authoritative
- [ ] Secrets only in environment/secret store; rotated on exposure
- [ ] Security headers and content-security policy correct
- [ ] Dependencies audited; licenses checked
- [ ] Admin actions audited; least privilege
- [ ] Retention, export, and deletion tested
- [ ] Content sanitized for display; no code execution paths

### 8.11 Edge cases and failure modes (backend)
- Client clock wrong: irrelevant, since the server validates using its own times and relative timestamps.
- Duplicate submission after network drop: idempotency returns the same result.
- Expired session because the user paused: allow a fresh session; keep the local result labeled unverified.
- Partial upload: reject; client retries.
- Database outage: API returns a clear error; client queues; no data loss.
- Timezone/DST: store UTC; display locally.
- Very old client version: version check; prompt to refresh.

### 8.12 OpenCode instructions for M3
- "Load integrity-anti-cheat and keystroke-privacy. Read only INT-01…INT-04 and USR-04. Propose the submission pipeline with failure modes and tests; no code until approved."
- "Implement the retention job with tests using a fake clock."
- "Run @security-auditor on the API and produce a severity-ordered table."
- "Write e2e tests for: guest test → result → sign in → migration; forged submission rejected; export; delete."

### 8.13 Events (allowlist)
`result_submitted`, `result_queued`, `result_rejected`, `signup_started`, `signin_completed`, `export_requested`, `account_deleted`, `consent_changed`, `weakspots_viewed`, `replay_opened`, `feedback_submitted`. Properties: counts, durations, modes, verified flag; never content.

---

## 9. M4 — Learning Engine, Analytics, Baseline, Efficacy (Weeks 7–9)

### 9.0 Goal and scope
**Goal:** turn raw typing data into a diagnosis, targeted practice, and visible, honest progress, and start measuring whether it works.
**Requirements:** LRN-01…LRN-06, MST-01…MST-06, ANA-02…ANA-09, CNT-03, RET-01, RET-03, RET-05…RET-08, RET-10, RET-20.
**Skills:** `typing-metrics-spec`, `typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui`, `keystroke-privacy`, MongoDB skills.
**Depends on:** M1 (statistics extraction), M3 (results pipeline), content selector (§6.6).
**This is the product's heart.** Take extra time on the weakness model and the drill loop, and test them with real people early.

### 9.1 Design decisions (write them down first)

**D-M4-1 What counts as an "item."** Items are: individual keys (including Shift-required characters), **transitions** (adjacent pairs), frequent trigrams, and (programmer track, M5) token classes and symbols. Keep them separate by **content type** (prose, code, numbers, composition) so harder content doesn't distort baselines.

**D-M4-2 How to define "weak."** Combine two signals per item:
1. **Relative slowness:** the user's typical time for this item compared with their own typical time for comparable items (compare to *yourself*, not to a population).
2. **Error rate:** mistakes on this item (with corrections counted), adjusted for how often the item appears.
Combine them into a **severity** score. Then estimate **expected benefit** by weighting severity by how frequently the item appears in the user's content mix. **[proposal]** All weights are starting values to calibrate.

**D-M4-3 Confidence and sample size.** Every item has a sample count. Do not rank items below a minimum sample; show low-confidence items as "watching." Shrink extreme estimates toward the user's average when data is thin.

**D-M4-4 Recency.** Use a decay so recent practice matters more than old data (choose a half-life in days; **[proposal]** two to three weeks), and keep a longer-window view for trends.

**D-M4-5 Cold start.** With little data, do not fake a diagnosis. Use a **coverage-designed first test** (a passage chosen to sample many common transitions and characters) so the first result already has enough breadth.

**D-M4-6 Storage.** Store compact aggregates per user and content type: counts, sums, and simple distribution summaries per item. Never store typed text. Cap the number of items tracked (for example, keys and the most frequent few hundred transitions) and prune rarely used ones.

**D-M4-7 Explainability.** Every weakness shown must be explained in plain language: what it is, why it's flagged, and how many samples support it.

### 9.2 Steps

#### M4-01 Statistics model and aggregation
1. Extend the result-processing step (M3-04) to update aggregates after each verified/accepted result: per key (attempts, errors, time-to-press summary), per transition (attempts, errors, interval summary, hand/finger relation), per trigram (frequent only).
2. **Use running summaries** that can be updated incrementally (counts, means, spread) plus a small reservoir or histogram for medians; document the method.
3. **Windows:** keep an all-time aggregate and a recency-weighted aggregate.
4. **Per content type** aggregates as separate records.
5. **Recompute job:** provide a job to rebuild aggregates from retained logs (used after formula changes or bugs).
6. **Privacy check:** aggregates contain only item identifiers and numbers.
**Check:** feeding 1,000 fixture results yields aggregates that match an independent calculation; storage per user stays under the cap.

#### M4-02 Weakness profile
1. **Inputs:** aggregates, layout (for hand/finger relations), content mix, goal.
2. **Compute severity** per item (slowness and error signals, combined; confidence-adjusted).
3. **Rank** by expected benefit; produce sections: **top weak keys**, **top weak transitions**, **top symbol confusions** (programmer track later), **watching** list.
4. **Thresholds:** define when a profile is "ready" (minimum keystrokes overall and per item).
5. **Refresh:** update after each result; keep a snapshot per week for progress comparisons.
6. **Explanations:** generate one-sentence reasons ("You take about 40% longer on `t→h` than on similar pairs; 26 samples").
7. **Calibrate:** in beta, compare the profile's top items against user-reported struggles and drill outcomes; adjust weights by evidence.
**Check:** on synthetic users with known weak items, the profile ranks them highly; on thin data it says so.

#### M4-03 Keyboard heatmap and typo arrows
1. **Data needed:** per-key speed and error metrics (per content type), the layout's key positions and finger assignments, confusion pairs (intended → typed).
2. **Views:** speed (slower = warmer), errors (more = warmer), per-hand and per-finger summaries, and **typo arrows** from intended keys to typed keys.
3. **Rendering approach:** draw the keyboard as a vector graphic sized to the container; color from the theme's heatmap scale; add labels (not color-only) for top items.
4. **Layers:** Shift and AltGr layers as switchable views for symbol characters.
5. **Interaction:** hover/focus shows a tooltip with counts and explanation; keyboard navigable.
6. **Accessibility:** a **table alternative** listing keys with values; a text summary of the top three insights; color-blind-safe scale.
7. **States:** empty (not enough data), loading, error.
8. **Performance:** render once per data change; avoid re-rendering on unrelated updates.
**Check:** accessibility scan clean; table and graphic agree; works for all five layouts.

#### M4-04 Transition table
1. Columns: transition, samples, typical interval, relative slowness, error rate, hand relation, trend.
2. Filters: content type, same-hand/alternate-hand, minimum samples.
3. Sorting by expected benefit by default.
4. Explanatory header and links to "How we calculate."
**Check:** sorting/filters correct on fixtures; readable on a phone.

#### M4-05 Learn-from-errors panel
1. After each test, list **top confusions** (intended vs typed) and the most frequent error types (substitution, omission, insertion, transposition).
2. Distinguish **adjacent-key errors** (physically neighboring keys on the user's layout) from others.
3. Provide a **"Practice these"** button that starts a drill from the confusions.
4. Keep copy calm: describe patterns, not failures.
**Check:** panel matches error counts from the metrics library; the button starts a drill in ≤ 2 clicks.

#### M4-06 Drill engine (the loop)
**Definition:** a drill is a short set of practice items chosen from the weakness profile, run under specific scoring rules, and summarized with what changed.

**Steps:**
1. **Inputs:** weakness profile, content type, difficulty band target, block type (focus or push), time budget.
2. **Selection:** call the weakness-targeted selector (§6.6) for the block.
3. **Block rules:**
   - **Focus block:** shorter sets (30–60 seconds), accuracy floor enforced (must-correct or stop-on-error variants depending on the item), immediate error review after each set.
   - **Push block:** short bursts (10–15 seconds), relaxed accuracy floor (still bounded), rewards speed improvement over the user's recent burst median.
4. **Difficulty targeting (MST-04):** see M4-07.
5. **Feedback (MST-05):** after each set show three lines: what improved, what regressed, next action.
6. **Mastery rule (MST-06):** an item is "improving" when its recent trend beats baseline over varied text; an item is "mastered" when the best 3 of the last 5 attempts on varied text meet speed **and** accuracy targets in context. The user can still keep an item in rotation.
7. **User control:** pick focus items, skip an item, change difficulty, change block length.
8. **Completion:** a drill ends with a summary: items practiced, deltas, personal records, and the option to retest.
9. **Edge cases:**
   - No clear weaknesses: offer variety (push blocks, new content type) rather than inventing weaknesses.
   - Too many weaknesses: focus on the top few; queue the rest.
   - User quits mid-drill: save partial progress; resume later.
   - Repeated content: the selector avoids repeats.
10. **Accessibility:** no-timer variants; text summaries; keyboard flow; reduced-motion transitions.
**Check:** end-to-end tests: from a result with weak spots → drill → retest → delta shown; no repeats within a week; user controls work.

#### M4-07 Difficulty targeting
1. **Measure:** track accuracy on *targeted items* within a drill set (not just overall accuracy).
2. **Band:** start around ~90% on targeted items **[H]**; adapt within a range; if above range for several sets, raise difficulty (harder items, faster target, longer sets); if below, lower difficulty and say so.
3. **Safety valve:** two consecutive sets below the floor → reduce difficulty and explain ("Let's steady this pair").
4. **User control:** "Gentler / Sharper" nudges the band.
5. **Logging for learning:** record difficulty parameters per set (numbers only) for later analysis of what works.
6. **Do not** apply the band to headline test accuracy expectations.
**Check:** simulation with synthetic users shows the band converges without oscillating wildly; safety valve triggers correctly.

#### M4-08 Placement and baseline tests
1. **General baseline (about 3 minutes):** segments — a short easy warm-up (prose), a Real-World Prose test, a numbers/symbols segment, and (optionally) a short composition-free copy segment. Measure net WPM, accuracy, and per-content-type baselines.
2. **Placement logic:** map results to a starting path (beginner course vs adaptive practice); allow **skip-ahead** and manual override.
3. **Storage:** results tagged as baseline with the matched-difficulty text set used.
4. **Retest scheduling:** offer a day-30 retest with **different text of the same difficulty band**; remind gently (V1 notifications later).
5. **Presentation:** a profile card: strengths, top three fixes, recommended plan, and a plain-language explanation of what was measured.
6. **Programmer baseline** is added in M6.
**Check:** baseline can be taken once and retaken; retest uses matched difficulty; results stored separately from practice tests.

#### M4-09 Goals and ETA
1. **Goal presets:** target net WPM in a content type, fewer symbol errors (programmers), words per day (writers, later), consistency, accuracy.
2. **ETA:** fit a trend to recent rolling medians for the goal's content type; provide a **range** ("about 6–10 weeks at your current pace"), not a single date; hide ETA when data is insufficient; say when the trend is flat.
3. **Adjust goals:** allow edits; keep history.
4. **Copy:** never promise outcomes; use "at your current pace."
**Check:** ETA behaves sensibly on synthetic trends (rising, flat, noisy); hidden when data is thin.

#### M4-10 Trends and noise band
1. **Rolling median (last 5)** per content type, plus 7- and 30-day views.
2. **Noise band:** show the typical variation so a single low or high test doesn't mislead.
3. **PB tracking:** keep personal bests per content type; do not compare across types.
4. **Charts:** clear axes, no truncated baselines that exaggerate change; table alternative; summary sentence.
**Check:** charts match the data; accessibility scan clean.

#### M4-11 Session blueprint engine (MST-01)
1. **Inputs:** minutes available (5/15/30), user profile, goal, content mix, time of day (optional), recent sessions.
2. **Blocks:** warm-up, focus, push, real-world, retest; durations from the spec's blueprint; **5-minute minimum** = focus + retest.
3. **Assembly rules:** never start with a hard block; alternate accuracy and push; keep the same content type for the retest as the focus items; include a recall block if the programmer track is active (M6).
4. **Adaptivity:** if the user is frustrated (error spike) shorten the focus block and switch to warm-up-style material; if bored (very high accuracy), raise difficulty.
5. **Interruptions:** persist progress; allow resume.
6. **Presentation:** show the plan up front and let users reorder or skip blocks.
**Check:** blueprint outputs sensible plans for 20 synthetic profiles; 5-minute plan is coherent.

#### M4-12 First-session win flow (RET-01)
1. **Step 1:** the first test for a new visitor uses a **coverage-designed passage** (60 seconds) in Real-World Prose.
2. **Step 2:** results show "Your top 3 weak spots" **only if** data suffices; otherwise show one honest line and offer a 60–90 second coverage drill to collect more data.
3. **Step 3:** a **2-minute targeted drill** built from those spots.
4. **Step 4:** a **retest** in the same content type; show the delta on the targeted items (not just overall WPM, which is noisy).
5. **Step 5:** only now show the dismissible **Save progress** prompt; then goal presets and the if-then plan (M-retention chapter).
6. **Timing target [proposal]:** first insight within about 60–90 seconds of the first keystroke; full win within ~5 minutes.
7. **Measure:** time to first insight, drill completion, retest completion, and whether the delta was positive (report honestly, including flat/negative outcomes).
**Check:** 5 unaided participants complete the flow in R0-style usability tests; instrumentation logs each step.

#### M4-13 Efficacy instrumentation (ANA-09)
1. **Baseline/retest pairing:** store each user's baseline and day-30 retest for the same content type and difficulty band.
2. **Holdout (opt-in):** ask users to join a "help us test what works" study; explain plainly; randomly assign to **adaptive drills** vs **matched random text drills**, or to **delayed access**. Store the arm.
3. **Consent and ethics:** explicit opt-in, ability to withdraw, no penalty; do not withhold safety-relevant features; keep arms non-harmful (both arms get useful practice).
4. **Outcomes:** net WPM and accuracy per content type, symbol error rate (programmers), targeted weakness change, practice frequency.
5. **Analysis plan (written before looking at data):** choose the primary outcome, minimum sample, follow-up window, how to handle dropouts, and what counts as success.
6. **Cautions:** regression to the mean (people who test low tend to improve), novelty effects, self-selection; use medians and intervals; report null results.
7. **Publishing:** aggregated results with caveats ("not a clinical trial").
**Check:** assignments are random and stable; outcomes are computed from stored data; a mock analysis runs on synthetic data.

#### M4-14 Minimal experiment framework
1. **Feature flags** with stable per-user assignment.
2. **Exposure logging:** record when a user actually experienced a variant.
3. **Guardrail metrics** attached to each experiment (opt-outs, complaints, drop-off).
4. **Template:** hypothesis, arms, primary metric, guardrails, sample-size estimate, stop rules.
5. **Analysis rules:** run at least one full weekly cycle; avoid peeking-based stopping; correct for multiple comparisons; document decisions.
**Check:** a test experiment assigns users, logs exposures, and produces a readout.

#### M4-15 Internal analytics dashboards
1. **Funnel:** first test → weak spots viewed → drill started → drill completed → retest → save progress.
2. **Retention:** D1/D7/D30 cohorts (returning to *practice*, not just page views).
3. **Health:** practice days per week, plan completion, notification opt-outs (V1), gamification opt-outs.
4. **Efficacy:** baseline vs retest, holdout comparisons.
5. **Data hygiene:** no typed content; aggregated views; access limited.
**Check:** dashboards populated from a synthetic cohort.

#### M4-16 Review
Run `/spec-check LRN-01 LRN-02 LRN-03 MST-01 MST-04 ANA-02 ANA-03 ANA-09`; `/a11y` on heatmap and results; `/perf`.
**M4 Done when:** weakness profile and drills work end to end; heatmap/table/typo arrows accessible; baseline and retest flows work; ETA behaves sensibly; efficacy instrumentation and experiment framework operate; first-session win flow tested with users; dashboards live.

### 9.3 Progressive unlocking (LRN-03) — implementation notes
1. **Tracks:** letters, capitals, punctuation, digits, symbols are separate tracks with separate averages.
2. **Unlock rule:** introduce at most two new items at once; unlock when proficiency thresholds are met **and** accuracy holds in context (see anti-gaming rules in §6.7 of the playbook).
3. **User control:** allow enabling a track early or postponing it.
4. **Display:** show what's unlocked and what's next, without gates that trap the user on one item.
5. **Baseline protection:** each track has its own baseline so adding punctuation doesn't "wreck" the headline average.

### 9.4 Testing plan (M4)
| Layer | What |
|---|---|
| Unit | Aggregation math; weakness scoring on synthetic users; ETA behaviors; band adaptation |
| Integration | Result → aggregates → profile → drill → retest pipeline |
| E2E | First-session flow; baseline; goal setting; heatmap accessibility |
| Simulation | Synthetic users with known weaknesses and learning curves to stress the drill loop |
| User testing | 5–8 people run the loop; observe comprehension and trust |
| Data quality | Compare aggregates across recomputation runs |

### 9.5 Edge cases and failure modes
- **Users who type differently on different days:** recency weights and noise bands prevent overreaction.
- **Left-handed or nonstandard fingering:** allow editing the finger map; make hand/finger relations optional.
- **Layout changes:** keep separate aggregates per layout.
- **Very fast typists:** ensure timers and thresholds don't cap them; check outlier handling.
- **Very slow or motor-impaired typists:** relaxed thresholds, no-timer practice, gentler bands.
- **Sparse data for rare characters:** show "watching," not "weak."
- **Shared computers:** guest data is local; warn before saving on shared devices.

### 9.6 OpenCode instructions for M4
- "Load typing-metrics-spec and keystroke-privacy. Read implementation-guide §9.1–9.2. Propose the aggregation schema and the weakness scoring approach with test scenarios; no code yet."
- "Build the aggregation update step with tests using the fixtures; then the weakness profile with synthetic users."
- "Build the heatmap with a table alternative. Load a11y-typing-ui and typing-design-tokens. Run /a11y afterwards."
- "Implement the drill lifecycle and difficulty targeting with simulation tests."
- "Implement baseline/retest pairing and the holdout assignment; write the analysis plan document first."

### 9.7 Events (allowlist)
`baseline_started`, `baseline_completed`, `drill_started`, `drill_completed`, `retest_started`, `goal_set`, `plan_opened`, `experiment_exposed` (experiment ID and arm only). Numbers only; never content.

---

# PART III — PROGRAMMER TRACK AND RETENTION

## 10. M5–M6 — Programmer Track (Weeks 9–12)

### 10.0 Goal and scope
**Goal:** a language-agnostic training track that builds fluency with symbols, brackets, strings, numbers, number systems, IDs, and naming styles, measured by token-class analytics, delivered as Levels 1–30 with a baseline test and honest progress views.
**Requirements:** PRG-01…PRG-18, CNT-04, CNT-05, ANA-05 (token dashboard), ANA-06 (level ladder/radar/next best drill), spec §7.
**Skills:** `token-drill-generators`, `typing-caret-rendering`, `typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui`, `keystroke-privacy`.
**Depends on:** M1–M4 (engine, results pipeline, aggregates, drill loop).
**Positioning guardrail (PRG-05):** the promise is "less friction between your thoughts and your editor," not "become a better programmer" or "get hired."
**Validation gate:** confirm demand with the R0 waitlist and interviews before investing in Levels 31–60 (spec §7.8).

### 10.1 Design decisions

**D-M5-1 Tokenization approach.** Use a real grammar-based tokenizer loaded lazily per language so token boundaries are accurate across languages. Precompute token maps when content is **published** (not at typing time) and store them with the content; verify at runtime.

**D-M5-2 Token map format (in words).** For each content item store an ordered list of tokens with: start position, end position, and token class. Store the language and grammar version used. Validate that the tokens tile the text without gaps or overlaps.

**D-M5-3 Multi-character symbols ("chords").** Treat operators such as arrows and scope operators as **one token** with an internal timing sub-measure, so both whole-token and inner-key intervals can be analyzed.

**D-M5-4 Whitespace and indentation.** Indentation and newlines are their own token class. Provide two modes: **auto-indent on** (leading whitespace auto-inserted and excluded from typed counts) and **manual indentation** (typed and counted).

**D-M5-5 Auto-inserted characters.** Auto-pair and auto-indent simulations mark inserted characters as **auto** so metrics can exclude them; users can choose off / on / partial.

**D-M5-6 Surface.** Extend the same custom typing surface for multi-line code with optional syntax highlighting. **Do not embed a full editor at MVP**; a full editor component is reserved for V2 Edit Tasks.

**D-M5-7 Layout-aware symbols.** For every layout, maintain a symbol map: which key and modifiers produce each symbol, and which finger/hand types it. Use it for penalties, heatmaps, and drills.

**D-M5-8 Level engine.** A small state machine per level (locked, available, in progress, passed with 1–3 stars, decayed) plus tier-level test-out and boss levels.

**D-M5-9 Content policy.** Levels 1–6 use **seeded generators** (deterministic, synthetic). Real snippets come from permissive-license sources and go through the content pipeline.

**D-M5-10 Safety.** Snippets are display-only; never executed; sanitized everywhere.

### 10.2 The token classes (working definitions)
| # | Class | Notes for implementation |
|---|---|---|
| 1 | Brackets and pairs | Opening/closing round, square, curly, angle; track pairing depth |
| 2 | Operators | Arithmetic, comparison, logical, bitwise, assignment |
| 3 | Chords | Multi-character operators and access forms |
| 4 | Quotes, strings, escapes | Quote characters, escape sequences, interpolation markers |
| 5 | Numbers | Integers, decimals, negatives, separators, scientific |
| 6 | Number systems and IDs | Hex/binary/octal literals, colors, UUIDs, hashes, addresses, dates, versions |
| 7 | Identifiers by style | Names in snake, camel, Pascal, kebab, screaming, dotted forms |
| 8 | Keywords | Language reserved words |
| 9 | Whitespace and structure | Indentation, newlines, blocks |
| 10 | Comments and docs | Comment markers and doc strings |
| 11 | Paths, URLs, flags | Slashes, dots, dashes, protocol prefixes |
| 12 | Data and markup | JSON/YAML/HTML/SQL/regex punctuation |

**Rules for ambiguous cases:** define precedence (for example, a number inside a string is class 4 not 5); document each rule with examples; test with a labeled corpus.

### 10.3 Steps — Milestone M5 (Weeks 9–10): engine, surface, first levels

#### M5-01 Finalize the taxonomy and naming-style detection
1. Write the token-class taxonomy with precedence rules and examples for each initial language.
2. Define **naming-style detection** for identifiers (how to classify a name as snake, camel, Pascal, kebab, screaming, dotted) including edge cases (acronyms, digits, single words).
3. Create a **labeled test corpus** (a few hundred labeled tokens per language) to validate the tokenizer's mapping.
**Check:** the labeled corpus gives ≥ 98% agreement with the taxonomy on a sample; disagreements are documented.

#### M5-02 Tokenizer integration and token maps
1. **Language packs:** for each initial language decide the grammar source and license; load lazily only in programmer modes.
2. **Publish-time pipeline:** extend the content pipeline (§6.4) with a "tokenize" stage that produces the token map, validates tiling, and fails the item if the grammar reports errors (for real snippets).
3. **Fallback:** if a grammar can't load at runtime, use the stored token map; if no map exists, disable token analytics for that item and note it.
4. **Version stamps:** store grammar version; re-tokenize when grammars update.
5. **Bundle budget:** confirm lazy loading keeps the classic test page within budget (see M2-09).
**Check:** token maps exist for all published snippets and generator outputs; the main test page bundle is unchanged.

#### M5-03 Attribute keystrokes to tokens
1. **Mapping rules:** each accepted keystroke maps to the token at the caret position at that moment. Multi-key characters (accents, dead keys) map to the token they complete.
2. **Corrections:** backspaces attribute to the token being edited; record correction time separately.
3. **Auto-inserted characters:** excluded from typed counts; recorded for context.
4. **Per-token time:** first keystroke of the token to its last accepted keystroke; exclude pauses above the threshold from token speed (record separately as "hesitation").
5. **Per-class aggregates:** speed, accuracy, and error counts per class per language; **symbol-level stats** per individual symbol.
6. **Confusion pairs:** intended vs typed symbol.
7. **Storage:** update `token_stats` per user × class × language and per-symbol aggregates; no text stored.
**Check:** on labeled fixtures, per-class sums match total time; auto-inserted characters don't change typed metrics.

#### M5-04 Multi-line, code-aware typing surface (IDE-realism)
1. **Newlines and indentation:** define what the user types for Enter and indentation in each mode; when auto-indent is on, the caret jumps to the first non-whitespace position automatically and the skipped characters are marked auto.
2. **Tabs vs spaces:** a setting; the text model normalizes according to the setting; metrics count what the user actually types.
3. **Syntax highlighting:** optional overlay based on token classes; must not change layout; provide a plain view (highlighting off) for training without color cues; ensure color-only distinctions have non-color alternatives.
4. **Fonts:** monospace choices; ligatures off by default in test modes; consistent character widths.
5. **Auto-pair simulation:** off / on / partial; when on, typing an opening bracket inserts the closing bracket automatically (marked auto) and typing the closing bracket "types over" it; document behaviors and edge cases (quotes, nested pairs).
6. **Smart punctuation:** disabled in the typing surface (no smart quotes).
7. **Long lines:** horizontal scrolling inside the surface with the caret kept visible; never break the page layout.
8. **Line numbers and indent guides:** optional and subtle.
9. **Accessibility:** ensure the text remains readable at 200% zoom; provide instructions for assistive tech.
**Check:** typing a multi-line snippet in each combination of settings yields correct final text and correct typed/auto counts; manual checks with real keyboards.

#### M5-05 Layout-aware symbol maps
1. For each of the five layouts, build a table listing every symbol used by the drills: base key, required modifiers (Shift/AltGr), finger, hand.
2. Compute per-symbol properties: needs modifier? which hand types the modifier? typical reach difficulty tag.
3. **Validate on real hardware**: type each symbol on each layout and compare with the map.
4. Provide a per-layout **symbol set** so drills only use symbols the user can type.
5. Plan custom layout import for V1 (do not build now).
**Check:** signed-off verification sheet per layout; any unreachable symbol is excluded or flagged.

#### M5-06 Symbol Gym (PRG-10)
1. **Structure:** category sets (brackets, operators, punctuation, chords), each with short drills (20–40 seconds) and a "symbol of the day."
2. **Weighting:** oversample the user's weakest symbols (from per-symbol stats and confusion pairs) while keeping variety.
3. **Difficulty parameters:** length, symbol density, proportion of modifier symbols, presence of letters between symbols (abstract vs in-context).
4. **Two presentation modes:** abstract (symbol sequences) and in-context (symbols embedded in realistic short code fragments).
5. **Scoring:** symbol error rate, per-symbol speed, Symbol Fluency Ratio (later, once baseline exists).
6. **Feedback:** after a set, show the top three symbol confusions and speed changes.
7. **UI:** minimal; category picker; progress per category; accessible.
**Check:** generator determinism; drills adapt to weakness; metrics recorded per symbol.

#### M5-07 Bracket Balance (PRG-11)
1. **Generator rules:** produce structures with controlled nesting depth (1–4+), mixed bracket types, and optional content between brackets; guarantee balance where required.
2. **Variants:** auto-pair off, on, partial.
3. **Metrics:** bracket pair latency (time from an opening to its match), imbalance rate (unmatched brackets in the typed result), depth-specific accuracy.
4. **Ladder:** progress from depth 1 to deeper levels with increasing mixed types.
5. **Feedback:** highlight unmatched brackets after each set; explain the mistake.
**Check:** property tests confirm balance; metrics match hand-computed fixtures.

#### M5-08 Strings and Escapes (PRG-12)
1. **Content:** quote characters and nesting (single/double/backtick), escape sequences, interpolation/template markers, simple regex-like character classes for L14 (mark clearly as "regex basics").
2. **Generators:** control density of escapes and nesting; ensure validity for the selected skin (for example, which quotes are legal in which contexts).
3. **Metrics:** per-symbol errors on quotes/backslashes; escape correctness.
**Check:** generated strings are valid under the language skin; metrics correct.

#### M5-09 Level engine and Levels 1–15 (Alpha slice)
1. **Data model:** level definitions (tier, index, name, content parameters, pass/star criteria), user progress (state, attempts, best attempts, stars, timestamps).
2. **Attempts:** each attempt is a short set (about 30–60 seconds) or a boss set; record accuracy, speed, class-specific checks.
3. **Pass rule:** best 3 of the last 5 attempts meet accuracy and speed targets (see §10.6); mode-specific checks (for example, bracket imbalance under a limit).
4. **Stars:** ★ pass; ★★ higher accuracy; ★★★ speed target.
5. **Almost there:** when close to criteria, show a supportive state and a quick retry.
6. **Placement/test-out:** after the programmer baseline (M6) offer placement; allow **test-out** of a tier via a boss-style test.
7. **Level map UI:** vertical path with tiers; nodes show state; locked nodes explain why; skin chip; test-out button.
8. **Level drill UI:** minimal; shows level goal, criteria, and last attempts; auto-advance without extra buttons.
9. **Bosses:** mixed test for the tier plus review items from earlier tiers (interleaving).
10. **Analytics:** events for start, pass, near-miss; numbers only.
**Check:** e2e: start Level 1 → pass with three attempts → unlock Level 2 → stars recorded; near-miss state appears; test-out works.

### 10.4 Steps — Milestone M6 (Weeks 11–12): numbers, systems, naming, recall, baseline, analytics

#### M6-01 Numbers (Tier 4, Levels 16–20)
1. **Content rules:** digits on the number row vs numpad (setting), negatives/decimals/thousands separators, underscores in literals, scientific notation, array-index style expressions, and simple arithmetic.
2. **Locale awareness:** display formats vary; keep programmer-style formats as default; optional locale variants later.
3. **Generators:** control magnitude, precision, and symbol density.
4. **Metrics:** digit transposition rate, per-digit error rate, decimal/sign errors.
5. **Boss (L20):** numeric data entry mixing formats.
**Check:** generated numbers are valid in the chosen literal style; metrics correct on fixtures.

#### M6-02 Number systems and IDs (Tier 5, Levels 21–25)
1. **Hex/binary/octal:** literals with prefixes, digit-set rules, grouping with underscores; color codes.
2. **Bitmask and shift expressions:** typed as text (MVP does **not** ask users to compute results; conversion tasks are V1/V2 to separate knowledge from typing).
3. **IDs and addresses (synthetic only):** UUIDs (random), hashes (random hex), base64-like strings, IPv4/IPv6 using documentation ranges, CIDR notation, MAC-style addresses, ports, ISO-8601 dates/times, semantic versions.
4. **Validity checks:** each generated item must match its format rules; add automated format checks.
5. **Metrics:** literal accuracy by base, per-character errors on look-alike characters (for example, similar-looking hex digits), transposition.
6. **Boss (L25):** mixed systems lab.
7. **Safety:** never use real secrets, real tokens, or real IP addresses.
**Check:** validity checks pass on 10,000 generated items; documentation ranges only; no real-looking credentials.

#### M6-03 Naming Style Switcher (Tier 6, Levels 26–30)
1. **Vocabulary:** an original list of technical words to compose identifiers (domain terms, verbs, nouns), reviewed for licensing and appropriateness.
2. **Styles:** snake, screaming snake, camel, Pascal, kebab, dotted/namespace forms.
3. **Drill types:** (a) type identifiers in a given style; (b) **convert** a shown identifier to another style; (c) mixed-convention lists that switch style every few items (switch-cost measurement).
4. **Metrics:** accuracy per style; **switch cost** (extra time/errors right after a style change); underscore/hyphen/shift transition errors.
5. **Language conventions (V1):** map styles to ecosystems; MVP focuses on styles themselves.
6. **Boss (L30):** a mixed-convention code-like listing.
**Check:** conversion correctness is verified automatically; switch-cost metric computed on fixtures.

#### M6-04 Recall Mode, lite (PRG-16)
1. **Concept:** show a short snippet for a limited time, hide it, and have the user type it from memory; score first-try recall, time to first keystroke, hints used.
2. **Content:** short idioms per language (loops, conditionals, error handling, data structure operations), written or sourced under permissive licenses; keep them small (3–8 lines).
3. **Flow:** exposure (adjustable seconds, with a "no-timer" alternative) → hidden phase → typing → feedback showing the correct snippet and differences.
4. **Hints:** optional reveal of the first token or line; count usage.
5. **Scheduling:** MVP uses simple rotation; **V1** adds spaced review scheduling.
6. **Tone:** never punish; frame as retrieval practice.
7. **Accessibility:** no-timer variant; screen-reader-friendly feedback.
**Check:** metrics recorded; feedback highlights differences; no-timer mode works.

#### M6-05 Programmer Baseline (PRG-17)
1. **Segments:** prose (30 s) for the prose baseline; symbols (60 s); numbers and IDs (60 s); naming (60 s); code snippet (90 s); optional recall (90 s).
2. **Scoring:** per segment; compute the prose baseline used for **Symbol Fluency Ratio**; use the median of repeated prose measurements when available to reduce noise.
3. **Output:** Code Skill Profile (radar), top three fixes, recommended level path, and a note on measurement limits.
4. **Retest:** at day 30 with different text of the same difficulty; store both; show change with a noise-aware explanation.
5. **Placement:** propose a starting tier; allow the user to override.
**Check:** the baseline runs in ~10 minutes; scores reproducible on fixtures; retest pairing works.

#### M6-06 Token-class analytics and views (ANA-05/06)
1. **Metrics:** per-class speed/accuracy; **Symbol Fluency Ratio** (symbol-drill net speed ÷ prose net speed); symbol error rate; confusion matrix; number-literal accuracy by base; naming switch cost; bracket pair latency.
2. **Views:** skill radar (dimensions: symbols, brackets, strings, numbers, systems, naming, recall), level ladder, symbol heatmap with Shift/AltGr layers, confusion matrix, trends per class, "Next best drill."
3. **Next best drill logic:** choose the weakest dimension weighted by how often that class appears in the user's chosen language/stack; explain why.
4. **Honesty:** show noise bands; avoid single-number "programmer score" (PTI deferred).
5. **Accessibility:** table alternatives for every chart.
**Check:** metrics match hand-computed fixtures; every chart has a table alternative; explanations are clear.

#### M6-07 Levels 16–30 (Beta slice)
1. Define level parameters and pass criteria for L16–L30 (see §10.5).
2. Implement bosses with interleaved review.
3. Add **skill decay flags** (record last practice date per tier; refreshers come in V1).
**Check:** e2e for one full tier progression; boss review items appear.

#### M6-08 OS profiles and labeling
1. Detect the operating system as a hint; allow override.
2. Display modifier names correctly (Ctrl vs Cmd) and note path separator differences in content descriptions (paths appear in V1).
**Check:** labels correct on each OS.

#### M6-09 Adding a language skin (repeatable procedure)
1. **Choose the language** and confirm the grammar and its license.
2. **Token mapping:** map the grammar's node types to the 12 classes; write the mapping table; validate on the labeled corpus.
3. **Content:** source or write snippets (permissive licenses) and recall idioms; run the pipeline.
4. **Generator skin rules:** legal quote styles, comment markers, literal formats, naming conventions.
5. **Tests:** token map tiling, generator validity, sample runs through levels.
6. **QA:** language-savvy reviewer checks a sample of content for realism and correctness.
7. **Release:** enable behind a flag; monitor error rates.
**Check:** the language passes all checks before appearing in the picker.

#### M6-10 Safety and positioning audit
1. **Code execution:** confirm nothing in the product can run user or library code.
2. **Sanitization:** review rendering paths for injection risks.
3. **Licensing:** re-audit all snippets and word lists.
4. **Copy audit:** search UI/marketing text for banned claims.
5. **Privacy:** confirm no typed content in analytics; personal-code import is **not** in MVP.
Run `@security-auditor` and fix findings.

#### M6-11 Usability tests and demand gate
1. Test with 5–8 programmers/CS students: tasks — take the programmer baseline, do a Symbol Gym set, pass Level 1, view analytics.
2. Ask about clarity of the profile, usefulness of drills, tone, and willingness to return weekly.
3. **Gate (H7):** if fewer than expected would use it weekly, pause Levels 31+ and revisit positioning.
**Check:** a usability report with changes prioritized.

#### M6-12 Review
Run `/spec-check PRG-01 PRG-03 PRG-10 PRG-11 PRG-13 PRG-14 PRG-15 PRG-16 PRG-17 PRG-18`, `/a11y`, `/perf`, `/anim-audit`, `@security-auditor`.
**M5–M6 Done when:** token engine and maps in place; symbol maps verified; Symbol Gym, Bracket Balance, Strings, Numbers, Systems/IDs, Naming, Recall-lite work; Levels 1–30 playable with bosses and stars; programmer baseline and analytics live; safety/positioning audit passed; usability test complete.

### 10.5 Levels 1–30: definitions (parameters in words)
Values are **[proposals]** to calibrate.

| Level | Focus | Content parameters | Special check |
|---|---|---|---|
| 1 | Single bracket pairs | Isolated open/close pairs of each type, short sequences | Accuracy on each bracket type |
| 2 | Pairs with content | Short letters/numbers between pairs | Pair matching |
| 3 | Nesting depth 2 | Two-level nesting, mixed types | Imbalance count |
| 4 | Mixed nesting, longer sequences | Depth up to 3, longer runs | Bracket pair latency |
| 5 Boss | Bracket Gauntlet | Dense nesting in code-like fragments; review of L1–4 | Imbalance ≤ limit |
| 6 | Arithmetic operators | Common arithmetic symbols in short expressions | Per-operator errors |
| 7 | Comparison and assignment | Comparison and assignment operators | Confusion pairs |
| 8 | Logical and bitwise | Logical/bitwise symbols with spacing variations | Modifier symbol accuracy |
| 9 | Chords | Multi-character operators and access forms | Chord internal timing |
| 10 Boss | Operator Soup | Dense expressions mixing all classes seen | Mixed accuracy |
| 11 | Quote pairs | Single/double/backtick quotes, nesting | Quote errors |
| 12 | Escapes | Escape sequences in strings | Backslash accuracy |
| 13 | Interpolation | Template/format markers | Marker accuracy |
| 14 | Regex basics | Character classes, anchors, quantifiers (abstract) | Escape accuracy |
| 15 Boss | String & Regex mix | Mixed strings with escapes and patterns | Mixed accuracy |
| 16 | Digit entry | Number row vs numpad sets | Per-digit errors |
| 17 | Signs, decimals, separators | Negatives, decimals, thousands markers | Sign/decimal errors |
| 18 | Scientific and underscored | Exponent forms; underscore grouping | Exponent errors |
| 19 | Expressions and indices | Arithmetic with brackets and indices | Bracket + digit accuracy |
| 20 Boss | Numeric data entry | Mixed formats, longer runs | Transposition rate |
| 21 | Hex | Hex literals and color codes | Look-alike digit errors |
| 22 | Binary and octal | Prefixed literals with grouping | Digit-set errors |
| 23 | Bitmasks and shifts | Expressions with masks/shifts (typing only) | Symbol + literal accuracy |
| 24 | IDs and addresses | UUIDs, hashes, addresses, dates, versions | Per-format accuracy |
| 25 Boss | Number Systems Lab | Mixed systems and IDs | Mixed accuracy |
| 26 | Snake and screaming snake | Underscore-heavy names | Underscore errors |
| 27 | Camel and Pascal | Case-transition names | Shift errors |
| 28 | Kebab, dotted, namespaced | Hyphen/dot/scope forms | Separator errors |
| 29 | Convert between styles | Rename drills | Conversion correctness |
| 30 Boss | Mixed-convention listing | Style switches every few items | Switch cost |

### 10.6 Pass criteria and thresholds
1. **Accuracy and speed targets** follow the spec's table: accuracy ≥ 95% (tiers 1–3), ≥ 96% (tiers 4–6); speed target = a fraction of the user's **prose baseline** (Symbol Fluency Ratio) ramping within each tier group (0.50→0.65; 0.60→0.75).
2. **Best 3 of the last 5 attempts** meet targets; attempts use varied content.
3. **Baseline noise handling:** if the prose baseline is unreliable (few samples or high variance), use an absolute floor and re-baseline after more data.
4. **User control:** users can lower targets (accessibility) or raise them; record the setting.
5. **Calibration plan:** after beta, adjust thresholds so that a typical engaged user passes a level after 3–8 attempts; avoid levels that only a small minority can pass.

### 10.7 Edge cases and failure modes
- **Non-US layouts** where some symbols are awkward: offer alternative symbol sets or skip the drill with a note.
- **Users on numpad-less keyboards:** numpad drills are optional.
- **Auto-pair confusion:** explain the active mode on screen; provide quick toggle.
- **Grammar update changes token maps:** re-run the pipeline; preserve old maps for existing results.
- **Users who dislike abstract symbol drills:** provide in-context variants.
- **Code snippets with unusual characters:** filter or sanitize; keep to the layout's reachable symbols.
- **Copyright takedown on a snippet:** remove immediately; keep record; replace.

### 10.8 Tests
| Layer | What |
|---|---|
| Unit | Naming detection; generators (determinism, validity); token maps tiling; per-token attribution; SFR and SER computations |
| Property | Balanced brackets; valid literals; valid IDs; style conversions |
| Integration | Level engine state transitions; baseline scoring |
| E2E | Baseline → Level 1 → boss → analytics; recall flow; test-out |
| Security | Rendering sanitization; no execution paths |
| Manual | Real keyboards for each layout; each symbol reachable |

### 10.9 OpenCode instructions
- "Load token-drill-generators. Read implementation-guide §10.1–10.3 only. Propose the token map format and the tokenizer integration, including how it affects bundle size. No code yet."
- "/drill tier 1" (then tiers 2–6) with tests; require determinism and property tests.
- "Load typing-caret-rendering. Extend the typing surface for multi-line code with auto-indent and auto-pair modes; show the plan and the edge cases first."
- Use `@security-auditor` after each content or rendering change.

### 10.10 Events (allowlist)
`skin_selected`, `level_started`, `level_passed`, `level_near_miss`, `tier_testout_started`, `baseline_started`, `baseline_completed`, `recall_started`, `recall_completed`. Properties: language, tier/level, counts, durations, accuracy buckets.

### 10.11 V1 programmer features (preview; detailed in chapter 14)
Tiers 7–9 (structure, syntax families, terminal), Terminal Mode, Data-Format Mode, Autocomplete-Aware Mode, Stack Packs, Train-on-Your-Own-Code (local-only), Polyglot Relay, Error Fingerprints, Compile-Safe Rate, Dev Prose Pack, Template Blitz, Layout Lab, spaced review for Recall.

---

## 11. Retention and Habit System (built alongside M3–M7)

### 11.0 Goal and scope
**Goal:** give people a real, respectful reason to come back most days: a first-session win, a goal they chose, a plan tied to their routine, a forgiving streak, and visible progress, with the option to turn all gamification off.
**Requirements (MVP):** RET-01…RET-10, RET-20, MST-01, MST-05 (see the retention playbook §10). **V1:** RET-11…RET-18 (chapter 14).
**Skills:** `typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui`, `keystroke-privacy`, `award-readiness-review` (later).
**Depends on:** M3 (accounts/results), M4 (session blueprint, goals, summaries).
**Ethics:** every feature passes the checklist in the retention playbook §12 before it ships.

### 11.1 Design decisions

**D-RET-1 What counts as a "practice day."** A day counts when the user accumulates **at least 3 focused minutes** of active typing in tests or drills. Focused minutes exclude idle time and pauses; cap the contribution of any single long test to avoid gaming.

**D-RET-2 Primary streak = weekly consistency.** The user sets a weekly target (3, 4, 5, or 7 days; default 4). A completed week extends the "weeks in a row" streak.

**D-RET-3 Optional daily streak.** Offered as an opt-in. It uses the same accounting with freezes and pause.

**D-RET-4 Forgiveness.** Users earn **freezes** through practice; a freeze automatically covers a missed day (daily streak) or a missed target (weekly). **Pause mode** suspends streaks without penalty. **Repair** arrives in V1.

**D-RET-5 Day boundary and time zones.** Use the user's local day with a configurable rollover hour (default around 3–4 a.m.) so late-night sessions count for "today." Record the user's time zone; handle travel and daylight-saving changes without breaking streaks.

**D-RET-6 Authority.** The server is the source of truth for practice-day records for signed-in users; guests keep local records and merge on sign-in.

**D-RET-7 Gamification levels.** Three settings: **Full** (streaks, XP, celebrations), **Light** (streaks/progress only, quiet visuals), **Off** (insights and goals only). Default is Light; onboarding asks a single question to choose.

**D-RET-8 Copy tone.** Supportive and factual; no guilt, no loss framing.

**D-RET-9 Data.** Store daily activity summaries (minutes, tests, drills), not events with content; aggregate for streaks and dashboards.

### 11.2 Steps

#### RET-M-01 Practice-day accounting
1. **Define focused minutes:** sum active typing time inside tests and drills (from the engine's scored intervals); exclude paused, idle, and post-finish time.
2. **Daily summary record per user:** local date, total focused minutes, tests, drills, content types practiced.
3. **Threshold:** mark the day as "practiced" at ≥ 3 minutes.
4. **Time zone handling:** store the user's time zone; compute local date from the timestamp of each practice segment; when the zone changes, keep past days as recorded; document how a day that spans a zone change is treated.
5. **Rollover hour:** allow the user to adjust; explain in settings.
6. **Multiple devices:** merge by summing minutes per local date; avoid double counting the same segment (use segment IDs).
7. **Guests:** compute locally; on sign-in merge with server records using segment IDs.
8. **Edge cases:** clock changes on the device (rely on server timestamps for signed-in users); very short sessions repeated many times (sum them, but cap suspicious volumes); backfilling forgotten offline sessions (accept queued results and assign to their original local date).
**Check:** unit tests for boundaries (23:59 vs 00:01, rollover hour), DST change days, travel across zones, multi-device merges.

#### RET-M-02 Weekly-goal streak
1. **Week definition:** based on the user's locale or preference (Monday or Sunday start).
2. **Progress display:** simple dots or a segmented bar plus a text alternative ("2 of 4 days this week").
3. **Completion:** when practiced days ≥ target, the week is complete; increment the weeks-in-a-row streak.
4. **Break rules:** if a week ends below target, apply an available freeze; otherwise the streak resets to zero (message: "Fresh start this week"; show past best).
5. **Earning freezes:** award one freeze for a set number of completed weeks or practice days (choose numbers and test); cap stored freezes at two.
6. **Pause mode:** the user marks a period (vacation, illness); weeks inside are neutral.
7. **Milestones:** celebrate 4, 12, 26 weeks once, skippable, with a short, informative message.
8. **Accessibility:** progress announced as text; no reliance on color; reduced-motion versions.
9. **Copy:** examples — "You've practiced 3 of 4 days this week." "A freeze covered last week. Nice recovery."
**Check:** simulations of 52 synthetic weeks (with misses, freezes, pauses) produce expected streaks; e2e for progress display.

#### RET-M-03 Optional daily streak
1. **Opt-in toggle** in settings with an explanation of trade-offs.
2. **Accounting:** consecutive practiced days; freeze usage automatic; pause supported.
3. **Guardrails:** after a break, gently suggest switching to weekly goals ("Want a gentler rhythm?"); never shame.
4. **Visibility:** streak count shown modestly; no push notifications by default (V1 notification policy applies).
**Check:** daily streak simulation tests; copy audit.

#### RET-M-04 Goals and the if-then plan
1. **Goal presets:** offer 3–4 based on the user's context (for example, "+10 WPM in Real-World Prose in 60 days," "Cut symbol errors in half," "Practice 4 days a week"). Users can also skip.
2. **If-then planner:** a short form: *When* (after coffee, after standup, after class, before bed, or custom), *What* (a 5-minute session or 15-minute session), and an optional *cue* (a reminder time, activated in V1).
3. **Storage:** goals and plans in the user profile; editable anytime; history retained.
4. **Presentation:** the plan appears on the Today card ("When you finish your coffee, do your 5 minutes").
5. **Language:** implementation-intention style; keep it light and optional.
**Check:** plan creation takes under a minute in usability tests; edits persist.

#### RET-M-05 Today card and tomorrow's plan
1. **States:** *not yet practiced* (start button, session length options), *practiced* (summary + optional extra block), *rest day* (if the user chose a rest day; show a gentle note).
2. **Content:** the session blueprint's plan (M4-11), the goal progress, weekly progress, and the next milestone.
3. **Tomorrow's plan:** after finishing, preview tomorrow's 5-minute plan so the next step is clear.
4. **One-tap start:** starts the first block immediately; no extra screens.
5. **Empty state:** brand-new users see "Take a 60-second test."
**Check:** every state has copy and visuals; e2e covers all states.

#### RET-M-06 Session summary and personal records
1. **Contents:** what improved, what regressed, next action (three lines), plus personal records.
2. **What improved computation:** compare recent sets to the user's prior medians on the targeted items; report changes only when they exceed noise; otherwise say "steady."
3. **Personal records:** per content type (net WPM, accuracy at a given length, consistency) and per item (fastest transition); require minimum samples; avoid trivial records.
4. **Celebrations budget:** at most one celebration per session; skippable; reduced motion respected.
5. **Tone:** informative first; celebratory second.
**Check:** unit tests for improvement logic against noise; copy audit.

#### RET-M-07 Non-gamified mode
1. **Definition:** hides XP, streaks, leagues, celebrations, and badges; keeps insights, goals (optional), progress views, and plans.
2. **Where:** settings and an onboarding question ("How do you feel about streaks?" with choices).
3. **Behavior:** applies immediately; can be changed anytime; the choice is stored per account.
4. **Measurement:** track adoption (do not penalize).
**Check:** with mode off, no gamified elements appear anywhere (audit each page).

#### RET-M-08 Onboarding orchestration
1. **Sequence** (from the retention playbook §7.1): land on test → first test → weak spots → drill → retest → save prompt (dismissible) → goal presets → if-then plan → tomorrow's plan.
2. **State persistence:** if the user leaves midway, resume at the right step; do not repeat completed steps.
3. **Skips:** every optional step can be skipped; skipping doesn't hide features.
4. **Signed-in vs guest:** guests continue; sign-in merges progress.
5. **Accessibility:** all steps operable by keyboard; no forced timers.
6. **Copy review:** every step gets short, calm text.
**Check:** unaided completion by 5 participants; instrumentation logs each step.

#### RET-M-09 Retention instrumentation and cohorts
1. **Events** (allowlist): `onboarding_step_completed`, `goal_set`, `plan_created`, `practice_day_completed`, `week_completed`, `freeze_earned`, `freeze_used`, `pause_started`, `gamification_level_changed`, `streak_mode_changed`.
2. **Cohorts:** first practice date; retained = practiced (not merely visited) on day N.
3. **Dashboards:** D1/D7/D30 by cohort, practice days per week, plan completion, gamification level adoption, streak survival curves.
4. **Privacy:** aggregated, no content; access limited.
**Check:** cohort tables match a synthetic dataset.

#### RET-M-10 Ethics and copy audit
1. Run the ethics checklist (retention playbook §12) for each feature.
2. Search all copy for guilt/urgency phrases, promises, and manipulative patterns.
3. Verify opt-out paths (gamification off, streak mode switch, pause).
**Check:** audit results recorded in the Decision Log.

#### RET-M-11 Testing
| Layer | What |
|---|---|
| Unit | Day accounting; week logic; freeze earning/usage; time zones |
| Simulation | Long synthetic histories with misses, travel, pauses |
| E2E | Onboarding; goal/plan; Today card states; summaries |
| Usability | Do users understand weekly goals and freezes? Do they feel pressured? |
| Copy | Tone review with 3–5 people |

### 11.3 Edge cases and failure modes
- **User travels across time zones:** day boundaries shift; ensure no double-count or missed day; show a note if a day looks doubled.
- **User practices offline:** results queue with local timestamps; assign to the original local date on sync.
- **Someone games the system with many 3-minute sessions:** allowed (the goal is consistency), but track for abuse only when integrity features (leaderboards) depend on it.
- **Accessibility needs:** allow lower targets and longer windows; no time pressure.
- **Users with anxiety about streaks:** offer Light/Off modes prominently; never hide the switch.
- **Streak bugs:** losing a long streak due to a bug is a trust disaster; add repair tooling in admin for support.

### 11.4 OpenCode instructions
- "Load keystroke-privacy and typing-design-tokens. Read implementation-guide chapter 11 only. Propose the data model for practice-day accounting and a simulation test plan. No code yet."
- "Implement practice-day accounting with tests for time zones and rollover hour; then implement weekly streak logic and run the 52-week simulation."
- "Build the Today card with all states; run /a11y and /anim-audit."
- "Run an ethics and copy audit across all engagement UI and list any guilt/urgency phrases."

### 11.5 Done-when
First-session win, goals, if-then plan, weekly streak with freezes and pause, optional daily streak, Today card, summaries with PRs, non-gamified mode, and instrumentation are live; ethics audit passed; simulations pass; usability tests show users feel supported, not pressured.

---

## 12. M7 — Polish, QA, Legal, Usability, Award Readiness (Weeks 13–14)

### 12.0 Goal and scope
**Goal:** turn a working product into a trustworthy, accessible, fast, legally prepared beta. Finish everything that makes users trust and enjoy the product.
**Requirements:** A11Y-01…A11Y-05, NFR-01…NFR-17, OPS-01…OPS-07, OPS-13, CUS-01…CUS-03, LOC-01, ADM-01, plus the Definition of Done.
**Skills:** `a11y-typing-ui`, `typing-motion-tokens`, `typing-e2e-testing`, `award-readiness-review`, `keystroke-privacy`, `integrity-anti-cheat`.

### 12.1 Steps

#### M7-01 Full accessibility audit
1. **Automated:** run the accessibility scanner on every page in every theme; fix violations.
2. **Manual keyboard-only pass:** complete the core loop and the programmer flow without a mouse.
3. **Screen-reader pass:** on at least two platforms, complete the key tasks (test, results, drill, settings, level map, dashboard).
4. **Zoom and reflow:** 200% zoom and 320 px width on all pages.
5. **Reduced motion and forced colors:** verify.
6. **Cognitive accessibility:** plain language, consistent layouts, predictable behavior, no time pressure in practice.
7. **User testing:** recruit at least 3 people with relevant needs (for example screen reader use, motor limitations, dyslexia); observe and fix.
8. **Accessibility statement:** publish what is supported and known gaps.
**Check:** no blockers; a documented list of known limitations.

#### M7-02 Motion audit
1. Run `/anim-audit` on all animated areas.
2. Confirm only transform and opacity animate; durations from tokens; no flashing beyond limits.
3. Verify reduced-motion behavior on every animated screen.
4. Test on a throttled mid-range device profile for smoothness.
**Check:** audit report with no blockers.

#### M7-03 Performance and Core Web Vitals
1. **Lab:** run performance audits on key pages with mobile throttling; record LCP, INP, CLS.
2. **Field:** confirm real-user monitoring works; set alerts.
3. **Optimize:** fonts (subsetting, preloading, display strategy), images/icons, caching headers, compression, code splitting, deferred scripts.
4. **Targets:** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile; typing latency budget as proposed.
5. **Regression protection:** budgets enforced in CI.
**Check:** budget report; RUM live.

#### M7-04 Cross-browser and device QA
1. Build the **test matrix:** Chromium, Firefox, WebKit × Windows/macOS/Linux × five layouts × light/dark × reduced motion; plus iOS Safari and Android Chrome for the responsive experience.
2. Write **manual test scripts** for: typing accuracy on each layout; code mode symbols; settings persistence; results; drills; level map; offline behavior.
3. Hold a **bug bash** (you plus 3–5 testers) for a fixed session; log issues with severity.
4. Triage: fix blockers and majors; schedule minors.
5. Add regression tests for fixed bugs.
**Check:** matrix complete; no open blockers.

#### M7-05 Content QA and licensing audit
1. Re-run the content QA checklist on a random sample (at least 10%) and all new items.
2. Re-audit the license register; ensure attribution page is complete.
3. Test the takedown workflow with a mock request.
**Check:** audit signed off in the Decision Log.

#### M7-06 Legal and policy pages (not legal advice; consult a professional)
1. **Draft** Terms of Service, Privacy Policy, Cookie notice (if any cookies), Content Licenses/Attribution, and a DMCA/takedown procedure.
2. **Privacy Policy content:** data types collected (results, aggregated stats, optional research logs), purposes, retention (raw logs default 30 days), sharing (none for raw logs), user rights (access, export, deletion, withdrawal of consent), contact, children's policy (18+ only at launch; state it clearly and design the age gate accordingly), international transfers if applicable.
3. **Jurisdictions:** identify where your users are likely to be and review relevant requirements (for example, India's data protection law and EU requirements) with a professional; capture consent and purpose-limitation rules in product behavior.
4. **Consent UX:** research participation and composition-text storage are separate, opt-in, revocable.
5. **Breach procedure:** write a short incident plan: detection, containment, assessment, notification, and postmortem.
6. **Review:** have a legal professional review the documents before launch.
**Check:** pages published; links in the footer; behavior matches the text (verified via the privacy checklist).

#### M7-07 Support, feedback, and community
1. **Feedback widget:** visible but unobtrusive; captures free text and page; no typed content.
2. **Help center/FAQ:** cover how metrics work, error modes, layouts, accessibility, privacy, and troubleshooting.
3. **Support inbox** with response-time goals and templates; define what data support can see.
4. **Community channel** (optional): rules, moderators, escalation; publish a code of conduct.
5. **Public roadmap and changelog** pages.
**Check:** a test message goes through the full support flow.

#### M7-08 Marketing/SEO basics
1. Page metadata, social previews, sitemap and robots rules, structured data basics where relevant.
2. **Content plan:** a handful of guides that end in a relevant drill (for example, typing test for programmers; typing hex and binary literals; naming conventions drill).
3. **Performance and accessibility** of marketing pages meet the same standards.
4. **Copy audit** for banned claims.
**Check:** search-preview checks pass; pages meet budgets.

#### M7-09 "How we calculate" page
1. Explain each metric in plain language: net WPM, accuracy, consistency, KSPC, rollover, difficulty band, Symbol Fluency Ratio, symbol error rate, and baseline/retest.
2. State **limitations** honestly: difficulty bands are prose-only; benchmarks skew; timing precision limits.
3. Include the **model versions** and a changelog.
4. Consider an interactive explainer (V1) that recomputes metrics from adjustable inputs.
**Check:** three test readers can explain WPM vs net WPM after reading.

#### M7-10 Analytics and experiment readiness
1. Confirm the event allowlist is complete and enforced.
2. Verify dashboards (funnel, retention, efficacy) work with real data.
3. Confirm the experiment framework's exposure logging.
4. Pre-register the first experiments (retention playbook ER-1…ER-12) and decide which to run in beta.
**Check:** a dry-run of one experiment produces a readout.

#### M7-11 Security hardening and drills
1. Run dependency and secret scans; fix or accept with notes.
2. Run `@security-auditor`; address all high findings.
3. Perform a basic penetration test (self-run or with a colleague): input fuzzing on the API, auth bypass attempts, rate limit tests, XSS attempts via snippets and custom text.
4. **Restore drill:** perform a full backup restore into a clean environment; time it.
5. **Incident drill:** simulate an outage; follow the runbook.
**Check:** all high findings closed; restore time recorded.

#### M7-12 Pre-beta usability tests and SUS
1. **Sample:** 12+ participants across personas (upgraders, programmers, writers, beginners, accessibility).
2. **Tasks:** first test and results comprehension; start a drill and retest; set a goal and plan; programmer baseline and Level 1; find settings; export data.
3. **Measures:** task success, time on task, errors, and the SUS questionnaire.
4. **Analysis:** list issues by severity and frequency; fix top issues; retest quickly with 3 people.
5. **Target:** SUS ≥ 75 for beta (≥ 80 before award submissions).
**Check:** usability report and SUS score recorded.

#### M7-13 Award-readiness review and design critiques
1. Run `/award-audit` on the build; read the table honestly.
2. **Special pages:** verify 404, loading, empty, offline, error states are designed and consistent.
3. **Design critiques:** get three outside critiques (designers or experienced product people) using the brief as context.
4. **Signature moments:** decide which (if any) to build now (for example the rhythm ribbon or token spectrum) based on effort and value; cut anything that risks latency or clarity.
5. **Polish list:** typography details, spacing, icon consistency, empty-state illustrations (if any), microcopy.
**Check:** a prioritized polish list with owners and dates.

#### M7-14 Beta readiness and go/no-go
Use the checklist in §16.1. Decide whether to launch beta now, delay for specific fixes, or cut scope.

### 12.2 Definition of Done (recap; must hold for every shipped feature)
Reviewed diff · unit and e2e tests · accessibility check · performance budget met · `/how-we-calculate` updated if metrics changed · privacy review · feature flag and rollback plan · analytics events without content.

### 12.3 Edge cases
- **Late accessibility discoveries:** fix before launch; do not defer blockers.
- **Performance regressions after polish:** keep budgets in CI to catch them.
- **Legal review delays:** launch beta with limited invites only after basic policies are live and reviewed by at least a knowledgeable advisor.

### 12.4 OpenCode instructions
- "Run /a11y on all pages and produce a consolidated severity table; propose fixes but do not apply."
- "Run /perf and list the top five contributors to bundle size and the top three interaction delays."
- "Run /award-audit on the staging URL and list blockers and quick wins."
- "Generate a manual test script for the layout matrix from the guide's §12.1 M7-04."

### 12.5 Done-when
Accessibility audit complete with no blockers; motion audit clean; CWV and typing-latency budgets met; QA matrix complete; content and license audits signed off; legal pages published and reviewed; support/feedback live; "How we calculate" published; security drills done; SUS ≥ 75; award-readiness list prioritized; beta go decision recorded.

---

# PART IV — LAUNCH AND BEYOND

## 13. M8 — Beta Launch and the Learning Loop (Weeks 15–16, then ongoing)

### 13.0 Goal and scope
**Goal:** put the product in front of 50–100 real users, watch what they do, verify the loop works, begin collecting day-30 retest data, and decide V1 scope with evidence.
**Depends on:** M7 done; beta go decision recorded.
**Skills:** `award-readiness-review` (later), `keystroke-privacy`, `typing-e2e-testing`.
**Key idea:** beta is a **learning system**, not a launch party. Every step should produce a decision.

### 13.1 Steps

#### M8-01 Plan the beta
1. **Size and pacing:** invite in three waves (about 10, then 30, then 60 users) so problems surface before they hit everyone.
2. **Who:** R0 participants, waitlist members (balance by role), and a few people with accessibility needs and non-programmers.
3. **Expectations:** explain what beta means, what's unfinished, how to give feedback, and how data is used (including optional research consent).
4. **Beta terms:** a short, plain-language notice; no guarantees; how to delete data.
5. **Success criteria** (set in advance): first-session win rate; D1/D7/D30 among engaged testers; SUS; zero data-loss incidents; no privacy incidents; number of high-severity bugs per week trending down.
6. **Communication plan:** welcome message, weekly update, "what we changed" note, a feedback prompt after the first week.
**Check:** a beta plan document with success criteria and wave dates.

#### M8-02 Launch operations
1. **Pre-launch checklist:** monitoring and alerts live; backups verified; rate limits set; feature flags in place; rollback plan tested; support inbox staffed; status page or a simple status note.
2. **Release procedure:** deploy to staging; smoke test; deploy to production; verify health checks, error tracking, and analytics events; announce.
3. **Solo on-call:** define hours you'll monitor closely (first 72 hours of each wave); set alert routing to your phone; write "if X then Y" runbook entries.
4. **Communication templates:** outage notice, fix notice, data-issue notice (drafted in advance).
**Check:** a dry run of the release and rollback procedures.

#### M8-03 Verify instrumentation in production
1. Trigger each event yourself and confirm it appears with correct properties and **no content**.
2. Confirm cohort and funnel dashboards populate from real data.
3. Confirm the error tracker's scrubbers work on real errors.
4. Confirm the retention job runs and deletes expired logs (check counts).
**Check:** an instrumentation verification sheet.

#### M8-04 Weekly cadence (rituals)
| Day | Activity |
|---|---|
| Monday | Metrics review: funnel, retention, efficacy, bugs, support themes |
| Tuesday | 2–3 user conversations (short, focused on a specific flow) |
| Wednesday | Fix and build the top issues |
| Thursday | Release with notes and changelog; monitor |
| Friday | Write "what we learned"; update the roadmap and decision log |

#### M8-05 Efficacy pipeline
1. **Baseline capture:** ensure each new user is offered the baseline test early (without forcing it).
2. **Day-30 retests:** at first, send manual reminders to consenting users; automate in V1 notifications.
3. **Holdout enrollment:** invite consenting users to the "test what works" study; randomize; store arms; keep both arms useful.
4. **Analysis rhythm:** at day 30 and day 60 cohorts, run the pre-written analysis plan; report medians and intervals; note dropouts.
5. **Reporting:** produce an internal efficacy summary; decide what (if anything) to publish publicly and with what caveats.
**Check:** the first day-30 cohort produces a report even if small; caveats stated.

#### M8-06 Feedback synthesis loop
1. **Collect:** feedback widget, support inbox, interviews, community channel.
2. **Tag:** by area (typing, results, drills, programmer track, onboarding, habit, performance, accessibility), severity, and user type.
3. **Prioritize:** score by frequency, severity, and fit with the vision; discuss trade-offs in writing.
4. **Close the loop:** reply to people whose feedback was used ("You said, we did").
5. **Public roadmap** updates monthly.
**Check:** a tagged feedback board with counts.

#### M8-07 Bugs and incidents
1. **Severity levels:** S1 (data loss, privacy, unusable typing), S2 (major feature broken), S3 (minor), S4 (cosmetic).
2. **Targets:** S1 acknowledge in minutes and mitigate within hours; S2 within a day; S3 in the next release.
3. **Postmortems:** short, blameless write-ups for S1/S2 with actions and owners.
4. **Regression tests** for every fixed S1/S2.
**Check:** incident log and postmortem template ready.

#### M8-08 Calibrate models with real data (with consent)
1. **Difficulty bands:** check within-user speed ordering across bands; adjust thresholds; record model version.
2. **Weakness model:** compare top items against outcomes (do drills on flagged items improve them?); adjust weights.
3. **Level thresholds:** check pass rates; aim for a typical engaged user passing a level after 3–8 attempts; adjust.
4. **rWPM feasibility:** evaluate whether data supports a difficulty-adjusted score; do **not** ship a multiplier unless fits are good (spec §6.2).
5. **Version and changelog** every calibration.
**Check:** calibration notes and version changes recorded.

#### M8-09 Decide V1 scope with evidence
1. Rank V1 candidates (chapter 14) by evidence: requested by users, supports retention/efficacy, technical risk, cost.
2. Apply the **scope-cut ladder** (§16.7) if capacity is limited.
3. Record the decision and rationale.
**Check:** a V1 plan with three to five headline features and explicit deferrals.

#### M8-10 Public launch preparation
1. **Readiness:** beta metrics meet thresholds; no unresolved S1/S2; legal pages reviewed; accessibility statement published.
2. **Assets:** short demo video/GIF showing the diagnose→drill loop; a README (if open-sourcing the engine); an efficacy summary with caveats; screenshots (with themes).
3. **Show HN plan** (for the programmer story): a simple title and a plain description; ensure the site works without heavy signup; prepare to answer questions honestly; do not solicit votes.
4. **Product Hunt decision:** only with a prepared campaign; otherwise skip.
5. **Community:** invite beta users to share; open a Discord or similar with rules.
6. **Launch day:** monitor errors, latency, and support; respond quickly; log learnings.
**Check:** launch runbook; asset list; go/no-go decision.

### 13.2 Beta risks and responses
| Risk | Early sign | Response |
|---|---|---|
| Low first-session win rate | Users leave after the first test | Simplify results; shorten the flow; improve weak-spot clarity |
| Weakness model feels wrong | Users say "that's not my problem" | Add "why" explanations; adjust weights; add user-chosen focus |
| Drills feel repetitive | Drill skips rise | Improve variety; adjust selector; rotate content |
| Streak anxiety | Survey scores worsen; complaints | Promote Light/Off modes; soften copy |
| Performance issues on real devices | RUM shows high INP | Profile; optimize; reduce work in the typing path |
| Privacy concern | Questions about data | Improve explanations; verify behavior; audit |
| Programmer track underused | Low weekly use | Interviews; simplify levels; check positioning |

### 13.3 Done-when
Three beta waves completed; instrumentation verified; first day-30 cohort analyzed; feedback loop running; calibration notes recorded; V1 scope decided; public launch readiness checklist reviewed.

---

## 14. V1 Features, Step by Step

Each item below uses a compact template: **Goal · Depends on · Steps · Tests · Risks.** Build V1 in the order that evidence from beta supports; the recommended default order is listed in §14.16.

### 14.1 V1-01 Integrity layer and verified leaderboards (INT-05…INT-08, CMP-01)
**Goal:** trustworthy rankings. **Rule:** integrity **before** any public board.
**Depends on:** M3 verification, M8 data.
**Steps:**
1. **Threat review:** revisit the threat model (scripts, forged submissions, assisted typing, humanized bots, multi-accounting) with real beta data.
2. **Risk scoring worker:** introduce a background job runner (first use of queues); compute a risk score from deterministic checks, timing-distribution features (bigram-dependence, variance, regularity), and account history.
3. **Holds:** results above a risk threshold or claiming records are **held off boards** with a visible "under review" status to the user.
4. **Verification re-test:** for top ranks/records, invite the user to a fresh-text re-test within a tolerance band; optionally accept video evidence for top tiers.
5. **Appeals and policy:** publish rules, categorized reasons, an appeal form, and a target response time; log outcomes; track false positives.
6. **Ranked vs practice:** ranked sessions enforce stricter rules (focus, trusted input, no custom text).
7. **Board design:** segment by mode, difficulty band, language; enforce an accuracy floor; show percentiles for non-top users; allow opt-out from public boards.
8. **Storage:** introduce sorted-set storage for fast ranking (first Redis use); snapshot to the database.
9. **Abuse tooling:** admin review UI with replay, flags, and decision recording; audit trail.
10. **Launch gradually:** friends-only boards first, then daily/weekly public boards.
**Tests:** forged and bot-like fixtures flagged; known fast humans not flagged; hold/release flows; appeal flow; load test boards.
**Risks:** false positives (measure and publish the rate), moderation cost, gaming via multiple accounts.

### 14.2 V1-02 Real-time races (CMP-02…CMP-04)
**Goal:** live competition with accuracy-aware winners.
**Depends on:** V1-01 integrity groundwork; realtime infrastructure.
**Steps:**
1. **Infrastructure:** add a realtime service (socket-based) and shared state for rooms; keep it separate from the main API; plan capacity and regions.
2. **Room lifecycle:** create/join, countdown, start, progress, finish, results, cleanup.
3. **Server authority:** server sets the start time and text; clients send progress updates at a modest interval; server checks monotonic progress.
4. **Matchmaking:** quick-match by skill bracket (rolling median), private rooms with codes.
5. **Winner rule:** highest net speed among finishers above the accuracy floor; show accuracy prominently.
6. **Reconnect:** allow a short grace window; resume progress.
7. **Post-race coaching:** show the top confusions and one suggested drill; keep it optional.
8. **Fairness:** use the same text for all; avoid mid-race UI changes; forbid custom text.
9. **Safety:** rate limits; name/avatar rules; report and mute tools.
10. **Verification:** after the race, upload logs; server recomputes; results flagged as usual.
**Tests:** load tests with many concurrent rooms; latency measurements; disconnect/reconnect; cheating attempts; accessibility (announce countdown and results).
**Risks:** cost and complexity; cold-start (few players) → mitigate with ghost races and bots labeled as bots (never pretend they're humans).

### 14.3 V1-03 Ghost races
**Goal:** race yourself or a friend without needing live players.
**Steps:** store replay summaries for personal bests; render a ghost caret moving at the recorded pace; show time delta; allow opt-in sharing with friends; no shame framing; privacy controls for shared ghosts.
**Tests:** ghost timing equals recorded timing; sharing permissions.
**Risks:** distraction; keep off by default in focus modes.

### 14.4 V1-04 Composition mode and Draft Sprint (MOD-06, MST-11)
**Goal:** measure and train real writing/typing under thought.
**Steps:**
1. **Prompts:** write ~50 original prompts (reply to an email, explain a concept, summarize a paragraph, describe a process); vary difficulty; avoid sensitive topics.
2. **Session types:** free composition (5–10 minutes) and **Draft Sprint** (10/20 minutes) with word goals.
3. **Modes:** **typewriter** (no backspace) and **blur** (text hidden until the sprint ends) to quiet the inner editor; both optional.
4. **Metrics:** words written, composition speed (including thinking), burst speed, pauses, backspace rate, flow minutes (uninterrupted stretches), transfer ratio vs copy typing at matched difficulty.
5. **Progress view:** ideal-vs-actual word-count line toward a goal; weekly words.
6. **Privacy:** text stays local or is discarded after computing metrics unless the user opts in to save; never used for analytics.
7. **Habit hooks:** writer-specific streaks (any writing counts; goal writing counts more); flexible goals.
8. **Accessibility:** no-timer variants; screen-reader friendly summaries.
**Tests:** metrics on synthetic sessions; privacy checks (no text leaves the device); modes behave as documented.
**Risks:** users treat it as a word processor; keep it focused on sprints and metrics; provide an export of *their own* text locally if they opt in.

### 14.5 V1-05 PWA and offline (MOB-02)
**Goal:** installable app with offline practice.
**Steps:** define what works offline (classic tests, cached content sets, drills from cached content, local history); choose caching strategies per resource type (static assets, content bundles, API responses); implement a background queue for results; design the **update flow** (notify when a new version is available; never interrupt a test); handle storage limits; test on flaky networks; add install prompts respectfully.
**Tests:** offline typing, queueing, sync on reconnect, update flow, cache invalidation.
**Risks:** stale content or logic mismatches after updates; keep versioning strict.

### 14.6 V1-06 Notifications (RET-11, OPS-08)
**Goal:** helpful, low-volume reminders that respect the policy.
**Steps:**
1. **Channels:** email first (simple), then web/mobile push if needed.
2. **Permission timing:** ask after the first win with a clear benefit; explain frequency; allow granular toggles.
3. **Types:** (a) practice cue at the user's chosen time; (b) opt-in "save" notice when a streak or promotion is about to lapse; (c) weekly review.
4. **Scheduling:** respect time zones, quiet hours, and a cap of one per day.
5. **Templates:** calm copy; no guilt; each message includes the specific next action and an unsubscribe/pause link.
6. **Deliverability:** authenticate the sending domain; monitor bounces and complaints.
7. **Analytics:** opt-in rate, open/click (privacy-respecting), opt-out rate, and effect on D7/D30 (via experiments ER-12).
8. **Failure handling:** if sending fails, do not retry endlessly; never send duplicates.
**Tests:** time-zone scheduling; cap enforcement; unsubscribe; template rendering; experiments.
**Risks:** notification fatigue; measure and back off.

### 14.7 V1-07 Weekly review and welcome-back (RET-12, RET-13)
**Steps:** build the weekly summary (days practiced, biggest improvement, weakest spot, next week's plan); provide in-app and optional email; build the lapsed-user flow (2–3 days: gentle in-app note; 7 days: one opt-in message; 30+ days: welcome-back with a 60-second re-baseline and goal reset); never use guilt.
**Tests:** correct segmentation by lapse length; content accuracy; opt-out.

### 14.8 V1-08 XP, weekly quests, daily challenge (RET-14)
**Steps:**
1. **XP scheme:** award XP for competence (improving weak items, completing plan blocks, retests) with diminishing returns for raw minutes.
2. **Quests:** small weekly goals tied to weaknesses ("fix three symbol confusions"); choice of two or three; no penalty for skipping.
3. **Daily challenge:** one shared text or task; results shown by skill bracket and percentiles; skippable; no streak coupling by default.
4. **Fairness:** brackets by rolling median; accuracy floors; verified-only for public boards.
5. **Copy and visuals:** modest; respect gamification level (Off hides all).
**Tests:** XP calculations, quest completion detection, bracket assignment.
**Risks:** grinding and novelty decay; rotate quest types.

### 14.9 V1-09 Clubs and leagues (RET-15, RET-16)
**Goal:** relatedness without pressure.
**Steps:**
1. **Clubs:** private by default; invite links; shared weekly goal (total practice days or minutes); simple activity feed with counts only; admin roles; moderation and reporting.
2. **Leagues:** weekly, small groups by skill bracket; gentle promotion/relegation; **opt-out**; percentile display for everyone.
3. **Privacy:** minimal profile fields; control what is visible; no location data.
4. **Anti-abuse:** verify results feeding leagues; detect multi-accounting; rate-limit invites.
5. **Moderation tools:** report, mute, remove; audit log.
**Tests:** membership permissions; goal aggregation; league assignment and rollover; privacy settings.
**Risks:** moderation load; start small and private.

### 14.10 V1-10 Supporters, cosmetics, and billing (RET-18, BIZ-02, BIZ-03, OPS-09)
**Goal:** sustainable funding without pay-to-win or dark patterns.
**Steps:**
1. **Decide the model** from evidence: supporters (one-time/recurring) with cosmetic perks; test a Pro tier (deep analytics, own-code drills, packs, cloud replays) with a waitlist price test.
2. **Payments:** choose providers that support your users' regions (cards plus regional methods); handle taxes, invoices, refunds, failed payments, and cancellation.
3. **Transparency:** clear pricing page; one-click cancel; renewal reminder emails.
4. **Cosmetics:** themes, caret styles, sound packs, earned by consistency or purchased as supporter perks; never competitive advantage.
5. **Entitlements:** a simple entitlement check; graceful downgrade.
6. **Compliance:** receipts and records; privacy for payment data (delegate to the provider).
**Tests:** purchase, renewal, cancellation, refund flows in a sandbox; entitlement edge cases.
**Risks:** low conversion; support load; keep scope small.

### 14.11 V1-11 Programmer V1 features (PRG-19 group)
**Steps (grouped):**
1. **Tiers 7–9** (whitespace/structure, syntax families, terminal/tooling): define parameters as in the level tables; add content sets and generators; keep commands display-only.
2. **Terminal Mode:** a prompt-like surface; command sets (version control, package managers, containers/cloud CLIs, text tools); flags, pipes, redirects, globs, environment variables; OS-aware paths; scoring per command; **never executes**.
3. **Data-Format Mode:** JSON/YAML/TOML/CSV/XML/SQL/Markdown/HTML samples with structure-aware scoring (missing quotes/commas/indent).
4. **Autocomplete-Aware Mode:** simulate suggestion acceptance and dismissal; measure keystroke economy; include AI-style ghost suggestions as a simulation; keep it optional.
5. **Stack Packs:** curated packs (for example a JavaScript full-stack pack with server routes, UI components, database schemas; a JVM web pack with annotations/controllers/persistence; a Python web pack; container orchestration manifests; analytics SQL); license-audited; created with the content pipeline.
6. **Train on your own code (local-only):** file/folder selection processed entirely in the browser; **secret scanning** before use; extract frequent tokens/identifiers/patterns; build ephemeral drills; nothing uploaded; clear-data control; verify with network inspection tests.
7. **Polyglot Relay:** same algorithm across languages; measure language-switch cost.
8. **Error Fingerprints:** recurring slips with plain-language tips.
9. **Compile-Safe Rate:** tolerant parse of typed outputs in modes where users compose or edit.
10. **Dev Prose Pack:** commit messages, PR descriptions, README, review comments, issue text.
11. **Template Blitz:** timed recall of algorithm/data-structure templates and SQL patterns.
12. **Layout Lab:** non-US layouts, symbol layers, custom keymap import; symbol reach analysis.
13. **Spaced review** for Recall items (MST-12): scheduling by forgetting curve; caps on daily reviews.
**Tests:** content validity, token maps, network isolation for own-code mode, secret scanner accuracy, scoring correctness.
**Risks:** scope explosion; ship one or two per release, guided by usage.

### 14.12 V1-12 Training upgrades (MST-07…MST-10, MST-14, MST-15)
**Steps:**
1. **Consistency/rhythm trainer:** show IKI variability over time; add an optional steady-beat cue; goals for smoother rhythm; keep as an experiment.
2. **Preview-span probe and trainer:** run limited-preview tests (1/3/5/10 characters or words visible ahead) to estimate span; train slightly beyond it; measure changes; experiment ER-9.
3. **Hand-alternation drills** tailored to the user's pattern.
4. **Plateau detection:** trigger after a flat trailing median; suggest interventions with reasons; log which help.
5. **Evening→morning retest option:** experiment ER-10; do not claim benefits.
6. **Fatigue guard:** detect sharp accuracy/consistency drops mid-session; suggest stopping; opt-in break nudges framed around energy, not medical claims.
**Tests:** metric correctness; experiment assignment; UI clarity.
**Risks:** unproven trainers; label as experiments and measure.

### 14.13 V1-13 Layouts, languages, localization (LOC-02…LOC-04)
**Steps:** add custom layout/keymap import with validation; add symbol layers; add language content packs (start with two or three languages you can validate); externalize interface strings; add locale-aware formats in real-world text; test right-to-left basics if any language requires it.
**Tests:** layout import validation; content QA by native speakers.
**Risks:** quality control across languages; recruit reviewers.

### 14.14 V1-14 Mobile thumb-typing mode (MOB-03)
**Steps:** design a separate mode with its own metrics and boards; handle autocorrect, predictive text, and virtual keyboards; measure with different input behavior; keep the message honest that physical keyboards are the main target.
**Tests:** device matrix; input events across browsers.
**Risks:** inconsistent behaviors; keep scope small.

### 14.15 V1-15 Certificates and B2B pilot (BIZ-04, BIZ-05; may slip to V2)
**Steps:** validate demand first (interviews with bootcamps/colleges/employers); if validated, define a verified assessment (fresh text, integrity checks, optional proctoring), a shareable certificate, and a coach dashboard (assign plans, view progress, export); pilot with one or two partners; collect feedback; decide whether to continue.
**Risks:** unclear recognition; support burden.

### 14.16 Recommended V1 order (default)
1. Notifications basics + weekly review (habit lift, low effort)
2. Composition/Draft Sprint (opens the writer segment)
3. PWA/offline
4. Stack Packs + Terminal/Data-Format (programmer depth)
5. Integrity layer → friends-only boards → public boards
6. Ghost races → real-time races
7. XP/quests/daily challenge → clubs/leagues
8. Supporters/cosmetics; Pro test
9. Training upgrades (experiments)
10. Layouts/languages/mobile
Adjust order based on beta evidence.

---

## 15. V2 Outline, Operations, and Long-Term Maintenance

### 15.1 V2 features (outline with key steps)
Build V2 only after V1 evidence justifies each item. For each, start with a one-page brief (problem, evidence, success metric, risks) and a spike.

| Feature | Key steps (summary) | Gate before building |
|---|---|---|
| **Teams and coach dashboards** (BIZ-04) | Organization model, roles, invitations, assigned plans, progress views, exports, privacy rules for minors/adults, admin controls | Two pilot partners commit |
| **Edit Tasks and situational shortcuts** (PRG-20) | Choose an embeddable editor component; define keymap profiles (mainstream editors and modal editors); author transformation tasks with a "par" keystroke count; scoring by time and keystrokes; situational prompts instead of bare shortcut cards; measure efficiency | Clear differentiation from existing edit-golf tools; usage signals from programmers |
| **Rollover Lab** (MST-13) | Design drills for alternating-hand overlap; verify keyboards report overlapping keys; measure rollover ratio changes; run experiments | Evidence from V1 rhythm/preview experiments |
| **Difficulty-adjusted score (rWPM) beta** | Only if data fits well: fit a model within users, publish fit stats and minimum sample sizes, ship as beta with classic WPM alongside | Good fit; user comprehension tests pass |
| **Code/symbol difficulty model** | Build a per-token-class cost model from your own consented data; validate; version | Enough data and consent |
| **Public API** (EXT-01) | Personal API keys, read-only endpoints for the user's own data, rate limits, docs | Demand signals |
| **Browser extension for everyday typing** (EXT-02) | Local-only timing aggregates, no content capture, transparent permissions, store review compliance; privacy review | Strong privacy design and user demand |
| **IDE plugins** (EXT-03) | Local-only stats for code typing; opt-in | Programmer demand |
| **Exam module** (MOD-11, LOC-05) | Validate the target exams' rules; rule packs for net-speed formulas; layouts; regional-language support; integrity | Interviews and market check |
| **Assessment Simulator** (PRG-21) | Practice-only environment; report typing overhead; no cheating aids | Demand and ethics review |
| **AI coach (grounded)** (LRN-14) | Use only the user's own stats; strict prompts; cost caps; no medical claims; privacy review | Clear value; cost control |
| **Community packs** (EXT/PRG-21) | Contribution workflow, licensing statement, moderation, reporting, creator credit | Community size |
| **Accessibility expansions** | More assistive input methods; broader testing with users | Ongoing |

### 15.2 Operations runbook

#### Daily (10 minutes)
1. Check uptime, error rate, and latency dashboards.
2. Scan the support inbox and feedback widget; respond to S1/S2 issues first.
3. Check job health (retention job, aggregate jobs, notification sending when live).
4. Review integrity flags (when boards exist).

#### Weekly (1–2 hours)
1. Review funnel, retention cohorts, practice days, efficacy dashboards.
2. Triage bugs and feedback; plan the next release.
3. Publish release notes and update the changelog.
4. Content ops: add/review new items; audit licenses for new items; review reports.
5. Community moderation review.
6. Cost check (hosting, database, email).

#### Monthly (half day)
1. Dependency updates and security patches; run full test suite; deploy.
2. Backup restore test (rotate scenarios).
3. Accessibility spot check on new pages; performance regression review.
4. Model calibration check (difficulty bands, weakness weights, level thresholds).
5. Roadmap and decision-log review.
6. Legal/policy check (are practices matching the text?).

#### Quarterly (1–2 days)
1. Incident review and process improvements.
2. Security review, including access lists and secrets rotation.
3. Usability test with 5 new users; compare with SUS history.
4. Efficacy report update.
5. Cost and scaling review (§15.3).
6. Content refresh plan.

### 15.3 Scaling plan
**Principle:** add complexity only when a measured trigger is hit.

| Trigger | Symptom | Action |
|---|---|---|
| Leaderboards/races planned | Need fast ranking and realtime | Introduce sorted-set store and realtime service (V1-01/02) |
| Background work grows | Verification, aggregates, emails slow the API | Introduce a job queue and workers |
| Read-heavy pages slow | Dashboard/profile queries slow | Add caching and precomputed aggregates; review indexes |
| Database load | High latency, connection limits | Optimize queries and indexes; move heavy analytics off the primary path; scale the database tier |
| Storage growth | Logs and results balloon | Shorten retention for raw logs; store logs only for verified/flagged results; archive |
| Traffic spikes | Launch day bursts | Use CDN caching for static assets; autoscale the API; rate limit |
| Global users | High latency | Consider regional deployments for realtime only |

**Cost model steps:** (1) list every service and its pricing driver; (2) estimate usage per 1k/10k/100k monthly users using your beta data; (3) add a 30% buffer; (4) set alerts on spend; (5) review monthly.

### 15.4 Maintenance calendar (year one)
- **Month 1–3:** stabilize beta, fix top issues, first V1 items.
- **Month 4–6:** integrity layer, notifications, composition mode, PWA.
- **Month 7–9:** stack packs, programmer V1, leaderboards/races if justified.
- **Month 10–12:** monetization tests, teams pilot, accessibility deep dive, award submissions after polish.

### 15.5 Feature retirement and migrations
1. **Retire with notice:** announce, offer alternatives, provide data export.
2. **Migrations:** always version data; write and test migrations; keep rollback plans; never migrate without a verified backup.
3. **Metric model changes:** version, communicate, decide whether to recompute (default: don't recompute; label by version).

### 15.6 When to get help
| Need | Trigger | What to outsource |
|---|---|---|
| Design polish | Award readiness and brand | A designer for critique and identity |
| Content editing | Content growth beyond your capacity | An editor for prose/snippet review |
| Support/community | Volume above a few hours per week | A part-time moderator |
| Legal | Launch and monetization | A legal professional for policies |
| Security | Before public launch or leaderboards | A security review |

### 15.7 Data governance (ongoing)
1. Keep the data map current with every feature.
2. Review access logs quarterly.
3. Test export and deletion quarterly.
4. Publish transparency notes (what data, why, how long).
5. Reassess retention periods yearly.

---

## 16. Master Checklists, Risk Triggers, Templates, Glossary

### 16.1 Beta readiness checklist
**Product**
- [ ] First-session win flow works unaided for ≥ 4 of 5 testers
- [ ] Results accurate and verified by the server
- [ ] Weakness profile and drills work; retest shows deltas
- [ ] Programmer baseline and Levels 1–30 playable
- [ ] Goals, if-then plan, weekly streak, freezes, pause, Today card working
- [ ] Non-gamified mode complete

**Quality**
- [ ] Latency and bundle budgets pass in CI; CWV acceptable in lab and RUM
- [ ] Accessibility audit complete; keyboard-only and screen-reader passes done
- [ ] Layout matrix complete on real keyboards
- [ ] No open S1/S2 bugs

**Trust**
- [ ] Privacy behavior matches policy (export, delete, retention job tested)
- [ ] Analytics allowlist enforced; error scrubbing verified
- [ ] License register complete; attribution page live
- [ ] Legal pages published and reviewed
- [ ] Integrity checks (recompute, plausibility) tested

**Operations**
- [ ] Monitoring/alerts live; backup restore tested
- [ ] Rollback tested; runbook written
- [ ] Support inbox and feedback widget working
- [ ] Beta plan and communication templates ready

### 16.2 Milestone checklists (short form)
- **R0:** hypotheses/thresholds recorded · ≥ 10 interviews · waitlist test · prototype test · spikes S1–S6 · license register · go/no-go memo.
- **M0:** repo protected · CI gates · staging/prod shells · scrubbing verified · OpenCode kit vetted · Decision Log · board and DoD.
- **Design foundation:** brief · tokens/themes · typography · motion guide · special pages · UX writing guide · primitives.
- **M1:** contracts · fixtures · state machine · error modes · metrics · replay · parity · property tests · docs.
- **Content:** register · pipeline gates · typability bands · selector · snippet library · QA · attribution.
- **M2:** typing surface · settings · layouts · motion · accessibility · performance · offline-safe · matrix.
- **M3:** data model · auth · signed sessions · verification · results page · local-first · privacy features · admin lite · security review · backups.
- **M4:** aggregation · weakness profile · heatmap/typo arrows · drills · difficulty targeting · baseline · goals · efficacy · experiments · dashboards.
- **M5–M6:** taxonomy · tokenizer · attribution · code surface · symbol maps · Symbol Gym · Bracket Balance · Strings · Numbers · Systems/IDs · Naming · Recall-lite · baseline · analytics · levels 1–30 · safety audit.
- **Retention:** day accounting · weekly streak · freezes/pause · goals/plan · Today card · summaries · non-gamified mode · onboarding · instrumentation · ethics audit.
- **M7:** accessibility · motion · performance · QA · content/legal · support · SEO · how-we-calculate · security drills · SUS · award readiness.
- **M8:** beta waves · instrumentation verified · efficacy pipeline · feedback loop · calibration · V1 decision · launch prep.

### 16.3 Risk register with triggers and responses
| # | Risk | Trigger (measure) | Response |
|---|---|---|---|
| 1 | Users prefer existing free tools | Interviews/waitlist show low switching | Sharpen the diagnose→drill and programmer differentiators; pivot messaging; consider a narrower niche |
| 2 | Efficacy not shown | Holdout shows no difference | Improve drills; adjust claims; publish honestly; explore other value (accuracy, comfort) |
| 3 | Low willingness to pay | No supporter/Pro conversion | Keep costs low; explore B2B; consider donations |
| 4 | Difficulty score confuses | Comprehension test fails | Keep bands only; simplify language; delay rWPM |
| 5 | Weakness model feels wrong | Users disagree with top items | Add explanations; user-chosen focus; recalibrate |
| 6 | License contamination | Any asset lacking provenance | Remove; audit; clean-room policy |
| 7 | Cheating on boards | High flags/complaints | Delay boards; strengthen integrity; friends-only boards |
| 8 | Keystroke privacy incident | Any content in analytics/logs | S1 response; audit; fix scrubbers; notify as required |
| 9 | Streak anxiety | Survey scores or complaints | Promote Light/Off; soften copy; adjust freezes |
| 10 | Performance regressions | INP/latency budget breaks | Roll back; profile; fix before shipping |
| 11 | Scope creep | Backlog grows faster than shipping | Apply scope-cut ladder (§16.7) |
| 12 | Solo capacity | Slipping weekly milestones | Reduce scope; automate tests; get help |
| 13 | Programmer demand weak | Low weekly use of programmer track | Interviews; simplify; hold Levels 31+ |
| 14 | Support overload | > few hours/week | Improve FAQ; add moderator; automate responses |
| 15 | Legal/compliance gaps | Review finds mismatches | Fix behavior or text; consult a professional |

### 16.4 Templates (described in words)
**Decision Log entry:** date · decision · options considered · reasoning · evidence links · approver · revisit trigger.
**Architecture Decision Record (ADR):** context · decision · consequences (good and bad) · alternatives · status (proposed/accepted/superseded).
**Spike report:** question · method · result (pass/fail) · evidence · risks · recommendation.
**Experiment brief:** hypothesis · arms · primary metric · guardrails · sample size · duration · stop rules · analysis plan.
**Incident postmortem:** timeline · impact · root cause · what went well · what didn't · actions with owners and dates.
**User interview note:** participant type · context · quotes · behaviors · pains · workarounds · surprises · follow-ups.
**Usability test note:** task · success (y/n) · time · errors · quotes · severity · fix idea.
**Pull request template:** requirement IDs · summary · risk · tests · accessibility · performance · privacy · rollback · screenshots.

### 16.5 Test matrix summary
| Dimension | Values |
|---|---|
| Browsers | Chromium, Firefox, WebKit; mobile Safari/Chrome for responsive checks |
| Operating systems | Windows, macOS, Linux |
| Layouts | QWERTY US/UK, Dvorak, Colemak/Colemak-DH, AZERTY, QWERTZ |
| Themes | Light, dark, presets, high contrast |
| Motion | Normal, reduced |
| Zoom/viewport | 100%, 200%; 320 px, 768 px, 1280+ px |
| Network | Fast, throttled, offline |
| Accessibility | Keyboard-only, screen reader, forced colors |
| Users | Guest, signed-in, new, returning, lapsed |

### 16.6 The scope-cut ladder (if time or capacity is short)
Cut in this order, from first to last:
1. Signature moments and extra visual polish beyond accessibility and clarity
2. Daily streak option (keep weekly)
3. Levels 16–30 (ship L1–15 first)
4. Recall Mode (keep Symbol Gym and Brackets)
5. Naming Switcher
6. Number Systems and IDs (keep basic numbers)
7. Heatmap richness (keep table and top-three weak spots)
8. Extra themes and layouts beyond three
9. Replay (keep results)
10. **Never cut:** accuracy of metrics, privacy behavior, accessibility basics, first-session win, honest measurement, license hygiene.

### 16.7 OpenCode prompt library (plain-English templates)
Use these as starting points; replace bracketed parts.
1. **Plan a task:** "Load [skills]. Read only [spec section]. For task [ID], propose a step list, the areas affected, risks, and the tests you will write. Do not write code."
2. **Build a slice:** "Implement only slice [X] of the approved plan. Add tests. Run typecheck, lint, and tests. Summarize changes in plain language."
3. **Explain a change:** "Explain this diff as if to a new team member: what it does, why, and what could break."
4. **Spec check:** "/spec-check [IDs]"
5. **UI review:** "@ui-reviewer review [path] against tokens, motion, caret rules, and accessibility; output the findings table."
6. **Accessibility:** "/a11y [page]"
7. **Animation audit:** "/anim-audit [path]"
8. **Performance:** "/perf" then "List the top five contributors and propose fixes; do not change code until I approve."
9. **Security:** "@security-auditor review [area] for injection, integrity, privacy leaks, secrets, and license risks."
10. **Flow to tests:** "/flow [flow name]" then "Write the Playwright test plan (happy path + three failure paths)."
11. **Generator:** "/drill [tier]" with "Ensure determinism and property tests."
12. **Data model:** "Propose the schema for [feature] with fields, indexes, retention, and privacy classification."
13. **Refactor safely:** "Refactor [area] without changing behavior; add characterization tests first."
14. **Bug triage:** "Given this bug report, list likely causes and a minimal test that reproduces it."
15. **Content pipeline:** "Add a pipeline gate that rejects items without a license entry; add tests."
16. **Experiment setup:** "Set up experiment [ID] per the brief; log exposures; add guardrail metrics; write the analysis plan."
17. **Copy audit:** "Search all UI text for guilt, urgency, or promises about speed, programming ability, or hireability; list occurrences."
18. **Simulation:** "Write a simulation test for [logic] using synthetic histories: [describe scenarios]."
19. **Release notes:** "Summarize merged PRs since [date] into user-facing release notes with no jargon."
20. **Retrospective:** "List what slowed us this week from the commit history and issue timestamps."

### 16.8 Glossary
- **Net WPM:** words per minute counting only correct characters (a word = 5 characters), with time for corrections included.
- **Difficulty band:** Easy/Typical/Hard label for prose from a typability score.
- **IKI:** inter-key interval, time between consecutive key presses.
- **KSPC:** keystrokes per character.
- **Rollover:** pressing the next key before releasing the previous one.
- **Weakness profile:** ranked items (keys, transitions, symbols) worth practicing, with explanations and confidence.
- **Drill:** a short practice set built from the weakness profile.
- **Focus/Push blocks:** accuracy-oriented vs speed-oriented practice blocks.
- **Token class:** category of code token (bracket, operator, number, identifier, etc.).
- **Skin:** language-specific version of a token-class drill.
- **Symbol Fluency Ratio:** speed on symbol-heavy drills divided by prose speed.
- **Baseline/retest:** a standardized test at the start and again at day 30 on matched text.
- **Holdout:** a group receiving a control experience to measure efficacy.
- **Freeze/pause/repair:** forgiveness features for streaks.
- **Integrity layer:** verification, plausibility checks, risk scoring, holds, appeals.
- **Session (test):** one typing attempt; **session (server):** a signed record authorizing a verified attempt.

### 16.9 Keeping documents in sync
1. The **master spec** is the source of truth for *what*; this guide is the source of truth for *how*.
2. When a decision changes scope, update the spec first, then the guide, then the board.
3. Record every change in the Decision Log and the spec changelog.
4. Review the docs at the end of each milestone (30 minutes).

### 16.10 Start here tomorrow (ten actions)
1. Read chapters 0–2 and write your hypotheses and thresholds (R0-01).
2. Recruit your first 12 interview participants (R0-02).
3. Create the license register and mark GPL/AGPL sources as do-not-copy (R0-08).
4. Book two days for technical spikes S1–S3 (R0-07).
5. Create accounts and the repository with branch protection (M0-01 to M0-02).
6. Install OpenCode, copy the kit, and vet the recommended skills (M0-08).
7. Write the design brief (§4.1).
8. Open the Decision Log and record D1–D17 defaults you accept (§1).
9. Run the first Plan-agent session for the scaffold (M0-10).
10. Schedule the R0 go/no-go review date (R0-10).

---

*End of the Implementation Guide. If you want any chapter expanded into a deeper standalone volume (for example: the engine, the weakness model, the token/level system, the retention system, the integrity layer, or the V1 race infrastructure), tell me the chapter number.*
