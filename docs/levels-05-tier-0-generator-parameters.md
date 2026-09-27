# Tier 0 — Full Generator Parameter Tables (Matching the Depth of `levels-01` for Tiers 1–6)

**What this closes:** `levels-03-tier-0-finger-placement-foundations.md` gave the finger map and the 5-level pedagogical concept with a handful of illustrative drill patterns. It explicitly said it did NOT yet give "the actual full drill-generator parameter tables (analogous to the detail level in `levels-01-vocabulary-and-generation-parameters.md` for Tiers 1-6)." This file is that missing piece — exact key sets, exact sequencing rules, exact repetition counts, and exact pass thresholds per level, at the same specification depth `levels-01` gave Tiers 1–6.

**Scope reminder (unchanged from before):** this is reference/design material, matching the same "prepared, not committed" status as the rest of the Tier 0 and Tier 7-12 material — not a claim that Tier 0 is approved for live build ahead of validation.

---

## 1. Generator contract (identical structure to the Tier 1-6 contract in `levels-01` §6, applied to Tier 0)

**Formal contract:** `generateTier0(level, seed, layout) -> drillSequence`. Given the same four inputs, output is always identical (same determinism rule as every other tier). Tier 0 takes `layout` as a required parameter from the very first level (unlike Tiers 1-6, which are largely layout-agnostic until symbol-heavy content) — because Tier 0's entire purpose is teaching layout-specific finger placement, so every single drill must already be resolved to the correct key for the user's declared layout.

**Output shape:** a `drillSequence` is an ordered list of "reps" — each rep is one key or short combination to press, plus the expected finger (for on-screen hand-diagram highlighting, a genuine, useful UI feature this table enables), plus a rest/anchor keystroke where the pattern calls for one.

---

## 2. Level 0.1 — Single Symbol Key Isolation: full parameter table

### 2.1 Key ordering (which key gets drilled 1st, 2nd, 3rd... and why)

**Rule:** order keys from LOWEST motor complexity to HIGHEST, exactly mirroring how general typing courses sequence `f` and `j` (easiest, home-row, no modifier) before harder reaches. Complexity is ranked by: (a) does it need a modifier (Shift/AltGr)? (b) is the base key on the home row, or does it require a reach?

**Full QWERTY-US Level 0.1 sequence (10 non-shifted keys first, in this exact order):**

| Order | Key | Base finger | Reach type | Complexity rank |
|---|---|---|---|---|
| 1 | `;` | Right pinky | Home row (no reach at all) | 1 (lowest) |
| 2 | `'` | Right pinky | Adjacent to home row | 2 |
| 3 | `,` | Right middle | One row down from home | 3 |
| 4 | `.` | Right ring | One row down from home | 3 |
| 5 | `/` | Right pinky | One row down, edge | 4 |
| 6 | `-` | Right pinky | Top row, edge | 5 |
| 7 | `=` | Right pinky | Top row, far edge | 5 |
| 8 | `[` | Right pinky | Top row, far edge | 6 |
| 9 | `]` | Right pinky | Top row, far edge | 6 |
| 10 | `\` | Right pinky | Far edge, biggest reach | 7 (highest, non-shifted) |

**Then 20 Shift-symbol keys, ordered by BASE key complexity (Shift itself adds a constant complexity increment, so base-key ordering still determines sequence):**

| Order | Symbol | Base key (same complexity rank as above) | Shift hand |
|---|---|---|---|
| 11 | `:` | `;` (rank 1) | Left pinky holds Shift |
| 12 | `"` | `'` (rank 2) | Left pinky holds Shift |
| 13 | `<` | `,` (rank 3) | Left pinky holds Shift |
| 14 | `>` | `.` (rank 3) | Left pinky holds Shift |
| 15 | `?` | `/` (rank 4) | Left pinky holds Shift |
| 16 | `_` | `-` (rank 5) | Left pinky holds Shift |
| 17 | `+` | `=` (rank 5) | Left pinky holds Shift |
| 18 | `{` | `[` (rank 6) | Left pinky holds Shift |
| 19 | `}` | `]` (rank 6) | Left pinky holds Shift |
| 20 | `\|` | `\` (rank 7) | Left pinky holds Shift |
| 21 | `!` | `1` | Right pinky holds Shift |
| 22 | `@` | `2` | Right pinky holds Shift |
| 23 | `#` | `3` | Right pinky holds Shift |
| 24 | `$` | `4` | Right pinky holds Shift |
| 25 | `%` | `5` | Right pinky holds Shift |
| 26 | `^` | `6` | Left pinky holds Shift |
| 27 | `&` | `7` | Left pinky holds Shift |
| 28 | `*` | `8` | Left pinky holds Shift |
| 29 | `(` | `9` | Left pinky holds Shift |
| 30 | `)` | `0` | Left pinky holds Shift |

