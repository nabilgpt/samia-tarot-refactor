# 🚀 SAMIA TAROT - Production Docker Container
# Multi-stage build for optimal security and performance

# =====================================
# Stage 1: Base Dependencies
# =====================================
FROM node:18-alpine AS base

# Install security updates and required tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY babel.config.js jest.config.js ./

# =====================================
# Stage 2: Dependencies Installation
# =====================================
FROM base AS deps

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install dev dependencies for build
RUN npm ci

# =====================================
# Stage 3: Frontend Build
# =====================================
FROM base AS frontend-builder

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src ./src
COPY public ./public
COPY index.html vite.config.js ./

# Set build environment
ENV NODE_ENV=production
ENV VITE_APP_VERSION=$BUILDKIT_VERSION

# Build frontend
RUN npm run build

# =====================================
# Stage 4: Backend Build
# =====================================
FROM base AS backend-builder

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy backend source
COPY src/api ./src/api
COPY database ./database

# Build backend (if needed)
RUN npm run build:backend || echo "No backend build step required"

# =====================================
# Stage 5: Production Runtime
# =====================================
FROM node:18-alpine AS production

# Install runtime security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S samia -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=samia:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=samia:nodejs /app/package*.json ./

# Copy built frontend
COPY --from=frontend-builder --chown=samia:nodejs /app/dist ./dist

# Copy backend files
COPY --from=backend-builder --chown=samia:nodejs /app/src/api ./src/api
COPY --chown=samia:nodejs database ./database

# Copy additional required files
COPY --chown=samia:nodejs ecosystem.config.json ./
COPY --chown=samia:nodejs scripts ./scripts

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp-audio && \
    chown -R samia:nodejs /app/logs /app/uploads /app/temp-audio

# Security: Remove unnecessary packages and files
RUN npm prune --production && \
    rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /tmp/* /var/tmp/* /root/.npm

# Set security headers and configurations
ENV NODE_ENV=production
ENV PORT=5001
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Switch to non-root user
USER samia

# Expose ports
EXPOSE 3000 5001

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start both frontend and backend
CMD ["sh", "-c", "npm run start:production"]

# =====================================
# Stage 6: Development (Optional)
# =====================================
FROM base AS development

# Copy all dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY --chown=samia:nodejs . .

# Set development environment
ENV NODE_ENV=development

# Switch to non-root user
USER samia

# Expose development ports
EXPOSE 3000 5001 9000

# Development command
CMD ["npm", "run", "dev"]

# =====================================
# Build Arguments & Labels
# =====================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL \
    org.label-schema.build-date=$BUILD_DATE \
    org.label-schema.description="SAMIA TAROT - Cosmic Platform for Tarot & Astrology Services" \
    org.label-schema.name="samia-tarot" \
    org.label-schema.schema-version="1.0" \
    org.label-schema.usage="https://github.com/samia-tarot/platform/blob/main/README.md" \
    org.label-schema.vcs-ref=$VCS_REF \
    org.label-schema.vcs-url="https://github.com/samia-tarot/platform" \
    org.label-schema.vendor="SAMIA TAROT" \
    org.label-schema.version=$VERSION \
    maintainer="SAMIA TAROT <info@samiatarot.com>" \
    security.scan="trivy,snyk" \
    security.non-root="true" 