# Award-Level Playbook — Design, UX, Performance, Launch

**Date:** 20 Sep 2026
**For:** RealType typing website (see `typing-website-master-spec-v1.md` and `typing-website-opencode-build-playbook.md`)
**Answer to "is there anything else to search?":** Yes. This file covers what I researched this round, plus a prioritized research backlog for what I can search next.

**Legend:** ✓✓ official/primary source · ✓ credible secondary · **[vendor]** source sells something · **[inference]** my reasoning · **[proposal]** an idea or starting value to test

**Contents**
1. TL;DR
2. What "award-winning" can mean (three tracks)
3. How the juries score
4. What winners actually do (and the tension with a typing tool)
5. Rubric mapping: our plan vs. the criteria
6. Signature-moment ideas (creativity without hurting typing)
7. Art-direction options
8. Performance and engineering targets
9. Usability measurement plan
10. Award-readiness checklist
11. Launch and growth playbook
12. Awards strategy and timeline
13. Research backlog (what else I can search next)
14. Kit additions (new skill and command)
15. Caveats
16. Sources

---

## 1. TL;DR

- **Yes, there's more worth researching**, and I did the highest-value parts now: how the big awards score sites, what juries reward, Core Web Vitals targets, how to measure usability, and how Monkeytype and dev tools actually got users. A backlog of further searches is in §13.
- **Awwwards' official weights:** Design 40% · Usability 30% · Creativity 20% · Content 10%. At least 18 jurors score each site, and the 3 scores furthest from the average are dropped, so you need **broad quality, not one polarizing gimmick**. `[Awwwards-Eval]` ✓✓
- **Design + Usability = 70%.** That's good news for a tool: a fast, clear, accessible typing experience earns most of the score. `[Awwwards-Eval]`
- **The tension:** awards skew toward motion-heavy portfolio/brand sites `[WDA-Compare]` **[competing awards site]**, while our rule is *no decorative motion on the typing surface*. **Resolution:** keep the typing surface quiet; put craft and creativity at the edges (results, level map, "how it works" page, brand). Jurors say motion must be *meaningful and performant*, which matches our rule. `[Hontran-Winners]` ✓
- **Performance is part of the win.** Google's "good" targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile. `[WebDev-Vitals]` ✓✓
- **Measure usability, don't guess:** System Usability Scale (SUS) average is 68; above 80.3 is top 10%. `[MeasuringU-SUS]` ✓
- **Growth lesson:** Monkeytype started as a quarantine project, was shaped by feedback on a Reddit prototype, and grew through community-contributed themes/languages and Discord. `[Monkeytype-About]` `[KBD-Interview]` ✓
- **Honest expectation:** an Honorable Mention-level result is a realistic craft target; Site of the Day is very competitive. Pursue award-level craft because it also improves real usability, speed, and accessibility, but never let it distort the typing surface.

---

## 2. What "Award-Winning" Can Mean (Three Tracks)

| Track | What wins | Evidence of success |
|---|---|---|
| **Design awards** (Awwwards, CSS Design Awards, FWA, Webby) | Art direction, usability, creativity, content, engineering | Badges, featured placement |
| **Usability excellence** | Users complete tasks easily and would recommend it | SUS ≥ 80, task success, low errors |
| **Product/community success** | People adopt it and contribute | Retention, GitHub/Discord activity, word of mouth |

These overlap but aren't the same. A site can win a design award and have poor retention, or be loved and never enter an award. **Plan for all three**, but let usability and product success decide trade-offs.

---

## 3. How the Juries Score

