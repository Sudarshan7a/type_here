import { describe, expect, it } from "vitest";

import {
  EVENT_SCHEMAS,
  MAX_PROPS_PER_EVENT,
  createTelemetry,
  type EventName,
  type EventPropsMap,
  type TelemetrySink,
  type TrackPayload,
  InMemoryTelemetrySink,
  TelemetryError,
  type ScrubbedError,
  type TelemetryErrorCode,
} from "../src/index";

/** A fake sink that records every call — used across telemetry tests. */
export class RecordingSink implements TelemetrySink {
  readonly events: TrackPayload[] = [];
  readonly errors: ScrubbedError[] = [];

  captureEvent(payload: TrackPayload): void {
    this.events.push(payload);
  }

  captureError(payload: ScrubbedError): void {
    this.errors.push(payload);
  }
}

/** Valid props for every allowlisted event (compile-checked). */
const SAMPLES = {
  test_started: { mode: "classic", duration_bucket: "15s", error_mode: "free" },
  test_finished: {
    mode: "classic",
    duration_bucket: "15s",
    net_wpm: 72.5,
    keystroke_accuracy: 96.2,
    error_count: 4,
    duration_ms: 15000,
    verified: true,
  },
  test_restarted: { mode: "code", restart_count: 2 },
  test_paused: { mode: "classic", pause_ms: 4200, trigger: "blur" },
  setting_changed: { setting: "theme", value: "dark" },
  layout_changed: { from_layout: "qwerty-us", to_layout: "dvorak" },
  offline_detected: { queue_size: 3 },
  queue_flushed: { flushed: 3, failed: 0, queue_size: 0 },
  result_submitted: {
    mode: "real-world",
    net_wpm: 65,
    accuracy: 98.1,
    verified: false,
    flagged: false,
  },
  result_queued: { queue_size: 1 },
  result_rejected: { reason: "implausible_metrics", risk_score: 0.87 },
  weakspots_viewed: { spot_count: 5, top_kind: "bigram" },
  replay_opened: { mode: "code", duration_bucket: "60s" },
  feedback_submitted: { rating: 4, category: "feature", has_comment: true },
  baseline_started: { mode: "classic" },
  baseline_completed: { net_wpm: 58, accuracy: 94.5, improvement_wpm: 6.5 },
  drill_started: { drill_kind: "brackets", level: 1 },
  drill_completed: { drill_kind: "operators", level: 5, accuracy: 91.2 },
  retest_started: { mode: "numbers-symbols" },
  goal_set: { metric: "net_wpm", target: 80, period: "week" },
  plan_opened: { week_index: 2, source: "results" },
  experiment_exposed: { experiment: "drill_order_v1", variant: "control" },
} satisfies { [E in EventName]: EventPropsMap[E] };

