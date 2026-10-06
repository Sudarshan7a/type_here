# PRG-02 — language packs (the six ADR-007 settled on)

- **Requirement:** PRG-02 (master spec §5.4), designed in §7.2, built by implementation
  guide M5-02 step 1 ("for each initial language decide the grammar source and license").
- **Scope of this change:** `packages/engine/src/profiles/**`,
  `packages/engine/fixtures/tok02.ts`, `packages/engine/tests/profiles/**`, and one
  append-only export block in `packages/engine/src/index.ts`.
- **What it does NOT change:** `tokenize()`'s behaviour for any existing content,
  `TOKENIZER_VERSION`, and `ENGINE_MODEL_VERSION`. See §10.

---

## 1. The set, and why six

ADR-007 (`docs/decisions/decision-log.md`) resolved the "3–5 languages" phrasing against
the six-item list in the same sentence: **JavaScript/TypeScript/JSX, Python, Java, SQL,
HTML, CSS**. Order is decision D6's.

| pack id | label | shape |
|---|---|---|
| `javascript` | JavaScript / TypeScript / JSX | one lexical grammar for three spellings |
| `python` | Python | `#` comment, `//` floor division, angle-bracket comparison, prefixed literals |
| `java` | Java | `--` decrement (not a comment), `"""` text blocks, no `0o` prefix |
| `sql` | SQL | `--` **and** block comments, `''`-doubled quotes, `::` casts, no `#` construct |
| `html` | HTML | `<!-- -->` block comment, tag pairs, an embedded language per element |
| `css` | CSS | no keywords at all, `#` colour literals, hyphenated names |

`generic` is **not** in the catalogue. It is what an unknown id resolves *to*, and keeping
it out of `LANGUAGE_PACKS` is what stops a later contributor adding it as a seventh
language.

## 2. What a pack is, and where it lives

PRG-01 made language support data (`packages/engine/src/language-profiles.ts`) and the
lexer consumes a profile. This change adds a *pack layer* on top of it:

```
src/profiles/model.ts     the extended profile type, the three extension fields, the
                          validator, the fingerprint, the unconsumed-extension report
src/profiles/catalog.ts   the six packs, as data
src/profiles/resolve.ts   the resolution rule + `tokenizePacked` (the PRG-02 entry point)
```

A pack is a `LanguageProfile` plus three optional fields (§5). Nothing in the pack names a
language, and the lexer never learns a name: `token-map.ts` contains no `if (language === …)`
and gained no branch. That is the property the whole design rests on — "adding a language
pack is a new entry in a data file, never a new branch in the lexer".

## 3. The resolution rule

A content record declares `language`. The rule, in order:

1. **Trim and lower-case** the id. Content JSON is hand-edited; `"JavaScript"` and
   `"  sql "` are authoring slips, not different languages.
2. **Canonical id** → `reason: "exact"`, `canonicalId` = that id.
3. **Declared alias** → `reason: "alias"`, `canonicalId` = the pack it lands on.
4. **Otherwise** → the **generic** pack, `reason: "unknown"`, `canonicalId: null`.

Aliases (the complete list, and the reason each exists):

| alias | → | why |
|---|---|---|
| `js`, `node` | `javascript` | the two spellings people actually write |
| `typescript`, `ts`, `jsx`, `tsx` | `javascript` | PRG-01's table already resolved `typescript` and `jsx`; carrying them keeps `languageProfile()` and `resolvePack()` telling one story instead of two |
| `py`, `python3` | `python` | |
| `jvm` | `java` | |
| `postgres`, `postgresql`, `psql` | `sql` | PRG-02 ships one SQL pack; a Postgres identifier must not read as unknown |
| `htm`, `xhtml` | `html` | |

Deliberately **absent**: `c`, `c++`, `rust`, `go`, `sql92`, `css3`. A request for a language
with no pack must read as `unknown` so the pipeline can report it, not as a near-miss that
quietly trains the wrong syntax. Adding one is a one-line, tested change.

### 3.1 What happens for an unknown id — and why it degrades instead of throwing

