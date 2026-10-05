/**
 * Corpus pipeline tests (CNT-01).
 *
 * Most of these assert the FAILING direction, because a corpus gate that has
 * only ever been exercised on clean fixtures proves nothing. Each fixture below
 * is a minimal corpus + register pair shaped exactly like the real files, so a
 * rule that works here works on the real corpus and vice versa.
 *
 * The pure core takes markdown strings, so nothing here touches the filesystem
 * except the final integration tests, which read the real corpus.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CONTENT_TYPES,
  buildCorpus,
  compareIds,
  compareItems,
  countWords,
  extractItems,
  findDuplicateGroups,
  findStaleAllowlistEntries,
  normaliseForDedupe,
  parseContentTypeTags,
  scanSensitive,
  serialiseCorpus,
} from "./corpus-pipeline.mjs";
import { buildFromRepo } from "./build-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ fixtures */

/** A register table row, in the register's real column order. */
function registerTable(rows) {
  const header =
    "| item_id range | type | content_type_tag | source | license | license_text_saved | status |";
  const sep = "|---|---|---|---|---|---|---|";
  const body = rows
    .map(
      (r) =>
        `| ${r.id} | ${r.type ?? "prose"} | ${r.tag ?? "everyday/personal"} | ${r.source ?? "original"} | ${
          r.license ?? "original work — ours"
        } | ${r.saved ?? "n/a"} | ${r.status ?? "draft"} |`,
    )
    .join("\n");
  return [header, sep, body].join("\n");
}

/** A prose corpus file: licence line, then `id · Band · N words` + passage. */
function proseFile(items) {
  const body = items
    .map((it) => `\`${it.id}\` · ${it.band ?? "Easy"} · ${it.words ?? 5} words\n${it.text}`)
    .join("\n\n");
  return `License: \`original work — ours\`\n\n${body}\n`;
}

/**
 * Build from fixtures. `register` defaults to rows covering every prose id, so
 * a test only has to state the register rows it actually cares about.
 */
function run({ register = null, corpus = null } = {}) {
  const corpusText =
    corpus ?? proseFile([{ id: "PROSE-01-001", text: "One two three four five." }]);
  const ids = [...corpusText.matchAll(/`(PROSE-[A-Z0-9-]+)`/g)].map((m) => m[1]);
  const registerText =
    register ?? registerTable([...new Set(ids)].map((id) => ({ id, tag: "everyday/personal" })));
  return buildCorpus({
    registerTexts: [{ name: "docs/content-license-register.md", text: registerText }],
    corpusTexts: [{ name: "docs/content-prose-batch-01.md", text: corpusText }],
  });
}

const codes = (build) => build.failures.map((f) => f.split(" :: ")[0]);

/* ------------------------------------------- stage 1: licence per item (fail) */

test("clean fixture: one licensed item builds and emits it", () => {
  const build = run();
  assert.deepEqual(build.failures, []);
  assert.equal(build.items.length, 1);
  assert.equal(build.items[0].id, "PROSE-01-001");
  assert.equal(build.items[0].licenseClass, "allowed");
  assert.equal(build.items[0].registerRef, "docs/content-license-register.md");
  assert.deepEqual(build.items[0].provenance, { file: "docs/content-prose-batch-01.md", line: 3 });
});

test("a copyleft licence fails the build rather than being emitted", () => {
  for (const license of ["GPL-3.0", "AGPL-3.0-only", "LGPL-2.1", "MIT OR GPL-2.0", "SSPL-1.0"]) {
    const build = run({
      register: registerTable([{ id: "PROSE-01-001", license }]),
    });
    assert.ok(
      codes(build).includes("COPYLEFT-LICENSE"),
      `expected copyleft failure for ${license}`,
    );
    assert.equal(build.items.length, 0, `${license} must emit nothing`);
  }
});

test("a missing licence fails the build; it is never defaulted", () => {
  const build = run({ register: registerTable([{ id: "PROSE-01-001", license: "" }]) });
  assert.ok(codes(build).includes("MISSING-LICENSE"));
  assert.equal(build.items.length, 0);
  for (const item of build.items) assert.notEqual(item.license, "MIT");
});

test("an unrecognised licence fails closed", () => {
  const build = run({
    register: registerTable([{ id: "PROSE-01-001", license: "Totally-Custom-License" }]),
  });
  assert.ok(codes(build).includes("UNKNOWN-LICENSE"));
  assert.equal(build.items.length, 0);
});

