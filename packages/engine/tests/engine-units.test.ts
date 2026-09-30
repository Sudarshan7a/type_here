import { describe, expect, it } from "vitest";

import { computeFromEvents, filterEvents, isScoringPress } from "../src/index";
import { applyPress, createTextModel } from "../src/text-model.js";

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

function down(key: string, t: number, extra: Partial<Parameters<typeof makeEvent>[2]> = {}) {
  return makeEvent(key, t, extra);
}

function makeEvent(
  key: string,
  t: number,
  extra: { type?: "down" | "up"; repeat?: boolean; isTrusted?: boolean; auto?: boolean } = {},
) {
  return {
    code: key === " " ? "Space" : key === "Backspace" ? "Backspace" : `Key${key.toUpperCase()}`,
    key,
    type: extra.type ?? "down",
    t,
    mods: { ...NO_MODS },
    repeat: extra.repeat ?? false,
    isTrusted: extra.isTrusted ?? true,
    auto: extra.auto ?? false,
  };
}

describe("input filter (E2)", () => {
  it("separates repeats, untrusted, auto, keyups, and ignored modifiers", () => {
    const filtered = filterEvents([
      down("a", 0),
      down("a", 100, { repeat: true }),
      down("b", 200, { isTrusted: false }),
      makeEvent("c", 300, { auto: true }),
      makeEvent("a", 350, { type: "up" }),
      down("Shift", 400),
    ]);

    expect(filtered.scoringPresses).toHaveLength(1);
    expect(filtered.repeatDrops).toHaveLength(1);
    expect(filtered.untrusted).toHaveLength(1);
    expect(filtered.auto).toHaveLength(1);
    expect(filtered.keyUps).toHaveLength(1);
    expect(filtered.ignored.map((e) => e.key)).toEqual(["Shift"]);
  });

  it("never treats a keyup or a repeat as a scoring press", () => {
    expect(isScoringPress(makeEvent("a", 0, { type: "up" }))).toBe(false);
    expect(isScoringPress(down("a", 0, { repeat: true }))).toBe(false);
    expect(isScoringPress(down("Backspace", 0))).toBe(true);
    expect(isScoringPress(down("Enter", 0))).toBe(false);
  });
});

describe("text model (E4)", () => {
  it("free mode keeps a wrong character in the text", () => {
    const model = createTextModel("cat", "free");
    applyPress(model, down("x", 0));
    expect(model.buffer.join("")).toBe("x");
    expect(model.rejected).toBeNull();
  });

  it("stop-on-error rejects the wrong press and then everything until corrected", () => {
    const model = createTextModel("cat", "stop-on-error");
    expect(applyPress(model, down("c", 0))).toBe("inserted");
    expect(applyPress(model, down("x", 10))).toBe("rejected");
    expect(applyPress(model, down("d", 20))).toBe("rejected");
    expect(model.buffer.join("")).toBe("c");
    expect(model.rejectedAttempts).toBe(2);
    expect(applyPress(model, down("Backspace", 30))).toBe("cleared");
    expect(applyPress(model, down("a", 40))).toBe("inserted");
    expect(model.buffer.join("")).toBe("ca");
  });

  it("a Backspace on an empty buffer is ignored and uncounted", () => {
    const model = createTextModel("cat", "free");
    expect(applyPress(model, down("Backspace", 0))).toBe("ignored");
    expect(model.backspaces).toBe(0);
  });

  it("ignores keyups, repeats, untrusted, and multi-character non-Backspace keys", () => {
    const model = createTextModel("cat", "free");
    expect(applyPress(model, makeEvent("c", 0, { type: "up" }))).toBe("ignored");
    expect(applyPress(model, down("c", 1, { repeat: true }))).toBe("ignored");
    expect(applyPress(model, down("c", 2, { isTrusted: false }))).toBe("ignored");
    expect(applyPress(model, down("Enter", 3))).toBe("ignored");
    expect(model.buffer).toHaveLength(0);
  });

  it("auto-inserted characters enter the text but are not user attempts", () => {
    const model = createTextModel("()", "free");
    applyPress(model, down("(", 0));
    applyPress(model, down(")", 10, { auto: true }));
    expect(model.buffer.join("")).toBe("()");
    expect(model.autoInserts).toBe(1);
    expect(model.totalAttempts).toBe(1);
  });
});

describe("metrics edge cases (E3/E5/E6)", () => {
  it("an empty log produces zeroed metrics instead of NaN", () => {
    const result = computeFromEvents("cat", [], "free");
    expect(result.summary.rawWpm).toBe(0);
    expect(result.summary.ikiMeanMs).toBeNull();
    expect(result.summary.consistency).toBeNull();
    expect(result.summary.burstWpm).toBe(0);
    expect(result.summary.kspc).toBe(0);
  });

  it("IKI is null when every gap exceeds the 5 s exclusion", () => {
    const result = computeFromEvents("ab", [down("a", 0), down("b", 9000)], "free");
    expect(result.summary.ikiMeanMs).toBeNull();
    expect(result.details.ikiExcludedGaps).toBe(1);
  });

  it("rollover is 0 when no keyup ever arrives (conservative, never credited)", () => {
    const result = computeFromEvents("ab", [down("a", 0), down("b", 10)], "free");
    expect(result.summary.rolloverRatio).toBe(0);
  });

  it("consistency is 0 for a long all-idle run and null below the minimum duration", () => {
    const longIdle = computeFromEvents("ab", [down("a", 0), down("b", 12_000)], "free");
    expect(longIdle.summary.consistency).toBe(0);
    const short = computeFromEvents("ab", [down("a", 0), down("b", 4000)], "free");
    expect(short.summary.consistency).toBeNull();
  });

  it("a verified session is invalidated by untrusted input or focus loss", () => {
    const untrusted = computeFromEvents(
      "ab",
      [down("a", 0), down("b", 100, { isTrusted: false })],
      "free",
      {
        verified: true,
      },
    );
    expect(untrusted.summary.verified).toBe(false);
    expect(untrusted.summary.flags).toContain("untrusted-events");
    expect(untrusted.summary.flags).toContain("verified-invalid-input");

    const clean = computeFromEvents("ab", [down("a", 0), down("b", 100)], "free", {
      verified: true,
    });
    expect(clean.summary.verified).toBe(true);

    const blurred = computeFromEvents("ab", [down("a", 0), down("b", 100)], "free", {
      verified: true,
      markers: [{ kind: "blur", t: 50 }],
    });
    expect(blurred.summary.verified).toBe(false);
    expect(blurred.summary.flags).toContain("verified-invalid-input");
  });

  it("auto events are flagged but never invalidate a practice session", () => {
    const result = computeFromEvents("ab", [down("a", 0), down("b", 100, { auto: true })], "free");
    expect(result.summary.flags).toContain("auto-events-present");
    expect(result.summary.verified).toBe(false);
  });
});
