/**
 * RealType shared data contracts (M1-01). Zod schemas — shape validation only.
 * NO metric formulas live here (AGENTS.md rule 3: metrics live only in
 * packages/engine). Bumping any contract shape bumps CONTRACT_VERSION.
 */

export const CONTRACT_VERSION = "1.3.0";

export { LIMITS } from "./limits.js";
export { KeyEventSchema, type KeyEvent } from "./key-event.js";
export {
  LogMarkerSchema,
  LogMarkerKindSchema,
  type LogMarker,
  type LogMarkerKind,
} from "./log-marker.js";
export { TypingTextSchema, type TypingText } from "./typing-text.js";
export {
  LayoutSchema,
  TypingSettingsSchema,
  ErrorModeSchema,
  type Layout,
  type TypingSettings,
  type ErrorMode,
} from "./typing-settings.js";
export {
  InputLogSchema,
  InputLogMetaSchema,
  ModeSchema,
  TextHashSchema,
  VersionSchema,
  type InputLog,
  type InputLogMeta,
  type Mode,
  type TextHash,
} from "./input-log.js";
export { ResultSummarySchema, type ResultSummary } from "./result-summary.js";
export { SessionSchema, type Session } from "./session.js";

/** Kept for compatibility with the M0-04 harness stub until M1 replaces it. */
export const SCHEMAS_VERSION = "0.0.1";
