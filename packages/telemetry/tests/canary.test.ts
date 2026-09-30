import { describe, expect, it } from "vitest";

import { createTelemetry, TelemetryError } from "../src/index";

import { RecordingSink } from "./track.test";

/**
 * M0-07 PRIVACY GATE. The canary simulates typed text. It must never reach
 * any sink through any path: not in messages, causes, extra context,
 * breadcrumbs, request bodies, context routes, or track() property values.
 */
const CANARY = "CANARY_TYPED_TEXT_9F3A";

function assertSinkClean(sink: RecordingSink): void {
  const all = JSON.stringify({ events: sink.events, errors: sink.errors });
  expect(all.includes(CANARY)).toBe(false);
}

describe("M0-07 canary: typed text never reaches a sink", () => {
  it("scrubs a canary in the error message", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink }).trackError(new Error(`user typed: ${CANARY}`));
    expect(sink.errors).toHaveLength(1);
    assertSinkClean(sink);
  });

  it("scrubs a canary in the error cause", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink }).trackError(
      new Error("outer", { cause: new Error(`inner ${CANARY}`, { cause: { typed: CANARY } }) }),
    );
    expect(sink.errors).toHaveLength(1);
    assertSinkClean(sink);
  });

  it("scrubs a canary in extra context attached to the error", () => {
    const sink = new RecordingSink();
    const err = Object.assign(new Error("x"), {
      extra: { note: `user note ${CANARY}`, userInput: CANARY },
      headers: { authorization: `Bearer ${CANARY}` },
      text: CANARY,
    });
    createTelemetry({ sink }).trackError(err);
    expect(sink.errors).toHaveLength(1);
    assertSinkClean(sink);
  });

  it("scrubs a canary in breadcrumbs", () => {
    const sink = new RecordingSink();
    const err = Object.assign(new Error("x"), {
      breadcrumbs: [
        { timestamp: 1, message: `typed "${CANARY}"` },
        { timestamp: 2, message: "ui click" },
      ],
    });
    createTelemetry({ sink }).trackError(err);
    expect(sink.errors).toHaveLength(1);
    assertSinkClean(sink);
  });

  it("scrubs a canary in a request body", () => {
    const sink = new RecordingSink();
    const err = Object.assign(new Error("x"), {
      request_body: { typed: CANARY, events: [CANARY] },
      body: CANARY,
    });
    createTelemetry({ sink }).trackError(err);
    expect(sink.errors).toHaveLength(1);
    assertSinkClean(sink);
  });

  it("scrubs a canary inside explicit context values (invalid route/request id)", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink }).trackError(new Error("x"), { route: `/${CANARY}` });
    createTelemetry({ sink }).trackError(new Error("x"), { request_id: CANARY });
    expect(sink.errors).toHaveLength(2);
    expect(sink.errors[0]?.route).toBeUndefined();
    expect(sink.errors[1]?.request_id).toBeUndefined();
    assertSinkClean(sink);
  });

  it("strips a canary hidden in a route query string", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink }).trackError(new Error("x"), {
      route: `/results?typed=${CANARY}`,
      status: 500,
      request_id: "req-1",
    });
    expect(sink.errors[0]?.route).toBe("/results");
    assertSinkClean(sink);
  });

  it("scrubs a canary in an error stack path", () => {
    const sink = new RecordingSink();
    const err = new Error("x");
    err.stack = `Error: ${CANARY}\n    at f (C:\\app\\${CANARY}.js:1:1)`;
    createTelemetry({ sink }).trackError(err);
    expect(sink.errors).toHaveLength(1);
    assertSinkClean(sink);
  });

  it("rejects a canary track() property value outright (runtime)", () => {
    const sink = new RecordingSink();
    const telemetry = createTelemetry({ sink });
    const trackRaw = telemetry.track as (event: unknown, props: unknown) => void;
    expect(() =>
      trackRaw("test_started", { mode: CANARY, duration_bucket: "15s", error_mode: "free" }),
    ).toThrow(TelemetryError);
    expect(sink.events).toHaveLength(0);
    assertSinkClean(sink);
  });

  it("rejects a canary track() property value at compile time too", () => {
    const sink = new RecordingSink();
    const telemetry = createTelemetry({ sink });
    expect(() =>
      telemetry.track("test_started", {
        // @ts-expect-error free-text strings are rejected at compile time
        mode: CANARY,
        duration_bucket: "15s",
        error_mode: "free",
      }),
    ).toThrow(TelemetryError);
    expect(() =>
      telemetry.track("result_rejected", {
        // @ts-expect-error free-text strings are rejected at compile time
        reason: `oops ${CANARY}`,
        risk_score: 1,
      }),
    ).toThrow(TelemetryError);
    expect(sink.events).toHaveLength(0);
    assertSinkClean(sink);
  });

  it("drops blocked fields even when attached alongside valid ones", () => {
    const sink = new RecordingSink();
    const err = Object.assign(new Error("x"), {
      extra: { keystroke_log: [CANARY, CANARY, CANARY], request_id: "req-abc-123" },
    });
    createTelemetry({ sink }).trackError(err);
    expect(sink.errors[0]?.request_id).toBe("req-abc-123");
    assertSinkClean(sink);
  });
});
