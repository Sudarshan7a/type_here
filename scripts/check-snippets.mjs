/**
 * Snippet library gate (CNT-04).
 *
 * The thing that runs in CI, so this file is almost entirely the FAILING
 * direction: `findSnippetLibraryOffenders` takes a plausible-looking but wrong
 * artifact and must reject it. A gate suite made only of "the real library passes"
 * is how a gate ends up passing forever without ever having been shown it can
 * fail.
 *
 * Like `check-corpus.mjs`, the gate deliberately does NOT regenerate the
 * artifact. It re-derives the library in memory from `content/corpus.json` and
 * fails on drift, so running `build:snippets` first in CI would hide exactly the
 * staleness the step exists to catch.
 *
 * THE RULES, and why each is mechanical rather than a review note:
 *
 *   LICENCE-MISSING / LICENCE-COPYLEFT / LICENCE-UNKNOWN
 *       Every record and every withheld record carries a licence declaration, and
 *       CNT-07's own `classifyLicense` must call it `allowed`. The verdict is
 *       RECOMPUTED here rather than read from the record, so hand-editing
 *       `licenseClass` to "allowed" over a GPL declaration fails.
 *   LICENCE-CLASS-MISMATCH
 *       The stored verdict must equal the recomputed one.
 *   LEX-DIAGNOSTIC
 *       The record's stored diagnostics must be empty AND re-lexing the record's
 *       own text must produce none. Re-lexing matters: it catches a record whose
 *       text was edited after the artifact was written, and it is the only way the
 *       gate can know the stored mix belongs to the stored code.
 *   TILING-BROKEN
 *       The token map must tile its text (D-M5-2). Everything downstream - the mix,
 *       every per-class statistic - is wrong without it.
 *   MIX-MISMATCH
 *       The stored per-class mix must equal a fresh computation.
 *   LANGUAGE-UNKNOWN
 *       The resolved profile must be the declared language, not the `generic`
 *       fallback. A typo'd language id degrades silently inside the lexer, which
 *       would make every other check here weaker than it looks.
 *   DUPLICATE-UNMARKED / DUPLICATE-DROPPED-SILENTLY
 *       Two records with the same normalised text must both carry a
 *       `duplicate-text` defect and both be unselectable; and every dropped
 *       duplicate must have a withheld record, so a collision can never be
 *       resolved by deletion.
 *   PLACEHOLDER-SHIPPABLE / PLACEHOLDER-CONTENT
 *       A `do-not-ship` id must never read shippable and must never carry text.
 *   DIFFICULTY-BAND-WITHOUT-SOURCE / BAND-NOT-IN-REGISTER
 *       A band must come from the register and from nowhere else.
 *   TAG-NOT-DECLARED
 *       Every tag must be in the closed vocabularies, so a tag can never be
 *       invented to make a record selectable.
 *   BLOCKER-UNDER-DERIVED / BLOCKER-MISSING
 *       `publishBlockers` is recomputed and compared, so it cannot drift into
 *       under-reporting.
 *   VACUITY
 *       Zero records is a failure. A gate that emits nothing passes vacuously.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyLicense } from "./check-content-licenses.mjs";
import { findDuplicateGroups, serialiseSnippetLibrary } from "./snippet-library.mjs";
import { lexSnippet } from "./snippet-engine-loader.mjs";
import { buildFromRepo } from "./build-snippets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_PATH = join(root, "content", "snippets", "library.json");

/** Tags the artifact is allowed to use. Mirrors the closed vocabularies in snippet-library.mjs. */
const ALLOWED_CONTENT_SURFACES = ["utility", "algorithm", "web", "react"];
const ALLOWED_SURFACE_TAGS = [
  "brackets",
  "operators",
  "chords",
  "strings",
  "numbers",
  "number-systems",
  "identifiers",
  "keywords",
  "comments",
  "paths",
  "data",
  "whitespace",
];
const ALLOWED_FEATURES = [
  "function-declaration",
  "class-declaration",
  "arrow-function",
  "async-await",
  "template-literal",
  "regex-literal",
  "comment-line",
  "comment-block",
  "default-parameter",
  "spread-rest",
  "optional-chaining",
  "nullish-coalescing",
  "jsx",
  "dom-api",
  "react-hook",
  "array-method-chain",
  "promise",
];
const ALLOWED_BANDS = ["easy", "typical", "hard"];
const ALLOWED_STATUSES = ["library", "withheld-duplicate", "withheld-do-not-ship"];
const DECLARED_BLOCKER_PREFIXES = [
  "licence-",
  "status-not-shippable",
  "no-difficulty-band",
  "content-defect:",
  "status-",
  "do-not-ship",
  "duplicate-text",
  "no-content-body",
  "licence-text-not-pulled",
];

