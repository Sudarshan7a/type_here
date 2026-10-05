import { readFileSync, writeFileSync } from "node:fs";

const which = process.argv[2]; // "typability" | "snippets"
const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const config = {
  typability: {
    script: ["check:typability", "node scripts/check-typability.mjs"],
    ci: `      - name: "Typability bands gate (CNT-02: computed difficulty bands, drift + Stage-A no-multiplication)"
        run: |
          pnpm check:typability
          node --test scripts/check-typability.test.mjs

`,
  },
  snippets: {
    script: ["check:snippets", "node scripts/check-snippets.mjs"],
    ci: `      - name: "Snippet library gate (CNT-04: licence per record, PRG-01 lex validation, P0x placeholders withheld)"
        # Deliberately does NOT run build:snippets: the gate re-derives from
        # content/corpus.json and fails on drift.
        run: |
          pnpm check:snippets
          node --test scripts/snippet-library.test.mjs scripts/snippet-mutants.test.mjs scripts/snippet-no-execution.test.mjs

`,
  },
}[which];

if (pkg.scripts[config.script[0]] === undefined) {
  pkg.scripts[config.script[0]] = config.script[1];
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("added script", config.script[0]);
} else {
  console.log("script already present");
}

const ciPath = ".github/workflows/ci.yml";
let ci = readFileSync(ciPath, "utf8");
if (!ci.includes(config.script[0])) {
  const anchor = `      - name: "Content-licence gate (CNT-07: no GPL/AGPL corpus content, every item licensed)"`;
  if (!ci.includes(anchor)) {
    console.error("CI anchor missing");
    process.exit(1);
  }
  ci = ci.replace(anchor, config.ci + anchor);
  writeFileSync(ciPath, ci, "utf8");
  console.log("added CI step");
} else {
  console.log("CI step already present");
}
