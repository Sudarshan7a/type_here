---
name: cadence-code-content
description: Use when building Cadence's Code Lab and content pipeline — symbol, bracket, number-base, naming-style and operator generators, language-pack snippets, licence checks, difficulty scoring, word lists and quotes. Ensures language-agnostic design, correctness tests and permissive licensing.
---

# Cadence code & content

Read: `docs/spec/07` §5 (Tracks E/F), `05` (F-CODE, F-CONT), `06` §7 and §9, `14` §7.

## Generators (pure, seeded, unit-tested)
- **Brackets:** balanced strings (depth 1–6, mixed types, quotes/escapes). Test: always balanced; closes in correct order.
- **Number systems:** dec/bin/oct/hex with prefixes, byte arrays, masks, IPv4/IPv6/MAC/CIDR, ISO timestamps, semver, `#RRGGBB`. Test: every string parses back to a valid value in its base.
- **Naming styles:** tokenise word pairs → camel/Pascal/snake/SCREAMING/kebab/dot; style-conversion prompts; acronym cases (`HTTPServer`, `userID`). Test round-trips.
- **Operators/idioms:** weighted token bag (`=== !== => -> :: ?. ?? ... <<= >>>`), generics, lambdas.
- Language-agnostic first (Track E), then language packs L1–L5.

## Rules
1. Auto-pair OFF and auto-indent configurable (default off); whitespace and case always exact.
2. Snippets: **permissive licences only** (MIT/Apache-2.0/BSD/ISC/public domain). Store `license`, `source`, `attribution`. Strip secrets, personal data, long URLs. Chunk 30–400 chars (≤40 lines for L3).
3. Score difficulty: symbol density, nesting depth, avg line length, rare-char count; store features.
4. No copyrighted lyrics/quotes; quotes must be public domain.
5. Report **Code WPM** and **Symbol WPM** separately from prose; never mix into prose leaderboards.
6. Provide per-layout symbol maps (Shift/AltGr positions) and show them in drills.

## Workflow
Add generator → property tests → content QA script (licence, length, charset) → wire to Track level config → add to Storybook preview → run `cadence-quality-gate`.
