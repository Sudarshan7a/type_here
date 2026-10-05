# Typability scoring and difficulty bands (CNT-02)

Implementation guide §6.5, master-spec §6.2 Stage A. A deterministic, pure
function of one text that assigns an **Easy / Typical / Hard** band to prose, and
an explicit *no band, with a reason* to code and symbol-dense text.

**This model is v0.** It is validated offline against this repository's own corpus
(§6.5 step 6). **No band has been reviewed by a person, and none has been checked
against a user's typing speed** (§6.5 step 7, which is beta work). The corpus
artifact says the same thing in its own `typability.review` field, so nobody
downstream has to infer it.

---

## 1. What ships where

```
packages/typability/            the model: features, weights, boundaries, verdict
  src/config.ts                 the VERSIONED MODEL CONFIG - the only place a
                                weight, anchor, boundary or ceiling can live
  src/features.ts               the thirteen features, raw + normalised
  src/scoring.ts                score -> band. NOT re-exported from the barrel
  src/classify.ts               scope: is this text in the model's coverage?
  src/band.ts                   the verdict, and the audit explanation
  src/version-notes.ts          the changelog, with old -> new boundary values
  src/resources/                word-frequency, bigram-frequency, syllables, layout
scripts/typability-gate.mjs     the gate RULES (pure), shared by both gates
scripts/check-typability.mjs    the gate CLI + coverage report + --item / --calibration
scripts/check-typability.test.mjs  37 gate tests, run by `node --test`
scripts/corpus-pipeline.mjs     stage 7: carries the band into content/corpus.json
scripts/check-corpus.mjs        G7: delegates to the typability gate
content/corpus.json             740 items, 704 banded, 36 explicit nulls
```

### The scoring API

```ts
// product-facing: a label, no number
typabilityBand({ text, family?, language?, declaredBand? })
  -> { band: "easy"|"typical"|"hard"|null,
       reason: OutOfScopeReason|null,
       declaredBand, declaredBandAgrees: boolean|null,
       source: "computed"|"unbanded",
       modelVersion: string }

// audit-facing: adds the feature vector and the score, for humans only
explainTypabilityBand(input)
  -> verdict & { features, score, quantisedScore, distanceToBoundary }

// the deterministic feature vector, no score
typabilityFeatures(text) -> { chars, nonSpaceChars, words, letters, features[] }

// scope, without computing anything
classifyScope({ text, family?, language? }) -> { inScope, reason }

// the versioned model, published so /how-we-calculate can read it
TYPABILITY_VERSION, BAND_BOUNDARIES, SCORE_QUANTISATION_STEP, SCOPE_CEILINGS,
TYPABILITY_FEATURE_SPECS, TOTAL_FEATURE_WEIGHT, typabilityConfigDigestInput()
```

Every function is pure: no clock, no randomness, no network, no filesystem, and no
`node:` import (`packages/typability` runs unchanged in a browser, so it never
could). Same text, same model version → same band, byte for byte.

---

## 2. The thirteen features

Each row states numerator, denominator, and the treatment of punctuation, digits
and case, because §6.5 step 3 requires exactly that. `weight` is the model's own
multiplier; `anchors` is `[hardEnd, easyEnd]` in the feature's natural units, so a
reader can recompute any component by hand from the raw value.

