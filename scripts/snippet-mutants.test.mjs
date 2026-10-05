/**
 * Mutant suite for the snippet library (CNT-04).
 *
 * WHAT THIS IS FOR. Every rule in `snippet-library.mjs` and `check-snippets.mjs`
 * could be written and be wrong in the same way: a condition that never fires, a
 * comparison that always passes, a value that is computed and then ignored. Green
 * tests do not distinguish those from correct code. They do not. The only thing
 * that distinguishes them is deliberately breaking the code and proving the tests
 * notice.
 *
 * HOW A MUTANT IS BUILT HERE. Each mutant is a **source-level** mutation: a named
 * literal edit to a copy of the module, written to a temp file, imported, and
 * driven through the same assertions the real suite uses. Source-level rather than
 * injected-because a mutant that swaps an injected function tests the injection
 * point, not the rule. Each mutant names the exact `find` string it requires, so a
 * refactor that renames the line makes the mutant FAIL loudly instead of silently
 * mutating nothing - the classic way a mutant suite rots into "N/N" over time
 * while proving nothing.
 *
 * The no-mutation control at the bottom is the other half: it asserts the SAME
 * harness passes against the unmutated source, so a harness that fails everything
 * cannot report a perfect score.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { after, test } from "node:test";

import { buildSnippetLibrary } from "./snippet-library.mjs";
import { lexSnippet } from "./snippet-engine-loader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIBRARY_SOURCE = readFileSync(join(HERE, "snippet-library.mjs"), "utf8");
const GATE_SOURCE = readFileSync(join(HERE, "check-snippets.mjs"), "utf8");
const CORPUS = JSON.parse(readFileSync(join(HERE, "..", "content", "corpus.json"), "utf8"));
const ARTIFACT = JSON.parse(
  readFileSync(join(HERE, "..", "content", "snippets", "library.json"), "utf8"),
);

const workdir = mkdtempSync(join(tmpdir(), "realtype-snippet-mutants-"));
after(() => rmSync(workdir, { recursive: true, force: true }));

let counter = 0;

/**
 * Write a mutated copy of `source` with `find` replaced by `replace`, import it,
 * and hand the module to `drive`.
 *
 * `find` is mandatory and its presence is asserted. A mutant whose anchor text has
 * been renamed therefore fails loudly, which is the only way a mutant suite stays
 * honest across refactors.
 */
/**
 * Rewrite relative specifiers to absolute file URLs.
 *
 * The mutant copy lives in a temp directory so a broken build can never land in
 * `scripts/`, which means its own `import "./corpus-pipeline.mjs"` would not
 * resolve. Rewriting the specifier to a `file://` URL keeps the copy self-contained
 * and lets it import the real, unmutated collaborators - which is what makes the
 * mutant a test of the mutated FILE rather than of a mutant universe.
 */
function absolutiseImports(source) {
  return source.replaceAll(/(from\s+")(\.\.?\/[^"]+)(")/g, (match, open, specifier, close) => {
    return `${open}${pathToFileURL(join(HERE, specifier)).href}${close}`;
  });
}

/**
 * Find an anchor in the source, ignoring the line breaks and indentation Prettier
 * chooses.
 *
 * The point of a mutant suite is to survive a reformat. Anchoring on an exact
 * multi-line call site means every `pnpm format` run breaks half the mutants with
 * an "anchor not found" error, and the tempting fix - loosening the anchor until
 * it matches anything - is exactly how a mutant suite rots into a green light
 * wired to nothing. So: collapse whitespace on BOTH sides before matching, require
 * the collapsed anchor to occur exactly once, and apply the mutation to the
 * ORIGINAL source by mapping the collapsed match back through the same collapse.
 */
function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ");
}

function findAnchor(source, find) {
  const haystack = collapseWhitespace(source);
  const needle = collapseWhitespace(find);
  const occurrences = haystack.split(needle).length - 1;
  if (occurrences !== 1) return null;
  const at = haystack.indexOf(needle);
  return { at, length: needle.length };
}

