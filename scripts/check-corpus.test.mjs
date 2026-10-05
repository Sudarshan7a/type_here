/**
 * Corpus gate tests (CNT-01).
 *
 * The gate is the thing that runs in CI, so these tests are almost entirely the
 * FAILING direction: each one hands `findCorpusOffenders` a plausible-looking
 * but wrong artifact and asserts it is rejected. A gate suite made only of
 * "the real corpus passes" is how a gate ends up passing forever without ever
 * having been shown it can fail.
 *
 * Fixtures are built by mutating the REAL committed artifact, which is the most
 * honest available fixture: every field is one the gate actually reads.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { findCorpusOffenders } from "./check-corpus.mjs";
import { CONTENT_TYPES, scanSensitive, serialiseCorpus } from "./corpus-pipeline.mjs";
import { buildFromRepo } from "./build-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT = JSON.parse(readFileSync(join(ROOT, "content", "corpus.json"), "utf8"));

/**
 * Deep clone so each test can damage the artifact in isolation. A JSON
 * round-trip, not structuredClone: the artifact is plain JSON on disk, so this
 * also proves the fixtures hold no hidden non-JSON values the gate cannot see.
 */
const fresh = () => JSON.parse(JSON.stringify(ARTIFACT));

const codes = (offenders) => offenders.map((o) => o.split(" :: ")[0]);

const indexOfItem = (artifact, id) => artifact.items.findIndex((i) => i.id === id);

/* ------------------------------------------------------------------ passing */

test("the real committed artifact passes every gate rule", () => {
  assert.deepEqual(findCorpusOffenders(fresh()), []);
});

test("the real committed artifact also passes with a fresh rebuild in hand (no drift)", () => {
  assert.deepEqual(findCorpusOffenders(fresh(), buildFromRepo(ROOT)), []);
});

/* ------------------------------------------------------- G6 vacuity (fail) */

test("a missing artifact fails rather than passing vacuously", () => {
  assert.deepEqual(codes(findCorpusOffenders(null)), ["NO-ARTIFACT"]);
});

test("an empty artifact fails: a gate that passes on zero items proves nothing", () => {
  const empty = { ...fresh(), items: [] };
  assert.deepEqual(codes(findCorpusOffenders(empty)), ["EMPTY-CORPUS"]);
});

test("an artifact that silently dropped a whole family fails", () => {
  const gutted = fresh();
  gutted.items = gutted.items.filter((i) => i.family !== "COMP");
  assert.ok(codes(findCorpusOffenders(gutted)).includes("MISSING-FAMILY"));
});

/* --------------------------------------------------------- G1 drift (fail) */

test("an artifact that no longer matches docs/ fails as drift", () => {
  const tampered = fresh();
  tampered.items[0].text = `${tampered.items[0].text} (hand-edited)`;
  assert.ok(codes(findCorpusOffenders(tampered, buildFromRepo(ROOT))).includes("CORPUS-DRIFT"));
});

test("a rebuild that itself fails is surfaced, not swallowed", () => {
  const brokenRebuild = { ...buildFromRepo(ROOT), failures: ["COPYLEFT-LICENSE :: PROSE-01-001"] };
  assert.ok(codes(findCorpusOffenders(fresh(), brokenRebuild)).includes("REBUILD-FAILURE"));
});

/* -------------------------------------------------------- G2 licence (fail) */

test("an item relabelled with a copyleft licence in the artifact fails", () => {
  const poisoned = fresh();
  poisoned.items[0].license = "GPL-3.0";
  poisoned.items[0].licenseClass = "copyleft";
  assert.ok(codes(findCorpusOffenders(poisoned)).includes("COPYLEFT-LICENSE"));
});

test("an item stripped of its licence fails, and is not read as MIT", () => {
  const stripped = fresh();
  stripped.items[0].license = "";
  assert.ok(codes(findCorpusOffenders(stripped)).includes("MISSING-LICENSE"));
});

test("an unrecognised licence fails closed", () => {
  const unknown = fresh();
  unknown.items[0].license = "Totally-Custom-License";
  unknown.items[0].licenseClass = "unknown";
  assert.ok(codes(findCorpusOffenders(unknown)).includes("UNKNOWN-LICENSE"));
});

