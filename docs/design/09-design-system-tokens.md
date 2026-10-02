# 09 — Design System Tokens (copy-paste ready)

> Single source of truth. Implement as CSS custom properties in `src/styles/tokens.css` and mirror in Tailwind v4 `@theme`. **Agents must not hard-code colours/sizes outside this file.**
> Contrast values below were computed (WCAG 2.x) — keep them ≥ AA when editing.

## 1. Colour roles
| Role | Meaning | Dark "Night Ink" | Light "Daylight" |
|---|---|---|---|
| `--bg` | app background | `#0D1120` | `#F2F5FC` |
| `--surface-1` | cards/panels | `#131A2E` | `#FFFFFF` |
| `--surface-2` | raised/hover/inset | `#1A2340` | `#E8ECF8` |
| `--line` | hairlines/dividers (decorative) | `#2A3558` | `#CBD3EA` |
| `--line-strong` | control borders (≥3:1 vs bg) | `#4A5A8C` | `#8B98BF` |
| `--text` | primary text / **correct chars** | `#EAF0FF` (16.5:1) | `#12182B` (16.2:1) |
| `--text-muted` | secondary text | `#9AA6CC` (7.8:1) | `#4F5A80` (6.2:1) |
| `--text-pending` | **untyped chars** in field | `#7F8CB3` (5.6:1) | `#5A658C` (5.2:1) |
| `--flow` | rhythm / correct / progress / primary action | `#4FD6C8` (10.5:1) | `#097068` (5.5:1) |
| `--pace` | caret / focus key / next-up | `#FFC24D` (11.7:1) | `#8F5E00` (5.1:1) |
| `--slip` | errors | `#FF6B8E` (6.9:1) | `#CC2149` (5.0:1) |
| `--level` | learning/curriculum/symbols | `#A29DFF` (7.9:1) | `#4B45D6` (6.2:1) |
| `--on-flow` | text on `--flow` fill | `#06201D` (9.6:1) | `#FFFFFF` (5.9:1) |
| `--slip-bg` | error char background wash | `rgba(255,107,142,.14)` | `rgba(204,33,73,.10)` |
| `--focus-ring` | keyboard focus | `#FFC24D` | `#8F5E00` |

Text-state mapping in the typing field: pending=`--text-pending`, correct=`--text`, incorrect=`--slip` (+ underline 2px, **not colour-only**), extra=`--slip` at 70% + strikethrough-dotted, missed=`--slip` outline underline dashed.
Data-viz categorical palette (colour-blind safe, use with shape/pattern too): `#4FD6C8, #A29DFF, #FFC24D, #FF6B8E, #6FB6FF, #B6E36A` (dark) and darker equivalents in light (define `--viz-1..6`).

## 2. Finger colour system (virtual keyboard / hands)
`L-pinky #FF6B8E · L-ring #FFA25C · L-middle #FFD84D · L-index #7BE08A · R-index #4FD6C8 · R-middle #6FB6FF · R-ring #A29DFF · R-pinky #E58BFF · thumbs #9AA6CC`. Used at 18% fill + 1px border; always paired with a finger-initial glyph for accessibility (`LP LR LM LI RI RM RR RP T`).

## 3. Typography
Families: `--font-display: "Bricolage Grotesque", system-ui, sans-serif` · `--font-ui: "Geist", system-ui, sans-serif` · `--font-type: "JetBrains Mono", "Geist Mono", ui-monospace, monospace`. Self-host (woff2, `font-display: swap`, subset Latin + Latin-ext, preload typing font).
Type scale (fluid, `clamp`): 
| Token | Size | Line | Use |
|---|---|---|---|
| `--t-caption` | 12px | 1.4 | labels, axis ticks |
| `--t-small` | 13–14px | 1.5 | secondary UI |
| `--t-body` | 15–16px | 1.6 | body UI |
| `--t-lead` | 18–20px | 1.5 | intro lines |
| `--t-h3` | clamp(20px,1.6vw,24px) | 1.25 | section titles |
| `--t-h2` | clamp(26px,2.6vw,36px) | 1.15 | page titles |
| `--t-h1` | clamp(36px,4.5vw,64px) | 1.05 | marketing/hero headings |
| `--t-kpi` | clamp(72px,10vw,160px) | 0.95 | result WPM |
| `--t-type` | 28px default (user 16–48) | 1.65 | typing field |
Weights: display 600–700 (width axis 90–100), UI 400/500/600, mono 400/500. Letter-spacing: display −0.02em, UI 0, mono +0.01em.
Rules: body line length ≤ 68ch; sentence case; tabular numerals globally on numbers; `text-wrap: balance` for headings, `pretty` for paragraphs; no ALL-CAPS labels; micro-labels use size+weight+colour, not tracking.

## 4. Spacing, sizing, layout
4px base: `--s-1 4 · --s-2 8 · --s-3 12 · --s-4 16 · --s-5 20 · --s-6 24 · --s-8 32 · --s-10 40 · --s-12 48 · --s-16 64 · --s-20 80 · --s-24 96`.
Containers: `--w-type 68ch` (typing), `--w-page 1200px`, `--w-wide 1440px`, `--w-prose 68ch`. Page padding: 16 (xs) / 24 (md) / 32 (lg+). Control heights: sm 32 · md 40 · lg 48. Hit target min 44px (touch).

