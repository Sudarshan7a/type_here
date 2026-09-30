import { LOG_A, LOG_B, TARGET } from "./logs.js";
import type { KeyEvent } from "./stats.js";
import {
  interKeyIntervals,
  keystrokeAccuracyFromLog,
  mean,
  netWpmFromLog,
  rawWpmFromLog,
  sampleStandardDeviation,
} from "./stats.js";

export interface ParityVector {
  ikiCount: number;
  ikiMeanMs: number;
  ikiSdMs: number;
  netWpm: number;
  rawWpm: number;
  keystrokeAccuracy: number;
}

export function parityVectorFor(log: KeyEvent[], target: string): ParityVector {
  const ikis = interKeyIntervals(log);
  return {
    ikiCount: ikis.length,
    ikiMeanMs: mean(ikis),
    ikiSdMs: sampleStandardDeviation(ikis),
    netWpm: netWpmFromLog(log, target),
    rawWpm: rawWpmFromLog(log),
    keystrokeAccuracy: keystrokeAccuracyFromLog(log, target),
  };
}

export function parityVectors(): { a: ParityVector; b: ParityVector } {
  return {
    a: parityVectorFor(LOG_A, TARGET),
    b: parityVectorFor(LOG_B, TARGET),
  };
}
