# NEW: Tier 0 — Finger Placement and Symbol Foundations (Precedes the Existing Tier 1)

**The gap this closes, stated plainly:** general typing curricula (TypingClub, Ratatype, and similar) never start with whole words. They start with **one key**, alone: press `f` repeatedly, then `j`, then alternate `f j f j`, then bring in `d k`, then `fj dk fj dk`, and only after that build up to real words. This graduated, single-key-then-pair-then-word structure is exactly what was **missing** from the programmer track's Tiers 1-6 — those tiers started at "type a full bracket pair" or "type a full operator," which is roughly equivalent to a general-typing course starting at "type a whole word" without ever practicing the individual keys first.

**This file adds that missing foundation as a new Tier 0**, sitting before the existing Tier 1 (Brackets & Pairs). It follows the same single-key → pair → short-burst progression that general typing already uses, applied specifically to the symbol keys programmers need most (which are disproportionately reached with Shift or awkward stretches, unlike home-row letters) and to correct finger assignment for those keys.

---

## 1. Why symbol keys need this more than letter keys do

A touch-typing learner already gets solid practice on letter keys through any general typing course. What they usually **never get dedicated practice on** is:
- The **individual symbol keys** programmers use constantly: `( ) [ ] { } = + - * / < > ! & | ^ ~ % # @ _ \ ; : ' " ,`.
- The **correct finger** for each of these, since many symbol keys sit outside the home row or require a Shift-hand coordination that letter-only practice never builds.
- The **muscle memory for reaching a symbol key while the other hand holds or reaches for Shift**, a distinct motor pattern from plain letter typing.

**This is not a new invention — it's applying the exact same, well-established teaching method (isolate one key, drill it alone, then drill it in pairs, then in short bursts) to a set of keys that normally get skipped over.**

---

## 2. The standard finger-to-key assignment being taught (QWERTY reference)

This is the conventional touch-typing finger map, restated here because Tier 0's drills are built directly on it — a learner needs to know which finger to use before drilling with that finger.

| Finger | Home key | Keys it reaches (including symbols, standard US QWERTY) |
|---|---|---|
| Left pinky | `a` | `` ` `` `1` `q` `a` `z` (and Shift, Caps Lock, Tab) |
| Left ring | `s` | `2` `w` `s` `x` |
| Left middle | `d` | `3` `e` `d` `c` |
| Left index | `f` | `4` `5` `r` `t` `f` `g` `v` `b` |
| Right index | `j` | `6` `7` `y` `u` `h` `j` `n` `m` |
| Right middle | `k` | `8` `i` `k` `,` |
| Right ring | `l` | `9` `o` `l` `.` |
| Right pinky | `;` | `0` `-` `=` `p` `[` `]` `\` `;` `'` `/` (and Shift, Enter) |
| Thumbs | Space | Space bar |

