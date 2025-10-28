.PHONY: help build up down logs logs-backend logs-frontend restart clean rebuild seed-admin dev-backend dev-frontend stop ps

# Default target
.DEFAULT_GOAL := help

# Variables
# Auto-detect docker-compose command (v1 uses hyphen, v2 uses space)
COMPOSE := $(shell command -v docker-compose 2>/dev/null)
ifeq ($(COMPOSE),)
    COMPOSE = docker compose
else
    COMPOSE = docker-compose
endif
BACKEND_CONTAINER = media-ranking-backend
FRONTEND_CONTAINER = media-ranking-frontend

# Colors for output
CYAN = \033[0;36m
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## Show this help message
	@echo "$(CYAN)Media Ranking System - Makefile Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

build: ## Build all Docker images
	@echo "$(CYAN)Building Docker images...$(NC)"
	$(COMPOSE) build

up: ## Start all services
	@echo "$(CYAN)Starting services...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend API: http://localhost:3000"
	@echo ""
	@echo "$(YELLOW)Don't forget to create an admin user:$(NC)"
	@echo "  make seed-admin USERNAME=admin PASSWORD=admin123"

down: ## Stop all services
	@echo "$(CYAN)Stopping services...$(NC)"
	$(COMPOSE) down
	@echo "$(GREEN)Services stopped!$(NC)"

stop: ## Stop services without removing containers
	@echo "$(CYAN)Stopping services...$(NC)"
	$(COMPOSE) stop

restart: ## Restart all services
	@echo "$(CYAN)Restarting services...$(NC)"
	$(COMPOSE) restart
	@echo "$(GREEN)Services restarted!$(NC)"

logs: ## View logs from all services
	$(COMPOSE) logs -f

logs-backend: ## View backend logs
	$(COMPOSE) logs -f backend

logs-frontend: ## View frontend logs
	$(COMPOSE) logs -f frontend

ps: ## List running containers
	$(COMPOSE) ps

seed-admin: ## Create admin user (usage: make seed-admin USERNAME=admin PASSWORD=pass)
	@if [ -z "$(USERNAME)" ] || [ -z "$(PASSWORD)" ]; then \
		echo "$(RED)Error: USERNAME and PASSWORD are required$(NC)"; \
		echo "Usage: make seed-admin USERNAME=admin PASSWORD=yourpassword"; \
		exit 1; \
	fi
	@echo "$(CYAN)Creating admin user: $(USERNAME)$(NC)"
	docker exec -it $(BACKEND_CONTAINER) /app/seed_admin --username $(USERNAME) --password $(PASSWORD)
	@echo "$(GREEN)Admin user created successfully!$(NC)"

clean: ## Remove containers, volumes, and images
	@echo "$(YELLOW)WARNING: This will remove all containers, volumes, and images!$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read dummy
	@echo "$(CYAN)Cleaning up...$(NC)"
	$(COMPOSE) down -v --rmi all
	@echo "$(GREEN)Cleanup complete!$(NC)"

rebuild: ## Clean and rebuild everything (removes all data!)
	@echo "$(CYAN)Rebuilding from scratch...$(NC)"
	$(COMPOSE) down -v
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d
	@echo "$(GREEN)Rebuild complete!$(NC)"
	@echo ""
	@echo "$(YELLOW)Don't forget to create an admin user:$(NC)"
	@echo "  make seed-admin USERNAME=admin PASSWORD=admin123"

rebuild-keep-data: ## Rebuild while preserving database and uploads
	@echo "$(CYAN)Rebuilding with data preservation...$(NC)"
	$(COMPOSE) down
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d
	@echo "$(GREEN)Rebuild complete with data preserved!$(NC)"

dev-backend: ## Run backend locally (without Docker)
	@echo "$(CYAN)Starting backend in development mode...$(NC)"
	cd backend && cargo run --bin server

dev-frontend: ## Run frontend locally (without Docker)
	@echo "$(CYAN)Starting frontend in development mode...$(NC)"
	cd frontend && npm run dev

shell-backend: ## Open shell in backend container
	docker exec -it $(BACKEND_CONTAINER) /bin/sh

shell-frontend: ## Open shell in frontend container
	docker exec -it $(FRONTEND_CONTAINER) /bin/sh

backup-db: ## Backup database
	@echo "$(CYAN)Backing up database...$(NC)"
	@mkdir -p backups
	docker cp $(BACKEND_CONTAINER):/data/media_ranking.db backups/media_ranking_$(shell date +%Y%m%d_%H%M%S).db
	@echo "$(GREEN)Database backed up to backups/$(NC)"

restore-db: ## Restore database (usage: make restore-db FILE=backups/media_ranking_20231201_120000.db)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: FILE is required$(NC)"; \
		echo "Usage: make restore-db FILE=backups/media_ranking_20231201_120000.db"; \
		exit 1; \
	fi
	@echo "$(CYAN)Restoring database from $(FILE)...$(NC)"
	docker cp $(FILE) $(BACKEND_CONTAINER):/data/media_ranking.db
	@echo "$(GREEN)Database restored!$(NC)"

status: ## Show service status
	@echo "$(CYAN)Service Status:$(NC)"
	@$(COMPOSE) ps

health: ## Check health of services
	@echo "$(CYAN)Checking service health...$(NC)"
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $(BACKEND_CONTAINER) 2>/dev/null || echo "Backend: not running"
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $(FRONTEND_CONTAINER) 2>/dev/null || echo "Frontend: not running"
