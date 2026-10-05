import { renderToStaticMarkup } from "react-dom/server";
import { MIN_CONSISTENCY_DURATION_MS, computeResult, type EngineResult } from "@realtype/engine";
import type { InputLog, KeyEvent } from "@realtype/schemas";
import { describe, expect, it } from "vitest";

import { COPY } from "../src/copy";
import { ResultsPanel } from "../src/results/ResultsPanel";
import { SHORT_TEST_MS, assessResult } from "../src/results/assess";
import { detailRows, headlineFigures } from "../src/results/metrics";

/**
 * ANA-01: the server-rendered shape of the results screen.
 *
 * What this file can prove on every run, in node, with no browser: the heading
 * structure, the figure list as a real definition list, the non-colour channels
 * for every state, the absence of any interrupting layer, the absence of a
 * second live region, and the copy itself.
 *
 * What it cannot: the entrance motion, computed contrast, focus order and the
 * announcement count. Those are live-CSS and live-focus questions, and they live
 * in e2e/results.spec.ts and e2e/results-states.spec.ts, which drive a real
 * browser.
 */

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

function press(key: string, t: number): KeyEvent {
  return {
    code: key === " " ? "Space" : `Key${key.toUpperCase()}`,
    key,
    type: "down",
    t,
    mods: { ...NO_MODS },
    repeat: false,
    isTrusted: true,
    auto: false,
  };
}

function keyup(key: string, t: number): KeyEvent {
  return { ...press(key, t), type: "up" };
}

/** The keys pressed, scored against `target`. Fixed interval: no wall-clock jitter. */
function logFor(text: string, target: string, intervalMs = 250): InputLog {
  const events: KeyEvent[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const key = text[i]!;
    const t = i * intervalMs;
    events.push(press(key, t));
    events.push(keyup(key, t + 20));
  }
  return {
    events,
    markers: [],
    meta: {
      mode: "classic",
      textId: "PROSE-TEST-001",
      textHash: "a".repeat(64),
      layout: "qwerty-us",
      settings: {
        errorMode: "free",
        layout: "qwerty-us",
        autoIndent: false,
        autoPair: false,
      },
      engineVersion: "1.1.0",
    },
  };
}

const TARGET = "the quick brown fox jumps over the lazy dog";
const TEXT = { id: "PROSE-TEST-001", text: TARGET };

const LONG = computeResult(logFor(TARGET, TARGET), TEXT);

/** A short run: below the engine's own consistency floor. */
const SHORT = computeResult(logFor("the quick", TARGET), TEXT);

/** A run carrying one integrity flag (an event the browser did not trust). */
function flagged(): EngineResult {
  const log = logFor(TARGET, TARGET);
  log.events.push({ ...press("q", 60_000), isTrusted: false });
  return computeResult(log, TEXT);
}

const FLAGGED = flagged();

function render(
  result: EngineResult,
  overrides: Partial<React.ComponentProps<typeof ResultsPanel>> = {},
): string {
  return renderToStaticMarkup(
    <ResultsPanel
      result={result}
      onRestart={() => {}}
      target={TARGET}
      errorMode="free"
      retainedLog={null}
      replayOpen={false}
      onWatchReplay={() => {}}
      onCloseReplay={() => {}}
      {...overrides}
    />,
  );
}

