# HALT-PROXY-1 — owner-proxy review of Session 8

**Type:** PROXY-HALT. Scheduled stop. Not a Builder halt file and not an escalation of one.
**Date:** 2026-10-02 · Reviewed `HALT-H3-3.md` (Session 8) · `main` @ `334a6c1`
**Reviewer:** owner-proxy (AI). **I am not the human owner.**

---

## Files written this session

| File | What it is |
|---|---|
| `docs/proxy/REVIEW-1.md` | The review: baseline re-run, mutation audit, protocol compliance, measured UI pass, verdicts, findings |
| `docs/proxy/ALERT-1.md` | Escalation: `CUS-01` is `DONE-VERIFIED` on evidence I proved insufficient by mutation |
| `docs/proxy/OWNER-QUEUE.md` | The eight things only the owner can do, ordered by what blocks soonest |
| `docs/handoff/STEER-5.md` | Nine `DECIDED BY OWNER-PROXY (AI)` decisions and the Session 9 work order |

`docs/OWNER-PROXY-REVIEWER-PROMPT.md` was untracked and is now committed alongside them.

**Committed change is docs-only.** Two measurement scripts I wrote (`review-measure.mjs`,
`probe-resize.mjs`) were reviewer instrumentation; they lived only in the scratch worktree
`.proxy/mut`, which has been deleted along with `.proxy/base`. Two feature mutations were applied in
that scratch worktree and reverted. No product file was committed, pushed or merged.

---

## What I verified, and how

| Procedure step | Done | Result |
|---|---|---|
| 1. Read halt, report, BUILD-LOG, HUMAN-ACTIONS, ledger, STEER-1..4, git log, PR list | yes | 11 PRs, sessions 6–8 in scope |
| 2. Re-run the baseline in a clean worktree at `main` | yes | **every number in `HALT-H3-3.md` reproduces exactly** — lint, format, typecheck, 356 unit tests, coverage, build, 75.3 KB gzip, 19 e2e |
| 3. Audit `[SET: 3]` `DONE-VERIFIED` rows by mutation | yes | `NFR-16` **not vacuous**; `ENG-01` **not vacuous** (2 mutations); `CUS-01` **vacuous for its claim** |
| 4. Protocol compliance | yes | commit order correct; **no test weakened** — one removed test was replaced by two stronger ones; 3 of 4 merges after green; model ID recorded; no anti-goal; effort 65% product |
| 5. Effort allocation | yes | pass — product 1769 / tests 420 / docs 514 lines |
| 6. Run the app if UI changed | yes | Playwright (bridge unavailable — see below). Caret `dx 0.00, dy 0.00` in five conditions including after resize; no overlay in positive form; no overflow at 360px; reduced motion honoured |
| 7. Triage `HUMAN-ACTIONS.md` | yes | 8 items queued, ordered by what blocks soonest; 2 decided in STEER-5; the fonts `[GAP]` escalated because a licence judgement is not mine |
| 8. `REVIEW-<n>.md` | yes | 12 verdicts, 7 findings with command evidence |
| 9. `STEER-<n>.md` | yes | 9 decisions, all reversible, all labelled |
| 10. `HALT-PROXY-<n>.md` and stop | this file | — |

---

## Findings, in one line each

- **HIGH** — `CUS-01` cites AC6, which matches nine class names. An `aria-modal` upsell banner on
  the typing surface passes it. The product is clean; the *verification* is not. Demote.
- **HIGH** — the halt file's headline `MVP 6/97 DONE-VERIFIED` is **5/97**. `NFR-16` is `UNTAGGED`.
  Same wrong number in the session report and `BUILD-LOG.md`.
- **MEDIUM** — `68d8fcf` was pushed with CI **red** (run `36968224668`, `no-irregular-whitespace`
  ×3). `main` was never red and the session-end table is accurate, but the halt file does not
  disclose it while disclosing a far smaller slip in detail.
- **MEDIUM** — "19/19 across four browser projects" is wrong: three projects, all Chromium, and the
  config says Firefox/WebKit are unavailable.
- **MEDIUM** — `capture-visual-evidence.mts` orphans a `vite preview` on `:4173` every run on
  Windows. It did when I ran it. That same class of bug then made one of my own mutation results
  look green when it was red.
- **LOW ×3** — stale `TODO (M0-10)` in `ci.yml` for two stages that exist; `--text-pending` vs
  `data-char-state="untyped"` doc drift; `reuseExistingServer` has no checkout check.

---

## The WebBridge

I attempted the Kimi WebBridge first, per the review protocol's preference for it over Playwright.
The daemon started (`pid 2488`) and the extension connected (`v2.0.22`), but:

- `list_tabs` returned `{"tabs":[]}` — no browser window is open;
- `navigate` returned `{"error":"No current window"}`;
- the logs then showed `refused extension fldmhcel client b4579e42 — slot held by extension
  fldmhcel client 74c6881a` — two extension copies competing for the slot.

The bridge's own failure protocol says to stop and report rather than touch the browser or the
extensions. I did. Verification fell back to Playwright, which is the documented fallback and which
exercises synthetic input only. I did not relaunch Edge, and I did not touch any other agent's tab
or registry entry.

