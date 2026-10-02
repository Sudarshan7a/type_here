/**
 * RealType typing engine (open-core, MIT) — per-layout finger maps (C).
 *
 * SESSION 4 LAYOUT PROTOCOL: every map below was built from PHYSICAL
 * KEY-POSITION data and independently verified (docs/LAYOUT-VERIFICATION.md).
 * None of it comes from a chapter's prose claims. A layout or character that
 * cannot be derived confidently returns `unknown` — it is never guessed,
 * because a wrong finger tag silently corrupts the weakness model's
 * hand/finger analytics.
 *
 * The hardware fact the maps rest on: the letter rows form a 10-column block,
 * and the conventional touch-typing assignment by COLUMN is
 *   left: pinky ring middle index index | right: index index middle ring pinky
 * (t, g, b on the left index; y, h, n on the right index). A layout only
 * changes WHICH CHARACTER sits on which physical key.
 */
import type { Layout } from "@realtype/schemas";

export type Finger = "lp" | "lr" | "lm" | "li" | "ri" | "rm" | "rr" | "rp";

const FINGERS_BY_COLUMN: Finger[] = ["lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp"];

/** The characters each layout places on each physical key, row by row. */
const LAYOUT_ROWS: Record<Layout, string[]> = {
  "qwerty-us": ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"],
  // QWERTY-UK is QWERTY-US plus AltGr access; the letter positions are identical.
  "qwerty-uk": ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"],
  dvorak: ["',.pyfgcrl", "aoeuidhtns", ";qjkxbmwvz"],
  "colemak-dh": ["qwfpbjluy;", "arstgmneio", "zxcvhdk,./"],
  azerty: ["azertyuiop", "qsdfghjklm", "wxcvbn,;:!"],
  qwertz: ["qwertzuiop", "asdfghjklö", "yxcvbnm,.-"],
};

/**
 * Characters that cannot be derived from the 10-column physical block, or
 * that are AltGr-only: their finger depends on the OS/driver rather than the
 * key grid. These return `unknown` until a human verifies them against a live
 * driver (an accepted, logged gap — not an oversight).
 *
 * QWERTZ note: the German rows are 11 keys wide. The o-umlaut sits at column 9
 * (right pinky) and IS mappable; the u-umlaut (top row) and a-umlaut (home
 * row) fall at column 10, outside the 10-column block, so they are unknown,
 * as is the euro sign (AltGr).
 */
export const UNKNOWN_LAYOUT_CHARACTERS: Record<Layout, ReadonlySet<string>> = {
  "qwerty-us": new Set<string>(),
  "qwerty-uk": new Set(["€", "@", "#", "\\", "|", "~", "^", "[", "{", "`"]),
  dvorak: new Set<string>(),
  "colemak-dh": new Set<string>(),
  azerty: new Set(["@", "#", "{", "[", "|", "\\", "^", "€"]),
  qwertz: new Set(["ü", "ä", "€"]),
};

function buildMap(layout: Layout): Map<string, Finger> {
  const map = new Map<string, Finger>();
  const unknown = UNKNOWN_LAYOUT_CHARACTERS[layout];
  for (const row of LAYOUT_ROWS[layout]) {
    for (let i = 0; i < row.length && i < 10; i++) {
      const ch = row[i]!;
      if (unknown.has(ch)) continue;
      map.set(ch, FINGERS_BY_COLUMN[i]!);
    }
  }
  return map;
}

export const LAYOUT_FINGER_MAPS: Record<Layout, Map<string, Finger>> = Object.freeze({
  "qwerty-us": buildMap("qwerty-us"),
  "qwerty-uk": buildMap("qwerty-uk"),
  dvorak: buildMap("dvorak"),
  "colemak-dh": buildMap("colemak-dh"),
  azerty: buildMap("azerty"),
  qwertz: buildMap("qwertz"),
}) as Record<Layout, Map<string, Finger>>;

