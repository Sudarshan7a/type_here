import { TelemetryError } from "./telemetry-error.js";

/**
 * Telemetry event allowlist (M0-07). Hand-rolled on purpose — no zod, no
 * runtime dependencies, no vendor SDKs.
 *
 * Privacy invariants (keystroke-privacy skill):
 * - Exactly the 22 allowlisted event names below are trackable; nothing else.
 * - Property values are numbers, booleans, or CLOSED-enum strings only.
 *   There is no free-text string anywhere in an analytics payload.
 * - Max 10 properties per event (runtime-enforced in validateProps and
 *   asserted by the registry invariant test).
 * - Adding an event or an enum value is a deliberate, reviewed code change
 *   to this file — that is the whole point of an allowlist.
 */

/** Practice modes (values match @realtype/schemas ModeSchema). */
export const MODES = ["classic", "real-world", "numbers-symbols", "custom", "code"] as const;

/** Test durations offered by the UI (coarse buckets, not raw values). */
export const DURATION_BUCKETS = ["15s", "30s", "60s", "120s"] as const;

/** Error handling modes (values match @realtype/schemas TypingSettings). */
export const ERROR_MODES = [
  "free",
  "must-correct",
  "stop-on-error",
  "no-backspace",
  "word-locked",
] as const;

/** Keyboard layouts (build order per decision D-log; values match schemas). */
export const LAYOUTS = [
  "qwerty-us",
  "qwerty-uk",
  "dvorak",
  "colemak-dh",
  "azerty",
  "qwertz",
] as const;

/** What triggered a pause (never a free-text reason). */
export const PAUSE_TRIGGERS = ["user", "blur", "visibility"] as const;

/** Changeable settings exposed in the UI. */
export const SETTING_NAMES = ["error_mode", "auto_indent", "auto_pair", "theme", "sound"] as const;

/** Closed union of every value any SETTING_NAMES item may take. */
export const SETTING_VALUES = [
  "free",
  "must-correct",
  "stop-on-error",
  "no-backspace",
  "word-locked",
  "on",
  "off",
  "enabled",
  "disabled",
  "dark",
  "light",
  "system",
] as const;

/** Server-side result rejection reasons (INT-* work, coarse). */
export const REJECTION_REASONS = [
  "invalid_signature",
  "expired_session",
  "implausible_metrics",
  "schema_mismatch",
  "duplicate",
] as const;

/** Weak-spot categories the analyzer can surface. */
export const WEAKSPOT_KINDS = [
  "key",
  "bigram",
  "trigram",
  "punctuation",
  "number",
  "symbol",
] as const;

/** Feedback categories. Comments themselves are never tracked, only has_comment. */
export const FEEDBACK_CATEGORIES = ["bug", "feature", "performance", "other"] as const;

/** Programmer-track drill generators (token-drill-generators skill). */
export const DRILL_KINDS = [
  "brackets",
  "operators",
  "strings",
  "escapes",
  "numbers",
  "number_systems",
  "identifiers",
  "naming_styles",
] as const;

/** Goal metrics a user may set. */
export const GOAL_METRICS = ["net_wpm", "accuracy", "consistency", "session_minutes"] as const;

/** Goal periods. */
export const GOAL_PERIODS = ["day", "week", "month"] as const;

/** Where the plan screen was opened from. */
export const PLAN_SOURCES = ["home", "results", "reminder"] as const;

/**
 * Experiment slugs. Registering a new experiment means editing this
 * allowlist — deliberately heavyweight so experiments cannot leak in.
 */
export const EXPERIMENTS = ["drill_order_v1", "feedback_prompt_v1"] as const;

/** Experiment arms. */
export const EXPERIMENT_VARIANTS = ["control", "treatment"] as const;

/**
 * Runtime property definitions: "number" | "boolean" | { enum }.
 * This object is the single source of truth for BOTH runtime validation and
 * the compile-time EventPropsMap below.
 */
