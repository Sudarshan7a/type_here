# 06 — Typing Engine Spec (the part that must be perfect)

> If the engine is wrong, nothing else matters. Build it as a **framework-agnostic TypeScript module** (`/packages/engine`) with unit tests; React only renders its state.

## 1. Architecture
```
Input layer (DOM events) → Normaliser → Engine core (pure state machine) → Metrics → Event log
                                              ↓
                                      Renderer (DOM/Canvas) — reads state via rAF, never drives it
```
- **Engine core:** pure functions + a small mutable class; no React, no DOM. Deterministic given an event list (enables replay + tests).
- **Renderer:** updates characters via direct DOM class/attribute writes or a canvas; **never one React state update per keystroke**.

## 2. Input capture
- Use a **visually hidden `<textarea>`/`<input>`** focused at all times (supports mobile keyboards, IME, accessibility, clipboard blocking) + `keydown`/`keyup` for timing + `beforeinput` for text intent.
- Record per key event: `{ t: performance.now()-t0 (μs-ish float), type: 'down'|'up', code, key, shift, alt, ctrl, meta, repeat, isComposing }`.
- **Use `event.code` (physical) for finger/transition analysis; `event.key` (logical) for character correctness.**
- Ignore `repeat` events (held keys) for scoring but log them. Ignore pure modifier presses as characters.
- **Block:** paste, drop, context-menu paste, autofill, autocorrect/spellcheck/autocapitalise (`autocomplete=off autocorrect=off autocapitalize=off spellcheck=false`), IME composition mid-word (handle `compositionend` explicitly for languages that need it; flag mobile).
- Window blur mid-test: pause timer (time mode) with banner, or invalidate if > 3s (configurable) — logged.
- Timestamps: `performance.now()` at handler entry; also store `event.timeStamp`. Keep a ring buffer; flush to IndexedDB on test end (not per key).

## 3. Text model
- Test text is an array of **words** (strings) plus a joiner (space). Typed state: `typed[]` per word, `wordIndex`, `charIndex`.
- Support: extra chars beyond word length (shown red, capped at +10), skipped chars (word advanced early → missing marked), backspace within word, **ctrl/alt+backspace deletes word**, optional **word-level lock** (cannot go back to previous word when `Forced-correct` off).
- Characters are classified `correct | incorrect | extra | missed | pending`.
- Unicode: normalise NFC; treat grapheme clusters as units (use `Intl.Segmenter`) for non-Latin scripts; no case-folding unless setting `caseInsensitive` (default **false** — real typing is case-sensitive).

## 4. Keyboard layouts & finger maps
- Layout JSON: `{ id, name, physical: 'ansi'|'iso'|'jis'|'ortho'|'split', rows: [{ code, base, shift, altgr?, finger, hand, row, col }] }`.
- **Correctness uses layout output char**; **transition analysis uses `code` → finger/row/col** from the *selected layout's physical map*, not the OS layout. Warn if detected OS layout ≠ selected layout (heuristic from `event.key` vs expected `code`).
- Provide default finger maps (standard touch-typing): L pinky `qaz` … R pinky `p;/` + modifiers/Enter/Backspace.
- Transition classes between consecutive keys (K1→K2): `same-key`, `same-finger-different-key (SFB)`, `same-hand-adjacent`, `scissor` (adjacent fingers, row jump ≥2), `row-jump`, `hand-alternation`, `roll-inward`, `roll-outward`, `shift-involved`, `symbol-involved`.

## 5. Metrics — exact formulas
Let `T` = elapsed active seconds (from first keystroke to last char / timer end), `C` = correct characters (including correct spaces), `I` = incorrect chars, `E` = extra, `M` = missed, `U` = uncorrected errors at end, `K` = total keystrokes (down events excl. repeats), `B` = backspaces.
- **Raw WPM** = `(K_chars_typed / 5) / (T/60)` (all typed chars, correct or not).
- **Gross WPM** = `((C + I + E) / 5) / (T/60)`.
- **Net WPM (headline)** = `(C / 5) / (T / 60)` where `C` counts only characters that are correct **in the final text** (a mistake left uncorrected contributes nothing, and a corrected mistake costs the time it took to fix). Never negative.
- **Effective WPM** (optional strict toggle) = `Net WPM × accuracy` — penalises sloppy-but-fast runs. `[Recommendation]`
- **Accuracy** = `correctKeystrokes / totalKeystrokes` where a keystroke is correct if it typed the expected char at that moment (a corrected mistake still counts as an error → honest). Display also **"final accuracy"** (chars correct at end / total chars).
- **Consistency** = `100 − clamp(CV_rawWPMperSecond × 100, 0, 100)` where `CV = σ/μ` over 1-second raw WPM samples (≥ 5s of data) — then mapped with a smoothing curve so typical results land 55–95.
- **Correction cost (ms)** = mean over errors of (time from error keystroke to restored correct state), counting backspaces + retype.
- **Burst WPM** = best 5-second window raw WPM. **Sustained WPM** = median per-10s window.
- **Symbol WPM** = (`correct non-alphanumeric chars`/5)/(symbol-active-time/60) where active time = sum of inter-key gaps ≤ 2s that end on a symbol key. **Number WPM** analogous.
- **Rhythm σ** = standard deviation of inter-key intervals (ms) excluding gaps > 1000ms; **Flow state** = contiguous ≥ 5s windows with interval CV < 0.35 and accuracy ≥ 97%.
- **Per-key stat** (online, EMA): `time_ms` (interval from previous keydown to this correct keydown), `error_rate`, `count`, `lastSeen`. Update rule: `ema = ema + a*(x − ema)` with `a = 0.1` (key) / `0.15` (pair).
- **Look-away time** (transcribe): sum of intervals > 1.5s where `document.hasFocus()` true but no key activity & mouse moved in source pane — heuristic only, label as estimate.
- Always store raw events so any metric can be recomputed when formulas improve (version formulas: `metricsVersion: 1`).