**Shift-symbol pairs (each requires the OPPOSITE hand's pinky on Shift while the other hand reaches the key):**
| Symbol | Base key | Finger for the symbol | Shift hand |
|---|---|---|---|
| `!` | `1` | Left pinky | Right pinky (Shift) |
| `@` | `2` | Left ring | Right pinky (Shift) |
| `#` | `3` | Left middle | Right pinky (Shift) |
| `$` | `4` | Left index | Right pinky (Shift) |
| `%` | `5` | Left index | Right pinky (Shift) |
| `^` | `6` | Right index | Left pinky (Shift) |
| `&` | `7` | Right index | Left pinky (Shift) |
| `*` | `8` | Right middle | Left pinky (Shift) |
| `(` | `9` | Right ring | Left pinky (Shift) |
| `)` | `0` | Right pinky | Left pinky (Shift) |
| `_` | `-` | Right pinky | Left pinky (Shift) |
| `+` | `=` | Right pinky | Left pinky (Shift) |
| `{` | `[` | Right pinky | Left pinky (Shift) |
| `}` | `]` | Right pinky | Left pinky (Shift) |
| `:` | `;` | Right pinky | Left pinky (Shift) |
| `"` | `'` | Right pinky | Left pinky (Shift) |
| `<` | `,` | Right middle | Left pinky (Shift) |
| `>` | `.` | Right ring | Left pinky (Shift) |
| `?` | `/` | Right pinky | Left pinky (Shift) |
| `\|` | `\` | Right pinky | Left pinky (Shift) |

**Non-shifted symbol keys (no Shift needed, just a direct reach):**
| Symbol | Finger |
|---|---|
| `-` | Right pinky |
| `=` | Right pinky |
| `[` | Right pinky |
| `]` | Right pinky |
| `\` | Right pinky |
| `;` | Right pinky |
| `'` | Right pinky |
| `,` | Right middle |
| `.` | Right ring |
| `/` | Right pinky |

**Note on non-US layouts:** this table is QWERTY-US specific. The actual product must generate an equivalent table per layout (UK QWERTY, AZERTY, QWERTZ, Dvorak, Colemak all place symbols differently) — this is flagged as required follow-up work, not solved by this single table, exactly as the existing spec already requires layout-aware symbol maps.

---

## 3. Tier 0 level structure (5 levels, mirroring the single-key → pair → burst progression)

### Level 0.1 — Single symbol key isolation (one key at a time)

**What it drills:** exactly one symbol key, repeated, with rest keystrokes on the home row in between — precisely mirroring how a general course drills `f` alone before combining it with anything else.

**Worked example pattern (for the `(` key specifically):**
```
( ( ( ( (
a( a( a( a(
( a ( a ( a
```
*(The home-row `a` keystrokes between reaches are intentional — this is the same "anchor to a home key, reach out, return" pattern general courses use for letter keys, applied here to a symbol.)*

**Progression through Level 0.1:** drill each of the 10 non-shifted symbol keys individually first (lower motor complexity, no Shift coordination needed), THEN each of the 20 Shift-symbol pairs individually (higher complexity, now requires two-hand coordination).

**Pass criterion:** a `[proposal]`, consistent with the existing spec's calibration approach — 95%+ accuracy on that single key across a short repeated drill (e.g., 20 repetitions) before moving to the next key.

### Level 0.2 — Two-symbol alternation (mirroring `fj fj` drills)

**What it drills:** alternating between TWO symbol keys, building the same back-and-forth rhythm general courses build with `f` and `j`.

**Worked example pattern (alternating `(` and `)`):**
```
() () () ()
)( )( )( )(
( ) ( ) ( )
```

**Worked example pattern (alternating a Shift-pair, `!` and `@`):**
```
!@ !@ !@ !@
@! @! @! @!
```

**Progression:** start with alternating pairs that are naturally related (opening/closing brackets, since they're typed together constantly in real code), then move to less-related pairs (e.g., `=` and `-`) to build general symbol-reaching fluency, not just paired-bracket fluency.

### Level 0.3 — Three-to-four key clusters (mirroring `fjdk` drills)

**What it drills:** short bursts cycling through 3-4 related symbol keys, the direct symbol-key equivalent of a general course's `fjdk fjdk` stage.

**Worked example pattern (the four bracket-opening/closing keys `( ) [ ]`):**
```
()[] ()[] ()[]
[]() []() []()
( [ ) ] ( [ ) ]
```

**Worked example pattern (four common operator-adjacent keys `= + - _`):**
```
=+-_ =+-_ =+-_
```

### Level 0.4 — Symbol key + home-row letter combinations (mirroring the point where general courses introduce short "words" using only learned keys)

**What it drills:** the first appearance of a symbol INSIDE a minimal, realistic-looking fragment, using only home-row letters plus the symbols learned so far — bridging from pure key drills to the existing Tier 1's "pairs with content" level.

**Worked example pattern:**
```
(a) [s] {d}
a = s
(a, s)
```

**This level is the explicit bridge into the EXISTING Tier 1, Level 2 ("pairs with content")** — a learner who completes Tier 0 arrives at the current Tier 1 already having drilled every individual key involved, rather than meeting brackets for the first time in full combined form.

### Level 0.5 Boss — "Symbol Warm-Up" (mixed review of all Tier 0 keys)

**What it drills:** a mixed set cycling through every symbol key introduced in 0.1-0.4, in short bursts, as the capstone before entering Tier 1 proper.

**Worked example pattern:**
```
( ) [ ] { } = + - _
! @ # $ % ^ & * ( )
(a) [s] {d} a=s a+s
```

**Pass criterion:** 95%+ accuracy across the full mixed set, matching the accuracy bar used at the START of the existing Tier 1 (Level 1, per the master spec's table: "≥ 95%").

---

## 4. Where this fits in the overall level numbering

**Recommended integration (a `[proposal]` for the actual spec update):** insert Tier 0 as **Levels 0.1-0.5**, presented to the user as "Level 0" or "Foundations," appearing BEFORE Level 1 in the level map, with its own distinct visual treatment (e.g., a different color/icon) signaling it's optional-but-recommended prep rather than a full numbered tier — similar to how some general typing courses offer an optional "keyboard basics" module before their main numbered lesson sequence.

**Who should be routed here:** the placement/baseline test (already specified in the master spec and implementation guide) should route a user to Tier 0 specifically if their baseline shows **low accuracy or high hesitation on symbol keys specifically** (a signal the existing weakness model, per Chapter 8, already computes) — rather than force EVERY user through it, since an experienced programmer with strong existing symbol fluency should be able to test out directly into Tier 1, exactly as the existing "test-out" mechanism already allows for every other tier.

---

## 5. What this section does NOT yet do (honest scope note, matching the correction's spirit)

This is **reference/design material**, not a claim that Tier 0 is approved for build ahead of the validation gate — it sits at the same "prepared, not committed" status as the Tier 7-12 material. It gives:
- The finger-to-key mapping (a real, usable reference table).
- The 5-level pedagogical structure with worked example patterns for each level.
- The routing logic concept (who should see it).

It does **not** yet give: the actual full drill-generator parameter tables (analogous to the detail level in `levels-01-vocabulary-and-generation-parameters.md` for Tiers 1-6) or per-layout finger maps beyond the single QWERTY-US table shown. Those would be the natural next step, at the same level of detail as the existing Tier 1-6 material, once/if this Tier 0 concept is validated as something worth building.

## 6. Register entry

| Field | Value |
|---|---|
| type | curriculum-design (new tier concept + reference tables) |
| license | original work — ours |
| status | draft — reference material, not a build commitment |
| relationship to validation gate | Consistent with it: this is prep material, not a shipped feature; still requires the same demand validation as Tiers 7-12 before being built into the product |
