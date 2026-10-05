/**
 * Typability gate tests (CNT-02).
 *
 * Run with `node --test`, like the other script suites: `scripts/` is not a
 * workspace package, so `pnpm -r test` never sees these. They live here rather
 * than in the package because they test the GATE - the code that runs in CI - and
 * because the only honest fixture for a gate is a damaged copy of the real
 * artifact.
 *
 * Nearly every test is the failing direction. A gate suite made only of "the real
 * corpus passes" is how a gate passes forever without ever having been shown it
 * can fail, so each rule below gets a plausible-looking artifact that must be
 * rejected, and the last two tests are the controls that prove the fixture damage
 * is actually being seen.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAND_BOUNDARIES,
  DIFFICULTY_BANDS,
  OUT_OF_SCOPE_REASONS,
  TYPABILITY_VERSION,
  TYPABILITY_VERSION_NOTES,
  typabilityBand,
} from "../packages/typability/src/index.ts";
import { findTypabilityOffenders, liveConfigDigest } from "./typability-gate.mjs";
import { calibrationReport, coverageReport } from "./check-typability.mjs";
import { serialiseCorpus } from "./corpus-pipeline.mjs";
import { buildFromRepo } from "./build-corpus.mjs";
import { findCorpusOffenders } from "./check-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT = JSON.parse(readFileSync(join(ROOT, "content", "corpus.json"), "utf8"));

const fresh = () => JSON.parse(JSON.stringify(ARTIFACT));
const codes = (offenders) => offenders.map((o) => o.split(" :: ")[0]);
const indexOfItem = (artifact, id) => artifact.items.findIndex((i) => i.id === id);
const bandedItem = (artifact = fresh()) => artifact.items.find((i) => i.difficulty !== null);
const codeItem = (artifact = fresh()) => artifact.items.find((i) => i.family === "CODE");

/* ------------------------------------------------------------------ passing */

test("the real committed artifact passes every typability rule", () => {
  assert.deepEqual(findTypabilityOffenders(fresh()), []);
});

test("the corpus gate (CNT-01) passes with the typability rules delegated into it", () => {
  assert.deepEqual(findCorpusOffenders(fresh(), buildFromRepo(ROOT)), []);
});

test("the corpus builds byte-identically twice, so the bands are reproducible", () => {
  // The stronger version of "no drift": not that the gate agrees with itself, but
  // that two independent builds produce the same bytes - and those bytes are the
  // committed file. A band that depended on iteration order, hash order or a clock
  // would pass the drift test and fail this one.
  const first = serialiseCorpus(buildFromRepo(ROOT));
  const second = serialiseCorpus(buildFromRepo(ROOT));
  assert.equal(second, first);
  assert.equal(first, readFileSync(join(ROOT, "content", "corpus.json"), "utf8"));
});

test("the artifact's recorded model, boundaries and digest are the live ones", () => {
  const block = fresh().typability;
  assert.equal(block.modelVersion, TYPABILITY_VERSION);
  assert.deepEqual(block.boundaries, {
    typicalMax: BAND_BOUNDARIES.typicalMax,
    hardMin: BAND_BOUNDARIES.hardMin,
  });
  assert.equal(block.configDigest, liveConfigDigest());
  assert.deepEqual(block.bandEnum, [...DIFFICULTY_BANDS]);
  assert.deepEqual(block.outOfScopeReasons, [...OUT_OF_SCOPE_REASONS]);
});

/* ------------------------------------------------------------- T1 vacuity */

test("a missing artifact fails rather than passing vacuously", () => {
  assert.deepEqual(codes(findTypabilityOffenders(null)), ["TYPABILITY-NO-ARTIFACT"]);
});

test("an empty artifact fails: a gate that passes on zero items proves nothing", () => {
  const empty = { ...fresh(), items: [] };
  assert.deepEqual(codes(findTypabilityOffenders(empty)), ["TYPABILITY-EMPTY-CORPUS"]);
});

test("an artifact whose typability block was deleted fails", () => {
  const stripped = fresh();
  delete stripped.typability;
  assert.ok(codes(findTypabilityOffenders(stripped)).includes("TYPABILITY-NO-MODEL-BLOCK"));
});

