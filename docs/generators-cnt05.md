# CNT-05 — seeded generators (numbers, IDs, naming, brackets, strings)

- **Task:** CNT-05, master-spec 5.6 CNT-05, implementation guide 6.3 "Synthetic generators",
  M6-01 / M6-02 / M6-03 content rules, skill `token-drill-generators`
- **Package:** `packages/generators` (`@realtype/generators`, MIT, open-core like `packages/engine`)
- **Files:** 14 sources, 11 test files, 101 tests. No new runtime dependency.

## 1. Layout and public API

```
packages/generators/
  package.json  tsconfig.json  vitest.config.ts
  src/
    prng.ts      sfc32 + SplitMix32 + FNV-1a32, SeededRng, deriveSeed
    types.ts     GeneratedItem/GeneratedSet, the five families' form unions, option types
    shared.ts    GENERATORS_VERSION, clamping, skin resolution, UnsupportedFormError
    generate.ts  generate(options) -> GeneratedSet, the single dispatch entry point
    numbers.ts   generateNumbers      ids.ts     generateIds
    naming.ts    generateIdentifiers  brackets.ts generateBrackets
    strings.ts   generateStrings      words.ts   TECH_WORDS, STRING_WORDS
    safety.ts    every synthetic-data predicate, exported for CNT-01's publish gate
    classify.ts  tokenize/tokenClassCounts self-verification through the engine
  tests/  11 files (see 7)
```

Public API (`src/index.ts`):

| Export | What it is |
|---|---|
| `generate(options)` | the dispatcher: `(seed, family, count?, language?, level?, family knobs)` -> `GeneratedSet` |
| `generateNumbers` / `generateIds` / `generateIdentifiers` / `generateBrackets` / `generateStrings` | per-family generators returning `readonly GeneratedItem[]` |
| `NUMBER_FORMS`, `ID_FORMS`, `IDENTIFIER_STYLES`, `BRACKET_SHAPES`, `STRING_FORMS` | the form vocabularies (also the level-5 pools) |
| `renderIdentifier(words, style)` | words -> one of the seven conventions |
| `classifyItem` / `classifySet` / `uncleanItems` | token-map self-verification |
| `findSafetyViolations`, `isDocumentationIPv4/6`, `isSyntheticUuid`-family predicates, `bracketBalance`, `expandIpv6`, `base64urlEncode/Decode`, `isIdentifierInStyle`, plus every format regex and range constant | the synthetic-data gate, so CNT-01 validates items with the same rules the tests use |
| `SeededRng`, `deriveSeed`, `fnv1a32` | the PRNG, for callers that need a stream (content pipeline, difficulty estimator) |
| `GENERATORS_VERSION`, `DEFAULT_LANGUAGE`, `TIER_BY_FAMILY`, `UnsupportedFormError` | version pin, default skin, tier mapping, the one typed failure |

Defaults: `count` 10, `language` `javascript`, `level` 1 (easiest). Hostile values are
clamped, not rejected: `count` into 1..500, `level` into 1..5, `magnitude` 1..9,
`precision` 1..6, `depth` 1..4, `wordCount` 1..4, `escapeCount` 1..4.

## 2. The PRNG, and why it is stable forever

**sfc32** (Small Fast Counter, 32-bit), a published counter-based generator with a
128-bit state, seeded by **SplitMix32** from a uint32, with **FNV-1a 32-bit** for
string seeds.

Why not a dependency: content determinism is a product contract here, not a convenience.
INT-03 signs a seed/nonce at session start, PRG-17 re-tests against "the same difficulty",
and a stored drill has to be reproducible from its seed years later. That rules out any
library that might change its default, its seeding scheme or its bit-mixing between patch
versions, and it rules out crypto RNGs whose purpose is unpredictability. A copyleft
dependency would also have to clear `pnpm check:licenses`; zero dependencies is cleaner.

