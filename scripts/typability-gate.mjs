/**
 * Typability gate rules (CNT-02) - the pure core, shared by both entry points.
 *
 * `scripts/check-corpus.mjs` (the CNT-01 gate) and `scripts/check-typability.mjs`
 * (this feature's own gate) call THIS function, for the same reason
 * `scripts/corpus-pipeline.mjs` imports the licence gate's parsers: two copies of
 * one rule is two chances to disagree, and the disagreement is invisible until a
 * corpus ships with a band nobody can reproduce.
 *
 * What it enforces, over `content/corpus.json`:
 *
 *   T1  NO-ARTIFACT / EMPTY      an artifact with no items proves nothing (vacuity).
 *   T2  DRIFT                    every item's stored band equals a fresh computation
 *                                from the same text, family and language.
 *   T3  CODE-BAND                an item the model refused, and every CODE item,
 *                                carries no band. A code item with a band is the
 *                                failure the ledger row warns about.
 *   T4  BAND-ENUM                every band is in the declared enum; every null band
 *                                carries a reason from the declared enum; every band
 *                                carries no reason.
 *   T5  SOURCE                   `difficultySource` agrees with the band: a band is
 *                                either computed or absent, never "declared".
 *   T6  DECLARED-AGREEMENT       `declaredBandAgrees` is true exactly when the
 *                                declared band equals the computed one, so the field
 *                                cannot drift into meaninglessness.
 *   T7  MODEL-VERSION            the artifact's modelVersion is the live one.
 *   T8  BOUNDARIES               the artifact's recorded boundaries equal the live
 *                                ones. A boundary that moved without a version bump
 *                                is red here even when every band still matches.
 *   T9  CONFIG-DIGEST            the artifact's config digest equals the live one, so
 *                                a weight or an anchor change is caught too.
 *   T10 VERSION-NOTE             the newest version note matches the live model and
 *                                records both boundary values.
 *   T11 COVERAGE                 the artifact's own coverage block is arithmetically
 *                                true against its items, so the reported coverage
 *                                cannot flatter itself.
 *
 * Everything is re-derived from the artifact's own text. Nothing is trusted from
 * the build, so hand-editing the artifact to make an item "easy" fails.
 */
import {
  BAND_BOUNDARIES,
  DIFFICULTY_BANDS,
  OUT_OF_SCOPE_REASONS,
  TYPABILITY_FEATURE_SPECS,
  TYPABILITY_VERSION,
  TYPABILITY_VERSION_NOTES,
  typabilityBand,
  typabilityConfigDigestInput,
} from "../packages/typability/src/index.ts";
import { sha256Hex } from "./corpus-pipeline.mjs";

/** The prefix every finding carries, so a red build says which requirement failed. */
export const TYPABILITY_GATE_PREFIX = "TYPABILITY";

function finding(code, message) {
  return `${TYPABILITY_GATE_PREFIX}-${code} :: ${message}`;
}

/**
 * The SHA-256 of the live model config, in the same `sha256:<hex>` shape the
 * artifact and the version note store.
 */
export function liveConfigDigest() {
  return `sha256:${sha256Hex(typabilityConfigDigestInput())}`;
}

/**
 * Every rule above, evaluated against a parsed artifact. Returns an array of
 * human-readable failure lines; empty means the artifact holds.
 *
 * Pure: no clock, no filesystem, no network. `digest` and `notes` are injected so
 * tests can drive T8/T9/T10 against fixture values without editing the package
 * under test - a rule whose failing direction can only be reached by modifying
 * `packages/typability/src/version-notes.ts` has never actually been shown to
 * fail.
 */
