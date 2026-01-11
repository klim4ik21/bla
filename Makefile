# VideoRooms Makefile
# ===================

.PHONY: help build up down logs clean dev

# Default target
help:
	@echo "VideoRooms - Available commands:"
	@echo ""
	@echo "  make build    - Build all Docker images"
	@echo "  make up       - Start all services (docker compose up -d)"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - Show logs from all services"
	@echo "  make clean    - Remove all containers and images"
	@echo "  make dev      - Start services for development"
	@echo ""
	@echo "Individual service commands:"
	@echo "  make logs-backend   - Show backend logs"
	@echo "  make logs-frontend  - Show frontend logs"
	@echo "  make logs-livekit   - Show LiveKit logs"
	@echo "  make logs-debug     - Show debug service logs"
	@echo ""

# Build all images
build:
	docker compose build

# Start all services
up:
	docker compose up -d
	@echo ""
	@echo "✓ Services started!"
	@echo ""
	@echo "  Frontend:      http://localhost"
	@echo "  Backend API:   http://localhost/api"
	@echo "  Debug Logs:    http://localhost/logs"
	@echo "  LiveKit:       ws://localhost:7880"
	@echo ""
	@echo "Run 'make logs' to see service logs"

# Stop all services
down:
	docker compose down

# Show all logs
logs:
	docker compose logs -f

# Show specific service logs
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-livekit:
	docker compose logs -f livekit

logs-debug:
	docker compose logs -f debug

logs-nginx:
	docker compose logs -f nginx

# Clean up everything
clean:
	docker compose down -v --rmi all --remove-orphans

# Development mode (with volume mounts for hot reload)
dev:
	@echo "Starting development environment..."
	@echo "Note: For full hot-reload, run services locally"
	docker compose up -d livekit debug
	@echo ""
	@echo "LiveKit and Debug services running in Docker"
	@echo ""
	@echo "Start backend locally:"
	@echo "  cd backend && mix deps.get && mix phx.server"
	@echo ""
	@echo "Start frontend locally:"
	@echo "  cd frontend && npm install && npm run dev"

# Check service status
status:
	docker compose ps
	@echo ""
	@curl -s http://localhost/api/status | jq . || echo "Backend not responding"
