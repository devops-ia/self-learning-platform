# Production Deployment Guide

This guide covers deploying the DevOps Learning Platform to production using Docker, Node.js, or container orchestration platforms.

## Pre-deployment Checklist

Before deploying to production, ensure you have configured the following:

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Encryption key for session cookies. **MUST be 32+ random characters.** | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Strong password for admin user | `SecureP@ssw0rd!2026` |
| `BASE_URL` | Public URL of your deployment (used for OAuth callbacks, WebAuthn) | `https://devops.example.com` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@devopslab.local` | Admin user email |
| `SESSION_TTL` | `604800` (7 days) | Session lifetime in seconds |
| `NEXT_PUBLIC_REGISTRATION_ENABLED` | `true` | Set to `"false"` to disable new user sign-ups |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Set to `"true"` to hide auth UI and show Demo badge |
| `TOTP_ISSUER` | `DevOps Learning Platform` | Name shown in 2FA authenticator apps |

### SMTP Configuration (Optional)

Configure SMTP to enable email verification and password reset features:

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | — | SMTP server hostname (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`) |
| `SMTP_PORT` | `587` | SMTP server port (587 for STARTTLS, 465 for TLS) |
| `SMTP_USER` | — | SMTP authentication username |
| `SMTP_PASS` | — | SMTP authentication password or API key |
| `SMTP_FROM` | `noreply@devopslab.local` | Sender email address |
| `SMTP_SECURE` | `false` | Set to `true` for port 465 (TLS), `false` for port 587 (STARTTLS) |

### OAuth Providers (Optional)

Configure OAuth providers to enable social login:

```bash
# Google
OAUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=your-secret

# GitHub
OAUTH_GITHUB_CLIENT_ID=your-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-secret

# Azure AD
OAUTH_AZURE_CLIENT_ID=your-client-id
OAUTH_AZURE_CLIENT_SECRET=your-secret
OAUTH_AZURE_TENANT=common
```

## Docker Deployment (Recommended)

### 1. Create Production docker-compose.yml

Create a production-ready `docker-compose.yml`:

```yaml
services:
  learning-platform:
    image: learning-platform:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: learning-platform
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      HOST: 0.0.0.0

      # Session (REQUIRED)
      SESSION_SECRET: ${SESSION_SECRET}
      SESSION_TTL: 604800

      # Base URL (REQUIRED for OAuth/WebAuthn)
      BASE_URL: https://devops.example.com

      # Admin user
      ADMIN_EMAIL: ${ADMIN_EMAIL:-admin@devopslab.local}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}

      # SMTP (optional)
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      SMTP_FROM: ${SMTP_FROM:-noreply@devopslab.local}
      SMTP_SECURE: ${SMTP_SECURE:-false}

      # OAuth (optional)
      OAUTH_GOOGLE_CLIENT_ID: ${OAUTH_GOOGLE_CLIENT_ID:-}
      OAUTH_GOOGLE_CLIENT_SECRET: ${OAUTH_GOOGLE_CLIENT_SECRET:-}
      OAUTH_GITHUB_CLIENT_ID: ${OAUTH_GITHUB_CLIENT_ID:-}
      OAUTH_GITHUB_CLIENT_SECRET: ${OAUTH_GITHUB_CLIENT_SECRET:-}

      # Feature flags
      NEXT_PUBLIC_REGISTRATION_ENABLED: ${REGISTRATION_ENABLED:-true}
      NEXT_PUBLIC_DEMO_MODE: ${DEMO_MODE:-false}

    volumes:
      # Persist SQLite database
      - learning-platform-data:/app/data

    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://127.0.0.1:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

    security_opt:
      - no-new-privileges:true

    # Resource limits (adjust based on your needs)
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

volumes:
  learning-platform-data:
    driver: local
```

### 2. Create .env File

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
# Generate a secure session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123!

# SMTP (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@example.com

# OAuth (optional)
# OAUTH_GOOGLE_CLIENT_ID=
# OAUTH_GOOGLE_CLIENT_SECRET=
```

### 3. Build and Start

```bash
# Build the image
docker compose build

# Start the container
docker compose up -d

# Check logs
docker compose logs -f learning-platform

# Verify health
docker compose ps
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/api/auth/me

# Should return: {"user":null} for anonymous users
```

## Node.js Direct Deployment

For deployments without Docker, you can run the application directly with Node.js.

### 1. Install Dependencies

```bash
# Install production dependencies only
npm ci --only=production

# Build the application
npm run build
```

### 2. Create systemd Service

Create `/etc/systemd/system/learning-platform.service`:

```ini
[Unit]
Description=DevOps Learning Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/learning-platform
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="HOST=0.0.0.0"
EnvironmentFile=/var/www/learning-platform/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=learning-platform

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/learning-platform/data