A mistyped or unsupported id must not take down a live typing session, so the engine
degrades to `generic` and never throws. Two details matter:

- **It never falls back to `javascript`.** That is the failure that counts: JavaScript is
  the most popular pack, so a fallback to it would silently mis-classify a Go snippet as
  JavaScript — `#fff` becomes a private name, `//` becomes a comment, `'''` becomes `''` +
  `'`. Pinned by `TOK-PACK-unknown-language-uses-generic-not-javascript` and by the
  "does NOT silently use the javascript pack" test.
- **The reason is returned, not swallowed.** `resolvePack` gives
  `reason: "unknown"` and `canonicalId: null`, and `describeResolution` renders a
  log-safe one-liner (`no language pack for "klingon"; using generic`) that never quotes
  the snippet's text, so a publish log can carry it verbatim under the privacy rules
  (AGENTS.md rule 4). That is the *other* half of the contract: the engine keeps typing,
  and M5-02's publish-time gate **fails the item**.

So the answer to "what happens for a declared id that does not exist" is: `generic` at
runtime, and a refusal at publish time. Both are tested.

## 4. Each pack, and the structural decision that made it more than a keyword list

### 4.1 `javascript` — TypeScript and JSX are the same pack

TypeScript adds no delimiter, no comment form, no number syntax. Its differences are
type-level (`type`, `interface`, `as`, `implements`, `private`), and those are already in
PRG-01's keyword set. JSX adds `<` and `>`, which this pack already declares as Class 1
brackets — and §7.1's Class 1 is literally "`() [] {} <>`" with pairing depth, which is
the motor skill Bracket Balance (PRG-11) drills. A JSX tag pair *is* a bracket pair.

**Decision: one pack, three ids.** Splitting would give three packs, three identical
ANA-05 dashboards, and three places for a keyword set to rot, in exchange for no difference
in any character's class. The distinction is preserved where it is actually observable —
in the declared id, via `resolvePack().reason === "alias"`.

Structural detail carried from PRG-01 and kept: `#` is a private-name prefix, so
`this.#count` and even `#fff` as a field name are Class 7. Backtick templates interpolate.
`regexLiteral: true` with the regex-vs-division rule.

### 4.2 `python` — three delimiter families and four literal prefixes

- **Comments:** `hashMeaning: "comment"`. `#` is not in `lineComments` on purpose — that
  field would be a second source of truth for the same character.
- **`//` is floor division.** PRG-01's rule ("comment markers are matched before any
  operator") is what lets two packs disagree about `//` with no language branch. Pinned by
  `TOK-PACK-python-floor-division` (PRG-01) and re-asserted here for all four packs.
- **`<` is a comparison, not a bracket.** `a<b>c` is two comparisons in Python.
- **Delimiters:** `'''`, `"""`, `'`, `"`.
- **Prefixes:** `r`, `u`, `b`, `f`. Declared as *letters* in one field rather than as four
  more string descriptors, because the language spells `rb`, `br`, `fr` and `fR` as well
  and hand-listing every permutation is a mess no reviewer can check. See BLOCKED-02.

### 4.3 `java` — `--` is a decrement, not a comment

This is the decision that makes the Java pack structurally different from the SQL pack,
and it is the whole reason §4.4 exists as a contrast:

- `lineComments: ["//"]` and **not** `--`. `--i` is the decrement, one of the two forms
  §7.1 names in Class 3 (`++`). `--` and `++` are both `chords`.
- **No `0o` prefix.** Java has `0x` and `0b`; legacy octal is a bare leading zero, so
  `0o7` is genuinely `0` followed by the name `o7`.
- **`digitSeparator: ""`.** `_` is legal *inside* a Java identifier (`MAX_VALUE`) but not
  between digits. The field means "allowed between digits", which Java forbids.
- **Contextual keywords excluded.** `var`, `record`, `sealed`, `permits`, `yield` are
  ordinary identifiers outside their syntactic position; listing them would mis-classify
  real names — the exact error §9.3.2 fixed for `obj.class`.
- **Text blocks** (`"""`) are declared with the language's own closing delimiter. See
  BLOCKED-01.
