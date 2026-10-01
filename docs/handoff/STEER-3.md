PRIORITY: the first counted task of the next session is the STEER-2 typing
slice, starting immediately. No more gate, ledger-tooling or report-format
work until the slice runs and its 6 acceptance criteria have tests. At most
1 non-ledger task per session. Do the D03/D04 fixtures first only if they
take under 30 minutes.
UNTAGGED rows: NFR-01..17 are normal rows, verified in the phase of their
area and again at the pre-gate pass. INT-10, BIZ-06, RET-21 are policies:
enforce each with a test or lint rule where possible, otherwise record
"policy, enforced by review" with the document that states it. Do not
invent MVP/V1 tags.
17.2 exception: if you are about to hit a context or time limit, write the
H3 file early and state that as the reason. Never claim the quota was met
when it was not.
REPORT: every halt file states "MVP x/97 DONE-VERIFIED" and lists the
ledger row IDs moved.