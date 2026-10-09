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
import type { CaretStyle, Layout, LogMarker, KeyEvent, Mode } from "@realtype/schemas";

import { COPY } from "./copy";
import { InputCapture } from "./input-adapter";
import type { Passage } from "./passages";
import { buildAnnouncement } from "./results/announce";
import { ResultsPanel } from "./results/ResultsPanel";

/** What the surface is doing, as far as the user is concerned. */
export type SurfacePhase = "idle" | "running" | "paused" | "finished";

export interface TypingSurfaceProps {
  passage: Passage;
  errorMode: ErrorMode;
  /**
   * How the caret is drawn (STEER-6). A display preference only — it reaches no
   * metric and does not change `modelVersion`, so a recorded test stays
   * comparable between someone using a line caret and someone using a block.
   *
   * Defaults to "line", which is what the design pack specifies.
   */
  caretStyle?: CaretStyle;
  /**
   * The keyboard layout the user declared (LOC-01). Carried into the log's meta
   * AND settings unchanged — attribution, not passage language: the passages
   * stay English for the MVP whatever is selected. Required, so no caller can
   * produce an unattributed run by forgetting it. The parent remounts the
   * surface when it changes, so one run never mixes two layouts.
   */
  layout: Layout;
  /**
   * The armed auto-insertion toggles (ENG-09, D-M5-5). Carried into the log's
   * settings unchanged. Required like `layout`, so no run silently drops
   * them. They take effect per finished test (read at finish time); no
   * producer exists in prose mode, so they change nothing on screen today —
   * code passages (WAVE 3) will produce `auto: true` events from them.
   */
  autoIndent: boolean;
  autoPair: boolean;
  /**
   * Countdown length in seconds. When set (> 0) the test ends when the clock
   * reaches zero, whatever the buffer has covered — the classic timed mode.
   * Characters past the end are still accepted up to that instant, so a
   * partially-typed text is the normal outcome and the engine scores the
   * elapsed window. Absent (0/undefined) keeps the fixed-length behaviour:
   * the test ends when the buffer covers the target.
   *
   * Paused time is excluded: pausing freezes the remaining budget.
   */
  timeLimitSec?: number;
  /**
   * The mode recorded in the InputLog. Prose/time/words/quotes stay
   * "classic"; custom text is "custom" (both in the contract's ModeSchema).
   * The value reaches no metric and no `modelVersion` — it is attribution
   * for what kind of test this was, exactly like the declared layout.
   */
  logMode?: Mode;
  /**
   * MOD-02: the loaded passage's COMPUTED difficulty band (CNT-02), shown
   * beside its content id as words.
   *
   * It is a prop rather than a lookup, because the band is the engine's
   * decision and the App is the only thing that knows which corpus item is
   * loaded — a view that recomputed it could disagree with the results screen
   * (AGENTS.md rule 3). Omitted for text the corpus does not describe (custom
   * text), where the honest answer is that there is no band to show.
   */
  difficultyBand?: string;
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

type WordToken = { kind: "word"; index: number; chars: string[] };

/**
 * Split the passage into words, each carrying the space that follows it, keeping
 * every character's index in the original string so `charRefs` stays indexed by
 * buffer position.
 *
 * A trailing space stays a CHARACTER with its own state and its own rect — it is
 * only absorbed into the preceding word's box. That is what makes STEER-2 bug (d)
 * impossible rather than merely unlikely: see the note where `tokens` is built.
 */
function groupIntoWords(chars: readonly string[]): WordToken[] {
  const tokens: WordToken[] = [];
  let index = 0;
  while (index < chars.length) {
    const start = index;
    while (index < chars.length && chars[index] !== " ") index += 1;
    if (index === start) continue; // A leading space has no word to belong to.
    const word = chars.slice(start, index);
    if (index < chars.length) word.push(" "); // The space belongs to this word.
    tokens.push({ kind: "word", index: start, chars: word });
    index += 1;
  }
  return tokens;
}

export function TypingSurface({
  passage,
  errorMode,
  caretStyle = "line",
  layout,
  autoIndent,
  autoPair,
  timeLimitSec = 0,
  logMode = "classic",
  difficultyBand,
  onFinish,
  onNewPassage,
}: TypingSurfaceProps) {
  const [phase, setPhase] = useState<SurfacePhase>("idle");
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<EngineResult | null>(null);
  // ENG-08: the just-finished attempt's log, retained in memory for replay.
  // Set once in finish(), cleared on restart — never per keystroke, never
  // persisted, never sent anywhere. Only the latest finished attempt is kept.
  const [retainedLog, setRetainedLog] = useState<{
    events: readonly KeyEvent[];
    markers: readonly LogMarker[];
  } | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);

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
  /**
   * Timed mode (MOD-01). `deadlineRef` is the performance.now() timestamp the
   * test ends at; null whenever the test is paused or the mode is fixed-length.
   * The remaining time is PAINTED through a ref, never state, so the ticking
   * clock costs no React render (AGENTS.md rule 2).
   */
  const deadlineRef = useRef<number | null>(null);
  const remainingOnPauseRef = useRef(0);
  const timeRemainingRef = useRef<HTMLElement>(null);
  const timeLimitRef = useRef(timeLimitSec);
  timeLimitRef.current = timeLimitSec;

