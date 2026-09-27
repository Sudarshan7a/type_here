---
name: token-drill-generators
description: Rules and specs for the programmer track's seeded drill generators (brackets, operators, strings/escapes, numbers, number systems, IDs, naming styles), token-aware scoring, language skins, and content safety/licensing. Use when implementing levels 1-30, snippet libraries, or any code-typing content.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: PRG-01..PRG-18, section-7
---

## Core idea
Every language is built from the same token classes. Train the classes once (language-agnostic), then apply **skins** (language-specific rendering). Promise "less friction between thoughts and editor", never "better programmer".

## Safety and licensing (non-negotiable)
- Snippets are **display-only**. Never execute user or library code. Sanitize all rendering.
- Generators use **synthetic data only**. No real secrets, tokens, emails, or IPs. Use documentation ranges: IPv4 `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`; IPv6 `2001:db8::/32`; domains `example.com|org|net`.
- Real snippets: permissive licenses only (MIT/Apache/BSD/public domain). Store `source`, `license`, `attribution`. Never copy content from GPL/AGPL projects.

## Generator rules
- **Deterministic:** `generate(tier, level, seed, skin) → text` with a seeded PRNG. Same seed → same output (tests enforce this).
- **Token-aware:** output is tokenized with the skin's grammar (Tree-sitter WASM or a lexer) so every keystroke maps to a token class.
- **Difficulty control:** parameterize by length, class mix, nesting depth, and rare-symbol share. Record parameters in the result for analytics.
- **Weakness weighting:** accept a weakness profile (per symbol/class) and bias sampling toward weak items without producing gibberish.
- **Layout-aware:** symbol sets respect Shift/AltGr availability for the user's layout.

## Tier specs (MVP = tiers 1–6)
| Tier | Content | Key parameters |
|---|---|---|
| 1 Brackets | `() [] {} <>` isolated → with content → nested → mixed | depth 1–4, balance checks |
| 2 Operators | arithmetic, comparison/assignment, logical/bitwise, chords (`=> -> :: ?. ??`) | operator set per level |
| 3 Strings | quote pairs, escapes (`\n \t \\ \"`), templates (`${x}`), regex basics | nesting, escape density |
| 4 Numbers | digits, negatives/decimals, separators, scientific, underscores, indices | magnitude, precision |
| 5 Systems & IDs | hex, binary, octal, colors, bitmasks/shifts, UUID/SHA/base64/IP/CIDR/MAC/ISO dates/semver | base, length, grouping |
| 6 Naming | snake/SCREAMING/camel/Pascal/kebab/dot/namespace; convert-between-styles drills | identifier length, word count |

## Scoring hooks
- Per-token time = first key of the token to its last key; exclude auto-inserted characters.
- Emit per-class speed/accuracy, symbol error rate + confusion pairs, bracket pair latency (tier 1), number-literal accuracy by base (tier 5), naming switch cost (tier 6).
- Level pass = best 3 of last 5 attempts meeting accuracy and Symbol Fluency Ratio targets (adjustable; "almost there" state).

## Tests
- Same seed → identical output; different seeds → different output.
- Property tests: brackets balanced when required; numbers parse in target base; IDs match their format regex; names match the requested style.
- License check: every snippet has `license` in the allowlist.

## Done checklist
- [ ] Deterministic and seeded
- [ ] Token-tagged output
- [ ] Synthetic/allowlisted content only
- [ ] Unit + property tests pass