[Install]
WantedBy=multi-user.target
```

### 3. Create Environment File

Create `/var/www/learning-platform/.env.production`:

```bash
SESSION_SECRET=your-32-char-secret-here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123!
BASE_URL=https://devops.example.com
DB_URL=/var/www/learning-platform/data/learning-platform.db
```

### 4. Enable and Start Service

```bash
# Set proper permissions
sudo chown -R www-data:www-data /var/www/learning-platform
sudo chmod 600 /var/www/learning-platform/.env.production

# Enable and start service
sudo systemctl enable learning-platform
sudo systemctl start learning-platform

# Check status
sudo systemctl status learning-platform

# View logs
sudo journalctl -u learning-platform -f
```

## Reverse Proxy Configuration

### Nginx with HTTPS

Create `/etc/nginx/sites-available/learning-platform`:

```nginx
upstream learning_platform {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name devops.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name devops.example.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/devops.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/devops.example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/learning-platform.access.log;
    error_log /var/log/nginx/learning-platform.error.log;

    # Max upload size
    client_max_body_size 10M;

    # Proxy settings
    location / {
        proxy_pass http://learning_platform;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/learning-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Caddy (Simpler Alternative)

Create `/etc/caddy/Caddyfile`:

```caddy
devops.example.com {
    reverse_proxy localhost:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
    }

    encode gzip
    log {
        output file /var/log/caddy/learning-platform.log
    }
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

Caddy automatically obtains and renews Let's Encrypt certificates.

## TLS/HTTPS with Let's Encrypt

### Using Certbot (for Nginx)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (interactive)
sudo certbot --nginx -d devops.example.com

# Or non-interactive
sudo certbot --nginx -d devops.example.com --non-interactive --agree-tos --email admin@example.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certificates are automatically renewed by a systemd timer. Check status:

```bash
sudo systemctl status certbot.timer
```

### Using Certbot (for Standalone)

If not using Nginx/Caddy, obtain certificates manually:

```bash
# Stop your web server temporarily
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d devops.example.com --email admin@example.com --agree-tos

# Start your web server
sudo systemctl start nginx
```

### Using Docker + Certbot

For Docker deployments with automatic certificate renewal, consider using:

- [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) + [acme-companion](https://github.com/nginx-proxy/acme-companion)
- [Traefik](https://traefik.io/) with Let's Encrypt integration
- [Caddy](https://caddyserver.com/) Docker image with automatic HTTPS

## Database Backup

### Manual Backup

```bash
# Local SQLite backup
sqlite3 /var/www/learning-platform/data/learning-platform.db ".backup /var/backups/learning-platform-$(date +%Y%m%d-%H%M%S).db"

# Docker backup
docker exec learning-platform sqlite3 /app/data/learning-platform.db ".backup /tmp/backup.db"
docker cp learning-platform:/tmp/backup.db ./backup-$(date +%Y%m%d-%H%M%S).db
```

### Automated Backup with Cron

Create `/usr/local/bin/backup-learning-platform.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/learning-platform"
DB_PATH="/var/www/learning-platform/data/learning-platform.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/learning-platform-$TIMESTAMP.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Delete backups older than retention period
find "$BACKUP_DIR" -name "learning-platform-*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Make executable and add to crontab:

```bash
sudo chmod +x /usr/local/bin/backup-learning-platform.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-learning-platform.sh >> /var/log/learning-platform-backup.log 2>&1
```

### Docker Backup Script

Create `backup-docker.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="./backups"
CONTAINER_NAME="learning-platform"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/learning-platform-$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

# Create backup inside container
docker exec "$CONTAINER_NAME" sqlite3 /app/data/learning-platform.db ".backup /tmp/backup.db"

# Copy backup out of container
docker cp "$CONTAINER_NAME:/tmp/backup.db" "$BACKUP_FILE"

# Cleanup temp file in container
docker exec "$CONTAINER_NAME" rm /tmp/backup.db

# Compress
gzip "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "learning-platform-*.db.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Schedule with cron:

```bash
chmod +x backup-docker.sh
crontab -e
0 2 * * * /path/to/backup-docker.sh >> /var/log/learning-platform-backup.log 2>&1
```

### Restore from Backup

```bash
# Stop the service
sudo systemctl stop learning-platform
# or
docker compose stop

# Restore database
gunzip -c /var/backups/learning-platform-20260213-020000.db.gz > /var/www/learning-platform/data/learning-platform.db

# Start the service
sudo systemctl start learning-platform
# or
docker compose start
```

## Monitoring

### Health Check Endpoint

The application provides a health check endpoint at `/api/auth/me`:

```bash
# Should return JSON response
curl http://localhost:3000/api/auth/me

# Expected: {"user":null} or {"user":{...}}
# HTTP 200 = healthy
# HTTP 5xx = unhealthy
```

### Docker Health Check

The Dockerfile includes a built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1
```

Check container health:

```bash
docker ps
# Look for "healthy" status

docker inspect learning-platform --format='{{.State.Health.Status}}'
```

### Log Monitoring

```bash
# Docker logs
docker compose logs -f --tail=100 learning-platform

# Systemd logs
sudo journalctl -u learning-platform -f --lines=100

# Nginx access logs
sudo tail -f /var/log/nginx/learning-platform.access.log

# Check for errors
docker compose logs learning-platform | grep -i error
sudo journalctl -u learning-platform | grep -i error
```

### Uptime Monitoring

Use external monitoring services to check availability:

- [UptimeRobot](https://uptimerobot.com/) - Free tier available
- [Healthchecks.io](https://healthchecks.io/) - Cron job monitoring
- [Better Uptime](https://betteruptime.com/)
- Self-hosted: [Uptime Kuma](https://github.com/louislam/uptime-kuma)

Configure monitor to check `https://devops.example.com/` or `/api/auth/me` every 5 minutes.

### Resource Monitoring

```bash
# Docker resource usage
docker stats learning-platform

# System resources
top
htop
```

## Updating the Application

### Docker Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart (with zero downtime using health checks)
docker compose build
docker compose up -d

# Or pull pre-built image
docker compose pull
docker compose up -d

# Check logs for errors
docker compose logs -f learning-platform

# Verify health
curl http://localhost:3000/api/auth/me
```

### Node.js Deployment

```bash
# Pull latest changes
cd /var/www/learning-platform
git pull origin main

# Install dependencies and rebuild
npm ci --only=production
npm run build

# Restart service
sudo systemctl restart learning-platform

# Check status
sudo systemctl status learning-platform
```

### Rolling Back

```bash
# Docker: use previous image
docker compose down
docker tag learning-platform:latest learning-platform:backup
docker compose up -d

# Git: revert to previous commit
git log --oneline -n 10
git checkout <commit-hash>
npm ci --only=production
npm run build
sudo systemctl restart learning-platform
```

## Security Hardening

### Non-Root Docker User

The Dockerfile already runs as non-root user (UID 1001):

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs
```

Verify:

```bash
docker exec learning-platform whoami
# Should output: nextjs
```

### Built-in Rate Limiting

The application includes built-in rate limiting for authentication endpoints:

- Login: 5 attempts per 15 minutes per IP
- Registration: 3 attempts per hour per IP
- Password reset: 3 attempts per hour per email

Rate limit data is stored in the `rate_limits` database table and automatically expires.

### Session Rotation

Sessions are automatically rotated on:

- Login
- Privilege escalation
- Password change

Session TTL is configurable via `SESSION_TTL` environment variable (default: 7 days).

### Firewall Rules

Configure UFW (Ubuntu) or firewalld (CentOS/RHEL):

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable

# Only allow localhost to access application port directly
# (use reverse proxy for external access)
sudo ufw deny 3000/tcp

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### Additional Security Recommendations

1. **Keep dependencies updated**

   ```bash
   npm audit
   npm audit fix
   ```

2. **Enable HTTPS everywhere**
   - Use HSTS header (configured in nginx example)
   - Redirect all HTTP to HTTPS

3. **Secure environment variables**

   ```bash
   chmod 600 .env
   chmod 600 .env.production
   ```

4. **Regular backups**
   - Automated daily backups (see Database Backup section)
   - Test restore procedure regularly

5. **Monitor logs for suspicious activity**
   - Failed login attempts
   - Unusual API usage
   - Database errors

6. **Use strong passwords**
   - Admin password: min 12 characters, mixed case, numbers, symbols
   - Session secret: min 32 random characters

7. **Disable registration if not needed**

   ```bash
   NEXT_PUBLIC_REGISTRATION_ENABLED=false
   ```

8. **Enable 2FA for admin accounts**
   - TOTP (Google Authenticator, Authy)
   - WebAuthn/Passkeys (hardware security keys)

9. **Regular security updates**

   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade

   # Update Docker images
   docker compose pull
   docker compose up -d
   ```

## Troubleshooting

### Application won't start

```bash
# Check logs
docker compose logs learning-platform
sudo journalctl -u learning-platform

# Common issues:
# - Missing SESSION_SECRET
# - Database file permissions
# - Port already in use
```

### Database locked errors

```bash
# SQLite WAL mode is enabled by default
# If issues persist, check for zombie processes
ps aux | grep learning-platform

# Kill stale processes
sudo systemctl restart learning-platform
docker compose restart
```

### OAuth callback errors

```bash
# Verify BASE_URL matches your domain
echo $BASE_URL

# Check OAuth provider callback URLs
# Should be: https://devops.example.com/api/auth/oauth/{provider}/callback
```

### SMTP errors

```bash
# Test SMTP connection
docker compose exec learning-platform node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
transport.verify().then(console.log).catch(console.error);
"
```

### High memory usage

```bash
# Check Node.js memory
docker stats learning-platform

# Adjust Docker memory limits in docker-compose.yml
# Default: 2GB max, 512MB reserved
```

## Additional Resources

- [Configuration Guide](./configuration.md) - All environment variables
- [Database Guide](./database.md) - Database management and migration
- [Exercise Guide](./exercises.md) - Creating and managing exercises
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