async function withMutant({ name, source, find, replace }, drive) {
  assert.notEqual(
    collapseWhitespace(find),
    collapseWhitespace(replace),
    `mutant "${name}" replaces a string with itself, which mutates nothing`,
  );
  const hit = findAnchor(source, find);
  assert.ok(
    hit !== null,
    `mutant "${name}" expected exactly one occurrence of its anchor, found ` +
      `${collapseWhitespace(source).split(collapseWhitespace(find)).length - 1}`,
  );

  // Map the collapsed offset back to a real offset: walk the original, counting
  // characters as the collapse does.
  let collapsedIndex = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < source.length; i++) {
    if (/\s/.test(source[i]) && collapsedIndex > 0 && /\s/.test(source[i - 1])) continue;
    if (collapsedIndex === hit.at && start === -1) start = i;
    if (collapsedIndex === hit.at + hit.length) {
      end = i;
      break;
    }
    collapsedIndex += 1;
  }
  assert.ok(
    start >= 0 && end > start,
    `mutant "${name}" could not map its anchor back to the source`,
  );

  const mutated = `${source.slice(0, start)}${collapseWhitespace(replace)}${source.slice(end)}`;
  const file = join(workdir, `${String(counter++).padStart(2, "0")}-${name}.mjs`);
  writeFileSync(file, absolutiseImports(mutated), "utf8");
  const module = await import(pathToFileURL(file).href);
  return await drive(module);
}

/** A synthetic corpus item, so a mutant is judged on the rule and not on the corpus. */
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

const miniCorpus = (items, rejected = []) => ({ version: "1.0.0", items, rejected });

/* ------------------------------------------------------------------ the gate */

/**
 * Every gate mutant follows the same shape: break one rule, hand the gate an
 * artifact that rule exists to reject, and require the mutant to accept it. The
 * real gate rejects it (asserted by the library suite), so acceptance proves the
 * mutant changed the behaviour.
 */
