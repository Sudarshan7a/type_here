/**
 * Live results for the manual engine test. Every number here comes from
 * packages/engine — nothing is computed in the view.
 */
import type { EngineResult } from "@realtype/engine";

function fmt(value: number | null, digits = 1): string {
  // E9: a metric that could not be computed is "not available", never 0.
  return value === null || !Number.isFinite(value) ? "n/a" : value.toFixed(digits);
}

export function ResultsPanel({ result }: { result: EngineResult }) {
  const s = result.summary;
  const hasData = result.details.durationMs > 0;
  return (
    <section aria-labelledby="results-title" data-testid="results">
      <h2 id="results-title">Results</h2>
      {!hasData && (
        <p data-testid="no-data">
          No timing data yet — speed metrics are not available for a test with no keystrokes.
        </p>
      )}
      <dl className="metrics">
        <div>
          <dt>Net WPM</dt>
          <dd data-testid="net-wpm">{fmt(s.netWpm)}</dd>
        </div>
        <div>
          <dt>Raw WPM</dt>
          <dd data-testid="raw-wpm">{fmt(s.rawWpm)}</dd>
        </div>
        <div>
          <dt>Gross WPM</dt>
          <dd data-testid="gross-wpm">{fmt(s.grossWpm)}</dd>
        </div>
        <div>
          <dt>Keystroke accuracy</dt>
          <dd data-testid="keystroke-accuracy">{fmt(s.keystrokeAccuracy)}%</dd>
        </div>
        <div>
          <dt>Final accuracy</dt>
          <dd data-testid="final-accuracy">{fmt(s.finalAccuracy)}%</dd>
        </div>
        <div>
          <dt>Keystrokes per character</dt>
          <dd data-testid="kspc">{fmt(s.kspc, 2)}</dd>
        </div>
        <div>
          <dt>Consistency</dt>
          <dd data-testid="consistency">{fmt(s.consistency)}</dd>
        </div>
        <div>
          <dt>Best 5-second burst</dt>
          <dd data-testid="burst-wpm">{fmt(s.burstWpm)}</dd>
        </div>
        <div>
          <dt>Mean key interval</dt>
          <dd data-testid="iki">{s.ikiMeanMs === null ? "n/a" : `${fmt(s.ikiMeanMs, 0)} ms`}</dd>
        </div>
        <div>
          <dt>Rollover</dt>
          <dd data-testid="rollover">{fmt(s.rolloverRatio * 100, 1)}%</dd>
        </div>
      </dl>
      <p className="note" data-testid="engine-stamp">
        model {s.modelVersion} · scored {result.details.durationMs} ms ·{" "}
        {result.details.printableKeystrokes} printable keystrokes
        {s.flags.length > 0 ? ` · flags: ${s.flags.join(", ")}` : ""}
      </p>
    </section>
  );
}
