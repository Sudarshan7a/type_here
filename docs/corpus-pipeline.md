# Corpus pipeline (CNT-01)

The markdown corpus in `docs/content-*.md` is the source of truth a human edits.
`content/corpus.json` is the machine-readable build of it, and it is the contract
the app would eventually load. This document explains how one becomes the other,
what the pipeline decided, and what it found.

**The corpus markdown is an input, read-only for this pipeline.** Nothing here
rewrites `docs/content-*.md`; findings go in this document and in the artifact's
`duplicates` / `rejected` arrays for a human to act on.

---

## 1. Architecture

```
docs/content-*.md  ──┐
                     ├─► collectCorpusInputs()      [imported from check-content-licenses.mjs]
docs/content-license-register.md ─┘        │
docs/content-register-update-*.md ─────────┘
                                              ▼
                                   extractItems()  per file shape
                                              ▼
                              stage 1  licence per item   (fail-closed)
                              stage 4  tags                (closed enum)
                              stage 3  sensitive filter    (blocking + allowlist)
                              stage 2  dedupe             (report-and-drop)
                                              ▼
                              serialiseCorpus()  →  content/corpus.json
                                              ▼
                              check-corpus.mjs  re-derives and re-checks
```

| File | Role |
| --- | --- |
| `scripts/corpus-pipeline.mjs` | The pure core. Markdown strings in, plain objects out. No `fs`, no clock, no randomness. Every stage and every rule is exported for testing. |
| `scripts/build-corpus.mjs` | Thin CLI. Reads disk through the gate's own collector, writes the artifact. Writes nothing and exits 1 on any failure. |
| `scripts/check-corpus.mjs` | The gate. Reads the committed artifact **and** rebuilds from `docs/`, then checks both. |
| `scripts/corpus-pipeline.test.mjs` | Stage rules, mostly failing directions. |
| `scripts/check-corpus.test.mjs` | Gate rules, every one a failing direction. |
| `content/corpus.json` | The committed artifact. |

### Why the parsers are imported, not copied

`scripts/corpus-pipeline.mjs` imports `collectCorpusInputs`, `parseRegisterMarkdown`,
`discoverItemIds`, `classifyLicense`, `isShippableStatus` and `expandIdRange`
straight from `scripts/check-content-licenses.mjs` (CNT-07).

The licence gate and the corpus pipeline ask the same question about the same
tables — "is this item licensed?" — so a second copy of those parsers is a second
opinion that can drift. With one parser, an item cannot be emitted carrying a
licence the licence gate would reject: the pipeline literally calls the gate's own
`classifyLicense`.

The one thing the pipeline needs that the gate's row shape does not carry is the
`content_type_tag` column, so `parseContentTypeTags` reads that column using the
gate's own `expandIdRange` for the id cell. It decides nothing licence-related.

### Determinism

Same input, byte-identical output. No `Date.now()`, no randomness, no network, no
filesystem ordering dependence (the collector's directory listing is sorted before
use). The artifact carries **no timestamp, no commit hash and no absolute path**,
because a build whose output changes when nothing in the corpus changed is a build
nobody regenerates.

Sort order is explicit and total: `compareItems` orders by family rank
(`PROSE, QUOTE, CODE, WORDLIST, COMP`) then by `compareIds`, which compares
numeric id segments numerically so `PROSE-01-002` precedes `PROSE-01-010`. JSON
key order comes from construction, never from hash order.

---

## 2. Item shape

Every item in `content/corpus.json` carries:

| Field | Meaning |
| --- | --- |
| `id` | `PROSE-01-001` style id, as declared by the source file. |
| `family` / `kind` | `PROSE`/`prose`, `QUOTE`/`quote-original`, `QUOTE`/`quote-public-domain`, `CODE`/`code-snippet`, `WORDLIST`/`word-list`, `COMP`/`composition-prompt`. |
| `text` | The actual typing content. |
| `language` | `en`, or `javascript` for code. |
| `contentType` + `tagSource` | The normalised tag, and which rule produced it (`register`, `id-prefix`, `declared-length`, `heading`, `file-default`). |
| `difficulty` | `easy` / `typical` / `hard` where the source declares one, else `null`. |
| `wordCount` / `declaredWords` | Computed whitespace-token count, and the count the source header claims. Divergence is a finding, not an error — see §7. |
| `license` / `licenseClass` | The register's licence string, classified by the gate's `classifyLicense`. |
| `source` / `attribution` | Register `source` cell; `attribution` is the per-line source on public-domain quotes. |
| `registerRef` | Which register document licensed this item. |
| `registerStatus` / `shippable` | The review status verbatim, and whether `isShippableStatus` accepts it. |
| `publishBlockers` | §6.4's publish gate, as data. See §6. |
| `provenance` | `{ file, line }` — 1-based, pointing at the item's declaration. |
| `sensitiveAllowlist` | Present only when a sensitive rule matched and an allowlist entry covers it, with that entry's written reason. |

