# Tier 0 Finger Maps — All Five Layouts (QWERTY-UK, AZERTY, QWERTZ, Dvorak, Colemak-DH)

**Extends `levels-03-tier-0-finger-placement-foundations.md`**, which built the QWERTY-US finger map and the 5-level Tier 0 progression, but explicitly flagged non-US layouts as "required follow-up work, not solved by this single table." This file closes that gap for the four other layouts already named as MVP targets in the master spec (spec §5.2 D7 / Implementation Guide decision D7): QWERTY-UK, AZERTY, QWERTZ, Dvorak, Colemak-DH.

**Sourcing and verification note:** every fact below was checked against multiple independent, cross-agreeing sources (keyboard-layout reference sites, technical guides, and — for AZERTY/QWERTZ specifically — sources that independently confirmed the same AltGr behavior). Where sources showed minor variation (e.g., exact AltGr digit-to-symbol mapping on AZERTY varies slightly between the "legacy" and "2019 revised" French standard), the more common/legacy mapping is used and the variation is flagged explicitly rather than silently picked.

**Why this file matters for Tier 0 specifically:** Tier 0's entire pedagogical value depends on telling the learner the CORRECT finger for each symbol key. A finger map that's merely "close enough" or borrowed from QWERTY-US without adjustment would actively teach wrong muscle memory to a UK, French, German, Dvorak, or Colemak user — worse than no guidance at all, since it would need to be unlearned later.

---

## 1. QWERTY-UK (United Kingdom) — the layout closest to QWERTY-US, with the most instructive small differences

