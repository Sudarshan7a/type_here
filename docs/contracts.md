# Shared Contracts — Parallel Build (docs/contracts.md)

**Status:** active. Every delegated agent and the main agent works against
this file. If a contract here conflicts with `packages/schemas`, the CODE in
`packages/schemas` wins and this file must be fixed.

**Working branch protocol:** agents never run git. The main agent owns all
git operations (branch → commit(s) in the required order → push → CI green →
`--no-ff` merge to main → pr-log + BUILD-LOG entry). Agents write files and
verify; the main agent integrates.

---

## 1. Folder ownership map (hard boundaries)

| Owner | Folders (only these may be touched) |
|---|---|
| Agent-ENGINE | `packages/engine/**` (src, tests, fixtures) |
| Agent-TELEMETRY | `packages/telemetry/**` (new). May run root `pnpm install` (it is the only lockfile-mutating agent). May NOT touch `apps/api` — Fastify wiring is returned as an integration note for the main agent. |
| Agent-SPIKES-A (latency + hidden tab) | `spikes/s1-latency/**`, `spikes/s6-hidden-tab/**`, `spikes/RESULTS-TEMPLATE.md` |
| Agent-SPIKES-B (timing capture + parity) | `spikes/s2-timing/**`, `spikes/s3-parity/**` |
| Main agent (me) | everything else: git, root configs, `apps/**`, `packages/schemas/**`, `docs/**` (incl. CHAPTER-ARITHMETIC-CORRECTIONS.md, pr-log, BUILD-LOG, session reports), `e2e/**`, integration wiring |

Common rules for all agents:

- Never edit, create, or delete anything outside your folders. Need a change
  elsewhere? Put it in your final summary.
- Never run git commands. Never edit BUILD-LOG.md / docs/ / root package.json
  / pnpm-workspace.yaml.
- Exceptions granted in your task prompt (e.g. root `pnpm install`) are the
  ONLY exceptions.
- Report discrepancies in project docs instead of deciding them (stop
  conditions, section 4 below).

## 2. Shared data contracts (source of truth: `packages/schemas`, CONTRACT_VERSION 1.4.0)

All cross-module data flows through these shapes. Zod `.strict()` everywhere;
unknown fields are rejected. Full definitions: `packages/schemas/src/*.ts`.

- **KeyEvent** `{code, key, type: "down"|"up", t, mods{shift,ctrl,alt,meta}, repeat, isTrusted, auto, composition?}` — `t` is ms float, finite, ≥ 0, relative to the first accepted keystroke. All fields required except `composition` (optional since 1.4.0: true while an IME composition is still open — never scored; absent means committed text).
- **InputLog** `{events: KeyEvent[] (≤ 20,000), markers?: LogMarker[], meta: {mode, textId, textHash (64-hex sha-256), layout, settings, engineVersion (semver core), sessionId?, recorder? {userAgent, note?}}}`
- **LogMarker** `{kind: "focus"|"blur"|"visibility", t, detail?}` — never a keystroke.
- **TypingText** `{id, text}` — text 1..10,000 chars.
- **TypingSettings** `{errorMode: "free"|"must-correct"|"stop-on-error"|"no-backspace"|"word-locked", autoIndent, autoPair, layout}` — layout enum: qwerty-us, qwerty-uk, dvorak, colemak-dh, azerty, qwertz.
- **ResultSummary** `{rawWpm, grossWpm, netWpm, keystrokeAccuracy, finalAccuracy (percent 0-100), kspc, rolloverRatio (0-1), consistency (nullable), burstWpm, ikiMeanMs (nullable), modelVersion, difficultyBand (nullable), verified, flags[]}` — full precision stored; display rounding is UI-only.
- **Session** `{id, seed, nonce, textHash, expiresAt (ISO 8601 UTC)}`.

Limits (shape only, enforced by schemas): 20,000 events per log; 10,000 chars
per text; no NaN/Infinity; timestamps finite ≥ 0.

**Store shape / integration flow (current phase):**

```
recorder (tools/fixture-recorder)  ──▶  InputLog  ──▶  packages/engine
                                                          │ computes metrics
                                              ResultSummary (schemas shape)
                                                          │
apps/web (future) ◀── telemetry events (allowlist only) ──┘
```

