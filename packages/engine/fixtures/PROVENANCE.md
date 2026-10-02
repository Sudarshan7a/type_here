# PROVENANCE — Worked Examples A–G expected values

> CONTRACT 1.4.0 + ENG-06 ADDENDUM (Wave 0.3 Slice 1): KeyEvent gained the
> optional `composition` IME-partial flag (CONTRACT_VERSION 1.3.0 → 1.4.0, an
> additive minor by the 1.0.0 → 1.2.0 precedent for optional `markers` /
> `meta.recorder` — old logs parse byte-identically, proven by
> `packages/schemas/tests/composition-contract.test.ts`). Three new fixtures
> pin ENG-06 input semantics — ENG-FIXTURE-E3 (caps-lock case errors),
> ENG-FIXTURE-E5 (dead-key sequence + IME guard), ENG-FIXTURE-E6 (emoji
> grapheme unit) — recomputed independently by the extended `recompute.mjs`
> (same no-engine-imports protocol). Engine comparison unit is now the
> grapheme cluster (`Intl.Segmenter`, no new dependency); `metrics.ts` is
> UNCHANGED, so final-text denominators still count UTF-16 units — the E6
> wart W1 below, flagged for the metrics slice (modelVersion bump required).

Arithmetic protocol (Session 2, Block E): every expected value below was
recomputed **independently** from the raw keystroke logs by
`fixtures/recompute.mjs` (a throwaway script that imports nothing from
`packages/engine`), using only the authoritative formulas in
`docs/spec/master-spec-v1.md` §6.1 and the `typing-metrics-spec` skill.
Chapter worked numbers that disagree are used **CORRECTED** in the fixtures;
the disagreements are listed here and reported to the main agent for
`docs/CHAPTER-ARITHMETIC-CORRECTIONS.md`.

Run the recompute yourself: `node fixtures/recompute.mjs` (from
`packages/engine`).

## Documented metric decisions (definitions the engine implements)

These are the definitions the recompute script and the engine both use. Where
the sources are silent or ambiguous, the decision is marked **[decision]** and
flagged in the session summary — formulas were never invented, only the
spec's formulas applied with the most defensible reading.

- **Word** = 5 characters (spec §6.1).
- **Duration** = `t(last scoring press) − t(first scoring press)`. The clock
  starts on the first accepted keystroke (chapter §4.2 + Edge Case E1);
  a keyup after the last accepted press does not extend it.
- **Scoring presses** = trusted (`isTrusted !== false`), non-`repeat`, non-`auto`
  keydowns whose `key` is a single character (printable) or `"Backspace"`.
  Modifier-only keydowns (Shift, Enter, Escape…) are captured but ignored by
  metrics. **[decision]** Rejected attempts (must-correct) ARE scoring presses
  (they are real physical key presses; the chapter's D01 counts them as
  "attempts").
- **ENG-06 addendum (CONTRACT 1.4.0):** scoring presses additionally exclude
  `composition === true` partials (M1-04 §6 — dropped before anything else,
  into `compositionDrops`; the `applyPress` guard covers direct callers) and
  `key === "Dead"` presses (chapter 4 E5 — into `deadKeys`; the completing
  press's gap to its predecessor already spans the dead interval, which is the
  combined single-character cost). "Printable" and every comparison now mean
  exactly ONE GRAPHEME (`Intl.Segmenter`): a decomposed `é` or a ZWJ emoji in
  one key value inserts once; a multi-grapheme single event is ignored (the
  input adapter must split commits one press per grapheme). A lone `Dead`
  with no completion is inert and never bounds the duration. ASCII logs are
  unaffected bit-for-bit (grapheme == code point there).
- **Raw WPM** = printable scoring presses ÷ 5 ÷ minutes. Printable includes
  wrong characters and must-correct rejected attempts. **[decision]** (chapter
  silent for must-correct; the free-mode parallel — wrong chars count — is
  applied).
- **Gross WPM** = characters in final text ÷ 5 ÷ minutes.
- **Net WPM** = correct characters in final text ÷ 5 ÷ minutes (correction
  time included; the clock keeps running).