Why it is byte-identical on every Node version and every JS engine: the entire state
update is int32 integer arithmetic (`|0`, `>>>`, `^`, `Math.imul`), which ECMA-262
specifies on integer operands rather than on the engine's floating-point implementation.
No step depends on V8's float fast paths, on JIT int-vs-double promotion, or on 32-bit
truncation behaviour. `Math.imul` is used rather than `a * b | 0` because the product of
two int32 values exceeds 2^53 and the low 32 bits must be defined without relying on
double precision. The only float in the path is one division by 2^32, applied to a value
below 2^53. `tests/prng.test.ts` pins the FNV-1a published vectors (`""`, `"a"`,
`"foobar"`) and the first three draws for seed 1, so a change to either is a deliberate
act (bump `GENERATORS_VERSION`), not an accident.

Per-item streams: item *i* draws from `deriveSeed(seed, family, i)`, not from one long
stream. A drill can therefore ask for "the seventh item of seed 42" without generating
items 0-6, asking for 100 items returns the same first 10 as asking for 10, and adding a
sixth family cannot shift what the other five produce.

## 3. The five families: output shape and the invariant that proves it is synthetic

Every invariant below is code in `src/safety.ts` and is asserted by a test that also
asserts a *real-world value must be rejected*, so the rule cannot pass by accident.

### numbers (tier 4 / tier 6 literals)

| form | shape | notes |
|---|---|---|
| `integer` | `265482` | no leading zero |
| `negative` | `-398057` | |
| `decimal` | `179065.87` | 1-6 places, never a trailing dot |
| `grouped` | `238_553` (skin) or `238,553` | separator comes from `profile.digitSeparator`; `,` when the skin declares none, because `1_048_576` under the generic profile is a number followed by an identifier |
| `scientific` | `923.16e-2` | mantissa clamped to 3 digits, exponent never 0 |
| `hex` | `0xe2dc_75` | lower-case, grouped in fours |
| `binary` | `0b1111_1010_0110_1001` | whole nibbles, top bit set |
| `octal` | `0o1103` | |

**Synthetic invariant:** no real data is even expressible here - the alphabet is
restricted per form, and every literal round-trips through its own base
(`Number.parseInt(digits, base).toString(base)`), so a malformed literal fails before it
is ever shown.

**Colour literals (`#FF00AA`) are NOT generated.** Master spec 7 tier 6 and M6-02 list
them, and the engine has `hashMeaning: "colour"` ready, but no shipped profile declares
that mode: JavaScript reads `#` as a private-field prefix (so `#0f4071` is an
`unrecognized-character` diagnostic) and Python/generic as a comment. Emitting one would
put content into the drill that the authoritative token map cannot classify. The form
returns when PRG-02 lands the CSS profile; nothing else needs to change.

### ids (tier 5)