test("an item whose recorded licenceClass contradicts the classifier fails", () => {
  // The artifact asserts it is fine; the gate re-derives and disagrees.
  const lying = fresh();
  lying.items[0].licenseClass = "allowed";
  lying.items[0].license = "AGPL-3.0-only";
  assert.ok(codes(findCorpusOffenders(lying)).includes("COPYLEFT-LICENSE"));
});

/* ------------------------------------------------------ G3 dedupe (fail) */

test("two emitted items with identical text fail even if the artifact denies it", () => {
  const duplicated = fresh();
  const victim = duplicated.items[indexOfItem(duplicated, "PROSE-01-002")];
  const clone = { ...duplicated.items[indexOfItem(duplicated, "PROSE-01-001")] };
  clone.id = "PROSE-01-002";
  clone.text = duplicated.items[indexOfItem(duplicated, "PROSE-01-001")].text;
  victim.text = clone.text;
  duplicated.duplicates = [];
  assert.ok(codes(findCorpusOffenders(duplicated)).includes("DUPLICATE-TEXT"));
});

test("case-and-whitespace variants of the same text are still a duplicate", () => {
  const duplicated = fresh();
  const a = duplicated.items[indexOfItem(duplicated, "PROSE-01-001")];
  const b = duplicated.items[indexOfItem(duplicated, "PROSE-01-002")];
  b.text = `  ${a.text.toUpperCase().replace(/ /g, "  ")}  `;
  assert.ok(codes(findCorpusOffenders(duplicated)).includes("DUPLICATE-TEXT"));
});

test("a rejection recorded as a duplicate but absent from duplicates[] fails", () => {
  const inconsistent = fresh();
  inconsistent.duplicates = inconsistent.duplicates.filter(
    (g) => !g.dropped.includes("QUOTE-PD-009"),
  );
  assert.ok(codes(findCorpusOffenders(inconsistent)).includes("UNRECORDED-DROP"));
});

test("an id listed as dropped but still present in items[] fails", () => {
  const impossible = fresh();
  // Clone an existing item and rename it to an id the artifact claims it dropped.
  const resurrected = JSON.parse(
    JSON.stringify(impossible.items[indexOfItem(impossible, "PROSE-01-001")]),
  );
  resurrected.id = "QUOTE-PD-009";
  resurrected.provenance = { file: "docs/content-quotes-verified-public-domain.md", line: 29 };
  impossible.items.push(resurrected);
  assert.ok(codes(findCorpusOffenders(impossible)).includes("DROPPED-BUT-EMITTED"));
});

test("a duplicate record whose key is not the kept item's text fails", () => {
  const forged = fresh();
  forged.duplicates[0].key = "0".repeat(64);
  assert.ok(codes(findCorpusOffenders(forged)).includes("DUPLICATE-KEY-MISMATCH"));
});

/* ----------------------------------------------------- G4 sensitive (fail) */

test("an item carrying a real email in the artifact fails the sensitive rule", () => {
  const leaked = fresh();
  leaked.items[0].text = "Mail sam.smith@gmail.com about the outage.";
  assert.ok(codes(findCorpusOffenders(leaked)).includes("SENSITIVE-EMAIL"));
});

test("an item carrying a synthetic-looking secret in the artifact fails", () => {
  const leaked = fresh();
  const target = leaked.items.findIndex((i) => i.id !== "PROSE-01-013");
  leaked.items[target].text = "token: ghp_0123456789abcdefghijklmnopqrstuvwx";
  const offenders = codes(findCorpusOffenders(leaked, buildFromRepo(ROOT)));
  assert.ok(offenders.includes("SENSITIVE-PROVIDER-API-KEY"));
  assert.ok(offenders.includes("CORPUS-DRIFT"), "and it no longer matches docs/ either");
});

test("a private key pasted into an item fails", () => {
  const leaked = fresh();
  leaked.items[5].text = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n";
  assert.ok(codes(findCorpusOffenders(leaked)).includes("SENSITIVE-PRIVATE-KEY-PEM"));
});

