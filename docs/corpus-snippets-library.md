# Snippet library (CNT-04)

The code-mode library layer: 34 JavaScript snippets from `content/corpus.json`
(CNT-01) turned into typed, reviewable records, with a **computed** token-class
mix, tags the programmer track selects on, and three things the corpus
deliberately refused to resolve held as first-class records rather than swept up.

**Artifacts**

| Path | Role |
| --- | --- |
| `scripts/snippet-library.mjs` | The pure core. No `fs`, no clock, no engine import. Strings in, plain objects out. |
| `scripts/snippet-engine-loader.mjs` | The single place that loads PRG-01's token map into a plain-ESM script. |
| `scripts/build-snippets.mjs` | Thin CLI. Writes the artifact, or writes nothing and exits 1. |
| `scripts/check-snippets.mjs` | The gate. Runs in CI. Deliberately does **not** regenerate. |
| `scripts/snippet-library.test.mjs` | 83 tests, mostly failing directions. |
| `scripts/snippet-mutants.test.mjs` | 35 mutants + 5 no-mutation controls. |
| `scripts/snippet-no-execution.test.mjs` | 11 tests: the rule-5 proof (static, runtime, render). |
| `content/snippets/library.json` | The committed artifact. |

## Commands

```bash
pnpm build:snippets   # regenerate content/snippets/library.json from the corpus
pnpm check:snippets   # gate: drift + invariants (this is what CI runs)
```

`check:snippets` does not regenerate, for the same reason `check:corpus` does not:
running the build first in CI would hide exactly the staleness the step exists to
catch.

---

## 1. Architecture

```
content/corpus.json ──┐
                      ├─► buildSnippetLibrary()          [pure, injectable lexer]
register rows ────────┘   (CNT-07's parseRegisterMarkdown, for withheld ids only)
                              │
                              ├─ stage 1  licence, recomputed by CNT-07's classifyLicense
                              ├─ stage 2  lex every snippet through PRG-01's tokenize
                              ├─ stage 3  derive mix, surface tags, feature tags, tiers
                              ├─ stage 4  difficulty from the register, never inferred
                              ├─ stage 5  withheld records (placeholders + duplicates)
                              ▼
                        serialiseSnippetLibrary() → content/snippets/library.json
                              ▼
                        check-snippets.mjs  re-derives and re-checks
```

| File | Role |
| --- | --- |
| `snippet-library.mjs` | The pure core. Markdown/JSON strings in, plain objects out. No `fs`, no clock, no randomness. Every stage and every rule is exported for testing. |
| `snippet-engine-loader.mjs` | Loads `packages/engine`'s token map. See §2. |
| `build-snippets.mjs` | CLI. Reads through the corpus artifact and CNT-07's register parser, writes the artifact. |
| `check-snippets.mjs` | The gate. Reads the committed artifact **and** rebuilds from `content/corpus.json`, then checks both. |

### What is reused rather than reimplemented

This is the whole point of the task, so it is worth naming each import:

| From | What | Why reuse beats a copy |
| --- | --- | --- |
| `check-content-licenses.mjs` (CNT-07) | `classifyLicense`, `isShippableStatus`, `needsLicenseText`, `parseRegisterMarkdown`, `collectCorpusInputs` | The licence gate and this one ask the same question about the same rows. A second regex list is a second opinion that drifts, and the rule that must never drift is "is this content licence-clean". |
| `corpus-pipeline.mjs` (CNT-01) | `normaliseForDedupe`, `sha256Hex`, `compareIds` | A duplicate means the same thing here as in the corpus, or it means nothing. |
| `packages/engine` (PRG-01) | `tokenize`, `tokenClassCounts`, `validateTokenMap`, `sanitizeSnippet`, `TOKEN_CLASSES` | The token classes are a scoring decision that lives in one place by AGENTS.md rule 3. A content gate with its own lexer would validate snippets against fiction. |
| `packages/generators` (CNT-05) | the tier numbering in `GENERATOR_OWNED_TIERS` | The repo carries two tier schemes in circulation; a third would be worse. |

### Why there is a loader at all

Every other file in `scripts/` is dependency-free plain ESM, and so are these. But
this layer has to run the *authoritative* lexer, and `packages/engine` ships
TypeScript source (`main: src/index.ts`) with no `dist` committed and no root
dependency on it. Three ways out:

