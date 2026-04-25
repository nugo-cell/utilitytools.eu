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

ENV NODE_ENV=production \
    PORT=3000

# Bring in installed deps from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package*.json ./
COPY server.js ./
COPY public ./public

# Drop root for safety (the `node` user ships with the official image)
USER node

EXPOSE 3000

# Lightweight healthcheck — sitemap is always served
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/robots.txt > /dev/null || exit 1

CMD ["node", "server.js"]

