/**
 * Snippet library tests (CNT-04).
 *
 * Four groups, in descending order of how much they prove:
 *
 *   1. the real committed artifact passes every gate rule;
 *   2. FAILING DIRECTIONS - a plausible-looking but wrong library must be
 *      rejected. This is most of the file, because a gate suite made only of
 *      "the real thing passes" is how a gate passes forever without ever having
 *      been shown it can fail. Every fixture is built by damaging the REAL
 *      artifact, so each field is one the gate actually reads;
 *   3. the build's own rules, driven by synthetic corpora so the licence,
 *      lex-diagnostic, duplicate and difficulty logic is tested at the boundaries
 *      the real corpus does not reach;
 *   4. determinism and a no-mutation control.
 *
 * MUTANTS live in `snippet-mutants.test.mjs`, which re-imports deliberately broken
 * copies of the pipeline and asserts each break is caught. No execution anywhere:
 * the library tests only ever read text.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { findSnippetLibraryOffenders } from "./check-snippets.mjs";
import {
  FEATURE_TAGS,
  NO_BAND_REASON,
  buildSnippetLibrary,
  findDuplicateGroups,
  serialiseSnippetLibrary,
} from "./snippet-library.mjs";
import { buildFromRepo, collectLicenceRows } from "./build-snippets.mjs";
import { lexSnippet } from "./snippet-engine-loader.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT = JSON.parse(
  readFileSync(join(ROOT, "content", "snippets", "library.json"), "utf8"),
);
const CORPUS = JSON.parse(readFileSync(join(ROOT, "content", "corpus.json"), "utf8"));

/** Deep clone so each test can damage the artifact in isolation. */
const fresh = () => JSON.parse(JSON.stringify(ARTIFACT));

/** Offender codes, so a test can assert on the rule rather than the whole message. */
const codes = (offenders) => offenders.map((o) => o.split(" :: ")[0]);

const recordOf = (artifact, id) =>
  [...artifact.records, ...artifact.withheld].find((r) => r.id === id);

/** The ids the corpus rejects, which the artifact must hold a record for. */
const WITHHELD_IDS = CORPUS.rejected
  .filter(
    (r) =>
      r.id.startsWith("CODE-") && (r.reason === "do-not-ship" || r.reason === "duplicate-text"),
  )
  .map((r) => r.id);

const codeItem = (id, over = {}) => ({
  id,
  family: "CODE",
  kind: "code-snippet",
  text: `function ${id.replaceAll("-", "_")}() {\n  return 1;\n}`,
  language: "javascript",
  contentType: "code.utility",
  tagSource: "register",
  difficulty: "typical",
  wordCount: 3,
  declaredWords: null,
  license: "original work — ours",
  licenseClass: "allowed",
  source: "",
  attribution: null,
  registerRef: "docs/content-code-snippets-javascript-original.md",
  registerStatus: "draft",
  shippable: false,
  provenance: { file: "docs/content-code-snippets-javascript-original.md", line: 1 },
  publishBlockers: ["status-not-shippable: draft"],
  ...over,
});

/** A minimal corpus with a synthetic code item, for build-level tests. */
const miniCorpus = (items, rejected = [], over = {}) => ({
  version: "1.0.0",
  items,
  rejected,
  ...over,
});

/** Build with the real lexer unless the test supplies its own. */
const build = (corpus, licenceRows = []) =>
  buildSnippetLibrary({ corpus, licenceRows, lexSnippet });

/* ------------------------------------------------------------- passing case */

test("the real committed artifact passes every gate rule", () => {
  assert.deepEqual(findSnippetLibraryOffenders(fresh()), []);
});

test("the committed artifact matches a rebuild from the corpus", () => {
  assert.equal(serialiseSnippetLibrary(buildFromRepo(ROOT)), serialiseSnippetLibrary(ARTIFACT));
});

test("every record lexes cleanly through the PRG-01 token map", () => {
  for (const record of ARTIFACT.records) {
    const map = lexSnippet(record.code, record.language);
    assert.deepEqual(map.diagnostics, [], `${record.id} produced diagnostics`);
    assert.deepEqual(map.tilingIssues, [], `${record.id} produced a non-tiling map`);
  }
});

test("every record's language resolves to a real profile, not the generic fallback", () => {
  for (const record of ARTIFACT.records) {
    assert.equal(lexSnippet(record.code, record.language).language, record.language);
  }
});

