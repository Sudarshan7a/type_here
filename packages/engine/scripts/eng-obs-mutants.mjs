#!/usr/bin/env node
/**
 * ENG-OBS mutant proof. Applies one single-line mutation to
 * packages/engine/src/observations.ts, runs the ENG-OBS suite, and requires it
 * to FAIL. A surviving mutant means a rule is not actually pinned.
 *
 * Run: node scripts/eng-obs-mutants.mjs
 * Exit 0 only when every mutant is killed AND the no-mutation control passes.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "src", "observations.ts");
const backup = join(here, "..", "src", "observations.ts.orig");
const suite = "tests/observations-eng-obs.test.ts";

/**
 * [label, from, to] — each `from` must occur exactly once.
 *
 * Four of these were rewritten after the first run SURVIVED them, which is the
 * point of running the harness at all:
 *
 *   - "drop `typed` from the key" and "drop `!edit` from the key" were both
 *     semantically EQUIVALENT. The auto events are removed again by the press
 *     filter downstream, and "Backspace" is eight code units so the length test
 *     rejects it anyway. The two rules are now pinned where they are observable
 *     — the press filter, and the unresolved-press count, which is why the
 *     auto-emoji and B01-parity tests exist.
 *   - "read the key from `event.code`" originally fell back to `event.key`
 *     whenever the code was longer than one unit, which is always, so it was a
 *     no-op. It now truncates the code for real.
 *   - "refused presses may end a pair" deleted `accepted` from `isPairable`,
 *     which the nullable `position` field already implied. The record is now a
 *     discriminated union, so either clause alone narrows the type correctly and
 *     neither is observable at run time — deleting either is unobservable, and
 *     the rule is instead pinned by mutating the decision that produces a
 *     refusal ("refused presses count as landed").
 */
const MUTANTS = [
  [
    "auto-inserted events admitted to the press list",
    "(entry) => entry.event.auto !== true && (haltedAtT === null || entry.event.t <= haltedAtT),",
    "(entry) => haltedAtT === null || entry.event.t <= haltedAtT,",
  ],
  [
    "auto-inserted events counted as unresolved presses",
    "if (typed && !edit && key === null) unresolvedPresses += 1;",
    "if (!edit && key === null) unresolvedPresses += 1;",
  ],
  [
    "edit keys counted as unresolved presses",
    "if (typed && !edit && key === null) unresolvedPresses += 1;",
    "if (typed && key === null) unresolvedPresses += 1;",
  ],
  [
    "key identity read from event.code (E8)",
    "const key = typed && !edit && event.key.length === 1 ? singleKey(event.key) : null;",
    "const key = typed && !edit && event.key.length === 1 ? singleKey(event.code.slice(-1)) : null;",
  ],
  [
    "unresolved presses stop being counted",
    "if (typed && !edit && key === null) unresolvedPresses += 1;",
    "if (false) unresolvedPresses += 1;",
  ],
  [
    "correctness always true (errors vanish)",
    "            correct: model.inserts[model.inserts.length - 1]!.correct,",
    "            correct: true,",
  ],
  [
    "refused presses count as landed",
    'const landed = outcome === "inserted" && model.inserts.length > insertsBefore;',
    'const landed = outcome !== "ignored" && !edit;',
  ],
  [
    "stop-on-error no longer truncates the attempt",
    "(entry) => entry.event.auto !== true && (haltedAtT === null || entry.event.t <= haltedAtT),",
    "(entry) => entry.event.auto !== true,",
  ],
  [
    "first press gets a fabricated 0 ms interval",
    "intervalMs: previousAtMs === null ? NO_PREDECESSOR_MS : current.atMs - previousAtMs,",
    "intervalMs: previousAtMs === null ? 0 : current.atMs - previousAtMs,",
  ],
  [
    "key atMs pinned to zero",
    "        correct: current.correct,\n        atMs: current.atMs,",
    "        correct: current.correct,\n        atMs: 0,",
  ],
  [
    "a pair is timestamped when it started, not when it completed",
    "          // A transition completes when its second key lands, so that is when\n          // it earns the §8.4.1 recency weight.\n          atMs: current.atMs,",
    "          atMs: previous.atMs,",
  ],
  [
    "target adjacency not required",
    "      current.position === previous.position + 1\n",
    "      true\n",
  ],
  [
    "pause threshold off by one",
    "      if (gap <= IKI_GAP_EXCLUSION_MS) {",
    "      if (gap < IKI_GAP_EXCLUSION_MS) {",
  ],
  ["no pause is ever excluded", "      if (gap <= IKI_GAP_EXCLUSION_MS) {", "      if (true) {"],
  [
    "pair direction reversed",
    "          from: previous.key,\n          to: current.key,",
    "          from: current.key,\n          to: previous.key,",
  ],
  [
    "pair interval taken from the wrong end",
    "          intervalMs: gap,",
    "          intervalMs: gap + 1,",
  ],
  [
    "one wrong end is enough for a pair to read clean",
    "          correct: previous.correct && current.correct,",
    "          correct: previous.correct,",
  ],
  [
    "Backspace does not advance the interval clock",
    "    previousAtMs = current.atMs;",
    "    if (current.key !== null) previousAtMs = current.atMs;",
  ],
];

