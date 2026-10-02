import { describe, expect, it } from "vitest";

import { fingerTag } from "../src/aggregation.js";
import {
  fingerForCode,
  interpretCode,
  LAYOUT_FINGER_MAPS,
  productionFor,
  UNKNOWN_LAYOUT_CHARACTERS,
} from "../src/layout-fingers.js";

/**
 * Session 4, Block C — LAYOUT PROTOCOL.
 *
 * Every map here was built from physical key-position data and independently
 * verified (docs/LAYOUT-VERIFICATION.md), never taken from a chapter's prose.
 * These tests pin the verified results so a later "simplification" cannot
 * silently reintroduce an unverified map.
 */

describe("QWERTY-US finger map (verified against physical positions)", () => {
  it("places the home-row and index keys where the hardware grid puts them", () => {
    const map = LAYOUT_FINGER_MAPS["qwerty-us"]!;
    // Left hand takes qwerty/asdf/zxcv PLUS t, g, b; right hand takes the rest.
    for (const ch of ["q", "a", "z"]) expect(map.get(ch)).toBe("lp");
    for (const ch of ["w", "s", "x"]) expect(map.get(ch)).toBe("lr");
    for (const ch of ["e", "d", "c"]) expect(map.get(ch)).toBe("lm");
    // t, g, b are the LEFT index — the classic touch-typing surprise.
    for (const ch of ["t", "g", "b", "f", "r", "v"]) expect(map.get(ch)).toBe("li");
    for (const ch of ["y", "h", "n", "j", "u", "m"]) expect(map.get(ch)).toBe("ri");
    for (const ch of ["i", "k", ","]) expect(map.get(ch)).toBe("rm");
    for (const ch of ["o", "l", "."]) expect(map.get(ch)).toBe("rr");
    for (const ch of ["p", ";", "/"]) expect(map.get(ch)).toBe("rp");
  });

  it("keeps the same-finger bigram rate in the documented touch-typing range", () => {
    // Touch-typing research puts same-finger letter bigrams near 15-17%.
    // A map that drifts far from this is structurally wrong, not a nuance.
    const map = LAYOUT_FINGER_MAPS["qwerty-us"]!;
    const letters = "abcdefghijklmnopqrstuvwxyz";
    let same = 0;
    let total = 0;
    for (const a of letters) {
      for (const b of letters) {
        const fa = map.get(a);
        const fb = map.get(b);
        if (fa === undefined || fb === undefined) continue;
        total += 1;
        if (fa === fb) same += 1;
      }
    }
    const rate = (same / total) * 100;
    expect(rate).toBeGreaterThan(12);
    expect(rate).toBeLessThan(20);
  });
});

describe("layout maps are per-layout, never inherited or hardcoded", () => {
  it("Dvorak is not QWERTY: the same bigram can change hands", () => {
    // t is on the QWERTY 'k' key (right middle); h is on 'j' (right index).
    expect(fingerTag("t", "h", "qwerty-us").hand).toBe("cross");
    expect(fingerTag("t", "h", "dvorak").hand).toBe("same");
    // f and v are both left-index on QWERTY, but right middle/ring on Dvorak.
    expect(fingerTag("f", "v", "qwerty-us").sameFinger).toBe(true);
    expect(fingerTag("f", "v", "dvorak").sameFinger).toBe(false);
    // u and i are right-index/right-middle on QWERTY, both left-index on Dvorak.
    expect(fingerTag("u", "i", "qwerty-us").sameFinger).toBe(false);
    expect(fingerTag("u", "i", "dvorak").sameFinger).toBe(true);
  });

  it("all six in-scope layouts ship a verified map", () => {
    for (const layout of [
      "qwerty-us",
      "qwerty-uk",
      "dvorak",
      "colemak-dh",
      "azerty",
      "qwertz",
    ] as const) {
      expect(LAYOUT_FINGER_MAPS[layout], layout).toBeDefined();
      expect(LAYOUT_FINGER_MAPS[layout]!.size, layout).toBeGreaterThan(20);
    }
  });

  it("AZERTY puts a and w on the far left and q on the second key", () => {
    const map = LAYOUT_FINGER_MAPS.azerty!;
    // AZERTY row 1 is A Z E R T Y U I O P — so 'a' is where QWERTY's 'q' is
    // (left pinky) and 'w' sits on the bottom-left key (also left pinky).
    expect(map.get("a")).toBe("lp");
    expect(map.get("w")).toBe("lp");
    expect(map.get("q")).toBe("lp"); // QWERTY 'a' position
    expect(map.get("s")).toBe("lr"); // QWERTY 's' position
  });

  it("QWERTZ swaps y and z relative to QWERTY; the umlauts are AltGr-only", () => {
    const map = LAYOUT_FINGER_MAPS.qwertz!;
    expect(map.get("t")).toBe("li");
    // z sits on the QWERTY 'y' key (right index); y sits on the QWERTY 'z'
    // key (left pinky). This swap is the defining QWERTZ difference.
    expect(map.get("z")).toBe("ri");
    expect(map.get("y")).toBe("lp");
  });
});