const GATE_MUTANTS = [
  {
    name: "gate-licence-class-never-checked",
    find: 'if (licenceClass === "copyleft") fail(`LICENCE-COPYLEFT :: ${id} :: "${declaration}"`);',
    replace: 'if (false) fail(`LICENCE-COPYLEFT :: ${id} :: "${declaration}"`);',
    fixture: (a) => {
      a.records[2].licence.declaration = "GPL-3.0";
    },
    realRejects: "LICENCE-COPYLEFT",
  },
  {
    name: "gate-missing-licence-allowed",
    find: 'if (declaration === "") fail(`LICENCE-MISSING :: ${id} :: no licence declaration`);\n    if (licenceClass === "copyleft")',
    replace:
      'if (false) fail(`LICENCE-MISSING :: ${id} :: no licence declaration`);\n    if (licenceClass === "copyleft")',
    fixture: (a) => {
      a.records[2].licence.declaration = "";
    },
    realRejects: "LICENCE-MISSING",
  },
  {
    name: "gate-unknown-licence-allowed",
    find: 'if (licenceClass === "unknown") fail(`LICENCE-UNKNOWN :: ${id} :: "${declaration}"`);',
    replace: 'if (false) fail(`LICENCE-UNKNOWN :: ${id} :: "${declaration}"`);',
    fixture: (a) => {
      a.records[2].licence.declaration = "whatever";
    },
    realRejects: "LICENCE-UNKNOWN",
  },
  {
    name: "gate-stored-licence-verdict-trusted",
    find: "if (record.licence?.licenseClass !== licenceClass) {",
    replace: "if (false) {",
    fixture: (a) => {
      a.records[2].licence.declaration = "GPL-3.0";
      a.records[2].licence.licenseClass = "allowed";
    },
    realRejects: "LICENCE-CLASS-MISMATCH",
  },
  {
    name: "gate-lex-diagnostics-ignored",
    find: "if (map.diagnostics.length > 0) {",
    replace: "if (false) {",
    fixture: (a) => {
      a.records[2].code = "const s = 'oops\nlet x = 1;";
    },
    realRejects: "LEX-DIAGNOSTIC",
  },
  {
    name: "gate-stored-clean-claim-trusted",
    find: "} else if (record.tokenMap?.clean !== true) {",
    replace: "} else if (false) {",
    fixture: (a) => {
      a.records[2].tokenMap.clean = false;
    },
    realRejects: "LEX-CLEAN-MISREPORTED",
  },
  {
    name: "gate-mix-mismatch-ignored",
    find: "fail(`MIX-MISMATCH :: ${id} :: stored ${axis} mix does not match a fresh tokenization`);",
    replace: "void 0;",
    fixture: (a) => {
      a.records[2].tokenClassMix.chars.bracket += 4;
    },
    realRejects: "MIX-MISMATCH",
  },
  {
    name: "gate-language-fallback-allowed",
    find: "if (map.language !== record.language) {",
    replace: "if (false) {",
    fixture: (a) => {
      a.records[2].language = "javascriptx";
    },
    realRejects: "LANGUAGE-UNKNOWN",
  },
  {
    name: "gate-undeclared-tag-allowed",
    find: "if (!ALLOWED_FEATURES.includes(tag))",
    replace: "if (false)",
    fixture: (a) => {
      a.records[2].tags.features = ["turbo"];
    },
    realRejects: "TAG-NOT-DECLARED",
  },
  {
    name: "gate-band-source-unchecked",
    find: "fail(`DIFFICULTY-BAND-WITHOUT-SOURCE :: ${id} :: band must come from the register`);",
    replace: "void 0;",
    fixture: (a) => {
      // Both fields, because the source check only runs in the non-null-band
      // branch. CNT-02 correctly leaves every code record's band null (its
      // model is not valid for code), so setting only `source` here would
      // never reach the rule and the mutant would prove nothing.
      a.records[2].difficulty.band = "typical";
      a.records[2].difficulty.source = "heuristic";
    },
    realRejects: "DIFFICULTY-BAND-WITHOUT-SOURCE",
  },
  {
    name: "gate-band-value-unchecked",
    find: 'fail(`BAND-NOT-IN-REGISTER :: ${id} :: "${record.difficulty?.band}"`);',
    replace: "void 0;",
    fixture: (a) => {
      a.records[2].difficulty.band = "brutal";
    },
    realRejects: "BAND-NOT-IN-REGISTER",
  },
  {
    name: "gate-null-band-reason-optional",
    find: "fail(`BAND-WITHOUT-REASON :: ${id} :: band is null with no stated reason`);",
    replace: "void 0;",
    fixture: (a) => {
      a.records.find((r) => r.difficulty.band === null).difficulty.reason = "";
    },
    realRejects: "BAND-WITHOUT-REASON",
  },
  {
    name: "gate-blocker-deletion-allowed",
    find: 'if (!stored.includes(blocker)) fail(`BLOCKER-MISSING :: ${id} :: "${blocker}"`);',
    replace: 'if (false) fail(`BLOCKER-MISSING :: ${id} :: "${blocker}"`);',
    fixture: (a) => {
      const record = a.records[2];
      record.publishBlockers = record.publishBlockers.filter(
        (b) => !b.startsWith("status-not-shippable"),
      );
    },
    realRejects: "BLOCKER-MISSING",
  },
  {
    name: "gate-invented-blocker-allowed",
    find: 'fail(`BLOCKER-UNDECLARED :: ${id} :: "${blocker}" is not a blocker this gate knows about`);',
    replace: "void 0;",
    fixture: (a) => {
      a.records[2].publishBlockers.push("looks-fine");
    },
    realRejects: "BLOCKER-UNDECLARED",
  },
  {
    name: "gate-placeholder-shippable-allowed",
    find: "fail(`PLACEHOLDER-SHIPPABLE :: ${id} :: a withheld record must never read shippable`);",
    replace: "void 0;",
    fixture: (a) => {
      a.withheld.find((w) => w.id === "CODE-JS-P01").licence.shippable = true;
    },
    realRejects: "PLACEHOLDER-SHIPPABLE",
  },
  {
    name: "gate-placeholder-text-allowed",
    find: "fail(`PLACEHOLDER-CONTENT :: ${id} :: a do-not-ship placeholder must carry no text`);",
    replace: "void 0;",
    fixture: (a) => {
      a.withheld.find((w) => w.id === "CODE-JS-P01").code = "function debounce() {}";
    },
    realRejects: "PLACEHOLDER-CONTENT",
  },
  {
    name: "gate-withheld-deletion-allowed",
    find: "for (const id of expectedWithheld) {\n    if (!byId.has(id)) {",
    replace: "for (const id of []) {\n    if (!byId.has(id)) {",
    expected: ["CODE-JS-P01", "CODE-JS-P02", "CODE-JS-P03", "CODE-JS-002"],
    fixture: (a) => {
      a.withheld = a.withheld.filter((w) => w.id !== "CODE-JS-P03");
    },
    realRejects: "WITHHELD-MISSING",
  },
  {
    name: "gate-duplicate-unmarked-allowed",
    find: "} else if (!(record.defects ?? []).some((d) => d.code === defect.code)) {",
    replace: "} else if (false) {",
    expected: ["CODE-JS-P01", "CODE-JS-P02", "CODE-JS-P03", "CODE-JS-002"],
    fixture: (a) => {
      const record = a.records.find((r) => r.id === "CODE-JS-001");
      record.defects = [];
      record.publishBlockers = record.publishBlockers.filter(
        (b) => !b.startsWith("content-defect:"),
      );
    },
    realRejects: "DEFECT-NOT-APPLIED",
  },
  {
    name: "gate-unexplained-defect-allowed",
    find: 'const named = defects.some(\n      (d) => d.code === "duplicate-text" && (d.ids ?? []).includes(record.id),\n    );\n    if (!named) {',
    replace:
      'const named = defects.some(\n      (d) => d.code === "duplicate-text" && (d.ids ?? []).includes(record.id),\n    );\n    if (false) {',
    expected: ["CODE-JS-P01", "CODE-JS-P02", "CODE-JS-P03", "CODE-JS-002"],
    fixture: (a) => {
      a.defects = [];
    },
    realRejects: "DEFECT-UNEXPLAINED",
  },
  {
    name: "gate-duplicate-text-stored-twice",
    find: "} else if (record.code !== null) {",
    replace: "} else if (false) {",
    expected: ["CODE-JS-P01", "CODE-JS-P02", "CODE-JS-P03", "CODE-JS-002"],
    fixture: (a) => {
      a.withheld.find((w) => w.id === "CODE-JS-002").code = "function chunkArray() {}";
    },
    realRejects: "DUPLICATE-DUPLICATED-STORAGE",
  },
  {
    name: "gate-new-collision-finding-ignored",
    find: '`DUPLICATE-UNREPORTED :: ${group.ids.join(", ")} :: identical text in the artifact with no duplicate-text finding`',
    replace: '"DUPLICATE-UNREPORTED-IGNORED"',
    expected: ["CODE-JS-P01", "CODE-JS-P02", "CODE-JS-P03", "CODE-JS-002"],
    fixture: (a) => {
      a.records[3].code = a.records[2].code;
    },
    realRejects: "DUPLICATE-UNREPORTED",
  },
  {
    name: "gate-vacuity-not-checked",
    find: 'if (records.length === 0) fail("VACUITY :: artifact holds 0 records");',
    replace: 'if (false) fail("VACUITY :: artifact holds 0 records");',
    fixture: (a) => {
      a.records = [];
    },
    realRejects: "VACUITY",
  },
  {
    name: "gate-lexer-throw-swallowed",
    find: "fail(`LEX-THREW :: ${id} :: ${error.message}`);",
    replace: "void error;",
    fixture: () => {},
    throwingLexer: true,
    realRejects: "LEX-THREW",
  },
];

