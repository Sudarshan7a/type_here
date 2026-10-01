/**
 * The RealType typing surface.
 *
 * Every number and every character state on this screen comes from
 * packages/engine. The view decides layout and nothing else: no metric formula,
 * no error-mode rule and no "is this character right?" logic lives here
 * (AGENTS.md rule 3).
 *
 * The per-keystroke path never calls setState (AGENTS.md rule 2). Keystrokes
 * write DOM attributes and text through refs, batched into one
 * requestAnimationFrame; React state changes only when the test starts, pauses or
 * finishes — a handful of times per test rather than once per character.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyPress,
  computeLiveSummary,
  computeResult,
  createTextModel,
  deriveCharStates,
  filterEvents,
  type EngineResult,
  type ErrorMode,
} from "@realtype/engine";

import { COPY } from "./copy";
import { InputCapture } from "./input-adapter";
import type { Passage } from "./passages";

/** What the surface is doing, as far as the user is concerned. */
export type SurfacePhase = "idle" | "running" | "paused" | "finished";

export interface TypingSurfaceProps {
  passage: Passage;
  errorMode: ErrorMode;
  /** Notified once per finished test, for the parent's history or telemetry. */
  onFinish?: (result: EngineResult) => void;
  /** Offered on the finished panel. Omitted when the host has nowhere to go. */
  onNewPassage?: () => void;
}

interface CharSlot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function TypingSurface({ passage, errorMode, onFinish, onNewPassage }: TypingSurfaceProps) {
  const [phase, setPhase] = useState<SurfacePhase>("idle");
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<EngineResult | null>(null);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const caretRef = useRef<HTMLDivElement>(null);
  const liveWpmRef = useRef<HTMLElement>(null);
  const liveAccRef = useRef<HTMLElement>(null);
  const captureRef = useRef<InputCapture | null>(null);
  /** What the user has produced so far, mirrored from the engine for painting. */
  const bufferRef = useRef<string[]>([]);
  const slotsRef = useRef<CharSlot[]>([]);
  const rafRef = useRef<number | null>(null);
  const pausedAtRef = useRef(0);

  const chars = useMemo(() => [...passage.text], [passage.text]);

