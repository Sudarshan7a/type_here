# Chapter 9 (Deep-Dive) — Token Engine and Levels, Part 2: Pass Criteria, Switch-Cost, Test Catalog

**Continues from Part 1.** This part directly uses the real content from `levels-02-boss-and-challenge-content.md` rather than inventing new examples, so the two files are cross-consistent and demonstrably work together.

---

## 9.4 Level pass criteria, worked against the ACTUAL Boss 1 content

**Recap of the rule (spec §6.5 and the boss scoring table):** best 3 of the last 5 attempts must meet accuracy AND speed (Symbol Fluency Ratio) targets; Boss 1 specifically requires "≤1 unmatched bracket" for the pass star.

### 9.4.1 The real Boss 1 content, restated for reference

From `levels-02-boss-and-challenge-content.md`, Boss 1 (Level 5, "Bracket Gauntlet") is this exact 10-line set:
```
() [] {}
(a) [1] {x}
list[items[0]]
result = fn(a, b, c)
data = {key: [1, 2, 3]}
config[section]["value"]
outer(inner(deep(x)))
map = {a: (1, 2), b: [3, 4]}
arr[func(x, y)]
obj = {list: [fn(1)], val: (2, 3)}
```

### 9.4.2 Worked scenario — a user's 5 attempts at this exact boss

**Attempt 1:** user types the whole set with 2 unmatched brackets (missed a closing `]` on line 6, missed a closing `)` on line 9), 96% character accuracy overall, took 45 seconds. Since bracket imbalance (2) exceeds the ≤1 limit, **this attempt does NOT count toward a pass**, regardless of accuracy/speed — bracket-imbalance is a hard gate specific to this boss level, not just another number averaged in.

**Attempt 2:** 0 unmatched brackets, 94% character accuracy, 42 seconds. Imbalance gate passes (0 ≤ 1). Character accuracy (94%) — checking against the Boss 1 table's Star 2 requirement of "0 unmatched, ≥95% char accuracy" — **94% is just below the 95% threshold**, so this attempt earns only 1 star (the pass star), not the 2nd (accuracy) star.

**Attempt 3:** 1 unmatched bracket (a single missed closing brace somewhere), 97% accuracy, 40 seconds. Imbalance gate passes (1 ≤ 1, right at the limit). This is genuinely borderline — **explicit rule needed and now stated: "≤1" is inclusive, meaning exactly 1 unmatched bracket still passes the gate**, it does not require strictly fewer than 1 (which would be an impossible "0 or negative" requirement, so this ambiguity must be resolved as "1 is acceptable," and this worked example makes that resolution concrete and testable).

**Attempt 4:** 0 unmatched, 98% accuracy, computed net WPM on this set corresponds to a Symbol Fluency Ratio of 0.58 against this user's own prose baseline. Checking against the Boss 1 table's Star 3 requirement of "0.55 SFR" — **0.58 ≥ 0.55**, so this attempt earns all 3 stars.

**Attempt 5:** 0 unmatched, 96% accuracy, SFR 0.52. Passes the imbalance gate and clears the 95% accuracy bar for star 2, but SFR (0.52) is below the 0.55 star-3 threshold, so this attempt earns 2 stars (pass + accuracy, not speed).

### 9.4.3 Applying "best 3 of last 5" — worked determination of the user's final result

Per the rule, we look at the **best 3 of these 5 attempts** (not simply the most recent 3, and not requiring all 5 to individually qualify — this distinction matters and is made explicit here):

| Attempt | Passed gate? | Accuracy star? | Speed star? |
|---|---|---|---|
| 1 | NO (imbalance 2 > 1) | — | — |
| 2 | Yes | No (94% < 95%) | — |
| 3 | Yes | Yes (97% ≥ 95%) | — (SFR not given in this attempt, assume below threshold for this worked example) |
| 4 | Yes | Yes (98% ≥ 95%) | Yes (0.58 ≥ 0.55) |
| 5 | Yes | Yes (96% ≥ 95%) | No (0.52 < 0.55) |

