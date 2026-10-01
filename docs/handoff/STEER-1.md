DECISION errorMode: APPROVED as proposed in HUMAN-ACTIONS.md (add
no-backspace and word-locked, CONTRACT_VERSION 1.3.0). Update every consumer
that validates the enum in the same change; add a test that 1.2.0 logs still
parse.
RETEST CADENCE: day-0-30
(keep 0/30/60 and 0/14/30 as presets; revisit before Phase 5 exit)
PRIORITY: fix F3, F2 and F1/F9 before starting Phase 4.
This STEER file is the answer. Do not wait for a RESPONSE file; update
HUMAN-ACTIONS.md to mark both decisions resolved.

NOTE: gh is installed and authenticated. Use real PRs via gh from now on
(Section 4 preferred workflow) and merge each one yourself only after CI is
green. Branch protection stays OFF by owner decision; mark that item
"ACCEPTED BY OWNER" in HUMAN-ACTIONS.md and do not raise it again.
The manual engine test will be done by the owner at the end; do not wait for it.