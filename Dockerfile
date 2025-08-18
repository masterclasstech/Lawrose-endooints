# Multi-stage build for NestJS application using Debian-based Node
FROM node:18-slim AS base

# Install essential dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema BEFORE npm install (needed for postinstall script)
COPY src/prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Development stage
FROM base AS development

# Set development environment
ENV NODE_ENV=development

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start in development mode with hot reload
CMD ["npm", "run", "start:dev"]

# Builder stage for production
FROM base AS builder

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify the build output exists
RUN ls -la dist/

# Production stage
FROM node:18-slim AS production

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema from src directory (needed before npm install)
COPY src/prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Verify files are copied correctly
RUN ls -la dist/ && ls -la node_modules/.prisma/

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nestjs

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]