import { useState } from "react";
import type { EngineResult } from "@realtype/engine";

import { COPY } from "../copy";
import { TypingSurface } from "../TypingSurface";
import { BASELINE_SEGMENTS, segmentText, type BaselineSegmentId } from "./segments";

/**
 * The programmer baseline flow (M6-05 / PRG-17).
 *
 * Five timed segments, back to back: prose, symbols, numbers, naming, code.
 * Each runs on the ordinary TypingSurface with its own countdown, so every
 * segment is scored by the same engine through the same path as practice —
 * the flow adds sequencing and a summary, never a second scoring
 * implementation.
 *
 * Between segments is a plain "next" interstitial, not an auto-advance: a
 * ten-minute test that yanks the text out from under someone mid-breath is a
 * test people abandon. At the end is the Code Skill Profile: per-segment
 * figures and the three slowest, which is what M6-05's output asks for.
 */

export interface SegmentScore {
  readonly segment: BaselineSegmentId;
  readonly label: string;
  readonly netWpm: number;
  readonly finalAccuracy: number;
}

export interface ProgrammerBaselineProps {
  /** Which retest round this is. 0 the first time; the text advances with it. */
  readonly round?: number;
  /** The profile is complete. */
  readonly onComplete: (scores: readonly SegmentScore[]) => void;
  /** Leave the flow entirely. */
  readonly onExit: () => void;
}

/** Fill a `{slot}` template. Copy stays a string table; the UI does the fill. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export function ProgrammerBaseline({ round = 0, onComplete, onExit }: ProgrammerBaselineProps) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [scores, setScores] = useState<readonly SegmentScore[]>([]);
  const [between, setBetween] = useState(false);

  const segment = BASELINE_SEGMENTS[segmentIndex];
  if (segment === undefined) {
    // All five done. The profile belongs to the parent, which stores it; this
    // component has delivered its last segment and has nothing left to show.
    return null;
  }

  const target = segmentText(segment.id, round);

  const handleFinish = (result: EngineResult): void => {
    const score: SegmentScore = {
      segment: segment.id,
      label: segment.label,
      netWpm: result.summary.netWpm,
      finalAccuracy: result.summary.finalAccuracy,
    };
    const next = [...scores, score];
    setScores(next);
    if (segmentIndex + 1 >= BASELINE_SEGMENTS.length) {
      onComplete(next);
      return;
    }
    setBetween(true);
  };

  if (between) {
    const done = scores[scores.length - 1]!;
    const upcoming = BASELINE_SEGMENTS[segmentIndex + 1]!;
    return (
      <section className="baseline-between" data-testid="baseline-between">
        <p className="baseline-between-done" data-testid="baseline-between-done">
          {fill(COPY.programmerBaseline.segmentDone, {
            label: done.label,
            wpm: done.netWpm.toFixed(1),
          })}
        </p>
        <p className="baseline-between-next" data-testid="baseline-between-next">
          {fill(COPY.programmerBaseline.nextUp, {
            label: upcoming.label,
            seconds: String(upcoming.seconds),
          })}
        </p>
        <p>
          <button
            type="button"
            data-variant="primary"
            data-testid="baseline-next"
            onClick={() => {
              setSegmentIndex((i) => i + 1);
              setBetween(false);
            }}
          >
            {COPY.programmerBaseline.next}
          </button>{" "}
          <button type="button" data-testid="baseline-exit" onClick={onExit}>
            {COPY.programmerBaseline.exit}
          </button>
        </p>
      </section>
    );
  }

  return (
    <div className="baseline-segment" data-testid="baseline-segment">
      <p className="baseline-progress" data-testid="baseline-progress">
        {fill(COPY.programmerBaseline.progress, {
          n: String(segmentIndex + 1),
          total: String(BASELINE_SEGMENTS.length),
          label: segment.label,
          seconds: String(segment.seconds),
        })}
      </p>
      <TypingSurface
        key={`${target.id}:${round}`}
        passage={target}
        errorMode="free"
        layout="qwerty-us"
        autoIndent={false}
        autoPair={false}
        timeLimitSec={segment.seconds}
        logMode="classic"
        onFinish={handleFinish}
      />
      <p>
        <button type="button" data-testid="baseline-exit" onClick={onExit}>
          {COPY.programmerBaseline.exit}
        </button>
      </p>
    </div>
  );
}
