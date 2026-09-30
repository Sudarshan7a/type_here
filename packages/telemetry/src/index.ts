/**
 * RealType telemetry (M0-07): allowlisted event tracking + privacy scrubbing.
 * Zero runtime dependencies, zero vendor SDKs — a sink is injected. Never
 * sends keystroke content, free text, or raw errors anywhere (keystroke-
 * privacy skill; AGENTS.md rule 4).
 */

export const TELEMETRY_VERSION = "0.0.1";

export {
  EVENT_SCHEMAS,
  MAX_PROPS_PER_EVENT,
  validateProps,
  type EventName,
  type EventPropsMap,
  type PropDef,
  type TrackedProps,
  DRILL_KINDS,
  DURATION_BUCKETS,
  ERROR_MODES,
  EXPERIMENTS,
  EXPERIMENT_VARIANTS,
  FEEDBACK_CATEGORIES,
  GOAL_METRICS,
  GOAL_PERIODS,
  LAYOUTS,
  MODES,
  PAUSE_TRIGGERS,
  PLAN_SOURCES,
  REJECTION_REASONS,
  SETTING_NAMES,
  SETTING_VALUES,
  WEAKSPOT_KINDS,
} from "./events.js";
export {
  BLOCKED_FIELD_RE,
  ENVIRONMENTS,
  isValidEnvironment,
  isValidName,
  isValidRelease,
  isValidRequestId,
  isValidRoute,
  isValidStatus,
  sanitizeStack,
  scrubError,
  type Environment,
  type ScrubContext,
  type ScrubbedError,
} from "./scrub.js";
export { InMemoryTelemetrySink, type TelemetrySink, type TrackPayload } from "./sink.js";
export { createTelemetry, type TelemetryClient, type TelemetryOptions } from "./telemetry.js";
export { TelemetryError, type TelemetryErrorCode } from "./telemetry-error.js";