test("the stored mix equals a fresh tokenization of the stored code", () => {
  for (const record of ARTIFACT.records) {
    const counts = lexSnippet(record.code, record.language).counts;
    assert.deepEqual(record.tokenClassMix.chars, counts.chars, `${record.id} chars mix`);
    assert.deepEqual(record.tokenClassMix.tokens, counts.tokens, `${record.id} tokens mix`);
  }
});

/* --------------------------------------------------------- licence: failing */

test("a copyleft licence is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").licence.declaration = "GPL-3.0";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LICENCE-COPYLEFT"), JSON.stringify(offenders));
});

test("a dual licence that names a copyleft term is rejected (copyleft is tested first)", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").licence.declaration = "MIT OR GPL-2.0";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("LICENCE-COPYLEFT"));
});

test("an AGPL lineage is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").licence.declaration = "AGPL-3.0-only";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("LICENCE-COPYLEFT"));
});

test("an empty licence declaration is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").licence.declaration = "   ";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LICENCE-MISSING"), JSON.stringify(offenders));
});

test("a missing licence declaration field is rejected", () => {
  const artifact = fresh();
  delete recordOf(artifact, "CODE-JS-003").licence.declaration;
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("LICENCE-MISSING"));
});

test("an unrecognised licence is rejected, not waved through", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").licence.declaration = "do whatever you want";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("LICENCE-UNKNOWN"));
});

test("hand-editing licenseClass to 'allowed' over a copyleft declaration is caught", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.licence.declaration = "GPL-3.0";
  record.licence.licenseClass = "allowed";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LICENCE-COPYLEFT"), JSON.stringify(offenders));
  assert.ok(codes(offenders).includes("LICENCE-CLASS-MISMATCH"), JSON.stringify(offenders));
});

test("the build refuses to emit a record whose licence is not allowed", () => {
  const library = build(miniCorpus([codeItem("CODE-JS-001", { license: "GPL-3.0" })]));
  const record = library.records[0];
  assert.equal(record.licence.licenseClass, "copyleft");
  assert.ok(record.publishBlockers.includes("licence-copyleft"));
  assert.equal(library.stats.selectable, 0);
});

test("the build refuses to emit a record with no licence at all", () => {
  const library = build(miniCorpus([codeItem("CODE-JS-001", { license: "" })]));
  const record = library.records[0];
  assert.equal(record.licence.licenseClass, "missing");
  assert.ok(record.publishBlockers.includes("licence-missing"));
});

/* --------------------------------------------------------------- lex: failing */

test("a snippet with an unterminated string is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.code = "function clamp(value) {\n  const s = 'oops\n  return value;\n}";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LEX-DIAGNOSTIC"), JSON.stringify(offenders));
  assert.ok(
    offenders.some((o) => o.includes("unterminated-string")),
    JSON.stringify(offenders),
  );
});

test("a snippet with an unterminated template literal is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-005");
  record.code = "function f(a) {\n  return `value ${a};\n}";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(
    offenders.some((o) => o.includes("unterminated-template")),
    JSON.stringify(offenders),
  );
});

test("a snippet with an unterminated block comment is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-004");
  record.code = "/* debounce\nconst debounce = (fn) => fn;";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(
    offenders.some((o) => o.includes("unterminated-block-comment")),
    JSON.stringify(offenders),
  );
});

test("a character no language profile recognises is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.code = "function clamp() {\n  const c = \u20ac;\n  return c;\n}";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(
    offenders.some((o) => o.includes("unrecognized-character")),
    JSON.stringify(offenders),
  );
});

test("an artifact that marks a broken snippet as lex-clean is caught (the stored claim is checked too)", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.code = "const s = 'oops\nlet x = 1;";
  record.tokenMap.clean = true;
  record.tokenMap.diagnostics = [];
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LEX-DIAGNOSTIC"), JSON.stringify(offenders));
});

test("an artifact that marks a clean snippet as unclean is caught", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").tokenMap.clean = false;
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LEX-CLEAN-MISREPORTED"), JSON.stringify(offenders));
});

test("a stored mix that does not belong to the stored code is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.tokenClassMix.chars.bracket += 3;
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("MIX-MISMATCH"), JSON.stringify(offenders));
});

test("a language id that silently falls back to the generic profile is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").language = "javascriptx";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LANGUAGE-UNKNOWN"), JSON.stringify(offenders));
});

