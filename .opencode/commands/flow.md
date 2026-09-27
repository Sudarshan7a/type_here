---
description: Turn a user flow into a state machine, Mermaid diagram, and e2e test plan
agent: plan
---
Flow: $ARGUMENTS

1. Read the relevant flow and page specs in `docs/spec/master-spec-v1.md` (sections 4.3–4.4 only).
2. Produce: states, events, guards, and side effects as a table; a Mermaid `stateDiagram-v2`; the analytics events fired (names only, no typed content); empty/error/offline states.
3. Propose the Playwright test plan (happy path + 3 failure paths) using `typing-e2e-testing`.
Do not write code yet.
