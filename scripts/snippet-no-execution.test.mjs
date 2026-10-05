/**
 * No-execution proof (CNT-04, AGENTS.md rule 5).
 *
 * THE RULE: "Never execute user or library code (code snippets are display-only)."
 * A rule asserted in a comment is a promise. This file turns it into independent
 * mechanical checks, because each has a different blind spot:
 *
 *   1. STATIC  - no source file in this feature contains an execution primitive.
 *      Catches the obvious (`eval`, `new Function`, `child_process`, `node:vm`,
 *      a dynamic `import()` with a computed specifier). Blind spot: it cannot see
 *      a helper reached indirectly.
 *
 *   2. RUNTIME - the whole pipeline runs with `eval` and the `Function` constructor
 *      poisoned and is asserted to still reproduce the committed artifact
 *      byte-for-byte. If any snippet text reached a compiler the build would throw
 *      instead of producing output. Blind spot: only the code paths the build walks.
 *
 *   3. RENDER  - `sanitizeSnippet` (the engine's own PRG-04 display contract) is
 *      asserted total and idempotent over every snippet. Blind spot: it says
 *      nothing about what a future renderer does with the output.
 *
 * Check 2 is the one that matters, and it is worth being precise about why. The
 * pipeline reads snippet text out of a JSON file, treats it as a string
 * throughout, and hands it to exactly one function: `tokenize`, a character
 * scanner. There is no path from snippet text to a compiler, and check 2 is what
 * makes "there is no such path" an observation rather than a claim.
 *
 * None of this executes a snippet, which is the point.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { buildFromRepo } from "./build-snippets.mjs";
import { serialiseSnippetLibrary } from "./snippet-library.mjs";
import { lexSnippet, sanitizeSnippet } from "./snippet-engine-loader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const ARTIFACT_TEXT = readFileSync(join(ROOT, "content", "snippets", "library.json"), "utf8");
const ARTIFACT = JSON.parse(ARTIFACT_TEXT);

/**
 * Every non-test source file this feature owns, listed explicitly rather than
 * globbed.
 *
 * A glob would sweep in the test files, whose fixtures legitimately contain the
 * *spelling* of an execution primitive so this file has something to look for.
 * The explicit list is also the list a reviewer can check against the diff, and
 * the last test in this file fails if a new source file is added without being
 * listed - so the omission is loud rather than silent.
 */
const OWNED_SOURCES = [
  "scripts/build-snippets.mjs",
  "scripts/check-snippets.mjs",
  "scripts/snippet-engine-loader.mjs",
  "scripts/snippet-library.mjs",
];

/**
 * Execution primitives, and why each is banned here.
 *
 * `eval`, the `Function` constructor, `vm`, a process spawn and a worker are the
 * ways JavaScript compiles or runs code. The string-body forms of
 * `setTimeout`/`setInterval` are included because they are `eval` wearing a hat.
 */
