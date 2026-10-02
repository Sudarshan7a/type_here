/**
 * RealType input adapter (E1) — the ONLY place that knows about DOM keyboard
 * events. Turns them into a contract-valid InputLog that packages/engine
 * replays, so the browser and the server compute from identical data.
 *
 * Two rules from AGENTS.md live here:
 *  - the clock starts on the FIRST ACCEPTED KEYSTROKE (chapter 4 edge E1), so
 *    reading the passage before typing costs the user nothing;
 *  - no React state is touched per keystroke; the surface updates the DOM
 *    directly and only the finished result crosses into React.
 */
import type { InputLog, KeyEvent, LogMarker, TypingText } from "@realtype/schemas";

export interface CaptureOptions {
  mode: InputLog["meta"]["mode"];
  textId: string;
  textHash: string;
  layout: InputLog["meta"]["layout"];
  errorMode: InputLog["meta"]["settings"]["errorMode"];
}

export class InputCapture {
  private readonly captured: KeyEvent[] = [];
  private readonly focusMarkers: LogMarker[] = [];
  /** Clock origin: the first accepted keydown. Until then, time is not spent. */
  private origin: number | null = null;

  private relative(at: number): number {
    if (this.origin === null) {
      this.origin = at;
      return 0;
    }
    return Math.max(0, at - this.origin);
  }

  handleKeyDown(event: KeyboardEvent): void {
    this.push(event, "down");
  }

  handleKeyUp(event: KeyboardEvent): void {
    this.push(event, "up");
  }

  handleFocus(): void {
    this.mark(this.now(), "focus");
  }

  handleBlur(): void {
    this.mark(this.now(), "blur");
  }

  handleVisibilityChange(state: DocumentVisibilityState): void {
    this.mark(this.now(), "visibility", state);
  }

  /**
   * Record a marker on the SAME clock as keystrokes (Session 5 attack pass, C9).
   *
   * Markers used to be written as raw absolute `performance.now()` while
   * keystrokes are origin-relative, so the two were on different scales inside
   * one InputLog. Returns the stamp that was recorded, or null if the marker
   * preceded the clock origin and therefore cannot be expressed.
   *
   * A marker that arrives before the first accepted keystroke is DROPPED, not
   * clamped: the origin is the first keystroke by design (chapter 4 edge E1), so
   * there is no meaningful "time before zero". Clamping would fabricate a
   * blur at t=0 and silently invent an exclusion window.
   */
  markAt(at: number, kind: LogMarker["kind"], detail?: LogMarker["detail"]): number | null {
    if (this.origin === null) return null;
    const t = at - this.origin;
    this.focusMarkers.push(detail === undefined ? { kind, t } : { kind, t, detail });
    return t;
  }

  get eventCount(): number {
    return this.captured.length;
  }

  /**
   * The capture's clock, in the SAME origin-relative units as `events` and
   * `markers`.
   *
   * This method exists because of a defect the owner reported as "the live
   * readout says 14.3 WPM and the finished headline says 58.0". The surface used
   * to pass a raw `performance.now()` as the live clock, while every event and
   * marker it had ever handed the engine was stamped `t - origin` from the first
   * keystroke (chapter 4 edge E1). The live summary therefore subtracted an
   * origin-relative timestamp from an absolute one, so every live figure was
   * divided by the page's lifetime since load rather than by the time the user
   * had actually spent typing. On a fast test that is a several-fold error, in
   * one direction, always.
   *
   * Before the first keystroke there is no clock (ENG-04), so this is 0 — the
   * same "no data" state the engine already returns.
   */
  elapsedMs(): number {
    return this.origin === null ? 0 : this.now() - this.origin;
  }

  /** Focus / blur / visibility markers, read-only, on the same clock as events. */
  get markers(): readonly LogMarker[] {
    return this.focusMarkers;
  }

  /**
   * The captured events, for replay by the engine.
   *
   * Exposed read-only so the surface can hand the SAME events to the text model
   * and to the metrics. A surface keeping its own parallel buffer would be able
   * to paint something the engine would never produce.
   */
  get events(): readonly KeyEvent[] {
    return this.captured;
  }

  reset(): void {
    this.captured.length = 0;
    this.focusMarkers.length = 0;
    this.origin = null;
  }

  toLog(options: CaptureOptions): InputLog {
    return {
      events: [...this.captured],
      ...(this.focusMarkers.length > 0 ? { markers: [...this.focusMarkers] } : {}),
      meta: {
        mode: options.mode,
        textId: options.textId,
        textHash: options.textHash,
        layout: options.layout,
        settings: {
          errorMode: options.errorMode,
          autoIndent: false,
          autoPair: false,
          layout:
            options.layout === "qwerty-us" || options.layout === "qwerty-uk"
              ? options.layout
              : "qwerty-us",
        },
        engineVersion: ENGINE_VERSION_STAMP,
      },
    };
  }

  private mark(at: number, kind: LogMarker["kind"], detail?: LogMarker["detail"]): void {
    this.markAt(at, kind, detail);
  }

  private now(): number {
    return performance.now();
  }

  private push(event: KeyboardEvent, type: "down" | "up"): void {
    // Keydowns with auto-repeat are captured with the flag so the engine can
    // drop them; keyups always pass through.
    const at = event.timeStamp > 0 ? event.timeStamp : performance.now();
    this.captured.push({
      code: event.code,
      key: event.key,
      type,
      t: this.relative(at),
      mods: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      repeat: event.repeat,
      isTrusted: event.isTrusted,
      auto: false,
    });
  }
}

/** Kept in sync with the engine's own stamp at wiring time (M1-01). */
const ENGINE_VERSION_STAMP = "1.0.0";

export function textToTypingText(id: string, text: string): TypingText {
  return { id, text };
}