| # | Feature | Raw measure | Weight | Anchors | Direction |
| --- | --- | --- | --- | --- | --- |
| 1 | `lowercaseAmongNonSpace` | lower-case letters ÷ non-space characters | 1.0 | 0.85 → 1.0 | ↑ easier |
| 2 | `frequentWordShare` | word tokens in the high-frequency list ÷ word tokens | **1.5** | 0.30 → 0.85 | ↑ easier |
| 3 | `knownWordShare` | word tokens in the common-word list ÷ word tokens | **1.5** | 0.50 → 1.0 | ↑ easier |
| 4 | `meanBigramWeight` | mean rank-decayed weight of within-word letter bigrams | **1.5** | 0.15 → 0.32 | ↑ easier |
| 5 | `rightHandLetterShare` | letters on a right-hand QWERTY-US column ÷ letters | 1.0 | 0.30 → 0.55 | ↑ easier |
| 6 | `meanWordLength` | letters per word token (first moment of the length distribution) | 1.0 | 6.5 → 3.0 | ↓ easier |
| 7 | `longWordShare` | tokens of 7+ letters ÷ tokens (tail of the same distribution) | 1.0 | 0.50 → 0.0 | ↓ easier |
| 8 | `symbolShare` | non-alphanumeric non-space ÷ non-space | 1.0 | 0.10 → 0.0 | ↓ easier |
| 9 | `digitShare` | digits ÷ non-space | 1.0 | 0.08 → 0.0 | ↓ easier |
| 10 | `uppercaseShare` | upper-case letters ÷ non-space | 1.0 | 0.06 → 0.0 | ↓ easier |
| 11 | `classTransitionRate` | adjacent non-space pairs whose class changes ÷ pairs | 1.0 | 0.25 → 0.0 | ↓ easier |
| 12 | `syllablesPerWord` | `countSyllables` summed over tokens ÷ tokens | 1.0 | 2.25 → 0.75 | ↓ easier |
| 13 | `keystrokes` | characters in the text (one printable keystroke each) | **0.5** | 220 → 40 | ↓ easier |

Total weight 14.0. No single feature exceeds 11% of it, which is what §6.5 step 4's
"equal-ish weights" means here.

**Denominators, stated once.** `nonSpaceChars` is every non-whitespace character
(newlines are whitespace). `wordTokens` are maximal runs of letters optionally
joined by an apostrophe, each lower-cased with apostrophes stripped before any
lookup — which is why the word lists hold letters only. `letters` is every
`[A-Za-z]` character. `pairs` are adjacent non-space characters. Bigrams are
counted **within** a word only: a pair spanning a space is an artefact of the
space, not a letter pair.

**Why these weights.** The three at 1.5 are the only ones that measure the *words*
rather than the *surface* of the text, and word choice is what the published model
family identifies as predicting speed. The ten at 1.0 measure character
composition, which is what separates prose from code rather than an easy sentence
from a hard one. `keystrokes` is at 0.5 because total keystrokes is a
session-length property, not a per-character typability property: a long passage is
not harder to type, it is longer to type. §6.2 lists it, so it is kept — at half
weight, so it cannot dominate. It is the main reason short quotes band easier than
long prose, which is a property of the published feature family rather than a
validated effect.

### Resources, and their licences (§6.5 step 2)

Every resource was **written from scratch for this repository**. No word list,
bigram table, n-gram corpus, book dataset or code project was copied, scraped or
derived from, so AGENTS.md rule 6 (no GPL/AGPL content) and the CNT-07 policy hold
by construction. Two-letter character sequences and isolated English words carry no
protected expression.

| Resource | Size | Licence | Honest description |
| --- | --- | --- | --- |
| `HIGH_FREQUENCY_WORDS` | 390 forms | ours, non-MIT half | the ~200 most frequent English word forms |
| `COMMON_WORDS` | 2,584 forms | ours, non-MIT half | ordinary content words and inflections; **not a dictionary** |
| `ENGLISH_BIGRAM_RANKS` | 143 pairs | ours, non-MIT half | **rank order only, not measured frequencies** |
| `countSyllables` | a method | ours | a vowel-group heuristic, not a pronunciation model |
| QWERTY-US right-hand letters | 12 letters | derived | cross-checked against the engine's verified finger map |

**Why the bigram resource is a rank list.** master-spec §6.2 asks for "mean bigram
frequency". A build-time scorer has no frequency table to read, so what it can
honestly compute is a **rank-decayed weight**, and the doc says so rather than
calling it a frequency. The first attempt used a linear rank ramp
(`1 - (rank+1)/(N+1)`), which says the most frequent bigram is a hundred times more
frequent than the 143rd. Real English does not work that way, and the cost was
measurable band churn: one edited letter moved an item's score by a median 1.7
points, because two bigrams out of ~110 jumped the full length of a ramp with no
business being that steep. The shipped curve is `1 / log₂(rank + 2)`, the shape
Zipf's law actually supports: rank 0 → 1.00, rank 2 → 0.50, rank 10 → 0.29, rank
142 → 0.14, unranked → 0.12.

