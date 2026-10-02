# SESSION 8 REPORT

**Date:** 2026-10-02
**Model:** `stealth/space-bunny-alpha`
**Branch:** `task/s8-a-typing-redesign` · commits `728dcf1` (tests, red by design) and `68d8fcf` (implementation)
**Halt:** `docs/halt/HALT-H3-3.md`
**Engine model version:** 1.1.0 (unchanged this session — no formula changed)

---

## The session in one paragraph

STEER-4 ordered the STEER-2 typing-slice design pass as the session's first and
only priority, ahead of any gate, ledger-tooling or report-format work. The pass
redesigned the typing screen and the results screen against the owner's design
pack, extracted every token into one file the CSS must consume, and fixed the five
defects STEER-2 names. Two of the five had causes nobody had guessed: the caret
was offset by double-counted padding, and the live readout was dividing every
figure by the page's lifetime because an absolute `performance.now()` was being
compared against origin-relative event timestamps. A sixth defect was found late
and is the more interesting one, because it was found by *disbelieving a
screenshot* rather than by a test: the 360px capture and the DOM disagreed about
the same page, and the investigation ended in a structural fix and a rewrite of
how the evidence is captured.

---

## What was fixed, and what each defect actually was

### BUG-a — the caret sat one character right and a line low

Slots were measured from the passage's **border** box while the caret, positioned
at `left: 0; top: 0`, is laid out in the **padding** box. The 12px horizontal
padding was therefore counted twice — which is exactly one advance in the mono
stack — and the 16px vertical padding put the caret a full line below. The
offsets are now read from the padding box, and the caret's height comes from the
computed line height rather than the character box, because a character is an
inline box and its rect is the font's box, which is shorter than the line the
reader perceives.

Pinned at line 1, after wrapping to line 2, after Backspace, after resize, and at
the very end of the text.

### BUG-b — the start prompt covered the passage

10 §3 asks for a blurred scrim over the text. A prompt that hides the text the
user has to read costs them their place, so **the requirement won**: the prompt
sits below the field. The slot keeps its height whether or not the prompt is in
it, which also stops the controls below moving between mousedown and mouseup.
Logged in `HUMAN-ACTIONS.md` for the owner to rule on.

### BUG-c — the live readout and the headline disagreed (14.3 vs 58.0 WPM)

Four causes. Only the first was suspected.

1. `summarise` never subtracted paused time. `packages/engine/src/pauses.ts` does
   now, with `ENG-STATE-02` covering it.
2. `computeLiveSummary` had no pause awareness.
3. **The dominant one, and a units error.** The surface passed an absolute
   `performance.now()` as the live clock, while `InputCapture` stamps its events
   relative to the first accepted keystroke. `performance.now()` is absolute
   (since `timeOrigin`); the capture's timestamps are not. Every live figure was
   therefore divided by the page's lifetime since load — the readout read
   **299.7 WPM against a headline of 58.0**.
4. `finish()` cancelled the pending `requestAnimationFrame`, so the readout froze
   up to 250 ms stale. It now flushes the frame before cancelling.

Separately, the live bar labelled `keystrokeAccuracy` as "Accuracy" while the
headline showed `finalAccuracy`. Those are two different measures — the first is
per-keystroke, the second counts the final text — so the copy table now says
"Keystroke accuracy" and `docs/content-ui-copy-string-tables.md` records the
distinction.

### BUG-d — a wrapped line could open with a visible space

**This one deserves the long version.**

A space was rendered as its own atomic inline box, because an inline span cannot
be given a width and a space has to be able to collapse to zero. But CSS Text
permits a line break between two adjacent **atomic inlines**, so a top-level
space was a break opportunity — and a break in front of a space opens the next
line with it.

The first fix was to measure which spaces the browser had pushed to a line start
and collapse them to zero width, iterating to a fixed point because collapsing
one space reflows every line below it. That worked, in the same way a treatment
that is right 95% of the time works.

It was found by **not believing a screenshot**. The 360px capture showed line 3
as "I made extra" and line 4 as "rice in case your" — a line break in a place the
DOM said there was not one. Re-measuring the DOM at the same width said the space
was at the end of line 3 and nothing was collapsed. Both were right: the passage
fits 18 characters in a 326px box for 324px, so **2px of slack** decided which
side of the break the space rendered on, and a reflow the fixed-point search
never saw could settle it the other way.

Two things came out of chasing that:

- **A width sweep, one pixel at a time from 300px to 460px, found the defect live
  at every width from 367px to 442px** — not at one breakpoint as the single
  screenshot suggested. That test is now in the suite.