/* --------------------------------------------------------------- T2 drift */

test("an item whose stored band was hand-edited fails as drift", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, bandedItem(tampered).id);
  const original = tampered.items[index].difficulty;
  // To a DIFFERENT band, not just "easy": a fixture that edits an item into the
  // value it already has would prove nothing.
  tampered.items[index].difficulty = DIFFICULTY_BANDS.find((band) => band !== original);
  const offenders = findTypabilityOffenders(tampered);
  assert.ok(codes(offenders).includes("TYPABILITY-DRIFT"));
});

test("an item whose text was edited but whose band was left alone fails as drift", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, bandedItem(tampered).id);
  tampered.items[index].text = "MEETING AGENDA 2026 (KPJ/LMN) <<< >>> ||| ### 99% $412.50";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-DRIFT"));
});

test("a band invented for an out-of-scope item fails as drift", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, codeItem(tampered).id);
  tampered.items[index].difficulty = "hard";
  tampered.items[index].difficultySource = "computed";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-DRIFT"));
});

/* ------------------------------------------------------------ T3 code band */

test("a code item carrying a prose band fails", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, codeItem(tampered).id);
  tampered.items[index].difficulty = "typical";
  tampered.items[index].difficultySource = "computed";
  tampered.items[index].bandReason = null;
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-CODE-BAND"));
});

test("a code item that keeps its source-declared band out of `difficulty` passes", () => {
  // The declared code band is preserved in declaredDifficulty on purpose: it is
  // an authoring claim about code, and the model has nothing to say about it.
  const item = codeItem();
  assert.equal(item.difficulty, null);
  assert.equal(item.bandReason, "out-of-scope-code");
  assert.ok(["typical", "hard", null].includes(item.declaredDifficulty));
  assert.deepEqual(findTypabilityOffenders(fresh()), []);
});

/* ------------------------------------------------------------- T4 the enums */

test("a band outside the declared enum fails", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, bandedItem(tampered).id);
  tampered.items[index].difficulty = "spicy";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-ENUM"));
});

test("a null band with no reason fails: a silent null is not an honest one", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, codeItem(tampered).id);
  tampered.items[index].bandReason = null;
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-REASON"));
});

test("a null band with an undeclared reason fails", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, codeItem(tampered).id);
  tampered.items[index].bandReason = "too-hard-for-me";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-REASON"));
});

test("an item carrying both a band and a reason fails", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, bandedItem(tampered).id);
  tampered.items[index].bandReason = "out-of-scope-code";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-REASON"));
});

test("an artifact whose bandEnum disagrees with the model fails", () => {
  const tampered = fresh();
  tampered.typability.bandEnum = ["easy", "hard"];
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-ENUM"));
});

/* --------------------------------------------------------- T5 the band source */

test("a band marked as coming from the source document fails: bands are computed", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, bandedItem(tampered).id);
  tampered.items[index].difficultySource = "declared";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-SOURCE"));
});

test("an unbanded item marked as computed fails", () => {
  const tampered = fresh();
  const index = indexOfItem(tampered, codeItem(tampered).id);
  tampered.items[index].difficultySource = "computed";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-BAND-SOURCE"));
});

/* --------------------------------------------------- T6 declared comparison */

test("a declared comparison that disagrees with a fresh computation fails", () => {
  const tampered = fresh();
  const item = tampered.items.find((i) => i.declaredBandAgrees === true);
  const index = tampered.items.indexOf(item);
  tampered.items[index].declaredBandAgrees = false;
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-DECLARED-AGREEMENT"));
});

test("a declared band that does not normalise to the stored claim fails", () => {
  const tampered = fresh();
  const item = tampered.items.find((i) => i.declaredDifficulty !== null);
  const index = tampered.items.indexOf(item);
  tampered.items[index].declaredDifficulty = "brutal";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-DECLARED-BAND"));
});

test("an out-of-scope item with a declared band records no verdict either way", () => {
  const item = codeItem();
  assert.equal(item.declaredBandAgrees, null);
  const verdict = typabilityBand({
    text: item.text,
    family: item.family,
    language: item.language,
    declaredBand: item.declaredDifficulty,
  });
  assert.equal(verdict.band, null);
  assert.equal(verdict.declaredBandAgrees, null);
});

