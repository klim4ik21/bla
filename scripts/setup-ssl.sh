#!/bin/bash
# =============================================================================
# SSL Certificate Setup Script
# =============================================================================
#
# This script will:
# 1. Install certbot
# 2. Stop nginx to free port 80
# 3. Obtain SSL certificate from Let's Encrypt
# 4. Copy certificates to config/ssl/
# 5. Restart services with SSL enabled
#
# Usage: sudo ./scripts/setup-ssl.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="richislav.com"
EMAIL="xxlv.klim@yandex.ru"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run with sudo: sudo $0"
    exit 1
fi

log_info "Setting up SSL for $DOMAIN..."
echo ""

# 1. Install certbot
log_info "Installing certbot..."
apt-get update
apt-get install -y certbot

# 2. Stop nginx
log_info "Stopping nginx to free port 80..."
docker compose -f docker-compose.prod.yml stop nginx

# 3. Get SSL certificate
log_info "Obtaining SSL certificate from Let's Encrypt..."
log_warn "Make sure $DOMAIN points to this server's IP!"
echo ""

certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -ne 0 ]; then
    log_error "Failed to obtain SSL certificate!"
    log_info "Please check that:"
    echo "  1. Domain $DOMAIN points to this server"
    echo "  2. Port 80 is accessible from the internet"
    echo "  3. Firewall allows port 80 and 443"
    exit 1
fi

# 4. Copy certificates
log_info "Copying certificates..."
mkdir -p config/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem config/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem config/ssl/
chmod 644 config/ssl/fullchain.pem
chmod 600 config/ssl/privkey.pem

log_success "Certificates copied to config/ssl/"

# 5. Update .env file
log_info "Updating .env file..."
if [ -f .env ]; then
    sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN|" .env
    sed -i "s|LIVEKIT_PUBLIC_URL=.*|LIVEKIT_PUBLIC_URL=wss://$DOMAIN:7880|" .env
    log_success ".env updated"
else
    log_warn ".env file not found, skipping update"
fi

# 6. Restart services
log_info "Restarting services with SSL..."
docker compose -f docker-compose.prod.yml up -d

log_success "SSL setup complete!"
echo ""
log_info "Your site is now available at:"
echo "  https://$DOMAIN"
echo "  https://www.$DOMAIN"
echo ""
log_info "Certificate will expire in 90 days. Set up auto-renewal:"
echo "  crontab -e"
echo "  Add: 0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem /root/bla/config/ssl/ && docker compose -f /root/bla/docker-compose.prod.yml restart nginx"