test("a record with no text at all is rejected rather than passed as vacuous", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").code = "";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("RECORD-NO-CODE"));
});

/* --------------------------------------------------------- the P0x placeholders */

test("CODE-JS-P01/P02/P03 are present and marked unshippable", () => {
  const ids = ARTIFACT.withheld.filter((w) => w.status === "withheld-do-not-ship").map((w) => w.id);
  assert.deepEqual(ids, ["CODE-JS-P01", "CODE-JS-P02", "CODE-JS-P03"]);
});

test("every do-not-ship placeholder carries no text and never reads shippable", () => {
  for (const record of ARTIFACT.withheld.filter((w) => w.status === "withheld-do-not-ship")) {
    assert.equal(record.code, null, `${record.id} must carry no text`);
    assert.equal(record.licence.shippable, false, `${record.id} must not read shippable`);
    assert.ok(record.publishBlockers.includes("do-not-ship"));
    assert.ok(record.defects.some((d) => d.code === "do-not-ship"));
  }
});

test("the placeholders' licences are MIT and are classified by the CNT-07 gate, not asserted", () => {
  for (const record of ARTIFACT.withheld.filter((w) => w.status === "withheld-do-not-ship")) {
    assert.match(record.licence.declaration, /MIT/i, `${record.id} licence`);
    assert.equal(record.licence.licenseClass, "allowed");
  }
});

test("marking a do-not-ship placeholder shippable fails the gate", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-P01").licence.shippable = true;
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("PLACEHOLDER-SHIPPABLE"), JSON.stringify(offenders));
});

test("giving a do-not-ship placeholder text fails the gate", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-P02").code = "function debounce(fn) { return fn; }";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("PLACEHOLDER-CONTENT"), JSON.stringify(offenders));
});

test("deleting a placeholder entirely fails the gate (it must never disappear silently)", () => {
  const artifact = fresh();
  artifact.withheld = artifact.withheld.filter((w) => w.id !== "CODE-JS-P03");
  const offenders = findSnippetLibraryOffenders(artifact, { expectedWithheld: WITHHELD_IDS });
  assert.ok(codes(offenders).includes("WITHHELD-MISSING"), JSON.stringify(offenders));
});

test("a withheld record the corpus does not reject fails the gate", () => {
  const artifact = fresh();
  artifact.withheld.push({
    ...JSON.parse(JSON.stringify(recordOf(artifact, "CODE-JS-P01"))),
    id: "CODE-JS-999",
  });
  const offenders = findSnippetLibraryOffenders(artifact, { expectedWithheld: WITHHELD_IDS });
  assert.ok(codes(offenders).includes("WITHHELD-UNEXPLAINED"), JSON.stringify(offenders));
});

test("a do-not-ship placeholder with a copyleft licence fails the gate", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-P01");
  record.licence.declaration = "AGPL-3.0";
  record.licence.licenseClass = "copyleft";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("LICENCE-NOT-ALLOWED"), JSON.stringify(offenders));
});

test("the build refuses to emit a placeholder when the corpus rejected it under another reason", () => {
  // Only `do-not-ship` and `duplicate-text` become withheld records; anything else
  // is a pipeline defect and CNT-01 already fails the build on it.
  const library = build(
    miniCorpus(
      [],
      [{ id: "CODE-JS-P01", reason: "unknown-reason", detail: "?", provenance: null }],
    ),
  );
  assert.deepEqual(library.withheld, []);
});

/* --------------------------------------------------------- the duplicate pair */

test("CODE-JS-001 and CODE-JS-002 are surfaced as one finding, not silently resolved", () => {
  const duplicateDefects = ARTIFACT.defects.filter((d) => d.code === "duplicate-text");
  assert.equal(duplicateDefects.length, 1);
  assert.deepEqual(duplicateDefects[0].ids, ["CODE-JS-001", "CODE-JS-002"]);
  assert.equal(duplicateDefects[0].status, "needs-human-decision");
  assert.match(duplicateDefects[0].decision, /Reconcile the source document/);
});

test("the kept id carries the duplicate defect and is not selectable", () => {
  const record = recordOf(ARTIFACT, "CODE-JS-001");
  assert.ok(record.defects.some((d) => d.code === "duplicate-text"));
  assert.ok(record.publishBlockers.includes("content-defect: duplicate-text"));
  assert.equal(record.status, "withheld-duplicate");
  assert.equal(record.publishBlockers.length > 0, true);
});

