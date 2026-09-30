// Throwaway: verify the finger maps used by the aggregation finger-tagging by
// construction, not memory. Standard touch typing: left hand = qwerty/asdf/zxcv
// (plus t, g, b on the left index), right hand = yuiop/hjkl;/nm,./ (plus y, h, n
// on the right index).
const QWERTY_ROWS = ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"];
const DORAK_BY_QWERTY = ["',.pyfgcrl", "aoeuidhtns", ";qjkxbmwvz"];

// finger per physical key index (q w e r t y u i o p / a s d f g h j k l ; / z x c v b n m , . /)
const FINGER_BY_KEY = [
  ["lp","lr","lm","li","li","ri","ri","rm","rr","rp"],
  ["lp","lr","lm","li","li","ri","ri","rm","rr","rp"],
  ["lp","lr","lm","li","li","ri","ri","rm","rr","rp"],
];

const fingerAt = (rows, table, ch) => {
  for (let r = 0; r < rows.length; r++) {
    const i = rows[r].indexOf(ch);
    if (i >= 0) return table[r][i];
  }
  return null;
};
const qwertyFinger = (ch) => fingerAt(QWERTY_ROWS, FINGER_BY_KEY, ch);
const dvorakFinger = (ch) => fingerAt(DORAK_BY_QWERTY, FINGER_BY_KEY, ch);
const hand = (f) => (f === null ? "?" : f.startsWith("l") ? "left" : "right");

console.log("sanity — QWERTY anchors:");
for (const ch of ["t","g","b","y","h","n","f","j"]) {
  console.log(`  ${ch} = ${qwertyFinger(ch)} (${hand(qwertyFinger(ch))})`);
}

console.log("\npairs (QWERTY vs Dvorak):");
for (const [a, b] of [["t","h"], ["f","j"], ["f","v"], ["u","i"], ["l","u"]]) {
  const qa = qwertyFinger(a), qb = qwertyFinger(b);
  const da = dvorakFinger(a), db = dvorakFinger(b);
  console.log(
    `  ${a}->${b}  QWERTY ${hand(qa)}->${hand(qb)} same=${qa === qb}   ` +
    `Dvorak ${hand(da)}->${hand(db)} same=${da === db}`,
  );
}