export function fingerFor(layout: Layout, ch: string): Finger | null {
  if (UNKNOWN_LAYOUT_CHARACTERS[layout].has(ch)) return null;
  return LAYOUT_FINGER_MAPS[layout].get(ch) ?? null;
}

/**
 * Physical ANSI codes for the keys the verified maps cover, row by row.
 * Position i in each row is column i, i.e. finger FINGERS_BY_COLUMN[i] — the
 * same hardware fact the character maps rest on. A layout only changes WHICH
 * CHARACTER each code produces (see LAYOUT_ROWS), never which finger presses
 * it — which is the whole of chapter-4 E8.
 *
 * The digit row is included because its fingers are pinned by independent
 * in-repo evidence: docs/levels-04-tier-0-per-layout-finger-maps.md §2.1
 * lists the AZERTY number row as 1=lp, 2=lr, 3=lm, 4/5=li, 6/7=ri, 8=rm,
 * 9=rr, 0=rp — exactly the column assignment below.
 *
 * Codes outside these rows (Quote, BracketLeft/Right, Backquote, the ISO
 * extra key, …) return null: their fingers are NOT verified in-repo, so an
 * off-grid press is unknown unless a verified production entry (below) pins
 * it. See docs/LAYOUT-VERIFICATION.md.
 */
const LETTER_CODE_ROWS: string[][] = [
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];

const DIGIT_ROW_CODES: string[] = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
];

const FINGER_BY_CODE: ReadonlyMap<string, Finger> = (() => {
  const map = new Map<string, Finger>();
  for (const row of LETTER_CODE_ROWS) {
    for (let i = 0; i < row.length && i < FINGERS_BY_COLUMN.length; i++) {
      map.set(row[i]!, FINGERS_BY_COLUMN[i]!);
    }
  }
  for (let i = 0; i < DIGIT_ROW_CODES.length; i++) {
    map.set(DIGIT_ROW_CODES[i]!, FINGERS_BY_COLUMN[i]!);
  }
  return map;
})();

/**
 * Finger for a PHYSICAL key, layout-independent (chapter-4 E8). The finger
 * is a property of the key's column, not of the character the active layout
 * happens to print on it — so `s` on the Semicolon key (Dvorak) is right
 * pinky even though the canonical `s` key (KeyS, QWERTY) is left ring.
 * Returns null for codes outside the verified rows (never guessed).
 */
export function fingerForCode(code: string): Finger | null {
  return FINGER_BY_CODE.get(code) ?? null;
}

const CODE_POSITION: ReadonlyMap<string, { row: number; col: number }> = (() => {
  const map = new Map<string, { row: number; col: number }>();
  LETTER_CODE_ROWS.forEach((row, r) => {
    row.forEach((code, c) => {
      map.set(code, { row: r, col: c });
    });
  });
  return map;
})();

/**
 * The character a physical key produces under a layout (ENG-PARITY-03): a
 * positional read of the same LAYOUT_ROWS the finger maps are built from.
 * The same code sequence therefore interprets differently per layout
 * (KeyA is `a` on QWERTY, `q` on AZERTY). Letter-block codes only; anything
 * else (digit row, Shift/AltGr layers, dead keys) returns null — the digit
 * row is layout-ambiguous without the modifier state (AZERTY digits need
 * Shift; see levels-04 §2.1), so it is deliberately not interpreted here.
 */
export function interpretCode(layout: Layout, code: string): string | null {
  const pos = CODE_POSITION.get(code);
  if (pos === undefined) return null;
  return LAYOUT_ROWS[layout][pos.row]![pos.col] ?? null;
}