## 5. Radius, borders, elevation
`--r-key 8 · --r-input 10 · --r-card 16 · --r-sheet 24 · --r-pill 999 · --r-vkey 6`.
Borders: `1px solid var(--line)` default; controls `1px var(--line-strong)`.
Elevation (floating only): 
- `--elev-menu: 0 8px 24px rgba(3,6,18,.45), 0 0 0 1px var(--line)` (dark) / `0 8px 24px rgba(20,30,70,.14), 0 0 0 1px var(--line)` (light)
- `--elev-dialog: 0 24px 64px rgba(3,6,18,.6), 0 0 0 1px var(--line)`
Panels use **tone + hairline**, not shadows. Keycap bevel: `inset 0 1px 0 rgba(255,255,255,.08), 0 2px 0 rgba(0,0,0,.35)` (dark) tuned for light.

## 6. Z-index scale
`base 0 · sticky 10 · dropdown 20 · overlay 30 · dialog 40 · palette 50 · toast 60 · tooltip 70`.

## 7. Motion tokens (full detail in 11)
`--dur-instant 0ms · --dur-fast 90ms · --dur-base 160ms · --dur-slow 280ms · --dur-slower 480ms · --dur-hero 900ms`
`--ease-out: cubic-bezier(.2,.8,.2,1) · --ease-in-out: cubic-bezier(.65,0,.35,1) · --ease-spring-ui: cubic-bezier(.3,1.4,.4,1) (small overshoot) · --ease-caret: cubic-bezier(.4,0,.6,1)`
`@media (prefers-reduced-motion: reduce)` → durations ×0.01 for transform/scale; keep opacity/colour at ≤ 120ms.

## 8. Themes (curated set; each defines the roles in §1)
Launch ≥ 40. Families (name → mood): 
- **Night Ink** (default dark), **Daylight** (default light) 
- Dark: *Graphite Teal, Deep Moss, Abyss, Midnight Violet, Ember Dim, Slate Blue, Ink Plum, Harbor, Obsidian Calm, Aurora Low*
- Light: *Paper Mint, Chalk Blue, Sand Slate, Linen Rose, Fog, Glacier, Blossom Light*
- **High contrast:** *HC Dark, HC Light* (≥ 7:1 text, thicker borders)
- **Colour-blind safe:** *CB Deuter, CB Protan, CB Tritan* (error not red-only: use blue/orange pairs)
- **Retro/keyboard cultures** (original palettes only; avoid trademarked looks): *Beige Typewriter, Terminal Phosphor, Thock Pastel, GMK-ish Pastel Pair, Mono Paper*
Theme JSON schema:
```json
{ "id": "night-ink", "name": "Night Ink", "mode": "dark",
  "tokens": { "bg":"#0D1120","surface1":"#131A2E","surface2":"#1A2340","line":"#2A3558","lineStrong":"#4A5A8C",
              "text":"#EAF0FF","textMuted":"#9AA6CC","textPending":"#7F8CB3",
              "flow":"#4FD6C8","pace":"#FFC24D","slip":"#FF6B8E","level":"#A29DFF" },
  "meta": { "author":"Cadence", "contrast": { "textOnBg": 16.46, "pendingOnBg": 5.64 } } }
```
Validator (build step): every theme must pass **text ≥ 7:1, pending ≥ 4.5:1, flow/pace/slip/level ≥ 3:1 on bg, slip distinguishable from flow under deuteranopia simulation**. Custom themes in builder show live pass/fail.

## 9. CSS skeleton
```css
:root{
  color-scheme: dark;
  --bg:#0D1120; --surface-1:#131A2E; --surface-2:#1A2340;
  --line:#2A3558; --line-strong:#4A5A8C;
  --text:#EAF0FF; --text-muted:#9AA6CC; --text-pending:#7F8CB3;
  --flow:#4FD6C8; --pace:#FFC24D; --slip:#FF6B8E; --level:#A29DFF;
  --on-flow:#06201D; --slip-bg:rgba(255,107,142,.14); --focus-ring:#FFC24D;
  --font-display:"Bricolage Grotesque",system-ui,sans-serif;
  --font-ui:"Geist",system-ui,sans-serif;
  --font-type:"JetBrains Mono","Geist Mono",ui-monospace,monospace;
  --r-key:8px; --r-input:10px; --r-card:16px; --r-sheet:24px; --r-pill:999px;
  --dur-fast:90ms; --dur-base:160ms; --dur-slow:280ms; --dur-slower:480ms;
  --ease-out:cubic-bezier(.2,.8,.2,1); --ease-in-out:cubic-bezier(.65,0,.35,1);
  --ease-caret:cubic-bezier(.4,0,.6,1);
}
:root[data-theme="daylight"]{
  color-scheme: light;
  --bg:#F2F5FC; --surface-1:#FFFFFF; --surface-2:#E8ECF8;
  --line:#CBD3EA; --line-strong:#8B98BF;
  --text:#12182B; --text-muted:#4F5A80; --text-pending:#5A658C;
  --flow:#097068; --pace:#8F5E00; --slip:#CC2149; --level:#4B45D6;
  --on-flow:#FFFFFF; --slip-bg:rgba(204,33,73,.10); --focus-ring:#8F5E00;
}
@media (prefers-color-scheme: light){ :root:not([data-theme]){ /* map to daylight */ } }
body{background:var(--bg);color:var(--text);font:400 var(--t-body)/1.6 var(--font-ui);font-variant-numeric:tabular-nums}
:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;border-radius:var(--r-key)}
```
**Theme switching:** set `data-theme` on `<html>` before first paint (inline script reading localStorage → no flash). Animate theme change with View Transitions API (circular reveal from the toggle, 480ms) when supported; otherwise instant.

## 10. Token governance
- Lint rule: forbid raw hex/px values in components (stylelint + custom ESLint rule). 
- Visual regression: Playwright screenshots of 4 core themes × key screens.
- Add tokens only via PR updating this doc + `tokens.css` + theme validator.