- **Keystroke accuracy** = correct-at-press printable presses ÷ printable
  presses × 100. Backspace is NOT printable (excluded from the denominator).
  Rejected attempts count in the denominator. **[decision]** (implied by
  "corrected mistakes still count").
- **Final accuracy** = positions where final text matches the target ÷
  final-text length × 100. Empty buffer → 0 (degenerate, avoids a crash).
- **KSPC** = buffer-affecting keystrokes (accepted chars + accepted
  backspaces; rejected attempts never touched the buffer) ÷ final-text chars.
  Per chapter §4.5, rejected keystrokes do NOT count toward KSPC. A Backspace
  on an empty buffer is ignored and not counted. **[decision]** on
  empty-buffer backspace.
- **Must-correct Backspace semantics**: a Backspace while a rejected attempt
  is pending clears the error state WITHOUT popping the buffer (chapter D01:
  "accepted (clears the error)" — the wrong char never entered the buffer);
  otherwise it pops the last buffer char. This is what makes D01's 12/11 KSPC
  work. **[decision]** on the exact mechanism.
- **Rollover ratio** = presses typed while the immediately preceding press's
  key was still down ÷ presses that have a predecessor (transitions). See
  "Ambiguity A1" below — this reading reconciles spec §6.1's wording with the
  chapter §4.6 worked example and makes exact 0%/100% companions possible.
  Key state is matched by `event.code` (physical key); a press with no
  matching keyup is conservatively not counted as overlapped.
- **IKI** = gaps between consecutive scoring-press times; gaps > 5000 ms are
  excluded from the mean; null when no samples remain. Backspaces and
  rejected attempts are part of the sequence (physical presses).
- **Burst WPM** = best rolling window `[t, t+5000)` anchored at accepted user
  insert times; burst = (inserts in window ÷ 5) ÷ (5/60) — the denominator is
  the **full 5 s window**. Later-deleted inserts count (they were typed);
  auto-inserted ones do not. **[decision]** on denominator and insert set.
- **Consistency** = 100 × (1 − CV) of per-second net speed; per-second value =
  correct accepted user inserts in full second `[s·1000, (s+1)·1000)` × 12
  (chars÷5÷(1/60) min); seconds 0 and 1 excluded; only full seconds within
  the duration; population stdev; clamped 0–100; **null when scored duration
  < 10 000 ms** (documented minimum scored duration, chosen per the Session 2
  plan). Pauses are NOT excluded from consistency (chapter §4.7 explicitly
  wants them penalized, unlike IKI). Mean 0 → 0.
- **Verified mode** (E2): `isTrusted === false` events are dropped from all
  scoring (they never reach the buffer either) and flag `"untrusted-events"`;
  `auto === true` events enter the buffer (they are in the final text) but are
  excluded from all keystroke metrics and flag `"auto-events-present"`. In a
  verified session, untrusted/auto input or blur/hidden markers invalidate
  verification: `verified: false` + flag `"verified-invalid-input"`
  (chapter 4 part2 §4.10). Key repeats are always dropped, silently.
- **Difficulty band**: `null` in this slice — the typability-band model is a
  later milestone; the field is carried per contract.
- **modelVersion**: `"1.0.0"` (`ENGINE_MODEL_VERSION`, first real metrics code).

## Raw-log construction notes (underdetermined timestamps)

The chapter tables for A–D, F list keydowns only. Keyups are required for
rollover detection, so they are constructed at `t + 100 ms` (strictly before
the next keydown in every one of these fixtures → rollover 0), except where
the chapter gives them explicitly (E01, G01). E01/E03's keyups come verbatim
from the chapter / are constructed to overlap exactly.

- **C01**: chapter gives no keystroke table; it says "same timing skeleton as
  Example A". Constructed: A's 11 timestamps with `o` replacing the `a` at
  2 727 ms → final text `the cot sat` at 5 454 ms.
