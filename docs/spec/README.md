# Product spec

`master-spec-v1.md` is the product source of truth (requirements, flows, metrics).

- Requirement IDs (ENG-01, LRN-03, PRG-10 ...) are the unit of work.
- Do NOT add this file to `instructions` in opencode.json: it is long and would waste context in every session.
  Agents read the needed sections on demand (see AGENTS.md).
- If you change the spec, bump its version and note the change in the changelog section you add at the top.
