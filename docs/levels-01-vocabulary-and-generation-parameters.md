# Programmer Track — Vocabulary Lists and Base Data (Tiers 1–6 Generator Inputs)

**Purpose:** the literal input data the seeded generators (per `token-drill-generators` skill and Implementation Guide §10) consume to produce Level 1–30 content. Without this file, "seeded, deterministic generators" is a specification with no actual seed data to run on. This file **is** that data.

**How this fits the pipeline:** a generator function takes `(tier, level, seed, skin)` and produces text. The **vocabulary and parameter tables below are the fixed inputs** a real implementation reads from; the seed only controls *which* combination gets picked and in *what order*, not the underlying word/symbol universe itself.

---

## 1. Naming-vocabulary word bank (feeds Tier 6, Levels 26–30)

**Sourcing:** original, written for this product — generic technical/domain nouns and verbs common across programming contexts, chosen to be realistic without being tied to any specific real codebase (avoiding any copyright/trademark question entirely, unlike code snippets). License: `original work — ours`.

**Structure:** words are stored in their base (lowercase, single-word or natural-multi-word) form; the **naming-style transformer** (a real piece of code the engine needs, not just data) converts a base phrase into the target style at generation time. The table below gives the base phrases; the transformation rules follow in §1.2.

### 1.1 Base vocabulary (120 phrases, organized by domain so drills can be domain-flavored)

**Domain: data/collections (20)**
`user list`, `order queue`, `item cache`, `session token`, `record count`, `batch size`, `page number`, `sort order`, `filter set`, `result map`, `input buffer`, `output stream`, `error log`, `event queue`, `task list`, `config map`, `field name`, `row index`, `column count`, `table name`

**Domain: actions/verbs (20)**
`fetch data`, `save file`, `load config`, `parse input`, `validate form`, `send request`, `handle error`, `update state`, `delete item`, `create user`, `close connection`, `open socket`, `read stream`, `write buffer`, `check status`, `retry request`, `cancel task`, `refresh token`, `build query`, `render view`

**Domain: web/API (20)**
`api key`, `auth token`, `request header`, `response body`, `status code`, `base url`, `query param`, `path segment`, `client id`, `server port`, `route handler`, `middleware chain`, `cors policy`, `rate limit`, `webhook url`, `session id`, `cookie value`, `header field`, `content type`, `payload size`

**Domain: database (20)**
`primary key`, `foreign key`, `table schema`, `index name`, `query plan`, `join clause`, `where clause`, `select statement`, `insert batch`, `update record`, `delete row`, `transaction id`, `connection pool`, `migration file`, `seed data`, `backup file`, `replica set`, `shard key`, `cache ttl`, `lock timeout`

**Domain: UI/frontend (20)**
`button label`, `form field`, `input value`, `modal title`, `nav bar`, `side panel`, `card layout`, `grid column`, `theme color`, `font size`, `icon name`, `tooltip text`, `dropdown option`, `checkbox state`, `radio group`, `tab index`, `scroll position`, `viewport width`, `click handler`, `hover state`

**Domain: general/abstract (20)**
`max retry`, `min value`, `default flag`, `is valid`, `has error`, `total count`, `current page`, `next item`, `previous state`, `temp value`, `final result`, `base amount`, `raw data`, `parsed value`, `cached result`, `pending task`, `active user`, `disabled flag`, `hidden field`, `visible count`

### 1.2 Naming-style transformation rules (applied to any base phrase above)

Given a base phrase of N words (e.g., `user list`, 2 words), each style transforms it as follows:

| Style | Rule | Worked example: `user list` | Worked example: `max retry` | Worked example: `has error` (3-word test: `error log entry`) |
|---|---|---|---|---|
| **snake_case** | Lowercase, words joined by underscore | `user_list` | `max_retry` | `error_log_entry` |
| **SCREAMING_SNAKE_CASE** | Uppercase, words joined by underscore | `USER_LIST` | `MAX_RETRY` | `ERROR_LOG_ENTRY` |
| **camelCase** | First word lowercase, subsequent words capitalized, no separator | `userList` | `maxRetry` | `errorLogEntry` |
| **PascalCase** | Every word capitalized, no separator | `UserList` | `MaxRetry` | `ErrorLogEntry` |
| **kebab-case** | Lowercase, words joined by hyphen | `user-list` | `max-retry` | `error-log-entry` |
| **dot.notation** | Lowercase, words joined by period (for namespacing/config-key drills) | `user.list` | `max.retry` | `error.log.entry` |
| **namespace::path** (for languages using this form) | Lowercase, words joined by double-colon | `user::list` | `max::retry` | `error::log::entry` |

