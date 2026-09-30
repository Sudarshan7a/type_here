export interface CapturedKeyEvent {
  code: string;
  key: string;
  type: "down" | "up";
  t: number;
  mods: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };
  repeat: boolean;
  isTrusted: boolean;
}

export function replayText(log: CapturedKeyEvent[]): string {
  let text = "";
  for (const e of log) {
    if (e.type !== "down" || e.repeat) continue;
    if (e.mods.ctrl || e.mods.alt || e.mods.meta) continue;
    if (e.key === "Backspace") {
      text = text.slice(0, -1);
    } else if (e.key.length === 1) {
      text += e.key;
    }
  }
  return text;
}