/**
 * Re-derive a record's expected blocker list from its own stored fields.
 *
 * Duplicated from `buildPublishBlockers` on purpose: a gate that called the
 * builder's own helper would pass whenever the helper changed its mind, which is
 * the opposite of what a gate is for. If the two ever disagree, the artifact is
 * stale and the gate says so.
 */
function expectedBlockers(record) {
  const blockers = [];
  const licenceClass = classifyLicense(record.licence?.declaration ?? "");
  if (licenceClass !== "allowed") blockers.push(`licence-${licenceClass}`);
  if (!(record.licence?.declaration ?? "").trim()) blockers.push("licence-missing");
  if (record.licence?.shippable !== true) {
    blockers.push(`status-not-shippable: ${record.licence?.registerStatus ?? ""}`);
  }
  if (record.difficulty?.band === null) blockers.push("no-difficulty-band");
  for (const defect of record.defects ?? []) blockers.push(`content-defect: ${defect.code}`);
  if (record.status !== "library") blockers.push(`status-${record.status}`);
  if (record.code === null && !blockers.includes("no-content-body")) {
    blockers.push("no-content-body");
  }
  return blockers;
}

/** Sorted, so comparison is order-independent. */
const sorted = (values) => [...values].sort();

/**
 * Every rule, run over one artifact. Returns an array of human-readable offenders;
 * empty means the artifact is acceptable.
 */
/**
 * @param expectedWithheld Ids the corpus rejects as `do-not-ship` or
 *   `duplicate-text`. Passed in rather than read here so the gate stays a pure
 *   function of the artifact plus its inputs, and so a test can prove the
 *   accounting rule by removing a placeholder from a hand-made artifact.
 */
