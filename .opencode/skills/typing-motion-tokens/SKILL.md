---
name: typing-motion-tokens
description: Motion rules and tokens (durations, easing, what may and may not animate, reduced-motion policy, microinteraction catalog) for the typing app. Use when adding any animation, transition, celebration, or page/route motion.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: CUS-01, A11Y-01, ENG-02
---

## The one rule
**Typing input must never wait for an animation.** The typing surface has *no decorative motion*: only the caret (transform) and instant color/underline state changes. Everything else (results, level map, dashboard, toasts, routes) may animate within the budget below.

## Starting tokens (tune by testing; these are proposals)
```css
:root {
  --dur-instant: 0ms;
  --dur-fast: 120ms;      /* hovers, toggles, small state changes */
  --dur-base: 200ms;      /* cards, tabs, popovers */
  --dur-slow: 320ms;      /* route/section transitions */
  --dur-emphasis: 480ms;  /* rare: level pass, streak */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* entrances, most UI */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* on-screen moves */
}
```
Springs (Motion): `{ type: "spring", stiffness: 400, damping: 30 }` for small, interactive elements.

## Rules
1. Animate **`transform` and `opacity` only**. Never animate width/height/top/left/margin.
2. Entrances use ease-out; exits are faster than entrances (~60–70% of duration).
3. Stagger ≤ 30 ms per item, ≤ 300 ms total.
4. Ask "should this animate at all?" High-frequency interactions (typing, restart, tab switching) get little or no motion.
5. Celebrations (level pass, streak) run once, ≤ 800 ms, are skippable, and never flash more than 3 times per second.
6. Ambient/looping motion lasts ≤ 5 s or has a pause control.
7. Use `m` + `LazyMotion` (not `motion`) to keep the initial bundle small; use `MotionConfig reducedMotion="user"`.
8. For values that change every frame or keystroke, use motion values / refs so React does not re-render.

## Reduced motion (WCAG 2.3.3 AAA is our goal; 2.2.2 is required)
- Honor OS `prefers-reduced-motion` in **CSS and JS**, plus an in-app "Reduce motion" toggle that persists.
- Replace movement with a short opacity/color change (≤ 150 ms); **do not remove feedback entirely**.
- Opacity and color changes are not "motion animation" under WCAG; slides, scales, parallax, and zoom are.
- Test with DevTools "Emulate prefers-reduced-motion: reduce" on every animated screen.

## Microinteraction catalog (Trigger → Feedback → Duration → Reduced-motion alt)
| Element | Trigger | Feedback | Duration | Reduced |
|---|---|---|---|---|
| Char state | keystroke | color/underline (no motion) | 0 ms | same |
| Caret | keystroke | translate to next char | ≤ 80 ms or instant | instant |
| Restart | Tab | fade text out/in | 120 ms | instant |
| Results reveal | test end | fade + 8 px rise, stagger 30 ms | 200–320 ms | fade only |
| Speed graph draw | results mount | draw-on line | 480 ms | no draw |
| Level node unlock | pass | scale 0.96→1 + glow | 480 ms | fade |
| Star award | pass | pop + fade | 320 ms | fade |
| Streak tick | day complete | number roll | 320 ms | instant |
| Toast | event | slide-up/fade | 200 ms in, 140 ms out | fade |
| Route change | navigate | fade/slide 8 px | 200 ms | instant |
| Skeleton | loading | subtle shimmer (≤ 1.5 s loop) | loop | static |
| Button press | pointer down | scale 0.98 | 120 ms | none |

## Review checklist (`/anim-audit`)
- [ ] Only transform/opacity animate
- [ ] No animation in the typing surface beyond caret
- [ ] Durations/easings come from tokens
- [ ] Exit faster than enter; stagger within limits
- [ ] Reduced-motion path exists and was tested
- [ ] No flashing > 3/s; loops ≤ 5 s or pausable