for (const mutant of GATE_MUTANTS) {
  test(`GATE MUTANT CAUGHT :: ${mutant.name}`, async () => {
    const fixtureArtifact = () => {
      const artifact = JSON.parse(JSON.stringify(ARTIFACT));
      mutant.fixture(artifact);
      return artifact;
    };
    const expected = mutant.expected ?? ARTIFACT.withheld.map((w) => w.id);
    const lexOption = mutant.throwingLexer
      ? {
          lex: () => {
            throw new Error("boom");
          },
        }
      : {};
    const realCodes = (await import("./check-snippets.mjs"))
      .findSnippetLibraryOffenders(fixtureArtifact(), { expectedWithheld: expected, ...lexOption })
      .map((o) => o.split(" :: ")[0]);

    await withMutant(
      { name: mutant.name, source: GATE_SOURCE, find: mutant.find, replace: mutant.replace },
      (module) => {
        const codes = module
          .findSnippetLibraryOffenders(fixtureArtifact(), {
            expectedWithheld: expected,
            ...lexOption,
          })
          .map((o) => o.split(" :: ")[0]);
        assert.ok(
          !codes.includes(mutant.realRejects),
          `mutant "${mutant.name}" still rejects the fixture (${mutant.realRejects}); the rule is not load-bearing`,
        );
        // And the unmutated gate really does reject it, which is what makes the
        // mutant's acceptance meaningful rather than a broken fixture.
        assert.ok(
          realCodes.includes(mutant.realRejects),
          `the REAL gate did not reject this fixture with ${mutant.realRejects} (got ${realCodes.join(", ")}); the mutant proves nothing`,
        );
      },
    );
  });
}