**This is `OWNER-QUEUE.md` item 1.** It is the first item because I hit it, and because the bridge
is mandatory at the pre-gate pass — so it will be hit again.

---

## Confidence, stated plainly

- **HIGH (80%+)** — every baseline number; both `ENG-01` mutations; the `NFR-16` gate firing; the
  `CUS-01` blocklist passing an `aria-modal` overlay; the ledger count being 5 not 6; the red CI run
  on `68d8fcf`; the three-project Chromium-only e2e config; the orphaned preview server; caret
  alignment at `dx 0, dy 0`; no overlay on the shipped surface.
- **MED (50–80%)** — that `CUS-01` should be demoted rather than have its evidence simply extended.
  The mutation is certain; the remedy is a judgement.
- **LOW (20–50%)** — that the `extra` and `missed` character states carry the dotted-strikethrough
  and dashed-underline cues the report describes. I produced only `untyped`, `correct` and
  `incorrect`. This is a gap in my check, not a defect in the product. **UNKNOWN, honestly.**
- **UNKNOWN** — whether the redesign is any good. My measurements establish internal consistency.
  They cannot establish that it matches the owner's concept, and that judgement is not mine.

---

## Same-model blind spot

I am `stealth/space-bunny-alpha`. So is the Builder. Two agents of one model share blind spots.

This is why almost every finding above is settled by a command rather than by reading code — five
mutations, a clean-worktree baseline, `gh run view`, `netstat`, and direct DOM measurement — and
why I discarded one of my own results rather than reporting it: my first caret probe read
`dy: 138.56` after a resize, which would have been a live BUG-a defect. It was my script picking a
target character from the wrong line. The corrected probe, comparing against a known index, reads
`0.00` in all five conditions. The product was fine; my first script was not.

**Owner spot-check due** is `OWNER-QUEUE.md` item 8. This is review 1 of every `[SET: 5]`, and this
is the first review where I could not fall back on a real browser at all.

---

## Decisions made, and their reversals

Nine, all in `STEER-5.md`, all `DECIDED BY OWNER-PROXY (AI)`, all reversible:

| # | Decision | Reversal |
|---|---|---|
| D1 | Demote `CUS-01`; rebuild AC6 in positive form; add a policy gate | restore status and AC6 text from `git show 334a6c1:docs/FEATURE-LEDGER.md` |
| D2 | Separate MVP / UNTAGGED / overall counts; gate them | delete the added check |
| D3 | State e2e coverage as three Chromium projects | wording only |
| D4 | `reuseExistingServer` must verify and print its checkout | revert config, additive |
| D5 | Kill the process tree; assert `:4173` is free after capture | revert, no shot behaviour changes |
| D6 | S8-B tests into CI as a merge condition; fix the `--filter` hole | revert workflow change |
| D7 | Never wait and merge in one shell invocation | process change |
| D8 | Disclose the red push in the halt file | additive |
| D9 | Decide two `[GAP]` tokens; escalate the font licence to the queue | edit `tokens.css`; picker is additive |

None touches real-world evidence, a launch flag, an exit criterion, a release approval, or anything
legally or financially consequential. The `[SET: 10]` ceiling was not reached.

**Not decided and not queued as mine:** the self-hosted-font licence, the waitlist provider, cloud
accounts, branch protection (`ACCEPTED BY OWNER`, not to be raised again), every real-device
measurement, and every Phase 0 exit criterion.

---

## Handover state

- `main` is at `334a6c1`, green on every gate. I changed no product code.
- Two worktrees (`.proxy/base`, `.proxy/mut`) created, used and removed. `git worktree list` shows
  only the main checkout and a pre-existing agent worktree.
- The local dev server on `:5173` that I started is stopped. Two orphaned listeners (PIDs 19216 and
  15660) that earlier runs had leaked were killed.
- The Kimi WebBridge **daemon is left running** (`pid 2488`) with its extension connected, because
  the owner may want it. It is harmless and the owner's item 1 needs it up.
- `docs/OWNER-QUEUE.md` item 8 asks the owner to add an `owner spot-check due` line every
  `[SET: 5]` reviews — reviews 5, 10, 15.
- `.proxy/` should be added to `.gitignore` by the Builder. I cannot: `.gitignore` is not a docs
  path, and touching it would be a protocol violation for me. The directory no longer exists, so
  nothing is untracked today.

---

**[RULES BROKEN]: none.**

I wrote no product code. I committed only `docs/proxy/*.md`, `docs/handoff/STEER-5.md` and
`docs/OWNER-PROXY-REVIEWER-PROMPT.md`. My two measurement scripts were reviewer instrumentation in a
scratch worktree that is now deleted; the two feature mutations I applied were in that same scratch
worktree and were reverted before it went. I started and stopped the local dev server and killed two
orphaned listeners my own runs had created. I did not touch other agents' WebBridge tabs or registry
entries, did not relaunch the browser, and did not touch the extensions.

**Stopping here.** Not looping on my own. The next move is the Builder's: read `STEER-5.md`, land
D6 first, and prove D1's replacement assertion red on the old bug before `CUS-01` goes back to
`DONE-VERIFIED`.