export function findTypabilityOffenders(
  artifact,
  { digest = liveConfigDigest(), notes = null } = {},
) {
  const offenders = [];

  // T1 vacuity first: with no items every other rule passes trivially.
  if (artifact === null || typeof artifact !== "object") {
    return [finding("NO-ARTIFACT", "content/corpus.json missing or not an object")];
  }
  const items = Array.isArray(artifact.items) ? artifact.items : [];
  if (items.length === 0) return [finding("EMPTY-CORPUS", "content/corpus.json has 0 items")];

  const banded = new Set();
  const refused = new Map();
  for (const item of items) {
    const verdict = typabilityBand({
      text: item.text,
      family: item.family,
      language: item.language,
      declaredBand: item.declaredDifficulty ?? null,
    });

    // T2 drift: the stored band must be exactly what a fresh computation gives.
    if ((item.difficulty ?? null) !== verdict.band) {
      offenders.push(
        finding(
          "DRIFT",
          `${item.id} :: artifact says "${item.difficulty ?? "null"}", fresh computation says "${verdict.band ?? "null"}"`,
        ),
      );
    }

    // T3 code items never carry a band.
    if (item.family === "CODE" && (item.difficulty ?? null) !== null) {
      offenders.push(
        finding("CODE-BAND", `${item.id} :: CODE item carries difficulty "${item.difficulty}"`),
      );
    }
    if (verdict.band === null) refused.set(item.id, verdict.reason);

    // T4 enums, both directions.
    if (item.difficulty !== null && !DIFFICULTY_BANDS.includes(item.difficulty)) {
      offenders.push(
        finding("BAND-ENUM", `${item.id} :: "${item.difficulty}" is not in the declared enum`),
      );
    }
    const reason = item.bandReason ?? null;
    if (item.difficulty === null && !OUT_OF_SCOPE_REASONS.includes(reason)) {
      offenders.push(
        finding(
          "BAND-REASON",
          `${item.id} :: no band and reason "${reason}" is not in the declared enum (a silent null is not an honest one)`,
        ),
      );
    }
    if (item.difficulty !== null && reason !== null) {
      offenders.push(finding("BAND-REASON", `${item.id} :: carries a band AND reason "${reason}"`));
    }

    // T5 the band is computed or absent. Nothing is "declared".
    const expectedSource = verdict.band === null ? "unbanded" : "computed";
    if (item.difficultySource !== expectedSource) {
      offenders.push(
        finding(
          "BAND-SOURCE",
          `${item.id} :: difficultySource "${item.difficultySource}", expected "${expectedSource}"`,
        ),
      );
    }

    // T6 the declared comparison cannot lie. The comparison itself belongs to the
    // model (agreement is undefined - null - when either side is absent, so an
    // out-of-scope item with a declared band records no verdict either way), and
    // what the gate checks is that the artifact records exactly what a fresh
    // computation says, plus that the comparison is a boolean wherever one exists.
    if ((item.declaredBandAgrees ?? null) !== verdict.declaredBandAgrees) {
      offenders.push(
        finding(
          "DECLARED-AGREEMENT",
          `${item.id} :: declaredBandAgrees "${item.declaredBandAgrees}", recomputed ${verdict.declaredBandAgrees}`,
        ),
      );
    }
    if (
      verdict.band !== null &&
      verdict.declaredBand !== null &&
      typeof item.declaredBandAgrees !== "boolean"
    ) {
      offenders.push(
        finding(
          "DECLARED-AGREEMENT",
          `${item.id} :: has both a computed and a declared band but no boolean comparison`,
        ),
      );
    }
    if ((item.declaredDifficulty ?? null) !== verdict.declaredBand) {
      offenders.push(
        finding(
          "DECLARED-BAND",
          `${item.id} :: declaredDifficulty "${item.declaredDifficulty ?? "null"}" does not normalise to "${verdict.declaredBand ?? "null"}"`,
        ),
      );
    }

    if (verdict.band !== null) banded.add(item.id);
  }

  // T7/T8/T9 the model stamp and the config the bands were produced with.
  const recorded = artifact.typability ?? null;
  if (recorded === null || typeof recorded !== "object") {
    offenders.push(finding("NO-MODEL-BLOCK", "content/corpus.json has no `typability` block"));
  } else {
    if (recorded.modelVersion !== TYPABILITY_VERSION) {
      offenders.push(
        finding(
          "MODEL-VERSION",
          `artifact says ${recorded.modelVersion}, live model is ${TYPABILITY_VERSION}. Bands were produced by a different model.`,
        ),
      );
    }
    // One code per boundary, so a test that gets ONE boundary wrong is testing
    // that boundary.
    if (recorded.boundaries?.typicalMax !== BAND_BOUNDARIES.typicalMax) {
      offenders.push(
        finding(
          "BOUNDARY-TYPICAL-MAX",
          `typicalMax moved from ${recorded.boundaries?.typicalMax} to ${BAND_BOUNDARIES.typicalMax} without a TYPABILITY_VERSION bump and a version note`,
        ),
      );
    }
    if (recorded.boundaries?.hardMin !== BAND_BOUNDARIES.hardMin) {
      offenders.push(
        finding(
          "BOUNDARY-HARD-MIN",
          `hardMin moved from ${recorded.boundaries?.hardMin} to ${BAND_BOUNDARIES.hardMin} without a TYPABILITY_VERSION bump and a version note`,
        ),
      );
    }
    if (recorded.configDigest !== digest) {
      offenders.push(
        finding(
          "CONFIG-DIGEST",
          `artifact digest ${recorded.configDigest ?? "(none)"} != live ${digest}. A feature, weight, anchor, ceiling or quantisation changed.`,
        ),
      );
    }
    if (
      !Array.isArray(recorded.bandEnum) ||
      recorded.bandEnum.join(",") !== DIFFICULTY_BANDS.join(",")
    ) {
      offenders.push(
        finding(
          "BAND-ENUM",
          `artifact bandEnum ${JSON.stringify(recorded.bandEnum ?? null)} != ${JSON.stringify(DIFFICULTY_BANDS)}`,
        ),
      );
    }

    // T11 the coverage block must be arithmetically true of the items. Each
    // arithmetic rule gets its OWN finding code, which is not a style choice: with
    // one shared code, disabling any single rule leaves the code in the set and the
    // gate's own test suite cannot tell the difference. (Mutation testing found
    // exactly this: two rules survived with a shared code.)
    const coverage = recorded.coverage ?? {};
    if (coverage.items !== items.length) {
      offenders.push(
        finding(
          "COVERAGE-ITEMS",
          `coverage.items ${coverage.items} != ${items.length} items in the artifact`,
        ),
      );
    }
    if (coverage.banded !== banded.size) {
      offenders.push(
        finding(
          "COVERAGE-BANDED",
          `coverage.banded ${coverage.banded} != ${banded.size} items with a band`,
        ),
      );
    }
    if (coverage.unbanded !== items.length - banded.size) {
      offenders.push(
        finding(
          "COVERAGE-UNBANDED",
          `coverage.unbanded ${coverage.unbanded} != ${items.length - banded.size} items without a band`,
        ),
      );
    }
    for (const [reason, count] of Object.entries(coverage.byReason ?? {})) {
      const actual = [...refused.values()].filter((value) => value === reason).length;
      if (actual !== count) {
        offenders.push(
          finding(
            "COVERAGE-REASON",
            `coverage.byReason.${reason} is ${count}, recomputed ${actual}`,
          ),
        );
      }
    }
    // The reverse direction: a reason the items carry that the block does not
    // mention at all. Without this, deleting a reason key from the block would
    // pass - the loop above only checks the keys that are present.
    for (const reason of new Set(refused.values())) {
      if (!(reason in (coverage.byReason ?? {}))) {
        offenders.push(
          finding(
            "COVERAGE-REASON",
            `coverage.byReason omits "${reason}", which ${refused.size} items carry`,
          ),
        );
      }
    }
  }

  // T10 the version note, so a config change cannot ship without a record. Each
  // sub-rule has its own code for the same reason the coverage rules do, and the
  // note list is INJECTED so a test can drive each sub-rule without editing the
  // package: a check that can only be exercised by editing the source under test is
  // a check whose failing direction has never been run.
  const noteList = notes ?? TYPABILITY_VERSION_NOTES;
  const note = noteList[noteList.length - 1];
  if (note === undefined) {
    offenders.push(finding("NOTE-ABSENT", "packages/typability has no version note at all"));
  } else {
    if (note.version !== TYPABILITY_VERSION) {
      offenders.push(
        finding(
          "NOTE-VERSION",
          `newest note is ${note.version}, live model is ${TYPABILITY_VERSION}`,
        ),
      );
    }
    // One code per boundary, not one shared code: with a shared code, a note that
    // gets ONE boundary wrong still trips the other check, and a mutation that
    // disables one of them is invisible. (Mutation testing found exactly that.)
    if (note.boundaries.to.typicalMax !== BAND_BOUNDARIES.typicalMax) {
      offenders.push(
        finding(
          "NOTE-TYPICAL-MAX",
          `newest note records typicalMax ${note.boundaries.to.typicalMax}, live value is ${BAND_BOUNDARIES.typicalMax}`,
        ),
      );
    }
    if (note.boundaries.to.hardMin !== BAND_BOUNDARIES.hardMin) {
      offenders.push(
        finding(
          "NOTE-HARD-MIN",
          `newest note records hardMin ${note.boundaries.to.hardMin}, live value is ${BAND_BOUNDARIES.hardMin}`,
        ),
      );
    }
    if (note.configDigest !== digest) {
      offenders.push(
        finding(
          "NOTE-DIGEST",
          `newest note digest ${note.configDigest} != live ${digest}. Bump TYPABILITY_VERSION and re-record the boundaries.`,
        ),
      );
    }
    if (
      [...note.features].sort().join(",") !==
      TYPABILITY_FEATURE_SPECS.map((s) => s.name)
        .sort()
        .join(",")
    ) {
      offenders.push(
        finding("NOTE-FEATURES", "newest note's feature list is not the live feature list"),
      );
    }
  }

  return offenders;
}