/* --------------------------------------------------------------- the pipeline */

const PIPELINE_MUTANTS = [
  {
    name: "pipeline-licence-class-ignored",
    find: "licenseClass: classifyLicense(trimmed),",
    replace: 'licenseClass: "allowed",',
    // A copyleft declaration would then read as allowed, and the record would
    // carry no licence blocker.
    assertCaught: (library) =>
      library.records[0].licence.licenseClass === "allowed" &&
      !library.records[0].publishBlockers.includes("licence-copyleft"),
    fixture: () => miniCorpus([codeItem("CODE-JS-001", { license: "GPL-3.0" })]),
  },
  {
    name: "pipeline-status-blocker-dropped",
    find: "if (!licence.shippable) blockers.add(`status-not-shippable: ${licence.registerStatus}`);",
    replace: "void 0;",
    // A draft record must carry a status blocker, or a draft snippet looks publishable.
    assertCaught: (library) =>
      library.records[0].licence.shippable === false &&
      !library.records[0].publishBlockers.some((b) => b.startsWith("status-not-shippable")),
    fixture: () => miniCorpus([codeItem("CODE-JS-001")]),
  },
  {
    name: "pipeline-lex-diagnostic-ignored",
    find: "clean: map.diagnostics.length === 0,",
    replace: "clean: true,",
    assertCaught: (library) =>
      library.records[0].tokenMap.clean === true &&
      library.records[0].tokenMap.diagnostics.length > 0,
    fixture: () => miniCorpus([codeItem("CODE-JS-001", { text: "const s = 'oops\nlet x = 1;" })]),
  },
  {
    name: "pipeline-difficulty-band-invented",
    // The mutant makes a null register band fall through to the "declared" branch,
    // so an unscored snippet comes out looking register-scored with no reason.
    find: "  if (registerBand === null || registerBand === undefined) {",
    replace: "  if (false) {",
    assertCaught: (library) =>
      library.records[0].difficulty.band === null &&
      library.records[0].difficulty.source === "register" &&
      library.records[0].difficulty.reason === null,
    fixture: () => miniCorpus([codeItem("CODE-JS-001", { difficulty: null })]),
  },
  {
    name: "pipeline-null-band-reason-dropped",
    find: "return { band: null, source: null, reason: NO_BAND_REASON };",
    replace: "return { band: null, source: null, reason: null };",
    assertCaught: (library) => library.records[0].difficulty.reason === null,
    fixture: () => miniCorpus([codeItem("CODE-JS-001", { difficulty: null })]),
  },
  {
    name: "pipeline-duplicate-defect-not-recorded",
    find: "if (twins.size > 0) {",
    replace: "if (false) {",
    assertCaught: (library) => library.records.every((r) => r.defects.length === 0),
    fixture: () =>
      miniCorpus([
        codeItem("CODE-JS-001", { text: "function a() {\n  return 1;\n}" }),
        codeItem("CODE-JS-002", { text: "function  a()  {\n\n  return 1;\n}" }),
      ]),
  },
  {
    name: "pipeline-duplicate-record-stays-selectable",
    find: 'status: defects.length > 0 ? "withheld-duplicate" : "library",',
    replace: 'status: "library",',
    assertCaught: (library) =>
      library.records.every((r) => r.status === "library") &&
      library.records.some((r) => r.defects.some((d) => d.code === "duplicate-text")),
    fixture: () =>
      miniCorpus([
        codeItem("CODE-JS-001", { text: "function a() {\n  return 1;\n}" }),
        codeItem("CODE-JS-002", { text: "function  a()  {\n\n  return 1;\n}" }),
      ]),
  },
  {
    name: "pipeline-do-not-ship-placeholder-gets-text",
    find: "    code,\n    status,",
    replace: '    code: "function recovered() {}",\n    status,',
    assertCaught: (library) => library.withheld[0].code !== null,
    fixture: () =>
      miniCorpus(
        [],
        [{ id: "CODE-JS-P01", reason: "do-not-ship", detail: "never pulled", provenance: null }],
      ),
  },
  {
    name: "pipeline-do-not-ship-placeholder-becomes-shippable",
    find: "shippable: isShippableStatus(registerStatus),",
    replace: "shippable: true,",
    assertCaught: (library) => library.withheld[0].licence.shippable === true,
    fixture: () =>
      miniCorpus(
        [],
        [{ id: "CODE-JS-P01", reason: "do-not-ship", detail: "never pulled", provenance: null }],
      ),
  },
  {
    name: "pipeline-do-not-ship-rejection-ignored",
    find: '.filter((r) => r.reason === "do-not-ship" || r.reason === "duplicate-text")',
    replace: ".filter((r) => false)",
    assertCaught: (library) => library.withheld.length === 0,
    fixture: () =>
      miniCorpus(
        [],
        [{ id: "CODE-JS-P01", reason: "do-not-ship", detail: "never pulled", provenance: null }],
      ),
  },
  {
    name: "pipeline-content-defect-blocker-dropped",
    find: "for (const defect of defects) blockers.add(`content-defect: ${defect.code}`);",
    replace: "void defects;",
    assertCaught: (library) =>
      library.records.some(
        (r) =>
          r.defects.length > 0 && !r.publishBlockers.some((b) => b.startsWith("content-defect:")),
      ),
    fixture: () =>
      miniCorpus([
        codeItem("CODE-JS-001", { text: "function a() {\n  return 1;\n}" }),
        codeItem("CODE-JS-002", { text: "function  a()  {\n\n  return 1;\n}" }),
      ]),
  },
  {
    name: "pipeline-lexers-may-be-absent",
    find: 'if (typeof lexSnippet !== "function") {',
    replace: "if (false) {",
    // `buildCaught` is handed the MUTANT's module, unlike the others which are
    // handed a build result.
    buildCaught: (module) => {
      let threw = false;
      try {
        module.buildSnippetLibrary({ corpus: miniCorpus([]) });
      } catch {
        threw = true;
      }
      return !threw;
    },
    fixture: null,
  },
];