**Implementation note:** this transformation is a **pure function** with zero ambiguity given the rules above — an AI implementing the naming-style generator should write this as its own small, independently-testable module, since Tier 6's entire pass/fail correctness (the "conversion correctness" check from the master spec's Tier 6 table) depends on this transform being exactly right. **Test fixture:** run all 120 base phrases through all 7 styles = 840 expected outputs; this is a fully enumerable, exhaustively-checkable test, not a sampled one — there is no excuse for this transform ever being wrong on a specific case, since the whole input/output space is small enough to test completely.

### 1.3 Level-specific vocabulary subsets (which phrases appear at which level)

| Level | Vocabulary subset used | Style(s) drilled |
|---|---|---|
| 26 | All 120 phrases, 1–2 word phrases only (drop the 3-word test cases) | snake_case, SCREAMING_SNAKE_CASE |
| 27 | Same 120 phrases | camelCase, PascalCase |
| 28 | Same 120 phrases, plus the 3-word extended set (see §1.4) | kebab-case, dot.notation, namespace::path |
| 29 (convert-between-styles drill) | Random phrase + random source style + random target style, drawn from all of the above | Conversion drill: shown in style A, must be typed in style B |
| 30 Boss (Mixed-Convention Codebase) | All phrases, all styles, style changes every 3–5 items (switch-cost measurement) | All 7 styles, interleaved |

### 1.4 Extended 3-word phrases for higher-density drills (30 additional phrases, used at Level 28+)

`total active user count`, `max concurrent request limit`, `default page size value`, `primary database connection pool`, `client side cache entry`, `server response status code`, `user session expiry time`, `form field validation error`, `api rate limit window`, `background job retry count`, `initial page load time`, `last modified timestamp field`, `current authenticated user id`, `pending email notification queue`, `shared component style override`, `remote data fetch timeout`, `local storage cache key`, `global error boundary handler`, `nested route path segment`, `dynamic import chunk name`, `test suite coverage report`, `build output directory path`, `environment variable config value`, `feature flag toggle state`, `third party dependency version`, `internal api gateway route`, `public asset file path`, `webhook signature verification key`, `scheduled task cron expression`, `multi factor auth code`

---

## 2. Bracket and pair generation parameters (feeds Tier 1, Levels 1–5)

**Not vocabulary — literal structural parameters.** The generator produces sequences by combinatorially nesting these symbol pairs according to the depth/mix rules per level.

### 2.1 The bracket symbol set

| Bracket type | Opening | Closing | Common use context to imply (for in-context variant, §2.4) |
|---|---|---|---|
| Round/parenthesis | `(` | `)` | Function calls, grouping |
| Square | `[` | `]` | Array/list indexing |
| Curly | `{` | `}` | Blocks, objects |
| Angle | `<` | `>` | Generics/type parameters (used sparingly — angle brackets double as comparison operators, so the generator must disambiguate context, see note below) |

**Important disambiguation note for the generator:** `<` and `>` are also comparison operators (Tier 2). At Tier 1, only use them in unambiguous "pair" contexts (i.e., always immediately followed by matching content and a closing `>` in the same short sequence) so the drill is clearly about pairing, not confusable with an operator drill. Tier 2's operator drills should generally avoid angle brackets entirely to prevent cross-tier confusion in the user's mental model.

### 2.2 Level-by-level structural parameters

| Level | Max nesting depth | Bracket types allowed | Content between brackets | Sequence length (characters, target) | Worked sample output |
|---|---|---|---|---|---|
| 1 | 1 (no nesting) | One type per drill set (round only, then square only, then curly only, presented in separate short blocks) | Nothing (just the pair, isolated) | 15–20 chars per line | `() () () () ()` then `[] [] [] [] []` then `{} {} {} {} {}` |
| 2 | 1 | Round, square, curly, mixed within a line | Single short token (1–3 chars) | 20–30 chars | `(a) [1] {x} (bb) [22]` |
| 3 | 2 | Round, square, curly | Short tokens, one level of nesting | 25–35 chars | `(a[1]) [b(2)] {c[3]}` |
| 4 | 3 | All types, mixed | Short tokens or another bracket pair | 30–45 chars | `([a{1}]) {[b(2)]} (a[b{c}])` |
| 5 Boss | 2–4 (varied within the set) | All types | Realistic short code-like fragments (variable-looking tokens, not just single letters) | 40–60 chars per line, 5–8 lines per boss set | See §2.3 |

