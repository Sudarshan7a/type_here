/**
 * Page wiring for the fixture recorder (Block B2). All DOM and browser code
 * lives here; the capture logic stays in capture.ts. This page makes no
 * network requests, uses no storage, and computes no metrics. The export is a
 * local Blob download — nothing is transmitted anywhere.
 */
import { CaptureLog, type MetaInput } from "./capture";
import { SCENARIOS } from "./scenarios";

const scenarioSelect = document.getElementById("scenario") as HTMLSelectElement;
const layoutSelect = document.getElementById("layout") as HTMLSelectElement;
const noteInput = document.getElementById("note") as HTMLInputElement;
const scTitle = document.getElementById("sc-title") as HTMLHeadingElement;
const scInstruction = document.getElementById("sc-instruction") as HTMLParagraphElement;
const scPrompt = document.getElementById("sc-prompt") as HTMLDivElement;
const surface = document.getElementById("surface") as HTMLDivElement;
const startBtn = document.getElementById("start") as HTMLButtonElement;
const exportBtn = document.getElementById("export") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

let capture: CaptureLog | null = null;

function currentScenario() {
  const sc = SCENARIOS.find((s) => s.id === scenarioSelect.value);
  if (sc === undefined) throw new Error("no scenario selected");
  return sc;
}

function showScenario(): void {
  const sc = currentScenario();
  scTitle.textContent = `${sc.id} — ${sc.title}`;
  scInstruction.textContent = sc.instruction;
  scPrompt.textContent = sc.prompt;
}

function populateScenarioSelect(): void {
  for (const sc of SCENARIOS) {
    const option = document.createElement("option");
    option.value = sc.id;
    option.textContent = `${sc.id} — ${sc.title}`;
    scenarioSelect.appendChild(option);
  }
  scenarioSelect.addEventListener("change", () => {
    reset();
    showScenario();
  });
}

/** A stable text id + placeholder hash for the scenario text (shape only —
 * the real content pipeline computes sha-256; this keeps the tool offline
 * and dependency-free while still binding the log to its text).
 * Implemented as a tiny FNV-1a hex, clearly NOT a security hash. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").repeat(8);
}

function reset(): void {
  capture = null;
  exportBtn.disabled = true;
  startBtn.disabled = false;
  surface.textContent = "";
  statusEl.textContent = "idle";
}

function startCapture(): void {
  const sc = currentScenario();
  capture = new CaptureLog();
  exportBtn.disabled = true;
  startBtn.disabled = true;
  statusEl.textContent = `recording ${sc.id} — 0 events`;
  surface.textContent = "";
  surface.focus();
}

function exportLog(): void {
  if (capture === null) return;
  const sc = currentScenario();
  const layout = layoutSelect.value;
  const meta: MetaInput = {
    mode: "classic",
    textId: `fixture-${sc.id}`,
    textHash: fnv1a(sc.prompt),
    layout,
    settings: {
      errorMode: "free",
      autoIndent: false,
      autoPair: false,
      layout: layoutSelect.value as MetaInput["settings"]["layout"],
    },
    engineVersion: "0.0.1",
    recorder: {
      userAgent: navigator.userAgent,
      ...(noteInput.value.trim() ? { note: noteInput.value.trim() } : {}),
    },
  };
  const log = capture.toInputLog(meta);
  const json = JSON.stringify(log, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `fixture-${sc.id}-${layout}-${ymd}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderKey(e: KeyboardEvent): void {
  // Display only — the exported log contains events, not this text.
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Backspace") {
    if (surface.lastChild !== null) surface.lastChild.remove();
    return;
  }
  if (e.key.length === 1) {
    surface.appendChild(document.createTextNode(e.key));
  } else if (e.key === "Enter") {
    surface.appendChild(document.createTextNode("\n"));
  }
}

surface.addEventListener("keydown", (e) => {
  if (capture === null) return;
  capture.recordKey({
    code: e.code,
    key: e.key,
    type: "down",
    at: performance.now(),
    mods: {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    },
    repeat: e.repeat,
    isTrusted: e.isTrusted,
  });
  if (!e.repeat) renderKey(e);
  exportBtn.disabled = capture.eventCount === 0;
  statusEl.textContent = `recording ${currentScenario().id} — ${capture.eventCount} events`;
  // Never preventDefault printable keys or Backspace; only stop Tab from
  // leaving the surface mid-capture.
  if (e.key === "Tab") e.preventDefault();
});

surface.addEventListener("keyup", (e) => {
  if (capture === null) return;
  capture.recordKey({
    code: e.code,
    key: e.key,
    type: "up",
    at: performance.now(),
    mods: {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    },
    repeat: false,
    isTrusted: e.isTrusted,
  });
});

surface.addEventListener("focus", () => {
  capture?.recordMarker("focus", performance.now());
});
surface.addEventListener("blur", () => {
  capture?.recordMarker("blur", performance.now());
});
document.addEventListener("visibilitychange", () => {
  capture?.recordMarker("visibility", performance.now(), document.visibilityState);
});

startBtn.addEventListener("click", startCapture);
exportBtn.addEventListener("click", exportLog);
document.getElementById("prev")?.addEventListener("click", () => {
  scenarioSelect.selectedIndex = Math.max(0, scenarioSelect.selectedIndex - 1);
  reset();
  showScenario();
});
document.getElementById("next")?.addEventListener("click", () => {
  scenarioSelect.selectedIndex = Math.min(
    scenarioSelect.options.length - 1,
    scenarioSelect.selectedIndex + 1,
  );
  reset();
  showScenario();
});

populateScenarioSelect();
showScenario();