- **`regexLiteral: false`.** Java regexes are `Pattern.compile("…")` — the pattern is a
  string argument. There is no `/…/` literal to find, and enabling it would turn `/` into
  a regex opener in every Java snippet.

**The documented cost (§7.1's price).** §7.1 lists `<< >>` under Class 2, so `>>` is one
operator span and `List<List<String>>` closes with ONE `>>` span instead of two Class 1
brackets. The alternative — omitting `>>` so generics read correctly — would make
`x >> 2` two Class 1 brackets, which is worse and contradicts the spec. Resolving it
properly needs nesting depth, i.e. a parser. Pinned by
`TOK-PACK-java-shift-versus-nested-generics`.

### 4.4 `sql` — two comment forms and no decrement

- **`lineComments: ["--"]` AND `blockComments: [{ "/*", "*/" }]`.** Both at once is normal
  SQL. This is directly expressible in PRG-01's model: the brief listed it as a candidate
  gap and it is not one. `--` is safe here *because* SQL has no decrement — the mirror
  image of §4.3.
- **Quotes:** standard SQL is single-quoted with `''` as the escape, and a standard string
  literal may span lines, so `multiline: true`. `'O''Brien'` lands as two adjacent Class 4
  spans: every character is still Class 4 (§9.3.1), only the span boundary is where the
  language's escape rule would put it. PostgreSQL dollar-quoting (`$$ … $$`) is declared
  so a function body is never read as a run of identifiers.
- **Case.** SQL's reserved words are case-**insensitive** and written UPPER CASE by
  convention, while every other shipped language's keywords are lower-case and
  case-sensitive. The lexer compares a word to the set exactly, so this pack derives
  **both** spellings from one lower-case list. That is the data expression of "this
  language accepts any case" and it is correct today with no lexer change. (The expressive
  alternative is a `keywordCaseInsensitive` flag; data won because it works now and because
  the set is derived rather than retyped.)
- **`hashMeaning: "private-field"`.** SQL has no `#` construct. The other two meanings are
  both wrong here in a damaging way: `comment` would silently swallow the rest of a
  statement, `colour` would invent a literal SQL cannot write (SQL writes `0xFF`).
  `private-field` keeps `#name` as Class 7 and still reports a bare `#`.
- **Grouping:** parentheses only. No `[]`, no `{}`, and no `::`-free cast.

### 4.5 `html` — `<!-- -->` is a block comment, and it needed no model change

The most useful finding of this change: **HTML's comment form is expressible today.**
`blockComments: [{ open: "<!--", close: "-->" }]` is a delimiter pair matched before any
operator, so `<!-- note -->` is one Class 10 span and the `--` inside it can never be read
as a decrement or an operator. `lineComments` is empty, because declaring `//` would be a
false statement about the language.

- **Tag delimiters are brackets.** `<` and `>` are in `brackets`, not `operators`: a tag
  is a pair (`<a>` / `</a>`) and §7.1's Class 1 is "brackets & pairs … track pairing
  depth". This is also what makes HTML publishable at all — declaring them as operators
  would report an `unrecognized-character` on every tag and CNT-04's gate would then
  refuse every HTML snippet. See OPEN-CONFLICT-1 for the spec row this contradicts.
- **Both quote styles are declared**, which is what makes `title="it's here"` a single
  Class 4 token: the apostrophe cannot end a double-quoted value because the double-quoted
  descriptor is tried first and the apostrophe does not match its close.
- **No keywords at all.** `div`, `class`, `data` are element and attribute names; §9.3.2
  says a word's class comes from position, not spelling.
- **`markupScan`** declares the one thing no delimiter set can express: the region
  structure and the fact that a `style`/`script` body is a different language
  (`embedded: { script: "javascript", style: "css" }`). See BLOCKED-04.

### 4.6 `css` — the pack that closes CNT-05's colour gap

