// Scratch verification (Session 4, Block C): run the independent layout maps
// and print what they say, so the engine's hardcoded QWERTY/Dvorak maps can be
// compared against physical data rather than against chapter prose.
import { ALTGR_ONLY, LAYOUTS, fingerOf, handOf, mapLayout } from "./layout-verify.mjs";

console.log("=== QWERTY-US anchors (the engine's hardcoded map must match these) ===");
let mismatches = 0;
for (const ch of [
  "t",
  "g",
  "b",
  "y",
  "h",
  "n",
  "f",
  "j",
  "r",
  "u",
  "e",
  "i",
  "o",
  "p",
  "l",
  ";",
  "q",
  "a",
  "z",
]) {
  const f = fingerOf("qwerty-us", ch);
  console.log(`  ${ch} = ${f} (${handOf("qwerty-us", ch)})`);
}

// Pairs the engine's aggregation module currently hardcodes.
console.log("\n=== pairs the engine asserts today ===");
for (const [a, b] of [
  ["t", "h"],
  ["f", "v"],
  ["f", "j"],
  ["u", "i"],
]) {
  const fa = fingerOf("qwerty-us", a);
  const fb = fingerOf("qwerty-us", b);
  const da = fingerOf("dvorak", a);
  const db = fingerOf("dvorak", b);
  console.log(
    `  ${a}->${b}  QWERTY ${fa}->${fb} (same=${fa === fb})  |  Dvorak ${da}->${db} (same=${da === db})`,
  );
}

console.log("\n=== per-layout coverage ===");
for (const layout of Object.keys(LAYOUTS)) {
  const map = mapLayout(layout);
  const altgr = ALTGR_ONLY[layout] ?? new Set();
  const unknown = [...altgr];
  console.log(
    `  ${layout.padEnd(12)} mapped=${String(map.size).padStart(3)} chars, ` +
      `altgr/dead-key unknown=${unknown.length}${unknown.length ? ` (${unknown.slice(0, 6).join("")}${unknown.length > 6 ? "â€¦" : ""})` : ""}`,
  );
}
console.log("\n=== same-finger bigram counts per layout (sanity on the maps) ===");
for (const layout of Object.keys(LAYOUTS)) {
  const map = mapLayout(layout);
  let same = 0;
  let total = 0;
  for (const a of "abcdefghijklmnopqrstuvwxyz") {
    for (const b of "abcdefghijklmnopqrstuvwxyz") {
      if (!map.has(a) || !map.has(b)) continue;
      total += 1;
      if (map.get(a) === map.get(b)) same += 1;
    }
  }
  console.log(
    `  ${layout.padEnd(12)} ${((same / total) * 100).toFixed(1)}% of letter pairs same-finger`,
  );
}
void mismatches;