**Why the word list is not a dictionary.** §6.2 asks for "share of non-dictionary
words". A 2,584-form list is a *common*-word list: proper nouns, technical terms
and rare words all count as non-dictionary, which over-counts. §6.5 step 2 says to
prefer computing resources from our own corpus; a corpus-derived dictionary would be
circular here (the corpus is what is being banded), so the list is authored instead
and its coverage is measured and reported rather than assumed.

**Why the right-hand letters are declared locally.** The engine's
`LAYOUT_FINGER_MAPS["qwerty-us"]` is the authority, but the engine's TypeScript
sources use `./layout-fingers.js` internal specifiers, which `node` cannot resolve
when type-stripping a `.ts` file — so the corpus pipeline (plain ESM under `node`)
cannot import them today. Rather than fork the data silently,
`tests/resources.test.ts` asserts the local set against the engine's own map for
every letter. If the engine's map moves, that test fails.

---

## 3. Score, and the boundaries

```
component_i = clamp01((raw_i - hardAnchor) / (easyAnchor - hardAnchor))
score      = 100 × Σ(weight_i × component_i) / Σweight_i        # weighted MEAN
quantised  = round(score / 0.05) × 0.05                         # 0.05 grid
band       = quantised ≥ 65   → easy
             quantised ≥ 57   → typical
             otherwise        → hard
```

A **weighted mean**, not a sum, so the score stays in 0–100 when a feature is added
or removed and the boundaries keep their meaning. Two smaller decisions:

- **`>=` on both boundaries is the tie-break.** A score exactly on a boundary
  belongs to the *easier* band, so the mapping is total and monotone: a higher score
  never produces a harder band (`tests/bands.test.ts` sweeps the whole range).
- **The 0.05 quantisation grid.** The band is read from a snapped score, so two
  builds of the same text that differ only in floating-point noise cannot land in
  different bands. It also makes `distanceToBoundary` a real number rather than
  noise.

### Where 65 and 57 come from

§6.5 step 5 asks for roughly a third of the content in each band. **The boundaries
are absolute, frozen numbers, not recomputed from whatever corpus is loaded.**
Deriving them per-build would mean every added item moved every other item's band,
which is precisely the churn requirement 4 forbids.

The calibration run at `TYPABILITY_VERSION` 0.1.0, over the 704 banded items of this
corpus (`node scripts/check-typability.mjs --calibration`):

| | Value |
| --- | --- |
| measured tertiles of the score distribution | 57.30 and 65.15 |
| boundaries chosen | **57.0 and 65.0** |
| resulting split | hard 228 / typical 237 / easy 239 |
| as a share | 32.4% / 33.7% / 33.9% |

Each boundary is the round value on the side that keeps its own band at or above a
third. Reproduce the run and the drift with `--calibration`, which prints how far
the frozen pair has moved from the measured tertiles.

### §6.5 step 6 — the offline sanity check

| Text | Score | Band |
| --- | --- | --- |
| `the cat sat on the mat and then it went home again to sleep for a while` | 87.55 | easy |
| a real corpus passage (`PROSE-01-001`) | 69.55 | easy |
| `MEETING AGENDA TOMORROW MORNING CONFERENCE ROOM BRING YOUR NOTES` | 45.25 | hard |
| `The pneumonoultramicroscopicsilicovolcanoconiosis diagnosis required …` | 43.30 | hard |
| `Xq7#v$2 (KPJ/LMN): {a[b]}=c*d? 99% @2026-10-06 <<< >>>` | — | **no band**, symbol-dense |

---

## 4. Stage A: a band is a label, and the score is not a multiplier

master-spec §6.2: "Output Easy / Typical / Hard bands. **No score multiplication
yet.**" Three mechanisms make that structural rather than a promise:

1. **The product-facing verdict carries no number.** `TypabilityVerdict` has six
   fields — `band`, `reason`, `declaredBand`, `declaredBandAgrees`, `source`,
   `modelVersion` — and no score field. There is nothing to multiply by.
   Asserted in `tests/stage-a.test.ts`, which also checks the keys and the types.
2. **The numeric score is not exported from the barrel.** It lives in
   `src/scoring.ts`, which `src/index.ts` does not re-export. Reaching it requires a
   deep import of a private module path.
