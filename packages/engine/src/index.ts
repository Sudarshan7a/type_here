/**
 * RealType typing engine (open-core, MIT).
 *
 * The framework-agnostic typing engine and metrics library shared by the web
 * client and the API server. All metric formulas live here and only here
 * (AGENTS.md rule 3): changing one requires bumping ENGINE_MODEL_VERSION and
 * updating /how-we-calculate.
 *
 * No DOM: this package runs unchanged in the browser and in Node, which is
 * what makes the server-side recompute authoritative.
 */

export {
  ENGINE_MODEL_VERSION,
  IKI_GAP_EXCLUSION_MS,
  MIN_CONSISTENCY_DURATION_MS,
  BURST_WINDOW_MS,
  computeFromEvents,
  type ComputeOptions,
  type EngineDetails,
  type EngineResult,
} from "./metrics.js";

export { perMinuteWpm } from "./wpm.js";

export { sanitizeSnippet } from "./sanitize.js";

export { pausedMs, pausedSpans, scoredDurationMs } from "./pauses.js";

export { computeLiveSummary, type LiveSummary, type LiveSummaryOptions } from "./live-summary.js";

export {
  CHAR_STATES,
  charStatesForModel,
  correctStateCount,
  deriveCharStates,
  type CharState,
  type CharStateOptions,
} from "./char-states.js";

export {
  filterEvents,
  integrityFlags,
  isBackspace,
  isDeadKey,
  isScoringPress,
  type FilteredEvents,
  type IntegrityFlags,
} from "./input-filter.js";

export {
  applyPress,
  bufferText,
  correctCharsInFinalText,
  createTextModel,
  finalText,
  graphemeLength,
  segmentGraphemes,
  type ErrorMode,
  type PressOutcome,
  type TextModel,
} from "./text-model.js";

export { framesForLog, type ReplayFrame, type ReplayOptions, type ReplayResult } from "./replay.js";

export {
  DEFAULT_PAUSE_TIMEOUT_MS,
  SESSION_STATES,
  TypingStateMachine,
  createStateMachine,
  type SessionEvent,
  type SessionMode,
  type SessionState,
  type StateMachineOptions,
} from "./state-machine.js";

export {
  alignText,
  type AlignmentResult,
  type ErrorKind,
  type Insertion,
  type Omission,
  type Substitution,
  type Transposition,
} from "./alignment.js";

export {
  OUTLIER_MULTIPLE,
  aggregateBigram,
  fingerTag,
  type AggregateResult,
  type FingerTag,
  type Sample,
} from "./aggregation.js";

export {
  PASTE_BURST_CODE,
  SINGLE_OUTLIER_CODE,
  SUSTAINED_FLOOR_CODE,
  flagPasteBurst,
  flagSustainedFloor,
  singleOutliers,
  windowMeans,
  type PasteBurstResult,
  type SingleOutlier,
  type SingleOutlierResult,
  type SustainedFloorResult,
} from "./plausibility.js";

import type { InputLog, TypingText } from "@realtype/schemas";

import { computeFromEvents, type EngineResult } from "./metrics.js";

/**
 * The single entry point the client and the server both call: replay a
 * captured InputLog against its text and return the full result.
 */
export function computeResult(log: InputLog, text: TypingText): EngineResult {
  return computeFromEvents(text.text, log.events, log.meta.settings.errorMode, {
    markers: log.markers,
  });
}