export const EVENT_SCHEMAS = {
  test_started: {
    mode: { enum: MODES },
    duration_bucket: { enum: DURATION_BUCKETS },
    error_mode: { enum: ERROR_MODES },
  },
  test_finished: {
    mode: { enum: MODES },
    duration_bucket: { enum: DURATION_BUCKETS },
    net_wpm: "number",
    keystroke_accuracy: "number",
    error_count: "number",
    duration_ms: "number",
    verified: "boolean",
  },
  test_restarted: {
    mode: { enum: MODES },
    restart_count: "number",
  },
  test_paused: {
    mode: { enum: MODES },
    pause_ms: "number",
    trigger: { enum: PAUSE_TRIGGERS },
  },
  setting_changed: {
    setting: { enum: SETTING_NAMES },
    value: { enum: SETTING_VALUES },
  },
  layout_changed: {
    from_layout: { enum: LAYOUTS },
    to_layout: { enum: LAYOUTS },
  },
  offline_detected: {
    queue_size: "number",
  },
  queue_flushed: {
    flushed: "number",
    failed: "number",
    queue_size: "number",
  },
  result_submitted: {
    mode: { enum: MODES },
    net_wpm: "number",
    accuracy: "number",
    verified: "boolean",
    flagged: "boolean",
  },
  result_queued: {
    queue_size: "number",
  },
  result_rejected: {
    reason: { enum: REJECTION_REASONS },
    risk_score: "number",
  },
  weakspots_viewed: {
    spot_count: "number",
    top_kind: { enum: WEAKSPOT_KINDS },
  },
  replay_opened: {
    mode: { enum: MODES },
    duration_bucket: { enum: DURATION_BUCKETS },
  },
  feedback_submitted: {
    rating: "number",
    category: { enum: FEEDBACK_CATEGORIES },
    has_comment: "boolean",
  },
  baseline_started: {
    mode: { enum: MODES },
  },
  baseline_completed: {
    net_wpm: "number",
    accuracy: "number",
    improvement_wpm: "number",
  },
  drill_started: {
    drill_kind: { enum: DRILL_KINDS },
    level: "number",
  },
  drill_completed: {
    drill_kind: { enum: DRILL_KINDS },
    level: "number",
    accuracy: "number",
  },
  retest_started: {
    mode: { enum: MODES },
  },
  goal_set: {
    metric: { enum: GOAL_METRICS },
    target: "number",
    period: { enum: GOAL_PERIODS },
  },
  plan_opened: {
    week_index: "number",
    source: { enum: PLAN_SOURCES },
  },
  experiment_exposed: {
    experiment: { enum: EXPERIMENTS },
    variant: { enum: EXPERIMENT_VARIANTS },
  },
} as const satisfies Record<string, Record<string, PropDef>>;

export type PropDef = "number" | "boolean" | { readonly enum: readonly string[] };

/** Hard cap on properties per event (task contract: max 10). */
export const MAX_PROPS_PER_EVENT = 10;

export type EventName = keyof typeof EVENT_SCHEMAS;

/** Compile-time per-event property types, derived from EVENT_SCHEMAS. */
type PropValue<D> = D extends { readonly enum: readonly string[] }
  ? D["enum"][number]
  : D extends "number"
    ? number
    : D extends "boolean"
      ? boolean
      : never;

export type EventPropsMap = {
  readonly [E in keyof typeof EVENT_SCHEMAS]: {
    readonly [P in keyof (typeof EVENT_SCHEMAS)[E]]: PropValue<(typeof EVENT_SCHEMAS)[E][P]>;
  };
};

/** A validated props record as sent to the sink. */
export type TrackedProps = { readonly [key: string]: number | boolean | string };

function isValidValue(def: PropDef, value: unknown): boolean {
  if (typeof def === "string") {
    if (def === "number") {
      return typeof value === "number" && Number.isFinite(value);
    }
    return typeof value === "boolean";
  }
  return typeof value === "string" && def.enum.includes(value);
}

/**
 * Runtime validation. Throws TelemetryError on any violation; error messages
 * carry property/event NAMES from the allowlist vocabulary only, never values.
 */
export function validateProps(event: unknown, props: unknown): TrackedProps {
  if (typeof event !== "string") {
    throw new TelemetryError("telemetry event name must be a string", "unknown_event");
  }
  const schema: Record<string, PropDef> | undefined = (
    EVENT_SCHEMAS as Record<string, Record<string, PropDef> | undefined>
  )[event];
  if (schema === undefined) {
    throw new TelemetryError(`unknown telemetry event "${event}"`, "unknown_event");
  }
  if (props === null || typeof props !== "object" || Array.isArray(props)) {
    throw new TelemetryError(`props for "${event}" must be an object`, "invalid_props");
  }
  const keys = Object.keys(props);
  if (keys.length > MAX_PROPS_PER_EVENT) {
    throw new TelemetryError(
      `event "${event}" exceeds ${MAX_PROPS_PER_EVENT} properties`,
      "too_many_properties",
    );
  }
  const source = props as Record<string, unknown>;
  const out: Record<string, number | boolean | string> = {};
  for (const key of keys) {
    const def: PropDef | undefined = schema[key];
    if (def === undefined) {
      throw new TelemetryError(
        `unknown property "${key}" for event "${event}"`,
        "unknown_property",
      );
    }
    if (!isValidValue(def, source[key])) {
      throw new TelemetryError(
        `invalid value for property "${key}" on event "${event}"`,
        "invalid_property_value",
      );
    }
    out[key] = source[key] as number | boolean | string;
  }
  for (const key of Object.keys(schema)) {
    if (!(key in out)) {
      throw new TelemetryError(
        `missing property "${key}" for event "${event}"`,
        "missing_property",
      );
    }
  }
  return out;
}
