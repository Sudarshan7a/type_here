/**
 * Corpus gate (CNT-01).
 *
 * The licence gate (scripts/check-content-licenses.mjs, CNT-07) answers "may
 * this item legally exist?". This gate answers the different and weaker question
 * "does the committed corpus still match the corpus, and does it still hold its
 * invariants?". Two separate answers on purpose: CNT-07 already covers licence
 * completeness across the markdown, and duplicating that here would create two
 * places to forget an update.
 *
 * What it enforces, over `content/corpus.json` AND a fresh in-memory rebuild:
 *
 *   G1  DRIFT       the committed artifact is byte-identical to a rebuild, so the
 *                   corpus file can never lag behind the markdown it came from.
 *   G2  LICENCE     every emitted item's licence still classifies as allowed by
 *                   the CNT-07 gate's own `classifyLicense`. Re-derived from the
 *                   artifact, so hand-editing corpus.json to "MIT" a GPL row fails.
 *   G3  DEDUPE      no two emitted items share normalised text, and every drop is
 *                   recorded with its kept id. A silent drop fails.
 *   G4  SENSITIVE   no emitted item's text carries a non-allowlisted finding, and
 *                   no allowlist entry is stale.
 *   G5  TAGS        every contentType is in the declared enum; every item has a
 *                   provenance line and a registerRef.
 *   G6  VACUITY     the artifact is non-empty and covers every family. A gate that
 *                   passes on an empty corpus proves nothing.
 *
 * The pure core is exported for tests against fixture artifacts, so every failing
 * direction is provable without touching the real corpus.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyLicense } from "./check-content-licenses.mjs";
import {
  CONTENT_TYPES,
  ITEM_FAMILIES,
  compareItems,
  findDuplicateGroups,
  findStaleAllowlistEntries,
  normaliseForDedupe,
  scanSensitive,
  serialiseCorpus,
  sha256Hex,
} from "./corpus-pipeline.mjs";
import { buildFromRepo } from "./build-corpus.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every rule above, evaluated against a parsed artifact. Returns an array of
 * human-readable failure lines; empty means the artifact holds.
 *
 * `rebuilt` is the fresh build, passed in so G1 can compare bytes without this
 * function having to know how to build.
 */