- Metrics live ONLY in `packages/engine`. Changing a formula requires a
  `modelVersion` bump and `/how-we-calculate` update — **stop condition**.
- Keystroke content never goes to analytics/error tracking — **stop condition**.
- Integrity/anti-cheat thresholds are not to be changed — **stop condition**.

## 3. Per-stream contracts

### Engine (packages/engine)

- Consumes InputLog; produces ResultSummary + the 40-fixture `ENG-*` catalog
  (Session 2 scope: E1 fixtures + E2-E6 implementation slices).
- **Commit-ordering invariant (Section 2.2):** git history must show the
  fixture/test commit BEFORE the implementation commit. Agents cannot commit,
  so the engine agent delivers files such that the main agent can commit in
  this order: everything under `packages/engine/fixtures/**` and
  `packages/engine/tests/**` first, then `packages/engine/src/**`.
- **Arithmetic protocol (Session 2 prompt Section 4):** expected values are
  recomputed independently (throwaway script inside
  `packages/engine/fixtures/`, not importing the engine); results land in
  `packages/engine/fixtures/PROVENANCE.md`. Chapter worked numbers that
  disagree with the recompute are used CORRECTED in fixtures and reported in
  the agent's summary for docs/CHAPTER-ARITHMETIC-CORRECTIONS.md. If a
  FORMULA itself seems wrong/ambiguous: implement per the authoritative
  formulas (master spec §6 + typing-metrics-spec skill), flag it, do not
  decide alone.
- Known corrections to verify (from the Session 2 prompt): B01 raw 24.6 WPM /
  keystroke accuracy 91.7% (printable-only counting); F01 burst ≈ 53 WPM
  (5 s window definition must be documented); A01 consistency null (10 s
  minimum scored duration, chosen + logged).
- No DOM code in packages/engine. No new dependencies. Tests must fail against
  the stub before implementation passes them (the agent verifies both states).
- `ENGINE_MODEL_VERSION` bumps to `"1.0.0"` with the first real metrics code.

### Telemetry (packages/telemetry, new)

- `track(event, props)`: allowlisted events + per-event property schemas;
  values are numbers, booleans, or enum strings only; no free text; max 10
  props; unknown events/props rejected at compile time (@ts-expect-error
  tests) and runtime.
- `scrubError(err)`: allowlist-based (error name, sanitized stack, release,
  environment, route, HTTP status, request id). Drops bodies, non-allowlisted
  headers, free-text breadcrumbs, and any field named text/typed/log/events/
  keystrokes/content/body/input. When unsure, drop.
- Vendor adapter interface (scrubError mandatory beforeSend) tested against a
  fake sink. Canary: `CANARY_TYPED_TEXT_9F3A` must never reach the sink.
- No vendor SDKs. No new runtime dependencies. Vitest + typescript +
  @types/node devDeps only.

### Spikes (spikes/sN-*, scratch, never shipped)

- Outside workspace globs; each spike has its own `package.json` +
  `node_modules`; never imported into `packages/` or `apps/`.
- Each README has the fixed headings: Question, Method, Result (PASS | FAIL |
  INCONCLUSIVE + LAB PROXY or REAL-DEVICE PENDING), Evidence, Risks,
  Recommendation.
- Headless/synthetic results are LAB PROXY, never PASS for real-hardware
  criteria. `spikes/RESULTS-TEMPLATE.md` is where the human records
  real-device runs.
- Phase 0 assumptions at risk are reported (PHASE 0 RISK) with numbers.

## 4. Stop conditions (report, never decide)

1. A metric formula in chapters 4/8/9/10 or the spec would need to change.
2. Privacy behavior would change, or new personal data would be collected.
3. An integrity/anti-cheat threshold would change.
4. Real payments, real-data deletion, or legal text involved.
5. A factual error in the content library (report with specific finding + fix + evidence).
6. A spike result contradicting a Phase 0 exit criterion (log PHASE 0 RISK, continue unaffected work).
7. A real-device/human-only result would otherwise be reported as PASS.
