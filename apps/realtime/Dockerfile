FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/realtime/package.json apps/realtime/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/music/package.json packages/music/package.json
RUN pnpm install --filter @chillspace/realtime... --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @chillspace/protocol build
RUN pnpm --filter @chillspace/music build
RUN pnpm --filter @chillspace/realtime build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/realtime/dist ./apps/realtime/dist
COPY --from=builder /app/apps/realtime/src ./apps/realtime/src
COPY --from=builder /app/apps/realtime/package.json ./apps/realtime/package.json
COPY --from=builder /app/apps/realtime/node_modules ./apps/realtime/node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4002
CMD ["./apps/realtime/node_modules/.bin/tsx", "apps/realtime/src/index.ts"]