| Award | Criteria | Notes |
|---|---|---|
| **Awwwards** | **Design 40%, Usability 30%, Creativity 20%, Content 10%** ✓✓ | ≥ 18 jurors; the 3 scores furthest from the average are dropped; 5-day voting; PRO-user votes count `[Awwwards-Eval]` |
| Awwwards: Honorable Mention | Score ≥ 6.5 ✓ | Reported by secondary sources `[Utsubo]` `[Hontran-Criteria]` |
| Awwwards: **Mobile Excellence** | Google mobile criteria, ≥ 70/100 ✓ | Secondary sources `[Hontran-Criteria]` `[Medium-Streza]` |
| Awwwards: **Developer Award** | SOTD winners go to a developer jury; score above 7 wins it ✓✓ | Focus: inclusive across devices/browsers, accessibility, quality code `[Awwwards-Eval]` `[Awwwards-Dev]` |
| Awwwards: Site of the Month | Top 8 sites each month get a second jury review ✓✓ | `[Awwwards-Eval]` |
| **CSS Design Awards** | UI, UX, Innovation ✓ | WOTD needs an average judge score above 8.00; 6.0–7.99 gets Special Kudos; year-end has Solo/Studio/Agency tiers `[Utsubo]` |
| **Webby Awards** (Websites & Mobile Sites) | Content, Structure & Navigation, Visual Design, Overall Experience, Functionality, Interactivity ✓✓ | ~13,000 entries in the 30th edition; Official Honorees are < 20% of entries `[Webby-Facts]` `[Webby-Process]` |

**Read this:** Awwwards' "Usability" and Developer Award reward *function and inclusivity*, not just looks. That's exactly where a well-engineered typing tool can compete.

---

## 4. What Winners Actually Do (and the Tension with a Typing Tool)

**Patterns reported by jurors and industry write-ups** ✓ (mostly secondary)
- **Strong, specific art direction** plus **directed, meaningful motion**, holding ~60 fps on a mid-range phone. `[Hontran-Winners]`
- **Restraint:** transitions that "never call attention to themselves" and typography with confidence. `[Hontran-Winners]`
- **Craft and technical execution:** juries reward polish and punish jank. `[Hontran-Winners]` `[MadeForAward]` **[vendor]**
- **Fundamentals:** semantics, SEO, responsive behavior, web performance; Awwwards publishes page-level considerations for many winners including accessibility, animations, and WPO. `[BMG-2026]`
- **Cross-device parity:** touch interactions replace hover intentionally. `[Utsubo]`
- **Special pages matter:** one guide reports Awwwards asks for images of pages like 404, loading, and contact, and rates them. `[Medium-Streza]` *(dated 2022; verify on submission)*
- **Skew:** one competing awards site says Awwwards fits visual-first portfolios, motion-heavy work, and brand storytelling. `[WDA-Compare]` **[competitor]**

**The tension**
| Awards reward | Our typing tool needs |
|---|---|
| Expressive motion, cinematic feel | Zero latency, zero distraction while typing |
| Distinctive brand moments | Calm, adult, focus-first |

**Resolution [proposal]**
1. **Typing surface = quiet.** Only the caret moves (transform); state changes are instant.
2. **Creative moments live at the edges:** results reveal, level map, keyboard heatmap, "how we calculate," landing/brand story, share cards.
3. **One "Story" page** (`/how-it-works`) can carry richer motion (lazy-loaded, marketing-only) without touching the typing path.
4. **Everything runs within performance budgets** (§8) and has a reduced-motion path.

---

## 5. Rubric Mapping: Our Plan vs. the Criteria

| Criterion | Jurors look for | Our plan | Actions (gaps) |
|---|---|---|---|
| **Design (40%)** | Art direction, typography, layout, consistency, polish | Tokens, themes, results "hero", calm editorial look | Choose an art direction (§7); custom type pairing; icon/illustration style; motion language; get 3 outside design critiques before submitting |
| **Usability (30%)** | Clear navigation, speed, mobile, accessibility, error handling | Guest-first, keyboard-first, no popups, SUS ≥ 80 target | Usability tests (§9); design **404 / loading / empty / offline / error** states as first-class pages; honest mobile mode |
| **Creativity (20%)** | Originality, innovation | Diagnose→drill loop; programmer token track; signature moments (§6) | Prototype 3–4 signature moments; cut any that hurt latency |
| **Content (10%)** | Clear copy, imagery, storytelling | "How we calculate", public efficacy report, calm microcopy, changelog/roadmap | Write the brand voice guide; publish honest metrics; blog with drills |
| **Developer/engineering** | Performance, accessibility, semantics, browser support | CWV targets, axe in CI, semantic HTML, PWA (V1) | RUM with web-vitals; CI budgets; cross-browser matrix; legacy-browser fallbacks |
| **Mobile** | Fast, tappable, battery-friendly | Honest phone experience; PWA | Test on throttled mid-range devices |