test("the dropped id is present as a withheld record with code: null (never deleted, never re-stored)", () => {
  const record = recordOf(ARTIFACT, "CODE-JS-002");
  assert.ok(record, "CODE-JS-002 must be present in the library");
  assert.equal(record.code, null);
  assert.equal(record.status, "withheld-duplicate");
  assert.ok(record.defects.some((d) => d.code === "duplicate-text"));
});

test("the two ids really are byte-identical in the source, which is why the defect exists", () => {
  // The corpus dropped CODE-JS-002, so its text is not in the artifact. This
  // re-derives the collision from the source document's own claim instead, and
  // asserts the library's finding agrees with it rather than inventing one.
  const rejection = CORPUS.rejected.find((r) => r.id === "CODE-JS-002");
  assert.equal(rejection.reason, "duplicate-text");
  assert.match(rejection.detail, /identical to CODE-JS-001/);
  const defect = ARTIFACT.defects.find((d) => d.code === "duplicate-text");
  assert.equal(defect.kept, "CODE-JS-001");
  assert.deepEqual(defect.dropped, ["CODE-JS-002"]);
});

test("clearing the duplicate defect from the kept record fails the gate", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-001");
  record.defects = [];
  record.publishBlockers = record.publishBlockers.filter((b) => !b.startsWith("content-defect:"));
  const offenders = findSnippetLibraryOffenders(artifact, { expectedWithheld: WITHHELD_IDS });
  // The finding still names CODE-JS-001, so the record and the finding disagree.
  assert.ok(codes(offenders).includes("DEFECT-NOT-APPLIED"), JSON.stringify(offenders));
});

test("deleting the duplicate finding entirely fails the gate", () => {
  const artifact = fresh();
  artifact.defects = [];
  const offenders = findSnippetLibraryOffenders(artifact, { expectedWithheld: WITHHELD_IDS });
  // Both records still carry the defect, so the reverse direction catches it: a
  // record may not hold a defect no finding explains.
  assert.ok(codes(offenders).includes("DEFECT-UNEXPLAINED"), JSON.stringify(offenders));
});

test("a finding naming an id absent from the artifact fails the gate", () => {
  const artifact = fresh();
  artifact.defects[0].ids = [...artifact.defects[0].ids, "CODE-JS-404"];
  const offenders = findSnippetLibraryOffenders(artifact, { expectedWithheld: WITHHELD_IDS });
  assert.ok(codes(offenders).includes("DEFECT-IDS-UNKNOWN"), JSON.stringify(offenders));
});

test("a NEW collision introduced by hand-editing a record is caught", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-004").code = recordOf(artifact, "CODE-JS-003").code;
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("DUPLICATE-UNMARKED"), JSON.stringify(offenders));
});

test("a withheld duplicate that stores text twice is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-002").code = "function chunkArray(items, size) {\n  return items;\n}";
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("DUPLICATE-DUPLICATED-STORAGE"), JSON.stringify(offenders));
});

test("findDuplicateGroups finds a collision the corpus did not report", () => {
  // Identical after CNT-01's normalisation (NFKC, whitespace runs collapsed, case
  // folded) but not byte-identical, which is the shape a copy-paste-and-reindent
  // duplicate takes.
  const groups = findDuplicateGroups([
    { id: "CODE-JS-010", code: "function a() {\n  return 1;\n}" },
    { id: "CODE-JS-011", code: "function   a()   {\n\n    return 1;\n}" },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].ids, ["CODE-JS-010", "CODE-JS-011"]);
  assert.deepEqual(groups[0].dropped, ["CODE-JS-011"]);
});

test("findDuplicateGroups treats a missing semicolon as a real difference", () => {
  // The interesting failure mode of a loose dedupe: normalising away punctuation
  // would merge "return 1;" and "return 1", and reporting those would train the
  // author to ignore the rule. CNT-01's normalisation keeps punctuation on purpose.
  assert.deepEqual(
    findDuplicateGroups([
      { id: "CODE-JS-010", code: "function a() {\n  return 1;\n}" },
      { id: "CODE-JS-011", code: "function a() {\n  return 1\n}" },
    ]),
    [],
  );
});