export function findCorpusOffenders(artifact, rebuilt = null) {
  const offenders = [];

  // G6 vacuity, first: with no items there is nothing to check and every other
  // rule would pass trivially.
  if (artifact === null || typeof artifact !== "object") {
    return ["NO-ARTIFACT :: content/corpus.json missing or not an object"];
  }
  const items = Array.isArray(artifact.items) ? artifact.items : [];
  if (items.length === 0) return ["EMPTY-CORPUS :: content/corpus.json has 0 items"];

  for (const family of ITEM_FAMILIES) {
    const present = items.some((item) => item.family === family);
    if (!present)
      offenders.push(`MISSING-FAMILY :: ${family} :: no item of this family was emitted`);
  }

  // G1 drift.
  if (rebuilt !== null) {
    if (rebuilt.failures.length > 0) {
      for (const failure of rebuilt.failures) offenders.push(`REBUILD-FAILURE :: ${failure}`);
    }
    const expected = serialiseCorpus(rebuilt);
    const actual = serialiseCorpus({
      version: artifact.version,
      stats: artifact.stats,
      items: artifact.items,
      rejected: artifact.rejected,
      duplicates: artifact.duplicates,
    });
    if (expected !== actual) {
      offenders.push(
        "CORPUS-DRIFT :: content/corpus.json does not match a rebuild from docs/. Run `pnpm build:corpus` and commit the result.",
      );
    }
  }

  const rejected = Array.isArray(artifact.rejected) ? artifact.rejected : [];
  const duplicates = Array.isArray(artifact.duplicates) ? artifact.duplicates : [];

  // G2 licence, re-derived from the artifact rather than trusted from the build.
  const emittedIds = new Set();
  for (const item of items) {
    if (emittedIds.has(item.id))
      offenders.push(`DUPLICATE-ID :: ${item.id} :: appears twice in the artifact`);
    emittedIds.add(item.id);

    const licenseClass = classifyLicense(item.license);
    if (licenseClass === "missing") {
      offenders.push(`MISSING-LICENSE :: ${item.id} :: artifact carries no licence`);
    } else if (licenseClass === "copyleft") {
      offenders.push(`COPYLEFT-LICENSE :: ${item.id} :: "${item.license}"`);
    } else if (licenseClass === "unknown") {
      offenders.push(`UNKNOWN-LICENSE :: ${item.id} :: "${item.license}"`);
    }
    if (item.licenseClass !== licenseClass) {
      offenders.push(
        `LICENCE-CLASS-MISMATCH :: ${item.id} :: artifact says "${item.licenseClass}", classifier says "${licenseClass}"`,
      );
    }

    // G4 sensitive, re-derived from the artifact's own text.
    for (const finding of scanSensitive(item.text, { id: item.id })) {
      if (!finding.allowlisted) {
        offenders.push(
          `SENSITIVE-${finding.rule.toUpperCase()} :: ${item.id} :: ${JSON.stringify(finding.match)}`,
        );
      }
    }

    // G5 tags and provenance.
    if (!CONTENT_TYPES.includes(item.contentType)) {
      offenders.push(`UNKNOWN-CONTENT-TYPE :: ${item.id} :: "${item.contentType}"`);
    }
    if (typeof item.tagSource !== "string" || item.tagSource === "") {
      offenders.push(
        `NO-TAG-SOURCE :: ${item.id} :: cannot tell a declared tag from a derived one`,
      );
    }
    if (!item.registerRef) offenders.push(`NO-REGISTER-REF :: ${item.id}`);
    if (
      !item.provenance?.file ||
      !Number.isInteger(item.provenance?.line) ||
      item.provenance.line < 1
    ) {
      offenders.push(`NO-PROVENANCE :: ${item.id} :: file + 1-based line are required`);
    }
  }

  // G3 dedupe, re-derived: any surviving duplicate is a failure regardless of
  // what the artifact claims, so disabling dedupe in the pipeline turns CI red.
  for (const group of findDuplicateGroups(items)) {
    offenders.push(
      `DUPLICATE-TEXT :: ${[group.kept, ...group.dropped].join(" = ")} :: identical after normalisation but both emitted`,
    );
  }
  const recordedDrops = new Set(
    duplicates.flatMap((g) => (Array.isArray(g.dropped) ? g.dropped : [])),
  );
  for (const entry of rejected) {
    if (entry.reason === "duplicate-text" && !recordedDrops.has(entry.id)) {
      offenders.push(
        `UNRECORDED-DROP :: ${entry.id} :: rejected as duplicate but absent from duplicates[]`,
      );
    }
  }
  for (const group of duplicates) {
    for (const id of group.dropped ?? []) {
      if (emittedIds.has(id)) {
        offenders.push(
          `DROPPED-BUT-EMITTED :: ${id} :: listed as dropped and still present in items[]`,
        );
      }
    }
    // The recorded fingerprint must be the kept item's own normalised text, so a
    // hand-edited "we deduped these two" claim cannot pass on unrelated items.
    const kept = items.find((item) => item.id === group.kept);
    if (kept === undefined) {
      offenders.push(`DUPLICATE-KEPT-MISSING :: ${group.kept} :: recorded as kept but not emitted`);
    } else if (sha256Hex(normaliseForDedupe(kept.text)) !== group.key) {
      offenders.push(
        `DUPLICATE-KEY-MISMATCH :: ${group.kept} :: recorded key is not the kept item's normalised text`,
      );
    }
  }

  for (const stale of findStaleAllowlistEntries(items)) {
    offenders.push(`STALE-ALLOWLIST-ENTRY :: ${stale}`);
  }

  // Ordering: the artifact's one sort order must hold, so a diff stays readable
  // and no consumer has to re-sort to find the newest change.
  const sorted = [...items].sort(compareItems);
  for (let i = 0; i < items.length; i++) {
    if (items[i].id !== sorted[i].id) {
      offenders.push(`UNSORTED :: position ${i} is ${items[i].id}, expected ${sorted[i].id}`);
      break;
    }
  }

  return offenders;
}

async function main() {
  const artifactPath = join(root, "content", "corpus.json");
  const artifact = existsSync(artifactPath) ? JSON.parse(readFileSync(artifactPath, "utf8")) : null;
  const rebuilt = buildFromRepo(root);
  const offenders = findCorpusOffenders(artifact, rebuilt);

  if (offenders.length > 0) {
    console.error(`FAIL: corpus gate violations (CNT-01):`);
    for (const offender of offenders) console.error(`  - ${offender}`);
    process.exit(1);
  }

  const itemCount = artifact.items.length;
  console.log(
    `Corpus gate passed (CNT-01): ${itemCount} items, artifact matches a rebuild from docs/, no duplicate text, ` +
      `no un-allowlisted sensitive findings, all tags in enum.`,
  );
}

// Only run as CLI when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
