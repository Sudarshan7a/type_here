/**
 * Which engine field each displayed figure comes from (ANA-01).
 *
 * This is the table that makes rule 3 auditable rather than aspirational. Every
 * number the results screen renders is reachable from here by following one row:
 * the row names an engine field, and the row that renders it does nothing else.
 * A figure cannot be added to the screen without appearing in this file, and a
 * figure here cannot silently point at something the server would not compute —
 * because every field it names is a field of `EngineResult`, the object
 * `computeResult` returns to the client and to the API alike.
 *
 * THE HEADLINE. §4.3 item 1 asks for net WPM, accuracy and classic WPM. The
 * engine's three speed figures are distinct and deliberately so:
 *
 *   rawWpm   — printable keystrokes ÷ 5 ÷ minutes. Counts attempts, not results.
 *   grossWpm — every character produced ÷ 5 ÷ minutes. No error subtraction:
 *              the "classic WPM" a test page usually shows beside the real one.
 *   netWpm   — correct characters in the final text ÷ 5 ÷ minutes.
 *
 * `grossWpm` is the one the string table's "Classic WPM" note refers to, and the
 * mapping is written down here rather than left to whoever reads it later.
 */

import type { EngineResult } from "@realtype/engine";

import { COPY } from "../copy";
import { PRECISION, displayNumber, formatRatio, formatSpeed } from "./format";

/** One row of the figures list, with the engine field it reads. */
export interface DetailMetric {
  /** `data-testid` on the `<dd>`; also the key the tests assert against. */
  readonly id: string;
  /** Reads the engine's own value. Never arithmetic, never a second opinion. */
  readonly read: (result: EngineResult) => number | null;
  /** Decimal places the value is shown at. Display precision only. */
  readonly decimals: number;
  /** The string-table template, filled with the already formatted value. */
  readonly template: (value: string) => string;
}

/**
 * The figures list, in the order §4.3 item 5 lists them.
 *
 * `consistency` is read as null-able because the engine returns null below its
 * own documented minimum duration. That null is carried all the way to the
 * screen as words rather than being replaced with 0 or a dash.
 */
export const DETAIL_METRICS: readonly DetailMetric[] = [
  {
    id: "results-raw",
    read: (r) => r.summary.rawWpm,
    decimals: PRECISION.speed,
    template: COPY.resultsDetailsRaw,
  },
  {
    id: "results-consistency",
    read: (r) => r.summary.consistency,
    decimals: PRECISION.percent,
    template: COPY.resultsDetailsConsistency,
  },
  {
    id: "results-kspc",
    read: (r) => r.summary.kspc,
    decimals: PRECISION.ratio,
    template: COPY.resultsDetailsKspc,
  },
  {
    id: "results-rollover",
    read: (r) => r.summary.rolloverRatio,
    decimals: PRECISION.percent,
    template: COPY.resultsDetailsRollover,
  },
  {
    id: "results-burst",
    read: (r) => r.summary.burstWpm,
    decimals: PRECISION.speed,
    template: COPY.resultsDetailsBurst,
  },
];

/** A rendered row of the figures list, split for a `<dt>`/`<dd>` pair. */
export interface DetailRow {
  readonly id: string;
  /** The label half, e.g. "Best 5-second burst". */
  readonly label: string;
  /** The value half, with its unit, e.g. "71.2 WPM". */
  readonly value: string;
  /** False when the engine had no value and the row reads as not-reported. */
  readonly reported: boolean;
}

/**
 * Split a rendered table string into its label and value halves.
 *
 * The string table writes these as one string — "Raw: {value} WPM" — because that
 * is how they read on screen and in the table. A `<dl>` needs them apart so a
 * screen reader announces the pair as a pair. Splitting on the FIRST ": " is
 * therefore the honest way to have both: the source of truth stays one string,
 * and `tests/results-metrics.test.ts` asserts that rejoining the two halves
 * reproduces the table's own render character for character.
 */
export function splitAtLabel(rendered: string): { label: string; value: string } {
  const at = rendered.indexOf(": ");
  if (at === -1) return { label: rendered, value: "" };
  return { label: rendered.slice(0, at), value: rendered.slice(at + 2) };
}

/** Every row of the figures list, in order, with the engine's value or its absence. */
export function detailRows(result: EngineResult): DetailRow[] {
  return DETAIL_METRICS.map((metric) => {
    const raw = metric.read(result);
    const formatted = raw === null ? null : displayNumber(raw, metric.decimals);
    const rendered = metric.template(formatted ?? COPY.resultsDetailsNotReported);
    return { id: metric.id, ...splitAtLabel(rendered), reported: formatted !== null };
  });
}

/** The three headline figures, each with its unit already attached. */
export interface HeadlineFigures {
  /** Net WPM — the primary number, with "WPM". */
  readonly netWpm: string;
  /** Final accuracy — with "% accuracy". */
  readonly accuracy: string;
  /** Classic (gross) WPM — the transparency figure beside the headline. */
  readonly classicWpm: string;
}

/**
 * The headline. Every value comes off the engine and is formatted at the stated
 * precision; nothing here adds a digit the engine did not produce.
 */
export function headlineFigures(result: EngineResult): HeadlineFigures {
  return {
    netWpm: COPY.headlineNetWpm(result.summary.netWpm),
    accuracy: COPY.headlineAccuracy(result.summary.finalAccuracy),
    classicWpm: COPY.resultsClassicWpm(formatSpeed(result.summary.grossWpm) ?? ""),
  };
}

/**
 * The figure the figures list reports for a named row, at that row's precision.
 *
 * Exported so a test can compare what was DISPLAYED against what the ENGINE
 * produced without going through the panel at all — which is the point: the
 * panel adds nothing between the two.
 */
export function metricValue(result: EngineResult, id: string): string | null {
  const metric = DETAIL_METRICS.find((row) => row.id === id);
  if (metric === undefined) return null;
  const raw = metric.read(result);
  if (raw === null) return null;
  if (metric.decimals === PRECISION.ratio) return formatRatio(raw);
  return displayNumber(raw, metric.decimals);
}
