# 🚀 VideoRooms Production Deployment Guide

## Prerequisites

- Ubuntu 20.04+ server with public IP
- Docker & Docker Compose installed
- Domain name (optional, for SSL)

## Quick Start

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo-url> videorooms
cd videorooms

# Make scripts executable
chmod +x scripts/*.sh

# Run setup (generates keys, configures .env)
./scripts/deploy.sh setup
```

### 2. Configure Firewall

```bash
# Run firewall setup script
sudo ./scripts/firewall-setup.sh

# Or manually open ports:
sudo ufw allow 80,443,7880,7881,3478,5349/tcp
sudo ufw allow 7882,3478,50000:50100/udp
```

### 3. Review Configuration

```bash
# Edit .env file
nano .env

# Verify EXTERNAL_IP is correct
cat .env | grep EXTERNAL_IP
```

### 4. Start Services

```bash
./scripts/deploy.sh start
```

### 5. Verify Deployment

```bash
# Check status
./scripts/deploy.sh status

# Run connection tests
./scripts/deploy.sh test

# View logs
./scripts/deploy.sh logs
```

## Required Ports

| Port | Protocol | Service | Purpose |
|------|----------|---------|---------|
| 80 | TCP | Nginx | HTTP traffic |
| 443 | TCP | Nginx | HTTPS traffic |
| 7880 | TCP | LiveKit | WebSocket signaling |
| 7881 | TCP | LiveKit | WebRTC TCP fallback |
| 7882 | UDP | LiveKit | STUN/TURN |
| 3478 | TCP+UDP | Coturn | TURN server |
| 5349 | TCP | Coturn | TURN TLS |
| 50000-50100 | UDP | LiveKit | WebRTC media |

## Troubleshooting

### "Could not establish pc connection"

This means WebRTC peer connection failed. Common causes:

1. **Firewall blocking UDP ports**
   ```bash
   # Check if ports are open
   sudo netstat -ulnp | grep -E "7882|50000"
   
   # Test from another machine
   nc -zvu YOUR_IP 7882
   ```

2. **Wrong EXTERNAL_IP in .env**
   ```bash
   # Get your actual public IP
   curl -4 ifconfig.me
   
   # Compare with .env
   grep EXTERNAL_IP .env
   ```

3. **LiveKit not configured with correct IP**
   ```bash
   # Check LiveKit config
   cat config/livekit.prod.yaml | grep node_ip
   
   # Should match your external IP
   ```

### Check ICE Candidates in Browser

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs like:
   ```
   [SFU] ✓ Signal connected to server
   [SFU] ✓ Connection state: connected
   ```

4. If you see `ICE failed`, check:
   - UDP ports are open
   - TURN server is running
   - External IP is correct

### View LiveKit Logs

```bash
# LiveKit logs
docker compose -f docker-compose.prod.yml logs -f livekit

# Look for:
# - "ICE connection state changed"
# - "peer connection state changed"
# - Any errors about ICE or STUN/TURN
```

### View Backend Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

### Check TURN Server

```bash
# View TURN server logs
docker compose -f docker-compose.prod.yml logs -f coturn

# Test TURN server
# Install turnutils: apt-get install coturn
turnutils_uclient -v -u livekit -w livekit_turn_secret YOUR_IP
```

## SSL Configuration

### Using Let's Encrypt

```bash
# Install certbot
apt-get install certbot

# Get certificate (stop nginx first)
docker compose -f docker-compose.prod.yml stop nginx
certbot certonly --standalone -d YOUR_DOMAIN

# Copy certificates
mkdir -p config/ssl
cp /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem config/ssl/
cp /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem config/ssl/

# Update .env
ENABLE_SSL=true
DOMAIN=YOUR_DOMAIN
LIVEKIT_PUBLIC_URL=wss://YOUR_DOMAIN:7880

# Uncomment HTTPS server block in config/nginx.prod.conf
# Restart
./scripts/deploy.sh restart
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Ubuntu Server                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Docker Network                      │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │  Nginx  │  │ Backend │  │ Frontend│  │  Debug  │  │  │
│  │  │  :80    │──│  :4000  │  │  :3000  │  │  :5001  │  │  │
│  │  └────┬────┘  └────┬────┘  └─────────┘  └─────────┘  │  │
│  │       │            │                                   │  │
│  │       │       ┌────┴────┐                              │  │
│  │       └───────┤ LiveKit │◄── UDP :50000-50100         │  │
│  │               │  :7880  │◄── TCP :7881                │  │
│  │               └────┬────┘◄── UDP :7882                │  │
│  │                    │                                   │  │
│  │               ┌────┴────┐                              │  │
│  │               │ Coturn  │◄── UDP :3478                │  │
│  │               │ (TURN)  │◄── TCP :5349                │  │
│  │               └─────────┘                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring

### Health Check Endpoints

- `http://YOUR_IP/health` - Nginx
- `http://YOUR_IP/api/health` - Backend
- `http://YOUR_IP/api/status` - Full status with all services
- `http://YOUR_IP:7880` - LiveKit

### View All Logs

```bash
# All services
./scripts/deploy.sh logs

# Specific service
docker compose -f docker-compose.prod.yml logs -f livekit
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
./scripts/deploy.sh restart
```

## Backup

```bash
# Backup configuration
tar -czvf videorooms-config-$(date +%Y%m%d).tar.gz .env config/
```
