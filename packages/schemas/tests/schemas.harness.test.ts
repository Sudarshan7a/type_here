import { describe, expect, it } from "vitest";

import { SCHEMAS_VERSION } from "../src/index";

// M0-04 tooling-harness verification only — replaced by the M1-01 data-contract
// tests when M1 begins.
describe("schemas tooling harness (M0-04)", () => {
  it("runs vitest with coverage in the schemas package", () => {
    expect(SCHEMAS_VERSION).toBe("0.0.1");
  });
});
