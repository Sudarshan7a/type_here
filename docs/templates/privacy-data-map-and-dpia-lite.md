# Privacy Data Map and DPIA-Lite

*Working document, not legal advice. Have a professional review before launch (India's DPDP Act 2023 and Rules 2025; GDPR/UK GDPR if you serve those users).*

## 1. Launch stance
- **18+ only at launch** (under 18 = child in India; verifiable parental consent would be required otherwise)
- No tracking or targeted advertising; no third-party trackers in the typing flow
- Never use typing-rhythm signatures to identify or link accounts

## 2. Data map (keep current)
| Data | Purpose | Where stored | Retention | Who can access | Identifies a person? | Consent basis |
|---|---|---|---|---|---|---|
| Account (email, auth IDs) | Sign-in | Auth provider + DB | Until deletion | Admin (limited) | Yes | Notice + consent |
| Result summaries (metrics) | Show progress | DB | Until deletion | User; admin (limited) | Linked to account | Notice |
| Keystroke logs (timing + key codes) | Recompute/verify; replay | DB/object store | 30 days (verified/flagged excepted) | Systems; audited admin | Can be identifying in aggregate | Notice; research use = separate opt-in |
| Key/bigram/token aggregates | Weakness profile | DB | Until deletion | User; systems | Linked to account | Notice |
| Settings, goals, plans | Personalization | DB + local | Until deletion | User | Linked | Notice |
| Composition text | Draft Sprint (V1) | Local only by default | Not stored unless opted in | User | Yes if stored | Separate opt-in |
| Analytics events (counts, modes) | Improve product | Analytics tool | ___ | Team | Pseudonymous | Notice |
| Error reports (scrubbed) | Fix bugs | Error tracker | ___ | Team | No typed content | Notice |
| Support messages | Help | Inbox | ___ | Team | Yes | Notice |
| Payment data (V1) | Billing | Payment provider only | Per provider | Provider | Yes | Contract |

## 3. Retention schedule (must be a real, tested job)
Raw logs 30 days · sessions short TTL · analytics ___ · backups ___ · deleted accounts: purge after ___ days.

## 4. DPIA-lite (answer for each new feature that touches user data)
1. What data does it collect or derive?
2. Why is it needed? Can we do it with less?
3. How long do we keep it?
4. Who can see it (including admins)?
5. Could it identify someone or reveal sensitive information?
6. What if it leaked? What is the worst outcome?
7. Do we need new consent or notice text?
8. How does the user access, export, or delete it?
Decision: Approve / Approve with changes / Reject. Reviewer: ______ Date: ______

## 5. Rights requests log (access, correction, erasure, withdrawal)
| Date received | Type | Identity verified | Action | Date completed | Within SLA? |
|---|---|---|---|---|---|
Target: complete in days, well inside the 90-day legal maximum reported for India. **[verify]**

## 6. Processors / vendors
| Vendor | Purpose | Data shared | Location | Agreement signed | Notes |
|---|---|---|---|---|---|

## 7. Breach plan (one page; drill once)
1. **Detect** (alerts, reports) -> 2. **Contain** (revoke keys, isolate) -> 3. **Assess** (what data, who, how many) -> 4. **Notify** (regulator and affected users within legal timelines; reported 72-hour window in India runs from awareness **[verify]**) -> 5. **Fix and prevent** -> 6. **Postmortem** (blameless).
Contacts: ______ (owner) ______ (legal) ______ (host support)

## 8. Privacy-by-design checks (every release)
- [ ] Canary test: typed text never appears in analytics or error tracking
- [ ] Analytics allowlist enforced
- [ ] Retention job ran; expired logs deleted
- [ ] Export and delete tested
- [ ] Admin access logged
- [ ] Policy text still matches behavior

## 9. Grievance/contact
Published contact for privacy questions: ______ Response target: ______