test("an item with no register row at all fails the build", () => {
  const build = run({
    register: registerTable([{ id: "PROSE-01-001" }]),
    corpus: proseFile([
      { id: "PROSE-01-001", text: "Covered by the register." },
      { id: "PROSE-01-002", text: "Nobody vouched for me at all." },
    ]),
  });
  assert.ok(codes(build).includes("NO-REGISTER-ROW"));
  assert.ok(build.failures.some((f) => f.includes("PROSE-01-002")));
  assert.deepEqual(
    build.items.map((i) => i.id),
    ["PROSE-01-001"],
  );
});

test("an id present in the corpus but never extracted fails the build", () => {
  // A new shape the parser does not know must be a red build, not silent loss.
  const corpus = `License: \`original work — ours\`\n\n\`PROSE-01-001\` :: Easy :: 4 words\nA shape nobody parses.\n`;
  const build = run({
    register: registerTable([{ id: "PROSE-01-001" }]),
    corpus,
  });
  assert.ok(codes(build).includes("UNACCOUNTED-ITEM"));
  assert.ok(build.failures.some((f) => f.includes("PROSE-01-001")));
});

test("an item whose register row is DO NOT SHIP is rejected with a stated reason", () => {
  const build = run({
    register: registerTable([{ id: "PROSE-01-001", status: "draft — DO NOT SHIP" }]),
  });
  assert.deepEqual(build.failures, [], "a deliberate withholding is not a build failure");
  assert.equal(build.items.length, 0);
  assert.deepEqual(
    build.rejected.map((r) => [r.id, r.reason]),
    [["PROSE-01-001", "do-not-ship"]],
  );
});

/* -------------------------------------------------- stage 2: dedupe (fail) */

test("duplicate text is detected and dropped, keeping the lowest id", () => {
  const build = run({
    corpus: proseFile([
      { id: "PROSE-01-001", text: "The same sentence twice over." },
      { id: "PROSE-01-002", text: "The  same\tsentence   twice over." },
    ]),
  });
  assert.equal(build.duplicates.length, 1);
  assert.equal(build.duplicates[0].kept, "PROSE-01-001");
  assert.deepEqual(build.duplicates[0].dropped, ["PROSE-01-002"]);
  assert.deepEqual(
    build.items.map((i) => i.id),
    ["PROSE-01-001"],
  );
  assert.equal(build.rejected.find((r) => r.id === "PROSE-01-002").reason, "duplicate-text");
});

test("dedupe normalises case and whitespace but NOT punctuation", () => {
  assert.equal(normaliseForDedupe("  A   B\tC\n"), "a b c");
  assert.equal(normaliseForDedupe("Practice makes perfect."), "practice makes perfect.");
  assert.notEqual(
    normaliseForDedupe("Practice makes perfect."),
    normaliseForDedupe("Practice makes perfect"),
    "sentence-final punctuation is a real typing difference",
  );
  assert.equal(
    normaliseForDedupe("ＭＯＮＥＹ"), // full-width
    "money",
    "NFKC folds full-width forms",
  );
});

test("distinct prose is not treated as duplicate", () => {
  const build = run({
    corpus: proseFile([
      { id: "PROSE-01-001", text: "One sentence entirely." },
      { id: "PROSE-01-002", text: "Another sentence completely." },
    ]),
  });
  assert.deepEqual(build.duplicates, []);
  assert.equal(build.items.length, 2);
});

test("findDuplicateGroups is independent of build ordering", () => {
  const items = [
    { id: "PROSE-01-002", text: "Same text here.", family: "PROSE" },
    { id: "PROSE-01-001", text: "same TEXT here.", family: "PROSE" },
  ];
  const groups = findDuplicateGroups(items);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kept, "PROSE-01-001", "lowest id wins regardless of input order");
});

/* --------------------------------------------- stage 3: sensitive filter (fail) */

test("a real-looking email address is caught", () => {
  const findings = scanSensitive("Write to sam.smith@gmail.com about it.", { id: "PROSE-01-001" });
  assert.deepEqual(
    findings.filter((f) => f.rule === "email"),
    [{ rule: "email", match: "sam.smith@gmail.com", allowlisted: false, reason: null }],
  );
});

