/**
 * Telemetry client (M0-07). track() validates against the event allowlist
 * before anything reaches the sink; trackError() is the ONLY route to a
 * sink's captureError and it always passes through scrubError first.
 */

import { validateProps, type EventName, type EventPropsMap } from "./events.js";
import {
  ENVIRONMENTS,
  scrubError,
  type Environment,
  type ScrubContext,
  type ScrubbedError,
} from "./scrub.js";
import { InMemoryTelemetrySink, type TelemetrySink } from "./sink.js";
import { TelemetryError } from "./telemetry-error.js";

export interface TelemetryClient {
  /**
   * Track an allowlisted event with allowlisted props. Unknown event names
   * and unknown/invalid properties are rejected at compile time AND runtime.
   */
  track<E extends EventName>(event: E, props: EventPropsMap[E]): void;
  /**
   * Scrub an error down to the allowlist and forward the scrubbed result to
   * the sink. The only captureError entry point; never sends raw errors.
   */
  trackError(err: unknown, context?: ScrubContext): ScrubbedError | null;
  readonly sink: TelemetrySink;
}

export interface TelemetryOptions {
  /** Defaults to an in-memory no-op sink. */
  readonly sink?: TelemetrySink;
  /** Semver-core release tag applied to scrubbed errors. */
  readonly release?: string;
  /** Deployment environment applied to scrubbed errors. */
  readonly environment?: Environment;
}

export function createTelemetry(options: TelemetryOptions = {}): TelemetryClient {
  if (options.release !== undefined && !/^\d+\.\d+\.\d+$/.test(options.release)) {
    throw new TelemetryError("release must be a semver core (x.y.z)", "invalid_config");
  }
  if (
    options.environment !== undefined &&
    !(ENVIRONMENTS as readonly string[]).includes(options.environment)
  ) {
    throw new TelemetryError(
      `environment must be one of ${ENVIRONMENTS.join(", ")}`,
      "invalid_config",
    );
  }
  const sink = options.sink ?? new InMemoryTelemetrySink();
  const defaults: ScrubContext = {
    release: options.release,
    environment: options.environment,
  };
  return {
    sink,
    track(event: string, props: unknown): void {
      sink.captureEvent({
        event: event as EventName,
        props: validateProps(event, props),
        timestamp: Date.now(),
      });
    },
    trackError(err: unknown, context?: ScrubContext): ScrubbedError | null {
      const scrubbed = scrubError(err, { ...defaults, ...context });
      if (scrubbed !== null) sink.captureError(scrubbed);
      return scrubbed;
    },
  };
}
