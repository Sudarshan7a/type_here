# 11 — Animation & Motion Spec

## 0. Motion philosophy
1. **Motion answers an action** (press, open, confirm, unlock). Non-user-triggered motion is rare and deliberate.
2. **While typing, almost nothing moves** except the caret and character colour. Anything else is a distraction and a perf risk.
3. **One orchestrated moment per screen** (e.g. result reveal), not scattered entrance fades on every section.
4. **Physical metaphors:** keycap travel, detents, ribbons — never bouncy cartoon physics.
5. **Performance first:** animate only `transform` and `opacity` (plus `clip-path`/`filter` sparingly, never on the typing field). Target 60fps (120 on capable displays). A hero animation that dips below 60fps costs more than it earns.

## 1. Tokens (from 09 §7)
Durations: instant 0 · fast 90 · base 160 · slow 280 · slower 480 · hero 900 (ms).
Easings: `out (.2,.8,.2,1)` default for enters · `in-out (.65,0,.35,1)` for moves · `ui-spring (.3,1.4,.4,1)` tiny overshoot for keycaps/toggles · `caret (.4,0,.6,1)`.
Spring config (Motion library): `{ type:"spring", stiffness: 520, damping: 38, mass: .6 }` (UI) · `{ stiffness: 300, damping: 30 }` (panels).
Stagger: 24ms per item, max 8 items, total ≤ 240ms.

## 2. Libraries & when to use them `[Recommendation]`
| Need | Tool |
|---|---|
| UI micro-interactions, layout/shared-element transitions, presence | **Motion** (formerly Framer Motion) `motion/react` |
| Scroll storytelling on marketing/Method pages, complex timelines | **GSAP** + ScrollTrigger (marketing routes only, code-split) |
| Route/theme transitions | **View Transitions API** (progressive enhancement) |
| Simple state transitions | CSS transitions/animations |
| Data viz draw-ins | CSS `stroke-dashoffset` / Canvas rAF |
| Rhythm ribbon, heatmaps | Canvas 2D + rAF |
| Optional 3D keycap hero element (P2) | Three.js/R3F, lazy-loaded, never on `/` |
| Sound | Web Audio API |

## 3. Typing-field animations (critical path)
| Element | Animation | Spec |
|---|---|---|
| Caret move (same line) | translate | `transform 80ms var(--ease-caret)`; off if reduced-motion or user disabled smooth caret |
| Caret idle blink | opacity | 1.06s `steps(1)` infinite, only when idle > 400ms; stops on key |
| Caret on wrap | snap + line scroll | caret snaps; lines scroll up 120ms out |
| Char correct | colour | `color 60ms linear` pending → text |
| Char incorrect | colour + underline | colour 40ms; underline scaleX 0→1 90ms; **no shake** (shake feels punitive and shifts layout) |
| Word complete | none (default) | optional "subtle pulse" on completed word opacity .92→1, 120ms (setting off by default) |
| Extra chars | slide-in | 1px translateX 60ms |
| Chrome fade on typing | opacity | top bar/mode bar/hints → .15 over 200ms out after first key; restore on mouse move/idle 1.2s over 160ms |
| Focus lost overlay | blur+fade | backdrop blur 0→4px, 160ms; removed instantly on focus |
| Timer tick | none | number updates without animation (tabular-nums prevents jitter) |
**Budget:** all of the above must run without layout/paint of anything but the text layer; verify with Chrome Performance panel (no long tasks, no layout thrash).

## 4. Test start & end choreography
- **Start (first keystroke):** chrome fades (200ms), timer/word counter fades in at 160ms, ribbon (if on) begins. No other movement.
- **End → Result reveal (the one orchestrated moment, ≈ 900ms total):**
  1. t=0: typing field crossfades out (140ms) while height collapses to result layout using shared layout transition (no jump).
  2. t=120: **Net WPM count-up** 0 → value over 600ms with `easeOutExpo`; digits tabular, display font, subtle 2px upward settle at end.
  3. t=240: supporting KPIs fade+rise 8px, stagger 40ms.
  4. t=320: **WPM chart draws in** (stroke-dashoffset 600ms out), error dots pop (scale .6→1, 120ms, stagger by x).
  5. t=420: **Cadence Ribbon sweeps in** left→right via clip-path inset 480ms in-out.
  6. t=700: Coach card slides up 12px + fade 220ms; primary button gets focus ring.
  Reduced-motion: instant swap with 120ms opacity fade only; numbers appear final.
- **PB moment:** a thin `--pace` line sweeps under the WPM number (320ms) + tiny keycap "PB" badge pops (ui-spring). No confetti.

## 5. Navigation & layout transitions
- **Route change:** View Transitions: old page fades to .0 (120ms) while new fades in (160ms) with 6px upward translate; shared elements (logo, nav pill) persist. Typing field → Lesson player uses shared-element morph of the field.
- **Top bar active indicator:** shared-layout underline pill slides between items (spring UI).
- **Tabs:** indicator slides; content crossfades 120ms (no slide).
- **Accordion/expand:** height auto animation via `grid-template-rows: 0fr→1fr` 200ms out.
- **Dialog/Sheet:** dialog scale .98→1 + fade 180ms; sheet slides up from bottom 280ms out; backdrop fades 160ms. Exit 120ms (faster than enter).
- **Command palette:** opens with fade+scale .985→1 140ms; list items no stagger (speed matters); highlight follows with 60ms.
- **Toasts:** slide in from bottom-right 8px + fade 160ms; auto-dismiss 4s; pause on hover; swipe to dismiss on mobile.