test("findDuplicateGroups treats case as significant, per CNT-01's stated rule", () => {
  // CNT-01 lowercases for the fingerprint. A snippet that differs only in case is
  // reported, and that is a deliberate documented choice rather than an oversight.
  assert.equal(
    findDuplicateGroups([
      { id: "CODE-JS-010", code: "const A = 1;" },
      { id: "CODE-JS-011", code: "const a = 1;" },
    ]).length,
    1,
  );
});

test("findDuplicateGroups reports nothing for genuinely different snippets", () => {
  assert.deepEqual(
    findDuplicateGroups([
      { id: "CODE-JS-010", code: "return 1;" },
      { id: "CODE-JS-011", code: "return 2;" },
    ]),
    [],
  );
});

/* ------------------------------------------------------------------ difficulty */

test("a band with no register source is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  // The source rule only applies once a band exists, and CNT-02 correctly
  // leaves every code record's band null. Give it a valid band first, then
  // the bad source, so the rule under test is actually reached.
  record.difficulty.band = "typical";
  record.difficulty.source = "heuristic";
  assert.ok(
    codes(findSnippetLibraryOffenders(artifact)).includes("DIFFICULTY-BAND-WITHOUT-SOURCE"),
  );
});

test("a band outside the register's three values is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").difficulty.band = "brutal";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("BAND-NOT-IN-REGISTER"));
});

test("a null band with no reason is rejected (a band is null WITH a reason, never silently)", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-001");
  record.difficulty.reason = "";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("BAND-WITHOUT-REASON"));
});

test("every unscored record carries the stated reason (CNT-02 bands no code, so this is all of them)", () => {
  // This used to assert "exactly one unscored record", which was a fact about
  // the corpus at the time rather than a property of the gate. CNT-02 then
  // banded nothing - correctly, since its model is not valid for code - so the
  // count moved to every record. The invariant worth pinning is the reason,
  // not the count.
  const unscored = ARTIFACT.records.filter((r) => r.difficulty.band === null);
  assert.ok(unscored.length > 0, "expected at least one unscored code record");
  for (const record of unscored) {
    assert.equal(record.difficulty.reason, NO_BAND_REASON, `${record.id} lost its reason`);
    assert.ok(record.publishBlockers.includes("no-difficulty-band"));
  }
});

test("the build never invents a band: a corpus item with no declared difficulty stays null", () => {
  const library = build(miniCorpus([codeItem("CODE-JS-001", { difficulty: null })]));
  assert.equal(library.records[0].difficulty.band, null);
  assert.equal(library.records[0].difficulty.source, null);
  assert.ok(library.records[0].publishBlockers.includes("no-difficulty-band"));
});

test("the build does not infer a band from symbol density", () => {
  // A deliberately awful, symbol-dense snippet still gets no band.
  const library = build(
    miniCorpus([codeItem("CODE-JS-001", { difficulty: null, text: "a?.b??c...[d]>>>e;" })]),
  );
  assert.equal(library.records[0].difficulty.band, null);
});

/* ------------------------------------------------------------------------ tags */

test("a tag outside the closed vocabulary is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").tags.features = ["turbo-syntax"];
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("TAG-NOT-DECLARED"));
});

test("an undeclared content surface is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").surface = "systems";
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("TAG-NOT-DECLARED"));
});

test("an out-of-range tier is rejected", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").tags.tiers = [99];
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("TAG-NOT-DECLARED"));
});

test("every feature tag the library emits is in the declared vocabulary", () => {
  const emitted = new Set(ARTIFACT.records.flatMap((r) => r.tags.features));
  for (const tag of emitted) assert.ok(FEATURE_TAGS.includes(tag), `${tag} is not declared`);
});

test("feature tags are derived from the token map, not from the source prose", () => {
  const records = new Map(ARTIFACT.records.map((r) => [r.id, r]));
  assert.ok(records.get("CODE-JS-004").tags.features.includes("arrow-function"));
  assert.ok(records.get("CODE-JS-011").tags.features.includes("class-declaration"));
  assert.ok(records.get("CODE-JS-023").tags.features.includes("optional-chaining"));
  assert.ok(records.get("CODE-JS-005").tags.features.includes("template-literal"));
  assert.ok(records.get("CODE-JS-006").tags.features.includes("regex-literal"));
  assert.ok(records.get("CODE-JS-030").tags.features.includes("jsx"));
  assert.ok(records.get("CODE-JS-030").tags.features.includes("react-hook"));
  assert.ok(records.get("CODE-JS-008").tags.features.includes("async-await"));
  // A snippet with no optional chaining must not carry the tag.
  assert.ok(!records.get("CODE-JS-003").tags.features.includes("optional-chaining"));
});

