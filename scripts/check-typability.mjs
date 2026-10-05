/**
 * Typability gate CLI (CNT-02).
 *
 * Reads the committed artifact, re-derives every band from the item text, and
 * fails on drift, on a code item carrying a prose band, on a band outside the
 * declared enum, and on a model config that moved without a version note. The
 * rules themselves live in `./typability-gate.mjs`, which `check-corpus.mjs` also
 * calls, so the two gates cannot disagree.
 *
 * It also prints the honest coverage report, because a gate that says only "OK"
 * leaves the reader guessing how much of the corpus is actually covered. Three
 * modes:
 *
 *   node scripts/check-typability.mjs              gate + coverage summary
 *   node scripts/check-typability.mjs --item ID    why this item got its band
 *   node scripts/check-typability.mjs --calibration  score distribution, tertiles,
 *                                                 declared-vs-computed agreement
 *
 * `--item` and `--calibration` are the audit path for "transparent": the score is
 * printed for a human on request and is never stored per item or consumed by any
 * speed metric.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAND_BOUNDARIES,
  DIFFICULTY_BANDS,
  OUT_OF_SCOPE_REASONS,
  SCORE_QUANTISATION_STEP,
  TYPABILITY_FEATURE_SPECS,
  TYPABILITY_VERSION,
  TYPABILITY_VERSION_NOTES,
  explainTypabilityBand,
  typabilityBand,
} from "../packages/typability/src/index.ts";
import { findTypabilityOffenders, liveConfigDigest } from "./typability-gate.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadArtifact() {
  const path = join(root, "content", "corpus.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The band coverage numbers, recomputed from the artifact rather than read from it. */
export function coverageReport(items) {
  const byBand = Object.fromEntries(DIFFICULTY_BANDS.map((band) => [band, 0]));
  const byReason = {};
  const byFamily = {};
  const declaredConflicts = [];
  let banded = 0;
  for (const item of items) {
    const family = (byFamily[item.family] ??= {
      items: 0,
      banded: 0,
      unbanded: 0,
      ...Object.fromEntries(DIFFICULTY_BANDS.map((band) => [band, 0])),
    });
    family.items++;
    if (item.difficulty === null) {
      family.unbanded++;
      const reason = item.bandReason ?? "unrecorded";
      byReason[reason] = (byReason[reason] ?? 0) + 1;
    } else {
      banded++;
      family.banded++;
      byBand[item.difficulty] = (byBand[item.difficulty] ?? 0) + 1;
      family[item.difficulty]++;
      if (item.declaredDifficulty !== null && item.declaredDifficulty !== item.difficulty) {
        declaredConflicts.push(item.id);
      }
    }
  }
  return {
    items: items.length,
    banded,
    unbanded: items.length - banded,
    byBand,
    byReason,
    byFamily,
    declaredConflicts: declaredConflicts.length,
    declaredConflictIds: declaredConflicts,
  };
}

/**
 * Display rounding only. The stored band is read from the full-precision
 * quantised score; a report that prints `27.950000000000003` is noise pretending
 * to be precision, and the engine's display rule (round for display, store full
 * precision) applies here too.
 */
function display(value) {
  return value === null || value === undefined ? "(none)" : Number(value.toFixed(2));
}

/** Score distribution, for the §6.5 step 5 calibration check. */
export function calibrationReport(items) {
  const scored = [];
  for (const item of items) {
    if (item.difficulty === null) continue;
    const explanation = explainTypabilityBand({
      text: item.text,
      family: item.family,
      language: item.language,
    });
    scored.push({ id: item.id, quantisedScore: explanation.quantisedScore });
  }
  scored.sort((a, b) => a.quantisedScore - b.quantisedScore);
  const at = (q) => scored[Math.floor(q * (scored.length - 1))]?.quantisedScore ?? null;
  const counts = { hard: 0, typical: 0, easy: 0 };
  for (const entry of scored) {
    if (entry.quantisedScore >= BAND_BOUNDARIES.typicalMax) counts.easy++;
    else if (entry.quantisedScore >= BAND_BOUNDARIES.hardMin) counts.typical++;
    else counts.hard++;
  }
  return {
    n: scored.length,
    min: scored[0]?.quantisedScore ?? null,
    p05: at(0.05),
    p33: at(1 / 3),
    median: at(0.5),
    p67: at(2 / 3),
    p95: at(0.95),
    max: scored[scored.length - 1]?.quantisedScore ?? null,
    counts,
  };
}

function printCoverage(artifact) {
  const coverage = coverageReport(artifact.items);
  console.log(`Typability coverage (CNT-02, model ${TYPABILITY_VERSION}):`);
  console.log(
    `  items ${coverage.items} :: banded ${coverage.banded} (${((100 * coverage.banded) / coverage.items).toFixed(1)}%) :: ` +
      `honest null ${coverage.unbanded} (${((100 * coverage.unbanded) / coverage.items).toFixed(1)}%)`,
  );
  for (const band of DIFFICULTY_BANDS) {
    console.log(`  ${band.padEnd(9)} ${String(coverage.byBand[band]).padStart(4)}`);
  }
  for (const [reason, count] of Object.entries(coverage.byReason)) {
    console.log(
      `  ${reason.padEnd(26)} ${String(count).padStart(4)}  (${OUT_OF_SCOPE_REASONS.includes(reason) ? "declared reason" : "UNDECLARED"})`,
    );
  }
  console.log("  by family:");
  for (const [family, counts] of Object.entries(coverage.byFamily)) {
    console.log(
      `    ${family.padEnd(9)} items ${String(counts.items).padStart(4)} :: banded ${String(counts.banded).padStart(4)} :: ` +
        `easy ${counts.easy} / typical ${counts.typical} / hard ${counts.hard} :: no band ${counts.unbanded}`,
    );
  }
  console.log(
    `  source-declared band disagreed with the computed band on ${coverage.declaredConflicts} of ` +
      `${artifact.items.filter((i) => i.declaredDifficulty !== null).length} items that declare one. ` +
      "The declared value is preserved per item; the computed band is the one shown.",
  );
  return coverage;
}

