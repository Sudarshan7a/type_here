# STEER-6 — owner override and additions (written by the human owner)

ORDER for the next Builder session:
1. STEER-5 items 1-3 (D6 CI wiring + --filter hole, D1 CUS-01 rebuild proven
   red on the old bug, D2-D5/D8 process fixes). Time-box: no other tooling
   or gate work this session.
2. CARET SIZE (overrides STEER-5 D9).
3. FONTS and CONTENT SLICE (below).
4. STEER-5 item 4 (input-to-paint p95 on the new surface).
5. STEER-5 item 5 (D03/D04 fixtures).

CARET (owner override of D9): the caret is too big for the letter.
Alignment is fine; size is not. Keep pack-level choices (2px width, --pace
colour, blink-while-idle). Size the HEIGHT to the glyph, about 1.1x font
size, not the line box. Test-first: assert caret height against the current
character's glyph height on line 1, after wrap, after Backspace and at the
end; record before/after numbers. Offer caret style (line, block,
underline) as a setting now, default = line sized to the glyph.

FONTS (owner decision): self-hosting the two fonts in docs/design is
approved IF each font's license file permits self-hosting and
redistribution with the app. Commit the license file beside each font and
add a license-register entry. If a license does not permit it, use the
system stack for that role and tell the owner. Use font-display: swap,
report the added bytes against the 200 KB budget, and make the visual
evidence record the computed font family so it proves the fonts loaded.

CONTENT SLICE: pull the first slice of Phase 2 forward.
 a. Enforce the license register (a test proves an unlicensed item is
    rejected).
 b. At least [SET: 60] ORIGINAL Real-World Prose passages (MOD-02: mixed
    case, punctuation, digits, names, URLs), varied length, each with a
    register entry. Band them with the typability scorer if it exists,
    else "unscored".
 c. "New passage" is random, never repeats the previous passage, and avoids
    the last 10. Add a length filter (short, medium, long).
 d. Quotes only from verifiable public-domain sources with attribution.
    Never from memory. No Monkeytype lists (GPL). Quotes come after
    passages.
 Advance ledger rows honestly; DONE-VERIFIED only with a real test for the
 row's full spec. Write the halt file before your final message.