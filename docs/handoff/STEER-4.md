PRIORITY (owner override, record in Decision Log): before more Phase 2 work,
do a DESIGN PASS on the typing screen and the results screen only.

1. The owner's design concepts are in docs/design/. Read the README there.
   Treat them as the source of truth. Do not invent a style. Extract design
   tokens (colors, fonts, spacing, radii) into one tokens file the CSS uses.
   Where a concept does not cover something, make the smallest consistent
   choice and list it in HUMAN-ACTIONS.md for the owner to approve.
2. If a concept conflicts with a spec requirement (character states visible
   without color alone, no overlays on the typing surface, WCAG AA contrast,
   reduced motion), keep the spec requirement, adapt the visual treatment
   and list the conflict in HUMAN-ACTIONS.md. Do not silently drop either.
3. FIX THESE BUGS, each with a failing test first:
   a. Caret: must sit exactly on the current character, baseline-aligned.
      Test the caret rectangle against the target character rectangle on
      line 1, after wrapping to line 2, after Backspace, after resize, and
      at the very end of the passage. The owner saw it one character right
      and below the end of the text.
   b. The "Click here to start typing" prompt must not cover the passage text.
   c. After finishing, live stats and the result headline must show one
      consistent figure, or the live stats must be hidden. Find why they
      differed (14.3 WPM / 98.9% versus 58.0 WPM / 100.0%) and explain it.
   d. A wrapped line must not start with a visible leading space.
   e. Hide the caret after the test ends.
4. Verification: assert computed styles against the tokens, and layout at the
   breakpoints in Section 16. Save side-by-side screenshots of each screen
   next to its concept to docs/visual-evidence/ for the owner to review.
   "Looks like the concept" is not verification, and the owner's approval
   remains EXTERNAL EVIDENCE for design direction. Label results LAB PROXY.
5. When finished, write "Typing surface redesigned, ready for owner review"
   in HUMAN-ACTIONS.md with the exact command to run.
   