1. Import `packages/engine/dist/**`. **Rejected**: it makes the content gate
   depend on `pnpm build` having run, so the same command passes or fails depending
   on what someone ran before it.
2. Vendor a lexer. **Rejected**: that is precisely the "second opinion that
   drifts" failure rule 3 forbids.
3. Load the source. Node 24 (`.nvmrc`) strips types natively, so the only missing
   piece is resolving the engine's `./x.js` specifiers to the `./x.ts` files that
   exist. That is a ~12-line synchronous resolve hook, and it rewrites a `.js`
   specifier **only** when the `.js` file is absent and the `.ts` file is present.

The hook performs no source transformation, so the code that validates a snippet is
byte-for-byte the code the browser types against.

### Determinism

Same input, byte-identical output. No `Date.now()`, no randomness, no network, no
filesystem ordering dependence. The artifact carries **no timestamp, no commit hash
and no absolute path**, because a build whose output changes when nothing in the
corpus changed is a build nobody regenerates. Sort order is explicit and total:
`compareIds` compares numeric id segments numerically, so `CODE-JS-009` precedes
`CODE-JS-010`. JSON key order comes from construction, never from hash order.

The proof is three-way: two builds byte-identical, both equal to the committed
artifact, and the gate fails on drift.

---

## 2. Record shape

Every record in `records[]` carries:

| Field | Meaning |
| --- | --- |
| `id` | `CODE-JS-nnn`, as declared by the corpus. |
| `language` / `surface` / `contentType` | The corpus's language; the surface derived from the register's `content_type_tag` (`utility` / `algorithm` / `web` / `react`); the tag itself. |
| `code` | The exact characters to type. Never interpreted, only rendered. |
| `status` | `library`, or `withheld-duplicate` when the record carries a defect. |
| `size` | Lines, characters, longest line. Real measurements, not estimates. |
| `declaredTokenMix` | The **author's** note from the source document, verbatim. |
| `tokenMap` | `tokenizerVersion`, resolved `language`, `clean`, `diagnostics`, `tilingIssues`, `nonAscii`. |
| `tokenClassMix` | Per-class characters and tokens (all twelve, zero-filled), `symbolShare`, `typedCharacters`. **Computed**, not declared. |
| `tags` | `surfaces` (token surface tags), `tiers` (drill tiers), `features` (closed vocabulary). |
| `difficulty` | `band`, `source`, `reason`. See §5. |
| `licence` | `declaration`, `licenseClass`, `textRequired`, `source`, `attribution`, `registerRef`, `registerStatus`, `shippable`. See §3. |
| `provenance` | `{ file, line }` — 1-based, pointing at the source declaration. |
| `defects` | Content defects with `code`, `detail`, `action`, `needsHumanDecision`. |
| `publishBlockers` | The recomputed reason this record cannot ship. Empty means selectable. |
| `corpusShippable` / `corpusPublishBlockers` | The corpus's own verdict, kept so the library cannot silently improve on it. |

`withheld[]` records have `code: null`, `size: null`, `tokenMap: null`,
`tokenClassMix: null`, `tags: null`, and a defect with the action a human must
take. See §4 and §6.

### Feature tags are derived, never typed in

`FEATURE_TAGS` is a closed vocabulary, and every tag comes from the token map's
spans, not from prose:

| Tag | Derived from |
| --- | --- |
| `function-declaration` / `class-declaration` / `async-await` | a `keyword` span whose text is `function` / `class` / `async`\|`await` |
| `arrow-function` | a `chord` span `=>` |
| `template-literal` | a `string` span whose text is exactly a backtick |
| `regex-literal` | a `data` span matching `/…/[dgimsuvy]*` |
| `comment-line` / `comment-block` | a `comment` span starting `//` or `/*` |
| `spread-rest` / `optional-chaining` / `nullish-coalescing` | chord spans `...` / `?.` / `??` |
| `default-parameter` | an `=` operator span whose innermost open bracket is `(` |
| `dom-api` / `react-hook` / `array-method-chain` / `promise` | an `identifier` span in the corresponding closed name set |
| `jsx` | the record's register `content_type_tag` is `code.react` |