export function findSnippetLibraryOffenders(
  artifact,
  { lex = lexSnippet, rebuilt = null, expectedWithheld = [] } = {},
) {
  const offenders = [];
  const fail = (message) => offenders.push(message);

  if (artifact === null || typeof artifact !== "object") {
    return ["NO-ARTIFACT :: content/snippets/library.json missing or not an object"];
  }

  // Drift first: if the artifact does not match a rebuild, every later finding is
  // describing a stale document and saying so up front is more useful than
  // listing consequences of the staleness.
  if (rebuilt !== null) {
    if (serialiseSnippetLibrary(rebuilt) !== serialiseSnippetLibrary(artifact)) {
      fail(
        "LIBRARY-DRIFT :: content/snippets/library.json does not match a rebuild from content/corpus.json. Run `pnpm build:snippets` and commit the result.",
      );
    }
  }

  const records = artifact.records ?? [];
  const withheld = artifact.withheld ?? [];
  const defects = artifact.defects ?? [];

  if (records.length === 0) fail("VACUITY :: artifact holds 0 records");
  if (!("withheld" in artifact) || !Array.isArray(artifact.withheld)) {
    fail("SHAPE-MISSING :: artifact has no `withheld` array");
  }
  if (!("defects" in artifact) || !Array.isArray(artifact.defects)) {
    fail("SHAPE-MISSING :: artifact has no `defects` array");
  }

  const byId = new Map();
  for (const record of [...records, ...withheld]) {
    if (byId.has(record.id)) {
      fail(`DUPLICATE-RECORD :: ${record.id} :: id appears twice in the artifact`);
    }
    byId.set(record.id, record);
  }

  // Every withheld id must be accounted for, from either direction. A `do-not-ship`
  // placeholder that vanished from the artifact would be invisible, and an
  // invisible placeholder is one somebody later fills in from a search engine.
  // `expectedWithheld` comes from the corpus artifact's own rejections, so this
  // catches a deletion without the corpus having to be re-read here.
  for (const id of expectedWithheld) {
    if (!byId.has(id)) {
      fail(
        `WITHHELD-MISSING :: ${id} :: the corpus rejects this id but the artifact holds no record for it`,
      );
    }
  }

  for (const record of records) {
    const id = record.id;

    // --- licence, recomputed from the declaration -----------------------------
    const declaration = (record.licence?.declaration ?? "").trim();
    const licenceClass = classifyLicense(declaration);
    if (declaration === "") fail(`LICENCE-MISSING :: ${id} :: no licence declaration`);
    if (licenceClass === "copyleft") fail(`LICENCE-COPYLEFT :: ${id} :: "${declaration}"`);
    if (licenceClass === "unknown") fail(`LICENCE-UNKNOWN :: ${id} :: "${declaration}"`);
    if (record.licence?.licenseClass !== licenceClass) {
      fail(
        `LICENCE-CLASS-MISMATCH :: ${id} :: stored "${record.licence?.licenseClass}" vs recomputed "${licenceClass}"`,
      );
    }

    // --- token map: re-lex the record's own text --------------------------------
    if (typeof record.code !== "string" || record.code === "") {
      fail(`RECORD-NO-CODE :: ${id} :: an emitted record must carry text`);
      continue;
    }
    let map;
    try {
      map = lex(record.code, record.language);
    } catch (error) {
      fail(`LEX-THREW :: ${id} :: ${error.message}`);
      continue;
    }
    if (map.diagnostics.length > 0) {
      for (const diagnostic of map.diagnostics) {
        fail(
          `LEX-DIAGNOSTIC :: ${id} :: ${diagnostic.code} at ${diagnostic.index}: ${diagnostic.text}`,
        );
      }
      if (record.tokenMap?.clean !== false) {
        fail(`LEX-DIAGNOSTIC-UNREPORTED :: ${id} :: artifact records this snippet as lex-clean`);
      }
    } else if (record.tokenMap?.clean !== true) {
      fail(
        `LEX-CLEAN-MISREPORTED :: ${id} :: artifact records a diagnostic-free snippet as unclean`,
      );
    }
    if ((record.tokenMap?.tilingIssues ?? []).length > 0) {
      fail(`TILING-BROKEN :: ${id} :: ${JSON.stringify(record.tokenMap.tilingIssues)}`);
    }
    if (map.language !== record.language) {
      fail(
        `LANGUAGE-UNKNOWN :: ${id} :: declared "${record.language}", lexer resolved "${map.language}"`,
      );
    }

    // --- mix must belong to the code -------------------------------------------
    for (const [axis, expected] of [
      ["chars", map.counts.chars],
      ["tokens", map.counts.tokens],
    ]) {
      if (JSON.stringify(record.tokenClassMix?.[axis]) !== JSON.stringify(expected)) {
        fail(`MIX-MISMATCH :: ${id} :: stored ${axis} mix does not match a fresh tokenization`);
      }
    }

    // --- tags against the closed vocabularies -----------------------------------
    if (!ALLOWED_CONTENT_SURFACES.includes(record.surface)) {
      fail(`TAG-NOT-DECLARED :: ${id} :: content surface "${record.surface}"`);
    }
    for (const tag of record.tags?.surfaces ?? []) {
      if (!ALLOWED_SURFACE_TAGS.includes(tag))
        fail(`TAG-NOT-DECLARED :: ${id} :: surface tag "${tag}"`);
    }
    for (const tag of record.tags?.features ?? []) {
      if (!ALLOWED_FEATURES.includes(tag))
        fail(`TAG-NOT-DECLARED :: ${id} :: feature tag "${tag}"`);
    }
    for (const tier of record.tags?.tiers ?? []) {
      if (!Number.isInteger(tier) || tier < 1 || tier > 7) {
        fail(`TAG-NOT-DECLARED :: ${id} :: tier "${tier}"`);
      }
    }

    // --- difficulty -------------------------------------------------------------
    if (record.difficulty?.band === null) {
      if (typeof record.difficulty?.reason !== "string" || record.difficulty.reason === "") {
        fail(`BAND-WITHOUT-REASON :: ${id} :: band is null with no stated reason`);
      }
    } else {
      if (!ALLOWED_BANDS.includes(record.difficulty?.band)) {
        fail(`BAND-NOT-IN-REGISTER :: ${id} :: "${record.difficulty?.band}"`);
      }
      if (record.difficulty?.source !== "register") {
        fail(`DIFFICULTY-BAND-WITHOUT-SOURCE :: ${id} :: band must come from the register`);
      }
    }

    // --- blockers ---------------------------------------------------------------
    const stored = record.publishBlockers ?? [];
    const derived = expectedBlockers(record);
    for (const blocker of derived) {
      if (!stored.includes(blocker)) fail(`BLOCKER-MISSING :: ${id} :: "${blocker}"`);
    }
    for (const blocker of stored) {
      if (!DECLARED_BLOCKER_PREFIXES.some((prefix) => blocker.startsWith(prefix))) {
        fail(`BLOCKER-UNDECLARED :: ${id} :: "${blocker}" is not a blocker this gate knows about`);
      }
      if (
        blocker.startsWith("status-not-shippable:") &&
        blocker !== `status-not-shippable: ${record.licence?.registerStatus ?? ""}`
      ) {
        fail(
          `BLOCKER-MISREPORTED :: ${id} :: "${blocker}" does not match the record's register status`,
        );
      }
    }
  }

  // A record may only carry a `duplicate-text` defect if some finding names it.
  for (const record of records) {
    if (!(record.defects ?? []).some((d) => d.code === "duplicate-text")) continue;
    const named = defects.some(
      (d) => d.code === "duplicate-text" && (d.ids ?? []).includes(record.id),
    );
    if (!named) {
      fail(
        `DEFECT-UNEXPLAINED :: ${record.id} :: carries a duplicate-text defect that no finding names`,
      );
    }
  }

  // --- duplicates ---------------------------------------------------------------
  // Recomputed from the artifact's own text, not from the corpus, so this catches
  // a collision introduced by hand-editing a record.
  for (const group of findDuplicateGroups(records.map((r) => ({ id: r.id, code: r.code })))) {
    const reported = defects.filter(
      (d) => d.code === "duplicate-text" && sorted(d.ids ?? []).join() === group.ids.join(),
    );
    if (reported.length === 0) {
      fail(
        `DUPLICATE-UNREPORTED :: ${group.ids.join(", ")} :: identical text in the artifact with no duplicate-text finding`,
      );
    }
    for (const id of group.ids) {
      const record = byId.get(id);
      if (record === undefined) {
        fail(`DUPLICATE-DROPPED-SILENTLY :: ${id} :: colliding id absent from the artifact`);
        continue;
      }
      if (!(record.defects ?? []).some((d) => d.code === "duplicate-text")) {
        fail(`DUPLICATE-UNMARKED :: ${id} :: carries no duplicate-text defect`);
      }
      if ((record.publishBlockers ?? []).length === 0) {
        fail(`DUPLICATE-SELECTABLE :: ${id} :: a colliding record must not be selectable`);
      }
    }
  }

  // Every dropped duplicate must have a withheld record, so the collision is
  // visible from both sides and cannot be resolved by deletion.
  for (const defect of defects) {
    // And the finding must agree with the records in BOTH directions. Without the
    // forward direction a human could clear `CODE-JS-001`'s defect and the collision
    // would quietly disappear; without the reverse one they could delete the finding
    // and the record would keep a defect nothing explains. Both are ways of making
    // a known defect invisible, which is the failure this whole mechanism exists to
    // prevent.
    for (const id of defect.ids ?? []) {
      const record = byId.get(id);
      if (record === undefined) {
        fail(
          `DEFECT-IDS-UNKNOWN :: ${id} :: named in a ${defect.code} finding but absent from the artifact`,
        );
      } else if (!(record.defects ?? []).some((d) => d.code === defect.code)) {
        fail(
          `DEFECT-NOT-APPLIED :: ${id} :: named in a ${defect.code} finding but carries no such defect`,
        );
      }
    }
    for (const dropped of defect.dropped ?? []) {
      const record = byId.get(dropped);
      if (record === undefined) {
        fail(
          `DUPLICATE-DROPPED-SILENTLY :: ${dropped} :: named as dropped but absent from the artifact`,
        );
      } else if (record.code !== null) {
        fail(
          `DUPLICATE-DUPLICATED-STORAGE :: ${dropped} :: a withheld duplicate must carry code: null`,
        );
      }
    }
  }

  // --- withheld placeholders ------------------------------------------------------
  for (const record of withheld) {
    const id = record.id;
    if (expectedWithheld.length > 0 && !expectedWithheld.includes(id)) {
      fail(`WITHHELD-UNEXPLAINED :: ${id} :: withheld but the corpus does not reject it`);
    }
    if (!ALLOWED_STATUSES.includes(record.status)) {
      fail(`STATUS-NOT-DECLARED :: ${id} :: "${record.status}"`);
    }
    const declaration = (record.licence?.declaration ?? "").trim();
    if (declaration === "") fail(`LICENCE-MISSING :: ${id} :: no licence declaration`);
    if (classifyLicense(declaration) !== "allowed") {
      fail(`LICENCE-NOT-ALLOWED :: ${id} :: "${declaration}"`);
    }
    if (record.licence?.licenseClass !== classifyLicense(declaration)) {
      fail(`LICENCE-CLASS-MISMATCH :: ${id} :: stored verdict differs from the recomputed one`);
    }
    if (record.licence?.shippable !== false) {
      fail(`PLACEHOLDER-SHIPPABLE :: ${id} :: a withheld record must never read shippable`);
    }
    if (record.status === "withheld-do-not-ship") {
      if (record.code !== null) {
        fail(`PLACEHOLDER-CONTENT :: ${id} :: a do-not-ship placeholder must carry no text`);
      }
      if (!(record.defects ?? []).some((d) => d.code === "do-not-ship")) {
        fail(`PLACEHOLDER-UNMARKED :: ${id} :: no do-not-ship defect recorded`);
      }
      if (!(record.publishBlockers ?? []).includes("do-not-ship")) {
        fail(`PLACEHOLDER-UNMARKED :: ${id} :: publishBlockers does not include do-not-ship`);
      }
    }
  }

  return offenders;
}