| form | shape | synthetic invariant |
|---|---|---|
| `uuid` | `027caf34-b4cb-8229-8807-6f364eebddaf` | version nibble **8** (RFC 9562 "custom"), variant nibble in `8 9 a b`. A v4 UUID is 122 random bits and indistinguishable from a real one; version 8 keeps the syntax and makes the identity impossible. The canonical RFC 4122 v4 example is asserted to FAIL `UUID_RE` |
| `ulid` | `01SYNTHET1C23Q8V73F9JS0WNR1` | first 10 chars (`01SYNTHET1`) are the fixed marker: a real ULID encodes a millisecond timestamp there, so no generated ULID encodes a plausible issuance time, and `SYNTHETIC` is readable mid-string |
| `hash-sha1` / `hash-sha256` | `deadbeefcafebabe6ca6242...` (40 / 64 chars) | fixed 16-hex marker `deadbeefcafebabe` on every value, so a reviewer recognises it instantly and it cannot be a digest of anything real |
| `base64ish` | base64url of `sample-buffer-7f3d9a2b` | it *decodes to English*; a secret does not usefully. The test decodes with Node's own `Buffer.from(v, "base64url")`, so the two implementations check each other |
| `ipv4` | `192.0.2.10` | RFC 5737 TEST-NET-1/2/3 only; `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `8.8.8.8` and `192.0.2.256` are all asserted to be rejected |
| `ipv6` | `2001:db8:5b01:b5d2::aaea` | RFC 3849 `2001:db8::/32` only, checked against the **expanded** form; the zero run is planted (random 4-hex groups are `0000` once in 65,536) and the other groups cannot be zero, so the compressed run is provably the longest |
| `cidr` | `192.0.2.0/24`, `2001:db8::/32` | documentation networks only, fixed prefix lengths |
| `mac` | `02:1a:2b:3c:4d:5e` | locally administered (0x02) + unicast: the first octet can only be one of eight values, none a vendor OUI. `00:1b:44:11:3a:b7` and `03:...` (multicast) are asserted to be rejected |
| `port` | `54530` | 1024-65535, so no privileged service |
| `iso-date` / `iso-timestamp` | `2009-01-06`, `2020-09-10T20:45:06.704Z` | fixed window 2001-01-01..2035-12-31, never the clock; dates round-trip through `Date.UTC`, so 29 February only appears in a leap year |
| `semver` | `21.15.20-beta.1` | synthetic version numbers; prerelease only when asked |

**Not generated, on purpose:** ISBN/EAN/credit-card numbers (not in any spec tier, and a
valid check digit on an invented number validates against a real registry's algorithm),
phone numbers, national IDs, IBANs, and host names.

### naming (tier 6)

Seven conventions, matching PRG-14's "120 phrases x 7 styles": `snake`, `screaming_snake`,
`camel`, `pascal`, `kebab`, `dot`, `namespace`. One original 169-word vocabulary
(`TECH_WORDS`), single common words, no repeats inside an identifier.

**Synthetic invariant:** the vocabulary deliberately excludes `user`, `name`, `email`,
`password`, `secret`, `token`, `key` (asserted in the test), so a generated identifier
cannot look like a directory of real accounts; every word is asserted to match
`^[a-z]{4,14}$` and to be unique.

Two rules the token map forced:

- `namespace` (`a::b`) is offered only to a skin whose profile has `::` as a token. The
  generic profile does; JavaScript does not, because `::` is not JavaScript, and a drill
  that shows `db::migrations` under a JavaScript skin would teach punctuation the learner
  will never type. An explicit request on such a skin throws `UnsupportedFormError`.
- `dot` always gets at least two segments, because a one-segment "qualified name" is
  indistinguishable from a plain identifier - and that ambiguity would break a
  switch-cost measurement.

### brackets (tier 1)

`pairs` (`[]<>()`), `content` (`(1baa){10cw}`), `nesting` (`[[[]]]`), `mixed`
(`([{}])`, type chosen per level), `ladder` (`() <<>> {{{}}}`), `overtype`, `unbalanced`.

**Balance invariant:** for every shape except `unbalanced` and `overtype`,
`bracketBalance(text).imbalance === 0` and `minDepth === 0`, and `params.balanced === true`.

- `unbalanced` removes or adds exactly **one** bracket *by index* (filtering by character
  value would remove one per nesting level), and records which of the three intents it is:
  `missing-closer` (+1), `extra-opener` (+1), `extra-closer` (-1, trace dips below zero).
- `overtype` emits the openers only, with the balanced expression in `fullText`; PRG-11
  owns the auto-pair drill, this only supplies both projections.

Two skin-driven rules: only brackets the profile declares are used (so a Python drill
never gets `<>`, where they are comparison operators), and angle brackets may not be
*nested* - `<<<<` is a shift operator in every shipped profile and the lexer matches
multi-character operators before brackets, so it would be typed as brackets and scored as
an operator. Angle brackets appear as single pairs only.

### strings (tier 4)

`quoted`, `escapes` (a closed set: `\n \t \r \\ \" \'` plus `\uXXXX` from eight BMP code
points, never the surrogate block), `template` (`` `digest ${retry}` ``, one interpolation),
`credential` (`EXAMPLE-KEY-4F2A-9C11-0B7D-3E58`).

**Synthetic invariants:**

- the escape table is closed and every emitted `\u` code point is in 0x20-0xFFFF excluding
  D800-DFFF, because an unpaired surrogate would produce a literal the engine's grapheme
  model cannot count;
- a literal only escapes the delimiter's own quote character (`\"` inside `'...'` is a
  no-op and would teach an escape with no meaning);
- `template` throws `UnsupportedFormError` on a skin with no interpolation (Python), rather
  than quietly emitting a template that has no `${}`;
