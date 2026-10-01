import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findFormatProblems,
  findProgressProblems,
  isProgressLine,
} from "./check-ledger.mjs";

// A tracker that reports its own progress from a format with a hole in it.
//
// Session 6: the ledger had 216 rows, and its counts table said so correctly
// (MVP 97 | V1 74 | V2 12 | LATER 13 | UNTAGGED 20 | total 216). But the
// progress line every report is required to print has no UNTAGGED slot, so the
// reported denominators summed to 196 next to "overall 5/216". The 20 rows were
// the 17 NFR rows (the master spec's NFR table has no tag column at all) and
// the 3 rows the spec tags literally `[Policy]` (INT-10, BIZ-06, RET-21).
//
// The existing gate could not see this: it recomputes the ledger's own tables,
// which were correct. Nothing checked the *report*. These tests pin the report.

/** The real counts as of the ledger at 216 rows. */
const LEDGER = {
  rows: 216,
  doneVerified: 5,
  byTag: { MVP: 97, V1: 74, V2: 12, LATER: 13, UNTAGGED: 20 },
};

const GOOD_LINE =
  "MVP 5/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 | " +
  "LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 5/216";

// --- isProgressLine -----------------------------------------------------

test("a progress line is recognised; unrelated prose is not", () => {
  assert.equal(isProgressLine(GOOD_LINE), true);
  assert.equal(
    isProgressLine("| MVP | 97 |\n| LATER | 13 |\n| **Total** | **216** |"),
    false,
  );
  assert.equal(isProgressLine("Baseline: 265 tests, 0 failures."), false);
  assert.equal(isProgressLine(""), false);
});

// --- the defect, as it actually shipped ---------------------------------

test("BAD CASE: a line that omits the UNTAGGED bucket is rejected", () => {
  // This is the line BUILD-LOG.md carried: denominators sum to 196, not 216.
  const shipped =
    "MVP 5/97 DONE-VERIFIED | V1 0/74 | V2 0/12 | LATER 0/13 | " +
    "LAUNCH-GATED 0 | BLOCKED-EXTERNAL 0 | REJECTED 1 | overall 5/216";

  const problems = findProgressProblems(shipped, LEDGER);

  assert.ok(problems.length > 0, "the dropped bucket must be reported");
  assert.ok(
    problems.some((p) => p.includes("UNTAGGED")),
    `expected a problem naming UNTAGGED, got: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => p.includes("196") && p.includes("216")),
    `expected the denominator sum to be spelled out, got: ${JSON.stringify(problems)}`,
  );
});

test("GOOD CASE: a complete line is accepted", () => {
  assert.deepEqual(findProgressProblems(GOOD_LINE, LEDGER), []);
});

// --- each invariant on its own ------------------------------------------

test("denominators must sum to the overall denominator", () => {
  const line =
    "MVP 5/97 | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/25 | overall 5/221";
  const problems = findProgressProblems(line, LEDGER);
  assert.equal(problems.length, 1, JSON.stringify(problems));
  assert.match(problems[0], /sum to 221/);
});

test("the overall denominator must equal the ledger row count", () => {
  const line =
    "MVP 5/97 | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 | overall 5/215";
  const problems = findProgressProblems(line, LEDGER);
  assert.ok(problems.some((p) => p.includes("215") && p.includes("216")));
});

test("each denominator must equal the ledger's own count for that family", () => {
  const line =
    "MVP 5/90 | V1 0/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/27 | overall 5/216";
  const problems = findProgressProblems(line, LEDGER);
  assert.ok(
    problems.some((p) => p.includes("MVP") && p.includes("90") && p.includes("97")),
    JSON.stringify(problems),
  );
  assert.ok(problems.some((p) => p.includes("UNTAGGED") && p.includes("27")));
});

test("numerators must sum to the overall numerator", () => {
  const line =
    "MVP 4/97 | V1 1/74 | V2 0/12 | LATER 0/13 | UNTAGGED 0/20 | overall 5/216";
  const problems = findProgressProblems(line, LEDGER);
  assert.equal(problems.length, 1, JSON.stringify(problems));
  assert.match(problems[0], /numerators/);
});

test("a line with no overall figure is unverifiable, so it is rejected", () => {
  const problems = findProgressProblems("MVP 5/97 | V1 0/74", LEDGER);
  assert.equal(problems.length, 1, JSON.stringify(problems));
  assert.match(problems[0], /overall/);
});

test("a ledger with no untagged rows does not demand an UNTAGGED slot", () => {
  // The invariant is "every bucket with rows is reported", not "UNTAGGED must
  // always appear". A future ledger that tags everything must still pass.
  const fullyTagged = {
    rows: 196,
    doneVerified: 5,
    byTag: { MVP: 97, V1: 74, V2: 12, LATER: 13 },
  };
  const line =
    "MVP 5/97 | V1 0/74 | V2 0/12 | LATER 0/13 | LAUNCH-GATED 0 | overall 5/196";
  assert.deepEqual(findProgressProblems(line, fullyTagged), []);
});

// --- the format statement itself ----------------------------------------

test("BAD CASE: a format statement with no UNTAGGED slot is rejected", () => {
  // The root cause, verbatim from the ledger: the format the prompt mandates
  // prints four of the five buckets the ledger counts.
  const shipped =
    "MVP x/97 | V1 x/74 | V2 x/12 | LATER x/13 | LAUNCH-GATED n | " +
    "BLOCKED-EXTERNAL n | REJECTED n | overall x/216";

  const problems = findFormatProblems(shipped, LEDGER);

  assert.ok(problems.length > 0);
  assert.ok(
    problems.some((p) => p.includes("UNTAGGED")),
    JSON.stringify(problems),
  );
});

test("GOOD CASE: a format statement covering every bucket is accepted", () => {
  assert.deepEqual(findFormatProblems(GOOD_LINE.replace(/\d+/g, "x"), LEDGER), []);
});

test("a format statement for a fully tagged ledger needs no UNTAGGED slot", () => {
  const fullyTagged = {
    rows: 196,
    doneVerified: 5,
    byTag: { MVP: 97, V1: 74, V2: 12, LATER: 13 },
  };
  const shipped =
    "MVP x/97 | V1 x/74 | V2 x/12 | LATER x/13 | LAUNCH-GATED n | overall x/196";
  assert.deepEqual(findFormatProblems(shipped, fullyTagged), []);
});

// --- empty and missing input must not crash or pass silently ------------

test("an empty format statement is reported, not treated as fine", () => {
  const problems = findFormatProblems("", LEDGER);
  assert.equal(problems.length, 1, JSON.stringify(problems));
  assert.match(problems[0], /no progress-format statement/);
});

test("an empty ledger counts as nothing to check", () => {
  assert.deepEqual(findProgressProblems("", { rows: 0, doneVerified: 0, byTag: {} }), []);
});