for (const mutant of PIPELINE_MUTANTS) {
  test(`PIPELINE MUTANT CAUGHT :: ${mutant.name}`, async () => {
    await withMutant(
      { name: mutant.name, source: LIBRARY_SOURCE, find: mutant.find, replace: mutant.replace },
      async (module) => {
        const unmutated = { buildSnippetLibrary };

        if (mutant.fixture === null) {
          // Control-style mutant: the real module throws, the mutant does not.
          assert.throws(() => unmutated.buildSnippetLibrary({ corpus: miniCorpus([]) }), TypeError);
          assert.ok(mutant.buildCaught(module), `mutant "${mutant.name}" was not detected`);
          return;
        }

        const corpus = mutant.fixture();
        const real = unmutated.buildSnippetLibrary({ corpus, lexSnippet });
        const mutated = module.buildSnippetLibrary({ corpus, lexSnippet });

        assert.ok(
          mutant.assertCaught(mutated),
          `mutant "${mutant.name}" produced output indistinguishable from the real build on this fixture`,
        );
        // The real build must NOT satisfy the mutant's signature, or the fixture
        // proves nothing about the rule being broken.
        assert.ok(
          !mutant.assertCaught(real),
          `the REAL build already exhibits the mutant's behaviour; the fixture does not exercise the rule`,
        );
      },
    );
  });
}