Two consequences worth stating. A `/` inside a comment is a `comment` span, not a
`data` span, so it cannot be mistaken for a regex; and a backtick inside a
single-quoted string is a `string` span whose text is not a lone backtick, so it
cannot be mistaken for a template opener. Deciding from spans rather than from raw
text is what makes that true by construction rather than by luck.

`default-parameter` is the one tag that reads across spans — the token map
deliberately does not distinguish a default from an assignment. It reads the same
spans the map ships, so the two cannot disagree about which characters are
brackets.

### Drill tiers

From the skill's six-tier scheme, with two stated extensions:

| Tier | Surface tags | Generator? |
| --- | --- | --- |
| 1 | `brackets` | CNT-05 `brackets` |
| 2 | `operators`, `chords` | **No generator family.** PRG-11 owns bracket-pair latency; tier-2 drills are hand-authored. |
| 3 | `strings`, `data` | CNT-05 `strings` |
| 4 | `numbers` | CNT-05 `numbers` |
| 5 | `number-systems`, `paths` | CNT-05 `ids` |
| 6 | `identifiers`, `keywords` | CNT-05 `naming` |
| 7 | `whitespace` | **No generator.** Auto-indent is PRG-15, V1 per the tier tables. |
| — | `comments` | `null`. Comments are docs, not a drill. Explicitly null rather than absent, so "no drill covers this" is visible in the record. |

A regex literal is Class 12 `data`, but typing one is quote-context string work —
`packages/engine/src/token-class.ts` says as much of the tension — so it drills
with tier 3 rather than being unclassifiable.

`coverage.tiersUngenerated` records the two ungenerated tiers with their reasons,
so the gap is data rather than a sentence in this document.

---

## 3. Licence enforcement is mechanical

Not a review note. A snippet with a missing licence, a copyleft licence, an
unrecognised licence, or a hand-edited `licenseClass` **fails the gate**.

**Recomputed, never trusted.** `classifyLicense` runs on every record's
`licence.declaration` inside `check-snippets.mjs`, and the stored verdict is
compared against it. Editing `licenseClass` to `"allowed"` over a `GPL-3.0`
declaration produces two offenders, not zero.

**Fail-closed on all three verdicts**, exactly as CNT-07 orders them — copyleft is
tested first so `"MIT OR GPL-2.0"` fails:

| Verdict | Offender |
| --- | --- |
| `missing` | `LICENCE-MISSING` |
| `copyleft` | `LICENCE-COPYLEFT` |
| `unknown` | `LICENCE-UNKNOWN` |
| `allowed` but stored verdict differs | `LICENCE-CLASS-MISMATCH` |

The failing-direction tests, each a one-line mutation of the real artifact:

| Test | Fixture | Offender |
| --- | --- | --- |
| a copyleft licence is rejected | `"GPL-3.0"` | `LICENCE-COPYLEFT` |
| a dual licence naming a copyleft term is rejected | `"MIT OR GPL-2.0"` | `LICENCE-COPYLEFT` |
| an AGPL lineage is rejected | `"AGPL-3.0-only"` | `LICENCE-COPYLEFT` |
| an empty licence is rejected | `"   "` | `LICENCE-MISSING` |
| a missing licence field is rejected | field deleted | `LICENCE-MISSING` |
| an unrecognised licence is rejected | `"do whatever you want"` | `LICENCE-UNKNOWN` |
| a hand-edited verdict is caught | `licenseClass: "allowed"` over `GPL-3.0` | `LICENCE-COPYLEFT` + `LICENCE-CLASS-MISMATCH` |
| a withheld placeholder with a copyleft licence | `CODE-JS-P01` → `AGPL-3.0` | `LICENCE-NOT-ALLOWED` |

Plus two build-level tests: `buildSnippetLibrary` marks a copyleft record with a
`licence-copyleft` blocker, and one with no licence at all with `licence-missing`,
and in both cases `stats.selectable` stays 0.

`needsLicenseText` and `isShippableStatus` are reused for the same fields the
corpus already carries, and `needsLicenseText` is stored per record as
`licence.textRequired` so a future attribution page (CNT-06) can find the
third-party items without re-parsing the register.

---

## 4. Token-map validation: what was checked and what it caught

