# Composition Mode and Draft Sprint — Prompts (V1 Content)

**Sourcing:** 100% original, written for this product. License: `original work — ours`.
**Maps to spec requirements:** MOD-05/MOD-06 (Composition mode), MST-11 (Draft Sprint), and the writer persona (P2/segment playbooks in the retention document).
**Design constraint restated from the spec:** composition text is measured (word count, timing, pauses, burst speed) but the text itself is **never stored** unless the user explicitly opts in — these prompts exist to *trigger* writing, not to be graded against a "correct answer," since there is no correct answer to a composition prompt by design.

---

## 1. Prompt categories and why each exists

| Category | Purpose | Target session length |
|---|---|---|
| **Reply prompts** | Simulate real work/life writing (the most common real typing task for most adults) | 5–10 min |
| **Explain prompts** | Simulate teaching/documentation writing, good for the programmer/technical persona | 10–15 min |
| **Reflect prompts** | Low-pressure, personal, good for a calm daily writing habit (writer persona) | 5–10 min |
| **Describe prompts** | Neutral, creative-adjacent without requiring fiction-writing confidence | 10–20 min |
| **Sprint-only micro-prompts** | Extremely short, single-sentence triggers for the 10-minute Draft Sprint mode specifically (typewriter/blur mode) | 10 min fixed |

**Difficulty/openness spectrum, deliberately varied:** some prompts are narrow and concrete (easy to start immediately), others are broad and reflective (harder to start, but produce more natural, sustained writing once started) — this variety matters because a batch of only-narrow or only-broad prompts would bias the composition-speed metrics toward one writing style.

---

## 2. Reply Prompts (25 prompts) — simulate replying to a real message

`COMP-REPLY-001` — A coworker asks if you can cover their shift this Friday. Write your reply.

`COMP-REPLY-002` — A friend invites you to a weekend trip but the dates don't quite work for you. Write back explaining and suggesting an alternative.

`COMP-REPLY-003` — Your landlord emails about a scheduled maintenance visit next week. Write a short reply confirming a time that works.

`COMP-REPLY-004` — A client asks for a status update on a project that's running a few days behind. Write your update.

`COMP-REPLY-005` — A family member asks what you'd like for your birthday this year. Write your reply.

`COMP-REPLY-006` — Someone on your team made a mistake in a shared document. Write a kind but clear message pointing it out.

`COMP-REPLY-007` — A neighbor asks if you can water their plants while they're away. Write your reply, including any questions you'd actually want answered.

`COMP-REPLY-008` — Your manager asks how a recent project went, in your own words. Write your summary.

`COMP-REPLY-009` — A friend asks for a restaurant recommendation for a date night. Write your reply.

`COMP-REPLY-010` — Someone compliments a piece of work you did. Write a genuine, not-overly-modest reply.

`COMP-REPLY-011` — A customer leaves a slightly frustrated review of something you made or sold. Write a calm, helpful response.

`COMP-REPLY-012` — A former coworker reaches out after two years to reconnect. Write your reply.

`COMP-REPLY-013` — Your team lead asks for one thing that's blocking your progress this week. Write your answer.

`COMP-REPLY-014` — A friend asks how you're really doing, and you decide to actually answer honestly. Write your reply.

`COMP-REPLY-015` — Someone asks you to explain, in plain terms, what your job actually involves day to day. Write your answer.

`COMP-REPLY-016` — A relative sends a long forwarded message you don't fully agree with. Write a respectful reply.

`COMP-REPLY-017` — Your gym or class instructor asks for feedback on a recent session. Write your reply.

`COMP-REPLY-018` — A friend is nervous about an upcoming interview and asks for advice. Write your reply.

`COMP-REPLY-019` — Someone asks why you chose the field or hobby you're currently in. Write your answer.

`COMP-REPLY-020` — A group chat is planning something and asks for your input on timing. Write your reply.

`COMP-REPLY-021` — A new employee asks you for one piece of advice for their first week. Write your reply.

`COMP-REPLY-022` — Someone asks what you've been reading, watching, or working on lately. Write your reply.

`COMP-REPLY-023` — A friend cancels plans last minute and apologizes. Write a reply that's honest about how you feel, kindly.

`COMP-REPLY-024` — Your doctor's office asks you to describe a symptom in your own words before your appointment. Write your description.

`COMP-REPLY-025` — Someone asks for your honest opinion on a decision they're about to make. Write your reply.

---

## 3. Explain Prompts (20 prompts) — simulate documentation/teaching writing

`COMP-EXPLAIN-001` — Explain how to make your favorite simple meal to someone who has never cooked before.

`COMP-EXPLAIN-002` — Explain the difference between two things people often confuse (your choice of topic).

