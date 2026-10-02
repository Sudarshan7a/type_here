import { describe, expect, it } from "vitest";

import { ENGINE_MODEL_VERSION, computeResult } from "../src/index";

// The M0-04 tooling-harness stub is replaced by the real ENG-FIXTURE-* suite
// (chapter-4 deep-dive §4.13). What remains here is the version/API contract
// the rest of the app depends on.
describe("engine package contract", () => {
  it("exposes the metric-model version that ResultSummary stamps carry", () => {
    expect(ENGINE_MODEL_VERSION).toBe("1.1.0");
  });

  it("exports a single computeResult entry point for client and server", () => {
    expect(typeof computeResult).toBe("function");
  });
});
