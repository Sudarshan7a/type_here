import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  classifyLicense,
  collectCorpusInputs,
  discoverItemIds,
  expandIdRange,
  extractFileLicenses,
  findContentLicenseOffenders,
  isPinnedByNeverLoad,
  isShippableStatus,
  needsLicenseText,
} from "./check-content-licenses.mjs";

// CNT-07 gate: prove every failing direction on fixture markdown, without
// touching the real corpus, plus one integration test that the real corpus
// passes. Fixture shapes mirror the register tables and corpus files.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Build a full-column register table. */
function register(rows) {
  const header = "| item_id range | type | source | license | license_text_saved | status |";
  const sep = "|---|---|---|---|---|---|";
  const body = rows
    .map(
      (r) =>
        `| ${r.id} | ${r.type ?? "content"} | ${r.source ?? "original"} | ${r.license} | ${r.saved ?? "n/a"} | ${r.status ?? "draft"} |`,
    )
    .join("\n");
  return [header, sep, body].join("\n");
}

/** Build a corpus file body: optional file-level license + backticked items. */
function corpus(items, { license = "original work — ours" } = {}) {
  const lic = license === null ? "" : `License: \`${license}\`\n`;
  return `${lic}${items.map((i) => `\`${i}\``).join("\n")}\n`;
}

function run({
  registerRows = [],
  corpusTexts = [],
  neverLoadText = "",
  fileExists = () => false,
}) {
  return findContentLicenseOffenders({
    registerTexts: registerRows.length
      ? [{ name: "docs/content-license-register.md", text: register(registerRows) }]
      : [],
    corpusTexts,
    neverLoadText,
    fileExists,
  });
}

test("clean fixture: covered item with a file-level licence passes", () => {
  const offenders = run({
    registerRows: [{ id: "PROSE-01-001", license: "original work — ours" }],
    corpusTexts: [{ name: "docs/content-prose.md", text: corpus(["PROSE-01-001"]) }],
  });
  assert.deepEqual(offenders, []);
});

test("per-file register table covers items without a central register row", () => {
  const text = [
    "License: `original work — ours`",
    "",
    "| item_id range | type | license | status |",
    "|---|---|---|---|",
    "| CODE-JS-002 to CODE-JS-003 | code | original work — ours | draft |",
    "",
    "`CODE-JS-002`",
    "`CODE-JS-003`",
  ].join("\n");
  const offenders = findContentLicenseOffenders({
    corpusTexts: [{ name: "docs/content-code.md", text }],
  });
  assert.deepEqual(offenders, []);
});

test("item with no register entry is flagged", () => {
  const offenders = run({
    registerRows: [{ id: "PROSE-01-001", license: "original work — ours" }],
    corpusTexts: [
      { name: "docs/content-prose.md", text: corpus(["PROSE-01-001", "PROSE-99-001"]) },
    ],
  });
  assert.ok(offenders.some((o) => o.startsWith("NO-REGISTER-ENTRY") && o.includes("PROSE-99-001")));
});

test("corpus file with items but no licence declaration is flagged", () => {
  const offenders = run({
    registerRows: [{ id: "PROSE-01-001", license: "original work — ours" }],
    corpusTexts: [
      { name: "docs/content-prose.md", text: corpus(["PROSE-01-001"], { license: null }) },
    ],
  });
  assert.ok(offenders.some((o) => o.startsWith("NO-FILE-LICENSE")));
});

test("copyleft licences are flagged, including MIT OR GPL duals", () => {
  for (const license of ["GPL-3.0", "AGPL-3.0-only", "LGPL-2.1", "MIT OR GPL-2.0"]) {
    const offenders = run({
      registerRows: [{ id: "CODE-01-001", license }],
      corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-01-001"]) }],
    });
    assert.ok(
      offenders.some((o) => o.startsWith("COPYLEFT-LICENSE")),
      `expected copyleft for ${license}`,
    );
  }
});

test("unknown licence fails closed", () => {
  const offenders = run({
    registerRows: [{ id: "CODE-01-001", license: "Totally-Custom-License" }],
    corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-01-001"]) }],
  });
  assert.ok(offenders.some((o) => o.startsWith("UNKNOWN-LICENSE")));
});

test("Monkeytype/Keybr lineage in the source is flagged even under an allowed licence", () => {
  for (const source of ["Monkeytype word list", "derived from keybr"]) {
    const offenders = run({
      registerRows: [{ id: "WORDLIST-01", license: "original work — ours", source }],
      corpusTexts: [{ name: "docs/content-word.md", text: corpus(["WORDLIST-01"]) }],
    });
    assert.ok(
      offenders.some((o) => o.startsWith("BANNED-LINEAGE-SOURCE")),
      `expected lineage ban for ${source}`,
    );
  }
});

test("a poisoned Monkeytype/GPL word-list fixture is caught", () => {
  const offenders = run({
    registerRows: [{ id: "WORDLIST-MT-01", source: "Monkeytype top-1000", license: "GPL-3.0" }],
    corpusTexts: [{ name: "docs/content-word.md", text: corpus(["WORDLIST-MT-01"]) }],
  });
  assert.ok(offenders.some((o) => o.startsWith("COPYLEFT-LICENSE")));
});

test("DO-NOT-SHIP item that is not pinned by the never-load list is flagged", () => {
  const offenders = run({
    registerRows: [
      {
        id: "CODE-JS-P99",
        license: "MIT",
        saved: "no",
        status: "draft — DO NOT SHIP",
        source: "lodash",
      },
    ],
    corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-JS-P99"]) }],
  });
  assert.ok(
    offenders.some((o) => o.startsWith("DO-NOT-SHIP-UNPINNED") && o.includes("CODE-JS-P99")),
  );
});

test("DO-NOT-SHIP item marked shippable elsewhere is flagged", () => {
  const offenders = run({
    registerRows: [
      {
        id: "CODE-JS-P99",
        license: "MIT",
        saved: "yes — `LICENSES/mit.txt`",
        status: "DO NOT SHIP",
        source: "lodash",
      },
      {
        id: "CODE-JS-P99",
        license: "MIT",
        saved: "yes — `LICENSES/mit.txt`",
        status: "reviewed — ships",
        source: "lodash",
      },
    ],
    corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-JS-P99"]) }],
    neverLoadText: "`CODE-JS-P99`",
    fileExists: () => true,
  });
  assert.ok(offenders.some((o) => o.startsWith("DO-NOT-SHIP-MARKED-SHIPPABLE")));
});

test("shippable third-party licence needs saved text, and the saved path must exist", () => {
  const missing = run({
    registerRows: [{ id: "CODE-01-001", license: "MIT", saved: "no", status: "reviewed" }],
    corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-01-001"]) }],
  });
  assert.ok(missing.some((o) => o.startsWith("LICENSE-TEXT-MISSING")));

  const badPath = run({
    registerRows: [
      { id: "CODE-01-001", license: "MIT", saved: "yes — `LICENSES/mit.txt`", status: "reviewed" },
    ],
    corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-01-001"]) }],
    fileExists: () => false,
  });
  assert.ok(badPath.some((o) => o.startsWith("LICENSE-FILE-MISSING")));

  const ok = run({
    registerRows: [
      { id: "CODE-01-001", license: "MIT", saved: "yes — `LICENSES/mit.txt`", status: "reviewed" },
    ],
    corpusTexts: [{ name: "docs/content-code.md", text: corpus(["CODE-01-001"]) }],
    fileExists: (p) => p === "LICENSES/mit.txt",
  });
  assert.deepEqual(ok, []);
});

test("vacuity guard: zero items or zero rows fails the gate", () => {
  const noItems = run({
    registerRows: [{ id: "PROSE-01-001", license: "original work — ours" }],
    corpusTexts: [{ name: "docs/content-empty.md", text: corpus([]) }],
  });
  assert.ok(noItems.some((o) => o.startsWith("NO-CORPUS-ITEMS-DISCOVERED")));

  const noRows = findContentLicenseOffenders({
    corpusTexts: [{ name: "docs/content-prose.md", text: corpus(["PROSE-01-001"]) }],
  });
  assert.ok(noRows.some((o) => o.startsWith("NO-REGISTER-ROWS")));
});

test("classifyLicense: allowlist, copyleft precedence, unknown, missing", () => {
  assert.equal(classifyLicense("original work — ours"), "allowed");
  assert.equal(classifyLicense("public domain (verified)"), "allowed");
  assert.equal(classifyLicense("MIT"), "allowed");
  assert.equal(classifyLicense("SIL OFL 1.1"), "allowed");
  assert.equal(classifyLicense("MIT OR GPL-2.0"), "copyleft");
  assert.equal(classifyLicense("GPL-3.0"), "copyleft");
  assert.equal(classifyLicense("Weird"), "unknown");
  assert.equal(classifyLicense(""), "missing");
});

test("needsLicenseText: public-domain/original false even when a note mentions CC0 (regression)", () => {
  assert.equal(needsLicenseText("public domain (verified, CC0 dedication)"), false);
  assert.equal(needsLicenseText("original work — ours"), false);
  assert.equal(needsLicenseText("MIT"), true);
  assert.equal(needsLicenseText("Apache-2.0"), true);
  assert.equal(needsLicenseText("SIL OFL 1.1"), true);
});

test("isShippableStatus: draft/pending/DO-NOT-SHIP qualifiers are not shippable", () => {
  assert.equal(isShippableStatus("reviewed — ships"), true);
  assert.equal(isShippableStatus("live"), true);
  assert.equal(isShippableStatus("draft — pending live verification"), false);
  assert.equal(isShippableStatus("draft — DO NOT SHIP"), false);
  assert.equal(isShippableStatus("blocked"), false);
});

test("expandIdRange: full, abbreviated and inverted ranges", () => {
  assert.deepEqual(expandIdRange("PROSE-01-001 to PROSE-01-003"), [
    "PROSE-01-001",
    "PROSE-01-002",
    "PROSE-01-003",
  ]);
  assert.deepEqual(expandIdRange("COMP-REPLY-001 to 003"), [
    "COMP-REPLY-001",
    "COMP-REPLY-002",
    "COMP-REPLY-003",
  ]);
  // Inverted range falls back to the literal endpoints, never a silent sweep.
  assert.deepEqual(expandIdRange("PROSE-01-009 to PROSE-01-001"), ["PROSE-01-009", "PROSE-01-001"]);
});

test("discoverItemIds: only backticked licensable-family IDs, deduped", () => {
  const ids = discoverItemIds(
    "`PROSE-01-001` and `PROSE-01-001` and `QUOTE-PD-001` but not PROSE-01-002",
  );
  assert.deepEqual(ids, ["PROSE-01-001", "QUOTE-PD-001"]);
});

test("extractFileLicenses: bold markdown `**License:**` and pipe rows", () => {
  assert.deepEqual(extractFileLicenses("**License:** `public domain (verified)` — source"), [
    "public domain (verified)",
  ]);
  assert.deepEqual(extractFileLicenses("| license | MIT |"), ["MIT"]);
});

test("isPinnedByNeverLoad: exact and x-wildcard tokens", () => {
  assert.equal(isPinnedByNeverLoad("never load `CODE-JS-P01`", "CODE-JS-P01"), true);
  assert.equal(isPinnedByNeverLoad("never load `CODE-JS-P0x`", "CODE-JS-P03"), true);
  assert.equal(isPinnedByNeverLoad("never load `CODE-JS-P0x`", "CODE-JS-P99"), false);
});

test("integration: the real corpus passes the gate", () => {
  const { registerTexts, corpusTexts, neverLoadText } = collectCorpusInputs(ROOT);
  const offenders = findContentLicenseOffenders({
    registerTexts,
    corpusTexts,
    neverLoadText,
    fileExists: () => true,
  });
  assert.deepEqual(offenders, [], `real corpus offenders:\n${offenders.join("\n")}`);
});