3. **Two repo-wide scans run in the package's own test suite.** No file outside
   `packages/typability` imports the scoring module; and no file anywhere in
   `apps/`, `packages/` or `scripts/` multiplies a WPM-like quantity by a
   typability quantity, or builds the Stage B `exp(β·(T_ref − T_text))` term. A PR
   that reaches for the score to "normalise" a result turns CI red instead of
   quietly shipping Stage B behaviour under a Stage A label. Both scans have
   controls proving they fire on a planted violation.

The score stays reachable through `explainTypabilityBand`, named and shaped for the
audit CLI (`node scripts/check-typability.mjs --item PROSE-01-001` prints the full
feature vector, the score and the distance to the nearest boundary). That is the
honest way to satisfy §6.5's "transparent": available to a reviewer on request,
absent from every product path.

**Stage B is deliberately not half-built.** rWPM needs a fitted β from our own
within-user data plus published fit statistics and minimum sample sizes. There is
no such data, and `packages/typability/src/scoring.ts` does not contain a β.

---

## 5. Known biases and limits

- **English prose only.** The word lists, the bigram ranks and the syllable rules
  are all English. A non-English item is refused, not banded.
- **Not code.** §6.2 Stage C is explicit that the published dataset contains no
  code. See §9.
- **`knownWordShare` over-counts non-dictionary words**, because it is a common-word
  list rather than a dictionary: proper nouns and technical terms read as rare.
- **`syllablesPerWord` is a vowel-group heuristic**, not a pronunciation model. It
  gets "-le" and silent "-ed" right and mishandles "-ia"/"-io" and a few others.
  Measured effect on the total score: under half a point per item.
- **`rightHandLetterShare` is a proxy for one physical keyboard.** It reflects
  QWERTY-US hand geometry, not any individual's hands, and it ignores the fact that
  expert typists touch-type symmetrically.
- **`keystrokes` measures endurance, not typability.** At weight 0.5 it is the
  weakest of the thirteen, and it is the main reason short quotes band easier than
  long prose.
- **A one-character item bands Easy.** "a" scores 80.95: every share is either 0 or
  1 and the model has almost no evidence. A degenerate input, handled without a
  crash and without pretending otherwise.
- **No band is reviewed.** See §7.

---

## 6. Band stability

The property is not "an edit never changes a band" — that would be false, and
pretending otherwise would make the band meaningless. It is: **a band is a pure
function of the quantised score, so a one-character edit can only change a band by
moving the item across a boundary.** Both directions are pinned on real corpus
passages (`tests/stability.test.ts`):

| Fixture | Base score | Distance to nearest boundary | One-character edit | Result |
| --- | --- | --- | --- | --- |
| `PROSE-01-010` | 44.20 (hard) | **12.80** | `Don't` → `Dbn't` (0.55 points) | **band unchanged** |
| `PROSE-01-002` | 65.25 (easy) | **0.25** | `turned` → `ttrned` (0.30 points) | **easy → typical** |

Measured churn across the whole corpus: over all 505,223 single-letter substitutions
inside words, the median absolute score move is 1.35 points and the 99th percentile
is 5.85; 13.3% of substitutions cross a boundary. The pipeline publishes that number
as `coverage.nearBoundaryItems` (items within 1 point of a boundary), so a reviewer
can see where a band's stability is weakest instead of being told it is stable.

---

## 7. Honest coverage

Reproduce with `node scripts/check-typability.mjs`.

| Family | Items | Banded | easy | typical | hard | No band |
| --- | --- | --- | --- | --- | --- | --- |
| PROSE | 300 | 300 | 88 | 95 | 117 | 0 |
| QUOTE | 299 | 299 | 108 | 101 | 90 | 0 |
| COMP | 105 | 105 | 43 | 41 | 21 | 0 |
| CODE | 34 | **0** | 0 | 0 | 0 | **34** |
| WORDLIST | 2 | **0** | 0 | 0 | 0 | **2** |
| **Total** | **740** | **704 (95.1%)** | 239 | 237 | 228 | **36 (4.9%)** |

