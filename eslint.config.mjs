// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { copyClaimsPlugin } from "./tools/eslint-plugin-copy-claims.mjs";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Node + browser globals that plain-ESM tooling files legitimately use
    // (TS files get theirs from @types/node).
    files: ["scripts/**", "**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        performance: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    // E10 (chapter 4 §4.9): timing must use monotonic sources
    // (performance.now()), never Date.now() — a system clock change mid-test
    // would otherwise corrupt every elapsed-time calculation. The chapter asks
    // for this as a linting rule, not a code-review habit.
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message:
            "Use performance.now() for timing (chapter 4 E10): wall-clock jumps break elapsed-time math.",
        },
      ],
    },
  },
  {
    // PRG-05 (absolute prohibition): user-facing copy must never promise speed
    // gains, improved programming ability, or hiring outcomes. The rule checks
    // string literals, template quasis, JSX text and JSX attribute values; the
    // pattern registry, allowlist rationale and Markdown-corpus half live in
    // tools/eslint-plugin-copy-claims.mjs (single source of truth).
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      "copy-claims": copyClaimsPlugin,
    },
    rules: {
      "copy-claims/no-outcome-promises": "error",
    },
  },
);