/**
 * One verified off-block production: a character reachable only via a
 * Shift/AltGr layer, pinned to the physical key that produces it.
 *
 * Evidence basis (repo-only, never guessed): every entry below is stated in
 * docs/levels-04-tier-0-per-layout-finger-maps.md, which was compiled from
 * multiple cross-agreeing sources per layout. Anything that file flags as
 * varying by driver, or does not cover at all, has NO entry here and stays
 * `unknown` — see docs/LAYOUT-VERIFICATION.md for the per-character account.
 * Live-driver confirmation is still required for every entry (human action).
 */
export interface KeyProduction {
  /** Physical code of the base key (the AltGr/Shift reach target). */
  code: string;
  /** Finger for that physical key, as stated by the same source. */
  finger: Finger;
  /** Modifier held in addition to the base key. */
  via: "shift" | "altgr";
}

function productions(entries: Array<[string, KeyProduction]>): ReadonlyMap<string, KeyProduction> {
  return new Map(entries);
}

/**
 * Verified Shift/AltGr-layer productions per layout (ENG-06 E8 support).
 * Read with productionFor(); a character with no entry here is unattributed
 * (unknown), never inherited from another layout's driver.
 */
export const VERIFIED_PRODUCTIONS: Record<
  Layout,
  ReadonlyMap<string, KeyProduction>
> = Object.freeze({
  "qwerty-us": productions([]),
  // levels-04 §1.1: `@` and `"` are SWAPPED vs US — `@` is Shift+' on the
  // apostrophe key (right pinky), `"` is Shift+2 (left ring); `£` is
  // Shift+3 (left middle). `#`, `\`, `|`, `~`, `` ` `` vary by exact
  // keyboard/driver and `[`/`]`/`{`/`}` share the (unverified-in-repo) US
  // bracket positions — all stay unknown.
  "qwerty-uk": productions([
    ["@", { code: "Quote", finger: "rp", via: "shift" }],
    ['"', { code: "Digit2", finger: "lr", via: "shift" }],
    ["£", { code: "Digit3", finger: "lm", via: "shift" }],
  ]),
  dvorak: productions([]),
  "colemak-dh": productions([]),
  // levels-04 §2.2 (Windows AZERTY) + §2.1 digit fingers (0→rp, 3→lm,
  // 4/5→li — a second, independent in-doc confirmation of each finger).
  // `{`/`[` use the commonly-cited legacy mapping; the file flags that the
  // 2019-revised French standard maps some of these differently, so live
  // confirmation is load-bearing here. `]`/`}`/`|` vary by exact driver,
  // `~`/`^` are dead keys, `\`/`€` are not covered — all stay unknown.
  azerty: productions([
    ["@", { code: "Digit0", finger: "rp", via: "altgr" }],
    ["#", { code: "Digit3", finger: "lm", via: "altgr" }],
    ["{", { code: "Digit4", finger: "li", via: "altgr" }],
    ["[", { code: "Digit5", finger: "li", via: "altgr" }],
  ]),
  // levels-04 §3.2 (German QWERTZ) with the §3.2 cross-checked confirmation
  // that `@[]{} ` all require AltGr because umlauts/ß occupy the QWERTY
  // symbol positions. `\` needs the dedicated ß key (no stable `code`
  // across drivers), `|` the extra ISO key, `~` is a dead key, `€`/`ü`/`ä`
  // are not covered — all stay unknown.
  qwertz: productions([
    ["@", { code: "KeyQ", finger: "lp", via: "altgr" }],
    ["[", { code: "Digit8", finger: "rm", via: "altgr" }],
    ["]", { code: "Digit9", finger: "rr", via: "altgr" }],
    ["{", { code: "Digit7", finger: "ri", via: "altgr" }],
    ["}", { code: "Digit0", finger: "rp", via: "altgr" }],
  ]),
}) as Record<Layout, ReadonlyMap<string, KeyProduction>>;

/** Verified production for (layout, character), or null (unknown, never guessed). */
export function productionFor(layout: Layout, ch: string): KeyProduction | null {
  return VERIFIED_PRODUCTIONS[layout].get(ch) ?? null;
}
