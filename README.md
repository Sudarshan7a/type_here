# RealType

Typing trainer web app (working title). Goal: **diagnose → drill → retest**, with a language-agnostic programmer track. Adults only (18+).

## Status

Phase 1 — Core Engine and Metrics (see `docs/BUILD-ROADMAP-START-TO-END.md`).
The engine in `packages/engine` is complete and its metrics are live in the web
app's developer test surface. The product flow — test modes, saved results,
accounts, the weakness model and drills — is not built yet.

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

```bash
pnpm install        # install all workspace packages
pnpm dev            # web + api dev servers, in parallel (Ctrl-C stops both)
pnpm test           # unit tests (engine, schemas, telemetry, api, web, fixture-recorder)
pnpm e2e            # Playwright e2e suite
pnpm lint           # lint all packages
pnpm typecheck      # TypeScript strict checks, all packages
pnpm build          # production builds
```

## Run it yourself

```bash
pnpm install                    # once
pnpm dev                        # starts both servers
```

Then open <http://localhost:5173>.

`pnpm dev` starts two servers:

| Service | URL | What it is |
|---|---|---|
| `apps/web` | <http://localhost:5173> | The React app |
| `apps/api` | <http://localhost:3000> | The API; `/health` returns `{"status":"ok", ...}` |

To run just one, use its workspace directly:

```bash
pnpm --dir apps/web dev         # web only
pnpm --dir apps/api dev         # api only
```

On the web page: pick a passage, press **Start**, then type the passage shown.
Characters mark correct or wrong as you type, and a results panel reports net /
raw / gross WPM, keystroke and final accuracy, KSPC, consistency, best 5-second
burst, mean key interval and rollover — all computed by `packages/engine`. Press
**Tab** to restart.

Note: this is a developer test surface for the engine, not the product flow.
Nothing is saved or sent anywhere.

## License

Open-core (Decision D2, confirmed): `packages/engine` and `packages/schemas` are MIT-licensed (see their LICENSE files). Everything else in this repository — `apps/`, `content/`, docs — is proprietary, all rights reserved. Third-party assets are attributed in `NOTICE.md`.

## Ground rules

See `AGENTS.md` for the non-negotiables (typing surface is sacred; metrics live only in the engine; privacy; licensing; accessibility; adults only; no outcome promises in copy). The build sequence and content corrections live in `docs/MASTER-BUILD-CONTRACT.md`.
