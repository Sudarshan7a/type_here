/**
 * The results screen (ANA-01, master-spec §4.3 "Results").
 *
 * MOUNTS ONCE PER FINISHED TEST. The parent renders it only when a result exists,
 * so the whole panel — numbers, notices, headings — enters the tree in one
 * commit when the test ends and leaves in one commit on restart. Nothing inside
 * it has state that changes while a test is running, so nothing inside it can
 * cause a render per keystroke (AGENTS.md rule 2). The entrance is a CSS
 * animation on the mounted element, not a JavaScript loop: there is no counter
 * ticking a number up, and no render is scheduled to move one.
 *
 * WHERE THE NUMBERS COME FROM. ./metrics.ts, and from there straight off the
 * `EngineResult` the engine returned. This file computes nothing, rounds
 * nothing and re-derives nothing — it places strings (rule 3).
 *
 * WHERE THE STATES COME FROM. ./assess.ts, which reads the engine's own
 * thresholds. Every state is rendered as words with a non-colour cue of its own,
 * so nothing on this screen depends on telling two colours apart.
 *
 * IT COVERS NOTHING. There is no interrupting layer here and none is reachable
 * from here (rule 1): the panel is a `<section>` in normal flow under the
 * passage, the replay viewer renders inside it, and `e2e/results-states.spec.ts`
 * asserts the computed position is `static`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ErrorMode, EngineResult } from "@realtype/engine";
import type { KeyEvent, LogMarker } from "@realtype/schemas";

import { ReplayViewer } from "../ReplayViewer";
import { COPY } from "../copy";
import { assessResult, flagNotes, shortNotice } from "./assess";
import { detailRows, headlineFigures } from "./metrics";

export interface ResultsPanelProps {
  /** The finished result. Frozen for the life of the panel: it is read, never edited. */
  result: EngineResult;
  /** Clears the attempt and returns to a clean typing state. */
  onRestart: () => void;
  /** Offered when the host has another passage to load. */
  onNewPassage?: () => void;
  /** The passage that was typed — the replay folds against the same target. */
  target: string;
  /** The error mode the attempt ran under. */
  errorMode: ErrorMode;
  /** The retained in-memory log, or null when nothing was kept for this test. */
  retainedLog: { events: readonly KeyEvent[]; markers: readonly LogMarker[] } | null;
  replayOpen: boolean;
  onWatchReplay: () => void;
  onCloseReplay: () => void;
  /** Escape with the replay closed puts focus back on the typing field. */
  onReturnToSurface?: () => void;
}

/**
 * Whether the browser thinks it is online, or null when there is no browser to
 * ask (server rendering, tests). Two listeners, attached when the panel mounts
 * and removed when it leaves — which is once per finished test, never per
 * keystroke.
 *
 * The offline notice exists because losing the connection is not a failure and
 * must not be presented as one. It says what happened. It does not promise a
 * sync, because there is no sync to promise yet.
 */
function useOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(() =>
    typeof navigator === "undefined" ? null : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function ResultsPanel({
  result,
  onRestart,
  onNewPassage,
  target,
  errorMode,
  retainedLog,
  replayOpen,
  onWatchReplay,
  onCloseReplay,
  onReturnToSurface,
}: ResultsPanelProps) {
  const online = useOnline();
  const replayToggleRef = useRef<HTMLButtonElement>(null);
  /**
   * Set by the Escape handler when it closes the replay, and consumed by the
   * effect below once the close has actually committed.
   *
   * The obvious implementation — `requestAnimationFrame(() => toggle.focus())` —
   * is a race, and it lost one: focus was still on the toggle at the moment the
   * next Escape was pressed, so the handler ran, moved focus to the passage, and
   * the frame from the PREVIOUS Escape then fired and pulled focus back to the
   * toggle. Both actions were correct and the user still ended up in the wrong
   * place. Doing it in an effect ties the focus move to the commit that made the
   * viewer disappear, so it cannot arrive after the next key press.
   */
  const restoreFocusToToggleRef = useRef(false);

  const assessment = assessResult(result);
  const headline = headlineFigures(result);
  const rows = detailRows(result);
  const notices = [
    // Short first: it explains a missing figure, so it reads before the flag note
    // that is about the run rather than about the measurement.
    ...(assessment.short
      ? [
          {
            id: "results-notice-short",
            tone: "short",
            title: COPY.resultsShortTitle,
            body: shortNotice(assessment),
          },
        ]
      : []),
    ...(assessment.flags.length > 0
      ? [
          {
            id: "results-notice-flagged",
            tone: "flagged",
            title: COPY.resultsFlagsTitle,
            body: COPY.resultsFlagsBody(flagNotes(assessment.flags)),
          },
        ]
      : []),
    ...(online === false
      ? [
          {
            id: "results-notice-offline",
            tone: "offline",
            title: COPY.resultsOfflineLabel,
            body: COPY.resultsOfflineNote,
          },
        ]
      : []),
  ];

  /**
   * One binding, documented in `help.shortcuts.resultsEscape`: with the replay
   * open it closes it and returns focus to the button that opened it; with the
   * replay closed it hands focus back to the passage. Escape is otherwise
   * unbound inside this panel, so it never swallows a key the user meant for a
   * control.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Escape") return;
      if (replayOpen) {
        event.preventDefault();
        restoreFocusToToggleRef.current = true;
        onCloseReplay();
        return;
      }
      if (onReturnToSurface !== undefined) {
        event.preventDefault();
        onReturnToSurface();
      }
    },
    [onCloseReplay, onReturnToSurface, replayOpen],
  );

  // Focus follows the close, on the commit that closed it. See the note on the
  // ref: this is what makes Escape-then-Escape land where the second press says.
  useEffect(() => {
    if (replayOpen || !restoreFocusToToggleRef.current) return;
    restoreFocusToToggleRef.current = false;
    replayToggleRef.current?.focus();
  }, [replayOpen]);

  return (
    <section
      className="finished results"
      aria-labelledby="results-title"
      data-testid="finished"
      data-difficulty={assessment.difficulty ?? "none"}
      onKeyDown={onKeyDown}
    >
      <h2 id="results-title" className="visually-hidden">
        {COPY.resultsTitle}
      </h2>

      {/*
        THE HEADLINE. Net WPM at the pack's KPI scale with accuracy beside it,
        each carrying its unit in words so no figure depends on its position.
        §4.3 item 1's third figure, classic WPM, sits under them, smaller.
      */}
      <p className="headline">
        <strong className="headline-net-wpm" data-testid="headline-net-wpm">
          {headline.netWpm}
        </strong>
        <strong className="headline-accuracy" data-testid="headline-accuracy">
          {headline.accuracy}
        </strong>
      </p>
      <p className="results-classic" data-testid="results-classic-wpm">
        {headline.classicWpm}
      </p>

      {/*
        THE STANDING STATE, and the reason it is not a footnote. Nothing is
        server-verified at MVP, so every result on this screen carries the
        practice label and the sentence that says why.

        Deliberately NOT `role="status"`. That role carries an implicit
        `aria-live="polite"`, and a live region that appears already populated
        is announced by some screen readers — which would make this a SECOND
        announcement of the same result. The rule is one announcement per test,
        and the surface's own live region is the one place it happens. This is
        ordinary content the reader reaches in reading order.
      */}
      <div className="results-status" data-testid="results-status">
        <h3 className="results-status-label" data-testid="results-status-label">
          {COPY.resultsUnverifiedLabel}
        </h3>
        <p className="results-status-body" data-testid="results-status-body">
          {COPY.resultsUnverifiedLocal}
        </p>
      </div>

      {/*
        THE NOTICES. Only what actually happened. A clean run renders nothing
        here — it does not claim to be clean, because the client has not run the
        checks that would justify that claim.

        Each notice carries a TONE with three separate non-colour channels: the
        label word, a left rule whose STYLE differs per tone (dashed, double,
        dotted), and the sentence itself. Colour is reinforcement.
      */}
      {notices.length > 0 && (
        <div className="results-notices" data-testid="results-notices">
          {notices.map((notice) => (
            <p
              className="results-notice"
              key={notice.id}
              data-testid={notice.id}
              data-tone={notice.tone}
            >
              <strong className="results-notice-label">{notice.title}</strong> {notice.body}
            </p>
          ))}
        </div>
      )}

      <h3 className="results-details-title">{COPY.resultsDetailsTitle}</h3>
      {/*
        A real definition list, so the label and the figure are announced as a
        pair. The halves come from the string table's single string, split at
        its first ": " — see splitAtLabel.
      */}
      <dl className="results-details" data-testid="results-details">
        {rows.map((row) => (
          <div className="results-detail" key={row.id} data-reported={String(row.reported)}>
            <dt data-testid={`${row.id}-label`}>{row.label}</dt>
            <dd data-testid={row.id}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="note" data-testid="results-pending">
        {COPY.resultsPending}
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
        {retainedLog !== null && (
          <button
            type="button"
            ref={replayToggleRef}
            data-testid="replay-watch"
            onClick={onWatchReplay}
            aria-expanded={replayOpen}
          >
            {COPY.replayWatch}
          </button>
        )}
      </p>

      {replayOpen && retainedLog !== null && (
        <ReplayViewer
          target={target}
          events={retainedLog.events}
          markers={retainedLog.markers}
          errorMode={errorMode}
          expectedFinalText={result.finalText}
          onClose={onCloseReplay}
        />
      )}

      <p className="note" data-testid="engine-stamp">
        {COPY.engineStamp(result.summary.modelVersion)}
      </p>
    </section>
  );
}
