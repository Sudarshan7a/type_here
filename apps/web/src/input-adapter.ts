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
  private readonly events: KeyEvent[] = [];
  private readonly markers: LogMarker[] = [];
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
    this.markers.push({ kind: "focus", t: this.now() });
  }

  handleBlur(): void {
    this.markers.push({ kind: "blur", t: this.now() });
  }

  handleVisibilityChange(state: DocumentVisibilityState): void {
    this.markers.push({ kind: "visibility", t: this.now(), detail: state });
  }

  get eventCount(): number {
    return this.events.length;
  }

  reset(): void {
    this.events.length = 0;
    this.markers.length = 0;
    this.origin = null;
  }

  toLog(options: CaptureOptions): InputLog {
    return {
      events: [...this.events],
      ...(this.markers.length > 0 ? { markers: [...this.markers] } : {}),
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

  private now(): number {
    return performance.now();
  }

  private push(event: KeyboardEvent, type: "down" | "up"): void {
    // Keydowns with auto-repeat are captured with the flag so the engine can
    // drop them; keyups always pass through.
    const at = event.timeStamp > 0 ? event.timeStamp : performance.now();
    this.events.push({
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