- **F01**: chapter leaves timestamps underdetermined and is internally
  inconsistent (see Corrections below). Constructed so that every stated total
  holds exactly: 44 chars; chars 1–22 at `k·(4000/21)`, k = 0…21 (last at
  exactly 4 000 ms); chars 23–44 at `12000 + m·(4000/21)`, m = 0…21 (last at
  exactly 16 000 ms); pause 4 000 → 12 000 = 8 000 ms with zero keystrokes.
- **E02** (chapter §4.13 #11): `the quick brown fox` (19 chars), keydowns at
  150 ms spacing, keyups at +75 ms → zero overlap.
- **E03** (chapter §4.13 #12): `fjdksl`, keydowns at 60 ms spacing, each keyup
  at +110 ms (after the next keydown) → every transition overlaps.

## Recomputed expected values (recompute.mjs output)

Full-precision values; fixtures compare with absolute tolerance 1e-6.

| Metric | A01 | B01 | C01 | D01 | E01 | E02 | E03 | F01 | G01 |
|---|---|---|---|---|---|---|---|---|---|
| rawWpm | 24.2024202 | 24.5985651 | 24.2024202 | 26.2008734 | 400 | 84.4444 | 240 | 33.0 | 26.6667 |
| grossWpm | 24.2024202 | 22.5486847 | 24.2024202 | 22.1699698 | 400 | 84.4444 | 240 | 33.0 | 26.6667 |
| netWpm | 24.2024202 | 22.5486847 | 22.0022002 | 22.1699698 | 400 | 84.4444 | 240 | 33.0 | 26.6667 |
| keystrokeAccuracy | 100 | 91.6666667 | 90.9090909 | 84.6153846 | 100 | 100 | 100 | 100 | 100 |
| finalAccuracy | 100 | 100 | 90.9090909 | 100 | 100 | 100 | 100 | 100 | 100 |
| kspc | 1.0 | 1.1818182 | 1.0 | 1.0909091 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| rolloverRatio | 0 | 0 | 0 | 0 | 1.0 | 0 | 1.0 | 0 | 0 |
| consistency | null | null | null | null | null | null | null | 0 (clamped) | null |
| burstWpm | 24.0 | 24.0 | 24.0 | 21.6 | 4.8 | 45.6 | 14.4 | 52.8 | 4.8 |
| ikiMeanMs | 545.4 | 487.8333333 | 545.4 | 458.0 | 60 | 150 | 60 | 190.4761905 | 900 |
| durationMs (details) | 5454 | 5854 | 5454 | 5954 | 60 | 2700 | 300 | 16000 | 900 |
| rejectedAttempts / totalAttempts | 0/11 | 0/13 | 0/11 | 2/14 (rate 14.2857%) | 0/2 | 0/19 | 0/6 | 0/44 | 0/2 |

## Recomputed expected values for ENG-06 (recompute.mjs output)

| Metric | E3-caps | E5-deadkey | E6-emoji |
|---|---|---|---|
| rawWpm | 30.0 | 30.0 | 32.7272727273 |
| grossWpm | 30.0 | 30.0 | 81.8181818182 (W1) |
| netWpm | 18.0 | 30.0 | 27.2727272727 (W1) |
| keystrokeAccuracy | 60.0 | 100 | 83.3333333333 |
| finalAccuracy | 60.0 | 100 | 33.3333333333 (W1) |
| kspc | 1.0 | 1.0 | 0.4666666667 (W1) |
| rolloverRatio | 0 | 0 | 0 |
| consistency | null | null | null |
| burstWpm | 12.0 | 24.0 | 14.4 |
| ikiMeanMs | 500.0 | 444.4444444444 | 366.6666666667 |
| durationMs (details) | 2000 | 4000 | 2200 |
| printable / correctPrintable | 5 / 3 | 10 / 10 | 6 / 5 |
| correctCharsInFinalText | 3 | 10 | 5 (units) |
| finalTextLength (details) | 5 | 10 | 15 (W1: UTF-16 units) |
| bufferInserts / backspaces | 5 / 0 | 10 / 0 | 6 / 1 |
| rejectedAttempts / totalAttempts | 0/5 | 0/10 | 0/7 |
| filter buckets (info only) | — | composition 5, dead 2, ignored 2 (Escape + empty commit) | — |

### E3 (§4.9 E3) — `ENG-FIXTURE-E3-caps-lock-case-errors`, target `ab 12`

`A` (Shift-held) @0, `B` (Caps-Lock, no mods) @500, ` `@1000, `1`@1500,
`2`@2000; keyups +100 ms. 5 printable presses, 3 correct-at-press
(space/digits — caps leaves non-letters alone, the adversarial pin).
raw = gross = 5/5 ÷ (2000/60000) = 30.0; net = 3/5 ÷ (2000/60000) = 18.0;
accuracies 3/5 = 60%; KSPC 5/5 = 1.0; burst 5 → 12.0; IKI 2000/4 = 500 ms;
rollover 0/4. Case-error subtype: positions 0–1 are substitutions with
`typed.toLowerCase() === intended` and `code === Key<intended>` — codes
`KeyA`/`KeyB` preserved for layout attribution (E3/E8); Shift vs Caps-Lock
paths score identically.

### E5 (§4.9 E5 + M1-04 §6) — `ENG-FIXTURE-E5-dead-key-sequence`, target `naïve café`

Abandoned IME (`i`@0, `ï`@150 composition:true, `Escape`@300) proves partials
never score and never start the E1 clock; `n`@500 … `f`@3900 even 400 ms pace;
`Dead`@1300 + `ï`@1500 (one char, gap 600 ms carries the 200 ms dead span);
IME `é` via `e`@4200 + `é`@4350 partials + commit@4500 (one char, gap 600 ms
carries the 300 ms partial-to-commit span); composition Backspace@4600
dropped; empty commit `""`@4700 ignored; lone `Dead`@4900 inert and NOT
extending the duration (ends 4500). 10 printable, all correct → raw/gross/net
30.0, accuracies 100%, KSPC 1.0, burst 10 → 24.0, IKI 4000/9 = 444.4444444444,
rollover 0/9. Buckets: scoring 10, compositionDrops 5, deadKeys 2, ignored 2.

### E6 (§4.9 E6) — `ENG-FIXTURE-E6-emoji-grapheme-unit`, target `ok 👨‍👩‍👧‍👦!`

5 graphemes in 15 UTF-16 units. `o`@0, `k`@400, ` `@800, piecemeal `👨`@1200
(wrong vs the family unit) + Backspace@1400 (pops the whole grapheme), full
family@1800 (correct), `!`@2200 (Shift+1, code Digit1). Correct-at-press 5/6
→ 83.3333333333%; units correct 5/5. raw = 6/5 ÷ (2200/60000) =
32.7272727273; burst 6 → 14.4; IKI 2200/6 = 366.6666666667; rollover 0/6.
W1-marked figures divide by 15 UTF-16 units: gross 81.8181818182, net
27.2727272727, finalAccuracy 33.3333333333, KSPC 7/15 = 0.4666666667,
finalTextLength 15.

### E-DUALKEY (§4.9 E8 + Group 8 PARITY-03) — `ENG-FIXTURE-E-DUALKEY`, target `sa` (dvorak)

`s` via Semicolon@0, `a` via KeyA@60; keyups at +110 ms, so the one
transition overlaps exactly (the E01 skeleton — every metric number matches
E01 by construction; only the codes, and therefore the fingers, differ).
2 printable presses, duration 60 ms → raw/gross/net 400.0, accuracies 100%,
KSPC 1.0, burst 2 → 4.8, IKI 60/1 = 60 ms, rollover 1/1 = 1.0 (keyup@110
past keydown@60, matched by code Semicolon per the metrics.ts precedent).
Attribution (new code-aware path, hand-checked): Semicolon = column 9 = rp,
KeyA = column 0 = lp → cross-hand, different fingers. The char-based
`fingerTag('s','a')` would read the canonical KeyS (lr) — the E8 error this
fixture exists to prevent.

### E-DUALKEY-ALT (§4.9 E8, AltGr production) — `ENG-FIXTURE-E-DUALKEY-ALT`, target `@a` (azerty)

`@` via AltGr+Digit0@0 (mods alt:true — the Windows AltGr shape; mods never
affect scoring per the E3 precedent), `a` via KeyQ@400 (AZERTY `a` sits
where QWERTY puts `q`); keyups at +100 ms, so nothing overlaps. 2 printable
presses, duration 400 ms → raw/gross/net 60.0, accuracies 100%, KSPC 1.0,
burst 2 → 4.8, IKI 400/1 = 400 ms, rollover 0/1 = 0. Attribution:
Digit0 = column 9 = rp, KeyQ = column 0 = lp → cross-hand; char-based
`fingerTag('@','a','azerty')` stays "unknown" (existing pin, unchanged —
a bare `@` without its code is genuinely ambiguous). The Digit0 code is a
verified production (levels-04 §2.2, pinned in VERIFIED_PRODUCTIONS).

## Wart W1 — final-text denominators count UTF-16 units (flagged, not fixed)

`metrics.ts` (frozen this slice) computes `final.length`, so every
final-text denominator is a UTF-16 count while every comparison in this slice
is grapheme-correct. For ASCII the two coincide and NO existing fixture
moves (whole suite green, A–G recompute byte-identical). For E6 the summary
therefore pins 33.33% final accuracy on a 5/5-unit-correct text, WPMs that
count 15 "chars", and KSPC 0.47. The fix — grapheme denominators in
`metrics.ts` + `live-summary.ts` parity + `ENGINE_MODEL_VERSION` bump +
`/how-we-calculate` update per AGENTS.md rule 3 — belongs to the metrics
slice (Slices 2/3), which must recompute E6's four W1 figures and the
`finalTextLength` detail. No UI/marketing copy may cite the W1 figures (rule 9).

F01 consistency buckets (second: chars → WPM): 2:5→60, 3:5→60, 4:1→12,
5–11:0→0, 12:6→72, 13:5→60, 14:5→60, 15:5→60. Mean 27.43, population sd 30.23,
CV ≈ 1.102 > 1 → 100×(1−CV) < 0 → clamped to 0. "Low/poor", as the chapter
requires.

F01 regression guard: burst 52.8 > 1.5 × net 33.0 = 49.5 ✓ (holds).

## Chapter value vs recompute, example by example

Legend: ✅ chapter agrees (to displayed precision) · ✏️ corrected (chapter
arithmetic wrong; fixture uses the recompute) · 🔧 constructed (chapter
underdetermined; construction documented above) · ➕ chapter silent (our
documented decision).

### A01 (§4.2) — `ENG-FIXTURE-A01-perfect-even-typing`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| gross/net WPM | 24.2 | 24.2024202 | ✅ |
| keystroke/final accuracy | 100% | 100 | ✅ |
| KSPC | 1.00 | 1.0 | ✅ |
| rollover | 0% | 0 | ✅ (keyups constructed) |
| IKI mean | 545.4 ms | 545.4 | ✅ |
| consistency | "≈99–100" | **null** | ✏️ corrected: 5.454 s < 10 s minimum scored duration (chosen per Session 2 plan); the spec excludes the first 2 s and calls for n/a on very short tests |
| burst | — | 24.0 | ➕ |

### B01 (§4.3) — `ENG-FIXTURE-B01-single-corrected-error`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| gross/net WPM | 22.5 | 22.5486847 | ✅ |
| raw WPM | 26.6 | **24.5985651** | ✏️ corrected (known error, verified): raw counts **printable** keystrokes only → 12/5 ÷ minutes; the chapter's 26.6 used 13 (incl. Backspace) |
| keystroke accuracy | 84.6% (11/13) | **91.6666667** (11/12) | ✏️ corrected (known error, verified): Backspace is not printable; denominator is 12 printable keystrokes |
| KSPC | 1.18 (13/11) | 1.1818182 | ✅ (KSPC counts Backspace — stays) |
| final accuracy | 100% | 100 | ✅ |
| IKI mean | — | 487.8333 | ➕ |
| burst | — | 24.0 | ➕ |

### C01 (§4.4) — `ENG-FIXTURE-C01-single-uncorrected-error`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| net WPM | 22.0 | 22.0022002 | ✅ |
| raw WPM | 24.2 | 24.2024202 | ✅ |
| keystroke/final accuracy | 90.9% | 90.9090909 | ✅ |
| keystroke log | "same skeleton as A" | constructed (o @ 2727) | 🔧 |
| IKI mean | — | 545.4 | ➕ |

### D01 (§4.5) — `ENG-FIXTURE-D01-must-correct-rejected-attempts`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| net WPM | 22.2 | 22.1699698 | ✅ |
| KSPC | 1.09 (12/11) | 1.0909091 | ✅ (rejected attempts excluded, Backspace-with-pending-error included) |
| final accuracy | 100% | 100 | ✅ (invariant; also property-tested) |
| rejected-attempt rate | 14.3% (2/14) | 14.2857143 (2/14) | ✅ |
| raw WPM | — | 26.2008734 (13 printable incl. 2 rejected) | ➕ decision |
| keystroke accuracy | — | 84.6153846 (11/13) | ➕ decision |
| IKI mean | — | 458.0 (14 presses) | ➕ |

### E01 (§4.6) — `ENG-FIXTURE-E01-rollover-detection`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| rollover ratio | 100% (1 rollover ÷ 1 transition) | 1.0 | ✅ under the transition-based reading (see Ambiguity A1) |
| IKI | 60 ms | 60 | ✅ |
| other metrics | — | raw/gross/net 400 WPM (2 chars in 60 ms) | ➕ |

### E02 / E03 (§4.13 #11/#12) — rollover companions
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| E02 rollover | exactly 0% | 0 (18 transitions, 0 overlapped) | ✅ |
| E03 rollover | 100% | 1.0 (5 transitions, 5 overlapped) | ✅ |

### F01 (§4.7) — `ENG-FIXTURE-F01-long-pause-burst-divergence`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| net WPM | 33.0 | 33.0 | ✅ — **but only with the 44-char text** (see correction below) |
| burst WPM | 64.8 (~27 chars in 5 s) | **52.8** (22 chars in the best 5 s window) | ✏️ corrected (known error, verified): each fast region holds only 22 chars, so no 5 s window can contain 27; 22/5 ÷ (5/60) = 52.8 |
| target length | "44 characters" but the printed pangram is 43 chars | 44 with the chapter's own 22+22 split → text used: `the quick brown fox jumps over the lazy dog.` **with trailing period** | ✏️ new chapter discrepancy — the stated 44 / "characters 23–44" (22) / net 33.0 / elapsed 16 000 ms are only simultaneously true with 44 chars; the printed pangram (43) contradicts them. Corroboration: the chapter's own naive-IKI figure ("roughly 372 ms") equals (42×190.476+8000)/43 = 372.09 exactly under this construction. **Flagged for the main agent.** |
| per-keystroke pace | "≈182 ms" | 190.476 ms (4000/21) | ✏️ the 182 figure is 4000/22; with 22 chars spanning [0,4000] inclusive the spacing is 4000/21; the chapter's 372 ms naive figure corroborates 190.476 |
| IKI mean (correct) | "true ~182 ms" | 190.4761905 (42 samples, the 8 000 ms gap excluded) | ✏️ corrected per above |
| IKI mean (naive bug) | "roughly 372 ms" | 372.0930 | ✅ (matches — used as a construction cross-check) |
| consistency | "low/poor" (qualitative) | 0 (CV ≈ 1.102 → clamped) | ✅ qualitative claim holds |
| burst > 1.5 × net guard | "reasonable" | 52.8 > 49.5 ✓ | ✅ |

### G01 (§4.8) — `ENG-FIXTURE-G01-key-repeat-filtering`
| Value | Chapter | Recompute | Verdict |
|---|---|---|---|
| final text | `aa` (repeat filtered) | `aa` | ✅ |
| KSPC | 1.00 | 1.0 | ✅ |
| repeat event | dropped | dropped (repeatCount 1, never scored, never buffered) | ✅ |
| raw/gross/net | — | 26.6667 (duration 900 ms) | ➕ |
| IKI mean | — | 900 (single interval between the two real presses) | ➕ |

## Ambiguities flagged (formula-level; not decided unilaterally)

- **A1 — Rollover ratio denominator.** Spec §6.1 / skill say "keystrokes typed
  while the previous key was still down ÷ **total keystrokes**"; chapter §4.6
  computes 1 rollover ÷ 1 **transition** = 100% for a 2-key test (under the
  literal spec reading it would be 1/2 = 50%, and "exact 100%" would be
  structurally impossible). Implemented the transition-based reading
  (overlapped presses ÷ presses with a predecessor), which is the only reading
  consistent with the chapter's worked example AND the required exact-0% /
  exact-100% companion fixtures. Needs a ruling in
  `docs/CHAPTER-ARITHMETIC-CORRECTIONS.md` (and possibly a spec §6.1 wording
  tweak — a modelVersion-relevant change if ever reversed).
- **A2 — F01 target text** (43 vs 44 chars) — see the F01 table above.
- **A3 — Verified-mode exclusion semantics.** Chapter 4 part2 §4.10 makes
  untrusted input and paste/drop invalidating in verified mode but is silent
  on their metric treatment in practice mode; the KeyEvent contract has
  `auto` but no explicit paste flag. Implemented conservatively (untrusted
  never scored in either mode; auto chars stay in the final text but never
  count as user keystrokes) and flagged.

## Zero-keystroke logs (Edge Case E9, partial)

`computeResult` throws `NoScoredKeystrokesError` for logs with no scoring
presses ("not available", never 0 WPM). A nullable-WPM ResultSummary would be
the cleaner contract expression — flagged as an integration need for the
main agent (schema change is outside this package).

## INT plausibility backstop (ENG-07, INT-02)

Fixtures `int-fixture-001.ts`, `int-fixture-002.ts`, `e-paste.ts` pin the
chapter-10 (§10.2–§10.3) and chapter-4 (E7) worked timing shapes as DATA for
the pure helpers in `src/plausibility.ts`. The helpers take every limit as
an injected parameter and store none; the injected `[proposal]` values live
only in `tests/int-plausibility.test.ts`, so the verdict floors never reach
any shipped bundle. What this file records is the hand arithmetic both sides
share (independently recomputed by the extended `recompute.mjs`, which
imports nothing from `packages/engine`):

- **INT-FIXTURE-001** — bot: ten gaps of 20 ms → window mean 20.0. Elite:
  worked gaps sum to 529 ms over ten gaps → window mean 52.9. Eleven presses
  per log hold exactly ten gaps, hence one window each.
- **INT-FIXTURE-002** — 200 presses at a 150 ms base pace with press 101 at
  15004 ms (4 ms after press 100). Gap inventory: 197 × 150 ms, one 4 ms gap
  (pair 101, KeyF → KeyR, both left index = same finger), one 296 ms
  recovery gap; span cross-check 197 × 150 + 4 + 296 = 29850 = t(199) − t(0).
  Worst ten-gap window (at press 91): (9 × 150 + 4)/10 = 135.4 — the
  sustained check passes while the single-pair scan flags pair 101, proving
  the two checks complementary.
- **ENG-FIXTURE-E-PASTE** — presses at t = k/8 ms for k = 0 … 39
  (eighth-steps are bit-exact): span t(39) − t(0) = 39/8 = 4.875 ms, mean gap
  0.125 ms. The press count mirrors the chapter's worked example as event
  data, not policy — the policy numbers are test-injected.

No `modelVersion` bump: these helpers are not metrics (no WPM/accuracy/KSPC
formula changed, `metrics.ts` untouched), so `/how-we-calculate` is
unaffected. Flags are opaque codes (`sustained-floor`, `single-outlier`,
`paste-burst`) carrying counts/durations/finger tags only — never key content
(keystroke-privacy skill).
