# 08 — Design Language (Brand, Mood, Shape, Voice)

> Role: studio-grade, opinionated, specific to *typing*. Spend boldness in **one memorable thing** (the **Cadence Ribbon** + the hero-is-the-product moment); keep everything else disciplined and quiet.

## 1. Concept: "Instrument for the fingers"
Typing is rhythm, muscle memory and flow. The interface behaves like a **precision instrument** (think: a metronome crossed with a mechanical keyboard), not a classroom worksheet and not a gamer dashboard.
- **Tactile:** keycaps, travel, detents — things *press*, they don't just fade.
- **Rhythmic:** the signature graphic is **rhythm made visible** (the Cadence Ribbon).
- **Calm under pressure:** while typing, everything except the text recedes.
- **Honest:** numbers are shown plainly, with tabular figures and the formula one click away.

## 2. Moodboard words
Night studio · analogue meter · linen-bound notebook margin lines (as structure, not decoration) · bench-tool precision · low-glare · focused · warm-handed machine. **Not:** neon cyberpunk, glassmorphism everywhere, purple-gradient AI look, cream+terracotta editorial, acid-green hacker terminal, kids' cartoon.

## 3. Colour direction (tokens in 09)
- **Base:** a **deep blue-ink** dark (not neutral black) and a **cool daylight** light — chosen to feel like *ink on a night page* and *pencil on pale paper*, with no cream/terracotta.
- **Text states:** *pending* = muted mist-blue, *correct* = bright paper, *incorrect* = signal rose, *extra* = deeper rose, *missed* = rose outline.
- **Signal colours (roles, not decoration):** **Flow** (cool teal-cyan) = rhythm/correct/progress · **Pace** (amber) = caret/focus key/next-up · **Slip** (rose) = errors · **Level** (violet-blue) = learning/curriculum.
- Accent usage rule: **at most one signal colour dominant per screen**; others only as data encodings.
- Themes re-map the same roles (never the structure). ≥ 40 curated themes (09 §8).

## 4. Typography direction
- **Typing field:** monospace for fidelity (JetBrains Mono default), ligatures **off**; 28–32px desktop default, generous letter-spacing +0.01em, line-height 1.65.
- **Display/headlines:** **Bricolage Grotesque** (variable; use width/optical-size axes for expressive headings) — headings are *content-led*, short, sentence case.
- **UI/body:** **Geist Sans** (clean, neutral, excellent numerals; tabular nums on).
- **Numbers:** always `font-variant-numeric: tabular-nums`; big result numbers use display font at 96–160px with tight tracking.
- Scale and rules in 09 §3. Avoid: single-word accent in headlines, ALL-CAPS tracked eyebrows over every heading, numbered markers when content isn't a sequence.

## 5. Shape & surface
- **Radii hierarchy (not one radius everywhere):** keycap-like controls 8px · inputs 10px · cards 16px · sheets/dialogs 24px · pills 999px · virtual keys 6px with inner bevel.
- **Surfaces:** flat layers with **1px inner hairlines** (`--line`) and subtle layered elevation; avoid generic grey drop-shadow on every card. Elevation is communicated by **tone shift + hairline**, shadows only for floating layers (menus, palettes, dialogs).
- **Keycap motif (used sparingly):** primary buttons and the virtual keyboard use a subtle two-tone top/side face (top highlight 1px, bottom 2px darker "travel" edge) and **translate 1–2px on press**.
- **Ruled-margin motif:** thin vertical margin line in lesson/transcribe panes (structural: marks where "source" ends and "your typing" begins).

## 6. Imagery & iconography
- No stock photos. Visuals are **data-made**: the Ribbon, heatmaps, keyboard renders, SVG hand guides.
- Icons: 1.5px stroke, rounded caps, 20/24px grid (Lucide or Phosphor *Regular*); custom keycap glyphs for modifiers (⇧ ⌃ ⌥ ⌘ ⏎ ⇥ ⌫).
- Illustration (if any): geometric hand silhouettes in two tones, finger colour system (09 §2.4).

## 7. Voice & tone (copy rules in 12 §8)
Plain, confident, a little dry. Active voice. Sentence case. Verbs on buttons (`Start drill`, `Save theme`). Errors: say what happened + how to fix, no apology. Empty states invite action. No "Oops!". No emoji in UI chrome (allowed in user-generated names).
Examples: "87 net WPM. Your slowest pair was ou — 41 ms over average." · "Nothing here yet. Finish a test and your history shows up." · "That layout file isn't valid JSON (line 14). Fix it and import again."

## 8. The signature: **Cadence Ribbon**
A horizontal strip where each keystroke is a thin vertical tick; **height = interval relative to your median** (taller = slower hesitation), **colour = key class** (letters flow-teal, symbols/numbers level-violet, errors rose), **opacity = recency**. A smooth baseline shows moving median. Smooth, steady typing looks like an even comb; hesitation looks like spikes.
- Live (optional, 48px) on the test screen, full-width on results, averaged on Stats → Rhythm, and **exported on the share card**.
- It is the product's visual identity — logo mark derives from it (a keycap whose top edge is a ribbon).
- Implementation spec in 10 §9 and 11 §6.

## 9. Layout philosophy
- **Left-aligned reading/UI, centre-aligned only for the typing stage and results KPIs.**
- Generous negative space around the typing field; dense, tool-like layouts in Stats (it's a lab).
- Asymmetric dashboard grids; avoid identical card walls — vary card size by information importance.
- Marketing/content pages: editorial single-column with a ruled margin; the **only** place scroll-driven storytelling is used.

## 10. Do / Don't
**Do:** let the text be the loudest thing during a test · use motion that answers an action · show formulas on demand · keep contrast ≥ AA for untyped text · treat dark and light as equals.
**Don't:** gradient wash backgrounds as decoration · identical rounded cards with identical shadows · confetti · scroll-jacking · decorative parallax · mono-font for all small labels · arrows (`→`) appended to every link.

## 11. Differentiation self-check (agent must run before shipping any screen)
1. Would this screen look at home on any SaaS template? If yes, change something specific to typing.
2. Is there exactly one memorable element per screen? Is everything else quiet?
3. Is every border/label/number there because it encodes information?
4. Does motion respond to an action, not decorate? (11)
