# Boss-Level and Challenge Content — Actual Text

**Purpose:** the master spec and level tables say bosses are "mixed review" of earlier tiers, but no actual boss text existed until now. This file gives **real, usable boss-level content for all 5 boss levels currently defined (Levels 5, 10, 15, 20, 25)**, plus real daily-challenge text, sized and structured for direct use — not just the single-line samples already shown in the vocabulary file (those were correctness targets for the generator; these are longer, complete, ready-to-serve boss sets).

**Design principle for bosses (from the master spec):** a boss level must (a) mix content from all levels within its tier, (b) include at least one review item explicitly recalled from the *previous* boss's tier (interleaving, per the spec's "bosses include review items" rule), and (c) be long enough to feel like a real test (the spec implies boss levels are "mixed test," longer than a single quick drill).

---

## Boss 1 (Level 5 — "Bracket Gauntlet"): full 10-line set

Mixes: single pairs (L1), pairs with content (L2), depth-2 nesting (L3), depth-3 mixed nesting (L4). No previous-tier review yet, since this is the first boss.

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
**Pass criteria applied to this set:** per the spec's Level 5 row, "imbalance ≤ limit" — recommended limit for this 10-line set: **at most 1 unmatched bracket across the whole set** to earn a pass star, 0 unmatched for the accuracy star.

---

## Boss 2 (Level 10 — "Operator Soup"): full 10-line set

Mixes: arithmetic (L6), comparison/assignment (L7), logical/bitwise (L8), chords (L9). **Includes 2 review lines recalled from Boss 1's bracket content** (interleaving requirement).

