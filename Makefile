
.PHONY: help build up down logs clean restart status shell db-shell

help:
	@echo "GitHub OAuth Backend - Docker Commands"
	@echo "======================================"
	@echo "build     - Build the Docker image"
	@echo "up        - Start all services"
	@echo "down      - Stop all services"
	@echo "logs      - View logs from all services"
	@echo "logs-be   - View backend logs only"
	@echo "logs-db   - View database logs only"
	@echo "clean     - Remove containers and volumes"
	@echo "restart   - Restart all services"
	@echo "status    - Show container status"
	@echo "shell     - Open shell in backend container"
	@echo "db-shell  - Open MongoDB shell"
	@echo "tools     - Start with MongoDB admin interface"
	@echo "test      - Run health checks"

build:
	docker-compose build --no-cache

up:
	docker-compose --env-file .env.docker up -d

tools:
	docker-compose --env-file .env.docker --profile tools up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-be:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f mongodb

clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

restart:
	docker-compose restart

status:
	docker-compose ps

shell:
	docker-compose exec backend sh

db-shell:
	docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin

test:
	@echo "Testing backend health..."
	@curl -f http://localhost:3000/ || echo "Backend health check failed"
	@echo "Testing database connection..."
	@docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" --quiet

# Initialize environment file
init:
	@if [ ! -f .env.docker ]; then \
		echo "Creating .env.docker file..."; \
		cp .env.docker.example .env.docker; \
		echo "Please edit .env.docker with your GitHub OAuth credentials"; \
	else \
		echo ".env.docker already exists"; \
	fi

stats:
	docker stats github-oauth-backend github-oauth-mongodb

# Backup database
backup:
	@mkdir -p backups
	docker-compose exec mongodb mongodump --authenticationDatabase admin -u admin -p password123 --db integrations --out /tmp/backup
	docker cp github-oauth-mongodb:/tmp/backup ./backups/$(shell date +%Y%m%d_%H%M%S)
	@echo "Backup created in ./backups/"

# Restore database (use: make restore BACKUP_DIR=backups/20231201_120000)
restore:
	@if [ -z "$(BACKUP_DIR)" ]; then echo "Usage: make restore BACKUP_DIR=backups/20231201_120000"; exit 1; fi
	docker cp ./$(BACKUP_DIR) github-oauth-mongodb:/tmp/restore
	docker-compose exec mongodb mongorestore --authenticationDatabase admin -u admin -p password123 --db integrations /tmp/restore/integrations --drop