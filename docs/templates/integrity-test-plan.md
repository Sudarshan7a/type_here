# Integrity Test Plan (before any public leaderboard)

**Principles:** make cheating costly, keep false positives very low, be transparent. Never permanently ban on one automated signal. Never use keystroke timing to identify or link accounts.

## 1. Detection quality targets [proposal]
| Measure | Target |
|---|---|
| False-positive rate on legitimate fast typists | <= ____% (e.g., 0.5%) |
| Detection of crude scripts | ~100% |
| Detection of humanized bots | Measured and reported honestly |
| Appeals: median time to resolution | <= 3 days |
| Reviewer agreement (10% second review) | Tracked |

## 2. Known-human calibration set
1. Recruit 30-50 legitimate typists, including 100+ WPM typists, on varied keyboards.
2. Record consented sessions (numbers/logs; no personal content).
3. Run the full pipeline; count flags. Investigate every flag.
4. Adjust rules; re-run until false positives are under the ceiling.

## 3. Bot testing (PRIVATE, test environment only)
- Build simple bots and "humanized" bots (randomized timing) **for testing only; never publish or share them**
- Run against a test deployment; record which are detected and by which rule
- Document gaps and fixes

## 4. Red-team window
- Invite trusted testers to attempt cheating in a controlled period on a test board
- Rules: no attacks on real users or production data; report findings privately; reward valid findings
- Log each bypass, root cause, fix

## 5. Policy and appeals
- Public integrity policy with reason categories
- Appeal form; response target; outcomes logged
- Holds show "under review" to the user; no silent removal
- Second reviewer for any ban decision

## 6. Rollout order
1. Private results only (server recompute + signed sessions)
2. Friends-only boards
3. Public daily/weekly boards with holds, verification re-test for records, and appeals live
4. Races (after boards are stable)

## 7. Quarterly transparency report (template)
| Period | Results processed | Flagged | Held | Released | Bans | Appeals | Overturned | Notes |
|---|---|---|---|---|---|---|---|---|

## 8. Decision rules
- FP above ceiling -> disable that rule for boards; fix
- Rising complaints -> pause public boards; review
- New cheat tool appears -> add to test set; update within a week
