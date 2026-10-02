import { describe, expect, it } from "vitest";

import type { KeyEvent, Layout } from "@realtype/schemas";

import { fingerTag, fingerTagForEvents } from "../src/aggregation.js";
import {
  fingerFor,
  fingerForCode,
  interpretCode,
  productionFor,
  VERIFIED_PRODUCTIONS,
} from "../src/layout-fingers.js";

import * as mod from "../fixtures/e-dualkey.js";
import { runFixture } from "./fixture-runner.js";

// Named fixture tests: the chapter-4 deep-dive fixture ids are carried by the
// fixture module (ENG-FIXTURE-E-DUALKEY-*). Expected values are recomputed
// independently — see fixtures/PROVENANCE.md.
runFixture({ FIXTURE_ID: mod.FIXTURE_ID, log: mod.log, text: mod.text, expected: mod.expected });
runFixture({
  FIXTURE_ID: mod.FIXTURE_ID_ALT,
  log: mod.logAlt,
  text: mod.textAlt,
  expected: mod.expectedAlt,
});

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

function press(code: string, key: string, t = 0): KeyEvent {
  return {
    code,
    key,
    type: "down",
    t,
    mods: { ...NO_MODS },
    repeat: false,
    isTrusted: true,
    auto: false,
  };
}

function downsOf(log: typeof mod.log): KeyEvent[] {
  return log.events.filter((e) => e.type === "down");
}