`COMP-EXPLAIN-003` — Explain how you organize your week, as if teaching someone your system.

`COMP-EXPLAIN-004` — Explain a rule of a game or sport to someone who has never played it.

`COMP-EXPLAIN-005` — Explain why a small habit you have actually matters to you.

`COMP-EXPLAIN-006` — Explain how to get somewhere from your home, using only landmarks, no map.

`COMP-EXPLAIN-007` — Explain a mistake you made once and what you learned from fixing it.

`COMP-EXPLAIN-008` — Explain how something you use every day actually works, as best you understand it.

`COMP-EXPLAIN-009` — Explain your reasoning behind a decision you made recently that others questioned.

`COMP-EXPLAIN-010` — Explain how to stay calm during a stressful situation, using your own approach.

`COMP-EXPLAIN-011` — Explain the steps you'd take to learn a brand-new skill from scratch.

`COMP-EXPLAIN-012` — Explain why a rule (any rule, from any context) exists, in your own words.

`COMP-EXPLAIN-013` — Explain how to tell if produce (fruit or vegetables) is ripe, using whatever you actually know.

`COMP-EXPLAIN-014` — Explain the plot of a book or movie you like to someone who has never heard of it.

`COMP-EXPLAIN-015` — Explain how to pack for a short trip efficiently.

`COMP-EXPLAIN-016` — Explain what makes a good team member, based on your own experience.

`COMP-EXPLAIN-017` — Explain how you'd calm down a nervous first-time flyer.

`COMP-EXPLAIN-018` — Explain the basic idea behind a tool or app you use often, to someone who's never seen it.

`COMP-EXPLAIN-019` — Explain how to politely disagree with someone in a meeting or group setting.

`COMP-EXPLAIN-020` — Explain what "good enough" means to you when finishing a piece of work.

---

## 4. Reflect Prompts (25 prompts) — low-pressure, personal, daily-habit-friendly

`COMP-REFLECT-001` — What's one small thing that went better than expected today?

`COMP-REFLECT-002` — Write about a moment this week you'd like to remember later.

`COMP-REFLECT-003` — What's something you're avoiding right now, and why?

`COMP-REFLECT-004` — Write about a place that feels calm to you, and why.

`COMP-REFLECT-005` — What's one thing you've changed your mind about recently?

`COMP-REFLECT-006` — Write about something you're looking forward to, big or small.

`COMP-REFLECT-007` — What's a piece of advice you were given that turned out to matter more than you expected?

`COMP-REFLECT-008` — Write about a person who influenced how you think, without overexplaining why.

`COMP-REFLECT-009` — What's something you did today purely because you wanted to, not because you had to?

`COMP-REFLECT-010` — Write about a time you were more capable than you thought you'd be.

`COMP-REFLECT-011` — What's a question you've been sitting with lately?

`COMP-REFLECT-012` — Write about something ordinary that felt unexpectedly good today.

`COMP-REFLECT-013` — What's one thing you'd tell yourself from a year ago?

`COMP-REFLECT-014` — Write about a habit you're trying to build, honestly, including the parts that aren't going well.

`COMP-REFLECT-015` — What's something you noticed today that you might normally overlook?

`COMP-REFLECT-016` — Write about a small risk you took recently, or one you're considering.

`COMP-REFLECT-017` — What does a genuinely good day look like for you right now?

`COMP-REFLECT-018` — Write about something you're proud of that nobody else really noticed.

`COMP-REFLECT-019` — What's a worry you've been carrying that, written down, seems smaller?

`COMP-REFLECT-020` — Write about a conversation that stuck with you recently.

`COMP-REFLECT-021` — What's something you used to believe that you no longer do?

`COMP-REFLECT-022` — Write about what you're currently curious about, even if it seems unimportant.

`COMP-REFLECT-023` — What's a small comfort that's been helping you lately?

`COMP-REFLECT-024` — Write about a goal you have that you haven't told many people about.

`COMP-REFLECT-025` — What's one thing that's simpler than you used to think it was?

---

## 5. Describe Prompts (15 prompts) — neutral, creative-adjacent, no fiction confidence required

`COMP-DESCRIBE-001` — Describe the view from a window you know well.

`COMP-DESCRIBE-002` — Describe your morning from the moment you woke up, in plain detail.

`COMP-DESCRIBE-003` — Describe a sound you associate strongly with a specific place.

`COMP-DESCRIBE-004` — Describe someone you know well enough that a stranger could picture them.

`COMP-DESCRIBE-005` — Describe your ideal version of a quiet weekend, hour by hour.

`COMP-DESCRIBE-006` — Describe a smell that immediately takes you somewhere else.

`COMP-DESCRIBE-007` — Describe the last meal you really enjoyed, without listing it like a menu.

