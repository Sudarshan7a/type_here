/**
 * Build the code snippet library artifact (CNT-04).
 *
 * Thin CLI, deliberately shaped like `build-corpus.mjs`: collect through the
 * licence gate's own collectors, run the pure pipeline, write the artifact, and
 * write NOTHING and exit 1 on any failure. A red library can therefore never be
 * committed as a smaller-than-real one.
 *
 * Input is `content/corpus.json` - the CNT-01 artifact - not the markdown. The
 * corpus has already resolved licence, register status, provenance and the
 * duplicate decision; re-parsing `docs/content-*.md` here would be a second
 * opinion about the same tables. The one thing the corpus artifact does not
 * carry is the register row for a *rejected* id, so the licence rows are read
 * through CNT-07's own `parseRegisterMarkdown` for the placeholders only. Same
 * parser, same classifier, no second copy of the licence logic.
 *
 * Determinism: no timestamp, no commit hash, no absolute path in the artifact.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { collectCorpusInputs, parseRegisterMarkdown } from "./check-content-licenses.mjs";
import { buildSnippetLibrary, serialiseSnippetLibrary } from "./snippet-library.mjs";
import { lexSnippet } from "./snippet-engine-loader.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_PATH = join(root, "content", "snippets", "library.json");

/**
 * Read the register rows the way CNT-07 reads them, so a placeholder's licence
 * comes from the same parse the licence gate uses. Exported for the test that
 * proves the real build and the committed artifact agree.
 */
export function collectLicenceRows(repoRoot = root) {
  const { registerTexts, corpusTexts } = collectCorpusInputs(repoRoot);
  return [...registerTexts, ...corpusTexts].flatMap(({ name, text }) =>
    parseRegisterMarkdown(text, name),
  );
}

/** Build from the committed corpus artifact. Exported for the tests. */
export function buildFromRepo(repoRoot = root) {
  const corpus = JSON.parse(readFileSync(join(repoRoot, "content", "corpus.json"), "utf8"));
  return buildSnippetLibrary({ corpus, licenceRows: collectLicenceRows(repoRoot), lexSnippet });
}

function main() {
  let build;
  try {
    build = buildFromRepo(root);
  } catch (error) {
    console.error(`FAIL: could not build the snippet library (CNT-04): ${error.message}`);
    console.error("\ncontent/snippets/library.json was NOT written.");
    process.exit(1);
  }

  // The build throws on a lex diagnostic rather than emitting a broken record,
  // but the guard is here anyway: an artifact that fails on the next build for a
  // reason the build itself cannot detect is exactly the drift this prevents.
  const unclean = build.records.filter((record) => !record.tokenMap.clean);
  if (unclean.length > 0) {
    console.error(`FAIL: ${unclean.length} snippet(s) did not tokenize cleanly (CNT-04):`);
    for (const record of unclean) {
      for (const diagnostic of record.tokenMap.diagnostics) {
        console.error(
          `  - ${record.id} :: ${diagnostic.code} at ${diagnostic.index}: ${diagnostic.text}`,
        );
      }
    }
    console.error("\ncontent/snippets/library.json was NOT written.");
    process.exit(1);
  }

  if (build.records.length === 0) {
    console.error("FAIL: snippet library emitted 0 records (CNT-04). Nothing was written.");
    process.exit(1);
  }

  writeFileSync(ARTIFACT_PATH, serialiseSnippetLibrary(build), "utf8");

  const s = build.stats;
  console.log(
    `Snippet library built (CNT-04): ${s.records} records (${Object.entries(s.bySurface)
      .map(([k, n]) => `${k} ${n}`)
      .join(", ")}); ${s.selectable} selectable; ${s.placeholders} withheld placeholder(s); ` +
      `${s.lexClean}/${s.records} tokenize cleanly; ${s.withDeclaredBand}/${s.records} carry a register band; ` +
      `${s.defects} content defect(s) awaiting a human decision.`,
  );
  console.log(`Wrote ${ARTIFACT_PATH.replace(root, ".").replaceAll("\\", "/")}`);
}

// Only run as CLI when invoked directly (not when imported by a test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}