/* ------------------------------------------------ T10 the version note */

test("a version note that does not match the live model fails, rule by rule", () => {
  // Injected notes rather than edited sources: mutation testing showed that a
  // version-note check whose failing direction requires modifying the package can
  // pass without ever having been shown to fail.
  const live = TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1];

  const wrongVersion = findTypabilityOffenders(fresh(), {
    notes: [{ ...live, version: "0.0.1" }],
  });
  assert.ok(codes(wrongVersion).includes("TYPABILITY-NOTE-VERSION"));

  // ONE boundary wrong per case, with its own finding code. Getting both wrong at
  // once would pass with a shared code and the second check would never be
  // exercised - which is the shape of bug mutation testing exists to find.
  const wrongTypicalMax = findTypabilityOffenders(fresh(), {
    notes: [{ ...live, boundaries: { from: null, to: { ...live.boundaries.to, typicalMax: 60 } } }],
  });
  assert.deepEqual(codes(wrongTypicalMax), ["TYPABILITY-NOTE-TYPICAL-MAX"]);

  const wrongHardMin = findTypabilityOffenders(fresh(), {
    notes: [{ ...live, boundaries: { from: null, to: { ...live.boundaries.to, hardMin: 50 } } }],
  });
  assert.deepEqual(codes(wrongHardMin), ["TYPABILITY-NOTE-HARD-MIN"]);

  const wrongDigest = findTypabilityOffenders(fresh(), {
    notes: [{ ...live, configDigest: "sha256:0000" }],
  });
  assert.ok(codes(wrongDigest).includes("TYPABILITY-NOTE-DIGEST"));

  const wrongFeatures = findTypabilityOffenders(fresh(), {
    notes: [{ ...live, features: ["symbolShare"] }],
  });
  assert.ok(codes(wrongFeatures).includes("TYPABILITY-NOTE-FEATURES"));

  const none = findTypabilityOffenders(fresh(), { notes: [] });
  assert.ok(codes(none).includes("TYPABILITY-NOTE-ABSENT"));

  // The live notes pass.
  assert.deepEqual(findTypabilityOffenders(fresh(), { notes: TYPABILITY_VERSION_NOTES }), []);
});

/* ---------------------------------------------------- T7-T9 the model stamp */

test("an artifact stamped with a different model version fails", () => {
  const tampered = fresh();
  tampered.typability.modelVersion = "0.0.9";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-MODEL-VERSION"));
});

test("a boundary moved in the artifact without a version bump fails, one code per boundary", () => {
  const moved = fresh();
  moved.typability.boundaries.typicalMax = BAND_BOUNDARIES.typicalMax + 1;
  assert.deepEqual(codes(findTypabilityOffenders(moved)), ["TYPABILITY-BOUNDARY-TYPICAL-MAX"]);

  const other = fresh();
  other.typability.boundaries.hardMin = BAND_BOUNDARIES.hardMin - 1;
  assert.deepEqual(codes(findTypabilityOffenders(other)), ["TYPABILITY-BOUNDARY-HARD-MIN"]);
});

test("a config digest that does not match the live model fails", () => {
  const tampered = fresh();
  tampered.typability.configDigest = "sha256:0000";
  assert.ok(codes(findTypabilityOffenders(tampered)).includes("TYPABILITY-CONFIG-DIGEST"));
});

test("the digest is injected rather than recomputed, so a caller can drive the rule directly", () => {
  const tampered = fresh();
  assert.deepEqual(findTypabilityOffenders(tampered, { digest: liveConfigDigest() }), []);
  const other = findTypabilityOffenders(tampered, { digest: "sha256:deadbeef" });
  assert.ok(codes(other).includes("TYPABILITY-CONFIG-DIGEST"));
});

/* ------------------------------------------------------- T11 the coverage lie */

// One test per arithmetic rule, and each with its own finding code. Mutation
// testing is why: with a single shared "COVERAGE" code, disabling any one of
// these rules left the code in the offender set and two mutants survived.

