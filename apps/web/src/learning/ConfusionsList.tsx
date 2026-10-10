import { COPY } from "../copy";
import type { Confusion } from "./errors";

/**
 * LRN-05's confusions list and the typo arrows on the keyboard.
 *
 * The list is a table, because it is a table: character, what was typed, how
 * often. The arrows are drawn from a QWERTY-US row map rather than an image, so
 * they scale with the type and need no asset the bundle gate would count.
 *
 * WHAT IT DOES NOT DO is show every mistyped character. A single slip in a
 * 300-character passage is noise, and a list of noise teaches nobody anything —
 * `notableConfusions` filters first, and this component says so when the list
 * is empty rather than inventing an entry.
 */

export interface ConfusionsListProps {
  /** The notable confusions, already filtered and ordered. */
  readonly confusions: readonly Confusion[];
  /** Start a drill on this confusion (the one-click drill). */
  readonly onDrill: (confusion: Confusion) => void;
}

/**
 * QWERTY-US neighbour rows, for the typo arrows: the key either side of each
 * letter is the one a mis-aimed finger usually lands on instead.
 *
 * QWERTY-US is named deliberately: this is the layout the rows describe, and
 * the app's other five layouts do not share them (LOC-01). A keyboard on a
 * different layout needs different rows rather than a silently wrong map.
 */
const QWERTY_NEIGHBOURS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  q: ["w", "a"],
  w: ["q", "e", "s"],
  e: ["w", "r", "d"],
  r: ["e", "t", "f"],
  t: ["r", "y", "g"],
  y: ["t", "u", "h"],
  u: ["y", "i", "j"],
  i: ["u", "o", "k"],
  o: ["i", "p", "l"],
  p: ["o", "l"],
  a: ["q", "s", "z"],
  s: ["a", "w", "d", "x"],
  d: ["s", "e", "f", "c"],
  f: ["d", "r", "g", "v"],
  g: ["f", "t", "h", "b"],
  h: ["g", "y", "j", "n"],
  j: ["h", "u", "k", "m"],
  k: ["j", "i", "l"],
  l: ["k", "o", "p"],
  z: ["a", "x"],
  x: ["z", "s", "c"],
  c: ["x", "d", "v"],
  v: ["c", "f", "b"],
  b: ["v", "g", "n"],
  n: ["b", "h", "m"],
  m: ["n", "j"],
});

/** The QWERTY-US home row, in order, so a character can be placed on it. */
const HOME_ROW = "asdfjkl;";

/**
 * Fill a `{slot}` template. Copy stays a plain string table and the UI does
 * the filling, so a missing slot is a visible bug in one place rather than a
 * silent "undefined" rendered to someone.
 */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

/** Place a character on a stylised home row, for the typo arrows. */
function keyStyle(char: string): React.CSSProperties | undefined {
  if (char === "") return undefined;
  const lower = char.toLowerCase();
  const index = HOME_ROW.indexOf(lower);
  if (index === -1) return undefined;
  // Spread the letters across the row's width, evenly.
  return { left: `${(index / (HOME_ROW.length - 1)) * 100}%` };
}

/**
 * The pairs to draw as arrows: a confusion where the typed character is a
 * QWERTY-US neighbour of the intended one.
 *
 * Only neighbours are drawn. A confusion between two keys that are nowhere
 * near each other is real, but it is not a finger-slip, and the map's claim is
 * specifically about fingers landing one key off — drawing every confusion
 * onto the same row would make that claim false.
 */
function neighbourMixups(
  confusions: readonly Confusion[],
): readonly { readonly key: string; readonly from: number; readonly to: string }[] {
  const out: { key: string; from: number; to: string }[] = [];
  const seen = new Set<string>();
  for (const c of confusions) {
    if (c.kind !== "substitution" || c.typed === null) continue;
    const intended = c.intended.toLowerCase();
    const typed = c.typed.toLowerCase();
    const neighbours = QWERTY_NEIGHBOURS[intended];
    if (neighbours === undefined || !neighbours.includes(typed)) continue;
    const key = `${intended}->${typed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const index = HOME_ROW.indexOf(intended);
    if (index === -1) continue;
    out.push({
      key,
      // Position as a percentage of the row, matching the keys' own placement.
      from: (index / (HOME_ROW.length - 1)) * 100,
      to: typed,
    });
  }
  return out;
}

export function ConfusionsList({ confusions, onDrill }: ConfusionsListProps) {
  const mixups = neighbourMixups(confusions);
  if (confusions.length === 0) {
    return (
      <p className="note" data-testid="confusions-empty">
        {COPY.learning.emptyNote}
      </p>
    );
  }

  return (
    // The wrapper is the list itself; the RESULTS PANEL's section wraps it with
    // its own title and intro. Two different jobs, two different testids.
    <div className="confusions-list-wrap" data-testid="confusions-body">
      <ul className="confusions-list" data-testid="confusions-list">
        {confusions.map((c) => {
          const key = `${c.kind}:${c.intended}->${c.typed ?? ""}`;
          return (
            <li key={key} className="confusion" data-testid="confusion" data-kind={c.kind}>
              <span className="confusion-chars" data-testid="confusion-chars">
                <span className="confusion-intended">{c.intended === "" ? "—" : c.intended}</span>
                <span className="confusion-arrow" aria-hidden="true">
                  →
                </span>
                <span className="confusion-typed">{c.typed ?? "—"}</span>
              </span>
              <span className="confusion-kind" data-testid="confusion-kind">
                {COPY.learning.kindNames[c.kind]}
              </span>
              <span className="confusion-count" data-testid="confusion-count">
                {fill(COPY.learning.count, { n: String(c.count) })}
              </span>
              {/* LRN-05: one-click drill, per confusion. */}
              <button
                type="button"
                className="confusion-drill"
                data-testid="confusion-drill"
                onClick={() => onDrill(c)}
              >
                {COPY.learning.drillAction}
              </button>
            </li>
          );
        })}
      </ul>

      {/*
        LRN-05's typo arrows on the keyboard.
        Decorative and hidden from assistive tech — the list above is the
        accessible form, and a map of arrows has nothing to add to it. Never
        colour-only: the arrow direction and the labelled keys carry the
        meaning.

        Each letter key is drawn at its position on the home row, and where a
        confusion's typed character is a NEIGHBOUR of the intended one (QWERTY-US,
        the layout the app classifies LOC-01's default as) an arrow is drawn
        between the two keys. That is the whole insight of the map: most of
        these mistakes are a finger landing one key off, and seeing the two
        keys next to each other makes it obvious.
      */}
      <div className="typo-map" data-testid="typo-map" aria-hidden="true">
        <span className="typo-map-label">{COPY.learning.mapLabel}</span>
        <div className="typo-row">
          {[...HOME_ROW].map((char) => (
            <span key={char} className="typo-key" style={keyStyle(char)} data-char={char}>
              {char}
            </span>
          ))}
        </div>
        {/* The arrows, over the keys: intended → the neighbour that was typed. */}
        <div className="typo-arrows">
          {mixups.map((m) => (
            <span
              key={m.key}
              className="typo-arrow"
              style={{ left: `${m.from}%` }}
              data-arrow={m.key}
            >
              → {m.to}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