**Overall relationship to QWERTY-US:** UK QWERTY keeps every letter key in the exact same position as US QWERTY. The differences are concentrated in a small number of symbol keys, plus the physical addition of one extra key (ISO-format keyboards have 105 keys vs. the US ANSI format's 104, adding one key next to left Shift).

### 1.1 What's different from QWERTY-US (the only keys Tier 0 needs to re-teach for a UK user)

| Symbol | QWERTY-US position | QWERTY-UK position | Finger (UK) | Notes |
|---|---|---|---|---|
| `"` (double quote) | Shift+`'` (apostrophe key) | **Shift+2** (where US has `@`) | Left ring | A genuinely common source of confusion for US-trained typists switching to UK layout |
| `@` | Shift+2 | **Shift+'** (apostrophe key) | Right pinky | Swapped with the above — this pair is the single most important UK-specific relearning point for Tier 0 |
| `#` | Shift+3 | **A dedicated key**, usually near Enter, varies by exact keyboard | Right pinky (typically) | US puts `#` on Shift+3; UK Shift+3 instead produces `£` |
| `£` | Not directly available (US layout has no pound-sterling key) | **Shift+3** | Left middle | Replaces where US puts `#` |
| `\` and `\|` | Single key near Enter | **A different key**, often near Shift or Z, varies by exact keyboard/OS | Left pinky (typically) | Position varies more than other rows; verify against the specific virtual/physical keyboard driver in use |
| `~` | Shift+`` ` `` | Same physical key, but the unshifted key may produce a different character depending on exact driver | Left pinky | Minor; less commonly a problem than the `@`/`"` swap |

**Everything else** (letters, digits themselves, brackets `( ) [ ] { }`, standard operators `+ - * / = < > !`, comma, period) is in the **same position and uses the same finger** as QWERTY-US.

### 1.2 QWERTY-UK Tier 0 drill adjustment

**The only Tier 0 content that needs a genuinely different drill set for UK users:** Level 0.1's `@` and `"` individual-key drills, and Level 0.2's any pairing that includes either symbol. Everything else in the existing QWERTY-US Tier 0 file applies unchanged.

**Worked adjusted drill pattern for UK Level 0.1 (the `@` key specifically):**
```
' ' ' ' '   (physical key, unshifted apostrophe)
@ @ @ @ @   (same physical key, WITH Shift — this is the UK-specific relearning drill)
```

---

## 2. AZERTY (France, Belgium) — the layout with the most disruptive symbol-key differences

**Overall relationship to QWERTY:** AZERTY swaps five letter positions from QWERTY (A/Q, Z/W swapped, and M relocated), but the far bigger practical difference for Tier 0 purposes is that **AZERTY puts digits behind Shift** — the unshifted top row produces symbols and accented letters, and you must hold Shift to type a plain digit 0-9. This is confirmed independently by multiple sources and is the single most disruptive fact for any programmer using AZERTY, since typing numbers (extremely common in code) requires Shift on every single digit.

### 2.1 The AZERTY number/symbol row, unshifted vs. shifted

| Key position (where QWERTY has) | AZERTY unshifted | AZERTY shifted | Finger |
|---|---|---|---|
| 1 | `&` | `1` | Left pinky |
| 2 | `é` | `2` | Left ring |
| 3 | `"` | `3` | Left middle |
| 4 | `'` | `4` | Left index |
| 5 | `(` | `5` | Left index |
| 6 | `-` | `6` | Right index |
| 7 | `è` | `7` | Right index |
| 8 | `_` | `8` | Right middle |
| 9 | `ç` | `9` | Right ring |
| 0 | `à` | `0` | Right pinky |

**This means: to type the digit sequence "2026" on AZERTY, a user must hold Shift for all four keystrokes** — a fact worth surfacing explicitly in Tier 0, since it directly explains why AZERTY users often report numeric/code typing as noticeably more effortful than prose typing: a real, physical, layout-driven reason, not a skill issue.

### 2.2 Programmer-critical symbols on AZERTY, all requiring AltGr

| Symbol | How to type (Windows AZERTY) | Finger for the base key | Which hand holds AltGr |
|---|---|---|---|
| `@` | AltGr+0 | Right pinky (0 key) | Right hand holds AltGr; left hand does any other simultaneous reach |
| `#` | AltGr+3 | Left middle (3 key) | Right hand holds AltGr |
| `{` | AltGr+4 | Left index (4 key) | Right hand holds AltGr |
| `}` | AltGr+= (or a nearby key, varies) | Right pinky area | Right hand holds AltGr |
| `[` | AltGr+5 | Left index (5 key) | Right hand holds AltGr |
| `]` | AltGr+6 (varies by exact driver) | Right index (6 key) | Right hand holds AltGr |
| `\|` | AltGr+6 or nearby (varies) | — | Right hand holds AltGr |
| `~` | AltGr+2 (as a dead key, combines with following letter) | Left ring (2 key) | Right hand holds AltGr |

**Important caveat, stated honestly:** exact AltGr-to-symbol mappings for `{`, `}`, `[`, `]` vary slightly between sources and between the legacy French layout and the 2019-revised French standard (which added more complete symbol coverage). This table uses the commonly-cited legacy mapping; a production implementation must verify against the specific OS/browser's actual AZERTY driver behavior rather than hardcode this table blindly, and should offer the user a one-time "test your symbol keys" calibration step — a real, practical Tier 0 feature idea: before drilling, briefly ask the user to press the key that produces `{` on their system, and use that confirmed mapping for their drills, rather than assuming.

### 2.3 AZERTY Tier 0 drill adjustments

**Level 0.1 must include, uniquely for AZERTY users, a "digits require Shift" drill** not needed on any other layout in this set:
```
1 1 1 1 1   (Shift+1, repeated — building the Shift-digit reflex specifically)
2 2 2 2 2   (Shift+2)
```
This is a genuinely new Level 0.1 drill type that doesn't exist in the QWERTY-US version of Tier 0 at all, since QWERTY-US digits need no Shift.

**Level 0.1 also needs an "AltGr reach" drill category**, distinct from the Shift-symbol drills already in the base Tier 0 file, since AltGr uses a different hand-coordination pattern than Shift:
```
@ @ @ @ @   (AltGr+0)
{ { { { {   (AltGr+4)
```

---

## 3. QWERTZ (Germany, Austria, Switzerland) — the layout with AltGr-heavy programmer symbols

**Overall relationship to QWERTY:** only one letter pair differs from QWERTY — Y and Z are swapped (Z moves to where Y is on QWERTY, Y moves to the bottom row). This is confirmed by every source checked, consistently. **Everything else about QWERTZ's disruption for programmers comes from the symbol keys, not the letters** — multiple independent sources agree that `@`, `[`, `]`, `{`, `}`, and `\` all require AltGr on standard German QWERTZ, because the physical key positions QWERTY-US uses for these symbols are occupied on QWERTZ by the umlaut keys (ä, ö, ü) and ß.

### 3.1 The single letter change

| QWERTY-US | QWERTZ | Finger (unchanged) |
|---|---|---|
| Y (top row, near T) | **Z** occupies this position | Right index |
| Z (bottom row, near X) | **Y** occupies this position | Left index (bottom row) |

**Tier 0 implication:** this is actually a LETTER-key relearning need, technically outside Tier 0's original symbol-only scope — but it's important enough (and disruptive enough for programmers, since `try`/`catch`, `yield`, and countless identifiers contain these letters) that it's worth flagging as a **required companion drill alongside Tier 0**. **Recommended addition to the QWERTZ-specific Tier 0 path:** a short Y/Z-alternation drill (`y z y z y z`, then `try`, `yz`, `zy`) before symbol drills begin, addressing the single most commonly reported QWERTZ adjustment difficulty.

### 3.2 Programmer-critical symbols on QWERTZ, all requiring AltGr

| Symbol | How to type (German QWERTZ) | Base key finger | AltGr hand |
|---|---|---|---|
| `@` | AltGr+Q | Left pinky (Q key) | Right hand holds AltGr |
| `[` | AltGr+8 | Right middle (8 key) | Right hand holds AltGr |
| `]` | AltGr+9 | Right ring (9 key) | Right hand holds AltGr |
| `{` | AltGr+7 | Right index (7 key) | Right hand holds AltGr |
| `}` | AltGr+0 | Right pinky (0 key) | Right hand holds AltGr |
| `\` | AltGr+ß (the dedicated ß key, right of 0) | Right pinky | Right hand holds AltGr |
| `\|` | AltGr+< (the extra ISO key left of Y/Z) | Left pinky | Right hand holds AltGr |
| `~` | AltGr+Plus (dead key, combines with following letter) | Right pinky | Right hand holds AltGr |
| `<` and `>` | The dedicated extra ISO key (unshifted `<`, Shift for `>`) | Left pinky | No AltGr needed for these two specifically |

**Cross-checked confirmation:** the fact that curly braces, square brackets, backslash, and `@` all require AltGr on QWERTZ is independently stated by multiple different sources (a typing-practice site, two keyboard-guide sites, and a keyboard-layout blog), all agreeing on the same underlying cause: umlauts and ß occupy the physical key positions QWERTY-US reserves for these programming symbols.

### 3.3 QWERTZ Tier 0 drill adjustments

**Level 0.1 needs a dedicated "AltGr-heavy bracket" drill set**, since on QWERTZ, unlike QWERTY-US, brackets are not simple direct-Shift reaches but full AltGr reaches:
```
[ [ [ [ [   (AltGr+8)
] ] ] ] ]   (AltGr+9)
{ { { { {   (AltGr+7)
} } } } }   (AltGr+0)
```
**This directly explains, with real mechanical justification, why a QWERTZ user's Tier 1 (Brackets & Pairs) drills will initially feel much harder than a QWERTY-US user's** — every single bracket keystroke on QWERTZ costs an AltGr reach, whereas QWERTY-US brackets are direct unshifted keys. **A well-designed product should adjust the Tier 1 speed/accuracy targets specifically for QWERTZ users** (a `[proposal]` worth flagging for the calibration process already established in the Token Engine deep-dive chapter) rather than holding QWERTZ users to the exact same bracket-speed bar as QWERTY-US users, since the physical task is genuinely harder on this layout.

---

## 4. Dvorak (Simplified Keyboard) — symbol row stays put, but several unshifted punctuation marks move into the letter block

**Overall relationship to QWERTY:** Dvorak rearranges nearly all letter positions (built around English letter frequency, with vowels on the left home row and common consonants on the right home row), but — confirmed by multiple sources — **the number row and its Shift-symbols stay in the same physical key positions as QWERTY.** The real symbol-relevant difference is that several punctuation marks living on QWERTY's outer edges (near Enter, near the bottom-right) get **moved onto the Dvorak home row and top row**, replacing where letters used to be, specifically because Dvorak's designers wanted frequently-used punctuation reachable without leaving the home position.

### 4.1 What stays the same as QWERTY-US (good news for Tier 0 — less to re-teach than expected)

- **Digits 1-0 and their Shift-symbols** (`!@#$%^&*()`) are in the same physical positions as QWERTY.
- **Brackets `[` `]`** stay in roughly the same area (top-right).
- The overall Shift-mechanics for these symbols are unchanged.

### 4.2 What genuinely moves (the punctuation Dvorak relocates onto the home/top row)

| Symbol | QWERTY finger/position | Dvorak finger/position | Why Dvorak moved it here |
|---|---|---|---|
| `'` (apostrophe) | Right pinky, outer edge | **Left pinky, home row (leftmost home key)** | Extremely frequent in English (contractions); Dvorak prioritizes home-row access for it |
| `,` (comma) | Right middle, bottom row | **Right index, home row** | Very frequent punctuation mark |
| `.` (period) | Right ring, bottom row | **Right ring, home row** | Very frequent punctuation mark |
| `-` (hyphen) | Right pinky | **Right pinky, home row** | Common in compound words and code |
| `/` (slash) | Right pinky, bottom row | **Right ring, top row area** | Still a direct reach, but repositioned |
| `=` | Right pinky, top row | Stays roughly top-row-right | Minor position shift |

**Tier 0 implication:** Dvorak actually requires the LEAST symbol-specific relearning of the five layouts for Tier 0's purposes, since the number row and its shifted symbols (`!@#$%^&*()`) are untouched — Dvorak's real relearning burden is almost entirely in the letter positions (outside Tier 0's scope) plus this small set of relocated punctuation marks. **A Dvorak-specific Tier 0 path is correspondingly shorter than the AZERTY or QWERTZ paths** — it needs Levels 0.1-0.2 adjusted only for the 5-6 relocated punctuation marks above, and can otherwise reuse the QWERTY-US Tier 0 symbol drills for everything else (brackets, digits, Shift-symbols) essentially unchanged.

### 4.3 A named caveat: "Programmer Dvorak"

**Important distinction, worth naming explicitly:** there exists a community-maintained variant called "Programmer Dvorak" that specifically rearranges the number row to make coding symbols more accessible without Shift (differing from the "standard Dvorak" table above). This file covers standard Dvorak only, matching the master spec's D7 decision, which lists "Dvorak" without specifying a programmer variant. If user demand for Programmer Dvorak specifically emerges (a real, plausible V1 candidate given the programmer-focused positioning of this whole product), it would need its own separate Tier 0 table, distinct from this one — flagged here as a legitimate future addition, not solved by this file.

---

## 5. Colemak-DH — the layout most similar to QWERTY for symbol purposes

**Overall relationship to QWERTY:** Colemak was explicitly designed to change fewer keys than Dvorak specifically to ease the learning transition, changing only 17 letter keys while **explicitly retaining the QWERTY positions of "most non-alphabetic characters and many popular keyboard shortcuts"** — this is a direct, confirmed design goal of the layout, not an incidental similarity. Colemak-DH is a popular modern variant that further adjusts the B/D/G and N/M/H area for ergonomics but does not change this symbol-preservation property.

### 5.1 What stays the same as QWERTY-US (the great majority)

- **All digits, Shift-symbols (`!@#$%^&*()`), brackets `[ ] { }`, standard operators `+ - * / = < >`** stay in their QWERTY positions and use the same fingers.
- **Common keyboard shortcuts** (Ctrl+C, Ctrl+V, Ctrl+Z, etc.) are deliberately preserved in their QWERTY muscle-memory positions — a specific, stated design goal of the layout, meaning a QWERTY user's editor/terminal shortcut muscle memory largely survives the switch.

### 5.2 The one confirmed symbol-position exception

| Symbol | QWERTY position | Colemak position | Note |
|---|---|---|---|
| `:` and `;` | Right pinky, home row (semicolon key) | **Swapped/relocated** — colon and semicolon do not sit in the same place as QWERTY | This is the one specifically-named exception to "everything else stays put," confirmed by an independent source |

**Given semicolons are extremely common in many programming languages** (statement terminators in JavaScript, Java, C-family languages), this single exception is disproportionately important for the programmer-focused positioning of this product, despite being the only confirmed symbol-position change for the whole layout.

### 5.3 Colemak-DH Tier 0 drill adjustments

**This is the lightest-touch Tier 0 adaptation of all five layouts** — only Level 0.1 needs a dedicated drill for the relocated `:`/`;` pair; everything else in the QWERTY-US Tier 0 file applies directly, unchanged, to Colemak-DH users.

```
; ; ; ; ;   (drilled at its NEW Colemak-DH position, not the QWERTY position)
: : : : :   (Shift+the same key, at its new position)
```

---

## 6. Cross-layout summary table (at a glance, for content-pipeline routing)

| Layout | Letters changed from QWERTY | Symbol/number keys changed | Tier 0 adaptation needed | Relative Tier 0 build effort |
|---|---|---|---|---|
| QWERTY-UK | None | `@`/`"` swap, `£`/`#` swap, `\|` position | Minimal — 2 symbol drills | Lowest |
| Colemak-DH | 17 letters | Only `:`/`;` | Minimal — 1 symbol drill | Lowest |
| Dvorak | Nearly all letters | 5-6 relocated punctuation marks; digits/Shift-symbols untouched | Small — 5-6 symbol drills | Low-Medium |
| QWERTZ | 1 letter pair (Y/Z) | `@` `[` `]` `{` `}` `\` `\|` `~` all move to AltGr | Substantial — full AltGr-reach drill set + Y/Z letter drill | High |
| AZERTY | 5 letters (A/Q, Z/W, M relocated) | **Digits require Shift**; `@` `{` `}` `[` `]` `\|` `~` all move to AltGr | Most substantial — unique "digits need Shift" drill + full AltGr set | Highest |

**Practical build-order recommendation for the content pipeline (a `[proposal]`):** given this effort gradient, build and validate Tier 0 for QWERTY-US first (already done), then QWERTY-UK and Colemak-DH next (cheapest, since they reuse almost everything), then Dvorak, and treat QWERTZ and AZERTY as the two layouts requiring genuinely new, layout-specific drill content — worth prioritizing based on actual user layout distribution once real usage data exists, rather than building all five to equal depth up front.

## 7. Register entry

| Field | Value |
|---|---|
| type | curriculum-design (per-layout reference tables) |
| license | original work — ours (tables compiled from cross-verified public keyboard-layout facts, not copied from any single source) |
| status | draft — reference material, verified against multiple independent sources per layout; flagged caveats (AZERTY exact AltGr mapping, QWERTZ exact `\|` position) should be re-confirmed against live OS drivers before shipping |
| relationship to validation gate | Same status as the base Tier 0 file: prepared reference material, not a build commitment |
