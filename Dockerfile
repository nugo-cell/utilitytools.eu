# --- Build stage: install only production deps ---
FROM node:20-alpine AS deps
WORKDIR /app

# Copy manifests first to leverage Docker layer cache
COPY package*.json ./

# Use npm ci when a lockfile exists, fall back to npm install otherwise
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
    else \
        npm install --omit=dev; \
    fi \
    && npm cache clean --force

# --- Runtime stage: minimal image, non-root user ---
FROM node:20-alpine AS runtime
WORKDIR /app

# Production runtime config. Disable colour codes / progress bars so the
# DigitalOcean App Platform "Runtime Logs" UI shows plain readable text.
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--enable-source-maps" \
    NPM_CONFIG_LOGLEVEL=warn \
    NO_COLOR=1 \
    FORCE_COLOR=0

# `tini` becomes PID 1, reaps zombies, and forwards SIGTERM/SIGINT to node so
# graceful shutdown logs are flushed before the container is killed.
RUN apk add --no-cache tini wget

# Bring in installed deps from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package*.json ./
COPY server.js ./
COPY public ./public

# Drop root for safety (the `node` user ships with the official image)
USER node

EXPOSE 3000

# Lightweight healthcheck — robots.txt is always served
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/robots.txt > /dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