describe(`${mod.FIXTURE_ID} input semantics (ENG-06 E8)`, () => {
  it("carries the Dvorak physical codes, not canonical QWERTY ones", () => {
    expect(downsOf(mod.log).map((e) => e.code)).toEqual(["Semicolon", "KeyA"]);
    // The Dvorak interpretations of those codes are exactly the target text.
    expect(interpretCode("dvorak", "Semicolon")).toBe("s");
    expect(interpretCode("dvorak", "KeyA")).toBe("a");
  });

  it("attributes the same character on two physical keys to the key pressed", () => {
    // `s` on KeyS (QWERTY) is left ring; `s` on Semicolon (Dvorak) is right
    // pinky. A char-based lookup can only ever give ONE of these answers.
    expect(fingerForCode("KeyS")).toBe("lr");
    expect(fingerForCode("Semicolon")).toBe("rp");
    expect(fingerFor("qwerty-us", "s")).toBe("lr");
    // The code-aware transition for the fixture log: rp -> lp.
    const [s, a] = downsOf(mod.log);
    expect(fingerTagForEvents(s!, a!, "dvorak")).toEqual({ hand: "cross", sameFinger: false });
  });

  it("lets the physical code win over the canonical character (adversarial)", () => {
    // A Semicolon press producing `s`, read under qwerty-us: the canonical
    // `s` key is KeyS (left ring), but THIS press came from column 9.
    const rogue = press("Semicolon", "s");
    const next = press("KeyA", "a");
    expect(fingerForCode("Semicolon")).toBe("rp");
    expect(fingerFor("qwerty-us", "s")).toBe("lr");
    expect(fingerTagForEvents(rogue, next, "qwerty-us")).toEqual({
      hand: "cross",
      sameFinger: false,
    });
  });

  it("keeps char-based lookup unknown for AltGr characters (no canonical guess)", () => {
    // The existing contract, unchanged: a bare `@` is ambiguous without its
    // code, so fingerTag must not invent an answer.
    expect(fingerTag("@", "a", "azerty")).toEqual({ hand: "unknown", sameFinger: null });
  });

  it("resolves the AltGr press once the code is known", () => {
    const [at, a] = downsOf(mod.logAlt);
    expect(at!.code).toBe("Digit0");
    // The verified production for AZERTY `@` is AltGr+Digit0 (levels-04 §2.2).
    expect(productionFor("azerty", "@")).toEqual({ code: "Digit0", finger: "rp", via: "altgr" });
    // Digit0 is right pinky, KeyQ (AZERTY `a`) is left pinky: cross-hand.
    expect(fingerTagForEvents(at!, a!, "azerty")).toEqual({ hand: "cross", sameFinger: false });
  });

  it("scores the AltGr press normally — the alt mod never affects scoring", () => {
    expect(downsOf(mod.logAlt).map((e) => e.code)).toEqual(["Digit0", "KeyQ"]);
    expect(downsOf(mod.logAlt)[0]!.mods.alt).toBe(true);
  });

  it("stays unknown for an AltGr character with no verified table entry", () => {
    // AZERTY `€` has no production entry (levels-04 §2.2 does not cover it)
    // and Quote is off the verified grid — so the press is unattributed.
    const euro = press("Quote", "€");
    const next = press("KeyA", "a");
    expect(fingerForCode("Quote")).toBeNull();
    expect(productionFor("azerty", "€")).toBeNull();
    expect(fingerTagForEvents(euro, next, "azerty")).toEqual({ hand: "unknown", sameFinger: null });
    // Same for the deliberately conservative QWERTY-UK brackets: UK `[` is
    // US-identical per levels-04 §1, but the US bracket-key fingers are
    // unverified in-repo, so no entry exists and the press stays unknown.
    const bracket = press("BracketLeft", "[");
    expect(productionFor("qwerty-uk", "[")).toBeNull();
    expect(fingerTagForEvents(bracket, next, "qwerty-uk")).toEqual({
      hand: "unknown",
      sameFinger: null,
    });
  });

  it("pins every verified production entry (code, finger, and layer)", () => {
    const expected: Record<
      Layout,
      Array<[string, { code: string; finger: string; via: string }]>
    > = {
      "qwerty-us": [],
      "qwerty-uk": [
        ["@", { code: "Quote", finger: "rp", via: "shift" }],
        ['"', { code: "Digit2", finger: "lr", via: "shift" }],
        ["£", { code: "Digit3", finger: "lm", via: "shift" }],
      ],
      dvorak: [],
      "colemak-dh": [],
      azerty: [
        ["@", { code: "Digit0", finger: "rp", via: "altgr" }],
        ["#", { code: "Digit3", finger: "lm", via: "altgr" }],
        ["{", { code: "Digit4", finger: "li", via: "altgr" }],
        ["[", { code: "Digit5", finger: "li", via: "altgr" }],
      ],
      qwertz: [
        ["@", { code: "KeyQ", finger: "lp", via: "altgr" }],
        ["[", { code: "Digit8", finger: "rm", via: "altgr" }],
        ["]", { code: "Digit9", finger: "rr", via: "altgr" }],
        ["{", { code: "Digit7", finger: "ri", via: "altgr" }],
        ["}", { code: "Digit0", finger: "rp", via: "altgr" }],
      ],
    };
    for (const layout of Object.keys(expected) as Layout[]) {
      expect([...VERIFIED_PRODUCTIONS[layout].keys()].sort()).toEqual(
        expected[layout].map(([ch]) => ch).sort(),
      );
      for (const [ch, want] of expected[layout]) {
        expect(productionFor(layout, ch)).toEqual(want);
      }
    }
    // Every on-grid production code agrees with the column grid (the Quote
    // key for UK `@` is off-grid by design — its finger comes from the
    // levels-04 §1.1 table, not from a column).
    for (const layout of Object.keys(expected) as Layout[]) {
      for (const [ch] of expected[layout]) {
        const prod = productionFor(layout, ch)!;
        const grid = fingerForCode(prod.code);
        if (prod.code !== "Quote") expect(grid, `${layout} ${ch}`).toBe(prod.finger);
        else expect(grid, `${layout} ${ch}`).toBeNull();
      }
    }
  });
});