function runSuite() {
  // The vitest CLI is spawned with the current Node binary rather than through
  // `npx`: on Windows `npx` is a .cmd shim, and `execFileSync` without a shell
  // cannot launch one — it died with a null status and empty output, which would
  // have made every mutant look "killed" for the wrong reason. `vitest.mjs` is
  // the package's `bin` and is deliberately absent from its `exports`, so it is
  // located through the (exported) package.json rather than resolved as a
  // subpath.
  const pkgDir = dirname(fileURLToPath(import.meta.resolve("vitest/package.json")));
  const cli = join(pkgDir, "vitest.mjs");
  try {
    execFileSync(process.execPath, [cli, "run", suite], {
      cwd: join(here, ".."),
      stdio: "pipe",
      encoding: "utf8",
    });
    return { killed: false, detail: "" };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    // Vitest colourises the failure lines, so the SGR sequences sit between the
    // marker and the test name; strip them before matching or nothing matches and
    // every kill looks anonymous.
    // eslint-disable-next-line no-control-regex
    const plain = output.replace(/\u001b\[[0-9;]*m/g, "");
    const failing = [
      ...new Set(
        [...plain.matchAll(/^\s*×\s+(.+?)\s+\d+ms$/gm)].map((m) => m[1].trim()).filter(Boolean),
      ),
    ].slice(0, 3);
    const firstError = plain.match(/^AssertionError: (.+)$/m)?.[1]?.slice(0, 90);
    return {
      killed: true,
      detail:
        (failing.length > 0 ? failing.join(" | ") : `suite failed (${output.length} bytes)`) +
        (firstError ? `  -> ${firstError}` : ""),
    };
  }
}

const original = readFileSync(source, "utf8");
copyFileSync(source, backup);

let failed = false;
try {
  const control = runSuite();
  console.log(`CONTROL (no mutation)  ${control.killed ? "FAILED — suite is red" : "passes"}`);
  if (control.killed) {
    console.log(`  ${control.detail}`);
    failed = true;
  }

  let killed = 0;
  for (const [label, from, to] of MUTANTS) {
    const occurrences = original.split(from).length - 1;
    if (occurrences !== 1) {
      console.log(`SKIP  ${label} — anchor matched ${occurrences} times`);
      failed = true;
      continue;
    }
    writeFileSync(source, original.replace(from, to), "utf8");
    const result = runSuite();
    writeFileSync(source, original, "utf8");
    if (result.killed) {
      killed += 1;
      console.log(`KILL  ${label}\n        ${result.detail}`);
    } else {
      console.log(`SURVIVED  ${label}`);
      failed = true;
    }
  }
  console.log(`\n${killed}/${MUTANTS.length} mutants killed.`);
} finally {
  // The source is restored unconditionally and then VERIFIED. An earlier run of
  // this script was interrupted mid-mutant and left `true` in place of the
  // adjacency condition; the file is untracked, so `git checkout` could not undo
  // it and only the control run noticed. Restoring is not enough — proving it is.
  writeFileSync(source, original, "utf8");
  const after = readFileSync(source, "utf8");
  if (after !== original) {
    console.error("\nFATAL: source not restored cleanly — refusing to report a result.");
    rmSync(backup, { force: true });
    process.exit(1);
  }
  const postControl = runSuite();
  if (postControl.killed) {
    console.error(`\nFATAL: suite still red after restore.\n  ${postControl.detail}`);
    rmSync(backup, { force: true });
    process.exit(1);
  }
  console.log("POST-CONTROL (source restored)  passes");
  rmSync(backup, { force: true });
  if (failed) process.exitCode = 1;
}