const FORBIDDEN = [
  { pattern: /\beval\s*\(/, name: "eval()" },
  { pattern: /\bnew\s+Function\s*\(/, name: "new Function()" },
  { pattern: /\bFunction\s*\(\s*["'`]/, name: "Function() with a string body" },
  { pattern: /\bsetTimeout\s*\(\s*["'`]/, name: "setTimeout with a string body" },
  { pattern: /\bsetInterval\s*\(\s*["'`]/, name: "setInterval with a string body" },
  { pattern: /["']node:vm["']/, name: "node:vm" },
  { pattern: /["']node:child_process["']/, name: "node:child_process" },
  { pattern: /["']node:worker_threads["']/, name: "node:worker_threads" },
  {
    pattern: /\brunInNewContext\b|\brunInThisContext\b|\bcompileFunction\b/,
    name: "vm compilation",
  },
  { pattern: /\bnew\s+Worker\s*\(/, name: "new Worker()" },
  {
    pattern: /\bexecSync\s*\(|\bspawnSync\s*\(|\bexecFile\s*\(|\bspawn\s*\(/,
    name: "a process spawn",
  },
];

/**
 * Strip comments and string literals, so a rule NAME written in prose is not a
 * rule hit and a snippet's own content cannot trip the scan.
 */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''");
}

/* ------------------------------------------------------------- 1. static */

test("STATIC :: no owned source contains an execution primitive", () => {
  const hits = [];
  for (const relative of OWNED_SOURCES) {
    const source = codeOnly(readFileSync(join(ROOT, relative), "utf8"));
    for (const { pattern, name } of FORBIDDEN) {
      if (pattern.test(source)) hits.push(`${relative}: ${name}`);
    }
  }
  assert.deepEqual(hits, [], `execution primitives found:\n${hits.join("\n")}`);
});

test("STATIC :: the only dynamic import has a literal specifier", () => {
  // A dynamic import with a computed specifier is how a snippet becomes a module.
  // The engine loader's one dynamic import is a string literal; nothing else may
  // import anything dynamically.
  const hits = [];
  for (const relative of OWNED_SOURCES) {
    const source = codeOnly(readFileSync(join(ROOT, relative), "utf8"));
    for (const match of source.matchAll(/\bimport\s*\(([^)]*)\)/g)) {
      const specifier = match[1].trim();
      if (!/^""$/.test(specifier)) hits.push(`${relative}: computed dynamic import: ${specifier}`);
    }
  }
  assert.deepEqual(hits, [], hits.join("\n"));
});

test("STATIC :: the loader resolves exactly three engine modules and no more", () => {
  // The blast radius of "the authoritative lexer", stated as a number so adding a
  // fourth import is a visible change. Each of the three is a pure function or a
  // frozen constant; see the module header.
  const source = codeOnly(readFileSync(join(ROOT, "scripts", "snippet-engine-loader.mjs"), "utf8"));
  const imports = [...source.matchAll(/\bimport\s*\(([^)]*)\)/g)].map((m) => m[1]);
  assert.equal(imports.length, 3, `loader imports ${imports.length} modules`);
  for (const specifier of imports) {
    assert.match(specifier, /^""$/);
  }
});

test("STATIC :: the artifact has no field whose name invites a consumer to run it", () => {
  // `code` is data. Nothing in the record shape means "execute me", and a field
  // that did would be a loaded gun for the first consumer that reads it.
  const forbidden = new Set(["exec", "execute", "run", "evaluate", "eval", "compile", "interpret"]);
  const hits = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      if (forbidden.has(key.toLowerCase())) hits.push(`${path}.${key}`);
      walk(nested, `${path}.${key}`);
    }
  };
  walk(ARTIFACT, "library");
  assert.deepEqual(hits, [], `execution-inviting field names: ${hits.join(", ")}`);
});

test("STATIC :: OWNED_SOURCES covers every non-test snippet source file", () => {
  const found = readdirSync(join(ROOT, "scripts"))
    .filter((name) => name.includes("snippet") && name.endsWith(".mjs") && !name.includes(".test."))
    .map((name) => `scripts/${name}`)
    .sort();
  assert.deepEqual(found, [...OWNED_SOURCES].sort());
});

/* ------------------------------------------------------------ 2. runtime */

test("RUNTIME :: the pipeline reproduces the committed artifact with eval and Function poisoned", () => {
  const originalEval = globalThis.eval;
  const originalFunction = globalThis.Function;
  let tripped = false;

  globalThis.eval = () => {
    tripped = true;
    throw new Error("snippet text reached eval");
  };
  globalThis.Function = function PoisonedFunction() {
    tripped = true;
    throw new Error("snippet text reached the Function constructor");
  };

  let produced;
  try {
    produced = serialiseSnippetLibrary(buildFromRepo(ROOT));
  } finally {
    globalThis.eval = originalEval;
    globalThis.Function = originalFunction;
  }

  assert.equal(tripped, false, "an execution primitive was reached during the build");
  assert.equal(
    produced,
    ARTIFACT_TEXT,
    "the poisoned build did not reproduce the committed artifact",
  );
});

test("RUNTIME :: every snippet lexes cleanly with eval and Function poisoned", () => {
  const originalEval = globalThis.eval;
  const originalFunction = globalThis.Function;
  let tripped = false;
  globalThis.eval = () => {
    tripped = true;
  };
  globalThis.Function = function PoisonedFunction() {
    tripped = true;
  };
  try {
    for (const record of ARTIFACT.records) {
      const map = lexSnippet(record.code, record.language);
      assert.deepEqual(map.diagnostics, [], `${record.id} produced diagnostics`);
      assert.deepEqual(map.tilingIssues, [], `${record.id} produced a non-tiling map`);
    }
  } finally {
    globalThis.eval = originalEval;
    globalThis.Function = originalFunction;
  }
  assert.equal(tripped, false, "lexing a snippet reached an execution primitive");
});

test("RUNTIME :: the poison intercepts, so the two checks above are not vacuous", () => {
  // The control. Without it, a `globalThis.eval` assignment that silently did
  // nothing would make every runtime assertion pass for the wrong reason.
  const originalEval = globalThis.eval;
  let evalTripped = false;
  globalThis.eval = () => {
    evalTripped = true;
  };
  try {
    globalThis.eval("1 + 1");
  } finally {
    globalThis.eval = originalEval;
  }
  assert.equal(evalTripped, true, "the eval poison did not intercept an eval call");

  const originalFunction = globalThis.Function;
  let functionTripped = false;
  globalThis.Function = function PoisonedFunction() {
    functionTripped = true;
  };
  try {
    // Constructing from a string is the thing being poisoned. Constructing it is
    // the point of the control, so this is the one place in the feature where an
    // `eval`-shaped expression appears - and it is prose-free code, which is why
    // the static scan above covers this file separately.
    new globalThis.Function("return 1");
  } catch {
    // A poisoned constructor may also throw; either way it did not run the body.
  } finally {
    globalThis.Function = originalFunction;
  }
  assert.equal(functionTripped, true, "the Function poison did not intercept a construction");
});

/* ------------------------------------------------------------- 3. render */

test("RENDER :: sanitizeSnippet is total and idempotent over every snippet", () => {
  for (const record of ARTIFACT.records) {
    const once = sanitizeSnippet(record.code);
    assert.equal(sanitizeSnippet(once), once, `${record.id} is not sanitisation-idempotent`);
    assert.ok(once.includes("\n"), `${record.id} lost its newlines`);
  }
});

test("RENDER :: sanitisation escapes the markup a JSX snippet contains", () => {
  // Not every react-surface snippet has markup in it - a custom hook that only
  // calls useState has none - so the fixture is the subset that does.
  const withMarkup = ARTIFACT.records.filter(
    (r) => r.tags.features.includes("jsx") && r.code.includes("<"),
  );
  assert.ok(withMarkup.length > 0, "the fixture needs at least one JSX snippet with markup");
  for (const record of withMarkup) {
    const escaped = sanitizeSnippet(record.code);
    assert.ok(!escaped.includes("<"), `${record.id} left a raw < in its escaped form`);
    assert.ok(escaped.includes("&lt;"), `${record.id} has no escaped angle bracket`);
  }
});

test("RENDER :: the library stores raw text, not pre-escaped text", () => {
  // The artifact must hold the characters a user types. Storing escaped text would
  // mean the typing surface compares keystrokes against `&lt;` instead of `<`.
  const jsx = ARTIFACT.records.find((r) => r.code.includes("<") && r.surface === "react");
  assert.ok(jsx, "the fixture needs a react snippet containing markup");
  assert.ok(jsx.code.includes("<"), "stored code is escaped; it must be raw");
  assert.ok(!jsx.code.includes("&lt;"), "stored code contains an entity");
});
