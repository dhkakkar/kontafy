# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/website/package.json ./apps/website/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY --from=deps /app/ ./

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @kontafy/website build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/website/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/static ./apps/website/.next/static

USER nextjs
EXPOSE 5000
ENV PORT=5000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/website/server.js"]