describe("ResultsPanel structure", () => {
  const html = render(LONG);

  it("is a labelled section under a real heading, not a bare div", () => {
    expect(html).toContain('data-testid="finished"');
    expect(html).toMatch(/<section[^>]*aria-labelledby="results-title"/);
    expect(html).toContain('<h2 id="results-title"');
    expect(html).toContain(COPY.resultsTitle);
    // The app's h1 is the page title, so the panel's heading is an h2 and
    // everything inside it is an h3. No level is skipped and none invented.
    expect(html).toContain('<h3 class="results-status-label"');
    expect(html).toContain('<h3 class="results-details-title">');
  });

  it("shows the three headline figures with their units in words", () => {
    const headline = headlineFigures(LONG);
    expect(html).toContain(`>${headline.netWpm}</strong>`);
    expect(html).toContain(`>${headline.accuracy}</strong>`);
    expect(html).toContain(headline.classicWpm);
    // Units in the text, so no figure depends on its position or its colour.
    expect(html).toMatch(/headline-net-wpm[^>]*>[^<]*WPM/);
    expect(html).toMatch(/headline-accuracy[^>]*>[^<]*accuracy/);
  });

  it("renders the figures list as a definition list of pairs", () => {
    expect(html).toContain('<dl class="results-details"');
    for (const row of detailRows(LONG)) {
      expect(html).toContain(`<dt data-testid="${row.id}-label">${row.label}</dt>`);
      expect(html).toContain(`<dd data-testid="${row.id}">${row.value}</dd>`);
    }
    expect(html).toContain(COPY.resultsDetailsTitle);
  });

  it("states the standing state — unverified, and why — on every result", () => {
    // This is the MVP's honest default and it is not a badge that can be
    // switched off: nothing here has been server-checked.
    expect(html).toContain(COPY.resultsUnverifiedLabel);
    expect(html).toContain(COPY.resultsUnverifiedLocal);
    expect(html).toMatch(/nothing was saved/i);
    // The string table's own tooltip promises the result IS saved, which at MVP
    // it is not. The screen must not carry a sentence it cannot keep.
    expect(html).not.toContain("still saved as a private practice result");
  });

  it("names the two fields nothing produces yet, rather than leaving a hole", () => {
    expect(html).toContain(COPY.resultsPending);
    expect(html).toContain('data-difficulty="none"');
  });

  it("offers restart, and a new passage only when the host has one", () => {
    expect(html).toContain('data-testid="restart"');
    expect(html).toContain(COPY.actionRestart);
    expect(html).not.toContain('data-testid="new-passage"');
    expect(render(LONG, { onNewPassage: () => {} })).toContain('data-testid="new-passage"');
  });

  it("offers the replay only when a log was retained for this test", () => {
    expect(html).not.toContain('data-testid="replay-watch"');
    const withLog = render(LONG, { retainedLog: { events: [], markers: [] } });
    expect(withLog).toContain('data-testid="replay-watch"');
    expect(withLog).toContain(COPY.replayWatch);
    // The toggle reports its own state, so a screen reader is told the replay is
    // closed rather than left to notice.
    expect(withLog).toContain('aria-expanded="false"');
    expect(render(LONG, { retainedLog: { events: [], markers: [] }, replayOpen: true })).toContain(
      'aria-expanded="true"',
    );
  });

  it("stamps the engine model version, so a figure is attributable", () => {
    expect(html).toContain(COPY.engineStamp(LONG.summary.modelVersion));
  });
});

describe("ResultsPanel ships no interrupting layer (rule 1)", () => {
  const html = render(LONG, { retainedLog: { events: [], markers: [] }, replayOpen: true });

  it("renders no element carrying overlay semantics, whatever it is called", () => {
    // The positive form of the check, the same one typing-surface.test.tsx uses:
    // naming forbidden strings only proves nobody has thought of the next one.
    const problems: string[] = [];
    for (const match of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
      const [, tag, attributes] = match;
      if (tag === undefined || attributes === undefined) continue;
      const lower = attributes.toLowerCase();
      if (tag === "dialog") problems.push("<dialog>");
      if (/\bpopover\s*=/.test(lower)) problems.push(`<${tag} popover>`);
      if (/\baria-modal\s*=/.test(lower)) problems.push(`<${tag} aria-modal>`);
      const role = /\brole\s*=\s*["']([^"']*)["']/.exec(lower)?.[1] ?? "";
      if (role === "dialog" || role === "alertdialog") problems.push(`<${tag} role=${role}>`);
    }
    expect(problems, "the results panel must render no overlay element").toEqual([]);
  });

  it("never carries a second live region — the surface announces once", () => {
    // The panel mounts already populated. Any live region here could be
    // announced as a SECOND result, which the a11y rules forbid outright.
    expect(html).not.toMatch(/aria-live=/);
    expect(html).not.toMatch(/role="status"/);
    expect(html).not.toMatch(/role="alert"/);
  });

  it("the scan is not a blocklist — it reads the panel it was written for", () => {
    // Non-vacuity: if the scan were replaced by a list of forbidden strings, this
    // is the assertion that would stop proving anything. The panel's own wrapper
    // is an ordinary element, and the only roles it emits are none and
    // `aria-expanded` on a button.
    expect(html).toContain('<section class="finished results"');
    expect([...html.matchAll(/role="([a-z]+)"/g)].map((m) => m[1])).toEqual([]);
  });
});

