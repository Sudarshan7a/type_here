export interface KeyEvent {
  code: string;
  key: string;
  type: "down" | "up";
  t: number;
  mods: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };
  repeat: boolean;
  isTrusted: boolean;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) throw new Error("mean: empty input");
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

export function sampleStandardDeviation(xs: number[]): number {
  if (xs.length === 0) throw new Error("sampleStandardDeviation: empty input");
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let acc = 0;
  for (const x of xs) {
    const d = x - m;
    acc += d * d;
  }
  return Math.sqrt(acc / (xs.length - 1));
}

function isModifierCombo(e: KeyEvent): boolean {
  return e.mods.ctrl || e.mods.alt || e.mods.meta;
}

function isAcceptedKeystroke(e: KeyEvent): boolean {
  return (
    e.type === "down" &&
    !e.repeat &&
    !isModifierCombo(e) &&
    (e.key.length === 1 || e.key === "Backspace")
  );
}

export function interKeyIntervals(log: KeyEvent[]): number[] {
  const ts = log.filter(isAcceptedKeystroke).map((e) => e.t);
  const out: number[] = [];
  for (let i = 1; i < ts.length; i++) out.push(ts[i] - ts[i - 1]);
  return out;
}

export function finalTextFromLog(log: KeyEvent[]): string {
  let text = "";
  for (const e of log) {
    if (e.type !== "down" || e.repeat || isModifierCombo(e)) continue;
    if (e.key === "Backspace") text = text.slice(0, -1);
    else if (e.key.length === 1) text += e.key;
  }
  return text;
}

export function correctCharacters(finalText: string, target: string): number {
  let correct = 0;
  for (let i = 0; i < finalText.length; i++) {
    if (finalText[i] === target[i]) correct++;
  }
  return correct;
}

function minutesFromLog(log: KeyEvent[]): number {
  const ts = log.filter(isAcceptedKeystroke).map((e) => e.t);
  if (ts.length < 2) return 0;
  return (ts[ts.length - 1] - ts[0]) / 60000;
}

export function netWpmFromLog(log: KeyEvent[], target: string): number {
  const minutes = minutesFromLog(log);
  if (minutes <= 0) return 0;
  return correctCharacters(finalTextFromLog(log), target) / 5 / minutes;
}

export function rawWpmFromLog(log: KeyEvent[]): number {
  const minutes = minutesFromLog(log);
  if (minutes <= 0) return 0;
  const printable = log.filter(
    (e) => e.type === "down" && !e.repeat && !isModifierCombo(e) && e.key.length === 1,
  ).length;
  return printable / 5 / minutes;
}

export function keystrokeAccuracyFromLog(log: KeyEvent[], target: string): number {
  const buf: string[] = [];
  let correct = 0;
  let total = 0;
  for (const e of log) {
    if (e.type !== "down" || e.repeat || isModifierCombo(e)) continue;
    if (e.key === "Backspace") {
      buf.pop();
      continue;
    }
    if (e.key.length !== 1) continue;
    total++;
    if (target[buf.length] === e.key) correct++;
    buf.push(e.key);
  }
  return total === 0 ? 0 : correct / total;
}
