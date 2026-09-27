# Content Brief and Audit

## Style guide (prose passages)
- Length 20-120 words; mixed sentence lengths; natural punctuation; some digits, names, and simple URLs (example domains only)
- Varied domains: email, notes, instructions, explanations, stories, technical writing
- No PII, brands with trademark risk, sensitive topics, or clichés; culturally neutral references
- Read-aloud test: does it sound like a person wrote it?

## Item record
| Field | Value |
|---|---|
| Item ID | |
| Type | prose / quote / snippet / recall idiom / generator set |
| Language / skin | |
| Source | original / public domain (URL) / permissive (repo, commit) |
| License + register entry ID | |
| Attribution text | |
| Length band | short / medium / long |
| Difficulty band (typability) | easy / typical / hard |
| Character mix (upper, digits, symbols) | |
| Token mix (code) | |
| Filters passed | offensive / PII / secrets / duplicate |
| Syntax validation (code) | pass / fail |
| Reviewer 1 / Reviewer 2 | |
| Status | draft / reviewed / live / retired |

## Batch workflow (per ~50 items)
1. Brief -> 2. Draft (AI-assisted OK) -> 3. Human edit of every item -> 4. License check -> 5. Filters -> 6. Difficulty tags (aim for a roughly even Easy/Typical/Hard mix) -> 7. Read-aloud pass -> 8. Second-person sample audit (10-20%) -> 9. Publish with version.

## Programmer content review (per language, by a practicing programmer)
- [ ] Snippet is realistic and idiomatic
- [ ] Idioms/recall items are correct and short (3-8 lines)
- [ ] Naming vocabulary and numeric/ID formats valid
- [ ] All symbols reachable on target layouts
- [ ] Synthetic IPs use documentation ranges; no real secrets or tokens

## Audit log
| Date | Batch | Sample size | Defects found | Types | Action |
|---|---|---|---|---|---|

## Monthly content health
Skip-rate outliers · error hotspots by item (never typed text) · user reports · items to retire · license register check · takedown requests.

## License register columns
Asset ID - type - source URL - license - license text saved (Y/N) - allowed use - attribution - date checked - reviewer - decision.
**Do not copy** from GPL/AGPL sources (for example, Monkeytype assets).
