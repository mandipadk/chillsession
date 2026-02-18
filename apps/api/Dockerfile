FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/protocol/package.json packages/protocol/package.json
RUN pnpm install --filter @chillspace/api... --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @chillspace/protocol build
RUN pnpm --filter @chillspace/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4001
CMD ["./apps/api/node_modules/.bin/tsx", "apps/api/src/index.ts"]