function printItem(artifact, id) {
  const item = artifact.items.find((candidate) => candidate.id === id);
  if (item === undefined) {
    console.error(`FAIL: no item "${id}" in content/corpus.json`);
    process.exit(1);
  }
  const explanation = explainTypabilityBand({
    text: item.text,
    family: item.family,
    language: item.language,
    declaredBand: item.declaredDifficulty,
  });
  const verdict = typabilityBand({
    text: item.text,
    family: item.family,
    language: item.language,
    declaredBand: item.declaredDifficulty,
  });
  console.log(`${item.id} (${item.family} / ${item.contentType}, ${item.language})`);
  console.log(`  band       ${verdict.band ?? "(none)"}   reason: ${verdict.reason ?? "(none)"}`);
  console.log(
    `  declared   ${item.declaredDifficulty ?? "(none)"}   agrees: ${String(item.declaredBandAgrees ?? "(n/a)")}`,
  );
  console.log(
    `  score      ${display(explanation.quantisedScore)} (raw ${explanation.score.toFixed(4)}), ` +
      `step ${SCORE_QUANTISATION_STEP}, boundaries typical>=${BAND_BOUNDARIES.typicalMax} hard>=${BAND_BOUNDARIES.hardMin}`,
  );
  console.log(`  distance to nearest boundary ${display(explanation.distanceToBoundary)}`);
  console.log("  features (raw -> component x weight):");
  for (const feature of explanation.features.features) {
    const spec = TYPABILITY_FEATURE_SPECS.find((candidate) => candidate.name === feature.name);
    console.log(
      `    ${feature.name.padEnd(24)} ${feature.raw.toFixed(4).padStart(8)} -> ${feature.component.toFixed(3)} x ${spec.weight}`,
    );
  }
}

function printCalibration(artifact) {
  const calibration = calibrationReport(artifact.items);
  const note = TYPABILITY_VERSION_NOTES[TYPABILITY_VERSION_NOTES.length - 1];
  console.log(`Calibration report for model ${TYPABILITY_VERSION} (${liveConfigDigest()}):`);
  console.log(`  banded items ${calibration.n}`);
  console.log(
    `  score min ${display(calibration.min)} p05 ${display(calibration.p05)} p33 ${display(calibration.p33)} median ${display(calibration.median)} ` +
      `p67 ${display(calibration.p67)} p95 ${display(calibration.p95)} max ${display(calibration.max)}`,
  );
  console.log(
    `  frozen boundaries typicalMax ${BAND_BOUNDARIES.typicalMax} hardMin ${BAND_BOUNDARIES.hardMin} ` +
      `(recorded in the version note as from ${JSON.stringify(note.boundaries.from)} to ${JSON.stringify(note.boundaries.to)})`,
  );
  console.log(
    `  split hard ${calibration.counts.hard} / typical ${calibration.counts.typical} / easy ${calibration.counts.easy} ` +
      `= ${((100 * calibration.counts.hard) / calibration.n).toFixed(1)}% / ${((100 * calibration.counts.typical) / calibration.n).toFixed(1)}% / ${((100 * calibration.counts.easy) / calibration.n).toFixed(1)}%`,
  );
  console.log(
    `  measured tertiles ${display(calibration.p33)} and ${display(calibration.p67)} :: the frozen pair sits ` +
      `${display(Math.abs(calibration.p33 - BAND_BOUNDARIES.hardMin))} and ${display(Math.abs(calibration.p67 - BAND_BOUNDARIES.typicalMax))} points from them`,
  );
  console.log(
    "  This is offline validation only (implementation guide 6.5 step 6). No band has been checked against a user's speed (step 7).",
  );
}

async function main() {
  const artifact = loadArtifact();
  const args = process.argv.slice(2);
  const offenders = findTypabilityOffenders(artifact);

  if (offenders.length > 0) {
    console.error(`FAIL: typability gate violations (CNT-02):`);
    for (const offender of offenders) console.error(`  - ${offender}`);
    process.exit(1);
  }

  const itemIndex = args.indexOf("--item");
  if (itemIndex !== -1) {
    printItem(artifact, args[itemIndex + 1]);
    return;
  }
  if (args.includes("--calibration")) {
    printCalibration(artifact);
    return;
  }

  const coverage = printCoverage(artifact);
  console.log(
    `Typability gate passed (CNT-02): every stored band matches a fresh computation, ` +
      `${coverage.banded} items banded, ${coverage.unbanded} honest nulls, model ${TYPABILITY_VERSION} ` +
      `(${liveConfigDigest()}) recorded with its boundaries and a version note.`,
  );
}

// Only run as CLI when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
