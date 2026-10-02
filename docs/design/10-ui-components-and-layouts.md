# 10 — UI Components & Layout Specs

Implementation: React + TypeScript, headless primitives (Radix UI / React Aria) styled via tokens. One component folder: `component.tsx`, `component.test.tsx`, `component.stories.tsx` (Storybook), states documented. All components keyboard-operable with visible focus.

## 1. Component inventory (build order)
**Foundation:** Button, IconButton, Link, Kbd (keycap chip), Badge, Tag, Tooltip, Popover, Dialog/Sheet, Drawer (mobile), Tabs, Segmented control, Toggle/Switch, Checkbox, Radio, Slider, Select/Combobox, Input, Textarea, Stepper, Progress (linear/ring), Toast, Skeleton, Divider, Card, Table, Accordion, Command palette, Context menu.
**Domain:** TypingField, Caret, ModeBar, LiveStats, ResultSheet, CadenceRibbon, VirtualKeyboard, HandsGuide, LevelNode/Trail, DrillCard, CoachCard, KpiTile, Heatmap(Keyboard), Matrix(Bigram), Chart(Line/Area/Bar/Donut), CalendarHeatmap, ThemeTile, ThemeBuilder, LayoutPicker, ShortcutSheet, RaceLane, LeaderboardTable, ProfileHeader, BadgeShelf, ReplayPlayer.

## 2. Button (keycap-style primary)
Variants: **primary** (flow fill, keycap bevel, press 2px), **secondary** (surface-2, hairline), **ghost**, **danger** (slip outline → fill on confirm), **link**. Sizes sm/md/lg. States: default, hover (tone +4%), focus-visible ring, pressed (translateY(2px), bevel shrinks), loading (spinner replaces label width-locked), disabled (50% + `aria-disabled`).
Label rules: verb + object (`Start drill`), sentence case, no trailing arrows; icons 16/20px left only when meaningful. Shortcut hint via `<Kbd>` on hover/focus.

## 3. TypingField (heart of UI)
- Container `role="textbox"` proxy: visually the display; real input hidden but focused. `aria-label="Typing test text"`, live region announces start/finish and every error batch (verbosity setting).
- Layout: words wrap in a left-aligned block, **max 68ch**, centered in viewport; 3 visible lines; current line is line 2; scroll by whole lines (120ms ease-out).
- Char classes: `.pending .correct .incorrect .extra .missed` (see 09 §1). Word underline on mistyped words in Stop/Forced modes.
- Caret: 2px bar (default), 100% line height; blink 1.06s steps while idle (stops while typing); colour `--pace`. Block caret = pace at 30% fill + outline.
- "Click to focus" overlay when blurred: blurred text (backdrop blur 4px) + message `Click or press any key to continue`. **No blur filter on typing field while focused.**
- Language/layout label bottom-left (subtle), mode summary above field.
- Reduced-motion: caret no smoothing, no line-scroll animation.

## 4. ModeBar
Segmented pill groups with sliding indicator (shared-layout animation 160ms ease-out). Overflow → horizontally scrollable on mobile with edge fade masks. Collapses into "Test options" popover under 480px. Persist selection. Keyboard: arrow keys move within group; `1–9` hotkeys via palette.

## 5. LiveStats
Large timer/word counter (tabular-nums, 48–72px) above field; WPM/accuracy small below caret line (optional). Colour never changes drastically while typing (avoid distraction): WPM neutral, accuracy turns `--slip` only < 90%.

## 6. ResultSheet (in-place swap)
Hero KPI: Net WPM at `--t-kpi` (display font, count-up 600ms), supporting KPIs in a quiet 3-column row. Chart + Ribbon fill width. Coach card pinned beneath. Primary button `Next test` (Enter). Secondary: `Replay`, `Share image`, `Details`. Skeleton for chart until computed (<300ms target).

