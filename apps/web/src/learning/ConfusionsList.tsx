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

export function ConfusionsList({ confusions, onDrill }: ConfusionsListProps) {
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
        LRN-05's typo arrows on the keyboard: the confusion drawn onto a
        stylised home row. Decorative and hidden from assistive tech — the list
        above is the accessible form, and a map of arrows has nothing to add to
        it. Never colour-only: the arrow direction and the labelled keys carry
        the meaning.
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
      </div>
    </div>
  );
}