test("a synthetic-looking secret is caught, and each provider shape is detected", () => {
  const secrets = [
    "aws AKIAIOSFODNN7EXAMPLE key",
    "token ghp_0123456789abcdefghijklmnopqrstuvwx",
    "slack xoxb-123456789012-abcdefghijkl",
    "openai sk-abcdefghijklmnopqrstuvwxyz012345",
    "google AIzaSyA0123456789abcdefghijklmnopqrstuv",
  ];
  for (const secret of secrets) {
    const findings = scanSensitive(secret, { id: "CODE-JS-001" });
    assert.ok(
      findings.some((f) => f.rule === "provider-api-key" && !f.allowlisted),
      `expected a provider-key finding for: ${secret}`,
    );
  }
  assert.ok(scanSensitive("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijkl", {}).length > 0);
  assert.ok(scanSensitive("-----BEGIN RSA PRIVATE KEY-----", {}).length > 0);
  assert.ok(scanSensitive("Authorization: Bearer abcdefghij0123456789", {}).length > 0);
  assert.ok(scanSensitive('password = "hunter2000"', {}).length > 0);
});

test("an Luhn-valid card and a mod-97-valid IBAN are caught; wrong checksums are not", () => {
  assert.ok(
    scanSensitive("Card 4111 1111 1111 1111 on file.", {}).some((f) => f.rule === "card-number"),
  );
  assert.equal(
    scanSensitive("Card 4111 1111 1111 1112 on file.", {}).filter((f) => f.rule === "card-number")
      .length,
    0,
    "a bad checksum is not a card",
  );
  assert.ok(scanSensitive("IBAN GB82 WEST 1234 5698 7654 32", {}).some((f) => f.rule === "iban"));
  assert.equal(
    scanSensitive("IBAN GB82 WEST 1234 5698 7654 33", {}).filter((f) => f.rule === "iban").length,
    0,
  );
});

test("documentation addresses and private IPs are not flagged as real endpoints", () => {
  // 6.1 asks for prose with realistic addresses; RFC 2606 / RFC 1918 space is
  // documentation material, so flagging it would gut the corpus.
  assert.equal(scanSensitive("mail ops@company.example now", {}).length, 0);
  assert.equal(scanSensitive("the router is at 192.168.1.1", {}).length, 0);
  assert.equal(scanSensitive("see https://example.com/docs", {}).length, 0);
  assert.ok(scanSensitive("reach 8.8.8.8 directly", {}).some((f) => f.rule === "ipv4"));
});

test("a sensitive finding fails the build and emits nothing", () => {
  const build = run({
    corpus: proseFile([
      { id: "PROSE-01-001", text: "Ping ops@realcompany.co.uk about the outage." },
    ]),
  });
  assert.ok(codes(build).includes("SENSITIVE-EMAIL"));
  assert.equal(build.items.length, 0);
});

test("the allowlist suppresses one rule for one item and nothing else", () => {
  const findings = scanSensitive('The wifi password is "Bl4nk3t_47xz" on the note.', {
    id: "PROSE-01-013",
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].allowlisted, true);
  assert.match(findings[0].reason, /wifi password/);

  // The same text on a different id is NOT allowlisted: an exception must be
  // pinned to the item a human reviewed, not to the shape.
  assert.equal(
    scanSensitive('The wifi password is "Bl4nk3t_47xz".', { id: "PROSE-09-999" })[0].allowlisted,
    false,
  );
  // And an allowlisted rule must not silence a different rule on the same item.
  const other = scanSensitive('Mail ops@realcompany.co.uk, password "Bl4nk3t_47xz"', {
    id: "PROSE-01-013",
  });
  assert.ok(other.some((f) => f.rule === "email" && !f.allowlisted));
});

test("a stale allowlist entry is reported so exceptions cannot rot", () => {
  const stale = findStaleAllowlistEntries([{ id: "PROSE-09-999", text: "nothing to see" }]);
  assert.equal(stale.length, 1);
  assert.match(stale[0], /PROSE-01-013/);
});

/* -------------------------------------------------------- stage 4: tags (fail) */

test("an unmapped register content_type_tag fails the build", () => {
  const build = run({ register: registerTable([{ id: "PROSE-01-001", tag: "vibes/immaculate" }]) });
  assert.ok(codes(build).includes("UNMAPPED-CONTENT-TYPE-TAG"));
  assert.equal(build.items.length, 0);
});

test("an item with no register tag and no declared default fails the build", () => {
  // An unknown file name has no per-file default, and this register row carries
  // no content_type_tag, so nothing can supply one.
  const build = buildCorpus({
    registerTexts: [
      {
        name: "docs/content-license-register.md",
        text: registerTable([{ id: "PROSE-01-001", tag: "" }]),
      },
    ],
    corpusTexts: [
      {
        name: "docs/content-brand-new-batch.md",
        text: proseFile([{ id: "PROSE-01-001", text: "Some new passage here." }]),
      },
    ],
  });
  assert.ok(codes(build).includes("NO-CONTENT-TYPE"));
  assert.equal(build.items.length, 0);
});