```
total = (price * quantity) - discount
isValid = count > 0 && count <= max
result = data?.items ?? []
next = current + step >= limit ? 0 : current + step
flags |= (1 << position)
values = [...base, extra]
callback = (x) => x * 2 + offset
ratio = (a / b) * 100
outer(inner(deep(x)))
obj = {list: [fn(1)], val: (2, 3)}
```
*(Lines 9–10 are the Boss-1 review lines, unchanged, deliberately testing whether bracket fluency held up while the user's attention was on operators.)*

---

## Boss 3 (Level 15 — "String & Regex Mix"): full 10-line set

Mixes: quote pairs (L11), escapes (L12), interpolation (L13), regex basics (L14). **Includes 2 review lines from Boss 2** (one operator-heavy, one bracket-heavy, since Boss 2 itself already carried Boss 1's review — cumulative interleaving).

```
const greeting = `Hello, ${user.name}!`;
const pattern = /^\d{3}-\d{4}$/;
const path = "C:\\Users\\data\\file.txt";
const msg = 'It\'s ready at %d:00';
const clean = value.replace(/[^a-zA-Z0-9]/g, '');
const log = `[${timestamp}] ${level}: ${message}`;
isValid = count > 0 && count <= max
map = {a: (1, 2), b: [3, 4]}
const note = "She said \"hurry\" twice.";
const id = `user_${index}`;
```

---

## Boss 4 (Level 20 — "Numeric Data Entry"): full 10-line set

Mixes: plain integers (L16), signs/decimals/separators (L17), scientific/underscored (L18), expressions/indices (L19). Includes 2 review lines from Boss 3.

```
price = 19.99
quantity = 3
subtotal = price * quantity
tax_rate = 0.0825
total = subtotal * (1 + tax_rate)
discount = -5.00
final = total + discount
item_count = 1_250
const greeting = `Hello, ${user.name}!`;
callback = (x) => x * 2 + offset
```

---

## Boss 5 (Level 25 — "Number Systems Lab"): full 10-line set

Mixes: hex (L21), binary/octal (L22), bitmasks/shifts (L23), IDs/addresses (L24). Includes 2 review lines from Boss 4.

```
color = #3C82F6
mask = 0b1111_0000
perms = 0o644
addr = 192.0.2.15/24
id = a1b2c3d4-e5f6-4a3b-9c8d-1234567890ab
version = 4.2.1
port = 8080
timestamp = 2026-03-14T09:30:00Z
flags = (state & 0xFF) | 0b0001
subtotal = price * quantity
```

*(Bosses for Levels 30, 35, 40, 45, 50, 55, 60 belong to Tiers 6–12, which are V1/V2 scope per the spec. Tier 6's Level 30 boss content is provided separately below since Tier 6 generation parameters were already fully specified in the vocabulary file.)*

---

## Boss 6 (Level 30 — "Mixed-Convention Codebase"): full set

This boss is structurally different — instead of 10 independent lines, it's **one continuous realistic-looking code block** where naming convention changes every 2–3 identifiers, specifically to measure switch-cost (per the master spec's Tier 6 definition). Built from the vocabulary bank's naming transforms (see `levels-01-vocabulary-and-generation-parameters.md` §1.2).

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
**Switch-cost measurement points marked (for the engine to log timing at each transition):** transition 1 between line 1 (`snake_case`) and line 2 (`camelCase`); transition 2 into line 3's class declaration (`PascalCase`); transition 3 into the object literal's `kebab-case` and `snake_case` mixed keys (an intentionally messy real-world case, since real codebases do mix conventions inconsistently, which is itself worth measuring); transition 4 into `dot.notation`; transition 5 into `PascalCase` again; transition 6 into `namespace::path`; transition 7 into `SCREAMING_SNAKE_CASE`.

---

## Daily Challenge content (CMP-09 / RET-14): 14 pre-built challenges (a 2-week rotation to start)

**Design principle:** the daily challenge uses the **exact same text for every participant on a given day** (per the spec's fairness rule), drawn from a pre-scheduled rotation rather than randomly generated live, so results are directly comparable. Below is a real, ready-to-schedule 14-day rotation mixing prose, numbers, and a code day, so the daily challenge doesn't feel monotonous.

| Day | Content type | Source item(s) used | Why this choice |
|---|---|---|---|
| 1 | Prose (Easy) | `PROSE-01-004` | Gentle opener for the rotation |
| 2 | Quote (Short) | `QUOTE-ORIG-003` | Short, quick daily challenge |
| 3 | Prose (Typical) | `PROSE-02-006` | Workplace-flavored variety |
| 4 | Numbers | Boss 4 set (Level 20 content, used as a fixed daily set, not a graded boss) | Numbers day |
| 5 | Prose (Hard) | `PROSE-03-005` | Technical-flavored, harder day |
| 6 | Quote (Public domain) | `QUOTE-PD-002` (Franklin, "Early to bed...") | Introduces the historical-quotes flavor |
| 7 | Prose (Typical) | `PROSE-01-011` | End of week 1 |
| 8 | Code (JS, abstract) | Boss 1 set (Level 5 content, used as a fixed daily set) | Introduces programmer-flavored daily challenge |
| 9 | Prose (Easy) | `PROSE-02-010` | |
| 10 | Quote (Medium) | `QUOTE-ORIG-043` | |
| 11 | Prose (Hard) | `PROSE-03-025` | |
| 12 | Numbers/symbols | Boss 5 set (Level 25 content) | |
| 13 | Prose (Typical) | `PROSE-01-041` | |
| 14 | Quote (Long, public domain) | `QUOTE-PD-024` (Aesop/Townsend) | Closes the 2-week rotation on the historical-quotes flavor |

**Rotation policy going forward:** repeat this 14-day cycle for the first month (users won't have memorized it yet), then begin swapping individual days for fresh content as new batches are produced, so the rotation stays a true "same day, same test" fairness mechanism while slowly refreshing.

## Boss-level scoring summary table (all 6 bosses)

| Boss | Level | Lines | Review lines included | Pass threshold (imbalance/errors) | Star 2 (accuracy) | Star 3 (speed, fraction of prose baseline) |
|---|---|---|---|---|---|---|
| Bracket Gauntlet | 5 | 10 | 0 (first boss) | ≤1 unmatched bracket | 0 unmatched, ≥95% char accuracy | 0.55 SFR |
| Operator Soup | 10 | 10 | 2 (from Boss 1) | ≤1 operator confusion | ≥96% char accuracy | 0.65 SFR |
| String & Regex Mix | 15 | 10 | 2 (from Boss 2) | ≤1 quote/escape error | ≥95% char accuracy | 0.60 SFR |
| Numeric Data Entry | 20 | 10 | 2 (from Boss 3) | ≤1 digit/decimal error | ≥96% char accuracy | 0.70 SFR |
| Number Systems Lab | 25 | 10 | 2 (from Boss 4) | ≤1 base/format error | ≥96% char accuracy | 0.75 SFR |
| Mixed-Convention Codebase | 30 | 8 lines, 7 transitions | n/a (structural review built into the mixed conventions themselves) | Switch cost within 1.5× baseline transition time | ≥90% conversion accuracy | 0.65 SFR |

*(All SFR — Symbol Fluency Ratio — thresholds here are `[proposal]` starting values per the master spec's calibration note, consistent with the ramps already defined in spec §6.5.)*