### 2.3 Worked Level 5 (Bracket Gauntlet boss) sample output — full worked example

```
list[items[0]]
result = fn(a, b, c)
data = {key: [1, 2, 3]}
config[section]["value"]
outer(inner(deep(x)))
map = {a: (1, 2), b: [3, 4]}
arr[func(x, y)]
obj = {list: [fn(1)], val: (2, 3)}
```

**Property test derived directly from this sample:** every line above has exactly balanced brackets (verify this by counting: line 1 has 2 opens, 2 closes; line 2 has 1 open, 1 close; etc. — a generator bug that produces an unbalanced line would fail this specific, hand-verified fixture immediately). **Imbalance-rate metric worked example:** if a user types line 5 (`outer(inner(deep(x)))`) as `outer(inner(deep(x))` (missing the final closing paren), that's exactly 1 unmatched bracket out of 3 pairs in that line = an imbalance rate of 33% for that line, contributing to the session's overall imbalance-rate metric.

### 2.4 In-context variant (used starting at Level 4, blended with abstract drills)

Instead of purely abstract bracket sequences, wrap the same structural complexity in code-flavored tokens drawn from the vocabulary bank in §1: e.g., a depth-2 nesting drill becomes `fetchData(userList[0])` instead of `(a[1])` — same bracket structure and difficulty, more realistic feel. **Generation rule:** take the structural pattern for the target level (from §2.2), then substitute vocabulary-bank phrases (converted to camelCase per §1.2, since this is the most common in-context style) for the abstract placeholder tokens.

---

## 3. Operator generation parameters (feeds Tier 2, Levels 6–10)

### 3.1 The operator sets by level

| Level | Operator set (exact symbols) | Example expressions (worked, 5 samples) |
|---|---|---|
| 6 (arithmetic) | `+` `-` `*` `/` `%` `**` | `a + b`, `total - fee`, `x * y * z`, `count / total`, `n % 2`, `base ** 2` |
| 7 (comparison/assignment) | `==` `!=` `===` `!==` `<=` `>=` `=` `+=` `-=` | `x == y`, `a != b`, `total === expected`, `count <= max`, `value >= min`, `x = 5`, `total += tax`, `count -= 1` |
| 8 (logical/bitwise) | `&&` `\|\|` `!` `&` `\|` `^` `~` `<<` `>>` | `a && b`, `isValid \|\| hasDefault`, `!ready`, `flags & mask`, `a \| b`, `x ^ y`, `~value`, `n << 2`, `n >> 1` |
| 9 (chords/multi-char) | `=>` `->` `::` `?.` `??` `...` `++` `--` `<<=` | `x => x + 1`, `Type::method`, `user?.name`, `value ?? fallback`, `...rest`, `i++`, `count--`, `flags <<= 1` |
| 10 Boss (mixed) | All of the above, combined in realistic short expressions | See §3.2 |

### 3.2 Worked Level 10 (Operator Soup boss) sample output

```
total = (price * quantity) - discount
isValid = count > 0 && count <= max
result = data?.items ?? []
next = current + step >= limit ? 0 : current + step
flags |= (1 << position)
values = [...base, extra]
callback = (x) => x * 2 + offset
ratio = (a / b) * 100
```

**Note on the ternary operator (`?` `:`) appearing in the boss sample:** this is a legitimate Tier 2/Tier 10-boss addition not explicitly listed in the level-by-level operator sets above — flagging this as a **gap to formally add to Level 9 or 10's operator set** (the ternary is common enough in real code that omitting it from the operator vocabulary while including it in the boss sample is an inconsistency; the fix is to add `? :` explicitly to Level 9's chord list before implementation, which this document is now flagging rather than silently leaving unresolved).

---

## 4. Strings and escapes generation parameters (feeds Tier 3, Levels 11–15)

### 4.1 Quote and escape character sets

