import { useState } from "react";

import { COPY } from "../copy";
import { MASTERY_TYPES, masteryFor, shouldAdvance, type MasteryType } from "./mastery";
import {
  barFor,
  readMasteryRecord,
  runsFor,
  setAutoAdvance,
  setMasteryBar,
} from "./mastery-storage";

/**
 * LRN-04's visible half: one row per content type, each naming its state.
 *
 * Best 3 of the last 5 above the bar is mastered; within reach is "almost
 * there"; anything else is practising. The bar is adjustable per type, and
 * auto-advance is a switch that defaults off — it proposes the next band when
 * something is mastered rather than routing there, because the surface never
 * changes mode without an explicit choice.
 *
 * Below the goal panel in normal flow, covering nothing, and not a live
 * region: the surface's single polite announcer stays the only announcement.
 */

export interface MasteryPanelProps {
  /** Bumped whenever a run is recorded, so the rows re-derive. */
  readonly version: number;
  /** The next band to propose when something is mastered (auto-advance). */
  readonly onAdvance?: (type: MasteryType) => void;
}

/** The state, in words a visitor can read without a legend. */
const STATE_COPY: Readonly<Record<string, string>> = {
  mastered: "Mastered",
  almost: "Almost there",
  practising: "Practising",
  unstarted: "Not started",
};

/** Fill a `{slot}` template. Copy stays a string table; the UI does the fill. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export function MasteryPanel({ version, onAdvance }: MasteryPanelProps) {
  // Read fresh on every version bump: the record is the source of truth, and
  // this component holds no copy that could disagree with it.
  const record = readMasteryRecord();
  const [, force] = useState(0);
  void version;
  void force;

  return (
    <section className="mastery" aria-labelledby="mastery-title" data-testid="mastery">
      <h3 id="mastery-title" data-testid="mastery-title">
        {COPY.mastery.title}
      </h3>

      <ul className="mastery-rows" data-testid="mastery-rows">
        {MASTERY_TYPES.map((type) => {
          const bar = barFor(record, type);
          const mastery = masteryFor(runsFor(record, type), bar);
          return (
            <li
              key={type}
              className="mastery-row"
              data-testid="mastery-row"
              data-state={mastery.state}
            >
              <span className="mastery-type" data-testid="mastery-type">
                {COPY.mastery.typeNames[type]}
              </span>
              <span className="mastery-state" data-testid="mastery-state">
                {STATE_COPY[mastery.state]}
              </span>
              {mastery.best3 !== null && (
                <span className="mastery-best" data-testid="mastery-best">
                  {fill(COPY.mastery.best, { wpm: mastery.best3.toFixed(1) })}
                </span>
              )}
              <label className="mastery-bar-label">
                {COPY.mastery.barLabel}
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={bar}
                  data-testid={`mastery-bar-${type}`}
                  onChange={(event) => {
                    setMasteryBar(type, Number(event.target.value) || 0);
                    force((n) => n + 1);
                  }}
                />
              </label>
              {shouldAdvance(mastery, record.autoAdvance) && onAdvance !== undefined && (
                <button
                  type="button"
                  data-testid={`mastery-advance-${type}`}
                  onClick={() => onAdvance(type)}
                >
                  {COPY.mastery.advance}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <label className="mastery-auto" htmlFor="mastery-auto-advance">
        <input
          id="mastery-auto-advance"
          type="checkbox"
          data-testid="mastery-auto-advance"
          checked={record.autoAdvance}
          onChange={(event) => {
            setAutoAdvance(event.target.checked);
            force((n) => n + 1);
          }}
        />
        {COPY.mastery.autoAdvance}
      </label>

      <p className="note" data-testid="mastery-note">
        {COPY.mastery.note}
      </p>
    </section>
  );
}
