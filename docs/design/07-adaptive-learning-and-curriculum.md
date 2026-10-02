# 07 — Adaptive Learning & Curriculum

## 1. Philosophy
- Learn **keys → pairs → words → text → context (code/real-world)**, but never wait for perfection: interleave (spaced + mixed practice beats blocked practice).
- Practice should sit at the **edge of ability** (target ~92–97% accuracy). Too easy = no learning; too hard = bad habits.
- Slow, accurate, then fast. Accuracy gates come before speed gates.
- Measure **per-key and per-transition** performance; use them to *generate* the next text.

## 2. Per-key model (Keybr-style foundation, extended)
For each key `k` (physical code + modifier state, e.g. `KeyA`, `Shift+KeyA`, `Digit1`, `Shift+Digit1`):
```
speed_ms[k]   EMA of interval (prev keydown → this correct keydown), outliers > 2000ms clipped
error[k]      EMA of error rate (0..1), a=0.1
n[k]          count;  lastSeen[k]  timestamp
wpm_k         = 12000 / speed_ms[k]          // 60000ms / (5 chars) per word... = 12000/ms
confidence[k] = clamp( wpm_k / targetWPM , 0, 1.2 ) * (1 − min(error[k]*4, 0.6)) * recencyFactor
recencyFactor = 1 − min(daysSince(lastSeen)/30, 0.3)   // gentle decay → spaced review
unlocked      = confidence[k] ≥ 1.0 for all keys currently in the active set
```
- **targetWPM** per track: Foundations 25→35, Fluency 40→60, Symbols 25→35 (symbols are slower by nature), Numbers 35→50, Code 30→45. User-adjustable (±).
- **Focus key** = lowest `confidence` among active keys; appears in ≥ 60% of generated words.
- **Weakness score** (for drills): `w[k] = (1 − confidence[k]) * freqWeight[k]^0.5` where `freqWeight` = frequency of the key in the target domain (English / code corpus).

## 3. Transition model (our upgrade over key-only trainers)
For each ordered pair `(a→b)`: `ms[a→b]` EMA, `err[a→b]`, `n`, class (see 06 §4).
- **Excess cost** `x[a→b] = ms[a→b] − expected(a→b)` where `expected` = predicted from `speed_ms[b]` + class baseline (alternation fastest, SFB slowest). Fit baselines from the user's own data once ≥ 2k keystrokes, until then use priors (SFB +60ms, scissor +45ms, row-jump +30ms, alternation −10ms) `[Recommendation — tune]`.
- **Impact** `= freq(a→b in target text) × max(0, x[a→b])`. Drill the top-N impact pairs.
- **Trigrams:** same idea for top 200 frequent trigrams (`ing`, `the`, `ion`, `str`, and code trigrams `()`, `=>`, `[i]`, `!==`).
- **Pair drill generator:** choose target pairs → find real words containing them (from word list, ≤ 1.5 target pairs/word) → if insufficient, pseudo-words via Markov with pair boosting → mix 70% targeted / 30% general.

## 4. Text generators (adaptive)
1. **Real-word mode (default for Real preset):** filter word list to letters in active set; weight by `Σ w[k]` of its keys + pair impact; sample with temperature.
2. **Pseudo-word mode (Foundations):** phonetic Markov chain (order-3) trained on English words restricted to active letters; guarantee focus key in word; avoid real-word repeats; max length 3–8.
3. **Mixed mode:** 50/50.
4. **Domain generators:** symbols, numbers, bases, brackets, naming styles use grammar generators (06 §7) and mix in prior-level content (**interleaving 30%**).
5. **Constraints:** no >2 identical consecutive words, no more than 3 consecutive words sharing the focus pair, seed logged.

## 5. Curriculum — Tracks & Levels (≈ 150 levels at launch target; 80 minimum viable)
Each level: **id, title, new keys, gates (speed, accuracy), step plan (5 steps × 30–90s), est. time, content generator config**.
Gates are **speed AND accuracy over the last 2 passes**. Failing a gate three times offers "easier variant" or "skip with placement".

### Track A — Foundations (26 levels)
1. Home row index (`f j`) → `d k` → `s l` → `a ;` → `g h` (levels 1–5)
2. Top row: `e i` → `r u` → `t y` → `w o` → `q p` (6–10)
3. Bottom row: `v m` → `c ,` → `x .` → `z /` → `b n` (11–15)
4. Space, Shift & capitals (left shift for right-hand letters and vice versa) (16–18)
5. Enter, Backspace use (backspace is *taught*: correct mistakes fast) (19)
6. Full alphabet fluency (words from ~30 letters sets) (20–26)
Targets 25→35 WPM, accuracy ≥ 95%. Hands overlay + virtual keyboard on; level 20+ introduces "keyboard hidden" steps.
**Layout-aware:** the *same* progression is generated per layout using a "most-frequent-letters first, home-row-prioritised" ordering for that layout (not QWERTY positions).

### Track B — Fluency (24 levels)
Common words top-100 → 500 → 1000 → 5000; bigram/trigram packs (`th er in an re on`…, `ing tion ent ould`); doubled letters; word-rhythm phrases; speed gates 40→60 WPM; sentence typing; capital/punctuation in sentences.

