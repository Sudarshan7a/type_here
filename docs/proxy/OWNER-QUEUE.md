# OWNER-QUEUE — only the human owner can do these

**Maintained by:** owner-proxy (AI). **I am not the human owner.** Nothing below is decided by me,
and nothing below may be treated as approved.

Ordered by what blocks soonest. Estimates are for the owner, not for an agent. Everything I *can*
decide is in `docs/handoff/STEER-5.md`, not here.

Last updated: review 1 (Session 8, `HALT-H3-3`).

---

## 1. Open Edge with the Kimi WebBridge extension, and close the duplicate copy — 5 min

**Blocks:** every future reviewer verification pass, and the mandatory pre-gate browser pass
(Section 16.7). **This is item 1 because I tried it this review and it failed.**

What I observed, verbatim:

```
kimi-webbridge status -> {"extension_connected":false,...,"running":true}
kimi-webbridge start  -> daemon started (pid 2488)
kimi-webbridge logs   -> [ws] extension connected / hello from extension v2.0.22
kimi-webbridge status -> {"extension_connected":true,"extension_id":"fldmhceldgbpfpkbgopacenieobmligc",...}
list_tabs             -> {"ok":true,"data":{"success":true,"tabs":[]}}
navigate localhost:5173 -> {"ok":false,"error":{"code":"extension_error","message":"No current window"}}
logs                  -> [ws] refused extension fldmhcel client b4579e42 —
                          slot held by extension fldmhcel client 74c6881a (repeats quiet for 1m0s)
```

Two extension copies are competing for the daemon slot, and no browser window is open. The bridge's
own failure protocol says to stop and report rather than touch the browser or the extensions, so I
did. Reviewer verification fell back to Playwright, which is the documented fallback but exercises
synthetic input only — no OS keyboard layout, no IME, no dead keys, no Caps Lock.

**How you will know it is done:** `kimi-webbridge status` reports `extension_connected: true`
**and** `list_tabs` returns a non-empty array, **and** it stays that way across two calls a minute
apart. The daemon is already running; it is the browser side that needs attention. The Bridge is
also two majors behind (`v2.0.22` available, `v2.0.5` installed) — `kimi-webbridge upgrade` is
yours to run, not mine.

## 2. Run the two latency spikes on your real laptop — ~20 min, both

**Blocks:** `ENG-02` / `NFR-01` — the only two ledger rows standing between the programme and a
measured latency number.

`spikes/s1-latency/manual.html` and `spikes/s6-hidden-tab/manual.html`, then fill in
`spikes/RESULTS-TEMPLATE.md`. The lab proxy reads p95 **15.2 ms against a 16 ms budget** — 5% under.
That margin is inside the noise, so a lab number cannot settle it and the Builder has now said for
two sessions that the surface is "built so it can be measured". Built is not measured. This is the
only thing that moves those two rows, and no agent can do it.

**How you will know it is done:** `RESULTS-TEMPLATE.md` has your machine's real p95 in it, and
`BUILD-LOG.md` records it. If the honest answer is "it felt fine", that is worth writing down too —
but write the number, not the adjective.

## 3. Look at the redesign — ~20 min

**Blocks:** the visual direction of both screens, and confidence in M1 before Phase 2.

```
pnpm install
pnpm --dir apps/web dev
```

Then http://localhost:5173 and type the passage. Seven screenshots are in `docs/visual-evidence/`,
each paired with the section of `docs/design/` it implements. They are **LAB PROXY** — headless
Chromium, synthetic keystrokes.

I re-ran the capture pipeline myself on a clean build and it is honest: it throws rather than write
a shot whose layout moved across the shutter. I measured the caret at `dx 0.00, dy 0.00` on the
first line, on a wrapped line, immediately after a resize, and after resizing back. Caret is 2.00px
wide and a full 46.2px line tall. No overlay, no horizontal overflow at 360px, no motion under
reduced motion.

**None of that says whether it looks like your concept.** It says the numbers are consistent. The
judgement is yours, and Session 8 is a different screen from the one you reviewed in Session 7, so
please look again rather than assuming only the bugs moved.

**How you will know it is done:** a note in `BUILD-LOG.md` saying what you saw. "Looks fine" is not
useful here either — with the latency budget 5% under target, "felt fine" and "slightly laggy" are
both inside the noise.

## 4. Rule on the three design conflicts — ~15 min

**Blocks:** the visual direction. Three places where a concept in `docs/design/` and a hard
requirement disagreed, and the Builder kept the requirement and adapted the visual. That is the
rule I hold myself to as well, so I am not going to overrule it — but it changed your design, and
you should say whether you want it changed back.