- `credential` is **marked, not disguised**: `EXAMPLE-KEY` prefix (no provider issues it),
  `params.synthetic === true`, and `sk-`, `AKIA`, `ghp_`, `xox?-`, `AIza`, `ya29.`, `eyJ`
  prefixes are asserted to be rejected. It exists so the secret-scan path has shaped input
  to be tested against.

Regex literals are deliberately absent: master spec 7.1 classes them as `data` (class 12),
not `string`, and levels 14-15 belong to PRG-12.

## 4. T0-GEN-001..010: covered none of them, and why

**The ledger's `T0-GEN-001..010` citation on the CNT-05 row is a mis-citation.** Those ten
IDs are the **Tier 0 per-key finger-placement** generator tests defined in
`docs/levels-05-tier-0-generator-parameters.md`: `generateTier0(level, seed, layout)` with a
required `layout` parameter, Shift-hand assignment per physical key, an AZERTY
Shift-digit sub-drill (008), a QWERTZ Y/Z pre-drill (009), and a cross-layout key-lookup
isolation check (010). They are not family generators, and the ledger already gives
`T0-GEN-008/009/010` to PRG-03 and to LOC-01, both of which own the layout symbol maps.

CNT-05 is five families: numbers, IDs, naming, brackets, strings. Tier 0 is per-key finger
placement. Nothing in this package takes a `layout`, assigns fingers, or emits a
single-key repetition sequence, so claiming those IDs would be a false claim.

What CNT-05 does cover is the *determinism contract* those IDs are the first expression of:

| What | Where |
|---|---|
| same seed -> identical sequence, forever | `tests/prng.test.ts` (pinned vectors), `tests/determinism.test.ts` |
| different seeds -> different output | `tests/determinism.test.ts` |
| per-item streams so item *i* is stable | `tests/determinism.test.ts` |
| the forbidden non-determinism sources are absent from `src/` | `tests/no-nondeterminism.test.ts` |

**Recommendation for the integrator (no ledger edit from me):** re-point the CNT-05 row's
test-ID cell at a new `CNT05-*` family or drop it, and let `T0-GEN-001..010` stand with
PRG-03/LOC-01 where the definitions actually live. If Tier 0 generator work is wanted, it
is a separate package that consumes the finger maps in `packages/engine/src/layout-fingers.ts`.

## 5. Boundaries with the drills that consume this material

- **PRG-11 (Bracket Balance)** owns the nesting-ladder UI, open-to-close latency, and the
  auto-pair/`partial` behaviour from ENG-09. CNT-05 emits balanced ladders and both
  projections of an overtype item (`text` and `fullText`); it does not decide which one is
  shown, nor score latency.
- **PRG-12 (Strings & Escapes)** owns which escape the learner is asked for, backslash
  accuracy scoring, and levels 14-15 regex basics. CNT-05 emits literals and escapes; it
  emits no regex literals at all.
- **PRG-13 (Numbers + Number Systems & IDs)** owns the drill, the per-base accuracy and
  look-alike-digit metrics, and the boss. CNT-05 owns the material: the generator knows
  which forms exist and how hard they are, not what a level shows or how it scores.
- **PRG-14 (Naming Switcher)** owns the conversion drill and the switch-cost metric, and
  the **inverse** parse (identifier -> words) that metric needs. CNT-05 ships only the
  forward direction, `renderIdentifier(words, style)`, plus the original vocabulary; a
  second definition of the inverse transformation is exactly how a switch-cost metric ends
  up measuring the wrong thing.