The 36 nulls, by reason, both declared: `out-of-scope-code` 34,
`out-of-scope-word-pool` 2.

**What "banded" does and does not mean.** 704 items carry a band the model
computed. **Zero** of them carry a band a person reviewed, and zero have been
checked against a user's speed. The artifact records this in
`typability.review: "none"` with a note, and 688 of the 740 items are still
`draft` in the register for the separate second-reviewer audit — the two facts are
independent and neither implies the other.

**The declared bands disagree on 158 of the 333 items that declare one** (47%). That
is a finding about the corpus, not a bug in the model, and the artifact keeps both
values: `difficulty` is the computed band, `declaredDifficulty` is the source
document's claim verbatim, `declaredBandAgrees` records whether they matched. The
computed band is the one shown, because a source header's "Difficulty: Easy" is an
unreviewed authoring label and CNT-02 would otherwise have no effect on the 333
items that already carried one.

---

## 8. The gate, and what fails

`node scripts/check-typability.mjs` (CI), delegating the same rules into
`scripts/check-corpus.mjs` as G7 so the two gates cannot disagree.

| Code | Fails when |
| --- | --- |
| `NO-ARTIFACT` / `EMPTY-CORPUS` | there is nothing to check — the vacuity guard |
| `DRIFT` | a stored band differs from a fresh computation (hand-edit, or text edited under a fixed band) |
| `CODE-BAND` | a CODE item carries any band |
| `BAND-ENUM` | a band is outside `DIFFICULTY_BANDS`, or the artifact's `bandEnum` disagrees with the model |
| `BAND-REASON` | a null band with no reason, an undeclared reason, or a band that also carries a reason |
| `BAND-SOURCE` | a band marked as anything other than `computed`, or an unbanded item marked `computed` |
| `DECLARED-AGREEMENT` | the declared/computed comparison does not match a fresh computation |
| `DECLARED-BAND` | `declaredDifficulty` does not normalise to the value the model reads |
| `MODEL-VERSION` | the artifact was stamped by a different `TYPABILITY_VERSION` |
| `BOUNDARY-TYPICAL-MAX` / `BOUNDARY-HARD-MIN` | a boundary moved without a version bump and a version note |
| `CONFIG-DIGEST` | any feature, weight, anchor, ceiling or quantisation changed |
| `NOTE-ABSENT` / `NOTE-VERSION` / `NOTE-TYPICAL-MAX` / `NOTE-HARD-MIN` / `NOTE-DIGEST` / `NOTE-FEATURES` | the version note does not match the live model |
| `COVERAGE-ITEMS` / `COVERAGE-BANDED` / `COVERAGE-UNBANDED` / `COVERAGE-REASON` | the artifact's own coverage block is not arithmetically true of its items |
| `NO-MODEL-BLOCK` | the artifact has no `typability` block at all |

Every rule is re-derived from the artifact's own text; nothing is trusted from the
build. **One finding code per rule**, which is not a style choice: with a shared
code, disabling any single rule leaves the code in the offender set and the gate's
tests cannot see the difference. Mutation testing found exactly that twice (see
§10).

---

## 9. Why code and word pools get no band

The ledger row says "does not cover code/symbol text" and that parenthetical is
treated as a hard scope constraint, not a hint.

| Situation | Verdict | Reason |
| --- | --- | --- |
| `family: "CODE"` | no band | `out-of-scope-code` — §6.2 Stage C |
| `family: "WORDLIST"` | no band | `out-of-scope-word-pool` — a pool is a bag of words; its length is the pool's, not a passage's |
| symbol share > 0.15 | no band | `out-of-scope-symbol-dense` — the published model's stated coverage is "simple punctuation" |
| digit share > 0.30 | no band | `out-of-scope-symbol-dense` — ditto, "few digits" |
| non-English language | no band | `out-of-scope-non-english` — every authored resource is English |
| no letters at all | no band | `out-of-scope-no-letters` — nothing in the model applies |

A code item is **never scored**, therefore never banded, therefore cannot carry a
prose band a user would read as "this snippet is easy prose". The ceilings are set
above every non-code item in this corpus and below every code item in it, so the
rule separates cleanly rather than clipping the prose distribution: measured max
symbol share 0.115 for prose/quote/composition against 0.181 minimum for code; max
digit share 0.218 for prose against a 0.30 ceiling.

