PRIORITY (owner override of roadmap order, record in Decision Log):
After the task in progress, build a THIN VERTICAL SLICE of the real Phase 3
typing surface BEFORE continuing Phase 1 tail and Phase 2. Use the real
engine path, not a parallel implementation. It must be the foundation of
Phase 3, not a throwaway.

Acceptance criteria (each verified by a test or DOM assertion, test-first):
1. A visible caret on the current character, moving on every keystroke.
2. Every character shows one state: untyped, correct, incorrect, extra,
   missed. States are distinguishable WITHOUT color alone (underline,
   symbol or weight). Expose as data-char-state attributes so tests can
   assert them.
3. Live net WPM and accuracy while typing.
4. An unfocused state with a clear "click here / start typing" prompt.
   The timer starts on first keystroke (ENG-04).
5. A clear FINISHED state: headline net WPM + accuracy, and Restart (Tab)
   plus New passage. Typing after the end does nothing.
6. No popups or modals on the typing surface (CUS-01); reduced-motion
   respected.

Ledger: advance rows to IN PROGRESS only. Mark DONE-VERIFIED only when the
row's full spec is met with a real test. Do not mark partial work verified.
Run the browser pre-check (Section 16) if the bridge is available, else the
Playwright fallback. When done, tell the owner in HUMAN-ACTIONS.md: "Typing
surface ready to try", with the exact command.  