import type { ESLint, Linter } from "eslint";

export type ClaimCategory = "speed" | "ability" | "hireability";

export interface BannedPattern {
  id: string;
  category: ClaimCategory;
  pattern: RegExp;
  description: string;
}

export interface AllowlistEntry {
  id: string;
  exempts: "*" | string[];
  pattern?: RegExp;
  keyPattern?: RegExp;
  reason: string;
}

export interface CopyFinding {
  patternId: string;
  category: ClaimCategory;
  match: string;
  allowlistedBy: string[];
}

export declare const BANNED_PATTERNS: BannedPattern[];
export declare const ALLOWLIST: AllowlistEntry[];
export declare function scanCopyText(text: string, opts?: { key?: string }): CopyFinding[];
export declare function claimViolations(text: string, opts?: { key?: string }): CopyFinding[];
export declare function isExemptFile(filename: string): boolean;
export declare const copyClaimsRule: Linter.RuleModule;
export declare const copyClaimsPlugin: ESLint.Plugin;
