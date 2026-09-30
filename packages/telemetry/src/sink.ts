/**
 * Vendor-adapter surface (M0-07). A real SDK is plugged in by implementing
 * TelemetrySink; captureError only accepts the scrubError-branded type, so
 * no sink path can receive unscrubbed errors. The telemetry client is the
 * only producer of sink calls, and its trackError path always routes through
 * scrubError first (tested).
 */

import type { EventName, TrackedProps } from "./events.js";
import type { ScrubbedError } from "./scrub.js";

export interface TrackPayload {
  readonly event: EventName;
  readonly props: TrackedProps;
  /** Epoch ms when track() was called (a finite number; safe to ship). */
  readonly timestamp: number;
}

export interface TelemetrySink {
  captureEvent(payload: TrackPayload): void;
  captureError(payload: ScrubbedError): void;
}

/**
 * Default sink: records calls in memory. Used by tests and as the no-op
 * default until a real (scrubbed-adapter) sink exists.
 */
export class InMemoryTelemetrySink implements TelemetrySink {
  readonly events: TrackPayload[] = [];
  readonly errors: ScrubbedError[] = [];

  captureEvent(payload: TrackPayload): void {
    this.events.push(payload);
  }

  captureError(payload: ScrubbedError): void {
    this.errors.push(payload);
  }

  clear(): void {
    this.events.length = 0;
    this.errors.length = 0;
  }
}
