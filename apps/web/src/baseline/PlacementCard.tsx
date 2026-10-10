import { COPY } from "../copy";
import { retestDueAt, type Placement, type PlacementBand } from "./placement";
import type { BaselineRecord } from "./storage";

/**
 * MOD-05 / LRN-01: what the app says once a baseline has been measured.
 *
 * It lives BELOW the results panel, in normal flow, covering nothing — the
 * typing surface stays usable and untouched (AGENTS.md rule 1). It carries no
 * focus trap, no dialog, no overlay semantics, and it is not a live region:
 * the surface's single polite announcer is still the only thing announced, so
 * a screen-reader user hears the result once and can then read this at their
 * own pace.
 *
 * WHAT THIS CARD IS ALLOWED TO SAY
 *
 * Two numbers, a band, and what produced them. Never an outcome: no "you will
 * get faster", no "master X in a week" (rule 9). The band is where the surface
 * starts the visitor; the card says so, and the override is right there
 * because being placed wrongly is a real thing that happens.
 */

export interface PlacementCardProps {
  /** The placement the just-finished baseline produced. */
  placement: Placement;
  /** The stored record, when one exists — drives the retest line. */
  stored: BaselineRecord | null;
  /** Change the starting band by hand (LRN-01's manual override). */
  onChooseBand: (band: PlacementBand) => void;
  /** Take the baseline again. Advances the passage, per M4-08 item 4. */
  onRetake: () => void;
  /** Leave the baseline flow and keep the current setting. */
  onSkip: () => void;
}

/** The three bands, as the corpus orders them. */
const BANDS: readonly PlacementBand[] = ["easy", "typical", "hard"];

/**
 * Fill a `{slot}` template. Copy stays a plain string table — the same shape
 * `results/metrics.ts` uses — and the UI does the filling, so a missing slot is
 * a visible bug in one place rather than a silent NaN rendered to a user.
 */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export function PlacementCard({
  placement,
  stored,
  onChooseBand,
  onRetake,
  onSkip,
}: PlacementCardProps) {
  const dueAt = stored === null ? null : retestDueAt(stored.takenAtMs);
  const dueLabel =
    dueAt === null
      ? null
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(dueAt));

  return (
    <section className="placement" aria-labelledby="placement-title" data-testid="placement">
      <h3 id="placement-title" data-testid="placement-title">
        {COPY.placement.title}
      </h3>

      <p className="placement-figures" data-testid="placement-figures">
        {fill(COPY.placement.measured, {
          wpm: placement.netWpm.toFixed(1),
          accuracy: placement.finalAccuracy.toFixed(1),
        })}
      </p>

      <p className="placement-band" data-testid="placement-band">
        {fill(COPY.placement.recommendation, {
          band: COPY.placement.bandNames[placement.band],
        })}
      </p>

      <p className="note" data-testid="placement-basis">
        {COPY.placement.basis}
      </p>

      <div className="placement-override">
        <span className="placement-override-label" id="placement-override-label">
          {COPY.placement.overrideLabel}
        </span>
        {/*
          A radio group rather than a select: three choices, all visible, and
          the current choice readable without opening anything. One tab stop,
          exactly like the onboarding questions.
        */}
        <div
          role="radiogroup"
          aria-labelledby="placement-override-label"
          className="placement-bands"
        >
          {BANDS.map((band) => (
            <label key={band} className="placement-band-option">
              <input
                type="radio"
                name="placement-band"
                value={band}
                checked={placement.band === band}
                data-testid={`placement-band-${band}`}
                onChange={() => onChooseBand(band)}
              />
              {COPY.placement.bandNames[band]}
            </label>
          ))}
        </div>
      </div>

      {dueLabel !== null && (
        <p className="note" data-testid="placement-retest">
          {fill(COPY.placement.retest, { date: dueLabel })}
        </p>
      )}

      <p className="placement-actions">
        <button
          type="button"
          data-variant="primary"
          data-testid="placement-retake"
          onClick={onRetake}
        >
          {COPY.placement.retake}
        </button>
        <button type="button" data-testid="placement-skip" onClick={onSkip}>
          {COPY.placement.skip}
        </button>
      </p>
    </section>
  );
}
