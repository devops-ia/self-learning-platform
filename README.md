# DevOps Learning Platform

Interactive learning platform for Terraform and Kubernetes. Learn by fixing broken code, not by reading docs.

## Overview

### Platform Screenshots

<table>
<tr>
<td><strong>Home</strong></td>
<td><strong>Progress tracking</strong></td>
</tr>
<tr>
<td><img src="assets/home.png" alt="Home" width="350"/></td>
<td><img src="assets/path-example.png" alt="Learning Path" width="350"/></td>
</tr>
<tr>
<td><strong>Kubernetes exercise</strong></td>
<td><strong>Terraform exercise</strong></td>
</tr>
<tr>
<td><img src="assets/kubernetes-example.png" alt="Kubernetes Exercise" width="350"/></td>
<td><img src="assets/terraform-example.png" alt="Terraform Exercise" width="350"/></td>
</tr>
</table>

## Features

- **Interactive exercises** with a code editor (Monaco), simulated terminal (xterm.js), and instant feedback
- **Terraform module: fix provider misconfigurations, declare missing variables
- **Kubernetes module: fix invalid Pod YAML, debug CrashLoopBackOff
- **Progress tracking: exercises unlock sequentially as you complete prerequisites
- **Realistic simulation: terminal commands produce output identical to real `terraform` and `kubectl` CLI

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- SQLite via Drizzle ORM + better-sqlite3
- Monaco Editor (`@monaco-editor/react`)
- xterm.js (`@xterm/xterm`)

## Prerequisites

- Node.js 18+
- npm

## Local Development

```bash
# Install dependencies
npm install

# Create the SQLite database
npm run db:seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Create/reset database tables |

## Production Deployment

### Option 1: Node.js Server

```bash
# Install dependencies
npm ci

# Create the database
npm run db:seed

# Build the application
npm run build

# Start the production server
npm run start
```

The app runs on port 3000 by default. Set `PORT` environment variable to change it.

## Docker

Production-ready Docker setup with multi-stage build, health checks, and persistent SQLite database.

### Quick Start

```bash
# Build and run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

App URL: `http://localhost:3000` (or `http://<your-host>:3000` if on a remote server).

### Docker CLI

```bash
# Build the image
docker build -t learning-platform:latest .

# Run the container with persistent database
docker run -d \
  -p 3000:3000 \
  -v learning-platform-data:/app/data \
  --name learning-platform \
  learning-platform:latest

# View logs
docker logs -f learning-platform

# Stop and remove
docker stop learning-platform
docker rm learning-platform
```

### Configuration: Host and Port

Control the listening address and port via environment variables in `docker-compose.yml`:

```bash
# Use default (0.0.0.0:3000 - all interfaces)
docker-compose up -d --build

# Use specific port
PORT=8080 docker-compose up -d --build

# Use specific host and port
HOST=192.168.1.100 PORT=8080 docker-compose up -d --build
```

The container listens on all interfaces (`0.0.0.0`) by default. Environment variables:

- `HOST` — host interface (default `0.0.0.0`)
- `PORT` — port number (default `3000`)
- `NODE_ENV=production` — hard-coded in production builds

### Architecture

**Multi-stage Docker build** (3 stages):

1. **builder: Installs build deps, compiles Next.js app, compiles `better-sqlite3` (~500MB, discarded)
2. **db-init: Preserves database schema and dependencies (~200MB, discarded)
3. **runner: Minimal Alpine base with production artifacts only (~350MB, final image)

**Key features:**

- Non-root user (`nextjs:1001`) for security
- `dumb-init` for proper signal handling (SIGTERM/SIGINT)
- `scripts/seed.js` initializes SQLite schema on container startup
- SQLite WAL mode for better concurrency
- Health check runs every 30 seconds

### Database Management

**Location in container:** `/app/data/learning-platform.db`

**Backup / restore:**

```bash
# Backup the database
docker cp learning-platform:/app/data/learning-platform.db ./backup.db

# Restore the database
docker cp ./backup.db learning-platform:/app/data/learning-platform.db
docker restart learning-platform
```

**Reset database (destructive):**

```bash
docker-compose down -v
docker-compose up -d --build
```

### Troubleshooting

**Container won't start:**

```bash
# Check logs
docker-compose logs --tail=100 learning-platform

# If database is locked or corrupted, remove the volume
docker-compose down
docker volume rm learning-platform_learning-platform-data
docker-compose up -d --build
```

**Inspect database:**

```bash
docker cp $(docker-compose ps -q learning-platform):/app/data/learning-platform.db ./backup.db
sqlite3 backup.db ".schema"
```

**Permission errors:**

```bash
docker exec -it learning-platform sh
chown -R nextjs:nodejs /app/data
```

## Project Structure

- `src/app/`: Next.js App Router pages and API routes with automatic file-based routing
- `src/components/`: Reusable React components organized by functional domain
- `src/lib/`: Core business logic: exercises, validators, database, utilities, and hooks
- `scripts/`: Helper scripts for database setup and server initialization

## License

MIT
