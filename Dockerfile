# Multi-stage build for NestJS application
FROM node:18-alpine3.16 AS builder

# Install system dependencies for building including OpenSSL 1.1.x compatibility
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    openssl \
    openssl-dev \
    openssl1.1-compat \
    openssl1.1-compat-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application with verbose output
RUN npm run build

# Verify the build output exists - check both possible locations
RUN ls -la dist/ && (ls -la dist/main.js 2>/dev/null || ls -la dist/src/main.js || echo "main.js not found in expected locations")

# Production stage
FROM node:18-alpine3.16 AS production

# Install runtime system dependencies including OpenSSL 1.1.x compatibility
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype \
    curl \
    openssl \
    openssl1.1-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Verify dist files are copied
RUN ls -la dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application - check if main.js is in dist/src/ instead of dist/
CMD ["sh", "-c", "if [ -f dist/src/main.js ]; then exec node dist/src/main.js; else exec node dist/main.js; fi"]