Every emitted snippet goes through PRG-01's `tokenize`, which is the
implementation-guide §6.3 step-4 rule — *"confirm each snippet parses cleanly with
the language grammar; reject those with syntax errors"* — applied to the lexical
map that already exists.

### What is checked

| Check | Rule | Offender |
| --- | --- | --- |
| Lex diagnostics | `diagnostics` empty: no `unterminated-string`, `unterminated-template`, `unterminated-block-comment`, `unrecognized-character` | `LEX-DIAGNOSTIC` |
| Stored claim vs reality | the record's own `tokenMap.clean` must agree with a fresh lex of its own text | `LEX-DIAGNOSTIC-UNREPORTED`, `LEX-CLEAN-MISREPORTED` |
| Tiling (D-M5-2) | `validateTokenMap` reports no gap, overlap, out-of-range or zero-length span | `TILING-BROKEN` |
| Language resolved | the lexer must resolve to the declared profile, **not** `generic` | `LANGUAGE-UNKNOWN` |
| Mix belongs to the code | stored per-class chars and tokens must equal a fresh computation | `MIX-MISMATCH` |
| Lexer failure | a throwing lexer is caught, not swallowed | `LEX-THREW` |
| Non-ASCII placement | recorded with the class each character landed in | (data, not a rule) |

Re-lexing the record's **own stored text** rather than trusting the stored
diagnostics is what makes the check load-bearing: it catches a record whose text
was edited after the artifact was written, and it is the only way the gate can know
the stored mix belongs to the stored code.

The `LANGUAGE-UNKNOWN` rule exists because the lexer degrades a mistyped language
id to the `generic` profile rather than throwing. Without it, a record declaring
`"javascriptx"` would be validated by the *least opinionated* profile in the
engine and look fine.

### What it caught in the real corpus

**Nothing, and that is stated rather than dressed up.** All 34 snippets lex clean:
`34/34 lex clean`, zero diagnostics, zero tiling issues, every language resolving
to `javascript`. The corpus text is good.

1. **`CODE-JS-005` and `CODE-JS-033` carry non-ASCII characters.** The euro and
   pound signs (currency symbols in a symbol table) and a check-mark glyph (a
   completed-todo marker) land in `string` spans, so they are class 4 content and
   not diagnostics. Recorded per record in `tokenMap.nonAscii` with the class each
   landed in, so a reviewer can see they are string content rather than stray
   markup. **This is a layout finding, not a lexical one**: on most layouts these
   characters are AltGr combinations or dead keys, which is exactly what the
   skill's layout-awareness rule is about. Flagged for PRG-02 / LOC-01.

2. **The coverage block is honest about what the library does not contain.**
   `featuresDeclaredButUnused` names `comment-line` and `comment-block` — no
   snippet in the corpus has a comment, which is a real gap in the typing material
   and a thing the next authoring batch should fix. Recording it as data stops it
   being an omission nobody notices.

The failing-direction tests, each a hand-damaged copy of the real artifact:

