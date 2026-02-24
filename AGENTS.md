# Chillspace Development Guide

See `README.md` for monorepo layout, quick start, and local ports.

## Cursor Cloud specific instructions

### Infrastructure

PostgreSQL 16 and Redis 7 must be running before starting app services. Start them with:

```sh
cd infra && docker compose up -d postgres redis
```

Docker must be installed and the daemon running. In the Cloud Agent VM, the Docker daemon needs `fuse-overlayfs` storage driver and `iptables-legacy` (already configured in the VM snapshot).

### Starting dev servers

```sh
pnpm dev          # starts web (3000), api (4001), realtime (4002) in parallel
```

Or individually via `pnpm --filter @chillspace/<app> dev`.

### Env files

Env templates must be copied before first run (idempotent — skip if already present):

- `apps/api/.env.example` → `apps/api/.env`
- `apps/realtime/.env.example` → `apps/realtime/.env`
- `apps/web/.env.example` → `apps/web/.env.local`

### Lint

Only `apps/web` has real lint (`next lint`); all other packages echo a no-op. ESLint 8 + `eslint-config-next@^15.5` are required dev dependencies in `apps/web`, and the config lives at `apps/web/.eslintrc.json`.

Run all linters: `pnpm lint`

### Typecheck / Build / Test

```sh
pnpm typecheck    # tsc --noEmit across all packages
pnpm build        # full production build (shared packages must build before apps)
pnpm test         # runs vitest for @chillspace/protocol; other packages echo no-op
```

### Gotchas

- LiveKit (`docker compose up -d livekit`) is optional for dev; voice/video features won't work without it but the rest of the app is fully functional.
- The Colyseus `@colyseus/core` peer dependency warnings about `zod@^4` and `@colyseus/schema@^4` are benign — the app works with the pinned versions.
- Shared packages (`packages/protocol`, `packages/game`, `packages/music`) emit to `dist/` and must be built once (`pnpm build`) before the first `pnpm dev` if hot-reload doesn't pick up changes from source. After the initial build, `tsx watch` in the app services handles incremental reloads.
- The Phaser game in `WorldViewport` is sensitive to React re-render cycles. Callbacks passed to it (`onMoveInput`, `onInteract`, `onViewportResize`) must be memoized with `useCallback` or stored in refs to prevent the game from being destroyed/recreated on every state update.
- When deleting `.next/` to force recompile, the running `next dev` process may not recover — kill and restart it.
- `vitest` is installed at the workspace root. Test files in `dist/` directories will also be picked up; this is harmless but doubles the test count in packages that have been built.