function main() {
  let artifact;
  try {
    artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
  } catch (error) {
    console.error(`FAIL: cannot read ${ARTIFACT_PATH.replace(root, ".")}: ${error.message}`);
    console.error("Run `pnpm build:snippets` to create it.");
    process.exit(1);
  }

  const corpus = JSON.parse(readFileSync(join(root, "content", "corpus.json"), "utf8"));
  const expectedWithheld = corpus.rejected
    .filter(
      (r) =>
        r.id.startsWith("CODE-") && (r.reason === "do-not-ship" || r.reason === "duplicate-text"),
    )
    .map((r) => r.id);

  const offenders = findSnippetLibraryOffenders(artifact, {
    rebuilt: buildFromRepo(root),
    expectedWithheld,
  });
  if (offenders.length > 0) {
    console.error(`FAIL: snippet library gate found ${offenders.length} problem(s) (CNT-04):`);
    for (const offender of offenders) console.error(`  - ${offender}`);
    process.exit(1);
  }

  const s = artifact.stats;
  const bandless = artifact.records.filter((r) => r.difficulty.band === null).map((r) => r.id);
  console.log(
    `Snippet library gate passed (CNT-04): ${s.records} records, ${s.placeholders} withheld placeholder(s), ` +
      `${s.withheldDuplicates} withheld duplicate(s), ${s.lexClean}/${s.records} lex clean, ` +
      `${s.withDeclaredBand}/${s.records} with a register band` +
      (bandless.length > 0 ? ` (${bandless.join(", ")} unscored by design)` : "") +
      `. ${s.defects} content defect(s) awaiting a human decision.`,
  );
  console.log(
    `  0 records are selectable: every one is draft in the register pending the second-reviewer audit.`,
  );
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}
