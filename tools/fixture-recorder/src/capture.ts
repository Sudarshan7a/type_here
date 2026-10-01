/**
 * Capture-log builder for tools/fixture-recorder (Block B2).
 *
 * This module is deliberately free of DOM and network code: it receives
 * already-extracted raw event data and builds a contract-valid InputLog.
 * The production input adapter (M1-04) will reuse or be tested against this
 * exact logic. It never computes metrics — a capture log is data only.
 *
 * No network. No storage. No metrics. Ever.
 */

import type { ErrorMode } from "@realtype/schemas";

export interface RawKeyInput {
  code: string;
  key: string;
  type: "down" | "up";
  /** Absolute clock reading (ms, float) — e.g. performance.now(). */
  at: number;
  mods: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };
  repeat: boolean;
  isTrusted: boolean;
  /** True when the character was auto-inserted by the app (always false here). */
  auto?: boolean;
}

export interface MetaInput {
  mode: "classic" | "real-world" | "numbers-symbols" | "custom" | "code";
  textId: string;
  textHash: string;
  layout: string;
  settings: {
    errorMode: ErrorMode;
    autoIndent: boolean;
    autoPair: boolean;
    layout: "qwerty-us" | "qwerty-uk" | "dvorak" | "colemak-dh" | "azerty" | "qwertz";
  };
  engineVersion: string;
  sessionId?: string;
  recorder?: { userAgent: string; note?: string };
}

export interface KeyEventOut {
  code: string;
  key: string;
  type: "down" | "up";
  t: number;
  mods: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };
  repeat: boolean;
  isTrusted: boolean;
  auto: boolean;
}

export interface MarkerOut {
  kind: "focus" | "blur" | "visibility";
  t: number;
  detail?: string;
}

export class CaptureLog {
  private readonly events: KeyEventOut[] = [];
  private readonly markers: MarkerOut[] = [];
  /** Absolute clock reading of the first accepted keystroke; null until then. */
  private origin: number | null = null;

  constructor(private readonly maxEvents = 20_000) {}

  private relative(at: number): number {
    if (this.origin === null) {
      this.origin = at;
      return 0;
    }
    return at - this.origin;
  }

  recordKey(raw: RawKeyInput): void {
    if (this.events.length >= this.maxEvents) {
      throw new Error(`capture log full: max ${this.maxEvents} events`);
    }
    this.events.push({
      code: raw.code,
      key: raw.key,
      type: raw.type,
      t: this.relative(raw.at),
      mods: { ...raw.mods },
      repeat: raw.repeat,
      isTrusted: raw.isTrusted,
      auto: raw.auto ?? false,
    });
  }

  recordMarker(kind: MarkerOut["kind"], at: number, detail?: string): void {
    // t is relative to the first accepted KEYSTROKE (which sets the origin).
    // Markers that fire before any keystroke clamp to t=0 — never negative.
    this.markers.push({
      kind,
      t: Math.max(0, at - (this.origin ?? at)),
      ...(detail ? { detail } : {}),
    });
  }

  get eventCount(): number {
    return this.events.length;
  }

  toInputLog(meta: MetaInput): { events: KeyEventOut[]; markers?: MarkerOut[]; meta: MetaInput } {
    if (this.events.length === 0) {
      throw new Error("nothing captured: at least one keystroke is required");
    }
    const markers = this.markers.filter((m) => m.kind !== undefined);
    return {
      events: this.events,
      ...(markers.length > 0 ? { markers } : {}),
      meta,
    };
  }
}
