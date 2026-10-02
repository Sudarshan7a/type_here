import type { ErrorMode, InputLog, KeyEvent, LogMarker, TypingText } from "@realtype/schemas";

/**
 * Shared builders for the synthetic ENG-* fixture logs (chapter-4 deep-dive
 * §4.2–§4.8). Fixtures are pure data: they import nothing from ../src and
 * validate against InputLogSchema in the fixture tests.
 */

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

/**
 * KeyboardEvent.code for every key used by the chapter fixtures and by the
 * typing-surface tests.
 *
 * The mapping is explicit and throws on anything unknown, on purpose: a fixture
 * that silently invents a `code` would score against a key that does not exist,
 * which is how a fixture ends up passing for the wrong reason.
 */
export function codeFor(key: string): string {
  if (key === " ") return "Space";
  if (key === "Backspace") return "Backspace";
  if (key === ".") return "Period";
  if (key === ",") return "Comma";
  if (key === "'") return "Quote";
  if (key === "(") return "Digit9";
  if (key === ")") return "Digit0";
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  // Shifted letters keep the physical key's code, which is what makes layout
  // attribution survive a wrong-case keystroke (chapter 4 E3).
  if (/^[A-Z]$/.test(key)) return `Key${key}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  throw new Error(`fixtures/helpers: no code mapping for key ${JSON.stringify(key)}`);
}

export interface KeyEventOptions {
  /** KeyboardEvent.repeat — OS key-repeat (G01). */
  repeat?: boolean;
  /** KeyboardEvent.isTrusted — synthetic events (E2 filter tests). */
  isTrusted?: boolean;
  /** Auto-inserted by the app, e.g. auto-pair (E2 filter tests). */
  auto?: boolean;
  /**
   * Explicit KeyboardEvent.code, bypassing codeFor. Needed for keys codeFor
   * cannot spell: dead keys (`Dead`), emoji/IME commits (no physical key),
   * and shifted symbols (`!` lives on `Digit1`). Existing callers omit it and
   * get byte-identical events to before.
   */
  code?: string;
  /** Shift held for this press (Shift-produced capitals, ENG-06 E3). */
  shift?: boolean;
  /**
   * IME composition state (CONTRACT 1.4.0). `true` = open-composition partial
   * (never scored); `false` = committed text (scores normally). Omitted =
   * field absent, i.e. every pre-1.4.0 fixture log shape, unchanged.
   */
  composition?: boolean;
}

export function keyDown(key: string, t: number, opts: KeyEventOptions = {}): KeyEvent {
  return {
    code: opts.code ?? codeFor(key),
    key,
    type: "down",
    t,
    mods: { ...NO_MODS, shift: opts.shift ?? false },
    repeat: opts.repeat ?? false,
    isTrusted: opts.isTrusted ?? true,
    auto: opts.auto ?? false,
    ...(opts.composition === undefined ? {} : { composition: opts.composition }),
  };
}

export function keyUp(key: string, t: number, opts: { code?: string } = {}): KeyEvent {
  return { ...keyDown(key, t, opts), type: "up" };
}

/**
 * Merge keydowns with constructed keyups at t + holdMs. Used where the
 * chapter tables list keydowns only — keyups are required for rollover
 * detection. holdMs < spacing in every such fixture → rollover 0
 * (construction documented in PROVENANCE.md).
 *
 * Keyups inherit each keydown's (possibly overridden) code, so sequences
 * with explicit codes (dead keys, emoji commits) pair correctly.
 */
export function withKeyups(downs: KeyEvent[], holdMs = 100): KeyEvent[] {
  const events = [...downs, ...downs.map((d) => keyUp(d.key, d.t + holdMs, { code: d.code }))];
  return events.sort((a, b) => a.t - b.t);
}

/** Derived from the contract, so a fixture can never name a mode the schema rejects. */
export type FixtureErrorMode = ErrorMode;

export interface BuildLogOptions {
  events: KeyEvent[];
  markers?: LogMarker[];
  textId: string;
  textHash: string;
  errorMode: FixtureErrorMode;
}

export function buildLog(opts: BuildLogOptions): InputLog {
  return {
    events: opts.events,
    ...(opts.markers === undefined ? {} : { markers: opts.markers }),
    meta: {
      mode: "classic",
      textId: opts.textId,
      textHash: opts.textHash,
      layout: "qwerty-us",
      settings: {
        errorMode: opts.errorMode,
        autoIndent: false,
        autoPair: false,
        layout: "qwerty-us",
      },
      engineVersion: "1.0.0",
    },
  };
}

export function typingText(id: string, text: string): TypingText {
  return { id, text };
}

/**
 * Expected values carried by every fixture, recomputed independently by
 * fixtures/recompute.mjs (see PROVENANCE.md). Compared with an absolute
 * float tolerance; null/exact fields must match exactly.
 */
export interface FixtureExpectation {
  summary: {
    rawWpm: number;
    grossWpm: number;
    netWpm: number;
    keystrokeAccuracy: number;
    finalAccuracy: number;
    kspc: number;
    rolloverRatio: number;
    consistency: number | null;
    burstWpm: number;
    ikiMeanMs: number | null;
    modelVersion: string;
    difficultyBand: "easy" | "typical" | "hard" | null;
    verified: boolean;
    flags: string[];
  };
  /** Absolute tolerance for the float comparisons. */
  tolerance: number;
  /** Extra EngineDetails assertions (exact unless arrays/strings). */
  details?: Record<string, number>;
  /** Provenance / decision notes surfaced on failure. */
  notes: string[];
}
