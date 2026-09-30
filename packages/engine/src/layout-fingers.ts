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
