---
name: keystroke-privacy
description: Privacy and data-handling rules for keystroke timing data, composition text, analytics, error tracking, retention, consent, export and deletion. Use when adding logging, analytics events, error reporting, storage, admin tools, or any feature that touches user typing data.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: USR-04, ANA-08, NFR-09, section-9.7
---

## Why
Keystroke timing patterns can identify people (keystroke-dynamics biometrics). Treat raw logs as sensitive.

## Rules
1. **Analytics and error tracking never receive keystroke content or full logs.** Event payloads contain counts, durations, mode, and coarse aggregates only. Configure the error tracker's `beforeSend`/scrubbers to strip typed text and logs.
2. **Composition text is not stored** unless the user explicitly opts in; store timing and character-class counts only.
3. **Raw keystroke logs:** default retention proposal 30 days (configurable), except verified/ranked/flagged results. Aggregates persist until the user deletes their account.
4. **Research/calibration use is opt-in**, anonymized, revocable. Never sell or share raw logs.
5. **Export and delete:** `GET /me/export` (CSV/JSON) and `DELETE /me` remove user data including derived stats; test them.
6. **No third-party trackers** in the typing flow. Use privacy-friendly analytics.
7. **Personal-code import (V1) is client-side only.** Run secret scanning before use; never upload; ephemeral by default.
8. Encrypt in transit and at rest; role-based admin access with audit logs; never log request bodies containing logs.
9. Age policy: **18+ only at launch** (India's DPDP Act treats under-18s as children requiring verifiable parental consent; tracking/behavioral monitoring/targeted ads directed at children are prohibited). Never use typing-rhythm signatures to identify or link accounts (biometric risk).

## Code patterns
- Central `track(event, props)` wrapper with an allowlist of event names and a schema per event (Zod). Reject unknown props at compile time and runtime.
- Central `redact()` for logs/errors.
- Retention job (scheduled) deletes expired raw logs; unit-tested with fake clock.

## Done checklist
- [ ] Analytics events validated against allowlist schemas
- [ ] Error tracker scrubs typed content
- [ ] Retention job + tests
- [ ] Export/delete tested end to end
- [ ] Consent flags stored and respected
