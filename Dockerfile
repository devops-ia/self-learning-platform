# =======================
# Stage 1: Builder
# =======================
FROM node:24-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

WORKDIR /app

# Create data directory for database
RUN mkdir -p /app/data

# Copy dependency files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY src ./src
COPY scripts ./scripts
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY drizzle.config.ts ./

# Build application
RUN npm run build

# Compile seed script to CJS for Docker runtime (no tsx needed)
RUN npx esbuild src/lib/db/seed.ts --bundle --platform=node --outfile=scripts/docker-seed.cjs --external:better-sqlite3 --external:argon2 --format=cjs

# =======================
# Stage 2: Database Init
# =======================
FROM node:24-alpine AS db-init

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --only=production

COPY src/lib/db ./src/lib/db
COPY drizzle.config.ts ./

# Create database directory
RUN mkdir -p /app/data

# =======================
# Stage 3: Runtime
# =======================
FROM node:24-alpine AS runner

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy database initialization from db-init stage
COPY --from=db-init --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=db-init --chown=nextjs:nodejs /app/src/lib/db ./src/lib/db
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=db-init --chown=nextjs:nodejs /app/drizzle.config.ts ./

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/ || exit 1

EXPOSE ${PORT}

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Switch to non-root user
USER nextjs

# Start the Next.js application
# Use wrapper script to ensure binding to HOST:PORT
CMD ["sh", "-c", "node ./scripts/docker-seed.cjs 2>/dev/null || true && node ./scripts/start-server.js"]