### The completeness spine

Every licensable id the CNT-07 gate discovers anywhere in the corpus must end up
**emitted** or **rejected with a stated reason**. Anything else fails the build as
`UNACCOUNTED-ITEM`.

This is the single most important property of the pipeline. The corpus is being
loaded for real, so a parser that quietly matched 24 of 40 quotes would be silent
content loss — the user just types less text and nobody notices. Making the
leftover set a hard failure means every future change to a corpus file's shape has
to be handled explicitly.

It immediately earned its keep: it is what surfaced the `QUOTE-PD-025…040`
traditional-proverb lines, which use a different attribution shape from every other
public-domain quote line in the same file.

---

## 3. The four stages

### Stage 1 — licence per item (fail-closed)

Each item is joined to its register row and the licence classified with the gate's
own `classifyLicense`. A missing, copyleft or unrecognised licence **fails the
build**. It is never defaulted, never dropped silently, and never emitted with a
placeholder.

The corpus today is clean at this stage — CNT-07 already proves that — which is the
correct outcome, not a vacuous one: the rules below are proved failing on fixtures.

An item whose register row is marked `DO-NOT-SHIP` is a different case. That is an
editorial decision already on record (the `CODE-JS-P0x` placeholders, whose exact
upstream content was never pinned at a commit), so it becomes an explicit
rejection with a reason, not a build failure.

### Stage 2 — dedupe (report-and-drop)

**Normalisation, stated explicitly** because "duplicate" is otherwise a matter of
opinion:

1. Unicode NFKC, so full-width and compatibility forms compare equal.
2. Every run of whitespace — space, tab, newline — collapsed to one space.
3. Trimmed.
4. Lowercased.

Punctuation is **not** stripped and sentence-final marks are **not** ignored:
`Practice makes perfect.` and `Practice makes perfect` are different typing
strings, and collapsing them would hide a real editorial defect.

**Policy: report-and-drop, keeping the lowest-sorting id of each group.**
Justification: a duplicate is an authoring defect in the source, not a licensing
or safety violation. Blocking the whole corpus over two pairs would mean a user
cannot practise at all because two sentences are the same — a worse outcome than
shipping 738 unique items and telling the author which two to delete. Dropping is
also not lossy in a way that hides anything: the markdown still contains both, and
the artifact's `duplicates` array names the kept id, every dropped id, a
fingerprint and a short excerpt so the finding is reviewable in the diff.

The gate separately re-derives duplicates from the artifact, so a pipeline with
dedupe switched off turns CI red rather than quietly shipping both copies.

### Stage 3 — sensitive filter (blocking, with an allowlist)

Every rule is a blocker. There is no warn tier, because a warn tier is a tier
nobody reads.

| Rule | What it catches |
| --- | --- |
| `provider-api-key` | AWS `AKIA…`, GitHub `ghp_…`/`github_pat_…`, Slack `xox[baprs]-…`, Stripe `sk-…`, Google `AIza…`, GitLab `glpat-…` |
| `jwt` | Three-segment `eyJ…` tokens |
| `private-key-pem` | `-----BEGIN … PRIVATE KEY-----` |
| `bearer-token` | `Bearer <token>` |
| `credential-assignment` | `password = …`, `api_key: …`, `client_secret = …` |
| `email` | Addresses outside RFC 2606 reserved names |
| `url` | `http(s)://` outside RFC 2606 reserved names |
| `ipv4` | Addresses outside RFC 1918 / RFC 5737 space |
| `phone-e164` | `+`-prefixed international numbers |
| `iban` | Mod-97 checksum valid |
| `card-number` | Luhn valid, 13–19 digits |
| `quoted-credential-literal` | A quoted token with ≥3 of {lower, upper, digit, symbol} and both a letter and a digit |

Two precision decisions worth stating, both because the alternative guts the
corpus:

- **A bare national phone number is not a blocker.** A ten-digit group with no
  country code is indistinguishable from a meeting id, an order number or an
  extension, and §6.1 asks for prose with realistic digits. E.164 numbers *are*
  flagged. The corpus has one such string (`PROSE-02-058`, a fictional meeting ID)
  and flagging it would be a false positive that teaches everyone to ignore the
  filter.
- **RFC 2606 / RFC 1918 material is not a leak.** `ops@company.example`,
  `https://example.com/…` and `192.168.1.1` are the *correct* things to put in
  documentation prose, and the corpus contains all three.

