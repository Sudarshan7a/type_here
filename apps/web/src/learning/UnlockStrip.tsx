import { COPY } from "../copy";
import { MAX_NEW_AT_ONCE, setLabel, upcomingChars, type UnlockState } from "./unlocking";

/**
 * LRN-03's visible half: what is unlocked, what is being learned, and what is
 * next.
 *
 * It renders as a row of character chips, because that is what the content
 * actually is — a set of characters — and a chip reads as "this exists" or
 * "this is not here yet" without needing a colour legend.
 *
 * The chip states are NOT colour-only (rule 7): a locked character is
 * strike-through text saying "not yet", so the information survives in a
 * screen reader and in forced colours alike.
 */

export interface UnlockStripProps {
  readonly state: UnlockState;
  /** Start a drill on the next new character (one click, LRN-03's promise). */
  readonly onDrillNext: (chars: string) => void;
}

/** Fill a `{slot}` template. Copy stays a string table; the UI does the fill. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export function UnlockStrip({ state, onDrillNext }: UnlockStripProps) {
  const next = upcomingChars(state);
  const learning = state.learningChars;

  return (
    <div className="unlock" data-testid="unlock">
      <div className="unlock-head">
        <span className="unlock-set" data-testid="unlock-set">
          {COPY.unlocking.nowLabel} {setLabel(state.activeSetId).toLowerCase()}
        </span>
        {/*
          LRN-03: at most two new keys at once, and the screen says how many it
          is currently showing. When both slots are filled the visitor is not
          being handed a third.
        */}
        {learning.length > 0 && (
          <span className="unlock-learning" data-testid="unlock-learning">
            {fill(COPY.unlocking.newLabel, {
              shown: String(learning.length),
              max: String(MAX_NEW_AT_ONCE),
            })}
          </span>
        )}
      </div>

      <ul className="unlock-chips" data-testid="unlock-chips">
        {learning.map((char) => (
          <li key={char} className="unlock-chip" data-state="new">
            <button
              type="button"
              className="unlock-chip-key"
              data-testid="unlock-new"
              onClick={() => onDrillNext(char)}
            >
              {char}
            </button>
            <span className="unlock-chip-label">{COPY.unlocking.newKey}</span>
          </li>
        ))}
        {next.length > 0 && (
          <li className="unlock-chip" data-state="next">
            <span className="unlock-chip-key" aria-hidden="true">
              {next[0]}
            </span>
            <span className="unlock-chip-label">{COPY.unlocking.nextKey}</span>
          </li>
        )}
      </ul>

      {/*
        What is already unlocked, as text rather than a wall of chips: a
        screen-reader user is told, not shown a grid they have to walk.
      */}
      <p className="note" data-testid="unlock-summary">
        {fill(COPY.unlocking.available, { n: String(state.availableChars.size) })}
        {state.unlockedSetIds.length > 1 && (
          <> {fill(COPY.unlocking.setsCleared, { n: String(state.unlockedSetIds.length - 1) })}</>
        )}
      </p>
    </div>
  );
}