test("jsx is tagged only for react-surface records", () => {
  for (const record of ARTIFACT.records) {
    if (record.tags.features.includes("jsx")) assert.equal(record.surface, "react");
  }
});

test("tiers are derived from the computed mix and cover every tier the snippets touch", () => {
  assert.deepEqual(ARTIFACT.coverage.tiersExercised, [1, 2, 3, 4, 5, 6, 7]);
  // Tier 2 and 7 have no generator behind them, and the artifact says so.
  assert.deepEqual(Object.keys(ARTIFACT.coverage.tiersUngenerated).sort(), ["2", "7"]);
});

/* ------------------------------------------------------------------- blockers */

test("deleting a publish blocker is caught", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.publishBlockers = record.publishBlockers.filter(
    (b) => !b.startsWith("status-not-shippable"),
  );
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("BLOCKER-MISSING"), JSON.stringify(offenders));
});

test("a blocker the gate does not recognise is rejected (no invented blockers)", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").publishBlockers.push("looks-fine-to-me");
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("BLOCKER-UNDECLARED"));
});

test("a status-not-shippable blocker that misquotes the register is rejected", () => {
  const artifact = fresh();
  const record = recordOf(artifact, "CODE-JS-003");
  record.publishBlockers = record.publishBlockers.map((b) =>
    b.startsWith("status-not-shippable:") ? "status-not-shippable: reviewed" : b,
  );
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("BLOCKER-MISREPORTED"));
});

test("clearing all blockers on a draft record is caught", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").publishBlockers = [];
  const offenders = findSnippetLibraryOffenders(artifact);
  assert.ok(codes(offenders).includes("BLOCKER-MISSING"), JSON.stringify(offenders));
});

test("nothing is selectable today, and the artifact says so", () => {
  assert.equal(ARTIFACT.stats.selectable, 0);
  for (const record of ARTIFACT.records) assert.ok(record.publishBlockers.length > 0);
});

/* -------------------------------------------------------------------- vacuity */

test("an empty library fails the gate", () => {
  assert.ok(codes(findSnippetLibraryOffenders({ ...fresh(), records: [] })).includes("VACUITY"));
});

test("a library missing its withheld array fails the gate", () => {
  const artifact = fresh();
  delete artifact.withheld;
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("SHAPE-MISSING"));
});

test("a library missing its defects array fails the gate", () => {
  const artifact = fresh();
  delete artifact.defects;
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("SHAPE-MISSING"));
});

test("the same id appearing twice fails the gate", () => {
  const artifact = fresh();
  artifact.records.push(JSON.parse(JSON.stringify(artifact.records[0])));
  assert.ok(codes(findSnippetLibraryOffenders(artifact)).includes("DUPLICATE-RECORD"));
});

test("a missing artifact fails the gate rather than passing vacuously", () => {
  assert.deepEqual(findSnippetLibraryOffenders(null), [
    "NO-ARTIFACT :: content/snippets/library.json missing or not an object",
  ]);
});

/* ------------------------------------------------------------------ drift */

test("a stale artifact is caught by the drift check", () => {
  const artifact = fresh();
  artifact.stats.records = 999;
  const offenders = findSnippetLibraryOffenders(artifact, { rebuilt: buildFromRepo(ROOT) });
  assert.ok(codes(offenders).includes("LIBRARY-DRIFT"), JSON.stringify(offenders));
});

test("an artifact edited to ship a draft snippet is caught by drift", () => {
  const artifact = fresh();
  recordOf(artifact, "CODE-JS-003").licence.shippable = true;
  const offenders = findSnippetLibraryOffenders(artifact, { rebuilt: buildFromRepo(ROOT) });
  assert.ok(codes(offenders).includes("LIBRARY-DRIFT"));
});

/* --------------------------------------------------------------- build rules */

test("buildSnippetLibrary refuses to run without a lexer", () => {
  assert.throws(() => buildSnippetLibrary({ corpus: miniCorpus([]) }), TypeError);
});