describe("ENG-PARITY-03 layout interpretation matrix (same codes, per-layout chars)", () => {
  // Hand-built from LAYOUT_ROWS in packages/engine/src/layout-fingers.ts
  // (positional read, verified in docs/LAYOUT-VERIFICATION.md): each row is
  // one physical key, each column what that key produces under each layout.
  const MATRIX: Record<string, Record<Layout, string>> = {
    KeyQ: {
      "qwerty-us": "q",
      "qwerty-uk": "q",
      dvorak: "'",
      "colemak-dh": "q",
      azerty: "a",
      qwertz: "q",
    },
    KeyW: {
      "qwerty-us": "w",
      "qwerty-uk": "w",
      dvorak: ",",
      "colemak-dh": "w",
      azerty: "z",
      qwertz: "w",
    },
    KeyE: {
      "qwerty-us": "e",
      "qwerty-uk": "e",
      dvorak: ".",
      "colemak-dh": "f",
      azerty: "e",
      qwertz: "e",
    },
    KeyA: {
      "qwerty-us": "a",
      "qwerty-uk": "a",
      dvorak: "a",
      "colemak-dh": "a",
      azerty: "q",
      qwertz: "a",
    },
    KeyZ: {
      "qwerty-us": "z",
      "qwerty-uk": "z",
      dvorak: ";",
      "colemak-dh": "z",
      azerty: "w",
      qwertz: "y",
    },
    Semicolon: {
      "qwerty-us": ";",
      "qwerty-uk": ";",
      dvorak: "s",
      "colemak-dh": "o",
      azerty: "m",
      qwertz: "ö",
    },
    KeyM: {
      "qwerty-us": "m",
      "qwerty-uk": "m",
      dvorak: "m",
      "colemak-dh": "k",
      azerty: ",",
      qwertz: "m",
    },
  };

  it("interprets every matrix cell correctly (42 hand-built cells)", () => {
    for (const [code, perLayout] of Object.entries(MATRIX)) {
      for (const layout of Object.keys(perLayout) as Layout[]) {
        expect(interpretCode(layout, code), `${code} on ${layout}`).toBe(perLayout[layout]);
      }
    }
  });

  it("reads one physical sequence as different text per layout", () => {
    const sequence = ["KeyQ", "KeyW", "KeyE"];
    const readAs = (layout: Layout): string =>
      sequence.map((code) => interpretCode(layout, code)).join("");
    expect(readAs("qwerty-us")).toBe("qwe");
    expect(readAs("qwerty-uk")).toBe("qwe");
    expect(readAs("dvorak")).toBe("',.");
    expect(readAs("colemak-dh")).toBe("qwf");
    expect(readAs("azerty")).toBe("aze");
    expect(readAs("qwertz")).toBe("qwe");
  });

  it("keeps the finger on the physical key while the character changes", () => {
    // E8 in one assertion: Semicolon is right pinky on EVERY layout even
    // though it produces `;`, `s`, `o`, `m`, `ö` across them.
    for (const layout of Object.keys(MATRIX.Semicolon!) as Layout[]) {
      expect(fingerForCode("Semicolon"), layout).toBe("rp");
      expect(MATRIX.Semicolon![layout], layout).toBe(interpretCode(layout, "Semicolon"));
    }
    // QWERTZ's defining swap, by code: the QWERTY-`z` key says `y`.
    expect(interpretCode("qwertz", "KeyZ")).toBe("y");
    expect(interpretCode("qwerty-us", "KeyZ")).toBe("z");
    expect(fingerForCode("KeyZ")).toBe("lp");
  });

  it("returns null outside the verified letter block (never guessed)", () => {
    // The digit row is layout-ambiguous without modifier state (AZERTY
    // digits need Shift), so it is interpreted by no layout here.
    expect(interpretCode("qwerty-us", "Digit1")).toBeNull();
    expect(interpretCode("azerty", "Digit0")).toBeNull();
    expect(interpretCode("qwerty-us", "Quote")).toBeNull();
    expect(interpretCode("qwerty-us", "NoSuchCode")).toBeNull();
  });
});