| Test | Injected text | Diagnostic |
| --- | --- | --- |
| unterminated string | `const s = 'oops` | `unterminated-string` |
| unterminated template | `` return `value ${a}; `` | `unterminated-template` |
| unterminated block comment | `/* debounce` | `unterminated-block-comment` |
| unrecognised character | a bare `€` outside a string | `unrecognized-character` |
| a broken snippet marked lex-clean | both | `LEX-DIAGNOSTIC` |
| a clean snippet marked unclean | — | `LEX-CLEAN-MISREPORTED` |
| a mix that does not match its code | `chars.bracket += 3` | `MIX-MISMATCH` |
| a language that falls back to generic | `"javascriptx"` | `LANGUAGE-UNKNOWN` |

So the win here is *assurance*, not rescue: the check now exists, is proved
load-bearing by 35 mutants and 8 failing-direction tests, and will reject the
first snippet that arrives broken. It also produced two real findings:

---

## 5. Difficulty bands: null with a reason, never a guess

`difficulty` is `{ band, source, reason }`, and the rule is narrow on purpose:

- A band appears **only** when the content register declared one. It is copied
  verbatim with `source: "register"`. The gate rejects a band with any other
  source (`DIFFICULTY-BAND-WITHOUT-SOURCE`) and a band outside the register's
  three values (`BAND-NOT-IN-REGISTER`).
- A `null` band must carry a non-empty `reason` (`BAND-WITHOUT-REASON`), and the
  reason is a fixed constant naming why:

  > no typability band for code: CNT-02's scorer is not built and implementation
  > guide §6.5 step 8 states it is not valid for code or symbol-heavy text. A band
  > is only ever copied from the content register, never guessed from length or
  > symbol density.

**Today: 33 of 34 records carry a register band, 1 does not.** `CODE-JS-001` is
the one, because the register's corrected entry for it declares no difficulty. It
ships with `band: null`, the reason above, and a `no-difficulty-band` blocker.

The symbol-density non-inference is tested directly: a deliberately awful,
symbol-dense snippet (`a?.b??c...[d]>>>e;`) still comes out of the build with no
band. A guess here would be indistinguishable from a measurement downstream, which
is the failure mode the whole `null` + reason convention exists to prevent.

**Coordination with CNT-02:** this task does not compute bands and does not touch
`packages/typability/**`. When CNT-02's scorer lands, the band stops being a
register copy and becomes a computed field — at which point `source` changes from
`"register"` to the scorer's version, `TYPABILITY_MODEL_VERSION` stops being
`null`, and the gate's `DIFFICULTY-BAND-WITHOUT-SOURCE` rule is what forces the
change to be deliberate rather than silent.

---

## 6. `CODE-JS-P01/P02/P03` and the duplicate

### The three placeholders

The register names three real repositories whose licences are confirmed but whose
exact file content was never pulled at a pinned commit:

| Id | Repository | Licence | Target |
| --- | --- | --- | --- |
| `CODE-JS-P01` | `lodash/lodash` | MIT | `lodash.debounce.js` or equivalent |
| `CODE-JS-P02` | `jashkenas/underscore` | MIT | a small collection utility |
| `CODE-JS-P03` | `sindresorhus/is` | MIT | the `isEven`/`isOdd` predicates |

They are **present in the library**, as `withheld[]` records with:

- `code: null` — there is no text, so there is nothing to lex and nothing to type;
- `status: "withheld-do-not-ship"` and `licence.shippable: false` — unconditionally;
- `publishBlockers: ["withheld-do-not-ship", "do-not-ship", "no-content-body", "licence-text-not-pulled"]`;
- `defects[0]` carrying the licence-confirmed-but-content-never-pulled detail and
  the action a human must take.

Nothing silently includes them; nothing deletes them.

**Why present rather than omitted.** An invisible placeholder is one somebody later
"fills in" from a search result — the exact failure the register exists to catch. A
record that says `code: null` with a stated reason and an action cannot be filled in
by accident. The `action` field is the whole procedure:

> clone the named repository at a pinned commit, copy the exact file, save the
> LICENSE file from that same commit, then run the item through the register's
> second-reviewer step.

CNT-01's `do-not-ship` rejection is preserved verbatim: this layer only ever sees
those ids through `corpus.rejected`, and only converts them to withheld records.

The accounting is enforced in both directions, because either direction alone
leaves a hole:

| Rule | Fails when |
| --- | --- |
| `WITHHELD-MISSING` | the corpus rejects an id but the artifact holds no record — a deletion |
| `WITHHELD-UNEXPLAINED` | the artifact withholds an id the corpus does not reject — an invention |

Plus `PLACEHOLDER-SHIPPABLE` (marked shippable), `PLACEHOLDER-CONTENT` (given text),
`PLACEHOLDER-UNMARKED` (defect or blocker removed), and `LICENCE-NOT-ALLOWED`.

### The `CODE-JS-001` / `CODE-JS-002` duplicate

CNT-01 found that these two ids carry **byte-identical** `chunkArray`
implementations: `CODE-JS-001` from the lodash-*style* utility file, `CODE-JS-002`
from the original-snippets file. It dropped `CODE-JS-002` as a duplicate and
recorded the finding.

That is the right corpus-layer call and it is not enough here. This library does
three things with it:

1. **Both ids are present.** `CODE-JS-001` is a normal record with
   `status: "withheld-duplicate"`, a `duplicate-text` defect naming its twin, and
   a `content-defect: duplicate-text` blocker. `CODE-JS-002` is a `withheld[]`
   record with `code: null` — present, visible, and never storing the same text
   twice, because a selector reading this file must never see two identical items
   it might pick from.
2. **The collision is one finding**, not a per-record annotation:

   ```json
   { "code": "duplicate-text", "ids": ["CODE-JS-001", "CODE-JS-002"],
     "kept": "CODE-JS-001", "dropped": ["CODE-JS-002"],
     "fingerprint": "caf971d180e8", "status": "needs-human-decision" }
   ```

   with `decision: "Reconcile the source document: keep one id for this function
   and delete the other. The library will then report one clean record and no
   defect."`

3. **Neither side can be made to disappear quietly.** The finding and the records
   are checked in both directions:

   | Rule | Fails when |
   | --- | --- |
   | `DEFECT-NOT-APPLIED` | a finding names an id whose record carries no such defect |
   | `DEFECT-UNEXPLAINED` | a record carries a defect no finding names |
   | `DEFECT-IDS-UNKNOWN` | a finding names an id absent from the artifact |
   | `DUPLICATE-DUPLICATED-STORAGE` | a withheld duplicate stores text |
   | `DUPLICATE-UNREPORTED` | two records collide with no finding |
   | `DUPLICATE-UNMARKED` | a colliding record carries no defect |
   | `DUPLICATE-SELECTABLE` | a colliding record has no blockers |

   Clearing `CODE-JS-001`'s defect, or deleting the whole `defects[]` array, are
   each caught by a different rule. That is deliberate: they are the two ways a
   human "tidies away" a known defect without deciding it.

**Neither record is dropped, and the library does not decide which id survives.**
That is an editorial decision about the source document. The library's job is to
hold both, mark both, and make the decision impossible to lose.

**Nothing here blocks the build.** A duplicate is an authoring defect, not a
licensing or safety violation, and blocking the whole library over one pair would
mean a user cannot practise at all because two snippets are the same — the same
trade CNT-01 made, for the same reason. What this layer adds is that the defect
cannot be *lost*.

---

## 7. Nothing is selectable yet, and the artifact says so

`stats.selectable` is **0**, and every record's `publishBlockers` is non-empty.
That is the corpus's real state, not a bug: 33 of 34 snippets are `draft` in the
register pending the second-reviewer audit (§6.4 step 8), and the one that is
`reviewed` carries a duplicate defect and no difficulty band.

The gate recomputes `publishBlockers` from each record's own fields and compares,
so the list cannot drift into under-reporting. `BLOCKER-MISSING` catches a deleted
blocker, `BLOCKER-UNDECLARED` catches an invented one, and `BLOCKER-MISREPORTED`
catches a `status-not-shippable:` blocker that misquotes the register.

The blocker list is stored for audit, not decoration: a consumer selecting a
snippet must check `publishBlockers.length === 0`, and the gate proves that check
agrees with a recomputation.

---

## 8. Findings

### 8.1 A register defect on `CODE-JS-001` — needs a human decision

`CODE-JS-001` carries the **worst** licence provenance in the library, and it is
the one record the register marks `reviewed`.

`docs/content-code-snippets-javascript.md` holds two conflicting entries for it:

| Row | licence | source | status |
| --- | --- | --- | --- |
| original | `MIT — confirmed via the repository's own README statement ("Lodash is released under the MIT license") …` | `` `lodash/lodash`, the `isEmpty`-style small-utility pattern `` | `reviewed (structure verified; exact current file content NOT copied — see note)` |
| **corrected** | `original work — ours` | (empty) | `reviewed` |

and `docs/content-license-register.md` agrees with the corrected row.

The document's own prose says the corrected row is the truth:

> This entry is relabeled from "real snippet" to "original, lodash-style utility" —
> see the corrected type field below. … rather than copy an exact excerpt from
> lodash's actual source tree … the snippet below is an original, small,
> MIT-license-compatible utility function written fresh for this library.

**What CNT-01 emitted, and why.** `corpus.json` records `CODE-JS-001` with the
**original** (MIT-from-lodash) licence string, because `preferredRow` sorts by file
and `docs/content-code-snippets-javascript-original.md` contains no row for
`CODE-JS-001`, so the first row in `docs/content-code-snippets-javascript.md` wins.
That is a deterministic tie-break doing what it was built to do; the defect is in
the corpus, not in the pipeline.

**Why it matters for CNT-04 specifically.** This is the exact mistake the licence
register exists to catch, and this library is the last place it can be caught
mechanically:

- the *correct* claim is `original work — ours`, which needs no attribution and no
  saved licence text;
- the *recorded* claim is a third-party MIT claim from lodash, with the notice text
  saved, on a snippet the author says they wrote themselves;
- a downstream attribution page (CNT-06) reading this record would publish
  "© JS Foundation and other contributors" above a function nobody copied.

Both verdicts classify as `allowed`, so **no gate rule fires** — correctly, because
the licence is permissive either way. The defect is provenance, and mechanical
enforcement cannot detect a *false* provenance claim that is permissively licensed.
That is a human decision, not a rule.

**Action for a human:** decide which is true and reconcile `CODE-JS-001` across
`docs/content-code-snippets-javascript.md`, `docs/content-license-register.md` and
`content/corpus.json`. Both files are corpus markdown, read-only for this task.

### 8.2 Non-ASCII characters need a layout decision

`CODE-JS-005` (`€`, `£`) and `CODE-JS-033` (`✓`) — see §4. They lex as class 4
string content, so no gate rule applies. On most keyboard layouts they are AltGr
combinations or dead keys. Flagged for PRG-02 / LOC-01.

### 8.3 No snippet in the library contains a comment

`featuresDeclaredButUnused: ["comment-line", "comment-block"]`. Comments are a
real gap in JavaScript typing material and a real part of the token taxonomy
(class 10). Recorded in the artifact rather than fixed here, because writing
snippets is content work.

### 8.4 Nothing is selectable

See §7. This is the second-reviewer audit, human work.

### 8.5 `CODE-JS-002`'s difficulty band is unreachable

`CODE-JS-002` is in `withheld[]`, so it has `difficulty.band: null` and the
standard reason — the corpus dropped the item before the library saw it, so no
register band travels with it. If the human decision is "keep `CODE-JS-001`", this
resolves itself; if it is "keep `CODE-JS-002`", the kept id needs a band from the
register.

---

## 9. Commands

```bash
pnpm build:snippets   # regenerate content/snippets/library.json from content/corpus.json
pnpm check:snippets   # gate: drift + invariants (this is what CI runs)
node --test scripts/snippet-library.test.mjs scripts/snippet-mutants.test.mjs scripts/snippet-no-execution.test.mjs
```

## 10. Deferred

| Item | Why |
| --- | --- |
| Typability bands for code | CNT-02, and §6.5 step 8 says the model is not valid for code anyway. `band` is `null` with a reason. |
| Tier-2 (operator/chord) drills | No generator family exists; PRG-11 owns bracket-pair latency. Recorded in `coverage.tiersUngenerated`. |
| Comment-bearing snippets | A content gap, recorded as `featuresDeclaredButUnused`. |
| Python / Java / SQL / HTML-CSS snippets | PRG-02 language packs. The record shape is language-agnostic; `surface` is the only language-specific assumption and it is derived from the register's tag. |
| `CODE-JS-P01/P02/P03` content | Needs repo access at a pinned commit. Human action, stated per record. |
| `CODE-JS-001` provenance | Human decision, §8.1. No rule can detect it. |
| Second-reviewer audit | Human work; until it happens every record is `draft` and unselectable. |
| Zod contract in `packages/schemas` | The record shape is declared in `snippet-library.mjs` because the builder is plain ESM with no dependency, matching the licence gate and the corpus pipeline. Move it to `@realtype/schemas` when a runtime package first imports the library, so there is one contract rather than two. |
| Near-duplicate detection | Deliberately not implemented, for the same reason as CNT-01: on short snippets, token-overlap similarity flags legitimate siblings, and an over-eager near-dup rule is how a dedupe stage starts deleting good content. Exact-duplicate detection with CNT-01's stated normalisation is the defensible subset. |
| Grammar-level validation (Tree-sitter) | PRG-01's lexical map is not a parser: it cannot tell `if (a) {}/x/.test(s)` from division. `token-map.ts` names that limitation and `grammar-refine.ts` is the seam for it. Until a grammar loads, "parses cleanly" means "lexes cleanly", which is what the gate asserts and what the artifact records. |