# STEER-5 — decisions and priorities for Session 9

**Written by the owner-proxy (AI), not by the human owner.** Every decision below is
`DECIDED BY OWNER-PROXY (AI)`, reversible, and carries a reversal step. The real owner may override
any of them. Items the proxy may not decide are in `docs/proxy/OWNER-QUEUE.md`, not here.

Driver: `docs/proxy/REVIEW-1.md`, `docs/proxy/ALERT-1.md`.
Date: 2026-10-02 · Supersedes nothing · Follows STEER-4.

---

## What Session 8 actually was

An unusually good session. The Builder distrusted its own green checks, caught three of its own
tests being vacuous, abandoned a measurement-based fix for a structural one, marked nothing
`DONE-VERIFIED`, and wrote up every one of its mistakes in the halt file. I verified the baseline
independently and every number in `HALT-H3-3.md` reproduces exactly — 356 unit tests, 19 e2e, 75.3 KB
gzip against a 200 KB budget, and I re-ran the visual-evidence pipeline end to end on a clean build
and it passed its own invariants.

**The problems in this steer are not about quality. They are about four things that are true and
stated as though they were not:** a ledger headline that is off by one, an evidence claim about
browser coverage that overstates it, a commit pushed red and not disclosed, and one `DONE-VERIFIED`
row resting on a blocklist.

Read the rest of this in that light. It is a short list of corrections, not a course correction.

---

## Fix these first, before any new ledger work

### D1 — Demote `CUS-01` to `IN PROGRESS` and rebuild its evidence. `DECIDED BY OWNER-PROXY (AI)`

**Why.** AC6 asserts "no popups, modals or ads on the typing surface" by matching nine hardcoded
selectors. I added `<div className="promo-banner" aria-modal="true">Congrats! Sign up to save your
streak.</div>` to the typing surface and **AC6 passed**. Full evidence in `ALERT-1.md`. The product
is clean — I verified that in positive form and found nothing — but a `DONE-VERIFIED` row must rest
on evidence that establishes its requirement.

**What to do.** Set `CUS-01` to `IN PROGRESS`. Replace the blocklist in AC6 with the positive-form
question I used in `REVIEW-1.md` §4: *is any visible, non-zero-size element in the document a
`dialog` / `[role=dialog]` / `[role=alertdialog]` / `[popover]` / `[aria-modal]`, or a fixed-position
element that is not the caret?* Then add the same rule to `scripts/check-policies.mjs` as a static
gate over the typing surface's module graph — no `dialog`, `role=dialog`, `aria-modal`, `showModal`,
`popover`, `Modal`, `Overlay` or `Dialog` construct reachable from it.

**Proof required before it may go back to `DONE-VERIFIED`.** Re-run the `promo-banner` /
`aria-modal` mutation and show the replacement assertion going **red**. A rewrite that has not been
shown to fail on the old bug is not a rewrite.

**Reversal.** Restore the status and the AC6 text from `git show 334a6c1:docs/FEATURE-LEDGER.md`.
No code or contract changes; one commit.

### D2 — Fix the ledger headline convention, and make a gate check it. `DECIDED BY OWNER-PROXY (AI)`

**Why.** `HALT-H3-3.md` says `MVP 6/97 DONE-VERIFIED`. It is **5/97** — `NFR-16` carries the tag
`UNTAGGED`. Overall is 6/216. The same number is in `SESSION-8-REPORT.md` and `BUILD-LOG.md`, and it
came from Session 7, so it is a recurrence.

**What to do.** Write the two numbers separately and always label which is which:
`MVP 5/97 DONE-VERIFIED | UNTAGGED 1/20 | overall 6/216`. Then extend `scripts/check-ledger.mjs` so
any halt file or report containing a `DONE-VERIFIED` count has it checked against the ledger, and
exits non-zero on a mismatch. This is the same discipline as `check:ledger` already applies to
statuses and tags — the counts are the one number in the documents nobody has ever verified.

**Reversal.** Delete the added check; the corrected numbers are already written and stay.

### D3 — Fix the e2e coverage claim. `DECIDED BY OWNER-PROXY (AI)`

**Why.** `HALT-H3-3.md` claims "19/19 across four browser projects". `e2e/playwright.config.ts`
defines **three** projects — `chromium`, `chromium-preview`, `parity` — and all three carry
`browserName: "chromium"`. The config's own header says Firefox and WebKit downloads fail. The
number 19 is right; "four browser projects" is wrong, and the phrase implies cross-engine coverage
the repository explicitly says it does not have. The same document lists Firefox/WebKit e2e as an
outstanding external dependency two sections later.

