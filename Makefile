.PHONY: docker-build docker-run docker-stop docker-logs docker-clean docker-shell docker-db-backup docker-db-restore docker-compose-up docker-compose-down docker-compose-logs help

help:
	@echo "Learning Platform Docker Commands"
	@echo "=================================="
	@echo "make docker-build          - Build Docker image"
	@echo "make docker-run            - Run container (Docker CLI)"
	@echo "make docker-stop           - Stop container"
	@echo "make docker-logs           - View container logs"
	@echo "make docker-clean          - Remove container and image"
	@echo "make docker-shell          - Open shell in running container"
	@echo "make docker-db-backup      - Backup SQLite database"
	@echo "make docker-db-restore     - Restore SQLite database"
	@echo ""
	@echo "Docker Compose Commands"
	@echo "======================"
	@echo "make compose-up            - Start services with Docker Compose"
	@echo "make compose-down          - Stop services"
	@echo "make compose-logs          - View Docker Compose logs"
	@echo "make compose-restart       - Restart services"
	@echo "make compose-clean         - Stop and remove volumes (⚠️  loses data)"

# Docker CLI Commands
docker-build:
	@echo "Building Docker image..."
	docker build -t learning-platform:latest .
	@echo "✓ Build complete: learning-platform:latest"

docker-run: docker-build
	@echo "Running container..."
	docker run -d \
		-p 3000:3000 \
		-v learning-platform-data:/app/data \
		--name learning-platform \
		--restart unless-stopped \
		learning-platform:latest
	@echo "✓ Container started: http://localhost:3000"

docker-stop:
	@echo "Stopping container..."
	docker stop learning-platform || true
	docker rm learning-platform || true
	@echo "✓ Container stopped"

docker-logs:
	docker logs -f learning-platform

docker-clean: docker-stop
	@echo "Removing image..."
	docker rmi learning-platform:latest || true
	docker volume rm learning-platform-data || true
	@echo "✓ Cleanup complete"

docker-shell:
	docker exec -it learning-platform sh

docker-db-backup:
	@echo "Backing up database..."
	mkdir -p ./backups
	docker cp learning-platform:/app/data/learning-platform.db ./backups/learning-platform-$(shell date +%Y%m%d-%H%M%S).db
	@echo "✓ Database backed up to ./backups/"

docker-db-restore:
	@echo "Restoring database from latest backup..."
	@latest=$$(ls -t ./backups/learning-platform-*.db 2>/dev/null | head -1); \
	if [ -z "$$latest" ]; then \
		echo "✗ No backups found in ./backups/"; \
		exit 1; \
	fi; \
	docker cp $$latest learning-platform:/app/data/learning-platform.db; \
	docker restart learning-platform; \
	echo "✓ Database restored and container restarted"

# Docker Compose Commands
compose-up:
	@echo "Starting services with Docker Compose..."
	docker-compose up -d
	@echo "✓ Services started: http://localhost:3000"

compose-down:
	@echo "Stopping services..."
	docker-compose down
	@echo "✓ Services stopped"

compose-logs:
	docker-compose logs -f

compose-restart:
	@echo "Restarting services..."
	docker-compose restart
	@echo "✓ Services restarted"

compose-clean:
	@echo "⚠️  This will remove all data and volumes!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v; \
		echo "✓ Services and data removed"; \
	else \
		echo "✗ Cancelled"; \
	fi
