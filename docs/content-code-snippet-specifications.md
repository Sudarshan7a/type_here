# Code Snippet Specifications — What to Generate, Not the Code Itself

**Format correction from earlier files:** this file describes **what each snippet should do**, its language, difficulty, and token-class mix — not literal code text. A human writer, an AI content-generation step, or (once built) an automated generator reads this spec and produces the actual code at content-creation time. This keeps the specification reusable across languages (the same behavioral spec can be implemented in JS, Python, or Java) and separates "what we want to teach" from "the literal characters someone types," which is the correct separation of concerns for a content pipeline.

**Why this format is better for this deliverable specifically:** a spec entry takes a few lines and is language-independent; the same 60 specs below could seed 60 JS snippets, 60 Python snippets, and 60 Java snippets — 180 pieces of real content from one table, rather than needing 180 separate hand-written examples.

---

## 1. Utility function specs (12 specs → usable across all 3 languages)

| Spec ID | What it does | Difficulty | Token mix to aim for |
|---|---|---|---|
| SPEC-U01 | Split an array/list into fixed-size chunks | Typical | Brackets, loop, array indexing |
| SPEC-U02 | Clamp a number between a min and max value | Typical | Comparisons, conditionals |
| SPEC-U03 | Debounce a function call by a delay in milliseconds | Hard | Closures/inner functions, timers |
| SPEC-U04 | Format a number as currency with a symbol lookup | Typical | Dictionary/map literal, string formatting |
| SPEC-U05 | Convert a string into a URL-safe "slug" (lowercase, hyphens, no special characters) | Hard | Regex or string replace chains |
| SPEC-U06 | Remove duplicate values from a list, and separately, group items by a key function | Typical | Set/dictionary usage, lambda/arrow functions |
| SPEC-U07 | Fetch a URL with automatic retry on failure, up to N attempts | Hard | Async/await or exception handling, loops |
| SPEC-U08 | Construct a user object from named parameters with sensible defaults | Typical | Named/keyword arguments, default values |
| SPEC-U09 | Check if a number is a power of two, and separately, count its set bits | Hard | Bitwise operators |
| SPEC-U10 | A minimal publish/subscribe event system with `on` and `emit` methods | Typical | Class syntax, arrays/lists of callbacks |
| SPEC-U11 | Deep-flatten a nested list/array of arbitrary depth | Typical | Recursion, type checking |
| SPEC-U12 | A throttle function that limits how often a callback can run | Hard | Timestamps, closures |

## 2. Data structure and algorithm specs (12 specs)

| Spec ID | What it does | Difficulty | Token mix to aim for |
|---|---|---|---|
| SPEC-A01 | Binary search on a sorted array/list | Hard | Comparisons, integer division, loop |
| SPEC-A02 | Quicksort (or another comparison sort) using recursion | Hard | Recursion, list slicing/filtering |
| SPEC-A03 | A singly linked list with an append operation | Typical | Class/struct definitions, pointer/reference fields |
| SPEC-A04 | An LRU (least-recently-used) cache with get/put operations | Hard | Map/dictionary, class methods |
| SPEC-A05 | Breadth-first search over a graph represented as an adjacency map | Hard | Queue usage, sets, loops |
| SPEC-A06 | Check whether a string is a palindrome using two pointers | Typical | Index arithmetic, comparisons |
| SPEC-A07 | Maximum sum of any contiguous subarray of fixed size (sliding window) | Hard | Loop with running sum, array indexing |
| SPEC-A08 | Check whether a string's brackets are balanced, using a stack | Typical | Stack/list as stack, dictionary lookups |
| SPEC-A09 | Fibonacci with memoization | Hard | Recursion, dictionary/map caching |
| SPEC-A10 | Merge two sorted lists into one sorted list | Typical | Two-pointer technique, comparisons |
| SPEC-A11 | Find the first non-repeating character in a string | Typical | Dictionary/map counting, iteration |
| SPEC-A12 | Reverse a linked list in place | Hard | Pointer/reference manipulation, loop |

## 3. Web/application-layer specs (10 specs, JS/Python-flavored; Java gets a server-side equivalent set in §4)

