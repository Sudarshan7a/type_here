/**
 * The ENG-08 replay viewer: a "Watch replay" stepping view inside the
 * finished panel, replaying the just-finished attempt from the retained
 * in-memory log.
 *
 * Local-only by construction: it reads the log object the finished panel
 * hands it, keeps nothing in storage, sends nothing anywhere, and touches no
 * telemetry. Speed is a time scale on display (0.5/1/2/4) and never reaches
 * scoring — every frame comes from `framesForLog` in packages/engine.
 *
 * The per-frame path never calls setState (AGENTS.md rule 2, same as the live
 * surface). Frames are precomputed once; a requestAnimationFrame loop writes
 * character states, the caret transform, the scrub position and the timestamp
 * through refs. React state changes only on play, pause, speed choice and
 * scrub release — a handful of times per viewing, never per frame.
 *
 * The timestamp is a plain output, deliberately NOT a live region: announcing
 * every frame would be a per-keystroke-style announcement stream, which the
 * a11y rules forbid. The static error summary beside it is the text
 * alternative to the painted states (never colour-only).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { framesForLog, type ErrorMode } from "@realtype/engine";
import type { KeyEvent, LogMarker } from "@realtype/schemas";

import { COPY } from "./copy";

/** The time-scale choices. Pure multipliers on the log timestamps. */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4] as const;

/** Scrub resolution: the range input runs 0..1000. */
const SCRUB_STEPS = 1000;

export interface ReplayViewerProps {
  /** The passage that was typed. */
  target: string;
  /** The retained attempt's events, in capture order. */
  events: readonly KeyEvent[];
  /** Focus markers from the same capture; kept so the caller can hand over the whole retained log. */
  markers?: readonly LogMarker[];
  /** The error mode the attempt ran under (frames must fold under the same rule). */
  errorMode: ErrorMode;
  /**
   * The finished text the replay must reproduce (the scored result's own
   * final text). When supplied and the fold differs, the viewer shows the
   * corrupted-log note instead of silently showing a wrong session (M1-10).
   */
  expectedFinalText?: string;
  /** Hides the viewer; the finished panel stays. */
  onClose?: () => void;
}

/** Seconds with one decimal, the unit the timestamp readout carries. */
export function formatReplaySeconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