**"Best 3 of 5" interpretation, made explicit (this is a real design decision worth naming, since it's genuinely ambiguous as written):** does "best 3" mean the 3 highest-scoring attempts, evaluated holistically? Or does it mean "at least 3 of the 5 attempts individually satisfy the full pass bar"? **Decision: use the second interpretation — at least 3 of the 5 most recent attempts must individually clear the PASS gate** (not necessarily the accuracy or speed stars) for the level to be marked passed at all. Star count is then determined SEPARATELY, using the single BEST attempt among the qualifying ones for star purposes (i.e., stars reflect "your best performance," while pass/fail reflects "consistency over your last 5 tries," which are deliberately different questions).

**Applying this decision to the worked data:** attempts 2, 3, 4, and 5 all individually pass the gate (4 out of the last 5, which is ≥3), so **the level is PASSED**. For star determination, look at the single best qualifying attempt: **Attempt 4** (98% accuracy, 0.58 SFR) is the best performer, earning **all 3 stars** — so the user's Level 5 entry shows 3 stars, based on their best attempt, even though attempts 2, 3, and 5 individually earned fewer stars.

**Test name:** `LVL-FIXTURE-001-best-3-of-5-worked` — hardcode the exact 5 attempts above; assert (a) the level is marked passed (4 of 5 qualifying ≥ 3 required), and (b) the awarded star count is 3, taken from the single best qualifying attempt (Attempt 4), not an average or a "3rd best" calculation.

### 9.4.4 The "almost there" state, worked

**Recap (LRN-04/MST-06, "almost there" instead of hard fail):** when close to criteria, show a supportive state.

**Worked threshold, a `[proposal]` made concrete:** define "almost there" as within **5 percentage points of the accuracy target OR within 0.05 of the SFR target**, on an attempt that otherwise passed the gate. Applying to Attempt 2 above (94% accuracy vs. 95% target, a 1-point gap): **this qualifies as "almost there"** for the accuracy star, and the UI should show the `code.level.almostThere` string from the UI copy file with a detail like "just 1% more accuracy" rather than a flat "you failed to get the accuracy star."

**Test name:** `LVL-FIXTURE-002-almost-there-threshold` — assert Attempt 2 (94% vs 95% target) triggers the "almost there" UI state with a correctly computed gap detail ("1% more"), while a hypothetical attempt at 80% accuracy (a 15-point gap, well outside the 5-point "almost there" band) does NOT trigger this softer messaging and instead shows a plain result without false encouragement.

---

## 9.5 Naming-style switch-cost, worked against the ACTUAL Boss 6 content

**Recap:** Boss 6 (Level 30) measures switch cost — the extra time/errors right after a naming-style change.

### 9.5.1 The real Boss 6 content, restated

From `levels-02-boss-and-challenge-content.md`:
```
user_list = fetch_data(api_key)
userList.forEach(processUserRecord)
class UserRecord {
  max-retry-count: 3,
  has_error: false
}
config.database.connection_pool
ErrorLogEntry.create(error_log)
namespace::path::resolver
TOTAL_ACTIVE_USER_COUNT = 0
```
With 7 marked switch-cost measurement points (transitions between lines/segments where the naming convention changes), as already annotated in that file.

### 9.5.2 Worked switch-cost calculation for Transition 1

**Transition 1:** from line 1 (`snake_case`: `user_list`, `fetch_data`, `api_key`) to line 2 (`camelCase`: `userList`, `processUserRecord`).

**Method:** compare the user's typing speed on the FIRST identifier immediately after the style change (`userList` on line 2) against their own established baseline speed for camelCase identifiers **measured elsewhere, away from a switch point** (e.g., from Level 27's dedicated camelCase drills, where there's no switching happening).

**Worked numbers:** suppose the user's established, non-switching camelCase identifier speed (from Level 27 history) averages **45ms per character**. Now suppose typing `userList` (8 characters) immediately after the snake_case line takes them **68ms per character** on this attempt (total time for `userList` divided by 8).

```
switch_cost_ratio = switching_speed / baseline_speed = 68 / 45 = 1.51
```
**Interpretation:** typing the first camelCase identifier right after a snake_case line took **51% longer per character** than this user's normal, non-switching camelCase speed — this is the switch cost, a real, quantifiable "mental gear-shifting" tax.

**Comparison point (why this matters, made concrete):** if this same user's switch-cost ratio for Transition 4 (into `dot.notation`) were instead only 1.05 (5% slower), that would suggest dot notation is a much smaller mental shift for them than the snake→camel shift — a genuinely useful, specific insight ("you handle dot notation switches fine, but snake_case→camelCase costs you noticeably more") that a whole-boss-average score would completely hide.

**Test name:** `TOK-FIXTURE-007-switch-cost-worked` — hardcode the 45ms baseline and 68ms switching speed; assert the computed switch_cost_ratio is exactly 1.51 (rounding to 2 decimal places), and assert this per-transition value is stored and retrievable individually (not collapsed into a single boss-wide average), per the observation above about why per-transition granularity matters.

### 9.5.3 Boss 6's pass criteria, worked

Per the boss scoring table: "Switch cost within 1.5× baseline transition time" for the pass star.

**Applying to the worked example:** Transition 1's switch_cost_ratio of **1.51** is **just barely above** the 1.5× threshold — this specific transition would NOT individually qualify, but the level's overall pass criterion (per the boss table) likely aggregates across all 7 transitions rather than requiring every single one to individually clear 1.5× (an explicit design decision, stated here since it wasn't fully specified before): **the pass rule is: the MEDIAN switch-cost ratio across all 7 transitions must be ≤1.5×**, tolerating one or two rough transitions as long as overall switching fluency is reasonable. Worked: if the other 6 transitions have ratios of 1.2, 1.3, 1.1, 1.4, 1.25, 1.35 (all comfortably under 1.5), and Transition 1 is the outlier at 1.51, the median of all 7 values (sorted: 1.1, 1.2, 1.25, **1.3**, 1.35, 1.4, 1.51) is **1.3**, comfortably under the 1.5 threshold, so **the level passes overall** despite one individually-rough transition.

**Test name:** `LVL-FIXTURE-003-boss6-median-switch-cost` — hardcode all 7 transition ratios from this worked example; assert the median (1.3) is used for the pass determination (not the mean, which a naive implementation might reach for instead, and not a "worst transition must also pass" all-or-nothing rule) — and assert the level passes despite Transition 1 individually exceeding 1.5.

---

## 9.6 Consolidated Test Scenario Catalog — Token Engine and Levels (20 named scenarios)

**Group 1 — Tokenization mapping and ambiguous cases (6)**
1. `TOK-FIXTURE-001` — single-char token timing via inter-token gap (§9.2.4)
2. `TOK-FIXTURE-002` — bracket pair latency in context vs. abstract drill distinction (§9.2.5)
3. `TOK-FIXTURE-003` — number inside a string classified as Strings, not Numbers (§9.3.1)
4. `TOK-FIXTURE-004` — keyword vs. identifier by syntactic position, validating the grammar-based architecture decision (§9.3.2)
5. `TOK-FIXTURE-005` — symbols inside comments excluded from operator analytics (§9.3.3)
6. `TOK-FIXTURE-006` — chord internal error-position attribution (§9.3.4)

**Group 2 — Level pass criteria (5)**
7. `LVL-FIXTURE-001` — best-3-of-5 worked determination, full pass/star logic (§9.4.3)
8. `LVL-FIXTURE-002` — "almost there" threshold and messaging (§9.4.4)
9. `LVL-FIXTURE-004` — a user who passes the gate on exactly 3 of 5 (the minimum boundary) — assert this still counts as a pass, not requiring 4+
10. `LVL-FIXTURE-005` — a user who passes the gate on only 2 of 5 — assert this does NOT pass (below the 3-of-5 minimum), even if those 2 attempts were individually excellent
11. `LVL-FIXTURE-006` — a boss level's hard gate (bracket imbalance) interacting correctly with the soft star criteria — assert an attempt that fails the hard gate NEVER earns any stars regardless of how good its accuracy/speed numbers were, since the hard gate is checked first and blocks the attempt entirely

**Group 3 — Switch-cost and naming (4)**
12. `TOK-FIXTURE-007` — switch-cost ratio worked calculation (§9.5.2)
13. `LVL-FIXTURE-003` — median-based Boss 6 pass determination (§9.5.3)
14. `LVL-FIXTURE-007` — the naming-style transformation function tested exhaustively against all 120 base phrases × 7 styles = 840 cases (referenced from the vocabulary file §1.2, formally listed here as a required test in this chapter's catalog since it's the direct input to switch-cost measurement)
15. `LVL-FIXTURE-008` — a conversion-drill (Level 29) scored: user shown `user_list` in snake_case, asked to type it in PascalCase; assert `UserList` is the only accepted correct answer, and that a plausible near-miss like `Userlist` (missing the inner capital) is correctly scored as an error, not silently accepted as "close enough"

**Group 4 — Generation determinism (2, cross-referencing the vocabulary file's own tests)**
16. `GEN-DETERMINISM-001` — same seed produces identical output, re-verified here in the context of actual level content, not just the abstract generator function (§6 of the vocabulary file)
17. `GEN-VARIETY-001` — different seeds produce different output at the expected rate (§6 of the vocabulary file)

**Group 5 — Cross-file consistency (3, unique to this deep-dive, verifying the multi-file content actually agrees with itself)**
18. `CONSISTENCY-001` — the Boss 1 content used in this chapter's worked examples (§9.4.1) is byte-for-byte identical to the Boss 1 content published in `levels-02-boss-and-challenge-content.md` — a literal string-diff test between the two documents' embedded content, since a spec that quotes content inconsistently across files is a real, easy-to-introduce error in a large multi-document project
19. `CONSISTENCY-002` — the Boss 6 content and its 7 annotated transition points, cross-checked the same way between this chapter and the boss-content file
20. `CONSISTENCY-003` — the 120-phrase vocabulary bank referenced in this chapter's switch-cost example is drawn from phrases that actually exist in `levels-01-vocabulary-and-generation-parameters.md` §1.1/§1.4 (e.g., verify `user_list`, derived from base phrase `user list`, is genuinely in that file's vocabulary bank, not an invented example that happens to not exist in the actual source data)

---

## 9.7 What this chapter establishes that wasn't previously specified

Reading back across this chapter, several genuine gaps in the earlier (summary-level) specification were found and closed here, worth listing explicitly as the concrete value this deep-dive added beyond restating known rules:
1. **The single-character-token timing convention** (§9.2.4) — not specified anywhere before; without it, an implementer would have had to guess.
2. **The precedence rule for numbers-inside-strings and keywords-by-position** (§9.3.1, §9.3.2) — the master spec said "define precedence rules" as an instruction to do this work later; this chapter actually did it.
3. **The exact "best 3 of 5" interpretation** (§9.4.3) — the phrase "best 3 of last 5" was genuinely ambiguous between two reasonable readings; this chapter picked one and justified it.
4. **The "≤1 unmatched bracket" inclusive-vs-exclusive resolution** (§9.4.2) — a one-word ambiguity ("≤" vs an implied "<") that would otherwise be silently resolved differently by different implementers.
5. **The median-based (not mean-based, not all-or-nothing) aggregation rule for Boss 6's switch-cost pass criterion** (§9.5.3) — previously just said "within 1.5x baseline" with no aggregation method specified across the 7 transitions.
