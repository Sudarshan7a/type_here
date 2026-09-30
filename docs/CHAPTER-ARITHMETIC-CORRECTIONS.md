# Chapter arithmetic corrections

**Purpose:** worked numbers in the deep-dive chapters that disagree with the
chapters' own formulas (or with the authoritative formulas in
`docs/spec/master-spec-v1.md` §6 and the `typing-metrics-spec` skill).

**Rule (MASTER-BUILD-CONTRACT Part 1 + Session 2 prompt Section 4):** chapter
worked numbers are illustrations; the formulas are authoritative. Every expected
value used by the engine fixtures was recomputed independently by
`packages/engine/fixtures/recompute.mjs` (which imports nothing from the
engine). The recomputed values win. **The chapter files are not edited** — this
file is the record, and the engine's `fixtures/PROVENANCE.md` carries the full
per-example table.

Status of each entry: **APPLIED** (fixtures use the corrected value),
**PENDING** (needs a human decision), or **CARRIED** (noted for a later phase).

---

## 1. Example B (§4.3) — raw WPM and keystroke accuracy count Backspace · APPLIED

| Value | Chapter | Corrected | Why |
|---|---|---|---|
| Raw WPM | 26.6 | **24.6** | Raw WPM counts *printable* keystrokes. B01 has 12 printable presses (Backspace is not printable): 12/5 ÷ (5.854/60) = 24.5986. The chapter's 26.6 uses 13/5 ÷ minutes, i.e. it counted the Backspace. |
| Keystroke accuracy | 84.6% (11/13) | **91.7%** (11/12) | Same cause: the denominator is printable presses only. |
| KSPC | 1.18 | 1.18 (unchanged) | KSPC explicitly counts Backspace: 13/11. |
| Gross / net WPM | 22.5 | 22.5 (unchanged) | Final text is fully correct, so gross = net; the correction cost time, which is the only penalty. |

## 2. Example F (§4.7) — burst WPM assumes 27 characters in a 5 s window · APPLIED

| Value | Chapter | Corrected | Why |
|---|---|---|---|
| Burst WPM | 64.8 | **52.8** | The chapter's own timeline puts at most 22 characters inside any 5 s window (the fast regions are only 4 s long), so 27/5 per window is unreachable. Best rolling 5 s window (definition: characters with `start <= t < start + 5000 ms`) = 22 chars → 22/5 ÷ (5/60) = 52.8. |
| Guard "burst > 1.5 × net" | 64.8 > 49.5 | 52.8 > 49.5 ✓ (holds) | The regression guard still holds after correction. |

## 3. Example A (§4.2) — consistency on a 5.4 s test · APPLIED

| Value | Chapter | Corrected | Why |
|---|---|---|---|
| Consistency | "≈99–100" | **null** | The spec excludes the first 2 s and calls for n/a on very short tests. Documented minimum scored duration: **10 000 ms** (chosen, logged). A01 is 5.454 s → consistency is null. A01–E01 expected consistency is null for the same reason. |

## 4. Example A — the "22.5 WPM" figure attached to A in Session 2 materials · APPLIED

A transcription slip in the build plan's sanity check (not in the chapter):
A's net WPM is **24.2024**, matching the chapter's 24.2. The value 22.5 belongs
to Example B. Independently confirmed by the S3-lite parity spike. Fixtures use
24.2024202 for A01.

---

## Carried forward (not engine scope — do not act on until the phase below)

### 5. Chapter 8 §8.7.1 — plateau example sits on its own threshold · PENDING (Phase 5)

The example states SD = 0.85, but the eight listed values have sample SD
0.825 (population 0.771; residual SD about the fitted line ≈ 0.833) while the
fitted 14-day change is 0.833. Under sample SD the example would **not** be
flagged, so `WM-FIXTURE-009` would fail a correct implementation. Needs a human
decision on the SD definition (and probably new example data) before Phase 5.

### 6. Chapter 8 §8.2.4 — "qu" at 0.8% of English bigrams · CARRIED (Phase 5)

Standard English bigram tables put "qu" near 0.1%. The ranking conclusion still
holds, but **all frequency weights must be computed from our own corpus**,
never taken from the chapter.

### 7. Chapter 8 §8.4.1 — 0.5^(3/18) = 0.892 · CARRIED (Phase 5)

The value is 0.891. Use a tolerance in the shrinkage implementation.

### 8. levels-05 §2.3 — the literal `;` drill shows 8 semicolons · PENDING (Phase 6)

The text specifies 15 target keystrokes plus 14 anchors. Resolve before writing
`T0-GEN-001`.

---

## How to re-verify

```bash
cd packages/engine && node fixtures/recompute.mjs   # independent recompute
pnpm --dir packages/engine test                     # fixtures vs implementation
```

Neither path imports the other: the recompute script is standalone, and the
fixtures' expected values are committed data. If the engine ever changes a
result, one of those two has drifted.
