# =============================================================================
# VideoRooms Frontend - React/TypeScript
# Multi-stage build for smaller image size
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_LIVEKIT_URL=ws://localhost:7880
ARG VITE_WS_URL=/ws
ARG VITE_DEBUG_URL=/debug

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_DEBUG_URL=$VITE_DEBUG_URL

# Copy package files first (for layer caching)
COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
