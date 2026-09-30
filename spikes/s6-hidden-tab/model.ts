/**
 * Spike S6 model -- a deliberately small model of the §4.10 state-machine rows
 * (docs/chapter-4-deep-dive-typing-engine-part2.md) that govern hidden-tab
 * behavior:
 *
 *   running | blur / tab hidden, practice mode -> paused (elapsed freezes)
 *   running | blur / tab hidden, verified mode -> invalid (attempt not verifiable)
 *   paused  | refocus / resume action          -> running (paused span excluded)
 *   paused  | timeout after 10 minutes        -> idle (auto-abandon)
 *
 * Pure TypeScript, no DOM and no dependencies: the clock is injected, so Node
 * tests can drive it with a fake clock and the browser page can pass
 * performance.now(). It is written as a classic script (no imports/exports) so
 * the same compiled model.js is loaded by the page via <script src> and by the
 * Node spec via require().
 */

type Mode = "practice" | "verified";
type State = "idle" | "running" | "paused" | "invalid" | "finished";
type Now = () => number;

interface StopResult {
  state: State;
  valid: boolean;
  keystrokes: number;
  scoredDurationMs: number;
  wallDurationMs: number;
}

/** §4.10: a paused test auto-abandons after 10 minutes. */
const PAUSE_TIMEOUT_MS = 600000;

class HiddenTabModel {
  readonly mode: Mode;
  state: State = "idle";
  keystrokes = 0;
  private now: Now;
  private segmentStartMs = 0;
  private scoredAccumMs = 0;
  private pausedAtMs = 0;
  /** null = never started. A 0 value is a legitimate start time (fake clock
   *  in the Node specs starts at 0), so 0 can never be the sentinel. */
  private wallStartMs: number | null = null;
  private wallEndMs: number | null = null;

  constructor(mode: Mode, now: Now) {
    this.mode = mode;
    this.now = now;
  }

  start(): boolean {
    if (this.state !== "idle") return false;
    this.state = "running";
    this.wallStartMs = this.now();
    this.segmentStartMs = this.wallStartMs;
    this.scoredAccumMs = 0;
    this.keystrokes = 0;
    return true;
  }

  keystroke(): void {
    if (this.state === "running") this.keystrokes++;
  }

  onBlur(): void {
    this.interrupt();
  }

  onVisibilityChange(hidden: boolean): void {
    if (hidden) this.interrupt();
    else this.resume();
  }

  onFocus(): void {
    this.resume();
  }

  /**
   * Scored duration = accumulated running segments only. Paused spans are
   * excluded entirely (the §4.10 worked example: pause of 10000 ms must not
   * appear in the scored duration).
   */
  get scoredDurationMs(): number {
    if (this.state === "running") return this.scoredAccumMs + (this.now() - this.segmentStartMs);
    return this.scoredAccumMs;
  }

  get wallDurationMs(): number {
    if (this.wallStartMs === null) return 0;
    const end = this.wallEndMs !== null ? this.wallEndMs : this.now();
    return end - this.wallStartMs;
  }

  stop(): StopResult {
    if (this.state === "running") {
      this.scoredAccumMs += this.now() - this.segmentStartMs;
    }
    if (this.wallStartMs !== null) this.wallEndMs = this.now();
    // Stopping from "running" or "paused" ends the attempt normally; "invalid"
    // (verified) and "idle" (never started / abandoned) pass through.
    if (this.state === "running" || this.state === "paused") this.state = "finished";
    return {
      state: this.state,
      valid: this.state === "finished",
      keystrokes: this.keystrokes,
      scoredDurationMs: this.scoredDurationMs,
      wallDurationMs: this.wallDurationMs,
    };
  }

  private interrupt(): void {
    if (this.state !== "running") return;
    const t = this.now();
    // Freeze the running segment (idempotent: a later blur while already
    // paused is a no-op).
    this.scoredAccumMs += t - this.segmentStartMs;
    if (this.mode === "verified") {
      // §4.10: verified mode -> invalid. Elapsed so far is preserved so the
      // local (unverified) result can still be shown to the user.
      this.state = "invalid";
    } else {
      this.pausedAtMs = t;
      this.state = "paused";
    }
  }

  private resume(): void {
    if (this.state !== "paused") return;
    const t = this.now();
    if (t - this.pausedAtMs >= PAUSE_TIMEOUT_MS) {
      // §4.10: user never returned; auto-abandon.
      this.state = "idle";
      return;
    }
    this.segmentStartMs = t;
    this.state = "running";
  }
}

// Expose on the global scope without turning this into a module, so the same
// file works as a classic <script src="model.js"> in the browser and as a
// side-effect import in Node. Typed cast, no `any`.
(globalThis as unknown as { HiddenTabModel: typeof HiddenTabModel }).HiddenTabModel =
  HiddenTabModel;
