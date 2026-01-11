# =============================================================================
# VideoRooms Backend - Elixir/Phoenix
# Multi-stage build for smaller image size
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM elixir:1.16-otp-26-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    git \
    curl

# Set environment
ENV MIX_ENV=prod

WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy dependency files first (for layer caching)
COPY mix.exs mix.lock ./
COPY config config

# Install and compile dependencies
RUN mix deps.get --only prod && \
    mix deps.compile

# Copy application source
COPY lib lib

# Compile the application
RUN mix compile

# Create release
RUN mix release

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    libstdc++ \
    openssl \
    ncurses-libs \
    curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 elixir && \
    adduser -u 1000 -G elixir -s /bin/sh -D elixir && \
    chown -R elixir:elixir /app

USER elixir

# Copy release from builder
COPY --from=builder --chown=elixir:elixir /app/_build/prod/rel/video_rooms ./

# Set environment
ENV HOME=/app
ENV PHX_SERVER=true

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

# Start the application
CMD ["bin/video_rooms", "start"]