test("a coverage block that claims the wrong item count fails", () => {
  const tampered = fresh();
  tampered.typability.coverage.items = tampered.items.length - 1;
  assert.deepEqual(codes(findTypabilityOffenders(tampered)), ["TYPABILITY-COVERAGE-ITEMS"]);
});

test("a coverage block that claims the wrong banded count fails", () => {
  const tampered = fresh();
  tampered.typability.coverage.banded = tampered.items.length;
  assert.deepEqual(codes(findTypabilityOffenders(tampered)), ["TYPABILITY-COVERAGE-BANDED"]);
});

test("a coverage block that claims the wrong unbanded count fails", () => {
  const tampered = fresh();
  tampered.typability.coverage.unbanded = 0;
  assert.deepEqual(codes(findTypabilityOffenders(tampered)), ["TYPABILITY-COVERAGE-UNBANDED"]);
});

test("a coverage block that miscounts one reason fails", () => {
  const tampered = fresh();
  tampered.typability.coverage.byReason["out-of-scope-word-pool"] = 40;
  assert.deepEqual(codes(findTypabilityOffenders(tampered)), ["TYPABILITY-COVERAGE-REASON"]);
});

test("a coverage block that omits a reason the items carry fails", () => {
  // The reverse direction, which a "check the keys that are present" loop cannot
  // see: deleting the key entirely has to fail too.
  const tampered = fresh();
  delete tampered.typability.coverage.byReason["out-of-scope-code"];
  assert.deepEqual(codes(findTypabilityOffenders(tampered)), ["TYPABILITY-COVERAGE-REASON"]);
});

/* ------------------------------------------------------------- determinism */

test("the gate is pure: the same artifact gives the same findings, in any order", () => {
  const first = findTypabilityOffenders(fresh());
  const second = findTypabilityOffenders(fresh());
  assert.deepEqual(first, second);
  assert.deepEqual(findTypabilityOffenders(fresh()), []);
});

test("the coverage report is recomputed from the items, not read from the artifact", () => {
  const tampered = fresh();
  tampered.typability.coverage.banded = 1;
  const coverage = coverageReport(tampered.items);
  assert.equal(
    coverage.banded,
    tampered.typability.coverage.items - tampered.typability.coverage.unbanded,
  );
  const sum = Object.values(coverage.byBand).reduce((a, b) => a + b, 0);
  assert.equal(sum, coverage.banded);
  const families = Object.values(coverage.byFamily).reduce((n, counts) => n + counts.items, 0);
  assert.equal(families, coverage.items);
});

test("the calibration report counts every banded item and lands near thirds", () => {
  const calibration = calibrationReport(fresh().items);
  assert.equal(calibration.n, fresh().items.length - fresh().typability.coverage.unbanded);
  const total = calibration.counts.hard + calibration.counts.typical + calibration.counts.easy;
  assert.equal(total, calibration.n);
  for (const count of Object.values(calibration.counts)) {
    assert.ok(
      count / calibration.n > 0.25,
      `band share ${count / calibration.n} is not near a third`,
    );
    assert.ok(
      count / calibration.n < 0.42,
      `band share ${count / calibration.n} is not near a third`,
    );
  }
});

/* --------------------------------------------------------------- the controls */

test("CONTROL: the fixtures really are damaged, so the passing test above means something", () => {
  // The claim every other test in this file rests on: `fresh()` returns an
  // independent copy, and mutating it changes what the gate sees. Without this, a
  // suite where every mutation silently did nothing would be entirely green.
  const damaged = fresh();
  damaged.items[0].difficulty = "spicy";
  assert.notDeepEqual(findTypabilityOffenders(damaged), []);
  assert.deepEqual(findTypabilityOffenders(fresh()), []);
});

test("CONTROL: a fixture is a real corpus item, not a stub", () => {
  const item = bandedItem();
  assert.ok(item.text.length > 20);
  assert.ok(DIFFICULTY_BANDS.includes(item.difficulty));
  assert.equal(item.difficultySource, "computed");
  assert.equal(item.modelVersion, undefined, "the model version lives once, on the artifact block");
});