  // ---- layout ------------------------------------------------------------
  //
  // Character offsets are measured once per text and again on resize, never
  // inside the keystroke path. A layout read per keystroke is a forced reflow,
  // which is exactly what the caret-rendering rules forbid and what the 16 ms
  // p95 input-to-paint budget (NFR-01) cannot afford.
  const measureSlots = useCallback(() => {
    const host = surfaceRef.current;
    if (host === null) return;
    const base = host.getBoundingClientRect();
    slotsRef.current = charRefs.current.map((span) => {
      if (span === null) return { left: 0, top: 0, width: 0, height: 0 };
      const r = span.getBoundingClientRect();
      return { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
    });
  }, []);

  const moveCaret = useCallback((index: number) => {
    const caret = caretRef.current;
    const slots = slotsRef.current;
    if (caret === null || slots.length === 0) return;
    const clamped = Math.min(Math.max(0, index), slots.length - 1);
    const slot = slots[clamped];
    if (slot === undefined) return;
    // Past the final character the caret rests at that character's right edge, so
    // a completed test leaves it after the text rather than on top of it.
    const atEnd = index >= slots.length;
    const x = atEnd ? slot.left + slot.width : slot.left;
    caret.style.transform = `translate3d(${x}px, ${slot.top}px, 0)`;
    caret.style.height = `${slot.height}px`;
  }, []);

  /**
   * The single place that writes character states, reading the engine's
   * derivation rather than comparing characters itself.
   */
  const paint = useCallback(
    (finished: boolean) => {
      const states = deriveCharStates(passage.text, bufferRef.current, { finished });
      for (let i = 0; i < charRefs.current.length; i++) {
        const span = charRefs.current[i];
        if (span === null || span === undefined) continue;
        span.setAttribute("data-char-state", states[i] ?? "untyped");
      }
      moveCaret(bufferRef.current.length);
    },
    [passage.text, moveCaret],
  );

  /** One frame performs every per-keystroke DOM write. */
  const scheduleFrame = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const capture = captureRef.current;
      if (capture === null) return;
      paint(phase === "finished");
      const live = computeLiveSummary(passage.text, capture.events, errorMode, {
        nowMs: performance.now(),
      });
      if (liveWpmRef.current !== null) {
        liveWpmRef.current.textContent = live.netWpm === null ? "n/a" : live.netWpm.toFixed(1);
      }
      if (liveAccRef.current !== null) {
        liveAccRef.current.textContent =
          live.keystrokeAccuracy === null ? "n/a" : `${live.keystrokeAccuracy.toFixed(1)}%`;
      }
    });
  }, [errorMode, paint, passage.text, phase]);

  const cancelFrame = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ---- lifecycle ---------------------------------------------------------

  /** Clear the attempt without stealing focus. Used on mount and on restart. */
  const resetAttempt = useCallback(() => {
    captureRef.current = new InputCapture();
    bufferRef.current = [];
    pausedAtRef.current = 0;
    cancelFrame();
    setResult(null);
    setPhase("idle");
    // Layout offsets belong to the text, not to the attempt, so they survive a
    // restart; the painting does not, so it is redrawn immediately.
    paint(false);
  }, [cancelFrame, paint]);

  const restart = useCallback(() => {
    resetAttempt();
    surfaceRef.current?.focus();
  }, [resetAttempt]);

  const finish = useCallback(() => {
    const capture = captureRef.current;
    if (capture === null) return;
    const text = { id: passage.id, text: passage.text };
    const log = capture.toLog({
      mode: "classic",
      textId: passage.id,
      textHash: textHashFor(passage.text),
      layout: "qwerty-us",
      errorMode,
    });
    cancelFrame();
    setPhase("finished");
    paint(true);
    const computed = computeResult(log, text);
    setResult(computed);
    onFinish?.(computed);
  }, [cancelFrame, errorMode, onFinish, passage.id, passage.text, paint]);

  /**
   * The live figures must keep moving while the user is idle mid-test, because
   * their speed really is falling. 250 ms is fast enough for a number the user
   * reads at a glance and cheap enough not to matter; nothing runs when idle.
   */
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => scheduleFrame(), 250);
    return () => window.clearInterval(id);
  }, [phase, scheduleFrame]);

  // The capture has to exist before the first keystroke arrives. Without this the
  // very first keydown found no capture, returned early, and every later keydown
  // inherited the same empty state — the surface looked inert. Mount only: a
  // second run would wipe a test the user is in the middle of.
  useEffect(() => {
    resetAttempt();
  }, [resetAttempt]);

  // Re-measure on mount, on a new passage, and on resize, so the caret lands
  // correctly after a reflow. A resize mid-test must not misplace it.
  useEffect(() => {
    measureSlots();
    paint(phase === "finished");
    const onResize = () => {
      measureSlots();
      paint(phase === "finished");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureSlots, paint, phase, passage.id]);

  useEffect(() => cancelFrame, [cancelFrame]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const capture = captureRef.current;
      if (capture === null) return;

      // Tab restarts (string table home.hint.restart) and must not move focus
      // out of the surface.
      if (event.key === "Tab") {
        event.preventDefault();
        restart();
        return;
      }
      // a11y.instructions.typingSurface: Escape leaves this area.
      if (event.key === "Escape") {
        event.preventDefault();
        surfaceRef.current?.blur();
        return;
      }

      // After the test is over nothing is scored: typing on must not move the
      // caret, change a character state or alter the result.
      if (phase === "finished") return;

      capture.handleKeyDown(event.nativeEvent);

      // The buffer is mirrored BEFORE the phase bookkeeping, so the very first
      // keystroke paints its own feedback. Returning early on the first key and
      // painting on the second would make the first character feel dead — the
      // exact latency the 16 ms budget (NFR-01) is about.
      bufferRef.current = mirrorBuffer(capture, passage.text, errorMode);

      // ENG-04: the clock starts on the first accepted keystroke, never on focus
      // or on page load (chapter 4 §4.10 edge E1).
      if (phase === "idle" || phase === "paused") {
        pausedAtRef.current = 0;
        setPhase("running");
      }

      scheduleFrame();

      // A fixed-length test ends when the buffer covers the target: characters
      // past that point are rejected rather than extending the test (chapter 4
      // E2), so there is no "extra" state to reach from the keyboard in this
      // mode. The engine still derives it, and derives it correctly, for the
      // modes that do accept extras.
      if (bufferRef.current.length >= chars.length) finish();
    },
    [chars.length, errorMode, finish, passage.text, phase, restart, scheduleFrame],
  );

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    captureRef.current?.handleKeyUp(event.nativeEvent);
  }, []);

  const handleFocus = useCallback(() => {
    setFocused(true);
    captureRef.current?.handleFocus();
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const capture = captureRef.current;
    if (capture === null) return;
    capture.handleBlur();
    // Losing focus mid-test pauses rather than ending it (chapter 4 E4,
    // practice mode); paused time is excluded from the scored duration.
    if (phase === "running") {
      pausedAtRef.current = performance.now();
      setPhase("paused");
    }
  }, [phase]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    // E7 (a): blocked at the DOM level. The server-side plausibility backstop is
    // a later phase; nothing here may be trusted on its own.
    event.preventDefault();
  }, []);

  const handleVisibility = useCallback(() => {
    // A hidden tab is treated exactly like a blur (chapter 4 E4).
    if (document.visibilityState === "hidden") handleBlur();
  }, [handleBlur]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [handleVisibility]);

  return (
    <div className="surface-shell">
      <div className="surface-row">
        <div
          className="passage"
          ref={surfaceRef}
          tabIndex={0}
          role="textbox"
          aria-multiline="true"
          aria-label={COPY.typingSurfaceInstructions}
          data-testid="surface"
          data-phase={phase}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
        >
          {chars.map((ch, i) => (
            <span
              key={`${passage.id}-${i}`}
              className="ch"
              data-char-state="untyped"
              ref={(el) => {
                charRefs.current[i] = el;
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
          <div className="caret" ref={caretRef} data-testid="caret" aria-hidden="true" />
        </div>

        {/*
          Rendered only while unfocused, and positioned as an overlay rather than
          in the flow. Inserting it in the flow shifted everything below it
          between mousedown and mouseup, which is exactly the window in which a
          click is composed — so the Restart and New passage buttons underneath
          silently swallowed every click. A prompt must never move the controls
          the user is reaching for.
        */}
        {!focused && (
          <p className="focus-prompt" data-testid="focus-prompt">
            {COPY.focusPrompt}
          </p>
        )}
      </div>

      {phase === "paused" && (
        <p className="note" data-testid="paused">
          {COPY.paused}
        </p>
      )}

      <div className="live-bar">
        <span className="live-item">
          <span className="live-label">{COPY.liveNetWpmLabel}</span>
          <strong className="live-value" ref={liveWpmRef} data-testid="live-net-wpm">
            n/a
          </strong>
        </span>
        <span className="live-item">
          <span className="live-label">{COPY.liveAccuracyLabel}</span>
          <strong className="live-value" ref={liveAccRef} data-testid="live-accuracy">
            n/a
          </strong>
        </span>
        <span className="live-hint">{COPY.hintRestart}</span>
      </div>

      {/*
        The one and only automatic announcement (a11y.announce.testFinished).
        It exists so a screen-reader user learns the outcome. It must never fire
        per keystroke, and it does not: it is derived from `result`, which is set
        exactly once, when the test ends.
      */}
      <p className="visually-hidden" role="status" aria-live="polite" data-testid="announcer">
        {result === null
          ? ""
          : COPY.announceTestFinished(
              result.summary.netWpm.toFixed(0),
              result.summary.finalAccuracy.toFixed(0),
            )}
      </p>

      {result !== null && (
        <FinishedPanel result={result} onRestart={restart} onNewPassage={onNewPassage} />
      )}

      <p className="passage-id" data-testid="passage-id">
        {passage.id}
      </p>
    </div>
  );
}

function FinishedPanel({
  result,
  onRestart,
  onNewPassage,
}: {
  result: EngineResult;
  onRestart: () => void;
  onNewPassage: (() => void) | undefined;
}) {
  return (
    <section className="finished" aria-labelledby="finished-title" data-testid="finished">
      <h2 id="finished-title" className="visually-hidden">
        {COPY.resultsTitle}
      </h2>
      <p className="headline">
        <strong data-testid="headline-net-wpm">{COPY.headlineNetWpm(result.summary.netWpm)}</strong>
        <strong data-testid="headline-accuracy">
          {COPY.headlineAccuracy(result.summary.finalAccuracy)}
        </strong>
      </p>
      <p className="finished-actions">
        <button type="button" data-testid="restart" onClick={onRestart}>
          {COPY.actionRestart}
        </button>
        {onNewPassage !== undefined && (
          <button type="button" data-testid="new-passage" onClick={onNewPassage}>
            {COPY.newPassage}
          </button>
        )}
      </p>
      <p className="note" data-testid="engine-stamp">
        {COPY.engineStamp(result.summary.modelVersion)}
      </p>
    </section>
  );
}

/**
 * Mirror what the engine's text model holds.
 *
 * This is a read, not a second implementation: it replays the captured events
 * through the same `createTextModel`/`applyPress` the engine itself uses, so the
 * surface cannot paint a buffer the engine would not produce.
 */
function mirrorBuffer(capture: InputCapture, target: string, errorMode: ErrorMode): string[] {
  const model = createTextModel(target, errorMode);
  for (const event of filterEvents(capture.events).textAffecting) {
    applyPress(model, event);
  }
  return [...model.buffer];
}

/**
 * textHash must be a 64-char lowercase hex string per the InputLog contract.
 * The same offline FNV-1a placeholder the passage helper and the recorder use,
 * until the content pipeline supplies real sha-256 at intake.
 */
function textHashFor(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").repeat(8);
}