### Track C — Symbols & Numbers (32 levels)
Numbers row (`1–0`) in 5 pairs; numpad optional; Shift-numbers `! @ # $ % ^ & * ( )`; punctuation `, . ; : ' " ? !`; dash/underscore/slash family `- _ / \ |`; brackets `() [] {} <>`; math/ops `+ = * ^ ~`; AltGr symbols for ISO layouts (`€ @ { } [ ] \` as per layout); mixed alphanumeric tokens (`a1b2`, `x7_k9`); currency/percent/decimals; dates/times; phone/IDs. Targets 25→35 (symbols) / 35→50 (numbers).

### Track D — Real-World Prose (16 levels)
Mixed-case sentences with names; numerals in text; quotes/apostrophes/dashes; abbreviations; emails & addresses; long-form paragraphs; fatigue sessions; no-autocorrect discipline; transcription with look-away tracking. Gates 45→65 WPM @ 96%+.

### Track E — Programmer Core (language-agnostic, 40 levels) ★ differentiator
| Block | Levels | Content |
|---|---|---|
| E1 Symbol fluency | 1–8 | single symbols in isolation → pairs → triples; symbol-after-letter and letter-after-symbol transitions; shift-heavy sequences (`{`,`}`,`|`,`~`,`_`,`+`) |
| E2 Brackets & nesting | 9–14 | balanced strings depth 1→6, mixed bracket types, with quotes/escapes; "close in the right order" scoring |
| E3 Operators & idioms | 15–22 | `=== !== <= >= && || ?? ?. :: -> => ++ -- += <<= >>>`, spread/rest, ternary, generics, lambdas, pointers `*p->x`, references `&` |
| E4 Number systems | 23–30 | decimal ↔ binary ↔ octal ↔ hex strings (4→32 digits), prefixes `0b 0o 0x`, byte arrays `[0xDE, 0xAD]`, bit masks, IPv4/IPv6/MAC/CIDR, timestamps (ISO-8601), semver, UUID prefix, colour codes `#1A2B3C`/`rgb()` |
| E5 Naming styles | 31–35 | style-specific word runs; **style conversion typing** (see `parse_http_header` → type `parseHttpHeader`); acronym handling (`HTTPServer`, `userID`) |
| E6 Whitespace & structure | 36–38 | indentation (tab/2/4), newlines, trailing commas, line-continuation `\`, comment markers `// # /* */ <!-- -->`, string/escape sequences `\n \t \\ \"` |
| E7 Mixed micro-snippets | 39–40 | one-liners from many languages (language-agnostic order) |
Targets 30→45 Code WPM; accuracy ≥ 96% (code punishes errors). Auto-pair **off** by default.

### Track F — Language Packs (graded, per language)
For each language: **L1 keywords & core syntax** → **L2 stdlib idioms** → **L3 real snippets (≤ 40 lines)** → **L4 whole-function typing** → **L5 mini programs**.
Launch languages (priority for placements/SDE interviews): **JavaScript/TypeScript, Python, Java, SQL, Shell/Bash, C/C++** → then Go, Rust, C#, Kotlin, PHP, Ruby, Swift.
Framework micro-packs (P2): React/JSX, Spring annotations `@Autowired`, Express routes, Mongo queries, Dockerfile/YAML, regex.
Each snippet record: `{ id, language, license, source, attribution, text, difficulty, symbolDensity, avgLineLen, tags[] }`.

### Track G — Speed & Endurance (ongoing, 20 gates)
Speed bands 40/50/60/70/80/90/100/110/120+ WPM (prose), 30/40/50/60+ Code WPM; 5/10/20/30-min endurance gates with decay tolerance (< 8% drop).

## 6. Placement test (3 min)
Stages (45s each, adaptive difficulty): prose (Real preset) → numbers/dates → symbols → code snippet. Output: starting level per track, top-3 weaknesses, recommended weekly plan. Retake anytime; **never reduces existing progress**.

## 7. Spaced review & interleaving
- Daily plan: 20% warm-up (known keys), 50% targeted weakness (focus keys/pairs), 20% new/stretch, 10% real-world context.
- Keys not practiced in 14+ days get a **recency boost** in generation (`recencyFactor`).
- Lessons after completion are remixed as **review steps** inside later levels (30% rule).

## 8. Level completion & rewards
- Stars: ★ gate met · ★★ gate +10% speed and ≥ 97% acc · ★★★ gate +20% speed and ≥ 98%.
- XP: `minutes × (0.5 + accuracyFactor + consistencyFactor)`, capped per day (healthy) — details in 05 F-GAM.
- Level-complete sheet: shows **new skill gained** (e.g., "You can now type hex bytes at 38 WPM"), next-up preview.

## 9. Analytics hooks the curriculum needs (log these events)
`lesson_started, step_completed, gate_failed, gate_passed, level_skipped_by_placement, drill_started, drill_completed, coach_recommendation_shown, coach_recommendation_accepted, plan_completed`.

## 10. Content production checklist (for the agent / human)
- [ ] Word lists (en 1k/5k/20k, names, tech) + licences noted
- [ ] Quote set (public domain)
- [ ] Code snippet corpus per language (≥ 150 each at launch, licence-checked)
- [ ] Symbol/number/bracket/naming generators with unit tests
- [ ] Per-layout level generators validated against letter-frequency orderings
- [ ] Difficulty scoring script + calibration with real users
