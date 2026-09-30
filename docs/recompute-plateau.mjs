/**
 * Throwaway recompute for the Chapter 8 §8.7.1 plateau decision
 * (docs/CHAPTER-ARITHMETIC-CORRECTIONS.md item 5). Imports nothing from
 * the project: plain arithmetic, executed once, output transcribed into the
 * corrections file. Do not maintain this script.
 */

const X = [0, 2, 4, 6, 8, 10, 12, 14];
const CHAPTER = [42.1, 43.5, 41.8, 44.2, 42.9, 43.1, 42.6, 43.8];

// Constructed fixtures (Block B1: the chapter example is illustrative only).
const FLAT = [42.0, 42.4, 41.7, 42.3, 42.1, 41.9, 42.2, 42.0];
const IMPROVING = [40.0, 41.0, 42.0, 43.0, 44.0, 45.0, 46.0, 47.0];

function mean(v) {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function ols(x, y) {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  return { slope: sxy / sxx, mx, my };
}

function populationSd(v, m) {
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
}

function sampleSd(v, m) {
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}

function report(label, y) {
  const { slope, my } = ols(X, y);
  const predicted14 = slope * 14;
  const pop = populationSd(y, my);
  const samp = sampleSd(y, my);
  const verdictPop = predicted14 < pop ? "PLATEAU (flagged)" : "not a plateau";
  const verdictSamp = predicted14 < samp ? "PLATEAU (flagged)" : "not a plateau";
  console.log(`\n${label}`);
  console.log(`  mean                 = ${my.toFixed(4)}`);
  console.log(`  slope (WPM/day)      = ${slope.toFixed(6)}`);
  console.log(`  predicted 14-day chg = ${predicted14.toFixed(4)}`);
  console.log(`  population SD (n)    = ${pop.toFixed(4)}`);
  console.log(`  sample SD (n-1)      = ${samp.toFixed(4)}`);
  console.log(`  -> population rule (DECIDED): ${verdictPop}`);
  console.log(`  -> sample rule (rejected)    : ${verdictSamp}`);
  console.log(`  -> margin vs population SD   = ${(predicted14 - pop).toFixed(4)}`);
  return { predicted14, pop, samp };
}

console.log("Chapter 8 §8.7.1 — decision: POPULATION SD (divide by n).");
console.log("Rule: flag a plateau when |predicted 14-day change| < SD of the points.");
const chapter = report("CHAPTER EXAMPLE (illustrative only)", CHAPTER);
const flat = report("WM-FIXTURE-009a constructed FLAT series (must trigger)", FLAT);
const improving = report(
  "WM-FIXTURE-009b constructed IMPROVING series (must not trigger)",
  IMPROVING,
);

console.log("\n--- chapter claim check ---");
console.log(
  `  chapter states predicted change 0.84 < SD 0.85 -> IS a plateau.`,
);
console.log(
  `  recomputed: predicted ${chapter.predicted14.toFixed(4)} vs pop SD ${chapter.pop.toFixed(4)} -> ` +
    `${chapter.predicted14 < chapter.pop ? "plateau" : "NOT a plateau"}. ` +
    `The chapter claim does not hold under either SD variant.`,
);

console.log("\n--- constructed fixtures are unambiguous ---");
const flatClear = flat.predicted14 < flat.pop * 0.9;
const impClear = improving.predicted14 > improving.pop * 1.5;
console.log(`  009a triggers by >10% margin: ${flatClear}`);
console.log(`  009b misses by >50% margin: ${impClear}`);