#!/bin/bash
# =============================================================================
# Firewall Configuration for VideoRooms
# =============================================================================
#
# This script opens required ports for VideoRooms to work properly.
# Run with sudo: sudo ./scripts/firewall-setup.sh
#
# =============================================================================

set -e

echo "=== VideoRooms Firewall Setup ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo: sudo $0"
    exit 1
fi

# Check for ufw
if ! command -v ufw &> /dev/null; then
    echo "Installing ufw..."
    apt-get update && apt-get install -y ufw
fi

echo "Opening required ports..."

# HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# LiveKit
ufw allow 7880/tcp comment 'LiveKit HTTP/WebSocket'
ufw allow 7881/tcp comment 'LiveKit WebRTC TCP'
ufw allow 7882/udp comment 'LiveKit STUN/TURN'

# WebRTC UDP range
ufw allow 50000:50100/udp comment 'WebRTC Media UDP'

# TURN server
ufw allow 3478/tcp comment 'TURN TCP'
ufw allow 3478/udp comment 'TURN UDP'
ufw allow 5349/tcp comment 'TURN TLS'
ufw allow 49152:65535/udp comment 'TURN Relay UDP'

# Enable firewall if not enabled
if ! ufw status | grep -q "Status: active"; then
    echo ""
    echo "WARNING: This will enable ufw firewall."
    echo "Make sure SSH (port 22) is allowed before continuing!"
    read -p "Enable ufw now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ufw allow 22/tcp comment 'SSH'
        ufw --force enable
    fi
fi

echo ""
echo "=== Current Firewall Rules ==="
ufw status verbose

echo ""
echo "Firewall setup complete!"
echo ""
echo "Required ports opened:"
echo "  - 80/tcp     : HTTP"
echo "  - 443/tcp    : HTTPS"
echo "  - 7880/tcp   : LiveKit WebSocket"
echo "  - 7881/tcp   : WebRTC TCP fallback"
echo "  - 7882/udp   : LiveKit STUN/TURN"
echo "  - 50000-50100/udp : WebRTC Media"
echo "  - 3478/tcp+udp    : TURN"
echo "  - 5349/tcp        : TURN TLS"
