import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PlacementCard } from "../src/baseline/PlacementCard";
import { COPY } from "../src/copy";
import type { Placement } from "../src/baseline/placement";
import type { BaselineRecord } from "../src/baseline/storage";

/**
 * MOD-05 / LRN-01: the placement card, server-rendered.
 *
 * A browser test would drive the whole three-minute baseline; what this layer
 * proves cheaply, on every run, is the markup's honesty — that the card says
 * what it is allowed to say, that it is not a live region or an overlay, and
 * that it never congratulates. Those are exactly the claims a screenshot would
 * not show.
 */

const PLACEMENT: Placement = {
  band: "typical",
  netWpm: 34.6,
  finalAccuracy: 98.4,
  basis: "measured",
};

const STORED: BaselineRecord = {
  version: 1,
  netWpm: 34.6,
  finalAccuracy: 98.4,
  band: "typical",
  takenAtMs: 0,
};

function render(props: Partial<Parameters<typeof PlacementCard>[0]> = {}): string {
  return renderToStaticMarkup(
    <PlacementCard
      placement={props.placement ?? PLACEMENT}
      stored={props.stored === undefined ? STORED : props.stored}
      onChooseBand={props.onChooseBand ?? (() => {})}
      onRetake={props.onRetake ?? (() => {})}
      onSkip={props.onSkip ?? (() => {})}
    />,
  );
}

describe("placement card (MOD-05, LRN-01)", () => {
  it("names the two measured numbers and the band", () => {
    const html = render();
    expect(html).toContain("34.6");
    expect(html).toContain("98.4");
    expect(html).toContain("Typical");
    // The figures are the engine's, formatted once and in one place.
    expect(html).toContain('data-testid="placement-figures"');
    expect(html).toContain('data-testid="placement-band"');
  });

  it("says the band came from a measurement, not a guess", () => {
    const html = render();
    expect(html).toContain('data-testid="placement-basis"');
    expect(html).toContain("measurement");
    // The onboarding plan's provisional language must NOT appear here: this is
    // the one screen that has real evidence.
    expect(html).not.toContain("self-report");
    expect(html).not.toContain("provisional");
  });

  it("never promises an outcome (rule 9)", () => {
    const banned = /\b(faster|fastest|improve|improving|boost|master|perfect|hireable)\b/i;
    for (const band of ["easy", "typical", "hard"] as const) {
      const html = render({ placement: { ...PLACEMENT, band } });
      expect(banned.test(html), `claims-banned wording for ${band}: ${html}`).toBe(false);
    }
    expect(html_of()).not.toMatch(/well done|great job|nice work/i);
  });

  it("offers all three bands as a one-stop radio group", () => {
    const html = render();
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('data-testid="placement-band-easy"');
    expect(html).toContain('data-testid="placement-band-typical"');
    expect(html).toContain('data-testid="placement-band-hard"');
    // The current band is checked, so the state is visible without a control.
    const checked = html.match(/data-testid="placement-band-(\w+)"[^>]*checked/);
    expect(checked?.[1]).toBe("typical");
  });

  it("is not a live region and not an overlay (rule 1, a11y)", () => {
    const html = render();
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("aria-modal");
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("popover");
    expect(html).not.toContain("<dialog");
    // The surface's single polite announcer must stay the only live region on
    // the page even with this card mounted (results.spec.ts pins that count).
  });

  it("shows the retest date only when a baseline is stored", () => {
    expect(render({ stored: STORED })).toContain('data-testid="placement-retest"');
    expect(render({ stored: null })).not.toContain('data-testid="placement-retest"');
  });

  it("offers a retake and a skip, neither of them an outcome promise", () => {
    const html = render();
    expect(html).toContain('data-testid="placement-retake"');
    expect(html).toContain('data-testid="placement-skip"');
    expect(html).toContain(COPY.placement.retake);
    expect(html).toContain(COPY.placement.skip);
  });
});

/** The copy strings, scanned the same way the claims lint rule scans them. */
function html_of(): string {
  return Object.entries(COPY.placement)
    .filter(([key]) => typeof COPY.placement[key as keyof typeof COPY.placement] === "string")
    .map(([key]) => COPY.placement[key as keyof typeof COPY.placement] as string)
    .join(" ");
}
