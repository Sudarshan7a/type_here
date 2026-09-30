# Spike S4 — Tokenizer feasibility (Tree-sitter WASM)

## Question

Can a real WASM Tree-sitter runtime plus JavaScript, Python and Java grammars
tokenize code for the programmer track — reproducing the token classes
chapter 9 §9.2.1 predicts — without threatening the typing page's size budget,
and under a permissive licence?

## Method

- `index.html` served by a dependency-free static server (`server.mjs`,
  `node:http`) because WASM cannot be fetched over `file://`.
- The runtime is loaded with a **dynamic** `import()` inside the page — it is
  never in any initial bundle; that is the lazy-load property under test.
- `tokenize.spec.ts` (Playwright, Chromium) parses `if (count >= max) {` with
  the real `tree-sitter-javascript` grammar and compares the token map with the
  chapter's §9.2.1 table, asserting every token's text, order, and character
  positions, plus the node type behind each class.
- `measure.mjs` records raw and gzip sizes of the runtime and each grammar.
  `measure-load.mjs` records per-language load time and parse status.
- Bundle contamination was probed three ways on a throwaway branch (deleted
  afterwards): a static runtime import, a direct `.wasm` import, and the
  realistic `?url` import.

## Result

**PASS for the three MVP languages, with two material findings and one gate gap
closed.** LAB PROXY (headless Chromium, synthetic, localhost — no real device).

### Token map vs the chapter's table — matches

Real grammar output for `if (count >= max) {`:

| # | text | positions | node type | class |
|---|---|---|---|---|
| 1 | `if` | 0–2 | `if` | keyword |
| 2 | `(` | 3–4 | `(` | bracket |
| 3 | `count` | 4–9 | `identifier` | Class 7 identifier |
| 4 | `>=` | 10–12 | `>=` | operator |
| 5 | `max` | 13–16 | `identifier` | Class 7 identifier |
| 6 | `)` | 16–17 | `)` | bracket |
| 7 | `{` | 18–19 | `{` | bracket |

Identical text, order, and positions to chapter 9 §9.2.1.

### Finding 1 — the chapter's example string is not valid code

`if (count >= max) {` has an **unterminated block**, so a real parser reports an
error node (`rootNode.hasError === true`, pinned in the spec). Tree-sitter is
error-tolerant: the token map above is still exactly right, which is the
property the token engine actually depends on. A test re-parses the same line
with the block closed and asserts `hasError === false`, showing the error comes
from the source text, not the setup. The chapter's table is not wrong, but its
example is a fragment; if it is ever used as a real fixture it must be closed
(`if (count >= max) { doThing(); }`).

### Finding 2 — a naive class classifier misclassifies every identifier

The first classifier used `nodeType.includes("if")` to detect keywords. In
Tree-sitter, identifier nodes have node type **`identifier`** — which contains
the substring `if` (id-**if**-ier). Every identifier in the language was
therefore classified as a keyword. Caught by the spike's own assertion that
`count`/`max` map to Class 7. The fixed classifier checks
`nodeType === "identifier"` first and matches keywords against an explicit set;
both behaviours are pinned by tests. This is precisely the kind of silent
misclassification the 12-class mapping cannot afford.

### Finding 3 — the bundle gate did not measure WASM (GAP NOW CLOSED)

- A **static** `import { Parser } from "web-tree-sitter"` is externalised by
  Vite (0.2 KB browser-external shim): the tokenizer does **not** enter the
  initial bundle. Good.
- A **direct** `.wasm` import fails the build outright. Good.
- A **`?url`** import — the natural way to load a grammar — makes Vite copy a
  **647 KB (81 KB gzip)** grammar into `dist/assets/` while the JS-only bundle
  total stayed at 66 KB and **the bundle-size gate passed**.

`scripts/check-bundle-size.mjs` now treats any WASM in the test-page build as a
budget violation (grammars must stay behind lazy imports) and includes `.wasm`
in the size scan. Proven non-vacuous: gate exit 1 with a `.wasm` present in
`dist/assets`, exit 0 without.

### Sizes and licences

| Package | Raw | Gzip | Licence |
|---|---|---|---|
| web-tree-sitter runtime (`tree-sitter.js`) | 151.0 KB | 31.3 KB | MIT |
| web-tree-sitter runtime (`.wasm`) | 204.7 KB | 81.4 KB | MIT |
| tree-sitter-javascript grammar | 632.2 KB | 79.2 KB | Unlicense |
| tree-sitter-python grammar | 464.9 KB | 71.7 KB | Unlicense |
| tree-sitter-java grammar | 420.2 KB | 55.8 KB | Unlicense |
| **Runtime + all three grammars** | — | **351.8 KB** | all permissive |
| **Runtime + ONE grammar (realistic code mode)** | — | **~192 KB** | all permissive |

Load times (LAB PROXY, localhost, warm cache), reproducible across two runs:
javascript 17–23 ms, python 9–16 ms, java 9–12 ms. Also verified loadable:
typescript, rust, go, c, cpp.

Both packages are permissively licensed (MIT and Unlicense — public-domain
dedication), so **no licence blocker**.

### Version pairing (operational risk)

The current `web-tree-sitter` 0.27 refuses the prebuilt grammars
(`need dylink section`). The working combination is **`web-tree-sitter` 0.25.10
+ `tree-sitter-wasms` 0.1.13**. Pinning this pair is required; drifting the
runtime major breaks grammar loading at runtime, not at build time.

## Evidence

- `pnpm --dir spikes/s4-tokenizer exec playwright test` → 2 passed.
- `node measure.mjs` → the size table above.
- `node measure-load.mjs` → per-language load times and parse status.
- Bundle gate proof: exit 1 with `.wasm` in `dist/assets`, exit 0 without.

## Risks / PHASE 0 RISK

1. **PHASE 0 RISK — code mode carries ~192 KB gzip** (runtime + one grammar),
   roughly 1.5× the entire current test-page budget. It is legitimately
   lazy-loadable and off the typing page, but it is a heavy first load for the
   programmer track, and every extra grammar is another 55–80 KB gzip. Ship at
   most one grammar per session, load it once, cache it. **Not** a reason to
   drop Tree-sitter — the alternative (hand-rolled tokenizer) is worse — but it
   must be a deliberate decision, and it must be measured in the field.
2. Grammar/runtime version drift is a runtime-only failure (the build stays
   green). Pin the pair and add a smoke test that loads each shipped grammar.
3. The 12-class mapping must be implemented as an explicit node-type table, not
   substring matching (Finding 2).

## Recommendation

Proceed with Tree-sitter WASM for the programmer track. Pin
`web-tree-sitter@0.25.10` and `tree-sitter-wasms@0.1.13`; load the runtime and
exactly one grammar lazily inside code mode; keep the hardened bundle gate.
Defer nothing on licence grounds. Carry the ~192 KB code-mode load into Phase 6
planning as a known cost to measure, not as a blocker. **No change to the master
spec's language list is proposed or implied.**