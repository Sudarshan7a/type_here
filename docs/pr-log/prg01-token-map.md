# pr-log: PRG-01 — token-aware engine (token map + grammar-refinement seam)

- **Task ID:** PRG-01 (implementation-guide M5-01 taxonomy, M5-02 token maps), requirement slice of the programmer track
- **Branch:** `task/prg01-token`
- **Files touched:** `packages/engine/src/token-class.ts`, `language-profiles.ts`, `token-map.ts`, `grammar-refine.ts`, `packages/engine/src/index.ts`, `packages/engine/fixtures/tok01.ts`, `packages/engine/tests/prg01-token-fixtures.test.ts`, `prg01-token-map.test.ts`, `prg01-grammar-refine.test.ts` (9)
- **Dependency changes:** none. `apps/web` gained nothing, so the test-page build is byte-for-byte what it was before.

## Architecture decision — engine vs web

The token map lives in `packages/engine`, and the grammar is reachable only through
an async callback. The reasons, in the order they decided it:

1. **The engine must run in Node.** The server recompute is the authoritative score
   (INT-01). A WASM grammar runtime cannot run there without a second, divergent
   implementation, which is exactly the "the replay disagrees with the live run"
   bug class this repo already pays for elsewhere.
2. **The bundle gate forbids WASM in the web build.**
   `scripts/check-bundle-size.mjs` exits 1 on any `.wasm` under `apps/web/dist`
   (closed as a gate gap in the S4 spike). A `?url` grammar import ships 647 KB raw
   / 79 KB gzip while the JS-only total still passes, which is how the gap was found.
   So adding `web-tree-sitter` to `apps/web` is not a one-line change: it needs the
   grammar fetched from somewhere outside the bundler's graph, and that is a
   Phase-6 decision, not this one.
3. **M5-02 already asks for the fallback.** "If a grammar can't load at runtime, use
   the stored token map" makes the lexical map the primary artefact and the grammar
   an improvement, not a dependency.

Result: `tokenize(text, language)` is pure TS, DOM-free, and the seam
(`refineWithGrammar(map, loader)`) takes a `GrammarLoader` the caller supplies. A
test drives the whole seam with a fake parse, so the contract is proven without a
grammar package in the dependency graph.

## Precedence rules implemented, each with a named test

Comments before operators; strings opaque (digits inside stay Class 4, §9.3.1);
`${`/`}` are Class 4 markers with the interpolated expression getting its own
classes; numbers before identifiers; **keyword-by-position** (`obj.class` is Class 7,
§9.3.2); multi-character operators split into Class 3 vs Class 2 while staying one
span (§9.3.4); angle brackets follow the language; separator punctuation rides with
Class 2 because §7.1 has no punctuation class.

**Regex vs division:** `/` opens a regex literal **iff the previous significant token
cannot end an expression value** — identifier, number, number-system, string, regex,
closing `)`/`]`/`}`, the value keywords (`this` `true` `null` `super` …) and the
postfix `++`/`--`. Two guards keep it safe on partial input: the literal must close
before the newline (otherwise `/` is division), and `[…]` classes plus backslash
escapes are consumed whole. Known limitation, documented in the module header: after
`}` a regex reads as division.

`>=` is Class 2 and `===` is Class 3 — chapter 9 says both (§9.2.1's table lists
`>=` under Class 2; §9.3.4 calls `===` a chord), and the data-driven `chords` list in
the profile is where that split is written down. Both are one span, which is the
property chord-internal timing actually needs.

## Verification

- `pnpm test` → **344 engine tests, 32 files, all pass** (85 new: 25 fixtures +
  rule tests + seam tests). Engine coverage **98.0% stmts / 94.6% branch / 98.2% funcs
  / 99.0% lines**, gate is 85%. New files: `token-class.ts` 100%, `language-profiles.ts`
  100%, `grammar-refine.ts` 100%, `token-map.ts` 99.0%.
- `pnpm lint` exit 0 · `pnpm typecheck` exit 0 · `pnpm format:check` clean ·
  `pnpm build` exit 0 · `pnpm check:bundle` **190.7 KB gzip of 200 KB** (unchanged) ·
  `pnpm check:policies` exit 0 · `pnpm check:licenses` exit 0.
- `pnpm check:ledger` **fails, and it already failed before this branch** (verified by
  stashing the change: the same 3 status counts and 2 missing evidence labels). Not
  introduced here and not fixed here — the fix is a human edit to the ledger's summary
  block or the WAVE 0.12 rows.
- **Mutation check: 28 mutants, 27 killed, 1 survived**, with a no-mutation CONTROL
  that came out green first (a red control voids every other row). The survivor is the
  construction-time `assertTokenMap` call: unreachable from a test, because every map
  the tests build is already correct. That is redundancy, not a test gap — the test-side
  tiling check (`expectTiling`) is what proves the invariant, and M01 (whitespace spans
  skipped) is killed by it.

## Deferred / risks

- `web-tree-sitter` is **not** added to `apps/web`. Loading a real grammar needs a
  fetch path outside the bundler graph; the seam is ready for it and PRG-01 stays
  IN PROGRESS until then.
- Keystroke→token attribution and per-token timing (M5-03, TOK-FIXTURE-001/002/006)
  are not built. `tokenAt(map, index)` is the primitive they need; the metrics
  themselves belong with PRG-11/PRG-14 and the timing layer, and adding them here would
  have meant a `modelVersion` decision this slice has no evidence for.
- TOK-FIXTURE-007 (naming-style switch cost) belongs to PRG-14 and needs
  `M5-01 step 2` naming-style detection, which is not built.
- Not detected, and named on purpose: UUID/SHA/IP/CIDR/semver literals are Class 6 only
  for radix and colour forms (PRG-13 / CNT-05 own the rest); absolute POSIX paths and
  single-dash flags are deliberately *not* distinguished from operators; a regex after
  `}` reads as division. All three are recorded in `TOKEN_CLASS_INFO` notes so ANA-05
  sees them rather than rediscovering them.
- `TokenSpan.index` is a UTF-16 code-unit offset, not a grapheme index. Documented on
  the type; a consumer mapping keystrokes must convert with `segmentGraphemes`. An
  astral character (emoji) is therefore two adjacent spans.