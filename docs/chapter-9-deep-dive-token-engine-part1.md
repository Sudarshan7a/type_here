# Chapter 9 (Deep-Dive) — Token Engine and Levels: Internals, Edge Cases, Worked Examples

**Extends:** Implementation Guide §10 (M5–M6 — Programmer Track) and the `token-drill-generators` skill.
**Also consumes:** `levels-01-vocabulary-and-generation-parameters.md` (the actual word banks and parameter tables this chapter's algorithms operate on) and `levels-02-boss-and-challenge-content.md` (the actual boss content this chapter's scoring rules are tested against).
**Purpose:** same treatment as Chapters 4 and 8 — every abstract rule about tokenization, attribution, and level pass criteria gets a worked numeric example and a named test.

---

## 9.1 Why token attribution is harder than it looks

Chapter 4 established keystroke-to-character mapping. This chapter adds a **second mapping layer on top**: character-to-token-class. This is harder because **the boundary between tokens is not always the boundary between characters typed** — a single keystroke can complete a multi-character token (typing the second `=` in `==` completes a 2-character "equals" token), and a single token can span many keystrokes typed at very different speeds (a long identifier like `userAuthenticationToken` is one "identifier" token but 24 individual keystrokes with their own internal rhythm).

---

## 9.2 The tokenization-to-attribution pipeline, worked step by step

**Scenario:** the target text is the JavaScript line `if (count >= max) {` (19 characters including spaces), and the user types it with this keystroke log (character, time in ms since first keystroke):

