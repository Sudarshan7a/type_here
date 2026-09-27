---
name: typing-metrics-spec
description: Exact definitions and test vectors for WPM, net WPM, accuracy, KSPC, rollover, consistency, burst, and difficulty bands, plus rules for versioning metric changes. Use when implementing, changing, or displaying any typing metric.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: section-6
---

## Rules
- All metrics are implemented **once** in `packages/engine/src/metrics` and reused by client and server.
- A formula change requires: bump `modelVersion`, add a changelog entry, update golden vectors, update `/how-we-calculate`. Old results keep their original version stamp.
- Always show classic WPM next to any normalized score. rWPM is beta and gated (spec §6.2); do not ship it before calibration.

## Definitions
- **Word** = 5 characters (spaces and punctuation included).
- **Raw WPM** = (printable keystrokes / 5) / minutes.
- **Net WPM (headline)** = (correct characters in final text / 5) / minutes. Correction time is included because the clock keeps running.
- **Gross WPM** = (characters in final text / 5) / minutes (details view only).
- **Keystroke accuracy** = correct keystrokes / total printable keystrokes (corrected mistakes still count).
- **Final accuracy** = correct chars / total chars at the end.
- **KSPC** = total keystrokes (incl. Backspace) / characters in final text.
- **Rollover ratio** = keystrokes typed while the previous key was still down / total keystrokes.
- **IKI** = time between consecutive keydowns; exclude gaps > 5 s from IKI statistics.
- **Consistency** (proposal) = 100 × (1 − CV) of per-second net speed, CV = stdev / mean, excluding the first 2 s, clamped 0–100.
- **Burst WPM** = best rolling 5-second window.
- **Timing precision:** software ≈ 1 ms, but keyboard/USB/OS noise ≈ 10 ms. Never present differences below ~10 ms as meaningful.

## Difficulty bands (MVP)
Prose only. Compute a transparent typability score from: share of lowercase among non-space characters, share of high-frequency words, mean bigram frequency, share of right-side keys (easier); total keystrokes, syllables per word, symbol share, share of non-dictionary words (harder). Output Easy / Typical / Hard. **Do not multiply WPM by it.** Code/symbol text has no validated model: show token-class stats instead.

## Test vectors (must pass)
1. 300 correct chars in 60 s, no errors → net 60.0 WPM, accuracy 100%.
2. 300 chars typed, 15 wrong in the final text, 60 s → net = (285/5)/1 = 57.0 WPM; final accuracy 95%.
3. 10 s test, 50 correct chars → net 60.0 WPM (short tests scale linearly).
4. A log with a 2 s pause mid-test → net WPM drops; burst WPM does not.
5. The same log processed in browser and Node → identical numbers (to 1e-9).

## Display rules
- Round for display only (1 decimal). Store full precision.
- Label composition and code metrics separately; never mix content types in one average.
- Show per-content-type rolling averages (median of last 5) to avoid over-reading one test.
