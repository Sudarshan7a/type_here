# RealType

Typing trainer web app (working title). Goal: **diagnose → drill → retest**, with a language-agnostic programmer track. Adults only (18+).

## Status

Phase 0 — Validate + Set Up (see `docs/BUILD-ROADMAP-START-TO-END.md`). Nothing user-facing is built yet; the repo is being scaffolded task by task (M0-xx), one task per merge, on branches, never directly to main.

## Structure

| Path | Purpose |
|---|---|
| `apps/web` | User-facing React + TypeScript SPA (Vite) |
| `apps/api` | Node.js + TypeScript API server |
| `packages/engine` | Framework-agnostic typing engine + metrics (shared client/server), MIT |
| `packages/schemas` | Shared Zod data contracts, MIT |
| `e2e` | Playwright end-to-end tests |
| `content` | Practice material + license register (gate-enforced) |
| `docs/` | Project documentation, spec copies, deep-dive chapters, content library |
| `docs/spec/` | Product truth: master spec, implementation guide, playbooks |
| `docs/decisions/` | Decision Log + architecture decision records |
| `.opencode/` | OpenCode project skills, subagents, slash commands |

## Commands

Wired up when the M0-10 scaffold lands; documented here as the target set:

```bash
pnpm install        # install all workspace packages
pnpm dev            # dev servers (web + api)
pnpm test           # unit tests (engine, schemas, api, web)
pnpm e2e            # Playwright e2e suite
pnpm lint           # lint all packages
pnpm typecheck      # TypeScript strict checks, all packages
pnpm build          # production builds
```

## License

Open-core (Decision D2, confirmed): `packages/engine` and `packages/schemas` are MIT-licensed (see their LICENSE files). Everything else in this repository — `apps/`, `content/`, docs — is proprietary, all rights reserved. Third-party assets are attributed in `NOTICE.md`.

## Ground rules

See `AGENTS.md` for the non-negotiables (typing surface is sacred; metrics live only in the engine; privacy; licensing; accessibility; adults only; no outcome promises in copy). The build sequence and content corrections live in `docs/MASTER-BUILD-CONTRACT.md`.
