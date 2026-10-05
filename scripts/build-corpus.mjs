/**
 * Corpus build CLI (CNT-01).
 *
 * Thin wrapper: collect the real corpus through the CNT-07 gate's own collector,
 * run the pure pipeline, and write `content/corpus.json` — the committed
 * artifact that IS the contract. Nothing is generated at import time, so the
 * production code never reads markdown off disk and the corpus is reviewable in
 * a diff like any other source change.
 *
 * The artifact carries no timestamp, no commit hash and no absolute path. That
 * is deliberate: a build whose output changes when nothing in the corpus changed
 * is a build nobody regenerates, and a corpus diff full of timestamps is a diff
 * nobody reads.
 *
 * On any failure the artifact is NOT written and the exit code is 1, so a red
 * corpus can never be committed as a smaller-than-real one.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCorpus, collectCorpusInputs, serialiseCorpus } from "./corpus-pipeline.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_PATH = join(root, "content", "corpus.json");

/**
 * Build the corpus from the inputs the licence gate scans.
 * Exported so the test can prove the real build and the committed artifact agree.
 */
export function buildFromRepo(repoRoot = root) {
  return buildCorpus(collectCorpusInputs(repoRoot));
}

function main() {
  const build = buildFromRepo(root);

  if (build.failures.length > 0) {
    console.error(`FAIL: corpus pipeline found ${build.failures.length} problem(s) (CNT-01):`);
    for (const failure of build.failures) console.error(`  - ${failure}`);
    console.error("\ncontent/corpus.json was NOT written.");
    process.exit(1);
  }

  if (build.items.length === 0) {
    // A gate that emits nothing passes vacuously; refuse to write an empty corpus.
    console.error("FAIL: corpus pipeline emitted 0 items (CNT-01). Nothing was written.");
    process.exit(1);
  }

  writeFileSync(ARTIFACT_PATH, serialiseCorpus(build), "utf8");

  const s = build.stats;
  const families = Object.entries(s.byFamily)
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
  const byReason = build.rejected.reduce(
    (acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] ?? 0) + 1 }),
    {},
  );
  const rejected = Object.entries(byReason)
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");

  console.log(
    `Corpus built (CNT-01): ${s.emitted} items (${families}); ${s.rejected} rejected (${rejected || "none"}); ` +
      `${s.duplicateGroups} duplicate group(s); ${s.sensitiveAllowlisted} sensitive finding(s) allowlisted; ` +
      `${s.shippable} currently shippable.`,
  );
  console.log(`Wrote ${ARTIFACT_PATH.replace(root, ".").replaceAll("\\", "/")}`);
}

// Only run as CLI when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}