Also deliberately not built: weakness weighting (the skill asks generators to accept a
weakness profile; the weakness model in chapter 8 has not landed, and CNT-03 owns
weakness-targeted selection - a guess here would create a second definition), and
layout-aware symbol sets (PRG-03's Shift/AltGr maps).

## 6. Gates

`pnpm -r test` (engine 344, generators 101, web 139, telemetry 103, schemas 75, api 4,
fixture-recorder 11), `pnpm -r typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`,
`pnpm check:licenses`, `pnpm check:bundle` (190.7 KB gzip of 200 KB), `pnpm check:coordination`,
`pnpm check:ledger`, `pnpm check:policies`, `pnpm check:devstack`: all green. Generator coverage
99.5% statements / 98.1% branches / 100% functions / 100% lines (gate 85%; `index.ts`
is pure re-exports, so v8 reports it as 0/0/0/0).

## 6a. Mutants (each applied, each turned the suite red, each reverted)

| # | Break | Caught by |
|---|---|---|
| 1 | `float()` returns `Math.random()` | 7 tests: pinned draw sequence, same-seed equality, per-item streams, the source scan for forbidden sources, shuffle stability, shared-reference purity |
| 2 | `buildMixed` drops one closer | 3 tests: balanced shapes, the three imbalance intents, overtype `fullText` |
| 3 | `deriveSeed` ignores the label and index | 9 tests across brackets/determinism/naming/numbers/strings/prng - every level-ramp and per-item-stream assertion |
| 4 | `buildIpv4` emits random routable octets | 3 tests: the 10k format/safety batch, the RFC 5737 address test, the global safety gate |
| 5 | `escapes` writes a raw newline instead of `\n` | 3 tests: valid-escapes-only, escape count, and the token-map cleanliness sweep |
| 6 | `wordSequence` sorts the shared vocabulary in place | 15 tests, including both purity tests |
| 7 | UUID version nibble set to 4 | 1 test: the version-8/never-v4 UUID test |
| 8 | credential marker replaced by `sk-live` | 2 tests: credential marking, the global safety gate |

8/8. The no-mutation control is mutant 6 plus an in-suite control in `purity.test.ts`
(a deliberately mutating local function must throw under the same deep-freeze assertion),
so the purity assertions are provably not vacuous.

## 7. Test files

| File | Covers |
|---|---|
| `prng.test.ts` | published FNV vectors, pinned draw sequence, ranges, throws, uint32 normalisation, per-label streams |
| `determinism.test.ts` | same seed twice, seed sensitivity, per-item streams, level independence, clamping, unknown skin, form lists |
| `numbers.test.ts` | per-form shapes, base round-trips, no leading zeros, nibble grouping, skin separator, magnitude/precision, class expectations, no colour form |
| `ids.test.ts` | 10,000 items per form (M6-02 step 4), UUID version/variant, hash marker, ULID prefix, base64 decode, IPv4/IPv6/CIDR/MAC/port/date/semver, plus the rejected real values |
| `naming.test.ts` | all seven renderings, style regexes and cross-style rejection, word shape, class 7 + one chord, `::` refusal, vocabulary hygiene |
| `brackets.test.ts` | balance invariants, the rejection control, three intents, overtype projections, depth clamps, Python brackets, doubled-angle rule, class coverage |
| `strings.test.ts` | closed literals, valid escapes only, surrogate range, escape count, interpolation markers, `template` refusal on Python, credential marking and rejection, level ramp |
| `safety.test.ts` | the gate over 4,500 items per family, the flagged-value control, documentation/example acceptance, IPv6 expansion, base64 round-trip vs Node, bracket trace |
| `purity.test.ts` | options and vocabulary not mutated, no shared item references, and a control that proves the mutation assertion can fail |
| `no-nondeterminism.test.ts` | source scan for `Math.random` / `Date.now` / `new Date` / crypto / `node:` imports / `process` / `Buffer` / `Intl`, version pin, no mojibake |
| `classify.test.ts` | every item of every family, level and skin classifies with zero diagnostics; the diagnostics it should catch are proven to be caught |

## 8. Deferred

1. Colour literals (`#RRGGBB`) - blocked on PRG-02's CSS profile declaring
   `hashMeaning: "colour"`.
2. ID token classes. The engine's class 6 note says UUID/SHA/IP/ISO/semver detection is
   multi-token pattern work belonging to PRG-13 / CNT-05 and is deliberately absent from
   the lexer. Closing it is a change to `packages/engine/src` (PRG-01's file), so CNT-05
   reports the class mix (`classifyItem`) instead of adding classes.
3. Weakness-weighted sampling (skill rule; CNT-03 / chapter 8).
4. Layout-aware symbol sets (PRG-03).
5. Tier 0 per-key generators (the real `T0-GEN-001..010`; see 4).
6. Tier 7 whitespace/structure, which master spec 5.6 attaches to CNT-05 but marks [V1]
   and PRG-15 owns.