test("every emitted contentType is in the declared enum, and no enum value is dead", () => {
  const build = buildFromRepo(ROOT);
  assert.deepEqual(build.failures, []);
  const used = new Set(build.items.map((i) => i.contentType));
  for (const item of build.items) assert.ok(CONTENT_TYPES.includes(item.contentType));
  for (const type of CONTENT_TYPES) {
    assert.ok(used.has(type), `${type} is declared but nothing uses it`);
  }
});

test("tagSource distinguishes a declared tag from a derived one", () => {
  const declared = run();
  assert.equal(declared.items[0].tagSource, "register");

  // Drop the content_type_tag column entirely: the id prefix must still resolve,
  // and the artifact must say where the answer came from.
  const header = "| item_id range | type | license | status |";
  const derived = buildCorpus({
    registerTexts: [
      {
        name: "docs/content-license-register.md",
        text: [
          header,
          "|---|---|---|---|",
          "| COMP-REPLY-001 | composition-prompt | original work — ours | draft |",
        ].join("\n"),
      },
    ],
    corpusTexts: [
      {
        name: "docs/content-composition-draft-sprint-prompts.md",
        text: "License: `original work — ours`\n\n`COMP-REPLY-001` — A coworker asks for a favour.\n",
      },
    ],
  });
  assert.deepEqual(derived.failures, []);
  assert.equal(derived.items[0].contentType, "composition.reply");
  assert.equal(derived.items[0].tagSource, "id-prefix");
});

test("parseContentTypeTags reads the same id ranges the licence parser does", () => {
  const rows = parseContentTypeTags(
    registerTable([
      { id: "PROSE-01-001 to PROSE-01-003", tag: "everyday/personal" },
      { id: "PROSE-02-001", tag: "workplace/professional" },
    ]),
    "docs/content-license-register.md",
  );
  assert.deepEqual(rows[0].ids, ["PROSE-01-001", "PROSE-01-002", "PROSE-01-003"]);
  assert.equal(rows[0].contentTypeTag, "everyday/personal");
  assert.deepEqual(rows[1].ids, ["PROSE-02-001"]);
});

/* ---------------------------------------------------------------- invariants */

test("compareIds orders numerically, not lexically", () => {
  assert.ok(compareIds("PROSE-01-002", "PROSE-01-010") < 0);
  assert.ok(compareIds("PROSE-02-001", "PROSE-01-060") > 0);
  assert.equal(compareIds("PROSE-01-001", "PROSE-01-001"), 0);
});

test("compareItems sorts by family rank then id", () => {
  const sorted = [
    { id: "QUOTE-ORIG-001", family: "QUOTE" },
    { id: "COMP-REPLY-001", family: "COMP" },
    { id: "PROSE-01-002", family: "PROSE" },
    { id: "PROSE-01-001", family: "PROSE" },
  ]
    .sort(compareItems)
    .map((i) => i.id);
  assert.deepEqual(sorted, ["PROSE-01-001", "PROSE-01-002", "QUOTE-ORIG-001", "COMP-REPLY-001"]);
});

test("countWords counts whitespace-separated tokens", () => {
  assert.equal(countWords("  one   two\nthree "), 3);
  assert.equal(countWords(""), 0);
});

test("the same input serialises to byte-identical output twice", () => {
  const a = serialiseCorpus(run());
  const b = serialiseCorpus(run());
  assert.equal(a, b);
  assert.ok(
    !a.includes("generatedAt"),
    "no timestamp: an unchanged corpus must not produce a diff",
  );
});

test("a duplicate id across two files fails rather than silently winning", () => {
  const registerText = registerTable([{ id: "PROSE-01-001" }]);
  const build = buildCorpus({
    registerTexts: [{ name: "docs/content-license-register.md", text: registerText }],
    corpusTexts: [
      {
        name: "docs/content-prose-batch-01.md",
        text: proseFile([{ id: "PROSE-01-001", text: "First copy here." }]),
      },
      {
        name: "docs/content-prose-batch-02.md",
        text: proseFile([{ id: "PROSE-01-001", text: "Second copy here." }]),
      },
    ],
  });
  assert.ok(codes(build).includes("DUPLICATE-ID"));
  const duplicateFailure = build.failures.find((f) => f.startsWith("DUPLICATE-ID"));
  assert.match(duplicateFailure, /content-prose-batch-01\.md/);
  assert.match(duplicateFailure, /content-prose-batch-02\.md/);
  assert.deepEqual(
    build.items.map((i) => i.id),
    ["PROSE-01-001"],
    "the first declaration is emitted, but the build is red so nothing ships",
  );
});