## 7. VirtualKeyboard
- SVG or CSS-grid render from layout JSON (ANSI/ISO/JIS/ortho/split). Keys sized by `--k` unit; rounded `--r-vkey`; keycap bevel; legends: primary centre-left, shift legend top-left (muted), AltGr bottom-right.
- States: `idle`, `next` (pace outline + soft pulse once per target), `pressed` (translateY 2px + bevel collapse, 70ms), `correct` (flow flash 140ms), `wrong` (slip flash 180ms on the pressed key + ghost outline on expected), `locked` (opacity 35%), `unlocked-new` (key-pop animation, see 11 §7), `weak` heat overlay (stats).
- Finger colour mode toggle; home-row bumps on F/J; physical-layout switcher; responsive: scales to container; ≥ 44px keys on touch, otherwise hidden on xs.
- A11y: purely decorative (`aria-hidden`) in lesson; textual hint "Next key: R, right index finger" in live region.

## 8. Charts
Library: **visx or D3 + custom SVG** (not heavy chart libs) for exact styling; **uPlot** for dense long time series. Rules: axes in `--text-muted` 12px, gridlines `--line` 1px, series in viz palette + differing stroke patterns/markers; tooltips follow cursor with 8px offset, keyboard-navigable points (arrow keys), data-table fallback toggle; draw-in animation on first render only (stroke-dashoffset 600ms ease-out); resize-aware; no 3D, no pie (use donut sparingly with labels).
Specific charts: WPM-over-time (line raw + net, error dots), accuracy line, key heatmap overlay on keyboard, bigram matrix (canvas for 26×26+), calendar heatmap (53×7 grid, 5 intensity steps with pattern), rhythm histogram, finger-load bars, decay curve for fatigue.

## 9. CadenceRibbon (spec)
- Canvas 2D (DPR-aware) or SVG for ≤ 400 ticks; Canvas for longer. Height 48 (live) / 96 (result) / 64 (card).
- Data: array of `{ t, interval, class, error }`. Tick width = 2px (live scrolling window = last 90 keys), 1px compressed for full-test view (bucketed). Height = `clamp(interval / medianInterval, .2, 3) * baseUnit`. Baseline median as 1px `--line-strong` line.
- Colour: class → `--flow` (letters), `--level` (digits/symbols), `--pace` (space/enter), error → `--slip` with 2px cap. Opacity: older ticks 40% → newest 100%.
- Live: new tick animates `scaleY` from 0 over 90ms; window scrolls left via transform (no re-layout). Hover on result: tooltip shows key, interval, running WPM.
- Accessible description: text summary "Rhythm: steady (σ 38 ms); 3 hesitations > 400 ms at words 12, 27, 41".
- Export: render to PNG with theme tokens resolved.

## 10. Layout primitives
`Stack` (vertical gap tokens), `Cluster` (wrap row), `Grid12`, `Sidebar` layout, `Center` (max-width + auto margins), `Bleed` (full-bleed charts), `StickyBar`. Use CSS grid/flex only; container queries (`@container`) for cards/charts so they adapt to their slot, not the viewport.

## 11. Responsive patterns
- **Top bar → bottom tab bar** below 768px.
- **Sidebar filters → bottom sheet** below 1024px.
- **Tables → stacked cards** below 640px (key columns retained).
- **Stats dashboards:** 12-col lg, 6-col md, 1-col sm; KPI strip scrolls horizontally on xs with snap.
- Test screen on mobile: field 16–22px type size, 2 lines visible, restart button persistent.

## 12. Empty / loading / error states
Each data component implements **Skeleton**, **Empty**, **Error**, **Partial** variants (copy rules in 12 §7). Skeletons use shape-accurate placeholders with 1.4s subtle shimmer (reduced-motion: static).

## 13. Iconography & glyphs
Lucide set; custom: keycap shapes, modifier glyphs, finger icons, layout badges. Stroke 1.5, size 16/20/24, `currentColor`.

## 14. Storybook & visual QA
Stories for every state × 4 core themes; Chromatic/Playwright snapshots; a11y addon must pass; interaction tests with `@storybook/test`.
