import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { KeyEvent } from "@realtype/schemas";

import { COPY } from "../src/copy";
import { ReplayViewer } from "../src/ReplayViewer";

/**
 * Server-rendered structure of the replay viewer (ENG-08).
 *
 * Playback itself needs a real browser (rAF loop) and lives in
 * e2e/replay-viewer.spec.ts. What node CAN prove on every run is the static
 * contract: the controls exist with the string table's labels, the error
 * summary speaks in words, an empty log explains itself, and nothing in the
 * markup can cover the typing surface (no dialog, no fixed layer).
 */

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

function press(code: string, key: string, t: number): KeyEvent {
  return {
    code,
    key,
    type: "down",
    t,
    mods: { ...NO_MODS },
    repeat: false,
    isTrusted: true,
    auto: false,
  };
}

const EVENTS: readonly KeyEvent[] = [press("KeyO", "o", 0), press("KeyK", "k", 400)];

describe("ReplayViewer markup", () => {
  const html = renderToStaticMarkup(
    <ReplayViewer
      target="ok!"
      events={EVENTS}
      errorMode="free"
      expectedFinalText="ok"
      onClose={() => {}}
    />,
  );

  it("renders the playback controls with the string table's labels", () => {
    expect(html).toContain('data-testid="replay"');
    expect(html).toContain('data-testid="replay-play-pause"');
    expect(html).toContain(`aria-label="${COPY.replayPlay}"`);
    expect(html).toContain('data-testid="replay-restart"');
    expect(html).toContain(COPY.replayRestart);
    expect(html).toContain('data-testid="replay-speed"');
    expect(html).toContain(COPY.replaySpeedLabel);
    for (const speed of ["0.5×", "1×", "2×", "4×"]) expect(html).toContain(speed);
    expect(html).toContain('data-testid="replay-scrub"');
    expect(html).toContain('data-testid="replay-time"');
    expect(html).toContain('data-testid="replay-close"');
  });

  it("summarises errors in words beside the painted states", () => {
    // A wrong second press: 'x' against 'k' paints incorrect at position 2
    // (missed '!' at the end is not an error marker — only incorrect/extra are).
    const wrong = renderToStaticMarkup(
      <ReplayViewer
        target="ok!"
        events={[press("KeyO", "o", 0), press("KeyX", "x", 400)]}
        errorMode="free"
      />,
    );
    expect(wrong).toContain('data-testid="replay-errors"');
    expect(wrong).not.toContain(COPY.replayErrorsNone);
    expect(wrong).toMatch(/position 2/);
  });

  it("can never cover the typing surface", () => {
    // No dialog semantics and no fixed/sticky layer: the viewer is normal flow
    // under the finished panel. The live e2e (AC6 shape) asserts computed
    // styles; this pins the markup half.
    expect(html).not.toMatch(/role="dialog"/);
    expect(html).not.toMatch(/aria-modal/);
    expect(html).not.toMatch(/position:\s*fixed/);
    expect(html).not.toMatch(/position:\s*sticky/);
  });

  it("explains itself when no log was retained", () => {
    const empty = renderToStaticMarkup(<ReplayViewer target="ok!" events={[]} errorMode="free" />);
    expect(empty).toContain('data-testid="replay-unavailable"');
    expect(empty).toContain(COPY.replayUnavailable);
    expect(empty).not.toContain('data-testid="replay-play-pause"');
  });

  it("shows the corrupted note when the fold misses the finished text", () => {
    const bad = renderToStaticMarkup(
      <ReplayViewer
        target="ok!"
        events={EVENTS}
        errorMode="free"
        expectedFinalText="something else"
      />,
    );
    expect(bad).toContain('data-testid="replay-corrupted"');
    // The apostrophe in "doesn't" is entity-escaped by the renderer, so match
    // the unescaped tail of the sentence.
    expect(bad).toContain("may be incomplete");
  });
});