**What code gets instead.** Stage C's answer is token-class stats rather than a
single normalised number. The corpus already carries the source documents' own
`tokenMix` string per snippet, and it is preserved in the artifact; CNT-05's
generated drills carry token classes by construction. A real computed token-class
mix needs PRG-01's `tokenize` / `tokenClassCounts` from `@realtype/engine`, which
hits the same `.js`-specifier problem described in §2 — see §11.

**The 33 code items that declared a band keep it, in `declaredDifficulty`.** Those
are human authoring claims about code, and the model has nothing to say about them.
They are recorded, not shown, and not counted as coverage.

---

## 10. Tests and mutant proof

| Suite | Command | Count |
| --- | --- | --- |
| `packages/typability/tests/` (8 files) | `pnpm --dir packages/typability test` | 73 tests, coverage 100% lines / 96.7% branches, gate 85% |
| `scripts/check-typability.test.mjs` | `node --test` | 37 tests |
| `scripts/corpus-pipeline.test.mjs` + `scripts/check-corpus.test.mjs` | `node --test` | 61 tests |

The package suite covers: deterministic banding of clean prose; byte-identical
output for identical input; source-level absence of clock, randomness, network and
`node:` imports; a 1-char edit that must not flip a band and one that must; code
refusing a prose band; the closed band and reason enums; drift; the version note
matching the code including its digest; the vacuity guard; and pathological input
(1 char, 10,000 chars, all-punctuation, all-digit, empty, control characters,
emoji) producing no NaN, no Infinity and no exception.

**Mutants: 37/37 killed, control green.** Each mutant is a one-line change to the
model or the gate; the runner applies it, runs the whole surface (package tests +
script tests + both gates), and reverts.

| # | Mutation | Killed by |
| --- | --- | --- |
| M1 | swap the two band boundaries | pkg + scripts + both gates |
| M2 | flip the tie-break to the harder side | pkg + scripts + both gates |
| M3 | drop the score quantisation | pkg + scripts + both gates |
| M4 | drop the silent-final-e syllable rule | pkg + scripts + both gates |
| M5 | give every bigram the unranked floor | pkg + scripts + both gates |
| M6 | let CODE items into scope | pkg + scripts + both gates |
| M7 | `rightHandLetterShare` always 1 | pkg + scripts + both gates |
| M8 | remove the component clamp | pkg + scripts + both gates |
| M9 | `knownWordShare` always 1 | pkg + scripts + both gates |
| M10 | `lowercaseAmongNonSpace` denominator includes spaces | pkg + scripts + both gates |
| M11 | `classTransitionRate` denominator off by one | scripts + both gates |
| M12 | add a probe feature at weight 0.25 | pkg + scripts + both gates |
| M13 | version note forgets the boundary values | pkg + scripts + both gates |
| M14 | version note carries a stale digest | pkg + scripts + both gates |
| M15 | gate trusts the artifact's band | scripts |
| M16 | gate stops checking code items | scripts |
| M17 | gate stops checking `typicalMax` | scripts |
| M18 | gate stops checking `hardMin` | scripts |
| M19 | gate stops checking the config digest | scripts |
| M20 | gate stops checking the version note | scripts |
| M21 | gate stops checking the band enum | scripts |
| M22 | gate stops checking the banded coverage count | scripts |
| M23 | band prefers the *declared* band over the computed one | scripts + both gates |
| M24 | symbol ceiling lowered until prose trips it | pkg + scripts + both gates |
| M25 | `digitShare` weight set to 0 | pkg + scripts + both gates |
| M26 | gate stops checking the note's boundaries | scripts |
| M27 | gate stops checking the note's feature list | scripts |
| M28 | gate stops checking the unbanded count | scripts |
| M29 | gate trusts the recorded per-reason counts | scripts |
| M30 | gate stops checking a missing reason key | scripts |
| M31 | gate stops checking the band source | scripts |
| M32 | gate stops checking a band carrying a reason | scripts |
| M33 | gate stops normalising `declaredDifficulty` | scripts |
| M34 | gate stops checking the artifact's `bandEnum` | scripts |
| M35 | classify accepts a missing language (assumes English) | pkg |
| M36 | classify bands a word pool like a passage | pkg + scripts + both gates |
| M37 | `normaliseDeclaredBand` defaults an unknown value to `easy` | scripts + both gates |
| M38 | right-hand letter set loses a letter | pkg + scripts + both gates |

