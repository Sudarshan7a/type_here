import { describe, expect, it } from "vitest";

import {
  SESSION_STATES,
  createStateMachine,
  type SessionEvent,
  type SessionMode,
} from "../src/state-machine.js";

/**
 * Chapter-4 deep-dive §4.10 — the lifecycle state machine, tested before it
 * exists. Every named test from the catalog is implemented here, plus
 * ENG-STATE-PROP-01.
 */

function machine(mode: SessionMode = "practice") {
  let t = 0;
  const m = createStateMachine({ mode, now: () => t });
  return {
    m,
    at: (ms: number) => {
      t = ms;
    },
  };
}

describe("ENG-STATE-01-full-happy-path", () => {
  it("idle -> ready -> running -> finished -> submitting -> submitted", () => {
    const { m } = machine();
    expect(m.state).toBe("idle");
    m.focus();
    expect(m.state).toBe("ready");
    m.keystroke();
    expect(m.state).toBe("running");
    m.keystroke();
    m.finish();
    expect(m.state).toBe("finished");
    // finished -> submitting is automatic once metrics are computed.
    m.metricsComputed();
    expect(m.state).toBe("submitting");
    m.submitVerified();
    expect(m.state).toBe("submitted");
    expect(m.verified).toBe(true);
  });
});

describe("ENG-STATE-02-pause-resume-time-exclusion", () => {
  it("§4.10 worked example: scored duration is exactly 5000 ms across a 10 s pause", () => {
    const { m, at } = machine("practice");
    m.focus();
    at(0);
    m.keystroke();
    at(3000);
    m.keystroke();
    at(3000);
    m.blur();
    expect(m.state).toBe("paused");
    at(13000);
    m.resume();
    expect(m.state).toBe("running");
    at(14000);
    m.keystroke();
    at(15000);
    m.finish();
    // 3000 before the pause + 2000 after = 5000, never 15000.
    expect(m.scoredDurationMs).toBe(5000);
    expect(m.wallDurationMs).toBe(15000);
  });
});

describe("ENG-STATE-03-blur-invalidates-verified-mode", () => {
  it("blur during a verified test invalidates it; practice mode pauses", () => {
    const verified = machine("verified");
    verified.m.focus();
    verified.m.keystroke();
    verified.m.blur();
    expect(verified.m.state).toBe("invalid");
    expect(verified.m.verified).toBe(false);

    const practice = machine("practice");
    practice.m.focus();
    practice.m.keystroke();
    practice.m.blur();
    expect(practice.m.state).toBe("paused");
  });

  it("untrusted input invalidates a verified run immediately (§4.10 row)", () => {
    const { m } = machine("verified");
    m.focus();
    m.keystroke();
    m.untrustedInput();
    expect(m.state).toBe("invalid");
  });
});

describe("ENG-STATE-04-blur-pauses-practice-mode", () => {
  it("ready (nothing scored yet) blurs back to idle, not paused", () => {
    const { m } = machine();
    m.focus();
    expect(m.state).toBe("ready");
    m.blur();
    expect(m.state).toBe("idle");

    const escape = machine();
    escape.m.focus();
    escape.m.escape();
    expect(escape.m.state).toBe("idle");
  });
});

describe("ENG-STATE-05-offline-queue-and-retry-same-idempotency-key", () => {
  it("a network failure queues the result and retries with the same key", () => {
    const { m } = machine();
    m.focus();
    m.keystroke();
    m.finish();
    m.metricsComputed();
    const key = m.idempotencyKey;
    expect(key).toBeTruthy();

    m.submitNetworkError();
    expect(m.state).toBe("failedOffline");

    m.retry();
    expect(m.state).toBe("submitting");
    // Never re-submit as a "new" result: the key is stable across retries.
    expect(m.idempotencyKey).toBe(key);
  });

  it("a server mismatch still shows the local result, flagged unverified", () => {
    const { m } = machine();
    m.focus();
    m.keystroke();
    m.finish();
    m.metricsComputed();
    m.submitMismatch();
    expect(m.state).toBe("submitted");
    expect(m.verified).toBe(false);
    expect(m.flags).toContain("unverified");
  });
});

describe("ENG-STATE-06-reject-does-not-change-state", () => {
  it("a must-correct rejected keystroke leaves the state in running", () => {
    const { m } = machine();
    m.focus();
    m.keystroke();
    m.rejectedKeystroke();
    expect(m.state).toBe("running");
    expect(m.rejectedAttempts).toBe(1);
  });
});

describe("ENG-STATE-07-abandon-paused-test-after-timeout", () => {
  it("a paused test auto-abandons to idle after the timeout", () => {
    const { m, at } = machine();
    m.focus();
    at(0);
    m.keystroke();
    at(1000);
    m.blur();
    expect(m.state).toBe("paused");
    at(1000 + 10 * 60_000 + 1);
    m.resume();
    expect(m.state).toBe("idle");

    // And a fresh test can start afterwards.
    m.focus();
    expect(m.state).toBe("ready");
  });

  it("restart abandons a paused test explicitly", () => {
    const { m } = machine();
    m.focus();
    m.keystroke();
    m.blur();
    m.restart();
    expect(m.state).toBe("idle");
  });
});

describe("ENG-STATE-PROP-01", () => {
  /** Deterministic PRNG so a failure is reproducible. */
  function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  const EVENTS: SessionEvent[] = [
    "focus",
    "keystroke",
    "rejectedKeystroke",
    "blur",
    "resume",
    "finish",
    "metricsComputed",
    "submitVerified",
    "submitMismatch",
    "submitNetworkError",
    "retry",
    "restart",
    "untrustedInput",
    "escape",
  ];

  it("1,000 random event sequences never leave the documented state set", () => {
    const next = rng(20260928);
    let events = 0;
    for (let run = 0; run < 1_000; run++) {
      const { m } = machine(next() < 0.5 ? "practice" : "verified");
      const length = 1 + Math.floor(next() * 12);
      for (let i = 0; i < length; i++) {
        const event = EVENTS[Math.floor(next() * EVENTS.length)]!;
        m.apply(event);
        events += 1;
        expect(SESSION_STATES).toContain(m.state);
      }
    }
    expect(events).toBeGreaterThan(5_000);
  });

  it("submitted is unreachable without passing through finished first", () => {
    const next = rng(4242);
    for (let run = 0; run < 1_000; run++) {
      const { m } = machine();
      const seen: string[] = [];
      const length = 1 + Math.floor(next() * 12);
      for (let i = 0; i < length; i++) {
        const event = EVENTS[Math.floor(next() * EVENTS.length)]!;
        m.apply(event);
        if (m.state === "submitted" || m.state === "failedOffline") {
          expect(seen).toContain("finished");
        }
        if (!seen.includes(m.state)) seen.push(m.state);
      }
    }
  });
});