- **`hashMeaning: "colour"`.** `#ff00aa`, `#fff`, `#fff0` are the colour literals §7.1
  puts in Class 6. CNT-05 recorded that this mode existed in the engine with **no shipped
  profile declaring it**, so `#0f4071` was an `unrecognized-character` under JavaScript and
  a comment under Python/generic, and the generator refused to emit a colour literal at
  all. This pack is what unblocks it: a colour literal now classifies cleanly (no
  diagnostic), which is the condition CNT-04's publish gate requires.
- **No keywords, no literals — a decision, not an omission.** `red`, `flex` and `absolute`
  are ordinary identifiers whose meaning comes from the property they sit in, and CSS has
  no `true`/`null`. §9.3.2's rule is that a wrong class is worse than a missing one: a
  keyword list here would classify every property *value* as Class 8.
- **`chords: ["::"]`** because §7.1 names `::` in Class 3 (`::before`). The combinators
  (`>`, `+`, `~`, `||`) are one character each and stay Class 2.
- **`brackets` includes `{}`.** A rule block is a pair in the sense Class 1 means, and
  excluding it would report a diagnostic on every CSS snippet — which would make the whole
  pack unpublishable for a class question the spec answers either way.
- **`digitSeparator: "_"`.** §7.1 counts `1_000_000` as one grouped literal and CNT-05's
  number generator emits the grouped form for every skin. This trainer *types* literals; it
  does not evaluate them, so the drill is about the form a person writes. Recorded as a
  known divergence from the CSS spec.
- **`identifierGlue: "-"`** — see BLOCKED-03.

## 5. What was added to the profile model, and why

Three optional fields on a `LanguagePack`. Each exists because a real construct in one of
the six languages has no expression in PRG-01's model. None of them names a language.

| field | language that forced it | what PRG-01's model could not say |
|---|---|---|
| `stringPrefixes` | Python (`r"…"`, `b"…"`, `f"…"`) | that the letters before a delimiter are part of the literal; `open` could encode `r"` by hand but not the family (`rb`, `br`, `fr`, `fR`) |
| `identifierGlue` | CSS (`font-size`), HTML (`data-id`) | that a character may **continue** an identifier. `identifierExtra` answers a different question — which characters may **start** one, as `$` does in JS — and reusing it for `-` would turn every spaced `-` into a Class 7 identifier |
| `markupScan` | HTML | that a tag, an attribute value and a text node are different kinds of character, and that a `<style>`/`<script>` body is a different language |

`markupScan` carries `tagOpen`, `tagClose` and `embedded` (element name → pack id). Keys
are pack ids, not language names, so an embedded body always resolves.

**Deliberately not added:** nothing language-specific. `#` stays `hashMeaning` (PRG-01),
interpolation stays a flag on the string descriptor, case-insensitive SQL keywords are
solved in data (§4.4), and no field takes a language name.

`PACK_EXTENSIONS` records each field's `why`, the exact `lexerRequirement`, which packs
declare it, and `honouredByLexer`. `unconsumedExtensions(pack)` reports the fields a pack
declares that the current lexer does not read — so a declared-but-ignored field is a
**declared** lie, and the gate asserts the exact list. That is the mechanism that stopped
this change from quietly shipping three inert fields.

## 6. The four gaps the current model/lexer cannot express

Each is declared in the pack, reported by `unconsumedExtensions`, and pinned by an
`it.fails` test — which passes *because the behaviour is still wrong* and will fail loudly
the moment someone fixes it, naming the test to update. Nothing here is silent.

### BLOCKED-01 — a multi-character string `close` never matches

