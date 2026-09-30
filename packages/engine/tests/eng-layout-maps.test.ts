import { describe, expect, it } from "vitest";

import { fingerTag, LAYOUT_FINGER_MAPS, UNKNOWN_LAYOUT_CHARACTERS } from "../src/layout-fingers.js";

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
    for (const ch of ["t", "g", "b", "f", "r", "v", "c"]) expect(map.get(ch)).toBe("li");
    for (const ch of ["y", "h", "n", "j", "u", "m"]) expect(map.get(ch)).toBe("ri");
    for (const ch of ["e", "d", "c"]) expect(map.get(ch)).toBe("lm");
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

  it("all seven layouts ship a verified map", () => {
    for (const layout of [
      "qwerty-us",
      "qwerty-uk",
      "dvorak",
      "colemak",
      "colemak-dh",
      "azerty",
      "qwertz",
    ] as const) {
      expect(LAYOUT_FINGER_MAPS[layout], layout).toBeDefined();
      expect(LAYOUT_FINGER_MAPS[layout]!.size, layout).toBeGreaterThan(20);
    }
  });

  it("AZERTY puts q and s on the far left and a on the second key", () => {
    const map = LAYOUT_FINGER_MAPS.azerty!;
    expect(map.get("q")).toBe("lp"); // QWERTY 'a' position
    expect(map.get("s")).toBe("lr"); // QWERTY 's' position
    expect(map.get("a")).toBe("lp"); // QWERTY 'q' position
    expect(map.get("w")).toBe("lr");
  });

  it("QWERTZ keeps the QWERTY letter positions (only umlauts differ)", () => {
    const map = LAYOUT_FINGER_MAPS.qwertz!;
    expect(map.get("t")).toBe("li");
    expect(map.get("z")).toBe("lp");
    expect(map.get("y")).toBe("ri"); // QWERTZ swaps y and z vs QWERTY
  });
});

describe("AltGr and dead-key characters are unknown, never guessed", () => {
  it("marks the AltGr-only characters per layout", () => {
    for (const ch of ["@", "#", "{", "[", "|"]) {
      expect(UNKNOWN_LAYOUT_CHARACTERS.azerty.has(ch), `azerty ${ch}`).toBe(true);
    }
    for (const ch of ["ü", "ö", "ä", "€"]) {
      expect(UNKNOWN_LAYOUT_CHARACTERS.qwertz.has(ch), `qwertz ${ch}`).toBe(true);
    }
  });

  it("returns unknown for a character that needs AltGr on that layout", () => {
    expect(fingerTag("@", "a", "azerty")).toEqual({ hand: "unknown", sameFinger: null });
  });

  it("returns unknown for a character no layout produces", () => {
    expect(fingerTag("Ω", "a", "qwerty-us")).toEqual({ hand: "unknown", sameFinger: null });
  });
});