  const chars = useMemo(() => [...passage.text], [passage.text]);

  /**
   * The passage split into words and the spaces between them, keeping each
   * character's index in the original string.
   *
   * WHY THE DOM IS SHAPED THIS WAY. Every character used to be an atomic inline
   * box of its own, which is what made per-character carets and per-character
   * states easy — and which quietly destroyed word integrity. CSS Text allows a
   * line break between two adjacent atomic inlines, so a passage rendered as one
   * inline box per character has a break opportunity between EVERY pair of
   * letters. On a wide field the browser happened to break at spaces, so the bug
   * was invisible. At 360px it shredded the text mid-word — "wh / enever",
   * "brot / her" — even though "whenever" fitted the line several times over.
   *
   * Making the WORD the atomic box, with the characters inline inside it, is what
   * restores the unit the reader sees. The characters still have their own
   * elements, rects and states; they simply stop being individually breakable.
   *
   * AND THE WORD OWNS ITS TRAILING SPACE, which is the other half of the same idea.
   * A space at top level is an atomic inline box in its own right, so CSS Text
   * permits a line break BEFORE it — and a break before a space puts a space at the
   * start of the next line, which reads as a gap the user did not type (STEER-2
   * bug d). The obvious fix was to measure which spaces had been pushed to a line
   * start and collapse them to zero width, which is a fixed-point search over the
   * layout. It was found doing exactly that on 367px through 442px: the passage fits
   * 18 characters in a 326px box for 324px, so 2px of slack decided which side of the
   * break the space landed on, and a reflow the search never saw left it leading.
   *
   * Putting the space inside the word's box removes the break opportunity, so no
   * reflow can produce a leading space. There is no search, no tolerance and no
   * attribute to strand; the invariant is structural. The space keeps its own
   * character element and its own state, because it is still a character the user
   * produces.
   */
  const tokens = useMemo(() => groupIntoWords(chars), [chars]);