`token-map.ts`'s `tryString` compares `ch === spec.close`, one character against a string,
so a 3-character `close` can never match. **Effect: a Java text block `"""…"""` and a
Python `"""docstring"""` run to end of text, swallowing the rest of the snippet** and
reporting `unterminated-string`. That is the worst failure mode PRG-01 named ("a map that
double-counts an unterminated string would silently corrupt every per-class statistic").

Patch needed in `packages/engine/src/token-map.ts` (3 lines, not applied here — see §11):

```ts
// in tryString's scan loop, replacing `if (ch === spec.close) {`
if (this.src.startsWith(spec.close, i)) {
  i += spec.close.length;
  closed = true;
  break;
}
```

**Owner decision needed first:** `token-map.ts` and `language-profiles.ts` are outside this
change's claim. Applying this also warrants a `TOKENIZER_VERSION` bump (D-M5-2), because it
changes stored maps for any snippet containing `"""` — currently none, since every published
record is `javascript`.

### BLOCKED-02 — `stringPrefixes` is not consumed

The prefix letters come out as Class 7 (identifier); the body is correctly Class 4.
**Severity: low** — no character is unclassified, nothing is misclassified across a class
boundary, and the map still tiles. The cost is that a drill would score the `r` of `r"…"`
as name fluency.

Patch: in `tryString`, before matching a delimiter, accept a prefix whose letters are all
listed in a matching `stringPrefixes` entry, and emit the prefix characters as Class 4 with
the literal. Bounded by the comment rule: the lexer tries comments first, so a prefix must
never also open one (asserted by `validatePack`).

### BLOCKED-03 — `identifierGlue` is not consumed

`font-size` is three spans (`font`, `-`, `size`) instead of one, so a CSS/HTML drill counts
`margin-top` as two Class 7 names and one Class 2 operator. Colours, comments, strings and
braces are unaffected.

Patch: in `isIdentPart`, accept any character in `identifierGlue`. **Not** in `isIdentStart`
— that is the whole point of the field, and putting `-` in the start set would make every
spaced `-` (including `calc(100% - 20px)`) a Class 7 identifier.

### BLOCKED-04 — `markupScan` is not consumed

An HTML text node (`<a href="x">y</a>`'s `y`) is Class 7 today and must become Class 12
(Data & markup) with tag punctuation. Attribute values are already correct at Class 4, which
is the half of the HTML requirement that holds today.

Patch: in `scanCodeToken`, when the current position is a `tagOpen` and `markupScan` is
set, scan the tag to `tagClose` as Class 12 while quoted attribute values keep Class 4, and
switch to the pack named by `markupScan.embedded` for an embedded element's body. This is
the one gap that needs real region logic rather than a flag, and it is also what resolves
OPEN-CONFLICT-1.

## 7. `tokenizePacked`, and the one wiring change this change could not make

PRG-01's `tokenize(text, language)` resolves through the table inside
`language-profiles.ts`, which predates these six packs — so for `python`, `java`, `sql`,
`html` and `css` it still answers `generic`. **Until that is changed, `tokenizePacked(text,
languageId)` is the correct entry point**, and every fixture and test in this change uses
it.

`language-profiles.ts` is outside this change's claim, and pointing its table at
`src/profiles/` would create an import cycle (`src/profiles/*` already imports
`language-profiles.ts` for the base types and PRG-01's two profiles). The integrator should
pick one of:

1. **Move the packs into `language-profiles.ts`** and add six `PROFILES` entries. This is
   what PRG-01's own module comment says to do ("adding a language pack is a new entry in
   this file"), and it removes the duplicate export surface. `src/profiles/*` then keeps
   only the model, validator, resolver and `tokenizePacked`.
2. **Delegate**: have `languageProfile(id)` call `resolvePack(id).profile`. Works at call
   time but needs the cycle reasoned about (values used during module init — the
   `GENERIC_PACK` spread — would be undefined).

Until one of those happens, `tokenize(code, record.language)` mis-lexes a non-JavaScript
record, and CNT-04's publish pipeline
(`scripts/snippet-library.mjs` → `tokenize`) will report every non-JS snippet as
`unrecognized-character`-laden. **This is the highest-priority follow-up.**

## 8. What `validatePack` deliberately does NOT check

Redundant configuration is not a wrong class, and PRG-01 shipped three instances of it:

- a token in two lists (`<` is a bracket **and** an operator in JavaScript; `===` is a
  chord **and** an operator in `generic`). Each lexer tier wins outright, so the duplicate
  is unreachable and harmless.
- `operators` entry length. Multi-character operators *are* honoured (they are matched
  before brackets) — that is how PRG-01's Python `//` and `**` work.
- a word in both `keywords` and `literals` (`tryWord` ORs the two sets; both give Class 8).
  PRG-01's `generic` has `true`/`false`/`null` in both.

What it *does* check, each with a fault-injection test that proves the check fires: pack id
shape, non-empty label, the presence of a comment form (counting `hashMeaning: "comment"`),
line/block comment opener arity, non-empty string delimiters, interpolation implying
multiline, `digitSeparator` arity, radix prefix shape and arity, chord arity, bracket arity,
keyword spellability under the profile's own identifier rules, string-prefix shape /
duplication / comment collision, `identifierGlue` length, and `markupScan` delimiters.

## 9. OPEN-CONFLICT-1 — are HTML tags Class 1 or Class 12?

§7.1 says both:

- Class 1 "Brackets & pairs | `() [] {} <>`" — with "track pairing depth"
- Class 12 "Data & markup | JSON, YAML, **HTML tags**, SQL, regex"

This pack chooses **Class 1**, for three reasons: a tag is genuinely a pair, Class 1's
pairing depth is exactly what PRG-11 drills, and choosing Class 12 today is impossible
without `markupScan` (BLOCKED-04) — which would make every HTML snippet unpublishable in
the meantime.

**This is a decision for ANA-05 to settle with data, not for PRG-02.** The pack already
declares `markupScan`, so switching to Class 12 is a data change plus the lexer work, and
the fixtures say which spans would move.

## 10. Version stamps

- **`ENGINE_MODEL_VERSION` is unchanged**, and not bumped. No headline formula, no
  threshold and no pass rule changed: WPM, net WPM, accuracy, KSPC, consistency and burst
  are untouched. AGENTS.md rule 3 ties that version to metric semantics, and a pack changes
  nothing in it.
- **`TOKENIZER_VERSION` is unchanged**, because no classification changes for any content
  that exists today. All 34 published records are `javascript`, whose profile is byte-for-byte
  PRG-01's. The one change that *would* move a stored map is BLOCKED-01, and that patch must
  come with a bump.

## 11. Follow-ups, in priority order

| # | change | file | why |
|---|---|---|---|
| 1 | point `tokenize(text, language)` at the pack resolver (§7) | `src/language-profiles.ts` | until then a non-JS record mis-lexes in the publish pipeline |
| 2 | BLOCKED-01, multi-character string `close` | `src/token-map.ts` | Java text blocks and Python docstrings currently swallow the rest of a snippet; needs a `TOKENIZER_VERSION` bump |
| 3 | BLOCKED-03, `identifierGlue` | `src/token-map.ts` | `margin-top` is three spans today |
| 4 | BLOCKED-02, `stringPrefixes` | `src/token-map.ts` | the `r`/`f` prefix is scored as a name |
| 5 | BLOCKED-04, `markupScan` | `src/token-map.ts` | HTML text nodes and tag punctuation; also unblocks OPEN-CONFLICT-1 |
| 6 | re-point the ledger's `TOK-FIXTURE-004` citation at the PRG-02 half | `docs/FEATURE-LEDGER.md` (integrator) | PRG-01's own fixture is named `TOK-FIXTURE-004-keyword-vs-identifier-position` and was left untouched here; renaming it is a PRG-01 file change |
| 7 | CNT-05 deferred item 1 (colour literals) | `packages/generators` | unblocked by this pack; the integrator can now enable the form |

## 12. Test map

| file | what it holds |
|---|---|
| `fixtures/tok02.ts` | 22 per-pack fixtures + `TOK_FIXTURE_004` (four packs, one text) |
| `tests/profiles/prg02-packs.test.ts` | six packs, `validatePack` clean for all six, fingerprint distinctness, mutual non-copy (every pack's witness lexed under every other pack), round-trip + determinism, the resolution rule, the extension declarations, 18 fault-injection controls, and a source scan proving no clock/randomness/I/O in the pack layer |
| `tests/profiles/prg02-pack-fixtures.test.ts` | the fixture loop with tiling re-derived from the source, per-pack coverage, every-class coverage, the TOK-FIXTURE-004 four-way assertion and its control |
| `tests/profiles/prg02-hard-cases.test.ts` | the failing-direction assertions, and the six `it.fails` tripwires for §6 |