/* ---------------------------------------------------------- extraction shapes */

test("extractItems covers each real corpus shape", () => {
  const prose = extractItems(
    "docs/content-prose-batch-01.md",
    proseFile([{ id: "PROSE-01-001", band: "Hard", words: 3, text: "One two three." }]),
  );
  assert.equal(prose.items[0].difficulty, "hard");
  assert.equal(prose.items[0].text, "One two three.");
  assert.equal(prose.items[0].declaredWords, 3);

  const quote = extractItems(
    "docs/content-quotes-original.md",
    "`QUOTE-ORIG-001` · 8 words — Slow down enough to speed up later.\n",
  );
  assert.equal(quote.items[0].text, "Slow down enough to speed up later.");

  // Batch 1 writes "Source: ..." and the proverb lines write the attribution
  // bare. Both shapes must parse or 16 quotes go missing.
  const pdLabelled = extractItems(
    "docs/content-quotes-verified-public-domain.md",
    "`QUOTE-PD-001` · Source: Poor Richard's Almanack, 1735 — Haste makes waste.\n",
  );
  assert.equal(pdLabelled.items[0].text, "Haste makes waste.");
  assert.equal(pdLabelled.items[0].source, "Poor Richard's Almanack, 1735");
  const pdBare = extractItems(
    "docs/content-quotes-verified-public-domain.md",
    "`QUOTE-PD-025` · Traditional English proverb, pre-1800 — A stitch in time saves nine.\n",
  );
  assert.equal(pdBare.items[0].text, "A stitch in time saves nine.");

  const code = extractItems(
    "docs/content-code-snippets-javascript-original.md",
    "`CODE-JS-002` · Difficulty: Typical · Token mix: brackets-heavy\n```\nfunction f() {\n  return 1;\n}\n```\n",
  );
  assert.equal(code.items[0].text, "function f() {\n  return 1;\n}");
  assert.equal(code.items[0].tokenMix, "brackets-heavy");

  const wordList = extractItems(
    "docs/content-classic-mode-word-list-full-corpus.md",
    "```\nthe, to, a, and, of\n```\n\n| Field | Value |\n|---|---|\n| item_id | `WORDLIST-CLASSIC-02` |\n",
  );
  assert.equal(wordList.items[0].id, "WORDLIST-CLASSIC-02");
  assert.equal(wordList.items[0].text, "the to a and of");
});

test("a word-list file with no parseable pool fails the build", () => {
  const build = buildCorpus({
    registerTexts: [
      {
        name: "docs/content-license-register.md",
        text: registerTable([
          { id: "WORDLIST-CLASSIC-02", type: "word-list", tag: "utility function" },
        ]),
      },
    ],
    corpusTexts: [
      {
        name: "docs/content-classic-mode-word-list-full-corpus.md",
        text: "Prose only, no fenced pool.\n\n| Field | Value |\n|---|---|\n| item_id | `WORDLIST-CLASSIC-02` |\n",
      },
    ],
  });
  assert.ok(codes(build).includes("WORD-LIST-POOL-NOT-FOUND"));
});

/* -------------------------------------------------------------- integration */

test("integration: the real corpus builds with zero failures", () => {
  const build = buildFromRepo(ROOT);
  assert.deepEqual(build.failures, [], `real corpus failures:\n${build.failures.join("\n")}`);
  assert.ok(
    build.items.length > 700,
    `expected the corpus to actually load, got ${build.items.length}`,
  );
});

test("no-mutation control: inspecting the real corpus writes nothing and is repeatable", () => {
  const artifactPath = join(ROOT, "content", "corpus.json");
  const before = readFileSync(artifactPath, "utf8");
  const first = serialiseCorpus(buildFromRepo(ROOT));
  const second = serialiseCorpus(buildFromRepo(ROOT));
  const after = readFileSync(artifactPath, "utf8");

  assert.equal(after, before, "reading the corpus must not modify the committed artifact");
  assert.equal(first, second, "two builds of the same input must be byte-identical");
  assert.equal(first, before, "the committed artifact must equal a fresh build");
});