`COMP-DESCRIBE-008` — Describe a room in your home as if explaining it to someone who will never see it.

`COMP-DESCRIBE-009` — Describe the weather today in a way that isn't just a forecast.

`COMP-DESCRIBE-010` — Describe a walk you've taken many times, focusing on what you notice now versus the first time.

`COMP-DESCRIBE-011` — Describe an object on your desk or nearby and why it ended up there.

`COMP-DESCRIBE-012` — Describe the last thing that made you laugh, in enough detail that it makes sense to someone who wasn't there.

`COMP-DESCRIBE-013` — Describe a season you prefer over the others, and what specifically you like about it.

`COMP-DESCRIBE-014` — Describe the last time you were genuinely surprised.

`COMP-DESCRIBE-015` — Describe your commute or daily route, as if it were mildly interesting (it might be).

---

## 6. Sprint-Only Micro-Prompts (20 prompts) — for the fixed 10-minute Draft Sprint, typewriter/blur mode

**Design note specific to this category:** these are intentionally shorter and punchier than the categories above, since Draft Sprint mode (typewriter mode = no backspace, blur mode = text hidden while typing) works best with a prompt that gets someone writing in the first 10 seconds without much deliberation. Longer, more reflective prompts (like the Reflect category) can feel mismatched with the "just keep moving forward" mechanics of typewriter/blur mode.

`COMP-SPRINT-001` — Write about the first thing you'd fix if you had an extra hour today.

`COMP-SPRINT-002` — Write about the last thing you bought that you didn't need but don't regret.

`COMP-SPRINT-003` — Write about a rule you'd remove if you could.

`COMP-SPRINT-004` — Write about the best piece of unsolicited advice you've ever received.

`COMP-SPRINT-005` — Write about something you're better at than you give yourself credit for.

`COMP-SPRINT-006` — Write about a task you keep putting off and why it keeps happening.

`COMP-SPRINT-007` — Write about the last time you changed your plans at the last minute.

`COMP-SPRINT-008` — Write about something you'd explain differently if you had to teach it again.

`COMP-SPRINT-009` — Write about a small win from this week that nobody clapped for.

`COMP-SPRINT-010` — Write about the most useful thing currently within arm's reach.

`COMP-SPRINT-011` — Write about a decision that felt hard in the moment but obvious in hindsight.

`COMP-SPRINT-012` — Write about something you'd tell a beginner in your field or hobby.

`COMP-SPRINT-013` — Write about a time being early (or late) actually mattered.

`COMP-SPRINT-014` — Write about the last thing you fixed yourself instead of asking for help.

`COMP-SPRINT-015` — Write about a habit someone close to you has that you secretly admire.

`COMP-SPRINT-016` — Write about the most useful thing you learned this year, so far.

`COMP-SPRINT-017` — Write about something that took longer than expected, and why.

`COMP-SPRINT-018` — Write about a assumption you made recently that turned out to be wrong.

`COMP-SPRINT-019` — Write about the last time "good enough" actually was.

`COMP-SPRINT-020` — Write about one thing you'd do differently if this week started over.

---

## 7. Rotation and selection policy

**Total prompts delivered: 105** (25 reply + 20 explain + 25 reflect + 15 describe + 20 sprint-only).

**Selection rule for the product:** never show the same prompt twice to the same user within a 30-day window (tracked via the "seen items" mechanism already specified in the master spec's content system, §6.9, applied here to composition prompts the same way it applies to typing passages). Rotate categories so a user doesn't get five Reflect prompts in a row — alternate category on each session unless the user has a stated preference (a V1 personalization option: "I mostly want reflective prompts" vs. "give me a mix").

**Sizing against the spec's target:** the spec's content targets table lists "~50 [composition prompts, V1]" — this delivery of 105 **exceeds** that original target, specifically because composition prompts are cheap to write well (no licensing complexity, no code-parsing validation needed, unlike snippets) and having more variety directly reduces prompt-repetition fatigue, which the retention playbook flags as a real risk for daily-use content.

## 8. Register entries for this content

| item_id range | type | license | status | notes |
|---|---|---|---|---|
| COMP-REPLY-001 to 025 | composition-prompt | original work — ours | draft (needs second-reviewer pass) | Reply category |
| COMP-EXPLAIN-001 to 020 | composition-prompt | original work — ours | draft | Explain category |
| COMP-REFLECT-001 to 025 | composition-prompt | original work — ours | draft | Reflect category |
| COMP-DESCRIBE-001 to 015 | composition-prompt | original work — ours | draft | Describe category |
| COMP-SPRINT-001 to 020 | composition-prompt | original work — ours | draft | Sprint-only, shorter/punchier by design |
