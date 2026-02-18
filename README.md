# Chillspace

Chillspace is a private invite-only virtual study space with:
- 2D avatar world
- proximity voice via LiveKit
- optional webcam bubbles
- room chat + moderation
- shared music queue (licensed streams, Spotify control, YouTube embeds)
- mini-games (Chess, Tic-Tac-Toe, Pictionary)

## Monorepo Layout
- `apps/web`: Next.js client + Phaser world UI
- `apps/api`: REST API for invites/session/bootstrap/music/moderation
- `apps/realtime`: Colyseus authoritative room server
- `packages/protocol`: shared schemas and contracts
- `packages/game`: Phaser scenes/systems
- `packages/music`: provider adapters and sync logic
- `infra`: docker compose and env templates

## Quick start
1. Copy env templates:
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/realtime/.env.example apps/realtime/.env`
   - `cp apps/web/.env.example apps/web/.env.local`
2. Install: `pnpm install`
3. Run all services: `pnpm dev`
4. Open `http://localhost:3000`

## Build validation
- `pnpm typecheck`
- `pnpm build`

## Docker (self-host LiveKit fallback profile)
- `cd infra && docker compose up --build`

## Local ports
- Web: `http://localhost:3000`
- API: `http://localhost:4001`
- Realtime (Colyseus): `ws://localhost:4002`