describe("AltGr and dead-key characters are unknown, never guessed", () => {
  it("marks the off-block and AltGr characters per layout", () => {
    for (const ch of ["@", "#", "{", "[", "|"]) {
      expect(UNKNOWN_LAYOUT_CHARACTERS.azerty.has(ch), `azerty ${ch}`).toBe(true);
    }
    // QWERTZ rows are 11 wide: ü (top) and ä (home) fall off the 10-column
    // block; € is AltGr. ö sits at column 9 and IS mappable (right pinky).
    for (const ch of ["ü", "ä", "€"]) {
      expect(UNKNOWN_LAYOUT_CHARACTERS.qwertz.has(ch), `qwertz ${ch}`).toBe(true);
    }
    expect(UNKNOWN_LAYOUT_CHARACTERS.qwertz.has("ö")).toBe(false);
    expect(LAYOUT_FINGER_MAPS.qwertz!.get("ö")).toBe("rp");
  });

  it("returns unknown for a character that needs AltGr on that layout", () => {
    expect(fingerTag("@", "a", "azerty")).toEqual({ hand: "unknown", sameFinger: null });
  });

  it("returns unknown for a character no layout produces", () => {
    expect(fingerTag("Ω", "a", "qwerty-us")).toEqual({ hand: "unknown", sameFinger: null });
  });
});

describe("physical-code grid fingerForCode (ENG-06 E8, additive — char maps above unchanged)", () => {
  it("assigns letter-block codes by column, independent of any layout", () => {
    // Row 0: Q W E R T Y U I O P -> lp lr lm li li ri ri rm rr rp.
    expect(fingerForCode("KeyQ")).toBe("lp");
    expect(fingerForCode("KeyT")).toBe("li");
    expect(fingerForCode("KeyY")).toBe("ri");
    expect(fingerForCode("KeyP")).toBe("rp");
    // Row 1 and row 2 anchors, including the Dvorak-`s` key.
    expect(fingerForCode("KeyA")).toBe("lp");
    expect(fingerForCode("KeyS")).toBe("lr");
    expect(fingerForCode("Semicolon")).toBe("rp");
    expect(fingerForCode("KeyZ")).toBe("lp");
    expect(fingerForCode("KeyM")).toBe("ri");
  });

  it("assigns digit-row codes per the levels-04 §2.1 AZERTY number-row table", () => {
    expect(fingerForCode("Digit1")).toBe("lp");
    expect(fingerForCode("Digit2")).toBe("lr");
    expect(fingerForCode("Digit3")).toBe("lm");
    expect(fingerForCode("Digit4")).toBe("li");
    expect(fingerForCode("Digit0")).toBe("rp");
  });

  it("returns null for off-grid codes (Quote, brackets, unknown)", () => {
    expect(fingerForCode("Quote")).toBeNull();
    expect(fingerForCode("BracketLeft")).toBeNull();
    expect(fingerForCode("NoSuchCode")).toBeNull();
  });
});

describe("interpretCode positional reads (ENG-PARITY-03, additive)", () => {
  it("reads the layout-defining swaps positionally", () => {
    expect(interpretCode("azerty", "KeyA")).toBe("q");
    expect(interpretCode("azerty", "KeyQ")).toBe("a");
    expect(interpretCode("qwertz", "KeyZ")).toBe("y");
    expect(interpretCode("dvorak", "Semicolon")).toBe("s");
    expect(interpretCode("colemak-dh", "KeyM")).toBe("k");
  });
});

describe("verified Shift/AltGr productions (ENG-06 E8, additive)", () => {
  it("pins the UK swapped pair and sterling from levels-04 §1.1", () => {
    expect(productionFor("qwerty-uk", "@")).toEqual({ code: "Quote", finger: "rp", via: "shift" });
    expect(productionFor("qwerty-uk", '"')).toEqual({
      code: "Digit2",
      finger: "lr",
      via: "shift",
    });
    expect(productionFor("qwerty-uk", "£")).toEqual({
      code: "Digit3",
      finger: "lm",
      via: "shift",
    });
  });

  it("pins AZERTY AltGr+digit productions from levels-04 §2.2", () => {
    expect(productionFor("azerty", "@")).toEqual({ code: "Digit0", finger: "rp", via: "altgr" });
    expect(productionFor("azerty", "#")).toEqual({ code: "Digit3", finger: "lm", via: "altgr" });
  });

  it("pins QWERTZ AltGr productions from levels-04 §3.2", () => {
    expect(productionFor("qwertz", "@")).toEqual({ code: "KeyQ", finger: "lp", via: "altgr" });
    expect(productionFor("qwertz", "[")).toEqual({ code: "Digit8", finger: "rm", via: "altgr" });
    expect(productionFor("qwertz", "}")).toEqual({ code: "Digit0", finger: "rp", via: "altgr" });
  });

  it("has no entry where the source flags driver variation or is silent", () => {
    expect(productionFor("azerty", "]")).toBeNull();
    expect(productionFor("azerty", "€")).toBeNull();
    expect(productionFor("qwertz", "\\")).toBeNull();
    expect(productionFor("qwertz", "€")).toBeNull();
    expect(productionFor("qwerty-uk", "#")).toBeNull();
    expect(productionFor("qwerty-uk", "€")).toBeNull();
    expect(productionFor("qwerty-us", "@")).toBeNull();
  });
});