**Why the Shift-hand alternates (right pinky for keys 21-25, left pinky for keys 26-30):** this matches real physical QWERTY layout — Shift+1 through Shift+5 are reached by the LEFT hand's fingers, so the modifier must be held by the RIGHT pinky (and vice versa for 6-0). This is a physically-grounded detail, not an arbitrary alternation — getting this backward in an implementation would teach physically awkward, cross-body reaches instead of the natural ones.

### 2.2 Repetition parameters (exact counts, not vague "repeat a few times")

| Parameter | Value | Rationale |
|---|---|---|
| Reps per key, first exposure | **15 keystrokes** | Long enough to build initial familiarity, short enough not to bore before moving to the next key |
| Anchor keystroke between reps | Home-row `a` (left hand), or `;` as a second anchor once it's been drilled itself | Mirrors general-typing practice of returning to a home key between reaches |
| Anchor rule for keys 1-2 (before `;` itself is drilled) | Use `a` as the sole anchor for keys 1 and 2 | `;` cannot anchor itself as key #1; once key #1 is done, later drills can use it as a second anchor point |
| Rest key ratio | 1 anchor keystroke per 1 target keystroke (50/50 pattern) | Matches the "reach and return" rhythm from general touch-typing pedagogy |
| Minimum accuracy to advance to next key | **90%** (a `[proposal]`, deliberately lower than Tier 1's 95%, since this is first exposure to a brand-new key, not yet expected fluency) | Avoids trapping a learner on their very first unfamiliar reach |

### 2.3 Worked full-length Level 0.1 drill for key #1 (`;`), literal output

Using the parameters above (15 reps, `a` anchor, 50/50 pattern):
```
; a ; a ; a ; a ; a ; a ; a ;
```
*(15 target keystrokes of `;`, interleaved with 14 anchor keystrokes of `a` — the exact, literal output `generateTier0(level=0.1, seed=<key#1>, layout="qwerty-us")` should produce.)*

### 2.4 Worked full-length Level 0.1 drill for key #22 (`@`, a Shift-symbol)

```
2 2 2 @ @ @ 2 2 2 @ @ @ 2 2 2
```
**Rule for Shift-symbol drills specifically:** alternate between the UNSHIFTED base key and the SHIFTED symbol in a 3-and-3 pattern (not a strict 1-and-1 alternation), because holding and releasing Shift repeatedly at a 1-and-1 pace is an unnaturally fast Shift-cycling rate not representative of real typing — real Shift usage tends to come in short clusters. This is a deliberate design decision, stated explicitly here since it's a real, non-obvious choice, differing from the simple 1-and-1 pattern used for non-shifted keys.

---

## 3. Level 0.2 — Two-Symbol Alternation: full parameter table

### 3.1 Pairing rules (which two keys get paired, and in what order)

**Rule 1 — related pairs first:** pair keys that are functionally related and commonly typed together in real use, before pairing unrelated keys. This maximizes early transfer value (a learner drilling `(` and `)` together is directly rehearsing the exact motion needed in Tier 1).

**Full QWERTY-US Level 0.2 pairing sequence:**

| Order | Pair | Relationship | Example real-world co-occurrence |
|---|---|---|---|
| 1 | `(` `)` | Bracket pair | Function calls |
| 2 | `[` `]` | Bracket pair | Array indexing |
| 3 | `{` `}` | Bracket pair | Blocks/objects |
| 4 | `'` `"` | Quote pair | Alternating quote styles |
| 5 | `<` `>` | Comparison pair | Comparisons, generics |
| 6 | `!` `@` | Unrelated (deliberately, see Rule 2) | — |
| 7 | `#` `$` | Unrelated | — |
| 8 | `%` `^` | Unrelated | — |
| 9 | `&` `*` | Unrelated | — |
| 10 | `-` `_` | Related (same base key, shifted vs. not) | Hyphen vs. underscore, both common in code/identifiers |
| 11 | `=` `+` | Related (same base key) | Assignment vs. addition |
| 12 | `:` `;` | Related (same base key) | Statement punctuation |
| 13 | `,` `.` | Related (adjacent keys, both very frequent) | List separators, decimals |
| 14 | `/` `?` | Related (same base key) | Division vs. question mark |
| 15 | `\` `\|` | Related (same base key) | Escapes vs. pipe operator |

**Rule 2 — deliberately UNrelated pairs in the middle of the sequence (items 6-9):** after establishing the "related pairs feel natural" pattern with items 1-5, the sequence deliberately includes unrelated pairs to build GENERAL symbol-reaching fluency, not just paired-bracket muscle memory — a learner who only ever practices related pairs risks only being fluent at those specific pairs, not at symbol-reaching in general. This directly mirrors why general typing courses eventually drill `f` with `k` (not just `f` with `j`) — to build broader reach fluency.

### 3.2 Repetition parameters for Level 0.2

| Parameter | Value | Rationale |
|---|---|---|
| Reps per pair (each pair drilled as a repeating 2-cycle) | **10 full A-B cycles** (20 total target keystrokes) | Roughly matches Level 0.1's total keystroke volume per item, now split across two keys instead of one |
| Pattern structure | Forward cycle first (`A B A B...`), then reversed (`B A B A...`) | Building both directions of the transition equally — a real, useful detail, since `(→)` and `)→(` are physically different motions and both matter |
| Minimum accuracy to advance | **90%** (same as Level 0.1) | Consistency with the level-0.1 threshold philosophy |

### 3.3 Worked full-length Level 0.2 drill for pair #1 (`(` and `)`)

```
( ) ( ) ( ) ( ) ( ) ( ) ( ) ( ) ( ) ( )
) ( ) ( ) ( ) ( ) ( ) ( ) ( ) ( ) ( ) (
```
*(10 forward cycles, 20 keystrokes, then 10 reversed cycles, 20 keystrokes — 40 total target keystrokes for this pair, the literal output for this specific generator call.)*

---

## 4. Level 0.3 — Three-to-Four Key Clusters: full parameter table

### 4.1 Cluster composition rules

**Rule:** clusters are built by COMBINING two of Level 0.2's already-drilled pairs into one 4-key cluster, so nothing in Level 0.3 introduces a truly novel key — it only introduces novel COMBINATIONS of already-familiar keys, the correct pedagogical escalation (new combination complexity, not new key complexity, at this stage).

**Full QWERTY-US Level 0.3 cluster sequence (5 clusters):**

| Cluster order | Keys combined | Source pairs (from Level 0.2) |
|---|---|---|
| 1 | `( ) [ ]` | Pairs #1 and #2 |
| 2 | `{ } < >` | Pairs #3 and #5 |
| 3 | `= + - _` | Pairs #10 and #11 |
| 4 | `: ; , .` | Pairs #12 and #13 |
| 5 | `/ ? \ \|` | Pairs #14 and #15 |

### 4.2 Repetition parameters for Level 0.3

| Parameter | Value | Rationale |
|---|---|---|
| Reps per cluster (full cycle through all 4 keys) | **8 full cycles** (32 total target keystrokes) | Slightly fewer full cycles than Level 0.2, since each cycle now covers 4 keys instead of 2 — total target-keystroke volume stays comparable |
| Pattern structure | Sequential order first (`A B C D` repeated), then a scrambled but SEEDED (deterministic) order for the final 3 cycles, testing recognition rather than pure sequence memorization | Prevents the learner from memorizing a fixed sequence rather than genuinely knowing each key's position |
| Minimum accuracy to advance | **92%** (a `[proposal]`, slightly raised from Level 0.1/0.2's 90%, since by this level the keys are no longer brand-new) | Gradual difficulty ramp, consistent with how Tier 1 itself ramps thresholds across its own 5 levels |

### 4.3 Worked full-length Level 0.3 drill for cluster #1 (`( ) [ ]`)

```
() [] () [] () [] () [] () [] () [] () [] () []
[ ) ( ] ( ] [ )
```
*(8 sequential cycles first — shown compressed as bracket pairs, literally 32 keystrokes — then a seeded-scrambled final section testing recognition of each key independently rather than the memorized sequence.)*

---

## 5. Level 0.4 — Symbol + Home-Row Letter Combinations: full parameter table

### 5.1 Fragment construction rules

**Rule:** build minimal fragments using ONLY home-row letters (`a s d f g h j k l`) plus whichever symbols have been introduced in Levels 0.1-0.3 so far, explicitly EXCLUDING any letter outside the home row, since Tier 0 has not taught reaches to other rows — that is the general letter-typing curriculum's job, assumed either already complete or running in parallel.

**Full QWERTY-US Level 0.4 fragment set (12 fragments, increasing in length):**

| Fragment order | Fragment | Length (chars) | Symbols used |
|---|---|---|---|
| 1 | `(a)` | 3 | `(` `)` |
| 2 | `[s]` | 3 | `[` `]` |
| 3 | `{d}` | 3 | `{` `}` |
| 4 | `a = s` | 5 | `=` |
| 5 | `f + g` | 5 | `+` |
| 6 | `(a, s)` | 6 | `(` `)` `,` |
| 7 | `[d; k]` | 6 | `[` `]` `;` |
| 8 | `a == s` | 6 | `=` (doubled, previewing the Tier 2 chord `==`) |
| 9 | `{a: s}` | 6 | `{` `}` `:` |
| 10 | `"ask"` | 5 | `"` |
| 11 | `(a && s)` | 8 | `(` `)` `&` |
| 12 | `[a, s, d]` | 9 | `[` `]` `,` |

**Note on fragment #8 (`a == s`):** this is a deliberate, explicit BRIDGE not just into Tier 1 but slightly ahead into Tier 2 (Operators & Chords), previewing the doubled-equals chord before the learner formally reaches Tier 2 — a genuinely useful bit of forward-priming, since `==` is one of the most common short chords in real code and a small amount of early exposure here can only help.

### 5.2 Repetition parameters for Level 0.4

| Parameter | Value | Rationale |
|---|---|---|
| Reps per fragment | **6 repetitions** of the whole fragment | Fragments are now multi-character units; fewer whole-fragment reps than single-key reps, but each rep is "denser" |
| Minimum accuracy to advance | **93%** | Continuing the gradual ramp toward Tier 1's 95% |

### 5.3 Worked full-length Level 0.4 drill for fragment #1 (`(a)`)

```
(a) (a) (a) (a) (a) (a)
```
*(6 literal repetitions, 18 total keystrokes — the exact generator output for this fragment.)*

---

## 6. Level 0.5 Boss ("Symbol Warm-Up"): full parameter table

### 6.1 Composition rule

**Rule (matching how Tiers 1-6's own boss levels are built, per `levels-02-boss-and-challenge-content.md`):** the boss pulls a representative sample from EVERY prior sub-level (0.1 through 0.4) in this tier, in one continuous set, with NO new content introduced — a pure mixed-review capstone, exactly matching the design principle already established for Tier 1's Boss 1 ("Bracket Gauntlet").

### 6.2 The full, literal Level 0.5 Boss content (QWERTY-US)

```
; ' , . / - = [ ] \
: " < > ? _ + { } |
! @ # $ % ^ & * ( )
(a) [s] {d} a=s f+g
(a, s) [d; k] a == s
{a: s} "ask" (a && s)
[a, s, d]
```
**This is a complete, literal, ready-to-use boss drill** — 7 lines covering: all 10 non-shifted symbols (line 1), all 10 corresponding Shift-symbols (line 2), the 10 digit-based Shift-symbols (line 3), and all 12 Level 0.4 fragments (remaining lines) — comprehensive review of everything Tier 0 teaches, in one set.

### 6.3 Pass criteria for Level 0.5 Boss

| Criterion | Threshold | Consistent with |
|---|---|---|
| Overall accuracy | **≥ 95%** | Matches Tier 1 Level 1's own accuracy bar exactly — Tier 0's Boss is explicitly designed to leave the learner AT the same starting accuracy level Tier 1 assumes, closing the gap this whole file exists to close |
| Best 3 of last 5 attempts | Required | Consistent with the "best 3 of 5" rule already established and worked through in detail in the Token Engine deep-dive chapter |
| Star 2 (accuracy star) | ≥ 97% | One point above pass, consistent with the star-tiering pattern used across every other boss level |
| Star 3 (speed star) | 0.45 SFR (Symbol Fluency Ratio, vs. the user's own prose baseline) | Deliberately LOWER than Tier 1 Boss's 0.55 SFR threshold, since Tier 0 is foundational and shouldn't demand Tier-1-level speed yet — a `[proposal]` needing the same real-user calibration flagged throughout every other numeric threshold in this project |

---

## 7. Per-layout parameter adjustments (cross-referencing `levels-04`)

**This section makes explicit HOW the per-layout differences documented in `levels-04-tier-0-per-layout-finger-maps.md` actually change the generator's OUTPUT, not just the reference table.**

### 7.1 AZERTY-specific generator behavior

**New required Level 0.1 sub-sequence, inserted BEFORE the standard symbol sequence:** a "Shift-digit" sub-drill covering digits 0-9, since AZERTY requires Shift for every digit (per `levels-04` §2.1) — this sub-sequence does not exist at all in the QWERTY-US generator output.

**Worked example, AZERTY digit `1`:**
```
& 1 & 1 & 1 & 1 & 1
```
*(Alternating the unshifted symbol `&` that occupies this key with the Shift+1 digit — this specific drill has no QWERTY-US equivalent, since QWERTY-US digits need no Shift at all.)*

**Modified Level 0.1 symbol ordering for AZERTY:** the AltGr-accessed symbols (`@ { } [ ] | ~`, per `levels-04` §2.2) are inserted as a THIRD complexity tier, after the non-shifted and Shift-accessed keys, since AltGr reaches are a distinct, higher-complexity motor pattern from plain Shift.

### 7.2 QWERTZ-specific generator behavior

**New required pre-Tier-0 sub-drill:** the Y/Z letter-alternation drill flagged in `levels-04` §3.1, inserted as "Level 0.0" (a sub-level before 0.1 even begins), since this is a letter-key issue technically outside Tier 0's symbol-only scope but too disruptive to skip.

**Worked example, QWERTZ Level 0.0:**
```
y z y z y z y z y z
try try try
yz zy yz zy
```

**Modified Level 0.1 for QWERTZ:** brackets and `@` move to a dedicated "AltGr cluster," drilled AFTER the non-AltGr symbols, mirroring the AZERTY treatment above but with QWERTZ's specific key mappings from `levels-04` §3.2.

### 7.3 Dvorak-specific generator behavior

**Minimal modification needed:** only the relocated punctuation (`'` `,` `.` `-` `/` `=`, per `levels-04` §4.2) need position remapping in the generator's key-to-position lookup table; the SEQUENCE, repetition counts, and thresholds from §2-§6 above apply completely unchanged — the direct generator-level consequence of Dvorak needing "the least symbol-specific relearning," already noted qualitatively in `levels-04`; here it's made concrete as "zero changes to sequencing logic, only to the physical key lookup table."

### 7.4 Colemak-DH-specific generator behavior

**Single modification:** the `:`/`;` pair (per `levels-04` §5.2) uses Colemak-DH's relocated position in the key lookup table; everything else in §2-§6 above is completely unchanged, matching `levels-04`'s assessment of this as "the lightest-touch adaptation of all five layouts."

---

## 8. Consolidated test scenarios for the Tier 0 generator (10 named tests, matching the pattern established in `levels-01` §6)

1. `T0-GEN-001` — Level 0.1 determinism: same seed produces the identical 15-keystroke sequence every time, for every one of the 30 keys.
2. `T0-GEN-002` — Level 0.1 Shift-hand correctness: verify keys 21-25 (Shift+1 through Shift+5) are generated with RIGHT-pinky-Shift instructions, and keys 26-30 (Shift+6 through Shift+0) with LEFT-pinky-Shift instructions, per the physical-layout rule in §2.1.
3. `T0-GEN-003` — Level 0.2 bidirectionality: verify every pair drill includes both the forward AND reversed cycle, per §3.2.
4. `T0-GEN-004` — Level 0.3 cluster composition: verify every 4-key cluster is built from exactly two previously-drilled Level 0.2 pairs, never introducing a key not seen in Level 0.2.
5. `T0-GEN-005` — Level 0.3 scrambled-section determinism: verify the "scrambled but seeded" final 3 cycles are genuinely deterministic per seed (not truly random), consistent with the project-wide determinism contract.
6. `T0-GEN-006` — Level 0.4 fragment #8 preview check: verify the doubled-equals chord fragment renders correctly and is tagged as a "Tier 2 preview" in its metadata, distinct from ordinary Tier 0 content.
7. `T0-GEN-007` — Level 0.5 Boss completeness: verify the boss content programmatically includes at least one instance of every single key introduced across Levels 0.1-0.4 (a coverage-completeness check, directly analogous to the coverage-check concept established in the Weakness Model deep-dive chapter).
8. `T0-GEN-008` — AZERTY digit sub-drill: verify AZERTY-layout generation includes the Shift-digit sub-sequence from §7.1, and verify QWERTY-US generation does NOT include it (a negative test, confirming layout-specific behavior doesn't leak into other layouts).
9. `T0-GEN-009` — QWERTZ Level 0.0 injection: verify QWERTZ-layout generation includes the Y/Z pre-drill from §7.2 before any Level 0.1 content, and verify no other layout includes this sub-level.
10. `T0-GEN-010` — Cross-layout key-lookup isolation: verify that changing the `layout` parameter alone (with all other parameters held constant) changes ONLY the physical key positions in the output, never the sequencing logic, repetition counts, or thresholds — proving the architecture cleanly separates "what to drill and how much" (layout-independent) from "which physical key" (layout-dependent), per the design implied throughout §7.

## 9. Register entry

| Field | Value |
|---|---|
| type | curriculum-design (exhaustive generator parameter tables) |
| license | original work — ours |
| status | draft — reference material at the same specification depth as `levels-01`; not a build commitment |
| relationship to validation gate | Consistent with all other Tier 0 material: prep, not a shipped-feature commitment |
