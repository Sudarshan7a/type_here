# ALERT-1 — a `DONE-VERIFIED` row is not established by its cited evidence

**Raised by:** owner-proxy (AI), review 1. **Not the human owner.**
**Subject:** ledger row `CUS-01`. **Severity:** the finding itself is HIGH; the escalation is
procedural, because it is the "false `DONE-VERIFIED`" trigger in the escalation list.
**Confidence: HIGH.** Established by mutation, not by reasoning.

---

## The finding

`CUS-01` — *"Instant start; no ads/popups/modals on the typing surface"* — is marked
`DONE-VERIFIED`. Its cited evidence is `e2e/typing-surface.spec.ts AC4/AC6`.

AC6 asserts the no-overlap requirement by matching a hardcoded list of nine selectors:

```js
const selectors = ["dialog", "[role=dialog]", "[role=alert]", "[role=alertdialog]",
                   "[popover]", ".modal", ".popup", ".toast", ".tooltip"];
expect(interrupts, "no popup, modal or toast may appear while typing").toEqual([]);
```

I added this to `apps/web/src/App.tsx` in a scratch worktree at `334a6c1`:

```html
<div className="promo-banner" aria-modal="true">Congrats! Sign up to save your streak.</div>
```

**AC6 passed.** An upsell banner marked `aria-modal` on the typing surface — the precise thing
AGENTS.md rule 1 names first ("Typing surface is sacred: no popups, modals, ads") — is invisible to
the test the row cites.

The same mutation with the class `toast` **does** turn AC6 red. The test is not dead; it is a
blocklist, and it only fires on the names someone thought of.

## Why this is an escalation and not just a review finding

The escalation criteria include *"a false `DONE-VERIFIED` claim"*. This qualifies, with one
qualification I want stated plainly rather than glossed:

- **The feature is true.** I checked the shipped build in positive form — any visible, non-zero-size
  element in the document that is a `dialog`/`[role=dialog]`/`[role=alertdialog]`/`[popover]`/
  `[aria-modal]`, or a fixed-position element that is not the caret. Result: `[]`, at 1440px and
  360px, idle, mid-test and on the results panel. There is no overlay on the typing surface.
- **What is false is the verification.** `DONE-VERIFIED` is a claim about evidence, not about the
  product. The evidence does not establish the requirement.

`CUS-01` was not moved to `DONE-VERIFIED` in Session 8 — this predates it. It is raised here
because this programme has a recorded history of exactly this: 14 rows marked `DONE-VERIFIED`, 9 of
them false or vacuous. A sixth false verification sitting in the ledger is a pattern, not an
isolated slip, and the standing instruction is to assume overclaiming until a command says
otherwise. In this case a command says otherwise *about the product* and *about the evidence*, and
those are different verdicts.

## What is decided, and what is not

**Decided** (`DECIDED BY OWNER-PROXY (AI)`, in `STEER-5.md`): demote `CUS-01` to `IN PROGRESS`;
replace the blocklist with a positive-form assertion; require the replacement to be proven by a
mutation with a non-blocklisted overlay name before the row may return to `DONE-VERIFIED`.

**Not decided, and not queued as mine:** whether the shipped surface ever needs an overlay at all is
a product call, and the positive-form assertion should be written so that any future legitimate
overlay is an explicit, reviewable exception rather than a name the guard happens to miss.

**Reversal step:** restore the `DONE-VERIFIED` status and the AC6 text from `git show 334a6c1:
docs/FEATURE-LEDGER.md`. No code, contract or data changes are involved, so reversal costs one
commit.

## The fix, so nobody has to design it under time pressure

`scripts/check-policies.mjs` already scans 98 shipped files for the `BIZ-06` shape of this problem.
The same pass should assert that the typing surface's module graph contains no overlay construct at
all — `dialog`, `role=dialog`, `aria-modal`, `showModal`, `popover`, `Modal`, `Overlay`, `Dialog` —
which makes the rule structural rather than a list to remember.

And AC6 should stop asking "is any of these nine names present?" and start asking "is anything
visible painting over or interrupting the surface?" — the question I used in §4 of `REVIEW-1.md`,
which is stronger, shorter, and has no list to fall off.

## Owner action required

**None for the finding itself.** It is fully diagnosed and the fix is written. It is in
`STEER-5.md` as the Builder's second-priority task.

The owner is asked only for the standing item in `OWNER-QUEUE.md`: since this is the first review
performed by the same model as the Builder, the owner should personally look at the typing surface
before accepting that the redesign is ready. My measurements say the surface is internally
consistent. They cannot say whether it is any good.