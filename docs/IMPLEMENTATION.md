# Chillspace v1 Implementation Notes

## What is implemented
- Monorepo (`apps/*`, `packages/*`, `infra/*`) with TypeScript workspaces.
- Shared protocol contracts and Zod schemas in `packages/protocol`.
- Music provider/sync utilities in `packages/music`.
- Phaser world package with deterministic hooks in `packages/game`.
- API server (`apps/api`) with:
  - `POST /api/rooms`
  - `POST /api/rooms/:roomId/invites`
  - `POST /api/session/join`
  - `GET /api/rooms/:roomId/bootstrap`
  - `POST /api/music/queue`
  - `POST /api/music/control`
  - `POST /api/moderation/action`
  - Postgres-backed room/invite/moderation persistence
  - Redis-backed room snapshot fallback for bootstrap recovery
- Realtime server (`apps/realtime`) with Colyseus room authority and messages:
  - Client->Server: `input.move`, `chat.send`, `music.enqueue`, `music.control`, `music.voteSkip`, `game.action`, `presence.webcamToggle`, `moderation.request`
  - Server->Client: `state.patch`, `chat.message`, `music.state`, `music.timelineSync`, `game.state`, `moderation.event`, `presence.event`
- Mini-games in realtime:
  - Chess (`chess.js` backend)
  - Tic-Tac-Toe
  - Pictionary state machine
- Web app (`apps/web`) with:
  - Room creation home page
  - Join page with invite token
  - Phaser world rendering and input forwarding
  - LiveKit mic/camera toggles
  - Proximity voice attenuation + stereo panning with WebAudio
  - Webcam video bubbles rendered over avatars in-world
  - Chat panel
  - Shared music queue panel (licensed/spotify/youtube embeds)
  - Mini-game control panels
  - Host/DJ moderation controls
- Infra scaffolding:
  - `infra/docker-compose.yml`
  - `infra/livekit.yaml`
  - app Dockerfiles
  - env template `infra/.env.example`

## Current architectural constraints
- Realtime room snapshots are persisted in Redis with TTL and restored on room reactivation, but true multi-region conflict handling is not implemented.
- API persistence is implemented in Postgres; room-level horizontal sharding is not yet implemented.
- Spotify and YouTube support are wired as queue sources and embeds; policy/legal enforcement is left to deployment governance.

## Local run
1. Start dependencies (`postgres`, `redis`, and optionally `livekit`) or run `cd infra && docker compose up -d postgres redis livekit`.
2. `cp apps/api/.env.example apps/api/.env`
3. `cp apps/realtime/.env.example apps/realtime/.env`
4. `cp apps/web/.env.example apps/web/.env.local`
5. `pnpm install`
6. `pnpm dev`

Services expected:
- Web: `http://localhost:3000`
- API: `http://localhost:4001`
- Realtime: `ws://localhost:4002`

## Validation executed
- `pnpm typecheck` ✅
- `pnpm build` ✅
