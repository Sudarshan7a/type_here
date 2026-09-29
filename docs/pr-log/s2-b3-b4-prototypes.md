# pr-log: B3+B4 — first-session prototype + waitlist concepts

- **Task ID:** Session 2, Blocks B3 + B4 (two disposable static prototypes, 4 files, one branch)
- **Branch:** task/s2-b3-b4-prototypes
- **Files touched:** prototypes/first-session/{index.html, README.md}, prototypes/waitlist/index.html, docs/waitlist-copy.md
- **Tests added:** none — prototypes are outside the workspace build, ship nowhere, and are exercised by human usability testing (R0-06 / the 3-concept waitlist test). CI still lints/formats what prettier covers.
- **Verification:** all copy strings match docs/content-ui-copy-string-tables.md exactly (welcome, hints, results headline/accuracy/classic-WPM, what-to-work-on title + item shapes, practice CTA, delta improved/steady, save prompt title/body/CTA/dismiss, a11y announcement, mode bar, duration picker, restart hint); the passage is real prose (PROSE-01-004, license: original work — ours); both pages declare a CSP forbidding all connections and contain no network/storage code; waitlist form is disabled by default (CONFIG.formActionUrl = null, no submit handler exists at all, button reads "Not connected yet").
- **Default decisions relied on:** B3 numbers are canned constants with a persistent banner; per-char feedback is real so typing feels right. B4 copy lives in docs/waitlist-copy.md as the editable source; the page mirrors it (a CSP-forbidden static page cannot fetch). Both prototypes fold B3+B4 into one branch (4 files, one reviewable slice of throwaway UI).
- **Deferred / human:** run the 5-person prototype test; run the 3-concept waitlist test and record conversion per concept; **AWAITING HUMAN DECISION — waitlist form provider** (form stays disabled; emails are new personal-data collection, Section 6 stop condition #2).
