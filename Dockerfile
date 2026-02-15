ARG BASE_IMAGE=node:25-alpine

##
# builder
##
FROM ${BASE_IMAGE} AS builder

# dependencies for native modules (better-sqlite3)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

RUN mkdir -p /app/data

# dependency files
COPY package*.json ./
COPY tsconfig.json ./

# dependencies
RUN npm ci --prefer-offline --no-audit

# source code
COPY src ./src
COPY scripts ./scripts
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY drizzle.config.ts ./

# build app
RUN npm run build

# compile seed script to CJS for Docker runtime (no tsx needed)
RUN npx esbuild src/lib/db/seed.ts \
    --bundle \
    --platform=node \
    --outfile=scripts/docker-seed.cjs \
    --external:better-sqlite3 \
    --external:argon2 \
    --format=cjs

##
# database
##
FROM ${BASE_IMAGE} AS db-init

RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --only=production

COPY src/lib/db ./src/lib/db
COPY drizzle.config.ts ./

RUN mkdir -p /app/data

##
# runtime
##
FROM ${BASE_IMAGE} AS runner

# runtime dependencies only
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# copy database initialization from db-init stage
COPY --from=db-init --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=db-init --chown=nextjs:nodejs /app/src/lib/db ./src/lib/db
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=db-init --chown=nextjs:nodejs /app/drizzle.config.ts ./

# create data directory for SQLite database
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data

# healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/ || exit 1

EXPOSE ${PORT}

# dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# non-root user
USER nextjs

# start the Next.js application
# wrapper script to ensure binding to HOST:PORT
CMD ["sh", "-c", "node ./scripts/docker-seed.cjs 2>/dev/null || true && node ./scripts/start-server.js"]
