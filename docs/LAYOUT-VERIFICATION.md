# LAYOUT VERIFICATION — finger/hand maps built from physical key positions

**Session 4, Block C.** Per the Session 4 LAYOUT PROTOCOL, no finger-map,
same-finger, or hand claim from any chapter or `levels-*.md` file was trusted.
Every map below was **derived from physical key-position data** and verified
independently, then stored as data in `packages/engine/src/layout-fingers.ts`
(not as narrative), which is what Phase 3's layout support and Phase 6's
token attribution actually run against.

## Method

1. The hardware fact: the letter rows form a 10-column block; conventional
   touch typing assigns fingers by column —
   `left: pinky ring middle index index | right: index index middle ring pinky`
   (so `t`,`g`,`b` are LEFT index and `y`,`h`,`n` are RIGHT index).
   A layout only changes *which character* sits on *which key*.
2. Each layout's character-per-key rows were entered as data
   (`tools/layout-verify.mjs`), the finger map was computed from that, and the
   result was printed and inspected (`tools/layout-report.mjs`).
3. The engine's existing hardcoded QWERTY/Dvorak maps were then compared
   against the independently derived ones.

## Results per layout

| Layout | Status | Finding |
|---|---|---|
| **QWERTY-US** | **VERIFIED, engine map correct** | All anchors confirmed: `q a z`=lp, `w s x`=lr, `e d c`=lm, `t g b f r v`=li, `y h n j u m`=ri, `i k ,`=rm, `o l .`=rr, `p ; /`=rp. Same-finger letter-bigram rate **16.0%**, inside the 12–20% band touch-typing research reports — an independent sanity signal that the map is structurally sound, not merely internally consistent. |
| **Dvorak** | **VERIFIED (Session 3 finding re-confirmed)** | `t`→QWERTY `k`=rm, `h`→`j`=ri: same hand, not the same finger. `f`→`y`=ri, `v`→`b`=rr: not same-finger. `u`→`f`=li, `i`→`g`=li: **same-finger** — a bigram that is *not* same-finger on QWERTY. All three Session 3 test assertions are confirmed. |
| **QWERTY-UK** | **VERIFIED (letters), AltGr symbols unknown** | Letter positions identical to QWERTY-US. `@ # \ | ~ ^ [ { \` and `€` are AltGr-only → `unknown` (driver-dependent, per the chapter's own caveat). |
| **AZERTY** | **VERIFIED (letters), AltGr symbols unknown** | Row 1 is `A Z E R T Y U I O P`, so `a` and `w` are both left pinky and `q`/`s` sit on the QWERTY `a`/`s` keys. `@ # { [ | \ ^ €` → `unknown`. Same-finger rate 14.8%. |
| **QWERTZ** | **VERIFIED (letters), umlauts partly unknown** | The defining swap: `z` is on the QWERTY `y` key (ri) and `y` is on the QWERTY `z` key (lp). Rows are 11 wide, so `ö` (column 9 = rp) **is** mappable while `ü` (top row) and `ä` (home row) fall at column 10, outside the block → `unknown`; `€` → `unknown`. |
| **Colemak-DH** | **VERIFIED** | Rows `qwfpbjluy;` / `arstgmneio` / `zxcvhdk,./`. No AltGr-only characters. Same-finger rate 16.0%. |

## What was wrong in my own work (caught by the protocol)

Three factual errors in the **tests I wrote first**, all caught by comparing
against the physical data rather than reasoning from memory:

1. I put `c` in the left-**index** list; it is left-**middle** (`e d c` = lm).
2. I placed AZERTY's `w` on the left ring; it is the bottom-left key (lp).
3. I asserted QWERTZ keeps QWERTY's `y`/`z` positions; QWERTZ **swaps** them
   (`z`=ri, `y`=lp).

In all three cases the implementation was right and the test was wrong — but
only because an independent, physical derivation existed to check against.
That is the whole point of the protocol: without it, these would have shipped.

## Accepted gaps (human action, logged in HUMAN-ACTIONS.md)

- **AltGr / dead-key characters** on QWERTY-UK, AZERTY and QWERTZ return
  `unknown` rather than a guess. Verifying them needs a live OS driver, which
  no in-repo script can substitute for. This is a deliberate, visible gap.
- **Live-driver confirmation of all six maps.** The derivation is sound from
  key positions, but a human should type one word per layout with a debugger
  open before Phase 3 ships layout support.
- **Plain Colemak** (non-DH) is not in the contract's Layout enum and was not
  verified; only `colemak-dh` is in scope per the roadmap's build order.

## Re-verification

```bash
node tools/layout-report.mjs                      # prints the derived maps
pnpm --dir packages/engine exec vitest run tests/eng-layout-maps.test.ts
```

The tests pin every value in the table above, so a later "simplification" of
the maps cannot silently reintroduce an unverified mapping.
