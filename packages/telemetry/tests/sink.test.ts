import { describe, expect, it } from "vitest";

import {
  createTelemetry,
  scrubError,
  TelemetryError,
  type ScrubContext,
  type ScrubbedError,
} from "../src/index";

import { RecordingSink } from "./track.test";

const ALLOWED_ERROR_KEYS = [
  "name",
  "stack",
  "release",
  "environment",
  "route",
  "status",
  "request_id",
] as const;

describe("M0-07 adapter: scrubError is a mandatory pre-send", () => {
  const release = "0.0.1";
  const environment = "dev";
  const config: ScrubContext = { release, environment };

  function dirtyError(): Error {
    const err = new Error("user typed: CANARY-ish", { cause: { secret: "CANARY-ish" } });
    Object.assign(err, { request_body: { typed: "CANARY-ish" }, headers: { auth: "x" } });
    err.stack = "Error: CANARY-ish\n    at f (C:\\Users\\me\\app\\x.js:1:1)";
    return err;
  }

  it("trackError forwards EXACTLY the scrubError output to the sink", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink, release, environment }).trackError(dirtyError());
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]).toEqual(scrubError(dirtyError(), config));
  });

  it("every error reaching a sink has only allowlisted keys", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink, release, environment }).trackError(dirtyError());
    const keys = Object.keys(sink.errors[0] ?? {});
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(ALLOWED_ERROR_KEYS as readonly string[]).toContain(key);
    }
  });

  it("sink captureError cannot even be CALLED with a raw error (compile time)", () => {
    const sink = new RecordingSink();
    // @ts-expect-error unscrubbed errors are not assignable to ScrubbedError
    sink.captureError(new Error("raw"));
    // @ts-expect-error scrubError returns null, not a raw error, when nothing is keepable
    sink.captureError(scrubError(42));
  });

  it("trackError returns null and skips the sink when nothing is keepable", () => {
    const sink = new RecordingSink();
    const result = createTelemetry({ sink }).trackError(42);
    expect(result).toBeNull();
    expect(sink.errors).toHaveLength(0);
  });

  it("track and trackError share the injected sink and do not cross-contaminate", () => {
    const sink = new RecordingSink();
    const telemetry = createTelemetry({ sink, release, environment });
    telemetry.track("offline_detected", { queue_size: 1 });
    telemetry.trackError(dirtyError());
    expect(sink.events).toHaveLength(1);
    expect(sink.errors).toHaveLength(1);
    expect(JSON.stringify(sink)).not.toContain("CANARY");
  });

  it("createTelemetry validates config eagerly", () => {
    expect(() => createTelemetry({ release: "latest" })).toThrowError(TelemetryError);
    expect(() => createTelemetry({ environment: "production" as "dev" })).toThrowError(
      TelemetryError,
    );
    try {
      createTelemetry({ release: "latest" });
    } catch (err) {
      expect((err as TelemetryError).code).toBe("invalid_config");
    }
  });

  it("defaults (release/environment) are applied to every scrubbed error", () => {
    const sink = new RecordingSink();
    createTelemetry({ sink, release, environment }).trackError(new Error("x"));
    const scrubbed: ScrubbedError | undefined = sink.errors[0];
    expect(scrubbed?.release).toBe(release);
    expect(scrubbed?.environment).toBe(environment);
  });
});
