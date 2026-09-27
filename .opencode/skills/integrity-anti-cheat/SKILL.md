---
name: integrity-anti-cheat
description: Design rules for result verification and anti-cheat (signed sessions, server recompute, plausibility checks, risk scoring, holds, appeals) and the rule that public leaderboards ship only after integrity layers exist. Use when building result submission, sessions, leaderboards, races, or admin review tools.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: INT-01..INT-10, section-9.6
---

## Facts to design against
Cheat tools exist for popular typing sites, including tools that defeat image-based checks and paid bots with "human-like" timing. Perfect prevention is impossible. Goals: make cheating costly, keep false positives very low (measure them), be transparent, and **reduce the incentive first**.

## MVP (results are private to the user)
1. **Signed sessions:** `POST /sessions` returns `{ id, seed, nonce, textHash, expiresAt }`. Results must reference a valid, unexpired, unused session.
2. **Server recompute:** the client submits the raw event log; the server recomputes all metrics with the shared engine and rejects mismatches beyond tolerance.
3. **Plausibility checks:** physical key-rate limits, minimum IKI floors, impossible rollover patterns, zero-variance timing, constant-interval bursts. Flag; do not auto-ban at MVP.
4. **Rate limits:** per IP/account/device. CAPTCHA only as an anomaly fallback, never in the normal flow.
5. **Untrusted events:** ignore `isTrusted === false`; block paste/drop/autofill in verified mode.

## V1 (before any public board)
- Risk-scoring worker; flagged results are **held off boards** and show "under review" to the user.
- Statistical checks: human IKI depends on bigram type and skill level; flag timing that ignores it or has unnaturally low variance.
- Verification re-test (fresh text) or video for records/top ranks.
- Public policy, categorized reasons, appeal form, and a tracked false-positive rate.
- Ranked (strict) vs practice (relaxed) modes.

## Hard rules
- **No public leaderboards** until risk scoring, holds, verification, and appeals are live (INT-10).
- Do not expose detection thresholds to the client. Keep them server-side and rotate them.
- Never permanently ban on a single automated signal.
- Log decisions with reasons for audit; admin access is audited.

## Tests
- Forged log with impossible timing → rejected.
- Replay of an old session → rejected (nonce used).
- Metrics mismatch client vs server → rejected.
- Known fast human fixture → not flagged (false-positive guard).

## Done checklist
- [ ] Session signing + TTL + single use
- [ ] Recompute equals client within tolerance
- [ ] Plausibility checks with fixtures
- [ ] Leaderboards disabled unless V1 integrity flags are on