| Level | Characters/sequences drilled | Worked examples |
|---|---|---|
| 11 (quote pairs) | `'` `"` `` ` `` (single, double, backtick), simple nesting | `'hello'`, `"world"`, `` `template` ``, `"it's fine"` (double containing apostrophe), `'she said "hi"'` (single containing double) |
| 12 (escapes) | `\n` `\t` `\\` `\"` `\'` | `"line1\nline2"`, `"col1\tcol2"`, `"path\\to\\file"`, `"she said \"hi\""`, `'it\'s fine'` |
| 13 (interpolation) | `${...}` (template literals), `{}` (format strings), `%s` `%d` (printf-style) | `` `Hello, ${name}!` ``, `"Total: {total}"`, `"Count: %d items"`, `` `${a} + ${b} = ${a + b}` `` |
| 14 (regex basics) | `\d+` `[^a-z]` `^$` `(?:...)` `*` `+` `?` | `\d+` (one or more digits), `[^a-z]` (not lowercase letter), `^start` (anchor), `end$` (anchor), `(?:abc)` (non-capturing group), `a*` `a+` `a?` |
| 15 Boss (mixed) | All of the above combined | See §4.2 |

### 4.2 Worked Level 15 (String & Regex Mix boss) sample output

```
const greeting = `Hello, ${user.name}!`;
const pattern = /^\d{3}-\d{4}$/;
const path = "C:\\Users\\data\\file.txt";
const msg = 'It\'s ready at %d:00';
const clean = value.replace(/[^a-zA-Z0-9]/g, '');
const log = `[${timestamp}] ${level}: ${message}`;
```

---

## 5. Number and number-system generation parameters (feeds Tiers 4–5, Levels 16–25)

### 5.1 Tier 4 (Levels 16–20) numeric formats

| Level | Format | Generation rule | Worked examples (5 each) |
|---|---|---|---|
| 16 | Plain integers, digit-row vs numpad context | Random integers, 1–5 digits | `7`, `42`, `183`, `2947`, `58301` |
| 17 | Negatives, decimals, thousands separators | Add sign, decimal point, or comma grouping | `-15`, `3.14`, `1,000`, `-0.5`, `42,500` |
| 18 | Scientific notation, underscored literals | Exponent form or underscore grouping | `1e-9`, `6.022e23`, `1_000_000`, `2.5e10`, `100_000_000` |
| 19 | Expressions and indices | Numbers inside arithmetic or array-index expressions | `arr[3]`, `(a + 5) * 2`, `total[i - 1]`, `values[0] + values[1]`, `(x * 100) / 3` |
| 20 Boss | Mixed numeric data entry | Combine all of the above in a short realistic data-entry-style block | See §5.2 |

### 5.2 Worked Level 20 (Numeric Data Entry boss) sample output

```
price = 19.99
quantity = 3
subtotal = price * quantity
tax_rate = 0.0825
total = subtotal * (1 + tax_rate)
discount = -5.00
final = total + discount
item_count = 1_250
```

### 5.3 Tier 5 (Levels 21–25) number systems and synthetic IDs

**Hard rule restated: all IDs below are synthetically generated, using documentation-only ranges. Never real credentials, real IPs outside documentation ranges, or real-looking secrets.**

| Level | Format | Generation rule | Worked examples (5 each) |
|---|---|---|---|
| 21 (hex) | Hex literals, color codes | `0x` prefix + random hex digits, or `#` + 6 hex digits | `0xFF`, `0x1A2B`, `0xDEADBEEF` (a real, commonly-used placeholder hex value, safe to reuse), `#FF00AA`, `#3C3C3C` |
| 22 (binary/octal) | Binary/octal literals with grouping | `0b` or `0o` prefix + digits, optional underscore grouping | `0b1010`, `0b1010_1100`, `0o755`, `0o17`, `0b11111111` |
| 23 (bitmasks/shifts) | Expressions combining hex/binary with shift/mask operators | Combine Tier 5 literals with Tier 2 bitwise operators | `(x >> 3) & 0x1F`, `flags \| 0b0100`, `mask << 2`, `value & 0xFF`, `(a \| b) & ~c` |
| 24 (IDs and addresses) | Synthetic UUIDs, hashes, IPs (doc ranges only), MACs, ports, ISO dates, semver | See generation rules below | See worked list below |
| 25 Boss | Mixed number-systems lab | All of the above | See §5.4 |