test("the pipeline's own allowlist exception is what keeps the real corpus green", () => {
  // If PROSE-01-013's text were replaced by an identical-looking string on a
  // DIFFERENT id, the allowlist must not carry over.
  const moved = fresh();
  const source = moved.items[indexOfItem(moved, "PROSE-01-013")];
  const stolenText = source.text;
  source.text = "A perfectly ordinary sentence about the weather today.";
  moved.items[indexOfItem(moved, "PROSE-01-002")].text = stolenText;
  assert.ok(
    codes(findCorpusOffenders(moved)).includes("SENSITIVE-QUOTED-CREDENTIAL-LITERAL"),
    "an exception must be pinned to the reviewed item, not to the shape",
  );
});

/* ---------------------------------------------------------- G5 tags (fail) */

test("a contentType outside the declared enum fails", () => {
  const bogus = fresh();
  bogus.items[0].contentType = "prose.feelings";
  assert.ok(codes(findCorpusOffenders(bogus)).includes("UNKNOWN-CONTENT-TYPE"));
});

test("the declared tag enum covers exactly the values the corpus uses", () => {
  // Guards the enum in both directions: every used value is declared, and every
  // declared value is used. A tag added to CONTENT_TYPES and never applied is
  // either a typo or a placeholder nobody removed.
  const used = new Set(fresh().items.map((i) => i.contentType));
  for (const type of used) assert.ok(CONTENT_TYPES.includes(type), `${type} is undeclared`);
  for (const type of CONTENT_TYPES) assert.ok(used.has(type), `${type} is declared but unused`);
  assert.equal(used.size, 22, "guard the guard: the taxonomy changed, re-check the count");
});

test("an item with no provenance line fails", () => {
  const orphan = fresh();
  orphan.items[0].provenance = { file: "docs/content-prose-batch-01.md", line: 0 };
  assert.ok(codes(findCorpusOffenders(orphan)).includes("NO-PROVENANCE"));
});

test("an item with no registerRef fails", () => {
  const orphan = fresh();
  orphan.items[0].registerRef = "";
  assert.ok(codes(findCorpusOffenders(orphan)).includes("NO-REGISTER-REF"));
});

test("an item whose tagSource is blank fails: declared and derived must be distinguishable", () => {
  const murky = fresh();
  murky.items[0].tagSource = "";
  assert.ok(codes(findCorpusOffenders(murky)).includes("NO-TAG-SOURCE"));
});

/* --------------------------------------------------------- ordering (fail) */

test("an artifact whose items are out of order fails", () => {
  const shuffled = fresh();
  shuffled.items = [...shuffled.items].reverse();
  assert.ok(codes(findCorpusOffenders(shuffled)).includes("UNSORTED"));
});

/* ------------------------------------------------------------- hygiene */

test("a duplicated id inside the artifact fails", () => {
  const repeated = fresh();
  repeated.items.splice(1, 0, JSON.parse(JSON.stringify(repeated.items[0])));
  const offenders = codes(findCorpusOffenders(repeated));
  assert.ok(offenders.includes("DUPLICATE-ID"));
});

test("serialiseCorpus is what both the build and the gate compare, so drift is exact", () => {
  // Proves the gate is comparing the same bytes the builder writes, rather than
  // a second formatting path that could drift from the committed artifact.
  assert.equal(
    serialiseCorpus(buildFromRepo(ROOT)),
    readFileSync(join(ROOT, "content", "corpus.json"), "utf8"),
  );
});

test("scanSensitive is the single source of truth for the artifact's own text", () => {
  // If the artifact ever held text the scanner cannot see, that is a hole: the
  // gate's G4 rule would be unreachable for it.
  for (const item of ARTIFACT.items) {
    assert.equal(typeof item.text, "string");
    assert.ok(item.text.length > 0);
    for (const finding of scanSensitive(item.text, { id: item.id })) {
      assert.ok(finding.allowlisted, `${item.id} has an un-allowlisted ${finding.rule}`);
    }
  }
});
