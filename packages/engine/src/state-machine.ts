/**
 * RealType typing engine (open-core, MIT) â€” the session lifecycle state
 * machine (E2/D1), implementing the complete transition table in
 * docs/chapter-4-deep-dive-typing-engine-part2.md Â§4.10.
 *
 * Pure logic, no DOM, injected clock. The web client drives it live; the API
 * replays it when recomputing a submitted result, so both run identical code.
 *
 * The scored-duration rule is the one that most easily goes wrong: paused spans
 * are excluded entirely, so a test that pauses for 10 s and finishes 2 s later
 * is scored at 5 s, not 15 s.
 */

export const SESSION_STATES = [
  "idle",
  "ready",
  "running",
  "paused",
  "finished",
  "submitting",
  "submitted",
  "failedOffline",
  "invalid",
] as const;

export type SessionState = (typeof SESSION_STATES)[number];
export type SessionMode = "practice" | "verified";
export type SessionEvent =
  | "focus"
  | "keystroke"
  | "rejectedKeystroke"
  | "blur"
  | "resume"
  | "finish"
  | "metricsComputed"
  | "submitVerified"
  | "submitMismatch"
  | "submitNetworkError"
  | "retry"
  | "restart"
  | "untrustedInput"
  | "escape";

/** Â§4.10: a paused test auto-abandons after 10 minutes. */
export const DEFAULT_PAUSE_TIMEOUT_MS = 600_000;

export interface StateMachineOptions {
  mode: SessionMode;
  /** Injected clock in ms (performance.now() in the browser). */
  now: () => number;
  pauseTimeoutMs?: number;
}

export class TypingStateMachine {
  state: SessionState = "idle";
  mode: SessionMode;
  verified = false;
  flags: string[] = [];
  rejectedAttempts = 0;

  /** Stable across retries so a queued result is never re-submitted as new. */
  readonly idempotencyKey: string;

  private readonly now: () => number;
  private readonly pauseTimeoutMs: number;

  /** Set when the first accepted keystroke starts the clock (Â§4.10, edge E1). */
  private startWallMs: number | null = null;
  /** Total milliseconds spent paused; excluded from the scored duration. */
  private pausedMs = 0;
  private pausedAtMs: number | null = null;

  constructor(options: StateMachineOptions) {
    this.mode = options.mode;
    this.now = options.now;
    this.pauseTimeoutMs = options.pauseTimeoutMs ?? DEFAULT_PAUSE_TIMEOUT_MS;
    this.idempotencyKey = `rk_${Math.random().toString(36).slice(2, 10)}${this.now().toFixed(0)}`;
  }

  // ---- timing -----------------------------------------------------------

  /**
   * Scored duration = wall time minus every paused span. Â§4.10's worked
   * example: typing 3000 ms, pausing 10 000 ms, typing 2000 ms more must score
   * 5000 ms, never 15000 ms. Accumulating "paused" separately is what makes
   * that correct without per-segment bookkeeping.
   */
  get scoredDurationMs(): number {
    if (this.startWallMs === null) return 0;
    const wall = this.now() - this.startWallMs;
    return wall - this.pausedMs;
  }

  get wallDurationMs(): number {
    if (this.startWallMs === null) return 0;
    return this.now() - this.startWallMs;
  }

  private freezeSegment(): void {}

  // ---- transitions ------------------------------------------------------

  focus(): void {
    if (this.state === "idle") this.state = "ready";
  }

  /** An accepted keystroke. The first one starts the clock (Â§4.10 edge E1). */
  keystroke(): void {
    if (this.state === "ready") {
      this.startWallMs = this.now();
      this.pausedMs = 0;
      this.state = "running";
    }
  }

  /** must-correct rejection: state unchanged, counter increments (Â§4.10). */
  rejectedKeystroke(): void {
    if (this.state === "running") this.rejectedAttempts += 1;
  }

  blur(): void {
    if (this.state === "ready") {
      // Nothing was scored yet; no special handling needed (Â§4.10).
      this.state = "idle";
      return;
    }
    if (this.state !== "running") return;
    this.freezeSegment();
    this.pausedAtMs = this.now();
    this.state = this.mode === "verified" ? "invalid" : "paused";
    if (this.state === "invalid") this.verified = false;
  }

  /** Hidden tab is treated exactly like blur (Â§4.10: "blur / tab hidden"). */
  hidden(): void {
    this.blur();
  }

  resume(): void {
    if (this.state === "paused" && this.pausedAtMs !== null) {
      const t = this.now();
      if (t - this.pausedAtMs >= this.pauseTimeoutMs) {
        // Â§4.10: auto-abandon; a paused test must not linger in memory.
        this.state = "idle";
        this.pausedAtMs = null;
        this.startWallMs = null;
        return;
      }
      this.pausedMs += t - this.pausedAtMs;
      this.pausedAtMs = null;
      this.state = "running";
    }
  }

  untrustedInput(): void {
    if (this.state === "running" && this.mode === "verified") {
      this.state = "invalid";
      this.verified = false;
    }
  }

  /** Paste/drop (Â§4.10 edge E7): invalid in verified mode, warned in practice. */
  pasteOrDrop(): void {
    if (this.state !== "running") return;
    if (this.mode === "verified") {
      this.state = "invalid";
      this.verified = false;
    } else {
      if (!this.flags.includes("paste-detected")) this.flags.push("paste-detected");
    }
  }

  finish(): void {
    if (this.state === "running") {
      this.freezeSegment();
      this.state = "finished";
    }
  }

  /** finished -> submitting is automatic once metrics are computed. */
  metricsComputed(): void {
    if (this.state === "finished") this.state = "submitting";
  }

  submitVerified(): void {
    if (this.state === "submitting") {
      this.state = "submitted";
      this.verified = true;
    }
  }

  /** The local result is still shown â€” never hide the user's own result. */
  submitMismatch(): void {
    if (this.state === "submitting") {
      this.state = "submitted";
      this.verified = false;
      if (!this.flags.includes("unverified")) this.flags.push("unverified");
    }
  }

  submitNetworkError(): void {
    if (this.state === "submitting") this.state = "failedOffline";
  }

  /** Automatic or manual retry: same idempotency key, never a "new" result. */
  retry(): void {
    if (this.state === "failedOffline") this.state = "submitting";
  }

  restart(): void {
    if (this.state === "submitted" || this.state === "paused" || this.state === "invalid") {
      this.state = "idle";
    }
  }

  escape(): void {
    if (this.state === "ready") this.state = "idle";
  }

  /** Generic dispatcher, used by the property test. */
  apply(event: SessionEvent): void {
    switch (event) {
      case "focus":
        return this.focus();
      case "keystroke":
        return this.keystroke();
      case "rejectedKeystroke":
        return this.rejectedKeystroke();
      case "blur":
        return this.blur();
      case "resume":
        return this.resume();
      case "finish":
        return this.finish();
      case "metricsComputed":
        return this.metricsComputed();
      case "submitVerified":
        return this.submitVerified();
      case "submitMismatch":
        return this.submitMismatch();
      case "submitNetworkError":
        return this.submitNetworkError();
      case "retry":
        return this.retry();
      case "restart":
        return this.restart();
      case "untrustedInput":
        return this.untrustedInput();
      case "escape":
        return this.escape();
    }
  }
}

export function createStateMachine(options: StateMachineOptions): TypingStateMachine {
  return new TypingStateMachine(options);
}