**The no-mutation control** runs the identical command with an empty mutation list
and must be green — otherwise "37/37 killed" would only mean the suite was red for
an unrelated reason. It is green.

Two mutants initially **survived**, and both were real defects in the test suite
rather than in the model:

- Disabling one of four coverage checks still produced a finding, because the four
  shared one `COVERAGE` code. Fixed by giving each rule its own code **and** one
  test per rule that damages exactly one field.
- Disabling the note's boundary check still produced a finding, because the test
  got *both* boundaries wrong at once. Fixed by injecting the note list into the
  gate (so a test can drive it without editing the package) and giving each
  boundary its own code with its own single-field test.

That is the whole reason to run mutants: a gate that cannot be shown to fail is a
gate nobody knows the shape of.

---

## 11. Deferred

| Item | Why |
| --- | --- |
| **§6.5 step 7: validate against users' speeds** | Needs real typing data and a second reviewer. The requirement's own wording — "validated against our own users' speeds" — is **not** met by this change, and nothing here should be read as claiming otherwise. |
| **Computed token-class mix for code (Stage C)** | Needs PRG-01's `tokenize` / `tokenClassCounts` at build time, which needs `packages/engine` to be importable by `node` from source. See §12. |
| **`/how-we-calculate` page for the band model** | M7-09. The artifact already carries the feature names, weights, anchors, boundaries and digest, so the page has its content. |
| **Schemas for the corpus band in `packages/schemas`** | Same deferral CNT-01 recorded: move the contract when a runtime package first imports the artifact. |
| **Non-English content** | The resources are English-only by construction. Adding a language means adding its word list, bigram ranks and syllable rules, or refusing the language as the model does now. |
| **Per-item feature vectors in the artifact** | 704 × 13 numbers would swamp the diff. Available on demand via `--item <id>`. |
| **A real dictionary** | Would fix the `knownWordShare` over-count. Needs a licence check first (§6.5 step 2), and a corpus-derived dictionary would be circular. |

---

## 12. Changes needed in files this task does not own

1. **`packages/engine/package.json`** — the blocker for Stage C token-class stats
   and for importing the engine from a `node`-run script. Today the engine's
   `main` is `src/index.ts` while its internal specifiers end in `.js`, so `node`
   cannot resolve the graph. Either
   (a) rename the internal specifiers to `.ts` and add
   `"rewriteRelativeImportExtensions": true` to `packages/engine/tsconfig.json`
   (mirroring `packages/typability/tsconfig.json`), or
   (b) add an `exports` map with a `node` condition pointing at `dist`.
   Until then `packages/typability/src/resources/layout.ts` carries a locally derived
   right-hand letter set, cross-checked by test.
2. **`package.json`** — a `"check:typability": "node scripts/check-typability.mjs"`
   script, so the gate is runnable by name alongside `check:corpus`. It is not
   added here because that file is shared with the parallel agents.
3. **`.github/workflows/ci.yml`** — a step after the corpus gate:
   ```yaml
   - name: "Typability gate (CNT-02: bands, drift, model version)"
     run: |
       pnpm check:typability
       node --test scripts/check-typability.test.mjs
   ```
4. **`eslint.config.mjs`** — optionally, the `packages/engine/**` `Date.now` ban
   could be extended to `packages/typability/**` as a belt to the source-level scan
   in `tests/determinism.test.ts`. The scan already covers it; the lint rule would
   make the failure louder.
5. **`docs/corpus-pipeline.md`** — §2's item-shape table needs the four new fields
   (`difficultySource`, `declaredDifficulty`, `declaredBandAgrees`, `bandReason`),
   a stage-7 entry in §3, and §5.4's "407 items have no difficulty band" finding is
   now stale. Left untouched here because that document is shared.
6. **`docs/FEATURE-LEDGER.md`** — the CNT-02 row. Not edited here by instruction.
