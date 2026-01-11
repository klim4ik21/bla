# =============================================================================
# Debug Service - Centralized Logging
# Multi-stage build for smaller image size
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM elixir:1.16-otp-26-alpine AS builder

RUN apk add --no-cache build-base git

ENV MIX_ENV=prod

WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy dependency files
COPY mix.exs mix.lock ./
COPY config config

# Install dependencies
RUN mix deps.get --only prod && \
    mix deps.compile

# Copy source
COPY lib lib

# Compile
RUN mix compile

# Create release
RUN mix release

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS runtime

RUN apk add --no-cache libstdc++ openssl ncurses-libs

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 elixir && \
    adduser -u 1000 -G elixir -s /bin/sh -D elixir && \
    chown -R elixir:elixir /app

USER elixir

# Copy release from builder
COPY --from=builder --chown=elixir:elixir /app/_build/prod/rel/debug_service ./

ENV HOME=/app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:5000/api/health || exit 1

CMD ["bin/debug_service", "start"]