| # | Char | Time (ms) |
|---|---|---|
| 1 | i | 0 |
| 2 | f | 140 |
| 3 | (space) | 280 |
| 4 | ( | 410 |
| 5 | c | 560 |
| 6 | o | 690 |
| 7 | u | 820 |
| 8 | n | 940 |
| 9 | t | 1070 |
| 10 | (space) | 1200 |
| 11 | > | 1520 |
| 12 | = | 1610 |
| 13 | (space) | 1740 |
| 14 | m | 1870 |
| 15 | a | 2000 |
| 16 | x | 2130 |
| 17 | ) | 2260 |
| 18 | (space) | 2390 |
| 19 | { | 2520 |

### 9.2.1 Step 1 — the grammar-based token map (precomputed at content-authoring time, per D-M5-2)

A real grammar parser (Tree-sitter or equivalent) applied to `if (count >= max) {` produces a token map like this (this is the kind of output a real JavaScript grammar would produce — shown here in worked table form since no code is being written):

| Token # | Text | Start pos | End pos | Grammar node type | **Our 12-class mapping (per §7.2 of the master spec)** |
|---|---|---|---|---|---|
| T1 | `if` | 0 | 2 | keyword | Class 8: Keywords |
| T2 | `(` | 3 | 4 | punctuation | Class 1: Brackets & pairs |
| T3 | `count` | 4 | 9 | identifier | Class 7: Identifiers |
| T4 | `>=` | 10 | 12 | operator | Class 2: Operators |
| T5 | `max` | 13 | 16 | identifier | Class 7: Identifiers |
| T6 | `)` | 16 | 17 | punctuation | Class 1: Brackets & pairs |
| T7 | `{` | 18 | 19 | punctuation | Class 1: Brackets & pairs |

*(Whitespace characters at positions 2, 9, 12, 17 are their own Class 9: Whitespace tokens, listed separately in a real implementation but omitted here for table brevity since they don't carry interesting per-keystroke timing analysis on their own.)*

### 9.2.2 Step 2 — map each keystroke to its token

Using the start/end positions from Step 1, and the keystroke log's implicit character positions (keystroke #1 fills position 0, #2 fills position 1, etc.):

| Keystroke # | Char | Position | Token | Class |
|---|---|---|---|---|
| 1 | i | 0 | T1 (`if`) | Keywords |
| 2 | f | 1 | T1 (`if`) | Keywords |
| 3 | (space) | 2 | — (whitespace) | Whitespace |
| 4 | ( | 3 | T2 (`(`) | Brackets |
| 5 | c | 4 | T3 (`count`) | Identifiers |
| 6 | o | 5 | T3 (`count`) | Identifiers |
| 7 | u | 6 | T3 (`count`) | Identifiers |
| 8 | n | 7 | T3 (`count`) | Identifiers |
| 9 | t | 8 | T3 (`count`) | Identifiers |
| 10 | (space) | 9 | — | Whitespace |
| 11 | > | 10 | T4 (`>=`) | Operators |
| 12 | = | 11 | T4 (`>=`) | Operators |
| 13 | (space) | 12 | — | Whitespace |
| 14 | m | 13 | T5 (`max`) | Identifiers |
| 15 | a | 14 | T5 (`max`) | Identifiers |
| 16 | x | 15 | T5 (`max`) | Identifiers |
| 17 | ) | 16 | T6 (`)`) | Brackets |
| 18 | (space) | 17 | — | Whitespace |
| 19 | { | 18 | T7 (`{`) | Brackets |

### 9.2.3 Step 3 — compute per-token timing (first keystroke to last keystroke of the token)

| Token | First keystroke time | Last keystroke time | **Token duration** | Notes |
|---|---|---|---|---|
| T1 (`if`) | 0ms | 140ms | **140ms** | 2-keystroke token; duration = time from first to last key of the token itself |
| T2 (`(`) | 410ms | 410ms | **0ms** (single keystroke, duration is just that one keystroke's own timing, attributed via the gap before it — see note below) | Single-char tokens need a different duration convention — see §9.2.4 |
| T3 (`count`) | 560ms | 1070ms | **510ms** | 5-keystroke identifier |
| T4 (`>=`) | 1520ms | 1610ms | **90ms** | This is the "chord" internal timing per D-M5-3 — 90ms is genuinely fast for 2 keys, suggesting the user typed this operator as a practiced, fluent unit |
| T5 (`max`) | 1870ms | 2130ms | **260ms** | 3-keystroke identifier |
| T6 (`)`) | 2260ms | 2260ms | 0ms (single keystroke) | |
| T7 (`{`) | 2520ms | 2520ms | 0ms (single keystroke) | |

### 9.2.4 The single-character-token duration problem (a real, worth-naming edge case)

**The problem made concrete:** T2 (the single character `(`) has a "duration" of literally 0ms by the naive first-to-last-keystroke rule, since it's only one keystroke. But that's not actually useful data — what we actually want to know is **how long it took the user to get to and produce that character**, which is really the **gap between the previous token's end and this token's keystroke**.

**Correct rule (stated explicitly, since the naive "duration" concept breaks down here):** for single-character tokens, the meaningful timing metric is the **inter-token gap** — time from the previous keystroke (regardless of which token it belonged to) to this token's single keystroke. Worked: T2's gap = `410ms (this keystroke) - 280ms (previous keystroke, the space)` = **130ms gap**. This 130ms is the actual useful data point (feeding into Bracket Pair Latency and per-symbol timing in the token-class dashboard), not the meaningless "0ms duration."

**Test name:** `TOK-FIXTURE-001-single-char-token-timing` — assert that single-character tokens report their inter-token gap as the timing metric, never a literal 0, and that this gap value feeds the per-symbol speed analytics correctly.

### 9.2.5 Bracket Pair Latency, worked using this same example

**Recap of the metric (from the master spec's programmer analytics):** "median time from an opening bracket to its match."

**Worked for this example:** the opening `(` (T2, keystroke at 410ms) and its matching closing `)` (T6, keystroke at 2260ms) — **bracket pair latency = 2260 - 410 = 1850ms** for this specific pair instance. Note this measures the FULL span including everything typed inside the parentheses (the `count >= max` content), not just "how fast can you type an empty pair" — this is intentional, since Bracket Pair Latency as defined is meant to capture realistic in-context bracket usage, not abstract isolated pair-typing speed (that's a different, separate metric — the abstract Bracket Balance drill from Tier 1, Levels 1-2, which specifically uses ISOLATED pairs for exactly this reason: to measure raw pairing speed without confounding it with "how long did it take to type the content between them").

**Test name:** `TOK-FIXTURE-002-bracket-pair-latency-in-context` — assert the computed latency for this example is exactly 1850ms, and that this metric is explicitly labeled/stored separately from the abstract Tier-1 Bracket Balance drill's own latency metric, since the two measure different things despite sharing a name-adjacent concept.

---

## 9.3 Ambiguous tokenization cases, worked with explicit precedence rules

**Recap of the rule (§7.2's precedence note):** define precedence for ambiguous cases and test with a labeled corpus.

### 9.3.1 Case A — a number that appears inside a string

**Text:** `"Error code 404"`

**Ambiguous question:** is `404` classified as Class 5 (Numbers) or does it inherit Class 4 (Strings) since it's inside a string literal?

**Rule (stated explicitly, per the precedence table in §7.2 of the master spec, which this chapter now makes concrete):** **content inside a string literal is entirely Class 4 (Strings), including any digit characters within it.** The digits `404` here are NOT counted toward Number-class analytics at all — they're part of the string's character content. **Reasoning:** a user typing `404` inside a string is performing string-typing (needing to be inside quote-context, aware of what characters are "safe" within a string) rather than performing numeric-literal typing (which has its own distinct concerns like base-prefixes and separators, per Chapter "Numbers and number systems"). Conflating the two would blur two genuinely different skills.

**Test name:** `TOK-FIXTURE-003-number-inside-string` — tokenize `"Error code 404"` and assert every character, including `4`, `0`, `4`, is classified as Class 4 (Strings), with zero contribution to Class 5 (Numbers) analytics.

### 9.3.2 Case B — a keyword used as a property name

**Text:** `obj.class = "active"` (in a hypothetical language/context where `class` can also appear as an ordinary property name, not a keyword usage — a genuinely common real-world ambiguity across many languages)

**Rule:** **defer entirely to the grammar parser's actual node type**, not a naive string-matching "is this text one of our known keywords" check. A real Tree-sitter-style grammar correctly distinguishes `class` used as a language keyword (e.g., `class Foo { }`) from `class` used as a plain identifier/property name (e.g., `obj.class`), because the grammar understands syntactic position, not just the literal text. **This is exactly why the master spec mandates a real grammar-based tokenizer (D-M5-1) rather than a simpler keyword-lookup-table approach** — a lookup table would incorrectly classify `obj.class`'s `class` as Class 8 (Keywords) every time, when it's actually functioning as Class 7 (Identifiers) in this position.

**Test name:** `TOK-FIXTURE-004-keyword-vs-identifier-position` — tokenize `obj.class = "active"` and assert `class` here is classified as Class 7 (Identifiers), not Class 8 (Keywords), specifically because of its syntactic position, not its literal spelling. **This test directly validates the D-M5-1 architectural decision** (grammar-based over lookup-table-based) — if this test fails, it's strong evidence someone implemented the cheaper, wrong approach.

### 9.3.3 Case C — a comment containing what looks like code

**Text:** `// TODO: fix count >= max check`

**Rule:** the ENTIRE line, once inside the comment marker, is Class 10 (Comments), including the `>=` that would otherwise look like an operator token. **Grammar parsers handle this correctly by design** (a comment is a single token/node type spanning its whole content in most grammars), but this is worth an explicit test because a naive, non-grammar-based "scan for known symbols anywhere in the text" approach would incorrectly find and classify the `>=` inside the comment as a real Operators-class token, contaminating the operator-speed analytics with comment-typing data (which involves completely different keystroke rhythm, since people often type comments faster/more casually than functional code).

**Test name:** `TOK-FIXTURE-005-symbols-inside-comments-excluded` — tokenize the example above; assert `>=` within the comment contributes ZERO samples to Class 2 (Operators) analytics.

### 9.3.4 Case D — multi-character operators, partial-typing states

**Text:** the operator `===` (strict equality, 3 characters, one "chord" token per D-M5-3)

**Worked scenario:** the user types `=`, then `=`, then (a moment later) `=` again to complete it. **Question:** what happens to the ANALYTICS if the user makes a mistake mid-chord, e.g., types `=`, `=`, then `!` by accident (perhaps confusing `===` with `!==`), corrects it, then finishes with the third `=`?

**Rule:** a chord token's internal keystrokes are tracked individually (per D-M5-3, "an internal timing sub-measure"), so an error mid-chord is attributed to **that specific keystroke position within the chord**, not to the chord as an undifferentiated whole. This means the analytics can distinguish "user is slow/error-prone on the FIRST character of `===`" from "user is slow/error-prone on the THIRD character of `===`" — a genuinely useful distinction (e.g., it might reveal a user consistently starts typing `!==` out of habit before catching themselves and switching to `===`, which is a specific, nameable, fixable pattern that whole-chord-only tracking would hide).

**Test name:** `TOK-FIXTURE-006-chord-internal-error-position` — simulate the exact typo scenario above (`=`, `=`, wrong `!`, backspace, correct `=`); assert the error is attributed to chord-position-3 specifically, and that the final successfully-typed chord's overall duration still counts toward the token's total time (including the correction overhead, consistent with the net-WPM-includes-correction-time principle established in Chapter 4).

---

*(Continues in Part 2: level pass-criteria scoring worked in full against the actual Boss content from `levels-02-boss-and-challenge-content.md`, the naming-style switch-cost algorithm worked step by step, and a consolidated test catalog.)*
