# packages/engine

The framework-agnostic typing engine and metrics library, shared by the web client and the API server. All metric formulas live here and only here (`AGENTS.md` rule 3). Any formula change requires bumping `modelVersion` and updating `/how-we-calculate`. Licensed MIT (see LICENSE). Tests: the named fixture catalogs from `docs/chapter-4-deep-dive-typing-engine-part*.md` (40 `ENG-*` scenarios), and later `WM-*`, `TOK-*`, and `INT-*` catalogs, must exist as real automated tests.