**Level 24 generation rules (exact, so a generator can implement them deterministically):**
- **UUID:** 8-4-4-4-12 hex digit groups, e.g. pattern `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` — random hex per position from a seeded PRNG. Worked example: `a1b2c3d4-e5f6-4a3b-9c8d-1234567890ab`
- **SHA-like hash:** 40 or 64 random hex characters (SHA-1-length or SHA-256-length, purely for visual/typing realism, not cryptographically meaningful). Worked example (shortened for display, real one would be full length): `9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e`
- **Base64-like string:** random selection from `A-Za-z0-9+/` characters, padded with `=` as needed, length a multiple of 4. Worked example: `SGVsbG8gV29ybGQh`
- **IPv4 (documentation range only):** always drawn from `192.0.2.0/24`, `198.51.100.0/24`, or `203.0.113.0/24` — worked examples: `192.0.2.15`, `198.51.100.203`, `203.0.113.44`
- **IPv6 (documentation range only):** always drawn from `2001:db8::/32` — worked example: `2001:db8::1a2b:3c4d`
- **CIDR notation:** IP (from above ranges) + `/` + a prefix length (8–32) — worked example: `192.0.2.0/24`
- **MAC-style address:** 6 groups of 2 hex digits joined by colons, using a documentation-style prefix (e.g., starting `02:` to indicate a locally-administered, clearly-non-real address) — worked example: `02:1A:2B:3C:4D:5E`
- **Port number:** random integer 1024–65535 (avoiding well-known ports under 1024 to sidestep any appearance of targeting a real service) — worked examples: `8080`, `3000`, `27017`, `5432`, `49152`
- **ISO-8601 date/time:** `YYYY-MM-DDTHH:MM:SSZ` format, random valid date/time — worked example: `2026-03-14T09:30:00Z`
- **Semantic version:** `MAJOR.MINOR.PATCH` random small integers — worked example: `4.2.1`

### 5.4 Worked Level 25 (Number Systems Lab boss) sample output

```
color = #3C82F6
mask = 0b1111_0000
perms = 0o644
addr = 192.0.2.15/24
id = a1b2c3d4-e5f6-4a3b-9c8d-1234567890ab
version = 4.2.1
port = 8080
timestamp = 2026-03-14T09:30:00Z
flags = (state & 0xFF) | 0b0001
```

---

## 6. Generation determinism — the seeding contract (applies to every table above)

**Formal contract for the implementation:** `generate(tier, level, seed, skin) -> text`. Given the exact same four inputs, the output MUST be byte-for-byte identical every time, forever (or until the generator's version is explicitly bumped, at which point old seeds may produce different output and that's an accepted, documented break — versioned like the metrics model in Chapter 4).

**Worked determinism test:** `generate(tier=1, level=2, seed=42, skin="javascript")` should always return the exact same string — e.g., if the first run with seed 42 produces `(a) [1] {x} (bb) [22]`, then the 1,000th run with the same seed must produce that exact same string, not a "similar" one. **Test name:** `GEN-DETERMINISM-001` — run the same `(tier, level, seed, skin)` tuple 100 times, assert all 100 outputs are identical.

**Worked variety test:** `generate(tier=1, level=2, seed=1, skin="javascript")` and `generate(tier=1, level=2, seed=2, skin="javascript")` should almost always differ (not guaranteed to always differ for every possible seed pair, since a small output space could theoretically collide, but should differ with high probability across many seed pairs). **Test name:** `GEN-VARIETY-001` — generate with 500 different seeds, assert fewer than 1% exact-duplicate outputs.

## 7. What's still needed beyond this file (honest scope note)

This file gives the **word banks, symbol sets, and parameter tables** — the raw material. It does **not** give the actual generator source code (per this project's no-code policy) and does not give literal pre-generated content for all 30 levels × many possible seeds (that would require actually running a generator, which doesn't exist as code yet — this file is what such a generator would be built and tested against). The worked sample outputs throughout (§2.3, §3.2, §4.2, §5.2, §5.4) exist specifically so an implementer has a **concrete correctness target** for each boss level before writing the generator, exactly mirroring how Chapter 4's worked fixtures gave the metrics engine concrete correctness targets before implementation.
