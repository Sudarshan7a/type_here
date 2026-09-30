/**
 * Telemetry error (M0-07). Messages must only ever contain allowlisted
 * vocabulary (event names, property names) — never property VALUES, so a
 * thrown error itself cannot leak user data.
 */

export type TelemetryErrorCode =
  | "unknown_event"
  | "unknown_property"
  | "missing_property"
  | "invalid_property_value"
  | "too_many_properties"
  | "invalid_props"
  | "invalid_config";

export class TelemetryError extends Error {
  readonly code: TelemetryErrorCode;

  constructor(message: string, code: TelemetryErrorCode) {
    super(message);
    this.name = "TelemetryError";
    this.code = code;
  }
}