## 6. "Honest WPM" rules
1. Word lists weighted by frequency but **sampled with a difficulty profile** (Warm-up/Standard/Real/Brutal) — see 05 F-TEST-2.
2. Real preset guarantees: ≥15% capitalised tokens, ≥10% tokens containing digits or punctuation, ≥1 non-word proper noun per line, no repeated word within 8 words.
3. Show both **Standard-equivalent WPM** (conversion table from difficulty to a Warm-up baseline, derived empirically from user data — start with simple multipliers 1.00/0.93/0.85/0.72 `[Recommendation — calibrate]`) and the raw number. Never silently inflate.
4. Different difficulty/error-mode/layout/language → separate PB buckets.

## 7. Text generation
- **Word sampler:** sample by Zipf-weighted probability with temperature τ by preset; avoid immediate repeats; seeded PRNG (mulberry32/sfc32) so tests are reproducible via seed (needed for daily challenge, ghost, replay).
- **Adaptive generator:** see 07 §2–§4 (focus key, Markov pseudo-words, real-word filtering by letter set, bigram targeting).
- **Code/symbol generator:** grammar-based generators for brackets (balanced strings), numbers (base-aware random), naming styles (word-pair tokeniser → style transform), operators (weighted tokens), plus curated snippets.
- **Quote/snippet pipeline:** precomputed difficulty features (length, symbol density, rare-char count, avg word length, bigram difficulty score from global model).

## 8. Caret & rendering performance
- Position caret with `transform: translate3d(x,y,0)`; compute `x,y` from cached glyph rects (measure once per word on layout; recompute on resize/font change). No `getBoundingClientRect` per keystroke.
- Smooth caret: interpolate with `transition: transform 80ms var(--ease-caret)` (linear-ish) for inline moves; **line wrap = instant snap + scroll animation 120ms**.
- Render only visible lines (3–5) + buffer; virtualise long texts. Use `contain: layout paint style` on the field.
- Text colouring via class toggles (`.c .i .e .m`) on pre-created spans or a single canvas draw; avoid innerHTML rebuilds.
- Live WPM display updates **at 4–10 Hz**, not per keystroke. Charts render after test, not during.
- Budget: key event → painted pixel p95 **< 16ms** on mid-range laptop; engine step < 0.3 ms.

## 9. Pairing / auto-indent policies (code)
- `autoPair: 'off' (default) | 'on'` — off: typing `(` inserts only `(`. on: inserts `()` with caret between, typing `)` overtypes. Metrics flagged `ide-like`.
- `autoIndent: 'off' | 'on'` — on: Enter inserts matching indent; expected-text diff handles whitespace.
- `tabPolicy: 'tab' | 'spaces2' | 'spaces4'` — Tab key (expected char `\t` or n spaces).
- Newlines: Enter = `\n`; show ⏎ glyph optional; trailing whitespace counted.

## 10. Anti-cheat & validity (leaderboards only)
Client-side hints are never trusted; server re-validates submitted event logs.
- Reject if: paste/drop flagged; intervals < 8ms sustained (> 30% of keys) without roll pattern; perfectly uniform intervals (σ < 3ms over 100 keys); WPM > threshold per percentile without matching burst/consistency profile; replay doesn't reproduce text; seed/text mismatch; tab hidden > 3s.
- Soft-flag → shadow-ban from public boards (still counted privately).
- Rate-limit submissions; sign payload with short-lived server nonce; store `engineVersion`, `metricsVersion`.
- Never accuse in UI; show "Run not eligible for leaderboard" with reason class.

## 11. Mobile
- Use hidden input; accept `beforeinput` insertText; treat swipe/auto-correct inputs as invalid in strict modes (detect multi-char insertions).
- Show persistent "Mobile mode" tag; separate leaderboards/stat buckets. Disable code-lab on mobile by default (offer with warnings).

## 12. Persistence schema (client)
IndexedDB (Dexie) stores: `tests` (summary), `events` (compressed keystroke log, lazy), `keyStats`, `pairStats`, `wordStats`, `settings`, `sessions`, `achievements`, `texts`. Event compression: delta-ms as varint + code index + flags → gzip via CompressionStream.

## 13. Testing requirements (agent must write these)
- Unit tests for: metrics formulas (golden vectors), text model (backspace, extras, word skip), layout mapping, transition classifier, seeded PRNG determinism, replay reproduction.
- Property tests (fast-check): any random event sequence never produces negative WPM, NaN, or out-of-range accuracy.
- Perf test: simulate 15 keys/sec for 120s, assert no frame > 20ms in Playwright trace.
- Cross-browser: Chromium, Firefox, WebKit; Windows/macOS/Linux key code differences (e.g. `IntlBackslash`, `AltGraph`).
