# Development Guide

This guide covers Docker-based development workflows for the learning platform.

## Docker Compose for Development

Docker Compose provides a development environment with hot reload support. Create a `docker-compose.yml` file in the project root:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      # Mount source code for hot reload
      - ./src:/app/src
      - ./exercises:/app/exercises
      - ./scripts:/app/scripts

      # Mount config files
      - ./next.config.ts:/app/next.config.ts
      - ./tsconfig.json:/app/tsconfig.json
      - ./package.json:/app/package.json

      # Persist database
      - ./data:/app/data

      # Prevent overwriting node_modules
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - PORT=3000
      - HOST=0.0.0.0
    command: npm run dev
    restart: unless-stopped
```

Start the development environment:

```bash
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f
```

Stop services:

```bash
docker-compose down
```

## Building the Docker Image

The project includes a multi-stage Dockerfile optimized for production deployments.

### Stage 1: Builder

Installs all dependencies (including devDependencies) and builds the Next.js application:

- Uses Node.js 24 Alpine base image
- Installs native build dependencies for better-sqlite3 (Python, make, g++, cairo, etc.)
- Runs `npm ci` to install exact dependency versions
- Executes `npm run build` to create optimized production bundle
- Creates `.next/standalone` output for minimal runtime image

### Stage 2: Database Init

Prepares database setup tools:

- Installs production dependencies only
- Copies Drizzle ORM schema and config
- Creates data directory for SQLite database

### Stage 3: Runtime

Final lightweight image for running the application:

- Uses minimal Alpine base with dumb-init for proper signal handling
- Creates non-root user (nextjs:nodejs) for security
- Copies only the built application and necessary files
- Runs database seed script on startup (fails gracefully if already seeded)
- Exposes port 3000
- Includes health check endpoint

Build the image manually:

```bash
docker build -t learning-platform:latest .
```

Or use the Makefile:

```bash
make docker-build
```

## Database in Docker

### Persistence

The SQLite database is stored in `/app/data/learning-platform.db` inside the container.

For persistent data across container restarts:

**With Docker CLI:**

```bash
docker run -d \
  -p 3000:3000 \
  -v learning-platform-data:/app/data \
  --name learning-platform \
  learning-platform:latest
```

**With Docker Compose:**

```yaml
volumes:
  - ./data:/app/data
```

This mounts your local `./data` directory to `/app/data` in the container.

### Initialization

The container automatically runs the seed script on startup:

```bash
node ./scripts/seed.js 2>/dev/null || true
```

This creates tables if they don't exist. If the database is already initialized, the script exits gracefully.

### Host Access

When using a volume mount to `./data`, you can access the database from your host:

```bash
sqlite3 data/learning-platform.db
```

Run queries:

```sql
SELECT * FROM modules;
SELECT * FROM exercises WHERE module = 'terraform';
```

### Backup and Restore

Backup the database:

```bash
make docker-db-backup
```

This creates a timestamped backup in `./backups/`.

Restore from latest backup:

```bash
make docker-db-restore
```

## Troubleshooting

### Issue: "Cannot open database file"

**Symptoms:**

```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Cause:** The `data/` directory doesn't exist or the container user doesn't have write permissions.

**Solution:**

1. Create the data directory on host:

   ```bash
   mkdir -p data
   ```

2. If using Docker Compose with bind mount, ensure correct permissions:

   ```bash
   chmod 755 data
   ```

3. If running in Docker, ensure the volume is properly mounted:

   ```bash
   docker run -v ./data:/app/data ...
   ```

### Issue: "Database is locked"

**Symptoms:**

```
Error: SQLITE_BUSY: database is locked
```

**Cause:** Multiple processes are trying to write to the database simultaneously, or a previous connection didn't close properly.

**Solution:**

1. Restart the container:

   ```bash
   docker restart learning-platform
   ```

2. If the issue persists, stop all containers and remove the lock:

   ```bash
   docker-compose down
   rm data/learning-platform.db-shm data/learning-platform.db-wal
   docker-compose up -d
   ```

3. For development, ensure you're not running `npm run dev` on the host and in Docker simultaneously.

### Issue: "Module not found" errors

**Symptoms:**

```
Error: Cannot find module '@/components/...'
```

**Cause:** node_modules weren't installed inside the container, or the build failed.

**Solution:**

1. Rebuild the image from scratch:

   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. Check that package.json hasn't changed. If it has, rebuild:

   ```bash
   make docker-build
   ```

### Issue: Changes not reflecting in development

**Symptoms:** Code changes don't appear in the running application.

**Cause:** Volume mounts are not configured correctly, or Next.js hot reload isn't working.

**Solution:**

1. Verify volume mounts in docker-compose.yml include `./src:/app/src`

2. Check Next.js is running in development mode:

   ```yaml
   environment:
     - NODE_ENV=development
   command: npm run dev
   ```

3. Restart the container:

   ```bash
   docker-compose restart
   ```

4. If using Docker Desktop on macOS/Windows, ensure file sharing is enabled for the project directory.

### Issue: Port 3000 already in use

**Symptoms:**

```
Error: bind: address already in use
```

**Cause:** Another process is using port 3000.

**Solution:**

1. Stop the conflicting process:

   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. Or change the port in docker-compose.yml:

   ```yaml
   ports:
     - "3001:3000"
   ```

3. Access the app at <http://localhost:3001>

### Issue: Out of disk space

**Symptoms:**

```
Error: no space left on device
```

**Cause:** Docker images, containers, or volumes are consuming too much disk space.

**Solution:**

1. Remove unused Docker resources:

   ```bash
   docker system prune -a
   ```

2. Remove specific volumes:

   ```bash
   docker volume ls
   docker volume rm learning-platform-data
   ```

3. For macOS/Windows Docker Desktop, increase the disk size limit in Settings > Resources > Disk image size.