/* -------------------------------------------------------- the no-mutation control */

test("CONTROL :: the unmutated pipeline refuses to run without a lexer", () => {
  // The fixture this mutant family relies on. Without it the final mutant's
  // control would be asserting nothing.
  assert.throws(() => buildSnippetLibrary({ corpus: miniCorpus([]) }), TypeError);
});

test("CONTROL :: the unmutated harness rejects every mutant fixture (no mutant passes by default)", async () => {
  // The control. Without it, a harness that rejected nothing would report every
  // mutant as "caught" and the suite would be a green light wired to nothing.
  const gate = await import("./check-snippets.mjs");
  for (const mutant of GATE_MUTANTS) {
    const artifact = JSON.parse(JSON.stringify(ARTIFACT));
    mutant.fixture(artifact);
    const expected = mutant.expected ?? ARTIFACT.withheld.map((w) => w.id);
    const offenders = gate.findSnippetLibraryOffenders(artifact, {
      expectedWithheld: expected,
      ...(mutant.throwingLexer
        ? {
            lex: () => {
              throw new Error("boom");
            },
          }
        : {}),
    });
    assert.ok(
      offenders.some((o) => o.startsWith(mutant.realRejects)),
      `the real gate did not reject mutant "${mutant.name}"'s fixture with ${mutant.realRejects}`,
    );
  }
});

test("CONTROL :: the unmutated pipeline behaves correctly on every mutant fixture", async () => {
  const unmutated = await import("./snippet-library.mjs");
  for (const mutant of PIPELINE_MUTANTS) {
    if (mutant.fixture === null) {
      assert.throws(() => unmutated.buildSnippetLibrary({ corpus: miniCorpus([]) }), TypeError);
      continue;
    }
    assert.ok(
      !mutant.assertCaught(unmutated.buildSnippetLibrary({ corpus: mutant.fixture(), lexSnippet })),
      `the real pipeline already exhibits mutant "${mutant.name}"'s behaviour; the fixture does not exercise the rule`,
    );
  }
});

test("CONTROL :: the real artifact itself is rejected by nothing", async () => {
  const gate = await import("./check-snippets.mjs");
  assert.deepEqual(
    gate.findSnippetLibraryOffenders(ARTIFACT, {
      expectedWithheld: ARTIFACT.withheld.map((w) => w.id),
    }),
    [],
  );
});

test("CONTROL :: the real artifact has 34 records and 4 withheld ids, so the suites above saw real content", () => {
  assert.equal(ARTIFACT.records.length, 34);
  assert.equal(ARTIFACT.withheld.length, 4);
  assert.equal(CORPUS.items.filter((i) => i.family === "CODE").length, 34);
});