## 6. Cadence Ribbon (signature)
- **Live:** each keystroke appends a tick: `scaleY 0→1` over 90ms (origin bottom), window scrolls left via `translateX` on a single canvas layer (no DOM per tick). Error tick adds a 2px slip cap with 120ms flash.
- **Result:** sweep-in as in §4. Hover scrub shows a vertical guide and tooltip; guide follows cursor with 60ms ease.
- **Idle shimmer:** none. (The ribbon only moves when you type.)
- **Stats → Rhythm:** averaged ribbon morphs between periods (7d ↔ 30d) with 400ms interpolation of tick heights.

## 7. Learn & virtual keyboard
- **Key press:** `translateY(2px)` + bevel collapse, 70ms in / 110ms out (`ui-spring`). Correct flash: `--flow` at 35% opacity 140ms; wrong flash `--slip` 180ms and expected key outlined for 600ms.
- **Next-key hint:** outline pulse once on target change (scale 1→1.06→1, 320ms), then steady glow (no infinite loop).
- **New key unlocked (the learning moment):** key lifts (translateY −6px, shadow), rotates in 3D −8°→0 (perspective 600px), ring ripple expands once (480ms), keycap label settles; accompanied by soft "thock" if sound on. Max once per level.
- **Level node states:** done → check draws (SVG path 240ms); current → pulse ring once on page enter; locked → no motion.
- **Trail progress line:** fills with `scaleX` when a level completes (480ms).
- **Level complete sheet:** stars fill sequentially 120ms apart with tiny scale ui-spring; XP bar fills 600ms out. No particle effects.
- **Hands overlay:** active finger highlights fade 90ms; non-active 40% opacity.

## 8. Stats & data animations
- **KPI tiles:** number count-up only on first view per session (400ms).
- **Heatmaps:** cells fade in with 1ms/cell index stagger capped at 300ms total (canvas); on metric toggle, colours crossfade 240ms.
- **Charts:** draw-in on first render; on range change, morph path via interpolation 280ms (d3-interpolate path) — skip if points > 2k.
- **Filters:** list items re-sort with FLIP (Motion `layout`), 220ms.

## 9. Micro-interactions catalogue
| Component | Interaction | Spec |
|---|---|---|
| Button | hover tone +4% 90ms; press `translateY(2px)` 70ms; release spring | keycap feel |
| Switch | thumb translate 160ms ui-spring; track colour 120ms | |
| Slider | thumb scale 1.1 on drag; value tooltip fades 90ms | |
| Segmented control | indicator slides spring UI | |
| Theme tile | hover lifts 2px + mini-test caret blinks live | |
| Theme change | circular View Transition reveal from toggle, 480ms in-out | fallback instant |
| Copy button | icon crossfade copy→check 120ms, revert 1.2s | |
| Sound toggle | tiny waveform bars animate 3 loops on enable | |
| Input focus | ring fades in 90ms; label never jumps | |
| Drag (custom theme colours) | swatch scales 1.05, shadow elevates | |
| Delete confirm | button morphs to "Confirm delete" w/ progress outline 2s hold | avoids modal |
| Skeletons | shimmer 1.4s linear infinite (static under reduced motion) | |

## 10. Marketing/Method page scroll motion (GSAP, lazy-loaded)
Use **sparingly**: (a) a pinned "how WPM is measured" scrub where characters fall into counted/uncounted buckets as you scroll; (b) the Cadence Ribbon drawing as you read about rhythm; (c) keyboard heat bloom on Symbols explainer. No parallax, no scroll-jacking, no horizontal hijack. All can be skipped (reduced-motion shows final static state).

## 11. Sound-linked animation
Key sounds trigger in the same `keydown` handler (pre-decoded `AudioBuffer`, round-robin 4–6 variants, ±3% pitch, gain per key class). Visual and audio must land within the same frame; never delay audio for animation.

## 12. Accessibility & user control
- Honour `prefers-reduced-motion`; **also** provide in-app Motion setting: *Full · Reduced · Off* (Off = all non-essential animation removed, caret still moves).
- No flashing > 3 Hz; no large-area flashes.
- Don't convey info through animation alone (pair with text/icon).
- Pause/skip for any animation > 5s (none planned).

## 13. Performance rules (enforced in CI)
- No animation of `width/height/top/left/margin/box-shadow` on frequently updated nodes.
- `will-change: transform` only on caret, ribbon canvas layer, and active virtual key; remove after.
- Long tasks > 50ms during typing fail the e2e perf test.
- Canvas draws batched in a single rAF; cap at 60fps for ribbon.
- Motion/GSAP imported by route (dynamic import); `/` ships < 170KB JS gzipped (budget in 13).

## 14. Motion QA checklist
- [ ] Each animation has a named token duration/easing (no magic numbers)
- [ ] Reduced-motion variant implemented & tested
- [ ] Verified at 60fps on a throttled 4× CPU profile
- [ ] No layout shift (CLS 0) during animation
- [ ] Exit animations faster than enter
- [ ] Nothing animates while the user is mid-word except §3 items
