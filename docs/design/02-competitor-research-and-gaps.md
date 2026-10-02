# 02 — Competitor Research & Gap Analysis

## Sources reviewed
- Monkeytype docs/FAQ/features: https://www.mintlify.com/monkeytypegame/monkeytype/features · repo https://github.com/monkeytypegame/monkeytype
- Keybr adaptive approach (phonetic Markov words, per-key speed, focus key, progressive alphabet): descriptions via keybr-tui https://docs.rs/crate/keybr-tui/0.2.0 and Keystrike https://github.com/egno/keystrike
- TypeQuicker vs Keybr (bigram/trigram, code, hand focus): https://lincoln.typequicker.com/compare/keybr
- typing.io (programmers, real open-source code, includes backspace, no auto-pairing): https://typing.io/
- SpeedCoder (code lessons, finger guide, natural vs forced-correction mode, heatmap, race): https://speedcoder.net/
- typing.io alternatives (Klavaro, Keypunch, TypingClub, Typitron, TypingMaster…): https://alternativeto.net/software/typing-io
- Awwwards criteria guides (Design 40 / Usability 30 / Creativity 20 / Content 10): https://www.hontran.dev/blog/awwwards-judging-criteria
> Re-verify competitor details before marketing claims; products change.

## Competitor snapshots
### Monkeytype — the test benchmark
**Strengths:** minimal UI, instant start, many test modes (time/words/quote/zen/custom), punctuation+numbers toggles, huge theme library (400+ per docs) + custom 10-colour themes, smooth caret, live WPM/acc, 40+ "funbox" modifiers (including symbol/hex/ASCII variants, layout mirror), account stats, leaderboards, open source, self-hostable.
**Weaknesses (our gaps):** it is a *test* not a *tutor* (no curriculum); default word lists are easy; limited diagnostic depth (no transition model/recommendations); code/number practice exists as funbox gimmicks not a structured path; settings sprawl; no guided "what next".

### Keybr — the adaptive tutor
**Strengths:** adaptive lessons, progressive alphabet (few letters first, add as you reach target speed), per-key speed tracking, focus key (weakest) appears more, pronounceable pseudo-words from phonetic Markov chains, clean UI, multiple layouts, profile/heatmap.
**Weaknesses:** models single keys, not transitions; pseudo-words feel unnatural for real work; limited code/symbol practice; ads/premium wall; less polished visual/motion design.

### TypeQuicker — AI-flavoured adaptive
**Strengths (per its own comparison page):** models bigrams/trigrams, hand focus, code mode, problem-word workflow, symbol tests. **Gaps:** closed, marketing-led claims to verify; visual design generic; no deep curriculum for symbols/number bases.

### typing.io — programmer pioneer
**Strengths:** real open-source code, includes backspace (uninflated WPM), refuses auto-paired braces (deliberate: typing `{}` together then arrow-keying is slower), many languages. **Gaps:** dated UI, limited adaptivity/analytics, language-bound rather than concept-bound.

### SpeedCoder
**Strengths:** finger guidance overlay, natural vs forced-correction modes, custom code, mistake heatmap, multiplayer code race. **Gaps:** ad-supported feel, limited curriculum depth, visual polish.

### TypingClub / Typing.com / Ratatype (tutors)
**Strengths:** structured lessons, videos, school adoption, stars/progress. **Gaps:** slow pacing, childish tone, stop at alphabet+basic punctuation, little real-world content, shallow analytics.

### Others to skim during build
Klavaro, Keypunch, Typitron (common letter pairs), TypeRacer (racing/ads), 10FastFingers (quick tests, dated), Nitro Type (gamified racing), ZType (action game), Typing of the Dead, Type Lighter, keyboard-layout trainers.

## Gap → Feature map (what we build to win)
| Gap | Our answer | Spec ref |
|-----|------------|----------|
| Easy words inflate WPM | Real-World word pools: rare words, names, mixed case, numerics, punctuation density controls; "Honest WPM" | 05 F-TEST, 06 §6 |
| No transition model | Bigram/trigram/finger-transition engine | 07 §3 |
| Symbols/numbers/bases ignored | Programmer Track: Symbols Lab, Number Systems, Brackets, Naming Styles | 07 §5, 05 F-CODE |
| WPM only | Diagnostics Lab + recommendations | 05 F-STATS |
| Auto-paired braces hide cost | Pairing policy toggle: default **no auto-close** (typing.io-style), optional "IDE-like" | 06 §9 |
| Backspace hidden | Correction cost metric; modes: Natural / Stop-on-error / Forced-correct | 06 §5 |
| Settings sprawl | Progressive disclosure: Presets → Advanced | 12 §6 |
| Generic visuals | Distinct design language + signature "Cadence Ribbon" + motion system | 08, 11 |
| Data lock-in | Local-first + export | 14 |
| No "what next" | Coach card with ranked next actions | 05 F-COACH |

## UX lessons to steal (verified patterns)
1. Start typing instantly; focus the input automatically (Monkeytype).
2. Chrome fades while typing; returns on pause/end (Monkeytype "focus").
3. Progressive alphabet unlocks keys only when speed+accuracy gates met (Keybr).
4. Weakest-key "focus" frequency bias (Keybr).
5. Real code with real backspace counted (typing.io).
6. Natural vs forced-correction modes (SpeedCoder).
7. Per-key mistake heatmap after each lesson (SpeedCoder).
8. Adaptive mode disables backspace so mistakes remain in the record (Keystrike) → we offer as an option.

## Anti-patterns to avoid
Modal on first load · login walls before first test · full-page ads in practice · confetti on every action · streak-loss guilt notifications · layout shift while typing · lag > 1 frame · fake leaderboards · unexplained scores · tiny low-contrast untyped text · colour-only error indication.