  // ---- layout ------------------------------------------------------------
  //
  // Character offsets are measured once per text and again on resize, never
  // inside the keystroke path. A layout read per keystroke is a forced reflow,
  // which is exactly what the caret-rendering rules forbid and what the 16 ms
  // p95 input-to-paint budget (NFR-01) cannot afford.
  //
  // THE OFFSET ORIGIN. Slots are measured from the passage's PADDING box — the
  // box the caret, positioned at `left: 0; top: 0`, actually lives in. They used
  // to be measured from the BORDER box, so the border and the padding were both
  // added on top of a position that already included them: the caret landed one
  // character to the right (the 12px horizontal padding is one advance in the
  // mono stack) and a full line below (the 16px vertical padding). That is the
  // "one character right and below the end of the text" the owner reported, and
  // `e2e/typing-surface-design.spec.ts` pins it character by character.
  const measureSlots = useCallback(() => {
    const host = surfaceRef.current;
    if (host === null) return;
    const spans = charRefs.current;
    const read = (): CharSlot[] => {
      const base = host.getBoundingClientRect();
      const originX = base.left + host.clientLeft;
      const originY = base.top + host.clientTop;
      return spans.map((span) => {
        if (span === null) return { left: 0, top: 0, width: 0, height: 0 };
        const r = span.getBoundingClientRect();
        return { left: r.left - originX, top: r.top - originY, width: r.width, height: r.height };
      });
    };
    // One pass. There used to be a fixed-point loop here, collapsing spaces the
    // browser had parked at the start of a line; the word box now makes that
    // break impossible, so there is nothing left to iterate towards. See the note
    // where `tokens` is built.
    const slots = read();
    // The caret's height is NOT measured here. It is `1.1em` in CSS, and the
    // caret is a child of the passage, so `em` resolves against the type size
    // already in force — which means the number stays correct when the type
    // tokens change, with no JavaScript involved. An earlier version measured
    // the font-size per layout and wrote `style.height` inline; that inline
    // value outranks every stylesheet rule, so the block and underline caret
    // styles could not change their height at all. See the caret style block in
    // styles.css.
    slotsRef.current = slots;
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
    // Only the HEIGHT changed (STEER-6: "alignment is fine, size is not"). The
    // caret still starts at the character's own top, which is what
    // e2e/typing-surface-design.spec.ts pins within 1px.
    //
    // A first attempt also CENTRED the shorter caret on the character's box,
    // which is arguably the more correct typographic alignment — and it moved the
    // caret 1.1px down, breaking that pin for a difference nobody can see. The
    // owner asked for a size change, so the size changed and the alignment did
    // not.
    caret.style.transform = `translate3d(${x}px, ${slot.top}px, 0)`;
    // The index the caret is sitting on, published so the size assertion in
    // e2e/caret.spec.ts can measure the glyph the caret is actually over rather
    // than guessing which character that is from geometry. One attribute write
    // in the batch that already happened — no extra layout, no extra paint, and
    // no React render (rule 2).
    caret.dataset.caretIndex = String(index);
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

  /**
   * One frame performs every per-keystroke DOM write.
   *
   * Split out from the scheduling so `finish` can run the same body
   * SYNCHRONOUSLY before it tears the attempt down. `finish` used to cancel the
   * pending frame outright, which threw away the frame holding the last live
   * figures and froze the readout at a value up to 250 ms stale — the moment it
   * is compared against the headline the user is about to read.
   */
  const runFrame = useCallback(() => {
    const capture = captureRef.current;
    if (capture === null) return;
    paint(phase === "finished");
    const live = computeLiveSummary(passage.text, capture.events, errorMode, {
      // The capture's OWN clock. Passing `performance.now()` here was a units
      // error: events and markers are stamped origin-relative from the first
      // keystroke, so the live figure was divided by the page's whole lifetime
      // instead of by the time spent typing. Markers travel with it for the same
      // reason `computeFromEvents` takes them — one duration rule, two callers.
      nowMs: capture.elapsedMs(),
      markers: capture.markers,
    });
    if (liveWpmRef.current !== null) {
      liveWpmRef.current.textContent = live.netWpm === null ? "n/a" : live.netWpm.toFixed(1);
    }
    if (liveAccRef.current !== null) {
      liveAccRef.current.textContent =
        live.keystrokeAccuracy === null ? "n/a" : `${live.keystrokeAccuracy.toFixed(1)}%`;
    }
  }, [errorMode, paint, passage.text, phase]);

  const scheduleFrame = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      runFrame();
    });
  }, [runFrame]);

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
    // Timed mode (MOD-01): a restarted test gets the whole budget back, and
    // the readout returns to the configured limit before the first keystroke.
    deadlineRef.current = null;
    remainingOnPauseRef.current = 0;
    cancelFrame();
    setResult(null);
    setRetainedLog(null);
    setReplayOpen(false);
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
    deadlineRef.current = null;
    const text = { id: passage.id, text: passage.text };
    const log = capture.toLog({
      // MOD-01: the test kind this run was, carried into the log as
      // attribution. It reaches no metric and no `modelVersion` — the modes
      // differ in WHEN the test ends, not in how a keystroke is scored.
      mode: logMode,
      textId: passage.id,
      textHash: textHashFor(passage.text),
      // LOC-01: the declared layout, carried as-is (the adapter no longer
      // coerces). Attribution for this run; passages stay English for the MVP.
      layout,
      errorMode,
      // ENG-09: the armed toggles, carried as-is. Read here, at finish time,
      // so one run never mixes two settings.
      autoIndent,
      autoPair,
    });
    // Flush, then cancel: the readout is updated to the instant the test ended
    // before the pending frame is dropped. Cancelling first discarded it.
    runFrame();
    cancelFrame();
    setPhase("finished");
    paint(true);
    const computed = computeResult(log, text);
    setResult(computed);
    // Retain a copy of the raw events for the replay viewer (ENG-08). The
    // capture is replaced on restart, so this snapshot is stable; markers
    // travel with it because frame timing shares the log's clock.
    setRetainedLog({ events: [...capture.events], markers: [...capture.markers] });
    setReplayOpen(false);
    onFinish?.(computed);
  }, [
    cancelFrame,
    errorMode,
    layout,
    autoIndent,
    autoPair,
    onFinish,
    passage.id,
    passage.text,
    logMode,
    paint,
    runFrame,
  ]);

  /**
   * Timed mode (MOD-01): paint the remaining whole seconds through the ref.
   * Display-only, and only called from the 250 ms cadence below — never in the
   * key path, never as React state (AGENTS.md rule 2).
   */
  const tickCountdown = useCallback(() => {
    const deadline = deadlineRef.current;
    if (deadline === null) return;
    const remaining = Math.max(0, deadline - performance.now());
    const seconds = String(Math.ceil(remaining / 1000));
    if (timeRemainingRef.current !== null) {
      timeRemainingRef.current.textContent = seconds;
    }
    if (remaining <= 0) finish();
  }, [finish]);

  /**
   * Arm the deadline when the test starts running: a fresh start gets the full
   * budget, a resume after a pause gets exactly what was left when it stopped.
   * Without the freeze/resume pair, a pause that waits for the user's attention
   * would silently shorten the test — and the scored duration is derived from
   * the same clock, so the two must agree.
   */
  const armCountdown = useCallback((resuming: boolean) => {
    const limit = timeLimitRef.current;
    if (limit <= 0) return;
    if (resuming && remainingOnPauseRef.current > 0) {
      deadlineRef.current = performance.now() + remainingOnPauseRef.current;
    } else if (!resuming) {
      deadlineRef.current = performance.now() + limit * 1000;
      if (timeRemainingRef.current !== null) {
        timeRemainingRef.current.textContent = String(limit);
      }
    }
  }, []);

  /** Freeze the countdown on pause: the budget is banked, not spent. */
  const freezeCountdown = useCallback(() => {
    const deadline = deadlineRef.current;
    if (deadline === null) return;
    remainingOnPauseRef.current = Math.max(0, deadline - performance.now());
    deadlineRef.current = null;
  }, []);

  /**
   * The live figures must keep moving while the user is idle mid-test, because
   * their speed really is falling. 250 ms is fast enough for a number the user
   * reads at a glance and cheap enough not to matter; nothing runs when idle.
   */
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      scheduleFrame();
      tickCountdown();
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, scheduleFrame, tickCountdown]);

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
        // Timed mode (MOD-01): the countdown starts with the same keystroke the
        // scored clock does, so the two cannot disagree about when time began.
        armCountdown(phase === "paused");
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
    [chars.length, errorMode, finish, passage.text, phase, restart, scheduleFrame, armCountdown],
  );

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    captureRef.current?.handleKeyUp(event.nativeEvent);
  }, []);

  /**
   * IME composition lifecycle (M1-04 §6, ENG-06). Keydowns that arrive while a
   * composition is open are flagged by the adapter and dropped by the engine,
   * so partial input paints nothing; the confirmed string scores once. No React
   * state is touched here except the same idle/paused → running transition a
   * first keystroke performs (AGENTS.md rule 2).
   */
  const handleCompositionStart = useCallback(() => {
    captureRef.current?.handleCompositionStart();
  }, []);

  const handleCompositionUpdate = useCallback(() => {
    captureRef.current?.handleCompositionUpdate();
  }, []);

  const handleCompositionEnd = useCallback(
    (event: React.CompositionEvent<HTMLDivElement>) => {
      const capture = captureRef.current;
      if (capture === null) return;
      // After the test is over nothing is scored, committed text included.
      if (phase === "finished") return;
      capture.handleCompositionEnd(event.data);
      bufferRef.current = mirrorBuffer(capture, passage.text, errorMode);
      // A confirmed composition is accepted input, so it starts the clock like
      // a first keystroke (ENG-04, chapter 4 edge E1).
      if (phase === "idle" || phase === "paused") {
        pausedAtRef.current = 0;
        armCountdown(phase === "paused");
        setPhase("running");
      }
      scheduleFrame();
      if (bufferRef.current.length >= chars.length) finish();
    },
    [chars.length, errorMode, finish, passage.text, phase, scheduleFrame, armCountdown],
  );

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
      // Timed mode (MOD-01): the countdown freezes with the scored clock, so
      // time spent away from the field costs the user none of the budget.
      freezeCountdown();
      setPhase("paused");
    }
  }, [phase, freezeCountdown]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    // E7 (a): blocked at the DOM level. The server-side plausibility backstop is
    // a later phase; nothing here may be trusted on its own.
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    // ENG-07, same threat as paste: dropped text must never enter the attempt.
    // preventDefault on dragover as well, or some browsers will not fire drop
    // on a non-editable target at all — and an unfired drop is not a blocked one.
    event.preventDefault();
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
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
      <div
        className="passage"
        ref={surfaceRef}
        tabIndex={0}
        role="textbox"
        aria-multiline="true"
        aria-label={COPY.typingSurfaceInstructions}
        data-testid="surface"
        id="surface"
        data-phase={phase}
        // ENG-07: the sink is a plain div, never an input/textarea/editable —
        // autofill and spellcheck machinery have no hook. spellCheck is set
        // explicitly so the intent survives any future sink change.
        spellCheck={false}
        // ENG-10: raw characters preserved. No transformation runs against
        // this surface today: the div performs none, and the engine compares
        // produced keys with strict equality (pinned in eng-raw-chars.test).
        // autocapitalize/autocomplete/autocorrect attributes belong to the
        // real input sink of M1-04 §2 when it lands — they are not valid div
        // attributes, so they are deliberately absent here, not forgotten.
        // The declared layout this run is attributed to (LOC-01). A readout
        // hook for the layout-selector acceptance test, not a visual.
        data-layout={layout}
        // Drives the caret's shape from CSS alone. Setting it on the surface
        // rather than on the caret means changing style costs no React render of
        // the caret element, and the caret's own DOM stays untouched.
        data-caret-style={caretStyle}
        // The caret blinks only before the first keystroke (10 §3), and only
        // where motion is welcome at all.
        data-idle={phase === "idle" ? "true" : "false"}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {tokens.map((token) => (
          // The word, and the space after it, are ONE atomic box. See
          // groupIntoWords.
          <span className="word" key={`w-${passage.id}-${token.index}`}>
            {token.chars.map((ch, offset) => {
              const index = token.index + offset;
              return (
                <span
                  key={`${passage.id}-${index}`}
                  className={ch === " " ? "ch ch-space" : "ch"}
                  data-char-state="untyped"
                  ref={(el) => {
                    charRefs.current[index] = el;
                  }}
                >
                  {/* A space is rendered as U+00A0 so the browser cannot collapse
                      it away at the end of a line and make the rendered text stop
                      matching the target. */}
                  {ch === " " ? "\u00A0" : ch}
                </span>
              );
            })}
          </span>
        ))}
        <div className="caret" ref={caretRef} data-testid="caret" aria-hidden="true" />
      </div>

      {/*
        The unfocused prompt, BELOW the field.

        It used to be an absolutely-positioned overlay in the middle of the
        passage, which hid the text the user has just been asked to read — the
        owner's "the prompt covers the passage". 10 §3 wants a blurred scrim over
        the text; the requirement to keep the text readable wins over that
        treatment, and the conflict is logged in HUMAN-ACTIONS.md.

        The slot stays in the flow even when the prompt is not, so nothing below
        it moves when the prompt appears or disappears. That movement is not
        cosmetic: it happens between mousedown and mouseup, and it used to move
        the Restart and New passage buttons out from under a click being composed
        on the field.
      */}
      <div className="prompt-slot">
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

      {/*
        The live readout. HIDDEN once the result is up.

        While typing, the two figures are keystroke accuracy and net WPM so far —
        different measures from the headline's final accuracy and net WPM across
        the whole test, and a genuinely different question. Once the test is over
        the headline is answering the same screen, so a live figure beside it can
        only contradict it. The owner saw exactly that: 14.3 WPM / 98.9% live
        against 58.0 WPM / 100.0% finished.
      */}
      {phase !== "finished" && (
        <div className="live-bar" data-testid="live-bar">
          {timeLimitSec > 0 && (
            <span className="live-item">
              <span className="live-label">{COPY.liveTimeRemainingLabel}</span>
              {/*
                The ticking number is painted through a ref, never state
                (AGENTS.md rule 2), and is hidden from assistive tech: a value
                that changes every second is noise in a screen reader, and the
                outcome is announced once, at the end, like every other result.
              */}
              <strong
                className="live-value"
                ref={timeRemainingRef}
                data-testid="live-time-remaining"
                aria-hidden="true"
              >
                {timeLimitSec}
              </strong>
            </span>
          )}
          <span className="live-item">
            <span className="live-label">{COPY.liveNetWpmLabel}</span>
            <strong className="live-value" ref={liveWpmRef} data-testid="live-net-wpm">
              n/a
            </strong>
          </span>
          <span className="live-item">
            <span className="live-label" data-testid="live-accuracy-label">
              {COPY.liveAccuracyLabel}
            </span>
            <strong className="live-value" ref={liveAccRef} data-testid="live-accuracy">
              n/a
            </strong>
          </span>
          <span className="live-hint">{COPY.hintRestart}</span>
        </div>
      )}

      {/*
        The one and only automatic announcement (a11y.announce.testFinished).
        It exists so a screen-reader user learns the outcome. It must never fire
        per keystroke, and it does not: it is derived from `result`, which is set
        exactly once, when the test ends. The sentence itself is built in
        ./results/announce.ts so the numbers are formatted in the one place the
        whole results screen formats them.
      */}
      <p className="visually-hidden" role="status" aria-live="polite" data-testid="announcer">
        {result === null ? "" : buildAnnouncement(result)}
      </p>

      {/*
        ANA-01: the results screen. It lives in its own module
        (./results/ResultsPanel) and mounts exactly once per finished test —
        `result` is set once, in finish(), and cleared once, on restart. Nothing
        in it holds state that changes while a test runs, so nothing in it can
        schedule a render per keystroke.
      */}
      {result !== null && (
        <ResultsPanel
          result={result}
          onRestart={restart}
          onNewPassage={onNewPassage}
          target={passage.text}
          errorMode={errorMode}
          retainedLog={retainedLog}
          replayOpen={replayOpen}
          onWatchReplay={() => setReplayOpen(true)}
          onCloseReplay={() => setReplayOpen(false)}
          onReturnToSurface={() => surfaceRef.current?.focus()}
        />
      )}

      {/*
        MOD-02: the passage's identity below the text — its content id and the
        COMPUTED difficulty band (CNT-02), as words. Never a colour swatch
        alone: the band is a fact a visitor may want to compare against their
        own results, so it has to be readable without colour vision (rule 7).
      */}
      <p className="passage-id" data-testid="passage-id">
        {passage.id}
        {difficultyBand !== null && difficultyBand !== undefined && (
          <>
            {" · "}
            <span className="passage-band" data-testid="passage-band">
              {difficultyBand}
            </span>
          </>
        )}
      </p>
    </div>
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
