# First-session prototype (prototypes/first-session) — DISPOSABLE

A static, offline, no-build HTML page for the 5-person usability test (R0-06).
Open `index.html` directly in any browser — no server, no install, no network
(the page CSP forbids connections).

## What it demonstrates

The whole first-session flow in one sitting: land on the test → type a short
real passage (PROSE-01-004 from the prose library) → results screen →
"What to work on" with three items → "Practice these" → a short drill → the
same passage again → the delta → a dismissible save prompt.

## How to run the test with participants

1. Open `index.html` in a normal browser window.
2. **Tell every participant, before they start: this is a mock.** The
   numbers are illustrative, not measured. Never quote its numbers as
   results — not to them, not in notes, not anywhere.
3. Ask them to complete the flow unaided. Watch for: do they start typing
   without prompting? Do they understand "What to work on"? Do they find
   "Practice these"? Do they read the delta? Do they dismiss the save prompt
   without discomfort?
4. Record: 4-of-5 unaided completion is the Phase 0 exit criterion.

## Implementation notes

- Every visible string comes from `docs/content-ui-copy-string-tables.md`
  (exact text; the tone rules matter as much as the words).
- Per-character feedback is real (so typing feels right); every number —
  WPM, accuracy, the weakness items, the delta — is a canned constant.
- The persistent banner never disappears: "PROTOTYPE — numbers are
  illustrative, not measured."
- Keyboard-operable end to end (Tab restarts the test, matching the real
  product's keybinding; Escape leaves the surface). Reduced motion is
  respected. No storage, no network, no analytics.
- This folder is not part of the workspace build; nothing here ships.