- **The fix became structural.** A word box now owns the space that follows it,
  so there is no break opportunity in front of a space at all. The fixed-point
  search, its 1.5px tolerance, its five-pass cap and its `data-line-leading`
  attribute are all deleted. The space keeps its own element, its own rect and
  its own state, because it is still a character the user produces.

Because the invariant is now structural rather than measured, it is also
assertable without a browser — `apps/web/tests/typing-surface.test.tsx` checks the
rendered markup: every character lives inside a word box, and every space is the
last character of one.

### BUG-e — the caret survived the test

Hidden with `visibility`, not `opacity`, so assistive technology and Playwright
agree it is gone.

### Not in STEER-2's list: mid-word breaks (BUG-f)

Found by looking at a screenshot, not by a failing test — which is precisely what
a test suite is supposed to have caught and did not. Every character used to be its
own atomic inline box, so there was a break opportunity between *every pair of
letters*. On a wide field the browser happened to break at spaces and the bug was
invisible; at 360px it shredded "whenever" into "wh / enever" on a line with room
several times over. Same root cause as BUG-d, and the same structural fix resolves
both: the **word** is the atomic box, not the character.

---

## Tests caught being vacuous

Three tests in this session passed on the build they were written to guard, which
means they would have shipped green while proving nothing. All three are recorded
in the code next to the assertion, because a future edit that relaxes them should
know why the assertion looks the way it does.

| Test | Why it was vacuous | How it was caught |
|---|---|---|
| BUG-c | Playwright types fast enough that page lifetime ≈ typing time, so the units error it guards is invisible | Added a 2 s wait before typing; it then failed with "live read 299.7 WPM against a headline of 768.5 WPM" on the restored bug |
| BUG-f (first version) | The geometric version measured a gap that does not exist — a mid-word break is still a **line** break, so the lines are flush and the only evidence is *which character* each line starts with | Rewritten textually; confirmed failing on the broken build |
| BUG-d (first version) | Reported a false positive: a line legitimately *does* begin with a collapsed line-leading space, which is bug (d) being fixed | Took the first **non-space** character instead |

Every new assertion in the session was proven bidirectional — fails on the
deliberately-broken build, passes on the fixed one. The structural unit test was
mutation-checked by reverting `groupIntoWords` and observing both it and the
existing per-character test fail (79 of 95 characters inside boxes).

---

## The design pass

Everything visual now comes from `apps/web/src/styles/tokens.css`, transcribed
from the owner's design pack. `apps/web/tests/design-tokens.test.ts` fails the
build if a raw colour literal appears in a component. Both palettes are asserted
on the **computed** style, so a token cannot quietly stop resolving.

Three non-obvious things that only showed up on screen:

- **`ch` resolves in the element's OWN font.** The measure is specified in `ch`
  (`--w-type: 68ch`), and the results panel was resolving it against a 16px UI
  face — coming out roughly a third narrower than the field above it. The mono
  font now stays on the panel and the children reset to the UI stack, which is
  where they should have been anyway. The first attempt at fixing this reset the
  font on `.finished` and made it *worse*, for the same reason.
- **The stage was not vertically centred**, because `.app { min-height: 100% }`
  had an auto-height parent to resolve against.
- **"56.0 WPM" wrapped across two lines at 360px**, because the pack's KPI floor
  of 72px is wider than a 296px panel. Below the pack's own 480px breakpoint the
  KPI steps down to `--t-h2`. The pack sizes the KPI for a desktop hero and says
  nothing about a phone; the adaptation is logged for the owner.

Accessibility: no state is signalled by colour alone — each character state
carries a distinct non-colour cue (2px underline / dotted strikethrough / dashed
underline), so the surface is readable in greyscale and in `forced-colors` mode.
The caret moves on `transform` only, and its transition lives inside
`prefers-reduced-motion: no-preference`, so a reader who asks for reduced motion
gets none rather than a shorter version.

---

## Visual evidence, and why it is now self-checking

`docs/visual-evidence/` holds seven shots, all **LAB PROXY**: headless Chromium,
production build, synthetic keystrokes. They are not REAL-DEVICE CONFIRMED and
they say nothing about a physical keyboard, a keyboard layout, an IME or a screen
reader. Per STEER-2 §4, "looks like the concept" is not verification, and owner
approval remains EXTERNAL EVIDENCE.

The first capture pass used Playwright's `fullPage: true` for the narrow shot.
**Chromium satisfies `fullPage` by resizing the viewport to the full content
height, which re-lays the page out from scratch.** The same 360px page measured
six wrapped lines before the shutter and seven after it, with a different
character advance, and the PNG recorded the seven. Nothing in the image said so;
read alone it looked like a plausible render.

A screenshot that quietly disagrees with the layout it claims to document is
fabricated evidence, just less obviously. So `e2e/capture-visual-evidence.mts`
now:

