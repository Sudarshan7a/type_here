import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOG_A, LOG_B, TARGET } from "./logs.js";
import { parityVectors } from "./vectors.js";

describe("Chapter 4 Example A/B metrics under Node (vitest)", () => {
  it("recomputes the worked-example values from independent arithmetic", () => {
    const { a, b } = parityVectors();

    expect(LOG_A.length).toBe(11);
    expect(LOG_B.length).toBe(13);
    expect(TARGET).toBe("the cat sat");

    expect(a.ikiCount).toBe(10);
    expect(a.ikiMeanMs).toBeCloseTo(5454 / 10, 12);
    expect(a.netWpm).toBeCloseTo(11 / 5 / (5454 / 60000), 12);
    expect(a.rawWpm).toBeCloseTo(11 / 5 / (5454 / 60000), 12);
    expect(a.keystrokeAccuracy).toBeCloseTo(11 / 11, 12);

    expect(b.ikiCount).toBe(12);
    expect(b.ikiMeanMs).toBeCloseTo(5854 / 12, 12);
    expect(b.netWpm).toBeCloseTo(11 / 5 / (5854 / 60000), 12);
    expect(b.rawWpm).toBeCloseTo(12 / 5 / (5854 / 60000), 12);
    expect(b.keystrokeAccuracy).toBeCloseTo(11 / 12, 12);

    expect(a.netWpm.toFixed(1)).toBe("24.2");
    expect(b.netWpm.toFixed(1)).toBe("22.5");
    expect(b.rawWpm.toFixed(1)).toBe("24.6");
    expect((b.keystrokeAccuracy * 100).toFixed(1)).toBe("91.7");
  });

  it("writes the node-computed parity vector for the browser spec", () => {
    const expected = {
      generatedBy: "parity.node.test.ts (vitest, node)",
      ...parityVectors(),
    };
    writeFileSync(
      new URL("./parity.expected.json", import.meta.url),
      JSON.stringify(expected, null, 2) + "\n",
    );
  });
});
