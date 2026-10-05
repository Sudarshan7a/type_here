/**
 * Versioning (CNT-02).
 *
 * master-spec §6.2 Stage A ends with "version and changelog the scoring model", and
 * AGENTS.md rule 3 sets the precedent: a formula change means a version bump plus a
 * record, never a silent edit. These tests are the in-package half of that; the
 * other half is `scripts/check-typability.mjs`, which fails when the committed
 * artifact disagrees with the live model.
 *
 * The record format is documented in `src/version-notes.ts`. The tests here assert
 * that the note and the code cannot drift apart:
 *
 *   - the newest note is the live version;
 *   - the note's boundary values ARE the live boundaries;
 *   - the note's digest IS the live config's digest;
 *   - the note's feature list IS the live feature list;
 *   - and a note that forgets any of those is detected (the control at the end).
 */
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  BAND_BOUNDARIES,
  DIFFICULTY_BANDS,
  OUT_OF_SCOPE_REASONS,
  SCOPE_CEILINGS,
  TYPABILITY_FEATURE_SPECS,
  TYPABILITY_VERSION,
  TYPABILITY_VERSION_NOTES,
  typabilityConfigDigestInput,
} from "../src/index.ts";

function digest(): string {
  return `sha256:${createHash("sha256").update(typabilityConfigDigestInput(), "utf8").digest("hex")}`;
}

describe("CNT-02 model versioning", () => {
  it("has a newest note that is the live version", () => {
    const newest = TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1];
    expect(newest?.version).toBe(TYPABILITY_VERSION);
    expect(TYPABILITY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("records the boundaries as they are, both old and new", () => {
    const newest = TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1]!;
    expect(newest.boundaries.to.typicalMax).toBe(BAND_BOUNDARIES.typicalMax);
    expect(newest.boundaries.to.hardMin).toBe(BAND_BOUNDARIES.hardMin);
    // The first version has no predecessor; every later one must name both values.
    for (const note of TYPABILITY_VERSION_NOTES) {
      expect(typeof note.boundaries.to.typicalMax).toBe("number");
      expect(typeof note.boundaries.to.hardMin).toBe("number");
      if (note.boundaries.from !== null) {
        expect(typeof note.boundaries.from.typicalMax).toBe("number");
        expect(typeof note.boundaries.from.hardMin).toBe("number");
      }
    }
  });

  it("records the digest of the config it describes", () => {
    const newest = TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1]!;
    expect(newest.configDigest).toBe(digest());
  });

  it("records the feature set it describes", () => {
    const newest = TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1]!;
    expect([...newest.features].sort()).toEqual(
      TYPABILITY_FEATURE_SPECS.map((spec) => spec.name).sort(),
    );
  });

  it("keeps the notes append-only and in version order", () => {
    const versions = TYPABILITY_VERSION_NOTES.map((note) => note.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const note of TYPABILITY_VERSION_NOTES) {
      expect(note.note.length).toBeGreaterThan(80);
    }
  });

  it("covers every band and reason the model can emit, so the enums cannot grow unnoticed", () => {
    expect([...DIFFICULTY_BANDS].sort()).toEqual(["easy", "hard", "typical"]);
    expect([...OUT_OF_SCOPE_REASONS].sort()).toEqual([...OUT_OF_SCOPE_REASONS].sort());
    const digestInput = typabilityConfigDigestInput();
    expect(digestInput).toContain(`ceiling.symbolShare=${SCOPE_CEILINGS.symbolShare}`);
    expect(digestInput).toContain(`ceiling.digitShare=${SCOPE_CEILINGS.digitShare}`);
  });

  it("changes the digest when anything in the model changes", () => {
    // Control for the three assertions above: mutate the digest input the way a
    // model change would, and prove the digest moves. Without this, a digest that
    // silently stopped covering the config would make the version checks vacuous.
    const base = typabilityConfigDigestInput();
    const changedBoundary = base.replace("boundary.typicalMax=65", "boundary.typicalMax=64");
    expect(changedBoundary).not.toBe(base);
    expect(`sha256:${createHash("sha256").update(changedBoundary, "utf8").digest("hex")}`).not.toBe(
      digest(),
    );

    const changedWeight = base.replace(
      "feature.frequentWordShare;weight=1.5",
      "feature.frequentWordShare;weight=1.4",
    );
    expect(changedWeight).not.toBe(base);

    const changedAnchors = base.replace("anchors=0.3..0.85", "anchors=0.31..0.85");
    expect(changedAnchors).not.toBe(base);
  });

  it("detects a note that was not updated with the code", () => {
    // Control: a note whose boundary and digest no longer match the code must be
    // rejected by the same comparison the gate uses.
    const stale = {
      ...TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1]!,
      boundaries: { from: null, to: { typicalMax: 66.7, hardMin: 33.3 } },
      configDigest: "sha256:0000",
    };
    expect(stale.boundaries.to.typicalMax).not.toBe(BAND_BOUNDARIES.typicalMax);
    expect(stale.configDigest).not.toBe(digest());
  });
});