Checksums are what make the IBAN and card rules exact rather than
shape-guessing: a 16-digit run that fails Luhn is an order number, not a card.

**The allowlist.** `SENSITIVE_ALLOWLIST` is the explicit mechanism for deliberate
cases. Each entry names one rule and one item id, with a written reason. An entry
for `PROSE-01-013` / `quoted-credential-literal` is therefore *not* an exception for
any other rule on that item, nor for the same shape on any other item — both are
tested. The gate fails if an entry stops matching anything, because a stale
exception is how an allowlist rots into a blanket suppression.

### Stage 4 — tags (closed provisional enum)

The register's `content_type_tag`, normalised to 22 values under
`CONTENT_TYPES`. An unmapped register tag **fails the build** rather than being
invented on the fly, so extending the taxonomy is a reviewed edit. The gate checks
the enum in both directions — no item may use an undeclared value, and no declared
value may go unused — so a tag added and never applied cannot linger.

Resolution order, and the item records which rule fired:

1. `register` — the register's own `content_type_tag`.
2. `id-prefix` — for composition prompts, whose ids encode the category.
3. `declared-length` — for original quotes, banded on the word count the file
   itself declares (short < 12, medium 12–20, long 21–25).
4. `heading` — for files that interleave sub-domains: `PROSE-05` splits news from
   travel by its `## Section A/B` headings, and the original JS snippets file splits
   utility / algorithms / web / React the same way.
5. `file-default` — a stable per-file default for everything left.
6. Nothing → `NO-CONTENT-TYPE`, build fails.

**This taxonomy is provisional.** Register section 5, item 7 is explicit that the
tags were "chosen for readability in this document" and should be aligned with
whatever enum the content-selector schema (§6.6) settles on. The follow-up is to
replace these 22 values with that enum when the selector lands; `CONTENT_TYPES` is
the single list to change, and the gate's enum check will point at every item
affected.

---

## 4. What the artifact deliberately does not contain

- **No timestamp, commit hash or absolute path.** See §1.
- **No font or snippet-spec rows.** `FONT-01/02/04` are binary assets served by
  `apps/web`, and `SPEC-*` rows are generation specs. Neither is typing text.
  `discoverItemIds` never surfaces them because the register does not backtick
  those ids, so no exclusion list is needed to keep them out.
- **No generated content.** Synthetic generators are `packages/generators`
  (CNT-05); this pipeline only ever reads what a human wrote.

---

## 5. Findings

### 5.1 Two duplicate texts — one real defect

| Kept | Dropped | Text |
| --- | --- | --- |
| `QUOTE-PD-005` | `QUOTE-PD-009` | "Well done is better than well said." |
| `CODE-JS-001` | `CODE-JS-002` | `function chunkArray(items, size) { … }` |

Both are genuine authoring defects, not pipeline noise:

- `QUOTE-PD-005` and `QUOTE-PD-009` are the same Franklin line twice, sourced
  differently ("Poor Richard's Almanack, 1737" vs "(general)"). `QUOTE-PD-005` is
  kept because it carries the year.
- `CODE-JS-001` and `CODE-JS-002` are byte-identical. `CODE-JS-001` is the
  lodash-*style* utility from `content-code-snippets-javascript.md`, which the
  register later corrected to "original work — ours"; `CODE-JS-002` is the same
  function again in `content-code-snippets-javascript-original.md`. `CODE-JS-001`
  is kept on lowest-id order.

**Action for a human:** delete `QUOTE-PD-009`, and reconcile `CODE-JS-001` /
`CODE-JS-002` (the original-snippets file's own footer claims "34 original
JavaScript snippets, CODE-JS-002 through CODE-JS-035"; with `CODE-JS-002` dropped
as a duplicate that range yields 33, plus `CODE-JS-001` = 34 unique texts).

### 5.2 Sensitive filter: 1 candidate, hand-checked

Exactly one item tripped a blocker, and it is allowlisted:

| Item | Rule | Match | Verdict |
| --- | --- | --- | --- |
| `PROSE-01-013` | `quoted-credential-literal` | `"Bl4nk3t_47xz"` | **Allowlisted.** Original everyday-domain prose: "The wifi password is posted on a sticky note near the router — it's a mix of numbers and letters, something like 'Bl4nk3t_47xz,'". It unlocks nothing and derives from no real credential; the shape is deliberate typing material (mixed case, digits, underscore). **Flagged for a human hand-check**, because a l33tspeak password is worth replacing with a less secret-shaped string even when fictional. |

Checked by hand and deliberately **not** flagged, each for a stated reason:

