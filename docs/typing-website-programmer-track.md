# RealType — PRD Addendum v0.2: Programmer Track + Completeness Audit

**Extends:** `typing-website-requirements.md` (v0.1) · **Date:** 19 Sep 2026
**Contents:** answer to "does it have all features?", code-typing competitor research, a language-agnostic design, a big idea bank, a 60-level system, programmer analytics, formal requirements, and roadmap updates.

**Legend:** **P0** = MVP · **P1** = V1 · **P2** = later · **[S#]** = source (Appendix) · **[G]** = my assumption/general knowledge · **[H]** = hypothesis to validate · **[vendor]** = source has a commercial interest, treat as unverified.

**Contents**
0. TL;DR
1. Completeness audit (does v0.1 have all features?)
2. How I read your brief + a reality check
3. Competitor research (code typing and adjacent tools)
4. Core concept: language-agnostic token classes + language skins
5. Idea bank (brainstorm, 46 ideas)
6. The 60-level system
7. Progress analytics for programmers
8. Formal requirements (PRG-*, OPS-*)
9. Roadmap update
10. Risks and validation additions
- Appendix: Sources

---

## 0. TL;DR

1. **No, v0.1 doesn't have all features.** It covers the general typing product well, but has **no programmer track at all**, plus ~10 operational/business gaps (onboarding, notifications, billing, legal pages, SEO/help, backups, etc.). Section 1 lists them; Section 8 adds them.
2. **Biggest opportunity found:** real-code typing tools exist (Typing.io, SpeedTyper.dev, SpeedCoder), but none I found train **token classes across languages** (symbols, numbers/number systems, naming styles), measure **editing efficiency**, or connect typing to **syntax recall**. Monkeytype's own community is asking for a real "IDE-style" code mode. [S15]
3. **Core idea:** teach the **"alphabet of programming" (tokens)** first, then **language dialects** as skins. That's how one product can help programmers "regardless of language."
4. **Honest positioning:** I found **no credible evidence** of a universal typing-speed threshold for good programmers, and developers spend most time reading/thinking. [S21] So we should promise **input fluency, syntax recall, and editing efficiency**, *not* "typing makes you a better programmer."
5. **Delivered here:** 46 ideas, a 60-level ladder (12 tiers × 5 levels, each tier ending in a boss), a Programmer Typing Index (PTI) with 12+ programmer-specific metrics, formal requirements, and an updated roadmap.

---

## 1. Completeness Audit — Does v0.1 Have All Features?

### 1.1 What v0.1 covers well
Typing engine, test modes, adaptive learning, analytics basics, content system, competition, anti-cheat, accounts/privacy, accessibility, layouts, mobile/offline, monetization, admin, architecture, KPIs, risks.

### 1.2 What v0.1 covers only partially
| Area | Gap |
|---|---|
| Code typing | Only MOD-03 (code mode) and CNT-04 (snippets). No token-level analytics, no number systems, no naming styles, no editing, no recall |
| Onboarding | Flow sketched in §12 but no requirements |
| Notifications | Only "weekly summary" (ANA-12) |
| Localization | Layouts and content packs covered; UI copy translation process not |
| Testing | NFR-12 exists; no calibration pipeline for the rWPM model |

### 1.3 What v0.1 is missing (new requirement stubs in §8.2)
| ID | Missing item |
|---|---|
| OPS-01 | First-run onboarding & personalization (goal, layout, experience level) |
| OPS-02 | Reminders/notifications (email/push), preferences, quiet hours |
| OPS-03 | Marketing/SEO site, docs, blog, changelog pages |
| OPS-04 | Legal: Terms, Privacy, Cookie consent, DMCA/takedown, content licenses page |
| OPS-05 | Billing system (cards + UPI/regional options), invoices/tax, refunds, regional pricing |
| OPS-06 | Support desk, help center/FAQ, community (Discord/Reddit) and moderation policy |
| OPS-07 | Backups, disaster recovery, incident response, status page |
| OPS-08 | Metric-model versioning and recalculation policy (so old scores stay valid) |
| OPS-09 | Account security: 2FA, session/device management, recovery, abuse handling |
| OPS-10 | Physical keyboard & OS quirks: ANSI vs ISO, Mac vs Windows modifiers, layout auto-detection |

**Bottom line:** general typing product ≈ well specified; **programmer track + ops layer = missing** (added below).

---

## 2. How I Read Your Brief + Reality Check

### 2.1 My interpretation (tell me if I got it wrong)
"Styles, systems and numbers" = things programmers type that ordinary typing sites ignore:
- **Styles:** naming conventions (`snake_case`, `camelCase`, `PascalCase`, `kebab-case`, `SCREAMING_SNAKE`), brace/indent styles, syntax families (C-like, indentation-based, Lisp-like, shell, SQL, markup, config).
- **Systems:** **number systems** (decimal, binary, hex, octal), and also **OS/keymap systems** (Windows/Linux vs macOS shortcuts, path separators).
- **Numbers:** literals (floats, scientific, underscores), IDs (UUIDs, hashes, IPs), bitmasks, indices, timestamps.
- **"Regardless of language":** training that transfers across JavaScript, Java, Python, C++, Go, SQL, etc.

### 2.2 Reality check (important for product honesty)
- Sources I found say typing speed is **not a proven driver of programmer quality**; reading, reasoning, debugging and communication take most time. One writer searched for a credible universal WPM threshold and found none. [S21]
- Several blogs claim code typing is much slower than prose (e.g., ~30% non-letter characters in code vs ~5% in English; code WPM ~30–45 vs prose ~50–65). These are **[vendor]/anecdotal**, but plausible directionally. [S21, S25]
- What typing practice *can* credibly improve: **symbol accuracy, number accuracy, syntax/idiom recall, editing efficiency, low-friction prose (commits, docs, PRs), and comfort.**

**Positioning rule (proposed anti-goal):** never claim that the product makes users "better programmers" or "more hireable." Claim: *"less friction between your thoughts and your editor."*

### 2.3 Pain points specific to programmers
| ID | Pain point | Evidence |
|---|---|---|
| PPD-01 | Monkeytype's code mode uses random programming-related words, not real structured code; users request an IDE-style mode with real code, syntax highlighting, themes, and custom code input | [S15] |
| PPD-02 | Standard tests measure prose; code has dense symbols and no analog in prose | [S21] |
| PPD-03 | Real-code tools use fixed snippets and offer limited analytics; some advanced features are paid | [S17, S13] |
| PPD-04 | Measurement is muddied by editors that auto-insert characters or "smart" quote/dash replacements; a clock reads thinking as slow typing | [S21] |
| PPD-05 | Shortcut trainers teach key combos but not *when* to use them (no triggering situation) | [S22] |
| PPD-06 | Non-US layouts make common symbols awkward (e.g., braces need AltGr on German layouts) and programmers build custom layouts | [S23] |
| PPD-07 | Modern coding involves autocomplete/AI suggestions (Tab/Esc), which pure typing tests ignore | [S25, vendor] |
| PPD-08 | Nobody (that I found) trains number systems, IDs, or naming-style switching as skills | gap [G] |

---

## 3. Competitor Research (Code Typing and Adjacent Tools)

### 3.1 Direct competitors
| Tool | What it does | Strengths | Gaps / complaints |
|---|---|---|---|
| **Typing.io** | Type through real open-source code in many languages (JS, Ruby, C, C++, Java, PHP, Perl, Haskell, Scala…); includes symbols and backspace so WPM is "uninflated" [S17] | Realistic; includes hard keys | Fixed snippets; paid tier for custom practice/stats [S17] |
| **SpeedTyper.dev** | Type snippets from real open-source projects; private race rooms; global leaderboard; MIT-licensed [S16] | Real code, races, open source | Focused on racing/practice, not curriculum or deep analytics (as far as I found) |
| **SpeedCoder** | Source-code typing with a finger-guiding system and WPM/accuracy [S18] | Guided for learners | Dated feel [G]; limited analytics |
| **Monkeytype code mode** | Language-specific word lists inside the normal test [S15] | Fast, free, huge community | Not real structured code; community requesting IDE-style mode [S15] |
| **Speed(t)Code** | Race to type LeetCode-style solutions; real-time lobbies (open source) [S19] | Ties typing to algorithm problems | Small project; no curriculum |
| **DevType / code-type (indie)** | Indie apps: multiple languages/difficulty levels, auto-filled indentation; symbol/keyword/weak-spot drills and heatmaps [S20] | Shows what developers try to build | Early-stage projects |
| **Code-typing pages (OnlineTyping, TheTypingPractice, etc.)** | Drills tracking speed/accuracy separately for letters, numbers, special chars [S21] | Simple symbol focus | Thin content, ad/SEO-driven [G] |
| **TypeQuicker** [vendor] | AI-generated code practice and analytics (bigrams etc.) [S13] | Adaptive | Paid; claims come from its own marketing |

### 3.2 Adjacent competitors (editor skills, layouts)
| Tool | What it does | Gap |
|---|---|---|
| **KeyCombiner** | Shortcut collections (VS Code, Vim, IntelliJ, etc.), spaced repetition, stats; ~$3/mo per one listing [S22] | Trains shortcut *recall*, not typing fluency or editing tasks |
| **ShortcutFoo** | Shortcut drills with spaced repetition for 30+ tools [S22] | Same; "no triggering situation" critique applies to this class [S22] |
| **Layout ecosystem** (Programmer Dvorak, symmetric-bracket QWERTY, AltGr symbol layers, QMK layers) [S23] | People customize layouts to make brackets/symbols easier | No tool trains *your* layout's symbol reach or advises with your code's symbol frequency |
| **Other general trainers** (Klavaro, TIPP10, Keypunch) [S26] | Klavaro is layout-flexible; TIPP10 shows error rate by finger | Not code-aware |

### 3.3 Gap map (what I did **not** find; absence not proven)
1. A **language-agnostic curriculum** organized by token classes (brackets, operators, numbers, naming, whitespace…).
2. **Number-systems** and **ID/address** typing (hex, binary, UUID, CIDR…).
3. **Naming-style switching** as a trained skill.
4. **Edit efficiency** scoring (keystrokes vs par) for code transformations.
5. **Recall/spaced repetition** for syntax and algorithm templates *via typing*.
6. **Per-token analytics** (symbol error matrix, bracket latency, shift/AltGr penalty).
7. **Layout-aware symbol training** (non-US layouts, AltGr, custom keymaps).
8. **Train on your own codebase** locally.
9. **Autocomplete-aware** practice.
10. **Cross-language switching cost** measurement.

---

## 4. Core Concept: Token Classes + Language Skins

**Idea:** every language is built from the same small set of **token classes**. Train the classes once; then apply them to any language.

### 4.1 Universal token classes (the "alphabet")
| # | Class | Examples |
|---|---|---|
| 1 | Brackets & pairs | `() [] {} <>` |
| 2 | Operators | `+ - * / % ** == != === <= >= && \|\| ! & \| ^ ~ << >>` |
| 3 | Multi-char symbols ("chords") | `=> -> :: ?. ?? ... ++ -- += <<=` |
| 4 | Quotes & strings | `' " \`` , escapes `\n \t \\`, templates `${x}` |
| 5 | Numbers | `42 -3.14 1e-9 1_000_000` |
| 6 | Number systems | `0xFF 0b1010 0o755 #FF00AA` |
| 7 | Identifiers by style | `user_id userId UserId user-id USER_ID` |
| 8 | Keywords | `if else for while return async await` |
| 9 | Whitespace & structure | indentation, newlines, blocks |
| 10 | Comments & docs | `// # /* */ """` |
| 11 | Paths, URLs, flags | `./src/app.js`, `--force`, `C:\dir`, `https://…` |
| 12 | Data & markup syntax | JSON, YAML, HTML tags, SQL, regex |

### 4.2 Language skins
A **skin** maps token classes onto a language's real syntax and idioms (JavaScript/TypeScript/JSX, Java, Python, C/C++, C#, Go, Rust, PHP, Ruby, Kotlin, Swift, SQL, Bash, HTML/CSS, YAML/JSON). Tiers 1–7 are mostly language-agnostic; Tier 8+ are skin-specific.

### 4.3 Design rules
- **Token-aware engine:** tokenize snippets (Tree-sitter WASM or a lexer) and time each token class separately. Web bindings for Tree-sitter exist. [S24]
- **Never execute user code.** Snippets are display-only. Any future "mini-kata with tests" runs in a locked-down WASM sandbox (P2, high-risk).
- **Layout-aware:** map symbols to physical keys per layout (including AltGr/Shift layers).
- **Honest measurement:** count auto-inserted characters separately; disable smart quotes/dash replacement; report *active typing* vs *thinking pauses* separately. [S21]
- **Personal + stack-aware:** train on your own stack (e.g., JSX/Express, Spring annotations).

---

## 5. Idea Bank (Brainstorm)

Tags: **[Now]** = programmer MVP · **[Next]** = V1 · **[Later]** = V2+. Value/effort = H/M/L guesses.

### A. Symbols & syntax
- **ID-01 Token-Aware Engine [Now]** — Tokenize every snippet; log per-token timing and errors; separate typed vs auto-inserted characters. *(Foundation for everything else. V:H E:M)*
- **ID-02 Symbol Gym [Now]** — Category drills (brackets, operators, punctuation, "chords" like `=>`, `::`, `?.`), layout-aware, "symbol of the day," symbols weighted by your weakest. *(V:H E:S)*
- **ID-03 Bracket Balance [Now]** — Nested structures with auto-pair OFF / ON / partial simulation; measures open→close latency, imbalance rate, nesting-depth ladder. *(V:H E:M)*
- **ID-04 Chord Trainer [Next]** — Treat multi-char operators as units (`===`, `??=`, `->`), measuring internal key intervals. *(V:M E:S)*
- **ID-05 Regex Gym [Next]** — Typing regex (escape-heavy) with explanations; character-class and quantifier drills. *(V:M E:M)*
- **ID-06 String & Escape Lab [Now]** — Quotes inside quotes, escapes, template literals, JSON string escaping. *(V:M E:S)*

### B. Numbers & number systems
- **ID-07 Number Systems Lab [Now]** — Decimal/float/scientific/underscored literals, hex `0xDEADBEEF`, binary `0b1010_1100`, octal `0o755`, colors `#RRGGBB`. *(V:H E:S)*
- **ID-08 Bit-Twiddle Typing [Next]** — Bitmasks/shifts (`(x >> 3) & 0x1F`); optional "type the result" (e.g., binary for 37) with hints; separates knowing from typing. *(V:M E:M)*
- **ID-09 ID & Address Lab [Now]** — UUIDs, SHA hashes, base64, IPv4/IPv6, CIDR, MAC, ports, ISO-8601 timestamps, semver, Unicode escapes. Deterministic synthetic data (no real secrets). *(V:H E:S)*
- **ID-10 Numeric Data-Entry & Math [Now]** — Numpad vs number row, arithmetic expressions, ranges, array indices, matrices. *(V:M E:S)*
- **ID-11 Encodings [Later]** — ASCII/Unicode escapes (`\u{1F600}`), URL-encoding (`%20`), HTML entities. *(V:L E:S)*

### C. Naming & style
- **ID-12 Naming Style Switcher [Now]** — Convert identifiers between snake/camel/Pascal/kebab/SCREAMING/dot notation; measures **style-switch cost**. *(V:H E:S)*
- **ID-13 Convention Packs [Next]** — Per-ecosystem conventions (Java camelCase methods/PascalCase classes, Python PEP 8, Go exported capitals, Rust snake + SCREAMING consts, CSS kebab/BEM). *(V:M E:M)*
- **ID-14 Style-Guide Drills [Later]** — K&R vs Allman braces, tabs vs spaces, import ordering; "match the linter." *(V:L E:M)*

### D. Structure & realism
- **ID-15 IDE-Realism Mode [Now]** — Multi-line editor view, syntax highlighting on/off (train with and without), monospace fonts/ligatures, indent guides, auto-indent toggle. Directly answers a live Monkeytype request. [S15] *(V:H E:M)*
- **ID-16 Autocomplete-Aware Mode [Next]** — Type a prefix, accept a suggestion with Tab/Enter, dismiss with Esc; scored on *keystroke economy*. Include a "ghost text (AI completion)" simulation. *(V:M E:M)*
- **ID-17 Snippet Expansion Trainer [Later]** — Emmet/VS Code snippets; measures keystrokes saved vs typing in full. *(V:M E:M)*
- **ID-46 Dev Prose Pack [Next]** — Commit messages (Conventional Commits), PR descriptions, README, code-review comments, issue reports. Pure typing time in a developer's day per several sources. [S21] *(V:M E:S)*

### E. Tools, terminal, data formats
- **ID-18 Terminal Mode [Next]** — Fake shell prompt (never executes): git, npm/pip, docker, kubectl, curl, ssh, grep/sed/awk; flags, pipes, redirects, globs, env vars; OS-aware paths. *(V:H E:M)*
- **ID-19 Data-Format Mode [Next]** — JSON/YAML/TOML/CSV/XML/SQL/Markdown/HTML with structure-aware scoring (missing commas/quotes/indent). *(V:M E:M)*
- **ID-20 Config & DevOps Files [Later]** — Dockerfile, CI YAML, Makefile, `.env`, Terraform-style snippets. *(V:M E:M)*

### F. Editing & navigation
- **ID-21 Edit Golf [Next]** — Transform code in a mini-editor with the fewest keystrokes; par score; keymaps: VS Code / JetBrains / Vim / Emacs. Built on an embeddable editor. *(V:H E:L)*
- **ID-22 Situational Shortcuts [Next]** — Task prompts ("move this line up two lines," "rename all occurrences") instead of bare key-combo flashcards, fixing the "no triggering situation" critique. [S22] *(V:H E:M)*
- **ID-23 Vim/Emacs Gym [Later]** — Use an existing browser Vim extension for CodeMirror. [S24] *(V:M E:M)*
- **ID-24 OS Profiles [Now]** — Windows/Linux vs macOS modifiers (Ctrl vs Cmd), path separators (`/` vs `\`), shortcuts adapt. *(V:M E:S)*

### G. Recall & interview
- **ID-25 Type-From-Memory (Recall Mode) [Now]** — Show a snippet for N seconds, hide it, type from memory; spaced-repetition schedule. Turns typing into **syntax retrieval practice.** *(V:H E:M)*
- **ID-26 Template Blitz [Next]** — Timed recall of algorithm/data-structure templates (binary search, BFS/DFS, two pointers, sliding window, union-find, DP skeletons) and SQL patterns (joins, window functions). *(V:H E:M)*
- **ID-27 Bug Hunt (Typo Detective) [Next]** — Code with subtle slips (`=` vs `==`, missing bracket); fix by typing. Trains attention + edit precision. *(V:M E:M)*
- **ID-28 Pseudo-code → Code Sprint [Next]** — Compose from a prompt; report think-time vs type-time and **compile-safe rate** (Tree-sitter parse without errors). *(V:M E:M)*
- **ID-29 Assessment Simulator [Later]** — Online-assessment-style editor (no autocomplete, limited shortcuts); reports what share of time went to typing overhead. Practice only, no cheating features. *(V:M E:M)*

### H. Cross-language
- **ID-30 Polyglot Relay [Next]** — Same algorithm across Python/JS/Java/C++/Go; shows symbol density differences; measures **language-switch cost**. *(V:H E:M)*
- **ID-31 Syntax Families Map [Next]** — C-like, indentation-based, Lisp-like, ML/functional, shell, SQL, markup families; fluency per family. *(V:M E:M)*
- **ID-32 Rosetta Progress [Later]** — Per-language fluency tracker built from token-class scores. *(V:M E:S)*

### I. Personalization
- **ID-33 Train On Your Own Code [Next]** — Drag in a folder/file; **all processing local** (no upload); extract your most frequent tokens/identifiers/patterns; secret-scan before use; ephemeral by default. *(V:H E:M)*
- **ID-34 Stack Packs [Next]** — Curated packs: MERN (Express routes, React components/hooks, Mongoose schemas), Spring Boot (annotations, controllers, JPA), Django/FastAPI, Next.js, Kubernetes YAML, SQL analytics, etc. *(V:H E:M)*
- **ID-35 Community Packs [Later]** — Users create/share moderated, license-checked packs; creator credit. *(V:M E:L)*

### J. Layout & ergonomics
- **ID-36 Layout Lab [Next]** — Non-US layouts (AltGr symbols), Programmer Dvorak, Colemak-DH, symbol layers; import a keymap (JSON). Addresses real complaints about AltGr-heavy braces. [S23] *(V:M E:M)*
- **ID-37 Layout Advisor [Later]** — Estimate finger travel/shift/AltGr load for **your** language's symbol frequency and compare layouts. Estimate only; no medical claims. *(V:M E:L)*
- **ID-38 Ergonomic Load View [Later]** — Pinky/shift/AltGr load %, break nudges. *(V:L E:M)*

### K. Social
- **ID-39 Pair Race / Relay [Later]** — Two devs alternate lines of a snippet. *(V:M E:M)*
- **ID-40 Language Leagues [Later]** — Weekly leagues per language/stack. *(V:M E:M)*
- **ID-41 Bootcamp/Team Mode [Later]** — Cohort dashboards, assigned packs, verified progress. *(V:M E:L)*

### L. Analysis / AI
- **ID-42 Programmer Baseline Test + Re-tests [Now]** — 10-minute profile test at Day 0/30/60. *(V:H E:M)*
- **ID-43 Error Fingerprints [Next]** — Recurring slips (`=`/`==`, `[`/`{`, missed `;`, indentation drift) with plain-language tips. *(V:H E:M)*
- **ID-44 AI Symbol Coach [Later]** — Explains your stats and recommends the next drill; grounded only in your data. *(V:M E:M)*
- **ID-45 Compile-Safe Rate [Next]** — % of typed/composed outputs that parse without syntax errors (tolerant parse). *(V:M E:M)*

### Prioritization at a glance
| Bucket | Ideas |
|---|---|
| **Now (programmer MVP)** | 01, 02, 03, 06, 07, 09, 10, 12, 15, 24, 25, 42 |
| **Next (V1)** | 04, 05, 08, 13, 16, 18, 19, 21, 22, 26, 27, 28, 30, 31, 33, 34, 36, 43, 45, 46 |
| **Later (V2+)** | 11, 14, 17, 20, 23, 29, 32, 35, 37, 38, 39, 40, 41, 44 |

**Best "wow" combo [H]:** *Train On Your Own Code (33) + Stack Packs (34) + Recall Mode (25) + Baseline Retest (42)* → "The typing trainer that learns your stack and shows your progress."

---

## 6. The 60-Level System

**Structure:** 12 tiers × 5 levels. Level 5 of every tier is a **Boss** (mixed test + review of earlier tiers). Placement lets you skip ahead. Each level has **3 stars**: ★ pass, ★★ high accuracy, ★★★ speed target.

### Tier 1 — Brackets & Pairs (L1–5)
- **L1** Single pairs in isolation: `()` `[]` `{}` `<>`
- **L2** Pairs with content: `a[i]`, `f(x)`, `{x}`
- **L3** Nesting depth 2: `f(g(x))`, `a[b[1]]`
- **L4** Mixed nesting and sequences with balance checks
- **L5 Boss — Bracket Gauntlet:** dense code-like nesting

### Tier 2 — Operators & Chords (L6–10)
- **L6** Arithmetic: `+ - * / % **`
- **L7** Comparison & assignment: `== != === <= >= = += -=`
- **L8** Logical & bitwise: `&& || ! & | ^ ~ << >>`
- **L9** Chords: `-> => :: ?. ?? ...`
- **L10 Boss — Operator Soup:** expression-dense lines

### Tier 3 — Quotes, Strings, Escapes (L11–15)
- **L11** `'` `"` `` ` `` pairs and nesting
- **L12** Escapes: `\n \t \\ \"`
- **L13** Templates/interpolation: `${x}`, `f"{x}"`, `"%s"`
- **L14** Regex basics: `\d+ [^a-z] ^$ (?:)`
- **L15 Boss — String & Regex Mix**

### Tier 4 — Numbers I (L16–20)
- **L16** Digit row vs numpad
- **L17** Negatives, decimals, separators
- **L18** Scientific and underscored: `1e-9`, `1_000_000`
- **L19** Expressions and indices: `arr[i + 1]`, `(a*b)/c`
- **L20 Boss — Numeric Data Entry**

### Tier 5 — Number Systems & IDs (L21–25)
- **L21** Hex: `0xFF`, `#FF00AA`
- **L22** Binary/octal: `0b1010`, `0o755`
- **L23** Bitmasks/shifts: `(x >> 3) & 0x1F`
- **L24** IDs & addresses: UUID, SHA, IPv4/IPv6, CIDR, MAC, ports, ISO dates, semver
- **L25 Boss — Number Systems Lab** (with optional conversions)

### Tier 6 — Naming Styles (L26–30)
- **L26** `snake_case`, `SCREAMING_SNAKE`
- **L27** `camelCase`, `PascalCase`
- **L28** `kebab-case`, `dot.notation`, `namespace::path`
- **L29** Convert between styles (rename drills)
- **L30 Boss — Mixed-Convention Codebase**

### Tier 7 — Whitespace, Structure, Blocks (L31–35)
- **L31** Indentation with auto-indent ON
- **L32** Manual indentation (spaces vs tabs)
- **L33** Multi-line blocks and newlines
- **L34** Comments/docstrings: `// # /* */ """`
- **L35 Boss — Full Function/Class** typed with structure

### Tier 8 — Syntax Families (L36–40) *(language skins start here)*
- **L36** C-like (braces, semicolons)
- **L37** Indentation-based (Python/YAML)
- **L38** Markup & styles (HTML/XML/JSX/CSS)
- **L39** Data formats (JSON/YAML/TOML/CSV/SQL)
- **L40 Boss — Polyglot Relay:** same algorithm across families

### Tier 9 — Terminal & Tooling (L41–45)
- **L41** Paths, URLs, flags (OS-aware)
- **L42** git and package managers
- **L43** Pipes, redirects, globs, env vars
- **L44** Containers/cloud CLI-style commands
- **L45 Boss — Command-Line Session**

### Tier 10 — Editing & Navigation (L46–50)
- **L46** Essential shortcuts (copy/paste, undo, select, line ops)
- **L47** Navigation and multi-cursor
- **L48** Refactor moves (rename, extract, move lines)
- **L49** Optional Vim/Emacs keymap track
- **L50 Boss — Edit Golf** (score vs par)

### Tier 11 — Recall & Templates (L51–55)
- **L51** Recall short idioms (loops, conditionals, try/catch)
- **L52** Data-structure/algorithm templates (binary search, BFS/DFS, two pointers, sliding window)
- **L53** Union-find, graph, DP skeletons; SQL patterns
- **L54** Framework boilerplate from **Stack Packs** (e.g., Express route, React component, Spring controller)
- **L55 Boss — Template Blitz** (timed recall set)

### Tier 12 — Composition & Mastery (L56–60)
- **L56** Pseudo-code → code (guided)
- **L57** Bug Hunt (typo detective)
- **L58** Composition sprints (think vs type split)
- **L59** Endurance: mixed 30-minute session
- **L60 Boss — Assessment-Style Capstone** (no autocomplete; report on typing overhead)

### 6.1 Pass rules (proposal, user-adjustable per LRN-05)
Level passes when **best 3 of the last 5** attempts meet all of:
- **Accuracy target** for the level's token class
- **Speed target** = a fraction of **your own prose rWPM baseline** (relative, so it works for everyone). Call this the **Symbol Fluency Ratio (SFR)**.
- Mode-specific checks (e.g., bracket imbalance ≤ N; edit efficiency ≥ X)

| Tiers | Accuracy | SFR target (ramps within tier group) |
|---|---|---|
| 1–3 | ≥ 95% | 0.50 → 0.65 |
| 4–6 | ≥ 96% | 0.60 → 0.75 |
| 7–9 | ≥ 96% | 0.65 → 0.80 |
| 10–12 | mode-specific | Edit efficiency 0.60 → 0.85; first-try recall ≥ 85% |

*All numbers are starting guesses to calibrate with data [H].*

### 6.2 Other level mechanics
- **Placement test:** skip to your level; **test-out** any tier later.
- **"Almost there" state** instead of hard fail (no 39-vs-40 WPM heartbreak).
- **Skill decay + refresh:** if a tier isn't touched for ~30–60 days, its badge dims and a 5-minute refresher appears (spaced repetition).
- **Interleaving:** boss levels include review of earlier tiers.
- **Language skins:** replay any tier in a chosen language pack.
- **Ranks (fun, tunable):** PTI 0–199 *Hello World* · 200–399 *Junior* · 400–599 *Mid-level* · 600–799 *Senior* · 800–899 *Staff* · 900–1000 *Principal*.

---

## 7. Progress Analytics for Programmers

### 7.1 Programmer Baseline Test (10 min, Day 0/30/60)
| Segment | Length | Measures |
|---|---|---|
| Prose | 30 s | Prose rWPM baseline |
| Symbols | 60 s | Symbol speed/accuracy, error matrix |
| Numbers & IDs | 60 s | Number-literal accuracy by base |
| Naming | 60 s | Style accuracy and switch cost |
| Code snippet | 90 s | Token-class mix under realistic structure |
| Recall (optional) | 90 s | First-try recall and latency |

Output: a **Code Skill Profile** (radar) + top 3 fixes + a recommended level path.

### 7.2 Metrics (proposals)
| Metric | Definition | Why |
|---|---|---|
| **Token-class speed & accuracy** | Time and error rate per class (identifiers, keywords, operators, brackets, strings, numbers, comments, whitespace) | Shows *which kind* of code slows you |
| **Symbol Fluency Ratio (SFR)** | Speed on symbol-dense drills ÷ your prose rWPM | Language-agnostic headline |
| **Symbol Error Rate (SER)** + **confusion matrix** | Errors per symbol; which symbols you swap (`=`/`==`, `[`/`{`, `'`/`"`, `-`/`_`, `/`/`\`) | Targets real slips |
| **Bracket Pair Latency (BPL)** | Median time from open to matching close; imbalance rate | Bracket fluency |
| **Shift/AltGr penalty** | Extra ms for characters needing Shift or AltGr vs neutral keys, by hand/finger | Layout/symbol reach cost |
| **Number-literal accuracy by base** | Errors in decimal/hex/binary/octal; digit transposition rate | Number-systems skill |
| **Naming-style switch cost** | Time/error delta when the style changes mid-stream | Cognitive switching |
| **Indentation drift rate** | Indent errors per 100 lines | Structure fluency |
| **Edit Efficiency (EE)** | Par keystrokes ÷ actual keystrokes for edit tasks | Editing skill |
| **Recall accuracy & latency** | First-attempt recall %, time to first keystroke, hint usage, retention curve | Syntax knowledge |
| **Compile-Safe Rate** | % of outputs that parse cleanly (tolerant parse) | Composition quality proxy |
| **Language-switch cost** | Performance drop in the first 60 s after switching language | Polyglot fluency |
| **Think/Type ratio** | Pause time vs active typing in composition sprints; hesitation on rare tokens | Cognitive load signal |
| **Prose (dev) rWPM** | Speed on commit/PR/README text | Everyday friction |

### 7.3 Programmer Typing Index (PTI, 0–1000)
`PTI = 1000 × Σ (weight × normalized dimension score)`. Starting weights **[H]**: Symbols 20% · Numbers/systems 15% · Brackets 10% · Naming 10% · Structure 10% · Tools/CLI 10% · Editing 10% · Recall 10% · Composition 5%.
Publish the formula and version it (see OPS-08).

### 7.4 Views
- **Skill radar** (dimensions above) and **Level Ladder** (60 levels with stars)
- **Keyboard symbol heatmap** including Shift/AltGr layers
- **Token-class heatmap** and **confusion matrix**
- **Trends:** 14/30/90-day lines, rolling averages
- **Language/stack panel:** fluency per skin
- **Next Best Drill:** picks the weakest dimension **weighted by frequency in your chosen language/stack**
- **Weekly report** and **goal ETA**
- **Before/after:** Baseline Test comparisons

### 7.5 Honest measurement rules
- Show **active typing WPM** separately from **session speed** (pauses in composition are the work, not slowness). [S21]
- Count **auto-inserted** characters separately (autopair, snippets, completions). [S21]
- Disable smart quotes/dash replacement and autocorrect in practice fields. [S21]
- Offer a monthly 3-question **friction survey** ("How often does typing slow you down?") to check whether training helps in real life; optional local-only extension data later (EXT-02/03).

---

## 8. Formal Requirements

Same format as v0.1. Idea IDs map to requirement IDs as `PRG-<idea number>` (e.g., ID-07 → PRG-07).

### 8.1 PRG — Programmer track

**Platform**
- **PRG-ENG-01 [P0]** Token-aware engine: tokenize snippets client-side (Tree-sitter WASM or lexer); record per-token timing, errors, class. *AC:* every keystroke maps to a token; results per class available for ≥ 5 languages. *Why:* PPD-02.
- **PRG-ENG-02 [P0]** Track **typed vs auto-inserted** characters; support auto-indent, autopair OFF/ON/partial. *AC:* metrics can be computed with or without auto-inserts. *Why:* PPD-04.
- **PRG-ENG-03 [P0]** Disable smart quotes/dash/capitalization replacement in typing surfaces. *AC:* raw characters preserved.
- **PRG-ENG-04 [P0]** Layout-aware symbol mapping including Shift/AltGr layers; per-layout symbol maps for QWERTY (US/UK), QWERTZ, AZERTY, Dvorak, Colemak-DH. *Why:* PPD-06.
- **PRG-ENG-05 [P1]** Custom keymap import (JSON) and symbol-layer definitions.
- **PRG-ENG-06 [P0]** **Security:** snippets are display-only; sanitize all rendered content; **never execute** user or library code. *AC:* security review passes; no eval paths.

**Curriculum**
- **PRG-CUR-01 [P0]** Implement Tiers 1–6 (Levels 1–30) with boss levels, stars, and pass rules from §6.1. *AC:* pass = best 3 of last 5; user-adjustable thresholds.
- **PRG-CUR-02 [P0]** Programmer **placement test** and **test-out**.
- **PRG-CUR-03 [P1]** Tiers 7–12 (Levels 31–60).
- **PRG-CUR-04 [P1]** Language skins (initial: JS/TS/JSX, Java, Python, SQL, Bash, HTML/CSS; then C/C++, C#, Go, Rust, PHP, Ruby, Kotlin, Swift).
- **PRG-CUR-05 [P1]** Skill decay + 5-min refreshers with spaced repetition.
- **PRG-CUR-06 [P1]** Ranks/titles mapped to PTI.

**Modes (by idea)**
- **PRG-02 [P0] Symbol Gym** — categories, chords, symbol-of-the-day, weakness weighting.
- **PRG-03 [P0] Bracket Balance** — depth ladder; BPL and imbalance metrics.
- **PRG-06 [P0] String & Escape Lab.**
- **PRG-07 [P0] Number Systems Lab** — dec/float/sci/underscore/hex/bin/oct/color literals.
- **PRG-09 [P0] ID & Address Lab** — deterministic synthetic UUID/SHA/base64/IP/CIDR/MAC/ISO/semver; **no real secrets or credentials**.
- **PRG-10 [P0] Numeric Data-Entry & Math.**
- **PRG-12 [P0] Naming Style Switcher** — conversion drills; switch-cost metric.
- **PRG-15 [P0] IDE-Realism Mode** — multi-line editor view; highlighting on/off; fonts/ligatures; indent guides; auto-indent toggle. *Why:* PPD-01.
- **PRG-24 [P0] OS Profiles** — modifiers, paths, shortcuts adapt.
- **PRG-25 [P0] Recall Mode** — hide-and-type; spaced repetition; first-try recall metric.
- **PRG-42 [P0] Baseline Test** — §7.1; results stored for comparison.
- **PRG-04/05/08/13/16/18/19/21/22/26/27/28/30/31/33/34/36/43/45/46 [P1]** — as described in the idea bank.
- **PRG-11/14/17/20/23/29/32/35/37/38/39/40/41/44 [P2]** — as described.

**Analytics**
- **PRG-ANA-01 [P0]** Token-class dashboard, SFR, SER + confusion matrix, keyboard symbol heatmap (incl. Shift/AltGr). *AC:* all computed from token-tagged logs.
- **PRG-ANA-02 [P0]** Level Ladder, Skill Radar, Next Best Drill (frequency-weighted by chosen language/stack).
- **PRG-ANA-03 [P1]** BPL, indentation drift, naming switch cost, language-switch cost, Compile-Safe Rate, Think/Type ratio.
- **PRG-ANA-04 [P1]** PTI with published, versioned formula.
- **PRG-ANA-05 [P1]** Monthly friction survey and before/after comparisons.

**Content**
- **PRG-CNT-01 [P0]** Snippet pipeline: permissive licenses only (MIT/Apache/BSD/public domain), attribution stored, syntax-validated, size-bounded, tagged by language/token mix/difficulty.
- **PRG-CNT-02 [P0]** Generators for numbers/IDs/naming/bracket structures with seeds (reproducible, no real data).
- **PRG-CNT-03 [P1]** Stack Packs (MERN, Spring Boot, Django/FastAPI, Next.js, Kubernetes YAML, SQL analytics).
- **PRG-CNT-04 [P1]** Local-only personal codebase import: no upload, secret scanning, ephemeral by default. *AC:* verified by network inspection tests (no code leaves the browser).
- **PRG-CNT-05 [P2]** Community packs with moderation, license checks, reporting.

**Social/Business**
- **PRG-CMP-01 [P1]** Language/stack leaderboards using code-rWPM and accuracy floor; verified only.
- **PRG-BIZ-01 [P1]** Pro features: deep token analytics, personal codebase drills, unlimited packs, cloud history.
- **PRG-BIZ-02 [P2]** Bootcamp/university cohort dashboards.
- **PRG-POS-01 [P0]** **Positioning guardrail:** marketing/UI copy must not claim improved programming ability or hiring outcomes; claim "input fluency and less friction." *Why:* §2.2.

### 8.2 OPS — Operational gaps found in the audit
- **OPS-01 [P0]** Onboarding: goal (speed/accuracy/coding), experience level, layout, optional programming languages; skippable; results in a starting plan.
- **OPS-02 [P1]** Notifications: reminders, weekly report, streak-freeze notices; per-channel opt-in/out; quiet hours.
- **OPS-03 [P0]** Marketing/SEO pages, docs, blog, changelog, "How we calculate" page.
- **OPS-04 [P0]** Legal pages: Terms, Privacy, Cookies, DMCA/takedown, content-license attributions.
- **OPS-05 [P1]** Billing: cards + UPI/regional methods, invoices/tax, refunds, regional pricing, dunning emails, easy cancel.
- **OPS-06 [P1]** Support desk, FAQ/help center, community channels, moderation policy.
- **OPS-07 [P1]** Backups, restore drills, incident runbook, status page.
- **OPS-08 [P0]** Metric-model versioning (rWPM/PTI): version stamps on every result; recalculation policy; changelog.
- **OPS-09 [P1]** Account security: 2FA, device/session list, recovery, abuse/rate limits.
- **OPS-10 [P0]** Physical keyboard/OS quirks: ANSI vs ISO, Mac vs Windows modifiers, layout auto-detection with manual override.

### 8.3 Tech notes (MERN-friendly)
- **Editor component:** an embeddable editor (e.g., CodeMirror 6) for IDE-realism and Edit Golf; Vim keybindings available as a plugin. [S24]
- **Parsing/tokenizing:** Tree-sitter WASM bindings run in the browser (load per-language grammars lazily). [S24]
- **Keep engine separate:** typing engine remains a framework-agnostic TS library; editor-based modes (Edit Golf, IDE-realism) sit on top.
- **Data:** add `token_stats` (per user × token class × language), `levels` (progress/stars/decay), `recall_items` (SR schedule), `packs` (content + license).
- **Bundle budget:** lazy-load editor, grammars, and Vim plugin so the classic typing page stays light (NFR-02).

---

## 9. Roadmap Update

Adds a **Programmer MVP** slice to v0.1's roadmap.

| Phase | Weeks | Programmer-track deliverables |
|---|---|---|
| **0. Validate** | 0–2 | Interview 10–15 developers/students; landing page + waitlist with 3 hero concepts (Symbol Gym, Number Systems, Train-on-your-code); prototype token-aware engine |
| **1. MVP (P0)** | 3–10 | Core typing product + **PRG-ENG-01…06**, Symbol Gym, Bracket Balance, String Lab, Number Systems, ID Lab, Naming Switcher, IDE-Realism, OS Profiles, Recall Mode (basic), Baseline Test, Levels 1–30, token analytics, Level Ladder |
| **1b. Programmer V1** | 11–18 | Tiers 7–9, terminal & data-format modes, Autocomplete-Aware mode, Stack Packs, personal codebase (local), Error Fingerprints, Polyglot Relay, language skins, PTI |
| **2. Scale** | 19–30 | Edit Golf + Situational Shortcuts, Template Blitz, Compile-Safe Rate, Layout Lab, Dev Prose Pack, leaderboards by stack, Pro, bootcamp mode |
| **3. Later** | 30+ | Assessment Simulator, Vim/Emacs Gym, Layout Advisor, Community Packs, AI Symbol Coach, extensions |

*Estimates assume 1 full-time developer; part-time = multiply by ~2–3.*

**MVP cut rule for this track:** if it doesn't help prove "token-class training + honest analytics helps programmers," it isn't MVP.

---

## 10. Risks and Validation Additions

| Risk | Mitigation |
|---|---|
| **Programmers may not value typing practice** (no proven speed threshold) [S21] | Sell "less friction + syntax fluency"; validate with interviews/waitlist before building levels 31–60 |
| **Over-claiming benefits** | PRG-POS-01 guardrail; publish measurement methods |
| **Code licensing** (GPL etc.) | Permissive licenses only; attribution page; takedown flow |
| **Personal-code privacy / secret leakage** | Local-only processing; secret scanner; ephemeral; no server upload |
| **XSS/injection via snippets or community packs** | Sanitize; CSP; display-only; moderation |
| **Bundle bloat from editor/parsers** | Lazy-load; measure budgets in CI |
| **Token model accuracy across languages** | Start with 5–6 languages; add via grammars; test corpus per language |
| **Scope explosion (46 ideas)** | Strict Now/Next/Later; MVP cut rule |
| **Layout complexity (AltGr/IME)** | Start with 6 layouts; document limits; manual override |

### Extra hypotheses to test
- **H7:** Developers will use token-class drills (Symbol Gym/Number Systems/Naming) weekly for ≥ 4 weeks.
- **H8:** Recall Mode improves first-try syntax recall vs plain copy-typing (A/B).
- **H9:** Users report lower "typing friction" after 30 days (survey) and SER drops (measured).
- **H10:** "Train on your own code" is the top-requested feature in interviews.
- **H11:** Stack Packs drive retention better than generic language packs.
- **H12:** Baseline Retest (Day 30) is motivating and increases conversion to Pro.

---

## Appendix — Sources (new in v0.2; continues v0.1 numbering)

- **[S15]** Monkeytype feature request "IDE-Style Code Practice Mode" (Discussion #7114): https://github.com/monkeytypegame/monkeytype/discussions/7114 · Keyhero forum note on Monkeytype code language lists: https://keyhero.com/practice-typing/typing-practice-for-programers/
- **[S16]** SpeedTyper.dev: https://www.speedtyper.dev/ · https://github.com/codicocodes/speedtyper.dev · Changelog: https://changelog.com/news/speedtyper-type-racing-for-programmers-LW70
- **[S17]** Typing.io: https://typing.io/ · Awesome touch typing list (freemium notes): https://github.com/esteves-esta/awesome-touch-typing
- **[S18]** SpeedCoder: https://www.speedcoder.net/ · AlternativeTo (finger-guiding note): https://alternativeto.net/software/typing-io/?p=3
- **[S19]** Speed(t)Code: https://github.com/imrahnf/speedtcode
- **[S20]** Indie code-typing apps: https://dev.to/mukitaro/in-the-age-of-ai-generated-code-i-built-a-typing-game-to-record-humanitys-peak-typing-speed-3n2l · https://github.com/33b3ziz/code-type
- **[S21]** Programmer typing articles (some by typing-tool vendors; treat claims cautiously): https://www.typingspeedrpg.com/blog/typing-speed-for-programmers/ · https://www.typespeedtest.com/blog/typing-speed-for-programmers/ · https://online-typing.com/practice/code-typing-practice · https://www.thetypingpractice.com/typing-for-programmers · https://keysandtype.com/blog/typing-practice-for-coding/ · https://fastfingers.org/en/stories/programmer-typing/
- **[S22]** Shortcut trainers: https://keycombiner.com/ · https://www.shortcutfoo.com/ · critique of trainers: https://www.augmentedmind.de/2023/03/19/digital-tool-efficiency/ · pricing note: https://alternativeto.net/software/keycombiner/about/
- **[S23]** Layouts/AltGr: https://github.com/renerocksai/real-prog-qwerty · https://www.athoughtabroad.com/2014/01/07/programmer-friendly-german-keyboard-layout-on-gnu-linux · https://github.com/flyfloh/dvorak-german-programmer · https://www.slant.co/topics/512/~best-keyboard-layouts-for-programming
- **[S24]** Tech feasibility: https://github.com/wenkokke/web-tree-sitter (WASM Tree-sitter bindings) · https://github.com/replit/codemirror-vim (Vim keybindings for CodeMirror 6)
- **[S25]** Coder WPM/autocomplete claims [vendor]: https://typingfastest.com/blog/average-coder-typing-speed-how-fast-should-developers-type-2026 · https://typingtestgo.com/guides/programming-typing-speed
- **[S26]** General trainers listing: https://alternativeto.net/software/typing-io

*Notes: vendor claims (e.g., percentages of non-letter characters, average code WPM, RSI statistics) are unverified and I did not rely on them for requirements. All thresholds, weights, and formulas above are proposals to calibrate with real users.*