*Use `/award-audit` (kit addition, §14) to run this rubric against your build.*

---

## 6. Signature-Moment Ideas (Creativity Without Hurting Typing)

All are **[proposals]**: prototype, test with users, and cut anything that hurts latency, clarity, or accessibility. None touch the typing path.

1. **Rhythm ribbon (results):** a waveform of your inter-key intervals, your "typing signature," with hover details on slow bigrams. It's real data, not decoration.
2. **Token spectrum (code mode):** results show how your time splits across token classes (brackets, operators, numbers, identifiers), with subtle color-coding that also appears as quiet underlines while you type.
3. **Keyboard heatmap with typo arrows:** keys colored by cost; arrows from intended → typed key. Animate once on reveal; provide a table alternative.
4. **Keyboard-shaped level map:** the 12 tiers laid out like keyboard clusters (brackets, operators, numbers…) so the brand and the curriculum are the same idea.
5. **Interactive "How we calculate":** drag sliders (errors, time) and watch metrics recompute. Turns transparency into a signature and scores well on Content.
6. **Ghost replay (V1):** race your past self with a ghost caret.
7. **Optional sonic identity:** tactile keyboard sound packs, off by default, user-controlled, never the only feedback channel; check sound licensing.
8. **First-keystroke intro:** a one-time brand reveal ≤ 600 ms on first visit that yields instantly to the test; skipped on repeat visits.

---

## 7. Art-Direction Options

**[proposals]**, not researched winners. Pick one and write a one-page design brief.

| Option | Feel | Risk |
|---|---|---|
| **A. "Quiet Instrument"** | Editorial type pairing, warm neutrals, generous whitespace, one accent, optional tactile sound | Can feel plain without strong typography |
| **B. "Terminal Poetry"** | Dark-first, monospace-forward, syntax-color accents | Can feel niche/cold for non-programmers |
| **C. "Keyboard Lab"** | Playful, keyboard-inspired shapes and color | Can feel childish; conflicts with adult positioning |

**Recommendation [inference]:** **A + B hybrid**: calm and adult overall, with developer-native accents inside `/code`.

**Design brief template:** audience · feeling in 3 words · type pairing · palette (with contrast checks) · motion language (tokens) · sound stance · 5 reference sites · 3 things we will *not* do.

**Moodboard task:** collect 15 references and analyze 5 award-winning *tool/education* sites. I have **not** vetted a list of such sites yet; ask me to research it (§13).

---

## 8. Performance and Engineering Targets

**Core Web Vitals "good" thresholds** (measured at the 75th percentile, mobile and desktop separately) ✓✓ `[WebDev-Vitals]`
| Metric | Good |
|---|---|
| LCP (loading) | ≤ 2.5 s |
| **INP (responsiveness)** | **≤ 200 ms** |
| CLS (visual stability) | ≤ 0.1 |

