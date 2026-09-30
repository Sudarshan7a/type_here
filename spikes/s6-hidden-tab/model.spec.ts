import { test, expect } from "@playwright/test";

// Node-side model check: deterministic, fake clock, no browser involvement.
// Run once (chromium project only) -- the outcome does not depend on the engine.
test.skip(
  ({ browser }) => browser.browserType().name() !== "chromium",
  "model check is browser-independent",
);

// model.ts is a dual-mode script (classic <script> in the browser, side-effect
// import in Node): it installs HiddenTabModel on globalThis. The compiled
// model.js exists for page.html; this spec uses the TypeScript source directly.
import "./model";

interface HiddenTabModelCtor {
  new (
    mode: "practice" | "verified",
    now: () => number,
  ): {
    state: string;
    start(): boolean;
    keystroke(): void;
    onVisibilityChange(hidden: boolean): void;
    onBlur(): void;
    onFocus(): void;
    stop(): {
      state: string;
      valid: boolean;
      keystrokes: number;
      scoredDurationMs: number;
      wallDurationMs: number;
    };
  };
}

const { HiddenTabModel } = globalThis as unknown as { HiddenTabModel: HiddenTabModelCtor };

function makeModel(mode: "practice" | "verified") {
  let t = 0;
  const model = new HiddenTabModel(mode, () => t);
  return {
    model,
    set: (ms: number) => {
      t = ms;
    },
  };
}

test("practice: pause span is excluded from scored duration (§4.10 worked example)", () => {
  const { model, set } = makeModel("practice");
  set(0);
  expect(model.start()).toBe(true);
  set(1000);
  model.keystroke();
  // Types for 3000 ms total, then alt-tabs away; returns at wall 13000 ms,
  // types 2000 ms more, stops at wall 15000 ms. Scored must be 5000 ms.
  set(3000);
  model.onVisibilityChange(true);
  expect(model.state).toBe("paused");
  set(13000);
  model.onVisibilityChange(false);
  model.onFocus();
  expect(model.state).toBe("running");
  set(14000);
  model.keystroke();
  set(15000);
  const result = model.stop();
  expect(result.state).toBe("finished");
  expect(result.valid).toBe(true);
  expect(result.keystrokes).toBe(2);
  expect(result.scoredDurationMs).toBe(5000);
  expect(result.wallDurationMs).toBe(15000);
});

test("practice: blur then hidden pauses once; visible then focus resumes once", () => {
  const { model, set } = makeModel("practice");
  set(0);
  model.start();
  set(1000);
  model.onBlur();
  expect(model.state).toBe("paused");
  set(1200);
  model.onVisibilityChange(true); // must NOT double-pause
  expect(model.state).toBe("paused");
  set(5000);
  model.onVisibilityChange(false); // resumes per the spike contract
  expect(model.state).toBe("running");
  set(5100);
  model.onFocus(); // must NOT double-resume
  expect(model.state).toBe("running");
  set(7000);
  const result = model.stop();
  // 1000 ms before pause + 2000 ms after resume = 3000 ms scored.
  expect(result.scoredDurationMs).toBe(3000);
  expect(result.wallDurationMs).toBe(7000);
  expect(result.valid).toBe(true);
});

test("verified: hidden mid-test marks the attempt invalid, elapsed preserved", () => {
  const { model, set } = makeModel("verified");
  set(0);
  model.start();
  set(500);
  model.keystroke();
  set(1000);
  model.onVisibilityChange(true);
  expect(model.state).toBe("invalid");
  set(5000);
  const result = model.stop();
  expect(result.state).toBe("invalid");
  expect(result.valid).toBe(false);
  // Local (unverified) result is still computable: elapsed so far is kept.
  expect(result.scoredDurationMs).toBe(1000);
  expect(result.wallDurationMs).toBe(5000);
});

test("practice: stop while paused ends the test, pause excluded", () => {
  const { model, set } = makeModel("practice");
  set(0);
  model.start();
  set(1000);
  model.onBlur();
  set(11000);
  const result = model.stop();
  expect(result.state).toBe("finished");
  expect(result.valid).toBe(true);
  expect(result.scoredDurationMs).toBe(1000);
  expect(result.wallDurationMs).toBe(11000);
});

test("practice: paused longer than 10 minutes auto-abandons to idle (§4.10 timeout)", () => {
  const { model, set } = makeModel("practice");
  set(0);
  model.start();
  set(1000);
  model.onBlur();
  set(700000); // pausedAtMs = 1000; 699 s later, above the 600 s timeout
  model.onFocus();
  expect(model.state).toBe("idle");
  const result = model.stop();
  expect(result.valid).toBe(false);
  // A fresh test can start after the abandon.
  set(701000);
  expect(model.start()).toBe(true);
  expect(model.state).toBe("running");
});