export function ReplayViewer({
  target,
  events,
  markers: _markers,
  errorMode,
  expectedFinalText,
  onClose,
}: ReplayViewerProps) {
  // Accepted so the caller can hand over the whole retained log object;
  // frame timing reads the event timestamps, which share the log's clock.
  void _markers;

  const replay = useMemo(
    () =>
      framesForLog(
        target,
        events,
        errorMode,
        expectedFinalText === undefined ? undefined : { expectedFinalText },
      ),
    [target, events, errorMode, expectedFinalText],
  );
  const frames = replay.frames;
  const durationMs = frames.length === 0 ? 0 : frames[frames.length - 1]!.t;

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  // The scrub position committed on release (or on play/pause/speed change).
  // Between commits the loop and the drag handler write the input and the
  // timestamp through refs, so no render happens per frame or per tick.
  const [scrubValue, setScrubValue] = useState(0);

  const wordHostRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const caretRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLOutputElement>(null);
  const rafRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const startedAtRef = useRef(0);
  const speedRef = useRef(1);
  const frameIndexRef = useRef(0);

  // The viewer paints this many character slots: the target plus any extras
  // the attempt produced past its end.
  const slotCount = useMemo(() => {
    let longest = [...target].length;
    for (const frame of frames) longest = Math.max(longest, frame.states.length);
    return longest;
  }, [frames, target]);
  const targetChars = useMemo(() => [...target], [target]);

  /** Write one frame to the DOM: states, caret, scrub and timestamp. */
  const paintFrame = useCallback(
    (index: number) => {
      const frame = frames[index];
      if (frame === undefined) return;
      frameIndexRef.current = index;
      for (let i = 0; i < slotCount; i++) {
        const span = charRefs.current[i];
        if (span === null || span === undefined) continue;
        span.setAttribute("data-char-state", frame.states[i] ?? "untyped");
        const ch = frame.text[i] ?? targetChars[i] ?? "";
        if (span.textContent !== ch) span.textContent = ch;
      }
      const caret = caretRef.current;
      if (caret !== null && wordHostRef.current !== null) {
        const host = wordHostRef.current;
        const slot =
          host.querySelectorAll("[data-replay-char]")[Math.min(frame.caret, slotCount - 1)];
        if (slot instanceof HTMLElement) {
          const base = host.getBoundingClientRect();
          const r = slot.getBoundingClientRect();
          const atEnd = frame.caret >= slotCount;
          const x = r.left - base.left - host.clientLeft + (atEnd ? r.width : 0);
          const y = r.top - base.top - host.clientTop;
          caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
      }
      if (scrubRef.current !== null && durationMs > 0) {
        scrubRef.current.value = String(Math.round((frame.t / durationMs) * SCRUB_STEPS));
      }
      if (timeRef.current !== null) {
        timeRef.current.textContent = COPY.replayTime(
          formatReplaySeconds(frame.t),
          formatReplaySeconds(durationMs),
        );
      }
    },
    [frames, slotCount, targetChars, durationMs],
  );

  /** Replay-time milliseconds at this instant, from refs only. */
  const currentOffset = () => {
    if (rafRef.current === null) return offsetRef.current;
    return Math.min(
      durationMs,
      offsetRef.current + (performance.now() - startedAtRef.current) * speedRef.current,
    );
  };

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => stopLoop, []);

  // Paint the first frame on mount and whenever the log changes. No autoplay:
  // playback starts only on an explicit press, which is also the reduced-motion
  // behaviour (nothing moves until the user asks).
  useEffect(() => {
    offsetRef.current = 0;
    frameIndexRef.current = 0;
    setScrubValue(0);
    paintFrame(0);
  }, [replay, paintFrame]);

  const tick = () => {
    const elapsed = currentOffset();
    let index = frameIndexRef.current;
    while (index + 1 < frames.length && frames[index + 1]!.t <= elapsed) index += 1;
    paintFrame(index);
    if (elapsed >= durationMs) {
      offsetRef.current = durationMs;
      stopLoop();
      setPlaying(false);
      setScrubValue(SCRUB_STEPS);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const play = () => {
    if (durationMs <= 0 || playing) return;
    if (offsetRef.current >= durationMs) {
      offsetRef.current = 0;
      frameIndexRef.current = 0;
    }
    offsetRef.current = Math.min(offsetRef.current, durationMs);
    startedAtRef.current = performance.now();
    speedRef.current = speed;
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    offsetRef.current = currentOffset();
    stopLoop();
    setPlaying(false);
    setScrubValue(durationMs > 0 ? Math.round((offsetRef.current / durationMs) * SCRUB_STEPS) : 0);
  };

  const restart = () => {
    offsetRef.current = 0;
    frameIndexRef.current = 0;
    setScrubValue(0);
    if (playing) {
      startedAtRef.current = performance.now();
      speedRef.current = speed;
    }
    paintFrame(0);
  };

  const changeSpeed = (next: number) => {
    // Position is preserved across the change: the offset is folded at the
    // old rate before the new rate takes over.
    offsetRef.current = currentOffset();
    if (playing) startedAtRef.current = performance.now();
    speedRef.current = next;
    setSpeed(next);
    setScrubValue(durationMs > 0 ? Math.round((offsetRef.current / durationMs) * SCRUB_STEPS) : 0);
  };

  const seekFrac = (frac: number) => {
    const clamped = Math.min(1, Math.max(0, frac));
    offsetRef.current = clamped * durationMs;
    if (playing) startedAtRef.current = performance.now();
    let index = 0;
    while (index + 1 < frames.length && frames[index + 1]!.t <= offsetRef.current) index += 1;
    paintFrame(index);
  };

  if (events.length === 0) {
    return (
      <section className="replay" aria-label={COPY.replayWatch} data-testid="replay">
        <p className="note" data-testid="replay-unavailable">
          {COPY.replayUnavailable}
        </p>
        {onClose !== undefined && (
          <button type="button" data-testid="replay-close" onClick={onClose}>
            {COPY.replayClose}
          </button>
        )}
      </section>
    );
  }

  const errorPositions = frames.length === 0 ? [] : (frames[frames.length - 1]!.errorIndices ?? []);
  const summary =
    replay.errorCount === 0
      ? COPY.replayErrorsNone
      : COPY.replayErrorsSome(
          replay.errorCount,
          replay.errorCount === 1
            ? `position ${errorPositions[0]! + 1}`
            : `positions ${errorPositions.map((p) => p + 1).join(", ")}`,
        );

  return (
    <section className="replay" aria-label={COPY.replayWatch} data-testid="replay">
      <div className="replay-text" ref={wordHostRef} data-testid="replay-text">
        {Array.from({ length: slotCount }, (_, i) => (
          <span
            key={i}
            className={targetChars[i] === " " ? "ch ch-space" : "ch"}
            data-char-state="untyped"
            data-replay-char={i}
            ref={(el) => {
              charRefs.current[i] = el;
            }}
          >
            {targetChars[i] === " " ? " " : (targetChars[i] ?? "")}
          </span>
        ))}
        <div className="caret" ref={caretRef} data-testid="replay-caret" aria-hidden="true" />
      </div>

      <div className="replay-controls">
        <button
          type="button"
          data-testid="replay-play-pause"
          onClick={playing ? pause : play}
          aria-label={playing ? COPY.replayPause : COPY.replayPlay}
        >
          {playing ? COPY.replayPause : COPY.replayPlay}
        </button>
        <button type="button" data-testid="replay-restart" onClick={restart}>
          {COPY.replayRestart}
        </button>
        <label className="replay-speed-label" htmlFor="replay-speed">
          {COPY.replaySpeedLabel}
        </label>
        <select
          id="replay-speed"
          data-testid="replay-speed"
          value={String(speed)}
          onChange={(event) => changeSpeed(Number(event.target.value))}
        >
          {REPLAY_SPEEDS.map((option) => (
            <option key={option} value={String(option)}>
              {option}×
            </option>
          ))}
        </select>
        {onClose !== undefined && (
          <button type="button" data-testid="replay-close" onClick={onClose}>
            {COPY.replayClose}
          </button>
        )}
      </div>

      <div className="replay-scrub-row">
        <label className="replay-seek-label" htmlFor="replay-scrub">
          {COPY.replaySeekLabel}
        </label>
        <input
          ref={scrubRef}
          id="replay-scrub"
          data-testid="replay-scrub"
          type="range"
          min={0}
          max={SCRUB_STEPS}
          step={1}
          defaultValue={0}
          key={`scrub-${durationMs}`}
          aria-label={COPY.replaySeekLabel}
          onInput={(event) => seekFrac(Number(event.currentTarget.value) / SCRUB_STEPS)}
          onPointerUp={() => setScrubValue(Number(scrubRef.current?.value ?? 0))}
          onKeyUp={() => setScrubValue(Number(scrubRef.current?.value ?? 0))}
          onBlur={() => setScrubValue(Number(scrubRef.current?.value ?? 0))}
        />
        <output
          ref={timeRef}
          data-testid="replay-time"
          htmlFor="replay-scrub"
          aria-label={COPY.replaySeekLabel}
        >
          {COPY.replayTime(formatReplaySeconds(0), formatReplaySeconds(durationMs))}
        </output>
      </div>
      <span className="visually-hidden" aria-hidden="true">
        {scrubValue}
      </span>

      <p className="note" data-testid="replay-errors">
        {summary}
      </p>
      {replay.corrupted && (
        <p className="note" data-testid="replay-corrupted">
          {COPY.replayCorrupted}
        </p>
      )}
    </section>
  );
}