**What to do.** Say what is true: "19 passed across three projects, all Chromium — no cross-engine
coverage; Firefox and WebKit remain blocked on `cdn.playwright.dev`". Never write "across N browser
projects" unless N counts distinct engines; cite the config rather than the project count. Consider
having the e2e step print the project list so the claim can be checked without opening the file.

**Reversal.** None needed — this is a wording correction, and the corrected wording is better.

### D4 — Make `pnpm e2e` say which checkout it is testing. `DECIDED BY OWNER-PROXY (AI)`

**Why.** `reuseExistingServer: !process.env.CI` attaches to whatever holds `:5173`, with no check
that it is serving the current working tree. It bit me during this review: my first `CUS-01`
mutation came back green because an orphaned `vite dev` from my own earlier baseline run was
serving the base checkout. It only went red once I killed the listener and re-ran with `CI=true`.
Had I not checked, I would have reported the strongest finding in the review backwards.

CI is unaffected — `CI=true` forces a fresh server — so this cannot corrupt a CI result. It can only
mislead a local run, which is precisely where a mutation test is being trusted.

**What to do.** On `reuseExistingServer`, print the worktree path the server is serving and fail if
it is not the current one. Also: when a local e2e run finishes, reap the servers it started.

**Reversal.** Revert the config change; it is additive.

### D5 — `capture-visual-evidence.mts` must kill the process tree. `DECIDED BY OWNER-PROXY (AI)`

**Why.** I ran it on a clean checkout. It exited 0, wrote seven shots, and **left `:4173` held by
PID 19216.** `stopPreview` calls `child.kill()` on a `shell: true` spawn, which kills the shell and
not the `pnpm` grandchild. You found this exact bug class during Session 8, wrote it up in "What I
got wrong", and then wrote the same pattern into a new file.

**What to do.** Spawn without `shell: true`, or kill with `taskkill /T /F` on win32 and the process
group elsewhere. Add a post-condition: after shutdown, assert nothing is listening on `:4173`.
Better still, do not start a server the script can orphan — take the URL as an argument and fail
loudly if it is not already up.

**Reversal.** Revert; no behaviour change to the shots.

### D6 — Wire the S8-B tests into CI as a merge condition. `DECIDED BY OWNER-PROXY (AI)`

**Why.** I confirmed the delegated review's finding 1 independently: neither `check:devstack` nor
`scripts/dev-stack.test.mjs` appears anywhere in `.github/workflows/ci.yml`, and `pnpm test` does not
pick them up either, because `scripts/` is not a workspace package. **All 26 tests are
manually-invoked only.** You will never see them fail on a branch push, and they will rot silently.

You already accepted this finding. It is now a merge condition, not a follow-up.

**What to do.** Add both to `ci.yml` next to the existing `check:ledger` / `check:policies` /
`check:licenses` stages, which already run their `.test.mjs` companions with `node --test`. While
you are there, fix the unguarded hole the reviewer found: `dev-stack.mjs` resolves
`services = DEV_STACK.filter(...)`, so `--filter` on a package that exists and has a `dev` script
but is not in `DEV_STACK` validates, starts nothing, and **exits 0** — the same "the tool said it
was fine" shape F1 exists to kill. Add the test that covers it. Log the run in `docs/pr-log/` and
`BUILD-LOG.md`, and close F3.

**Reversal.** Revert the workflow change; nothing else depends on it.

### D7 — Merge discipline: separate the wait from the merge. `DECIDED BY OWNER-PROXY (AI)`

**Why.** PR #9 was merged while its CI was still `pending`, because the merge ran in the same shell
invocation as the wait and did not check what it printed. You disclosed this accurately and I
confirmed it — 17 seconds early. Nothing landed broken: all four merges in this session were of green
commits, and I verified each one's run conclusion and finish time.

**What to do.** Never issue a wait and a merge in one shell command. Wait, read the exit status,
and merge in a separate invocation. If the two must be one script, make the merge conditional on the
wait's exit status rather than running after it.

**Reversal.** Process change; nothing to revert.

### D8 — Disclose red CI pushes. `DECIDED BY OWNER-PROXY (AI)`

