# pr-log: A2 — gate failure proofs (all gates now proven non-vacuous)

- **Task ID:** Session 2, Block A2
- **Branches:** three throwaway branches, all deleted after evidence capture; never merged
- **Proofs recorded (Section 2.3: every gate must FAIL on a bad change):**

| Gate | Bad change | Red run (step that failed) | Good change / counter-proof |
|---|---|---|---|
| Unit-test coverage (engine 85%) | untested function added to packages/engine | run 36473904305 — failed at "Unit tests (per-package coverage gates)" | test added → run 36490786968 **success**, coverage back to 100% — the gate is not passing because the package is empty |
| Bundle budget (200 KB gzip) | moment (×2 entries), lodash (CJS+ESM), luxon, jszip imported into apps/web (234.1 KB gzip locally) | run 36486751130 — failed at "Bundle-size check" | (budget itself verified in M0-10c green runs) |
| E2E smoke | smoke assertion broken ("NotRealType") | run 36487928156 — failed at "E2E smoke (Chromium)", every earlier step green | (e2e green runs on every merged branch) |
| Copyleft license gate | fixture package lists (unit tests, not installed deps) | tests assert GPL/AGPL/LGPL/OR-variants are caught | landed as a keeper slice: run 36423835116 green (see docs/pr-log/s2-a2-license-gate-test.md) |
| API rate limit / headers / redaction | (proven in Session 1, M0-12) | burst test → 429; header + redaction assertions | run 36372272261 green |
| Web CSP/headers (A5) | (new gate) | config-parse unit tests assert every directive | run 36472034584 green; e2e proves zero CSP violations under the headers |

- **Default decisions relied on:** throwaway branches deleted locally and remotely after run IDs were captured; no bad code entered main. One process slip during the bundle proof (edits briefly landed on main's working tree after a checkout) was caught and fully reverted before any commit — logged in BUILD-LOG.
- **Deferred:** none. Block A is now complete (A1 merge trail, A2 gate proofs, A3 toolchain record, A4 HUMAN-ACTIONS.md, A5 web headers).