1. **The start prompt** — 10 §3 wants a blurred scrim over the passage; your Session 7 bug was that
   the prompt covers the text. It now sits *below* the field.
2. **The hero KPI at 360px** — 09 §3 floors the result figure at 72px; "56.0 WPM" at 72px does not
   fit a 296px panel, so below your own 480px breakpoint the KPI steps down to `--t-h2`.
3. **Character states** — 09 §1 gives wrong a 2px underline and extra a dotted strikethrough, and
   the project forbids colour-only state. Both are implemented: every state carries a distinct
   non-colour cue *and* the pack's colour.

**How you will know it is done:** a yes or a correction per item, in `BUILD-LOG.md`.

## 5. Type on at least two keyboard layouts — ~30 min

**Blocks:** Phase 3 layout support and Phase 6 token attribution. Real-hardware evidence; no agent
can produce it.

Six layout maps were derived from physical key positions and cross-checked (same-finger rates land
at 14.8–16.0%, matching touch-typing research), but nobody has typed on them. Type one word per
layout with a key-event inspector open and note anything that produced the wrong character or the
wrong finger. QWERTY-UK, AZERTY and QWERTZ also still return `unknown` for AltGr/dead-key symbols —
resolving those needs a live keyboard too.

**How you will know it is done:** one word per layout logged in `BUILD-LOG.md`, with any wrong
character or wrong finger called out.

## 6. Start Track A recruitment today — 2–3 weeks elapsed, this is the long pole

**Blocks:** the Phase 0 go/no-go decision and the Day-14 gate memo.

A name list, then 12–15 interviews. This has weeks of elapsed time on it and nothing else in the
queue competes for the same calendar, so start it in the background while you work through items 1–5.
Exit criterion is 4 of 5 participants completing the first session unaided.

**How you will know it is done:** 10+ interviews synthesized into a one-page summary.

## 7. Set the daily AI usage cap — 5 min

The agent currently stops only at session boundaries; you asked for budget-based stops. A number
lives in the execution prompt Section 6 and the agent cites it in `BUILD-LOG.md`. (This item appears
**twice** in `HUMAN-ACTIONS.md` — I have flagged the duplicate to the Builder rather than editing it.)

## 8. Owner spot-check due — same-model blind spot

Review 1 was performed by **the same model as the Builder** (`stealth/space-bunny-alpha`). Two
agents of one model share blind spots, and this is the first review where that limit was live *and*
I could not fall back on a real browser.

So: items 3, 4 and 5 are not merely the design review. They are the check on me. My measurements
establish that the surface is internally consistent and that its assertions hold. They cannot
establish that the surface is right, and I have no standing to say so. Please treat the outcome of
REVIEW-1 as provisional until you have looked at it yourself.

---

## Not soon — listed so they are not lost, no action needed now

| Item | Why it is not urgent |
|---|---|
| `[GAP]` self-hosted fonts (Bricolage Grotesque, JetBrains Mono) | Licence judgement is legally consequential, so I cannot decide it. The bundle is 75.3 KB of a 200 KB budget, so there is room whenever you want it. **The screenshots currently show whatever fonts your machine has — not the pack's.** |
| Firefox / WebKit e2e | Needs `cdn.playwright.dev` to be reachable. Retry when the network allows. |
| Cloud accounts (Vercel, Render/Fly, Atlas, error tracking) | Not needed until M0-06/M0-07. |
| Privacy / data-protection professional | Required before beta (Phase 7). Weeks of lead time, but not yet on the critical path. |
| Waitlist form provider | The form ships disabled; no live signup is possible until this is chosen. |
| Third-party skill vetting | Optional skills only. |
| Branch protection on `main` | **`ACCEPTED BY OWNER` (STEER-1, Session 6). Not to be raised again.** Listed only so its absence from the queue is not read as an oversight. |

---

## For the record — what I decided this review, and did *not* put here

Nine decisions are in `docs/handoff/STEER-5.md`, all reversible, all labelled
`DECIDED BY OWNER-PROXY (AI)`. None of them touches real-world evidence, a launch flag, an exit
criterion, a release approval, or anything legally or financially consequential.

One thing I want to be explicit about, because it is the kind of item that gets quietly absorbed
into a queue: **ALERT-1 (`CUS-01`) needs no owner action.** The `DONE-VERIFIED` demotion, the
rewrite of the popup assertion, and the policy gate are all Builder work I have specified. It is
escalated because a sixth unverifiable `DONE-VERIFIED` row is a pattern worth surfacing to you, not
because it is waiting on you.