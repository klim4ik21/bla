#!/bin/bash
# =============================================================================
# VideoRooms Production Deployment Script
# =============================================================================
#
# Usage:
#   ./scripts/deploy.sh [command]
#
# Commands:
#   setup     - First time setup (install dependencies, generate keys)
#   start     - Start all services
#   stop      - Stop all services
#   restart   - Restart all services
#   logs      - View logs (follow mode)
#   status    - Show service status
#   test      - Test connections
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
check_env() {
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        log_error ".env file not found!"
        log_info "Copy env.example to .env and configure it:"
        echo "  cp env.example .env"
        echo "  nano .env"
        exit 1
    fi
}

# Get external IP
get_external_ip() {
    curl -4 -s ifconfig.me || curl -4 -s icanhazip.com || echo "UNKNOWN"
}

# Setup command
cmd_setup() {
    log_info "Setting up VideoRooms..."
    
    cd "$PROJECT_DIR"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        log_info "Creating .env from template..."
        cp env.example .env
        
        # Get external IP
        EXTERNAL_IP=$(get_external_ip)
        log_info "Detected external IP: $EXTERNAL_IP"
        
        # Generate keys
        LIVEKIT_API_KEY=$(openssl rand -hex 16)
        LIVEKIT_API_SECRET=$(openssl rand -hex 32)
        SECRET_KEY_BASE=$(openssl rand -hex 64)
        
        # Update .env
        sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP=$EXTERNAL_IP/" .env
        sed -i "s/LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=$LIVEKIT_API_KEY/" .env
        sed -i "s/LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET/" .env
        sed -i "s/SECRET_KEY_BASE=.*/SECRET_KEY_BASE=$SECRET_KEY_BASE/" .env
        sed -i "s|LIVEKIT_PUBLIC_URL=.*|LIVEKIT_PUBLIC_URL=ws://$EXTERNAL_IP:7880|" .env
        
        log_success "Generated .env with keys"
        log_warn "Please review .env file before starting!"
    else
        log_info ".env already exists, skipping generation"
    fi
    
    # Create SSL directory
    mkdir -p config/ssl
    
    # Create turnserver log directory
    sudo mkdir -p /var/log/coturn
    
    log_success "Setup complete!"
    echo ""
    log_info "Next steps:"
    echo "  1. Review .env file: nano .env"
    echo "  2. Open firewall ports: sudo ufw allow 80,443,7880,7881,3478/tcp && sudo ufw allow 7882,3478,50000:50100/udp"
    echo "  3. Start services: ./scripts/deploy.sh start"
}

# Start command
cmd_start() {
    log_info "Starting VideoRooms..."
    
    check_env
    cd "$PROJECT_DIR"
    
    # Load .env
    source .env
    
    # Update LiveKit config with external IP
    log_info "Configuring LiveKit with IP: $EXTERNAL_IP"
    sed -i "s/node_ip:.*/node_ip: $EXTERNAL_IP/" config/livekit.prod.yaml
    
    # Start services
    docker compose -f docker-compose.prod.yml up -d --build
    
    log_success "Services started!"
    echo ""
    log_info "Checking service health..."
    sleep 5
    cmd_status
}

# Stop command
cmd_stop() {
    log_info "Stopping VideoRooms..."
    
    cd "$PROJECT_DIR"
    docker compose -f docker-compose.prod.yml down
    
    log_success "Services stopped"
}

# Restart command
cmd_restart() {
    cmd_stop
    cmd_start
}

# Logs command
cmd_logs() {
    cd "$PROJECT_DIR"
    docker compose -f docker-compose.prod.yml logs -f --tail=100
}

# Status command
cmd_status() {
    cd "$PROJECT_DIR"
    
    echo ""
    echo "=== Service Status ==="
    docker compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "=== Health Checks ==="
    
    # Load .env
    source .env 2>/dev/null || true
    
    # Check backend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health | grep -q "200"; then
        log_success "Backend: healthy"
    else
        log_error "Backend: unhealthy"
    fi
    
    # Check LiveKit
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:7880 | grep -q "200\|404"; then
        log_success "LiveKit: healthy"
    else
        log_error "LiveKit: unhealthy"
    fi
    
    # Check frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        log_success "Frontend: healthy"
    else
        log_error "Frontend: unhealthy"
    fi
    
    # Check debug service
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health | grep -q "200"; then
        log_success "Debug Service: healthy"
    else
        log_error "Debug Service: unhealthy"
    fi
    
    echo ""
    echo "=== Access URLs ==="
    echo "  Frontend:    http://${EXTERNAL_IP:-localhost}"
    echo "  API:         http://${EXTERNAL_IP:-localhost}/api/status"
    echo "  LiveKit:     ws://${EXTERNAL_IP:-localhost}:7880"
    echo "  Debug Logs:  http://${EXTERNAL_IP:-localhost}/logs"
}

# Test command
cmd_test() {
    log_info "Testing connections..."
    
    cd "$PROJECT_DIR"
    source .env 2>/dev/null || true
    
    echo ""
    echo "=== Network Tests ==="
    
    # Test external IP connectivity
    log_info "Testing external IP connectivity..."
    if timeout 5 curl -s "http://$EXTERNAL_IP/health" | grep -q "OK"; then
        log_success "External IP accessible"
    else
        log_warn "External IP not accessible (check firewall)"
    fi
    
    # Test LiveKit WebSocket
    log_info "Testing LiveKit WebSocket..."
    if timeout 5 curl -s -o /dev/null -w "%{http_code}" "http://$EXTERNAL_IP:7880" | grep -q "200\|404\|426"; then
        log_success "LiveKit port open"
    else
        log_error "LiveKit port 7880 not accessible"
    fi
    
    # Test UDP ports
    log_info "Testing UDP port 7882..."
    if nc -z -u -w 1 $EXTERNAL_IP 7882 2>/dev/null; then
        log_success "UDP port 7882 open"
    else
        log_warn "UDP port 7882 test inconclusive (may still work)"
    fi
    
    echo ""
    echo "=== API Tests ==="
    
    # Test full status API
    log_info "Testing status API..."
    curl -s "http://localhost/api/status" | jq . 2>/dev/null || echo "API not responding"
    
    echo ""
    log_info "Tests complete!"
}

# Main
case "${1:-}" in
    setup)
        cmd_setup
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs
        ;;
    status)
        cmd_status
        ;;
    test)
        cmd_test
        ;;
    *)
        echo "VideoRooms Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup     First time setup (generate keys, configure)"
        echo "  start     Start all services"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  logs      View logs (follow mode)"
        echo "  status    Show service status"
        echo "  test      Test connections"
        exit 1
        ;;
esac
