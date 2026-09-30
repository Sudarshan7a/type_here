// Scratch verification (Session 4, Block C) — derives finger/hand assignment
// from PHYSICAL KEY POSITION data only. No chapter prose is consulted, and
// nothing here ships: the point is to independently check the map the engine
// currently hardcodes, per the Session 4 LAYOUT PROTOCOL.
//
// The only inputs are (a) the ANSI/physical key grid of each layout and
// (b) the conventional touch-typing finger assignment by COLUMN on a
// standard board, which is a property of the hardware grid, not of any
// layout's character assignment.

/** Physical board grid: column 0 is the leftmost key of the home row's block. */
const BOARD_COLUMNS = 10; // 10 keys per row for the alphanumeric block

/**
 * Conventional touch-typing fingers by physical column, rows are
 * top (numbers row is excluded: t/g/b and y/h/n are on the letter rows).
 * Left hand: pinky ring middle index | Right hand: index middle ring pinky.
 */
const FINGERS_BY_COLUMN = ["lp", "lr", "lm", "li", "li", "ri", "ri", "rm", "rr", "rp"];

/** The characters each layout places on each physical key, row by row. */
export const LAYOUTS = {
  "qwerty-us": ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"],
  "qwerty-uk": ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"], // QWERTY-UK is QWERTY-US + AltGr
  dvorak: ["',.pyfgcrl", "aoeuidhtns", ";qjkxbmwvz"],
  colemak: ["qwfpgjluy;", "arstdhneio", "zxcvbkm,./"],
  "colemak-dh": ["qwfpbjluy;", "arstgmneio", "zxcvhdk,./"],
  azerty: ["azertyuiop", "qsdfghjklm", "wxcvbn,;:!"],
  qwertz: ["qwertzuiopü", "asdfghjklöä", "yxcvbnm,.-"],
};

/** Characters that only exist via AltGr/dead keys on the given layout. */
export const ALTGR_ONLY = {
  azerty: new Set(["@", "#", "{", "[", "|", "\\", "^", "€"]),
  qwertz: new Set(["ü", "ö", "ä", "€"]),
  "qwerty-uk": new Set(["€", "@", "#", "\\", "|", "~", "^", "[", "{", "`"]),
  dvorak: new Set([]),
  colemak: new Set([]),
  "colemak-dh": new Set([]),
  "qwerty-us": new Set([]),
};

export function fingerOf(layout, ch) {
  const rows = LAYOUTS[layout];
  if (rows === undefined) return null;
  for (let r = 0; r < rows.length; r++) {
    const i = rows[r].indexOf(ch);
    if (i >= 0) {
      if (i >= BOARD_COLUMNS) return null; // off the standard 10-column block
      return FINGERS_BY_COLUMN[i];
    }
  }
  return null;
}

export function handOf(layout, ch) {
  const f = fingerOf(layout, ch);
  if (f === null) return null;
  return f.startsWith("l") ? "left" : "right";
}

/** Every character the layout can produce without AltGr, with its finger. */
export function mapLayout(layout) {
  const rows = LAYOUTS[layout];
  const out = new Map();
  if (rows === undefined) return out;
  const altgr = ALTGR_ONLY[layout] ?? new Set();
  for (const row of rows) {
    for (let i = 0; i < row.length && i < BOARD_COLUMNS; i++) {
      const ch = row[i];
      if (altgr.has(ch)) continue; // AltGr-dependent: marked unknown later
      out.set(ch, FINGERS_BY_COLUMN[i]);
    }
  }
  return out;
}