- never passes `fullPage`; every viewport is sized so the content fits, and a shot
  whose content overflows its viewport **throws** rather than being written;
- records the measured layout before the shutter — the wrapped lines, the
  character advance, the count of lines opening with a space, the count of
  characters outside a word box — and writes it into the README beside the image;
- re-measures after the capture and **throws** if the layout moved, so a shot that
  its own capture perturbed is dropped rather than filed.

All seven shots satisfy the three invariants: no line begins with a space, every
character lives inside a word box, and the layout is identical either side of the
capture.

---

## Verification at close

```
pnpm lint              0
pnpm format:check      clean
pnpm typecheck         0
pnpm test              0 — 356 unit tests, 0 failures
                         (engine 127, web 44, telemetry 101, schemas 69,
                          fixture-recorder 11, api 4)
pnpm build             0
pnpm check:bundle      75.3 KB gzip / 200 KB budget
pnpm check:licenses    pass
pnpm check:ledger      216 rows, all statuses and tags valid
pnpm check:policies    INT-10, BIZ-06, RET-21 all hold; 98 files scanned
pnpm e2e               19/19 across four browser projects, including
                       Node/Chromium metric parity (ENG-PARITY-01/02)
```

Coverage: engine 95.5% statements (gate 85%), web 81.4% (gate 60%).

---

## Ledger

| Row | From | To |
|---|---|---|
| `CUS-02` | NOT STARTED | IN PROGRESS |

**MVP 6/97 DONE-VERIFIED** — unchanged this session, and deliberately so.
`ENG-02`/`NFR-01` (input-to-paint), `ENG-03` (D03/D04 fixtures), `A11Y-01` (the
full WCAG sweep, 200% zoom, the screen-reader pass) each have named work still
open, and marking a row `DONE-VERIFIED` with open work is the failure mode this
program is built to avoid. `PRG-04` was demoted in Session 7 for exactly this.

`CUS-02` moves because the theme system genuinely landed: one token file, a gate
that fails on a raw literal, both palettes asserted on computed style, and seven
screenshots. Still open there: the switcher UI, a dyslexia-friendly face, a
user-selectable caret style, and focus mode.

---

## What is still unmeasured

**Input-to-paint p95 in this surface (ENG-02 / NFR-01).** Built so it *can* be
measured — no React state per keystroke, one rAF-batched DOM write, character
offsets cached and read only on resize — but built is not measured. The lab proxy
to beat is 15.2 ms against a 16 ms budget. This is the next counted task and the
owner is asked to run it in the same act as trying the surface.

The Kimi WebBridge was unavailable this session, so Section 16.3's Playwright
fallback stands. It is a human-only install and should be retried at session
start.

---

## What I got wrong this session

- **I shipped a screenshot that contradicted the DOM.** `fullPage: true` re-lays
  the page out, and I did not know that. I only caught it because the number and
  the picture disagreed and I refused to accept either one. The evidence is now
  self-checking for exactly this reason.
- **I tested a stale artefact for part of this investigation.** `child.kill()` on
  Windows kills the shell, not the `pnpm` grandchild, so orphaned preview servers
  held :4173 and I measured an old build while believing I had measured the new
  one. The numbers looked impossible — a character advance that changed with no
  font change — and chasing that is what exposed it.
- **I believed a measurement-based fix was a real fix.** The line-leading-space
  collapse was found doing exactly the wrong thing at a dozen consecutive widths,
  and the single-width test I had written for it passed throughout. The lesson is
  not "write more tests" — a one-pixel width sweep found it in under three
  seconds, and the *structural* assertion found it with no browser at all. It is
  that a fix whose correctness depends on measuring the thing it corrects is not
  finished when its test goes green.
- **Three tests were vacuous**, two of them after I had already declared them
  proven. Non-vacuity has to be demonstrated on the broken build every time, not
  remembered from when the assertion was written.
- **My first fix for the results-panel width made it worse**, for the same reason
  the original bug existed: `ch` resolves on the element itself, not on an
  ancestor.

---

## Next tasks

1. **Measure input-to-paint in the real surface** (ENG-02 / NFR-01). The surface
   exists; this is now the cheapest unblocked measurement in the programme.
2. **Review and merge the S8-B dev-stack work** — F3 in particular, because
   `pnpm dev` reporting success with a dead API is the exact command the owner is
   being asked to run.
3. **`ENG-FIXTURE-D03` and `ENG-FIXTURE-D04`**, still unblocked since PR #2, with
   the expected numbers recomputed independently per the arithmetic protocol.
4. **Owner review of the design direction**, and the three `[GAP]` token decisions
   in `HUMAN-ACTIONS.md`.