- **INP replaced FID on 12 Mar 2024** and reflects the responsiveness of interactions during the visit (clicks, taps, keypresses). `[PPC-Land]` ✓ That makes it directly relevant to a typing app.
- **Our internal typing-latency target (p95 ≤ 16 ms)** is stricter than INP and is a **[proposal]** for smoothness; INP is what Google measures in the field.
- **Field data beats lab data:** thresholds are evaluated on real-user data at the 75th percentile. Add real-user monitoring (e.g., Google's `web-vitals` library **[general knowledge; verify via Context7]**) and track LCP/INP/CLS per page.
- **Test like a juror does:** open DevTools, throttle CPU and network, and watch transitions and frame rates on a mid-range profile. `[Hontran-Winners]`
- **Mobile Excellence:** aim for ≥ 70/100 on Google's mobile criteria. `[Hontran-Criteria]`
- **CI budgets:** bundle size, long tasks (> 50 ms), latency harness, Lighthouse CI.

---

## 9. Usability Measurement Plan

**SUS (System Usability Scale)** ✓
- 10-question standardized survey; **average is 68**; **above 80.3 is top 10% (grade A)**. It's not a percentage. `[MeasuringU-SUS]`
- Reasonably stable with about 8–12 participants; 20+ gives better reliability. `[UXArmy-SUS]` `[Lyssna-SUS]`
- SUS tells you *whether* there's a problem, not *where*; pair with task testing. `[UXtweak-SUS]`

**Plan [proposal]**
| When | What | Target |
|---|---|---|
| R0 prototype | 5-person moderated test of the first-visit flow | Find blockers; iterate |
| Beta | SUS survey + task metrics | SUS ≥ 75 |
| Pre-submission | SUS with 12+ users | **SUS ≥ 80** |

**Tasks to test:** take a first test; find and start a drill from results; switch theme and reduce motion; start the programmer baseline; pass a level; export data; recover from an offline submit.

**Typing-specific metrics:** time to first keystroke · first-test completion rate · "practice these" click-through · drill completion · error/backtrack counts.

---

## 10. Award-Readiness Checklist

**Design**
- [ ] One clear art direction, applied consistently across all pages
- [ ] Custom typography pairing; contrast verified in every theme
- [ ] Motion language documented; consistent easings/durations
- [ ] Share cards and social previews polished

**Usability**
- [ ] SUS ≥ 80; task success ≥ 90% on core flows
- [ ] Keyboard-only path for the core loop; visible focus everywhere
- [ ] **404, loading, empty, offline, and error states designed** (not defaults)
- [ ] Mobile is honest and fast; touch targets ≥ 24 px

**Creativity**
- [ ] 2–3 signature moments shipped and tested
- [ ] At least one interaction people screenshot or share

**Content**
- [ ] Brand voice guide; calm, adult microcopy
- [ ] "How we calculate", changelog, roadmap, efficacy report

**Developer**
- [ ] CWV green at p75 in field data; Lighthouse CI budgets pass
- [ ] axe clean; screen-reader pass; reduced-motion pass
- [ ] Semantic HTML, sensible metadata/SEO, no console errors
- [ ] Cross-browser (Chromium, Firefox, WebKit) and layout matrix
- [ ] PWA/offline behavior tested [V1]

**Trust**
- [ ] Privacy page and retention policy match behavior
- [ ] Licenses/attributions page complete

---

## 11. Launch and Growth Playbook

### 11.1 Lessons from Monkeytype's rise ✓
- **Started small:** a quarantine project; the founder disliked existing sites as outdated, with odd typing mechanics or poor UX. `[KBD-Interview]`
- **Prototype feedback loop:** a prototype was posted on Reddit and improved from the response; official launch was 15 May 2020. `[Monkeytype-About]` `[EverybodyWiki]`
- **"Took the scene by storm in a few days"** after release. `[KBD-Interview]`
- **Community as a growth engine:** contributors add themes, languages and fixes; a Discord bot assigns optional roles from performance and challenges. `[Monkeytype-About]` `[MT-Repo]`
- **Funding without blocking users:** donations, optional ads, merch and Patreon. `[Monkeytype-About]` `[Patreon-MT]`

**Actions for us [proposal]**
1. Ship a **rough but usable** prototype to a niche first (typing/keyboard hobbyists and developers), and publicly iterate on feedback.
2. Make **themes, languages, and drill packs contributable** (if open-sourcing; mind licensing).
3. Run a **Discord** with challenges and optional roles; keep it low-moderation-cost.
4. Publish a **public roadmap and changelog** (already in the spec).

### 11.2 Launch channels
- **Show HN (Hacker News):** strong for developer tools; success hinges on technical merit and no marketing fluff; a simple title format like "Show HN: Name – one-sentence technical description" works; the product should be usable without a complex signup. `[DevTo-Launch]` `[DailyDev-HN]` It "converts unusually well for developer tools and unusually badly for consumer apps," so **lead with the programmer track** on HN. `[Favors-HN]` **[inference on positioning]**
- **Rules:** don't solicit upvotes or comments; coordinated voting gets penalized. `[Favors-HN]`
- **Product Hunt:** in 2026 engagement signals matter more than raw upvotes and it's saturated; start preparation 4–6 weeks earlier; it can be "a net negative" if it's your only channel. `[LaunchList-PH]` `[DevTo-Launch]`
- **Other venues:** DevHunt (dev tools), BetaList (pre-launch waitlists), Indie Hackers (milestone posts). `[DevTo-Launch]` `[ToolIndex]`
- **Treat launch as a process,** not an event: permanent, indexed pages (docs, guides, threads) keep earning traffic. `[DevTo-Launch]`

### 11.3 Sequencing [proposal]
1. **R0–beta:** waitlist + prototype feedback (typing/dev communities).
2. **Beta:** 50–100 users; publish the first efficacy findings with caveats.
3. **V1 polish:** launch on Show HN (programmer track story), then Product Hunt if you have a prepared campaign.
4. **After launch:** SEO guides that end in a drill; changelog posts; community events.

---

## 12. Awards Strategy and Timeline

| Award | Fit | Cost (verify) | When |
|---|---|---|---|
| **Awwwards** (HM, SOTD, Developer Award, Mobile Excellence) | Best fit for craft + usability + engineering | ≈ $65 per one comparison site `[WDA-Compare]` | After V1 polish and SUS ≥ 80 |
| **CSS Design Awards** | UI/UX/Innovation; has Solo tier | Check site | With Awwwards |
| **FWA** | Motion/innovation-oriented | Check site | Optional; only if signature moments are strong |
| **Webby Awards** (Websites & Mobile Sites, or Apps) | Broad criteria; established brand | Historically $495 for a single entry in 2024 `[Wikipedia-Webby]` | Watch the cycle; **dates conflict across pages I saw, check webbyawards.com** |

**Realistic expectations [inference]**
- **Honorable Mention** is a craft-and-usability bar; **Site of the Day** is decided among top scorers and is very competitive. `[Hontran-Criteria]`
- Awards tilt toward agencies and portfolio sites; a solo tool can compete but needs deliberate craft and outside critique.
- Submit **once the site is stable and polished**, not at MVP. Some awards need the site to stay live for months after entry (Webby requires it live through mid-2027 on the cycle I saw). `[Webby-Guidelines]`

**Timeline vs. the spec:** M2 (design system + typing surface) → M7 (polish) → V1 (~month 7) → submit.

---

## 13. Research Backlog (What Else I Can Search Next)

Ordered by value for "best possible site." Tell me which to run.

| # | Topic | Why | What I'd deliver |
|---|---|---|---|
| 1 | **Vetted list of award-winning tool/education/productivity sites** (Awwwards/CSSDA winners with typing, keyboard, learning, or app-like UX) | Real reference points | 15–20 analyzed references + patterns |
| 2 | **Competitor UI teardowns** (Monkeytype, Keybr, TypeRacer, Nitro Type, TypingClub) with screenshots | See what to beat | Screen-by-screen notes |
| 3 | **Visual identity**: type pairings (open-licensed), palette research, name/domain/trademark availability | Brand foundation | 3 brand directions + checks |
| 4 | **Sound design**: keyboard sound packs, licensing, latency, accessibility | Optional signature | Guidelines + license sources |
| 5 | **Privacy law for keystroke data** (India DPDP Act 2023, GDPR) | Legal safety | Requirements checklist |
| 6 | **SEO landscape**: "typing test", "typing for programmers" SERPs and content gaps | Organic growth | Keyword/content plan |
| 7 | **Hosting and cost at scale**: free tiers and pricing (static hosting, API, MongoDB Atlas, CDN) | Budget plan | Cost model by stage |
| 8 | **Gamification/retention research** (streaks, leaderboards, ethics) | Motivation without dark patterns | Evidence summary |
| 9 | **Accessibility patterns for custom typing inputs** and screen-reader testing | Developer Award readiness | Test scripts |
| 10 | **Payments for India** (UPI/Razorpay vs Stripe), if monetizing | OPS-09 readiness | Options + fees |
| 11 | **Open-source license choice** (MIT vs GPL/AGPL, CLA) | Community + legal | Decision matrix |
| 12 | **Privacy-friendly analytics + RUM tools** | Measure without trackers | Tool comparison |

---

## 14. Kit Additions (New Skill and Command)

Added to `realtype-opencode-starter-kit.zip`:
- **Skill `award-readiness-review`**: scores the build against the Design / Usability / Creativity / Content / Developer rubric, checks special pages (404, loading, empty, offline, error), performance budgets, accessibility, and outputs evidence-based scores with blockers.
- **Command `/award-audit <path or URL>`**: runs the rubric with the `ui-reviewer` subagent.
- `AGENTS.md`, `opencode.jsonc`, and the kit README now reference the new skill.

---

## 15. Caveats

- **Many sources are agency/juror blogs** or vendors; official pages (Awwwards evaluation, Developer Award, Webby facts, web.dev) are marked ✓✓.
- **Criteria and thresholds change.** Confirm current rules on each award's site before submitting.
- **Secondary-source numbers** (HM ≥ 6.5, Mobile Excellence ≥ 70/100, CSSDA > 8.00, fees) come from write-ups, not always official pages.
- **Webby 2027 dates conflict** across pages I saw.
- **I haven't vetted example winners** relevant to tools/education yet (§13 #1).
- **Signature-moment and art-direction options are proposals**, not validated with users.
- **No guarantee of awards.** Quality raises the odds; judging is subjective.

---

## 16. Sources

**Awards (official)**
- `[Awwwards-Eval]` https://www.awwwards.com/about-evaluation/ · `[Awwwards-Dev]` https://www.awwwards.com/developer-award/
- `[Webby-Facts]` https://www.webbyawards.com/about/webbyfact/ · `[Webby-Process]` https://www.webbyawards.com/awarding/ · `[Webby-Guidelines]` https://www.webbyawards.com/eligibility-and-guidelines/
- `[Wikipedia-Webby]` https://en.wikipedia.org/wiki/Webby_Awards (entry-fee history)

**Awards (secondary write-ups)**
- `[Utsubo]` https://www.utsubo.com/blog/award-winning-website-design-guide (agency)
- `[Hontran-Criteria]` https://www.hontran.dev/blog/awwwards-judging-criteria · `[Hontran-Winners]` https://www.hontran.dev/blog/best-award-winning-websites-2026 (juror/developer blog)
- `[BMG-2026]` https://bmgmediaco.com/trophy-hunters-the-best-award-winning-website-design-services/ · `[Medium-Streza]` https://medium.com/@alex.streza/a-guide-on-building-awwwards-worthy-websites-c4fa710b1c43 (2022)
- `[WDA-Compare]` https://www.webdesignawards.io/compare/awwwards-vs-web-design-awards (**competing awards site**)
- `[MadeForAward]` https://www.madeforaward.com/guides/website-awards (**vendor**)

**Performance and usability**
- `[WebDev-Vitals]` https://web.dev/articles/vitals · thresholds background: https://web.dev/articles/defining-core-web-vitals-thresholds
- `[PPC-Land]` https://ppc.land/core-web-vitals/
- `[MeasuringU-SUS]` https://measuringu.com/sus/ · `[UXArmy-SUS]` https://uxarmy.com/blog/system-usability-scale-sus/ · `[Lyssna-SUS]` https://www.lyssna.com/blog/system-usability-scale/ · `[UXtweak-SUS]` https://blog.uxtweak.com/system-usability-scale/

**Growth and launch**
- `[Monkeytype-About]` https://monkeytype.com/about · `[KBD-Interview]` https://kbd.news/Interview-3-years-of-Monkeytype-2019.html · `[EverybodyWiki]` https://en.everybodywiki.com/Monkeytype · `[MT-Repo]` https://github.com/eruhaji/monkeytype (mirror of the README) · `[Patreon-MT]` https://www.patreon.com/monkeytype
- `[DevTo-Launch]` https://dev.to/lightningdev123/beyond-product-hunt-a-technical-launch-guide-for-2026-i2j · `[DailyDev-HN]` https://business.daily.dev/resources/hacker-news-marketing-developer-tools-show-hn-launch-day-sustained-coverage/ · `[Favors-HN]` https://favors.dev/blog/show-hn-launch-guide · `[LaunchList-PH]` https://getlaunchlist.com/blog/how-to-launch-on-product-hunt-2026 · `[ToolIndex]` https://toolindex.net/blog/product-hunt-alternatives-where-to-launch-2026