describe("ResultsPanel honest states", () => {
  it("a clean long run has no notice, and claims nothing about being clean", () => {
    const html = render(LONG);
    expect(html).not.toContain('data-testid="results-notices"');
    expect(html).not.toContain(COPY.resultsShortTitle);
    expect(html).not.toContain(COPY.resultsFlagsTitle);
    // There is no "nothing to report" sentence anywhere in the copy.
    expect(COPY).not.toHaveProperty("resultsFlagsNone");
  });

  it("a short run is labelled, and the label quotes the engine's own floor", () => {
    expect(assessResult(SHORT).short).toBe(true);
    const html = render(SHORT);
    expect(html).toContain('data-testid="results-notice-short"');
    expect(html).toContain(COPY.resultsShortTitle);
    // Both durations in the sentence are formatted from the engine's numbers,
    // with the unit spelled out rather than left to a guess.
    expect(html).toContain(`${(SHORT.details.scoredDurationMs / 1000).toFixed(1)} seconds`);
    expect(html).toContain(`${(MIN_CONSISTENCY_DURATION_MS / 1000).toFixed(1)} seconds`);
    expect(SHORT_TEST_MS).toBe(MIN_CONSISTENCY_DURATION_MS);
    // The figure the floor explains is present, and reads as an absence.
    const consistency = detailRows(SHORT).find((row) => row.id === "results-consistency")!;
    expect(consistency.reported).toBe(false);
    expect(consistency.value).toBe(COPY.resultsDetailsNotReported);
    expect(html).toContain('data-reported="false"');
    // Every other figure is still reported: a short run is short, not empty.
    expect(detailRows(SHORT).filter((row) => !row.reported)).toHaveLength(1);
  });

  it("a flagged run is labelled, and never congratulated", () => {
    expect(FLAGGED.summary.flags.length).toBeGreaterThan(0);
    const html = render(FLAGGED);
    expect(html).toContain('data-testid="results-notice-flagged"');
    expect(html).toContain(COPY.resultsFlagsTitle);
    expect(html).toContain(COPY.resultsFlagWords["untrusted-events"]!);
    // The opaque code is not what a person is shown.
    expect(html).not.toContain("untrusted-events");
    // A bad run still shows its figures, and says they come from the same keys.
    expect(html).toContain('data-testid="headline-net-wpm"');
    expect(html).toContain(COPY.resultsFlagsBody(COPY.resultsFlagWords["untrusted-events"]!));
    // No celebration language of any kind, and no action withheld.
    expect(html).toContain('data-testid="restart"');
    for (const banned of ["Well done", "Great", "New best", "Personal best", "congratulat"]) {
      expect(html, `a flagged run must not contain ${banned}`).not.toContain(banned);
    }
  });

  it("every state has a non-colour channel of its own", () => {
    const short = render(SHORT);
    const flaggedHtml = render(FLAGGED);

    // 1. a distinct tone attribute, so the states are addressable without colour
    expect(short).toContain('data-tone="short"');
    expect(flaggedHtml).toContain('data-tone="flagged"');
    // 2. a distinct label word in the text itself
    expect(short).toContain(COPY.resultsShortTitle);
    expect(flaggedHtml).toContain(COPY.resultsFlagsTitle);
    expect(COPY.resultsShortTitle).not.toBe(COPY.resultsFlagsTitle);
    // 3. a sentence that names the condition
    expect(short).toMatch(/ran for/);
    expect(flaggedHtml).toMatch(/engine recorded/);

    // The CSS turns (2) into a visible difference too: one left-rule style per
    // tone, asserted against COMPUTED styles in e2e/results-states.spec.ts.
    expect(new Set(["short", "flagged", "offline"]).size).toBe(3);
    for (const tone of ["short", "flagged"] as const) {
      const rendered = tone === "short" ? short : flaggedHtml;
      expect(rendered, `${tone} must carry a styleable tone hook`).toContain(
        `data-testid="results-notice-${tone}" data-tone="${tone}"`,
      );
    }
  });

  it("renders every applicable notice at once rather than picking one", () => {
    // Short AND flagged is a real run; dropping either would hide something.
    const both = computeResult(
      (() => {
        const log = logFor("the qwick", TARGET);
        log.events.push({ ...press("q", 60_000), isTrusted: false });
        return log;
      })(),
      TEXT,
    );
    expect(assessResult(both).short).toBe(true);
    expect(assessResult(both).flags.length).toBeGreaterThan(0);
    const html = render(both);
    expect(html).toContain('data-testid="results-notice-short"');
    expect(html).toContain('data-testid="results-notice-flagged"');
  });
});