| Item | Match | Why not a finding |
| --- | --- | --- |
| `PROSE-02-008` | `ops@company.example` | `.example` is an RFC 2606 reserved TLD; it cannot resolve. This is the address §6.1 asks for. |
| `PROSE-03-005` | `192.168.1.1` | RFC 1918 private space; the default router address, i.e. documentation material. |
| `PROSE-02-058` | `812 4471 0293` | A fictional meeting ID. Phone-*shaped* but not a phone number; see §3. |
| `PROSE-02-018`, `PROSE-05-040`, `PROSE-01-023` | `$3,250.00`, `$412.50`, `$142.87` | Money, not card numbers — and the card rule is Luhn-validated, so these cannot match. |
| `CODE-JS-023/027` | `/api/users/${userId}` | A path template, not a URL. No host, therefore not a real endpoint. |
| All `QUOTE-PD-*` | "Benjamin Franklin", "Aesop's Fables" | Pre-1900 authors, named in attribution metadata only — never in typing text. That is what the sourcing policy requires. |

**No real secret, credential or PII is present in the corpus.** No email address on
a routable domain, no live URL, no public IP, no card, no IBAN, no token, no key.

### 5.3 Declared word counts disagree with the text, in 284 of 300 prose items

Each prose item header declares a word count (`· 24 words`). Only 16 of 300 match
the passage underneath, and the error is not noise — it is systematically positive,
peaking at +3:

| Declared − actual | −3 | −2 | −1 | 0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 | +8 | +9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Items | 1 | 3 | 11 | 16 | 32 | 55 | 67 | 52 | 30 | 23 | 6 | 3 | 1 |

The same pattern holds in `QUOTE-ORIG-*`. The counts look like they were estimated
rather than measured.

**Not a build failure**, deliberately: word count is not a licence, tag, or safety
property, and the spec's own answer to "is this item long enough" is typability
scoring (§6.5), not a hand-written number. The pipeline therefore records both
`declaredWords` and the computed `wordCount` and lets a reader see the divergence.

**Action for a human:** treat the declared counts as unreliable; `wordCount` in the
artifact is computed and is the one to use. Recomputing or deleting the declared
counts is content work, and this pipeline does not edit corpus files.

### 5.4 Nothing is shippable yet, and the artifact says so

`publishBlockers` implements §6.4's gate ("an item cannot go live without a licence
entry, a review decision, and a difficulty tag") as data rather than as an
assumption:

- **407 of 740 items have no difficulty band at all.** Prose and code declare one;
  quotes, composition prompts and word lists do not, and typability scoring (§6.5)
  does not exist yet. Quotes could be banded from their declared word count, but
  that would be inventing the tag §6.4 asks a scoring model for.
- **688 of 740 are not shippable**, because the register marks them `draft` pending
  the second-reviewer 10–20% audit. Only 52 are `reviewed` — the verified
  public-domain quotes, plus `CODE-JS-001` and the full-corpus word list.

This is the corpus's real state, stated plainly instead of implied away. The
pipeline's job here was to load the corpus and prove its provenance, not to declare
it approved.

### 5.5 No copyleft, no banned lineage

Zero items under a copyleft licence, and zero under a Monkeytype/Keybr source.
CNT-07's gate proves this across the markdown; the pipeline re-derives it per item
so the artifact's own `licenseClass` is independently justified.

---

## 6. Commands

```bash
pnpm build:corpus   # regenerate content/corpus.json from docs/
pnpm check:corpus   # gate: drift + invariants (this is what CI runs)
```

`check:corpus` deliberately does **not** regenerate the artifact. It rebuilds from
`docs/` in memory and fails on drift, so running the build first in CI would hide
exactly the staleness the step exists to catch.

## 7. Deferred

| Item | Why |
| --- | --- |
| Typability scoring / real difficulty bands | §6.5, not CNT-01. Needs a frequency list and a syllable method, each with its own licence check. The artifact carries `null` rather than a guess. |
| Final tag taxonomy | §6.6 decides the enum. `CONTENT_TYPES` is the one list to change. |
| Second-reviewer audit | Human work; until it happens most items stay `draft` and unselectable. |
| Word-list pool shape | `word-list` items carry the whole pool as `text`, because the pool *is* the content. When a selector consumes it, it wants a word array, not a string. |
| Zod contract in `packages/schemas` | The corpus shape is declared in `scripts/corpus-pipeline.mjs` today because the builder is plain ESM with no dependency, matching the licence gate. Move it to `@realtype/schemas` when a runtime package first imports the corpus, so there is one contract rather than two. |
| Near-duplicate detection | §6.4 also asks for "near-duplicate removal". Deliberately not implemented: on a corpus of short aphorisms and proverbs, token-overlap similarity flags legitimate siblings, and an over-eager near-dup rule is how a dedupe stage starts deleting good content. Exact-duplicate detection with a stated normalisation is the defensible subset. |