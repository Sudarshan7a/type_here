# HALT-H3-3 — Session 8

**Type:** H3 (scheduled stop; the slice STEER-4 ordered is complete). **Not** H1 and **not** H2.
**Date:** 2026-10-02 · Session 8 · commits `728dcf1` (tests, red by design), `68d8fcf` (implementation), `e03b2e7` (docs) on `task/s8-a-typing-redesign`, merged to `main` as PR #8 (`2755b44`) after CI green
**Driver:** STEER-4, which made the STEER-2 typing-slice design pass this session's first and only priority, and capped the session at one non-ledger task.

## Ledger counts (Section 18.10)

    MVP 6/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 |
    LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 6/216

24 IN PROGRESS, 185 NOT STARTED, 216 rows total.

## Ledger rows moved this session

| Row | From | To | Why |
|---|---|---|---|
| `CUS-02` | NOT STARTED | **IN PROGRESS** | The theme system landed: every colour, size, radius, duration and easing is a custom property in `apps/web/src/styles/tokens.css`, `design-tokens.test.ts` fails the build on a raw literal, and both the Daylight and Night Ink palettes are asserted on the **computed** style. Still open in that row: the switcher UI, a dyslexia-friendly face, a user-selectable caret style, and focus mode |

**No row moved to `DONE-VERIFIED`, and that is the honest outcome rather than a shortfall to explain away.** Four candidates each have named work still open:

- `ENG-02` / `NFR-01` — input-to-paint p95 is **unmeasured** in this surface. Built so it can be measured is not measured.
- `ENG-03` — D03's and D04's fixtures are still unwritten.
- `A11Y-01` — the full WCAG 2.2 AA sweep across every screen, 200% zoom and text-spacing override, and the screen-reader pass are still open. This session covered one screen.
- `CUS-02` — see above.

`PRG-04` was demoted from `DONE-VERIFIED` in Session 7 for precisely this reason: a row whose own note says "audit pending" is not a verified row. The same rule applies here.

## Counted tasks (Section 17.2)

| # | Task | Ledger rows moved | Tests added |
|---|---|---|---|
| 1 | The STEER-2 design pass on the typing and results screens, and the five defects it names | `CUS-02` | 16 unit + 6 e2e |

One counted task, within STEER-4's cap of one non-ledger task per session and below `[SET: 5]`'s absence — recorded rather than glossed. STEER-4 was explicit that no more gate, ledger-tooling or report-format work was to start until the slice ran and its acceptance criteria had tests, so the budget went there and on the two defects that work turned up.

## Progress events (Section 6)

1. **The typing and results screens are redesigned** against `docs/design/`, with every token extracted into one file that the CSS must consume and a gate that fails on a raw literal.
2. **The caret defect root-caused** — offsets read from the border box while the caret is positioned in the padding box, so padding was counted twice: +12px, one mono advance, and +16px.
3. **The live-readout defect root-caused to four causes**, the dominant one a units error that had been sitting on this page as a *known open defect* since Session 7: an absolute `performance.now()` against origin-relative event timestamps, dividing every live figure by the page's lifetime since load. It read 299.7 WPM against a headline of 58.0.
4. **A sixth defect found by disbelieving a screenshot** — the 360px capture and the DOM disagreed about the same page. The cause was 2px of slack deciding which side of a line break a space renders on. A one-pixel width sweep then found the defect live at **every width from 367px to 442px**, not at the single breakpoint the screenshot suggested.
5. **A measurement-based fix replaced with a structural one.** A word box now owns the space that follows it, so no break opportunity exists in front of a space. The fixed-point search, its tolerance, its pass cap and its attribute are deleted — and the invariant is now assertable without a browser.
6. **The mid-word breaks at 360px fixed by the same change** (BUG-f), which had the same root cause: every character used to be its own atomic inline box.
7. **Three tests caught being vacuous** before they could ship green proving nothing. Every new assertion in the session was proven bidirectional.
8. **Visual evidence made self-checking.** Seven LAB PROXY shots, each recording the measured layout beside the image; the capture throws rather than writing a shot whose layout moved across the shutter.

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

## Evidence labels — what is and is not claimed

Everything about the typing and results screens is **LAB PROXY (browser-inspected)**. The Kimi WebBridge was unavailable this session, so Section 16.3's Playwright fallback was used: synthetic input through a browser, which does not exercise the OS keyboard layout, IME, dead keys, Caps Lock or physical key positions. **No `REAL-DEVICE CONFIRMED` evidence is claimed anywhere.**

The seven shots in `docs/visual-evidence/` are LAB PROXY and are **not verification of the design direction**. STEER-2 §4 is explicit that "looks like the concept" is not verification; owner approval remains EXTERNAL EVIDENCE and is asked for explicitly in `HUMAN-ACTIONS.md`.

Input-to-paint p95 in this surface is **still unmeasured** (ENG-02, NFR-01). The surface is built so it *can* be measured — no React state per keystroke, one rAF-batched DOM write, character offsets read only on resize — but built is not measured, and the lab proxy to beat is 15.2 ms against a 16 ms budget.

## Open items handed on

- **Owner review of the design direction**, with seven screenshots to review against `docs/design/`.
- **Three design-vs-spec conflicts**, each resolved by keeping the spec requirement and adapting the visual, each logged and reversible: the start prompt below the field rather than a scrim over it; the hero KPI stepping down below the pack's own 480px breakpoint because the pack's 72px floor does not fit a 360px panel; and every character state carrying a non-colour cue in addition to the pack's colour.
- **Three `[GAP]` token decisions** the pack does not pin down: error/speed tones, caret style, and whether to self-host the three typefaces.
- **S8-B (F1–F9 dev-stack defects) is unmerged** and under independent review; `check:devstack` was reported as not yet wired into CI.

## External dependencies

Unchanged and not blocking: live-keyboard layout confirmation, AltGr/dead-key resolution, recorded fixtures on real keyboards, real-device spike numbers, prototype usability test, Firefox/WebKit e2e, cloud accounts, professional legal review.

**New:** the owner is asked to review the redesigned typing surface — `pnpm --dir apps/web dev`, then type the passage. Per STEER-1 the loop does not wait for it.

The Kimi WebBridge is a **human-only install on the human's machine**. It is mandatory at the pre-gate pass (Section 16.7) and should be retried at the start of a later session; until then the Playwright fallback stands.

Branch protection is OFF **by owner decision** and is not to be raised again.

## What I got wrong this session

Logged in full in `docs/sessions/SESSION-8-REPORT.md`. In short: I shipped a screenshot that contradicted the DOM because Playwright's `fullPage` re-lays the page out and I did not know that; I measured a stale build for part of one investigation because `child.kill()` on Windows kills the shell and not the `pnpm` grandchild, so orphaned preview servers held the port; I treated a measurement-based fix as finished when its test went green, when it was in fact failing at a dozen consecutive widths; and two of my three tests were vacuous after I had already declared them proven. Every one was found by a test, a gate, or by refusing to accept a number and a picture that disagreed — not by reading the code, which is the only reason they are found at all.

One more, and it is a process slip rather than a technical one: PR #9 (two documentation lines recording the merge) was merged while its CI was still `pending`, because the merge command was issued in the same shell invocation as the wait and did not check what it printed. The post-merge run on `main` is **green** (`quality`, success), so nothing landed broken — but the rule is to merge after CI green, not after CI has been launched. It should have been a separate command with the exit status read.