.PHONY: install dev build lint seed import test clean clean-db clean-all clean-deps docker-build docker-run docker-stop docker-logs docker-clean docker-shell docker-db-backup docker-db-restore compose-up compose-down compose-logs compose-restart compose-clean help

help:
	@echo "Development Commands"
	@echo "===================="
	@echo "make install              - Install npm dependencies"
	@echo "make dev                  - Start development server"
	@echo "make build                - Full production build (seed + import + build)"
	@echo "make lint                 - Run ESLint"
	@echo "make seed                 - Create/reset database tables"
	@echo "make import               - Import YAML exercises into database"
	@echo "make test                 - Run tests (placeholder)"
	@echo ""
	@echo "Cleanup Commands"
	@echo "================"
	@echo "make clean                - Clean build artifacts and temp files (safe)"
	@echo "make clean-db             - Clean database only"
	@echo "make clean-all            - Clean everything including DB (with confirmation)"
	@echo "make clean-deps           - Remove node_modules (with confirmation)"
	@echo ""
	@echo "Docker CLI Commands"
	@echo "===================="
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
	@echo "make compose-clean         - Stop and remove volumes (loses data)"

# Development Commands
install:
	npm install

dev:
	npm run dev

build:
	mkdir -p data
	npm run db:seed
	npm run exercises:import
	npm run build

lint:
	npm run lint

seed:
	mkdir -p data
	npm run db:seed

import:
	npm run exercises:import

test:
	@echo "No test runner configured yet"

# Cleanup Commands
clean:
	@echo "Cleaning build artifacts and temp files..."
	rm -rf .next
	rm -rf out
	rm -rf coverage
	rm -f *.tsbuildinfo
	find . -name ".DS_Store" -type f -delete
	@echo "Clean complete (database preserved)"

clean-db:
	@echo "Cleaning database..."
	rm -rf data
	@echo "Database removed"

clean-all:
	@echo "This will remove ALL build artifacts, temp files, AND the database!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		rm -rf .next out coverage data backups; \
		rm -f *.tsbuildinfo; \
		find . -name ".DS_Store" -type f -delete; \
		echo "All temp data removed"; \
	else \
		echo "Cancelled"; \
	fi

clean-deps:
	@echo "This will remove node_modules (requires reinstall)!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		rm -rf node_modules; \
		echo "Dependencies removed. Run 'make install' to reinstall"; \
	else \
		echo "Cancelled"; \
	fi

# Docker CLI Commands
docker-build:
	@echo "Building Docker image..."
	docker build -t learning-platform:latest .
	@echo "Build complete: learning-platform:latest"

docker-run: docker-build
	@echo "Running container..."
	docker run -d \
		-p 3000:3000 \
		-v learning-platform-data:/app/data \
		--name learning-platform \
		--restart unless-stopped \
		learning-platform:latest
	@echo "Container started: http://localhost:3000"

docker-stop:
	@echo "Stopping container..."
	docker stop learning-platform || true
	docker rm learning-platform || true
	@echo "Container stopped"

docker-logs:
	docker logs -f learning-platform

docker-clean: docker-stop
	@echo "Removing image..."
	docker rmi learning-platform:latest || true
	docker volume rm learning-platform-data || true
	@echo "Cleanup complete"

docker-shell:
	docker exec -it learning-platform sh

docker-db-backup:
	@echo "Backing up database..."
	mkdir -p ./backups
	docker cp learning-platform:/app/data/learning-platform.db ./backups/learning-platform-$(shell date +%Y%m%d-%H%M%S).db
	@echo "Database backed up to ./backups/"

docker-db-restore:
	@echo "Restoring database from latest backup..."
	@latest=$$(ls -t ./backups/learning-platform-*.db 2>/dev/null | head -1); \
	if [ -z "$$latest" ]; then \
		echo "No backups found in ./backups/"; \
		exit 1; \
	fi; \
	docker cp $$latest learning-platform:/app/data/learning-platform.db; \
	docker restart learning-platform; \
	echo "Database restored and container restarted"

# Docker Compose Commands
compose-up:
	@echo "Starting services with Docker Compose..."
	docker-compose up -d
	@echo "Services started: http://localhost:3000"

compose-down:
	@echo "Stopping services..."
	docker-compose down
	@echo "Services stopped"

compose-logs:
	docker-compose logs -f

compose-restart:
	@echo "Restarting services..."
	docker-compose restart
	@echo "Services restarted"

compose-clean:
	@echo "This will remove all data and volumes!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v; \
		echo "Services and data removed"; \
	else \
		echo "Cancelled"; \
	fi
