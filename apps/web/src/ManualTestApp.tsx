/**
 * The typing surface (E1) — the first hands-on artifact.
 *
 * The per-keystroke path touches the DOM directly through refs; React state
 * changes only when a test STARTS or FINISHES (AGENTS.md rule 2: never
 * setState per keystroke). The caret moves by transform using cached offsets.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeResult, type EngineResult } from "@realtype/engine";

import { InputCapture } from "./input-adapter";
import { PASSAGES, placeholderHash, type Passage } from "./passages";
import { ResultsPanel } from "./ResultsPanel";

export function ManualTestApp() {
  const [passage, setPassage] = useState<Passage>(PASSAGES[0]!);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EngineResult | null>(null);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const caretRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<InputCapture | null>(null);
  const positionRef = useRef(0);
  const caretOffsetRef = useRef(0);

  const chars = useMemo(() => [...passage.text], [passage.text]);

  const moveCaret = useCallback(
    (index: number) => {
      const caret = caretRef.current;
      if (caret === null) return;
      const span = charRefs.current[Math.min(index, chars.length - 1)];
      if (span === undefined || span === null) return; // Offsets are read from layout only when the passage changes, not per
      // keystroke: the caret position is derived from the previous span's width.
      const width = span.offsetWidth;
      caret.style.transform = `translateX(${caretOffsetRef.current + width / 2}px)`;
    },
    [chars.length],
  );

  const measureAndReset = useCallback(() => {
    positionRef.current = 0;
    caretOffsetRef.current = 0;
    for (const span of charRefs.current) {
      if (span !== null) span.className = "ch-pending";
    }
    for (let i = 0; i < chars.length; i++) {
      const span = charRefs.current[i];
      if (span !== undefined && span !== null) {
        caretOffsetRef.current += span.offsetWidth;
      }
    }
    moveCaret(0);
  }, [chars.length, moveCaret]);

  const finish = useCallback(() => {
    const capture = captureRef.current;
    if (capture === null) return;
    const log = capture.toLog({
      mode: "classic",
      textId: passage.id,
      textHash: placeholderHash(passage.text),
      layout: "qwerty-us",
      errorMode: "free",
    });
    setResult(computeResult(log, { id: passage.id, text: passage.text }));
    setRunning(false);
  }, [passage]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null || !running) return;

    const capture = new InputCapture();
    captureRef.current = capture;

    const onKeyDown = (event: KeyboardEvent) => {
      capture.handleKeyDown(event);
      if (event.key === "Tab") {
        event.preventDefault();
        capture.reset();
        measureAndReset();
        return;
      }
      if (event.key === "Backspace") {
        if (positionRef.current > 0) {
          positionRef.current -= 1;
          const span = charRefs.current[positionRef.current];
          if (span !== undefined && span !== null) span.className = "ch-pending";
          moveCaret(positionRef.current);
        }
        return;
      }
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;

      const position = positionRef.current;
      const span = charRefs.current[position];
      if (span !== undefined && span !== null) {
        span.className = event.key === chars[position] ? "ch-correct" : "ch-wrong";
        positionRef.current += 1;
        moveCaret(positionRef.current);
        if (positionRef.current >= chars.length) {
          finish();
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => capture.handleKeyUp(event);
    const onFocus = () => capture.handleFocus();
    const onBlur = () => capture.handleBlur();
    const onVisibility = () => capture.handleVisibilityChange(document.visibilityState);
    const onPaste = (event: ClipboardEvent) => {
      // E7 (a): block at the DOM level. The server-side plausibility backstop
      // is a later phase; nothing here may be trusted on its own.
      event.preventDefault();
    };

    surface.addEventListener("keydown", onKeyDown);
    surface.addEventListener("keyup", onKeyUp);
    surface.addEventListener("focus", onFocus);
    surface.addEventListener("blur", onBlur);
    surface.addEventListener("paste", onPaste);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      surface.removeEventListener("keydown", onKeyDown);
      surface.removeEventListener("keyup", onKeyUp);
      surface.removeEventListener("focus", onFocus);
      surface.removeEventListener("blur", onBlur);
      surface.removeEventListener("paste", onPaste);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running, chars, moveCaret, measureAndReset, finish]);

  const start = () => {
    captureRef.current = new InputCapture();
    setResult(null);
    setRunning(true);
    measureAndReset();
    surfaceRef.current?.focus();
  };

  return (
    <main>
      <h1 data-testid="app-title">RealType — manual engine test</h1>
      <p className="banner" role="note">
        Developer test surface. Real typing, real metrics from packages/engine. Not the product
        flow, and nothing is saved or sent anywhere.
      </p>

      <div className="controls">
        <label htmlFor="passage">Passage:</label>
        <select
          id="passage"
          value={passage.id}
          onChange={(e) => {
            const next = PASSAGES.find((p) => p.id === e.target.value);
            if (next !== undefined) {
              setPassage(next);
              setRunning(false);
              setResult(null);
            }
          }}
        >
          {PASSAGES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
        <button type="button" onClick={start} disabled={running}>
          {running ? "Typing…" : "Start"}
        </button>
      </div>

      <p className="hint">
        {running ? "Type the passage below. Tab restarts." : "Press Start, then type the passage."}
      </p>

      <div className="passage-row">
        <div
          className="passage"
          ref={surfaceRef}
          tabIndex={0}
          role="textbox"
          aria-multiline="true"
          aria-label="Type the text shown. Press Tab to restart."
          data-testid="surface"
        >
          {chars.map((ch, i) => (
            <span
              key={`${passage.id}-${i}`}
              className="ch-pending"
              ref={(el) => {
                charRefs.current[i] = el;
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
          <div className="caret" ref={caretRef} aria-hidden="true" />
        </div>
      </div>

      {result !== null && <ResultsPanel result={result} />}
    </main>
  );
}