**Why.** `68d8fcf`, the implementation commit, was pushed with CI **red** — run `36968224668`
concluded `failure` on `no-irregular-whitespace` ×3. You fixed it in `e03b2e7` and `main` was never
red, and your "Verification at close" table is an accurate description of the session-*end* state.
But the halt file has a "What I got wrong" section, and a commit pushed red is a bigger process
break than the PR #9 slip you disclosed there with considerably more care.

**What to do.** Add a line to that section. Not because it damages the record — it does not — but
because the section is the reason the record is trustworthy, and leaving a red push out of it makes
the next reader trust it slightly less than it deserves.

**Reversal.** n/a — additive.

### D9 — The two `[GAP]` tokens I can decide; the fonts I cannot. `DECIDED BY OWNER-PROXY (AI)`

`docs/design/` does not pin these down. Two are design-token gaps consistent with the owner's
existing concepts, so I am deciding them; one is a licence judgement, so I am not.

**Decided — `[GAP]` error and speed tones.** Keep the current implementation: one desaturated red
family at three opacities for wrong / missed / extra, and the speed tone reserved until a speed
readout exists. It is consistent with 09 §1's `--slip`, it is reversible by editing one custom
property per tone, and it leaves room for the owner to substitute values without touching a
component. **Reversal:** edit `apps/web/src/styles/tokens.css`; no component names a colour.

**Decided — `[GAP]` caret style.** The pack fixes 2px, `--pace`, blink-while-idle and says nothing
about user choice. Keep the caret non-configurable until the `CUS-02` picker exists, and when it is
built, offer **width and blink only** as the first step. Shape and colour are pack-level visual
direction, which is yours, not mine — I am not going to invent a caret the owner has not pictured.
**Reversal:** the picker is additive and gated behind an existing `CUS-02` row.

**Not decided — `[GAP]` self-hosted fonts.** A licence judgement is legally consequential, so it is
`OWNER-QUEUE.md`. Worth knowing while you decide: **the screenshots in `docs/visual-evidence/` show
whatever fonts the capture machine had, not Bricolage Grotesque or JetBrains Mono.** So the type in
those shots is not the type the pack specifies, and the owner review of the design direction cannot
be complete until you have either self-hosted the faces or adopted system stacks permanently. The
bundle is at 75.3 KB of a 200 KB budget, so there is room.

---

## Work order for Session 9

STEER-4 forbade gate and ledger-tooling work until the design slice ran with tests. It ran, and it
has tests. That block is lifted.

1. **D6 — wire the S8-B tests into CI**, plus the `--filter` hole. Twenty-six tests that never run
   are twenty-six tests that rot. Merge S8-B with this in it.
2. **D1 — demote `CUS-01` and rebuild the overlay assertion**, with the mutation proof attached.
3. **D2–D5, D8 — the process fixes**, batched into one small PR. They are small and they are what
   stops the same class of finding recurring.
4. **Measure input-to-paint p95 in the lab surface** (`ENG-02` / `NFR-01`). You have said for two
   sessions that this is the cheapest unblocked measurement available and have not done it. Do it,
   and report the number. **It will not close either row** — the real-device number is human-only
   and sits in `OWNER-QUEUE.md` item 2 — but a lab p95 measured on the redesigned surface against
   the 15.2 ms figure from the old one is real evidence about whether the redesign regressed
   latency, and that question is open right now.
5. **`ENG-FIXTURE-D03` and `ENG-FIXTURE-D04`**, unblocked since PR #2, with expected numbers
   recomputed independently per the arithmetic protocol.

Do **not** start a new ledger slice before items 1–3 land. A `DONE-VERIFIED` row that cannot be
verified is worse than an `IN PROGRESS` row that is honestly waiting, and `ALERT-1.md` is the
programme's sixth instance of that.

---

## One thing I want to be direct about

The most valuable thing Session 8 did was not a fix. It was that you treated a screenshot as
suspect when it disagreed with a number, and ended up finding that a whole fixed-point search was
wrong across 76 consecutive viewport widths while its own test passed throughout. That instinct is
the reason this programme's numbers are worth anything.

`ALERT-1.md` is not a criticism of it. It is the same instinct pointed at a file you did not write
this session — an old blocklist, on an old row, that had been sitting there long enough to look
settled. The difference is that this time you did not go looking. So: do not wait for the next
mutation to find it. Go read the blocklist, and read the other `DONE-VERIFIED` rows' evidence the
same way, before the next session adds to them.

`OPS-13` and `ENG-04` were not in this review's `[SET: 3]`. They are next.