describe("M0-07 track(): allowlist registry", () => {
  it("has exactly the 22 authoritative event names, verbatim", () => {
    expect(Object.keys(EVENT_SCHEMAS)).toEqual([
      "test_started",
      "test_finished",
      "test_restarted",
      "test_paused",
      "setting_changed",
      "layout_changed",
      "offline_detected",
      "queue_flushed",
      "result_submitted",
      "result_queued",
      "result_rejected",
      "weakspots_viewed",
      "replay_opened",
      "feedback_submitted",
      "baseline_started",
      "baseline_completed",
      "drill_started",
      "drill_completed",
      "retest_started",
      "goal_set",
      "plan_opened",
      "experiment_exposed",
    ]);
  });

  it("enforces max 10 properties per event in the registry", () => {
    for (const [event, schema] of Object.entries(EVENT_SCHEMAS)) {
      expect(Object.keys(schema).length, event).toBeLessThanOrEqual(MAX_PROPS_PER_EVENT);
    }
  });

  it("only defines number/boolean/closed-enum property definitions", () => {
    for (const [event, schema] of Object.entries(EVENT_SCHEMAS)) {
      for (const [prop, def] of Object.entries(schema)) {
        if (typeof def === "string") {
          expect(["number", "boolean"], `${event}.${prop}`).toContain(def);
        } else {
          expect(def.enum.length, `${event}.${prop}`).toBeGreaterThan(0);
          expect(
            def.enum.every((v: unknown) => typeof v === "string"),
            `${event}.${prop}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("M0-07 track(): accepted events reach the chosen sink", () => {
  it("delivers all 22 events with valid props to the injected sink", () => {
    const sink = new RecordingSink();
    const telemetry = createTelemetry({ sink });
    for (const event of Object.keys(SAMPLES) as EventName[]) {
      telemetry.track(event, SAMPLES[event]);
    }
    expect(sink.events).toHaveLength(22);
    for (const payload of sink.events) {
      expect(SAMPLES[payload.event]).toEqual(payload.props);
      expect(typeof payload.timestamp).toBe("number");
      expect(Number.isFinite(payload.timestamp)).toBe(true);
    }
  });

  it("defaults to the in-memory sink when none is injected", () => {
    const telemetry = createTelemetry();
    telemetry.track("offline_detected", SAMPLES.offline_detected);
    const sink = telemetry.sink as InMemoryTelemetrySink;
    expect(sink).toBeInstanceOf(InMemoryTelemetrySink);
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.event).toBe("offline_detected");
  });

  it("InMemoryTelemetrySink.clear() empties both buffers", () => {
    const sink = new InMemoryTelemetrySink();
    sink.captureEvent({ event: "goal_set", props: SAMPLES.goal_set, timestamp: 1 });
    sink.captureError({ name: "FakeError" } as never);
    sink.clear();
    expect(sink.events).toHaveLength(0);
    expect(sink.errors).toHaveLength(0);
  });
});

describe("M0-07 track(): runtime rejection", () => {
  const telemetry = createTelemetry();
  const trackRaw = telemetry.track as (event: unknown, props: unknown) => void;

  function expectCode(code: TelemetryErrorCode, fn: () => void): void {
    let thrown: unknown;
    try {
      fn();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(TelemetryError);
    expect((thrown as TelemetryError).code).toBe(code);
  }

  it("rejects unknown events", () => {
    expectCode("unknown_event", () => trackRaw("haxxor", {}));
    expectCode("unknown_event", () => trackRaw(42, {}));
    expectCode("unknown_event", () => trackRaw(null, {}));
  });

  it("rejects unknown properties", () => {
    expectCode("unknown_property", () =>
      trackRaw("test_started", {
        mode: "classic",
        duration_bucket: "15s",
        error_mode: "free",
        extra: true,
      }),
    );
  });

  it("rejects missing required properties", () => {
    expectCode("missing_property", () =>
      trackRaw("test_started", { mode: "classic", duration_bucket: "15s" }),
    );
    expectCode("missing_property", () => trackRaw("test_started", {}));
  });

  it("rejects more than 10 properties even before unknown-property checks", () => {
    const props: Record<string, unknown> = {
      mode: "classic",
      duration_bucket: "15s",
      error_mode: "free",
    };
    for (let i = 0; i < 8; i++) props[`p${i}`] = true;
    expect(Object.keys(props)).toHaveLength(11);
    expectCode("too_many_properties", () => trackRaw("test_started", props));
  });

  it("rejects props that are not plain objects", () => {
    expectCode("invalid_props", () => trackRaw("test_started", null));
    expectCode("invalid_props", () => trackRaw("test_started", ["classic"]));
    expectCode("invalid_props", () => trackRaw("test_started", "classic"));
    expectCode("invalid_props", () => trackRaw("test_started", 15));
  });

  it("rejects non-number/boolean/enum-string values", () => {
    expectCode("invalid_property_value", () =>
      trackRaw("baseline_completed", { net_wpm: "90", accuracy: 95, improvement_wpm: 3 }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("result_submitted", {
        mode: "code",
        net_wpm: 90,
        accuracy: 95,
        verified: 1,
        flagged: false,
      }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("baseline_completed", { net_wpm: Number.NaN, accuracy: 95, improvement_wpm: 3 }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("baseline_completed", {
        net_wpm: Number.POSITIVE_INFINITY,
        accuracy: 95,
        improvement_wpm: 3,
      }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("baseline_completed", { net_wpm: null, accuracy: 95, improvement_wpm: 3 }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("test_started", {
        mode: { evil: true },
        duration_bucket: "15s",
        error_mode: "free",
      }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("test_started", { mode: "CLASSIC", duration_bucket: "15s", error_mode: "free" }),
    );
    expectCode("invalid_property_value", () =>
      trackRaw("feedback_submitted", { rating: 1, category: "complaint", has_comment: false }),
    );
  });
});

describe("M0-07 track(): compile-time rejection (@ts-expect-error)", () => {
  const telemetry = createTelemetry();
  const sink = telemetry.sink as InMemoryTelemetrySink;

  it("unknown event names do not compile", () => {
    // @ts-expect-error unknown event names are rejected at compile time
    expect(() => telemetry.track("totally_bogus_event", {})).toThrow(TelemetryError);
  });

  it("unknown properties do not compile", () => {
    expect(() =>
      telemetry.track("test_started", {
        mode: "classic",
        duration_bucket: "15s",
        error_mode: "free",
        // @ts-expect-error unknown properties are rejected at compile time
        surprise: 1,
      }),
    ).toThrow(TelemetryError);
  });

  it("missing required properties do not compile", () => {
    expect(() =>
      // @ts-expect-error missing required properties are rejected at compile time
      telemetry.track("goal_set", { metric: "net_wpm", period: "week" }),
    ).toThrow(TelemetryError);
  });

  it("free-text strings do not compile as enum values", () => {
    expect(() =>
      telemetry.track("feedback_submitted", {
        rating: 5,
        // @ts-expect-error free-text strings are not assignable to enum properties
        category: "free text!",
        has_comment: false,
      }),
    ).toThrow(TelemetryError);
  });

  it("wrong value kinds do not compile", () => {
    expect(() =>
      telemetry.track("feedback_submitted", {
        rating: 5,
        category: "bug",
        // @ts-expect-error a boolean property cannot receive a string
        has_comment: "yes",
      }),
    ).toThrow(TelemetryError);
    expect(() =>
      telemetry.track("baseline_completed", {
        // @ts-expect-error a number property cannot receive a boolean
        net_wpm: true,
        accuracy: 95,
        improvement_wpm: 3,
      }),
    ).toThrow(TelemetryError);
  });

  it("nothing reaches the sink from rejected compile-time cases", () => {
    expect(sink.events).toHaveLength(0);
  });
});
