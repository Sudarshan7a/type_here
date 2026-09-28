<!--
Pull request template — RealType. One task ID per PR (bounded autonomy).
Cite the requirement ID(s) from the spec this PR implements.
-->

## Task

- Task ID (e.g. M1-03): <!-- required -->
- Requirement ID(s) (e.g. ENG-02): <!-- required -->

## Summary

<!-- Plain-language: what changed and why. 2-5 sentences. -->

## Verification

<!-- How this was verified. Attach command output summaries. -->

- [ ] `pnpm lint` green
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` green (new tests added with the change)
- [ ] `pnpm build` green
- [ ] CI green on this branch

## Does this PR touch the API? (If yes, complete the §8.10 security checklist)

- [ ] All inputs validated with shared schemas; size limits enforced
- [ ] Authentication and authorization checks on every non-public route
- [ ] Rate limits applied; anonymous limits stricter
- [ ] No sensitive data in logs, errors, analytics, or URLs (keystroke content never leaves the client)
- [ ] Session nonce single-use and expiring
- [ ] Server recompute is authoritative
- [ ] Secrets only in environment/secret store; rotated on exposure
- [ ] Security headers and content-security policy correct
- [ ] Dependencies audited; licenses checked
- [ ] Admin actions audited; least privilege
- [ ] Retention, export, and deletion tested
- [ ] Content sanitized for display; no code execution paths

## Stop conditions (Section 9)

Does this PR change a metric formula, privacy behavior, an integrity threshold, payment processing, or legal-page text?

- [ ] No — none of these are touched
- [ ] Yes — human approval was obtained (link it here)

## Definition of Done

- [ ] Reviewed diff; small PR tied to one requirement ID
- [ ] Unit and e2e tests where applicable; no test weakened to pass
- [ ] Accessibility check for UI changes
- [ ] Performance budget respected
- [ ] Metrics docs updated if any formula changed (+ modelVersion bump)
- [ ] Privacy review: no typed content in analytics or logs
- [ ] Feature flag and rollback plan for user-facing changes