| Spec ID | What it does | Difficulty | Token mix to aim for |
|---|---|---|---|
| SPEC-W01 | Render a list of items into markup/output using string interpolation | Typical | Template strings, loops |
| SPEC-W02 | Fetch a user profile and safely handle missing nested fields with defaults | Hard | Optional chaining or dict.get patterns |
| SPEC-W03 | Validate a form's email field on submit, with a basic format check | Typical | Conditionals, string methods |
| SPEC-W04 | A counter closure exposing increment/decrement/reset functions | Hard | Closures, returned object of functions |
| SPEC-W05 | Filter a list of users to active ones and return just their names, sorted | Typical | Filter/map/sort chain |
| SPEC-W06 | Load three independent resources concurrently and combine the results | Hard | Concurrency primitives (Promise.all / asyncio.gather / CompletableFuture) |
| SPEC-W07 | Save and load a settings object to/from persistent local storage as JSON | Typical | Serialization calls, dictionary access |
| SPEC-W08 | Parse command-line-style arguments into a structured options object | Hard | String splitting, dictionary building |
| SPEC-W09 | A simple in-memory rate limiter keyed by client ID | Hard | Dictionary of timestamps, comparisons |
| SPEC-W10 | Paginate a list given a page number and page size | Typical | Arithmetic, slicing |

## 4. Language-specific flavor additions

**JavaScript/TypeScript only (6 specs, since these are idiomatic to the language):**
| Spec ID | What it does | Difficulty |
|---|---|---|
| SPEC-JS01 | A React counter component with a button that increments state | Hard |
| SPEC-JS02 | A React component that conditionally renders a badge based on online status | Hard |
| SPEC-JS03 | A React component that fetches and displays a profile on mount (useEffect) | Hard |
| SPEC-JS04 | A React list component rendering items with keys and a click handler | Hard |
| SPEC-JS05 | A custom React hook that debounces a changing value | Hard |
| SPEC-JS06 | A reusable Button component that spreads extra props and supports a variant | Hard |

**Python only (6 specs):**
| Spec ID | What it does | Difficulty |
|---|---|---|
| SPEC-PY01 | A context manager for timing a block of code using `with` | Hard |
| SPEC-PY02 | A decorator that logs function call arguments and return value | Hard |
| SPEC-PY03 | A generator function that yields Fibonacci numbers lazily | Hard |
| SPEC-PY04 | A dataclass representing a user with type hints and a default field | Typical |
| SPEC-PY05 | List comprehension vs. equivalent loop for filtering and transforming a list | Typical |
| SPEC-PY06 | A simple CLI argument parser using `argparse`-style patterns | Hard |

**Java only (6 specs):**
| Spec ID | What it does | Difficulty |
|---|---|---|
| SPEC-JV01 | A generic `Stack<T>` class with push/pop/peek methods | Hard |
| SPEC-JV02 | A simple interface and two classes implementing it (polymorphism example) | Typical |
| SPEC-JV03 | A try-with-resources block reading a file line by line | Hard |
| SPEC-JV04 | A builder-pattern class for constructing a configuration object | Hard |
| SPEC-JV05 | A stream pipeline filtering and mapping a list of objects | Hard |
| SPEC-JV06 | A basic custom exception class and a try/catch block using it | Typical |

---

## 5. How this feeds the content pipeline

1. **Pick a spec** (e.g., SPEC-A04, "LRU cache").
2. **Pick a language** (JS, Python, or Java).
3. **A human writer or AI content step writes the actual idiomatic code** for that language, following the difficulty and token-mix guidance.
4. **Run it through the standard content QA checklist** (`content-brief-and-audit.md`): syntax validation via the real language grammar, no secrets/PII, license = original work.
5. **Tag with the resulting real token-class mix** (computed, not guessed, once the tokenizer pipeline exists) and file into the register.

**Total specs delivered: 40 core specs (usable across 3 languages = up to 120 potential snippets) + 18 language-specific specs = 58 specs, capable of seeding well over 100 total snippets once written out per-language** — this is a far more scalable deliverable than hand-writing every literal snippet, and correctly separates "what to teach" (this file) from "the exact characters typed" (a later, language-specific writing step).

## Register entry

| Field | Value |
|---|---|
| type | code-snippet-specification (not code itself) |
| license | original work — ours |
| status | ready for use as a content-generation input |
| coverage | 40 language-agnostic specs + 18 language-specific specs (JS×6, Python×6, Java×6) |