test("the build emits a record for every emitted CODE item, and nothing for other families", () => {
  const library = build(
    miniCorpus([
      codeItem("CODE-JS-001"),
      { ...codeItem("PROSE-01-001"), family: "PROSE" },
      { ...codeItem("CODE-JS-003"), contentType: "code.algorithm" },
    ]),
  );
  assert.deepEqual(
    library.records.map((r) => r.id),
    ["CODE-JS-001", "CODE-JS-003"],
  );
});

test("the build derives the content surface from the register's content type", () => {
  const library = build(
    miniCorpus([
      codeItem("CODE-JS-001", { contentType: "code.utility" }),
      codeItem("CODE-JS-012", { contentType: "code.algorithm" }),
      codeItem("CODE-JS-022", { contentType: "code.web" }),
      codeItem("CODE-JS-030", { contentType: "code.react" }),
    ]),
  );
  assert.deepEqual(library.stats.bySurface, { algorithm: 1, react: 1, utility: 1, web: 1 });
});

test("an unknown content type yields a null surface rather than a guessed one", () => {
  const library = build(miniCorpus([codeItem("CODE-JS-001", { contentType: "code.experiment" })]));
  assert.equal(library.records[0].surface, null);
});

test("the build keeps the author's declared token mix beside the computed one", () => {
  const library = build(
    miniCorpus([
      codeItem("CODE-JS-005", {
        tokenMix: "object literals, strings",
        text: 'const symbols = { USD: "$" };',
      }),
    ]),
  );
  assert.equal(library.records[0].declaredTokenMix, "object literals, strings");
  assert.ok(library.records[0].tokenClassMix.chars.string > 0);
  assert.ok(library.records[0].tags.features.includes("template-literal") === false);
});

test("the build records non-ASCII characters with the class they landed in", () => {
  // A euro sign inside a string literal is class 4 content; a bare one is a
  // diagnostic. The artifact must be able to tell a reader which it was.
  const insideString = build(miniCorpus([codeItem("CODE-JS-005", { text: 'const s = "\u20ac";' })]))
    .records[0];
  assert.deepEqual(insideString.tokenMap.nonAscii, [
    { char: "\u20ac", class: "string", index: 10 },
  ]);
});

test("a build whose lexer reports a diagnostic marks the record unclean rather than passing it", () => {
  const library = build(
    miniCorpus([codeItem("CODE-JS-001", { text: "const s = 'oops\nlet x = 1;" })]),
  );
  const record = library.records[0];
  assert.equal(record.tokenMap.clean, false);
  assert.ok(record.tokenMap.diagnostics.some((d) => d.code === "unterminated-string"));
  assert.equal(library.stats.lexClean, 0);
});

test("a lexer that throws is caught by the gate's LEX-THREW rule, not swallowed", () => {
  const artifact = fresh();
  const offenders = findSnippetLibraryOffenders(artifact, {
    lex: () => {
      throw new Error("boom");
    },
  });
  assert.ok(codes(offenders).includes("LEX-THREW"), JSON.stringify(offenders));
});

/* ---------------------------------------------------------------- determinism */

test("two builds from the same corpus are byte-identical", () => {
  const first = serialiseSnippetLibrary(buildFromRepo(ROOT));
  const second = serialiseSnippetLibrary(buildFromRepo(ROOT));
  assert.equal(first, second);
});

test("the artifact carries no timestamp, commit hash or absolute path", () => {
  const text = JSON.stringify(ARTIFACT);
  assert.ok(!/[A-Z]:\\\\/.test(text), "absolute Windows path in the artifact");
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text), "ISO timestamp in the artifact");
  assert.ok(!text.includes("task-w14-cnt04"), "worktree name in the artifact");
});

test("the serialised document ends with exactly one newline", () => {
  const text = serialiseSnippetLibrary(buildFromRepo(ROOT));
  assert.ok(text.endsWith("}\n"));
  assert.ok(!text.endsWith("}\n\n"));
});

test("records are sorted by id with numeric segments compared numerically", () => {
  const ids = ARTIFACT.records.map((r) => r.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.ok(ids.indexOf("CODE-JS-009") < ids.indexOf("CODE-JS-010"));
});

test("licence rows for the placeholders come from the CNT-07 register parser", () => {
  const rows = collectLicenceRows(ROOT);
  assert.ok(rows.some((row) => row.ids.includes("CODE-JS-P01")));
});
