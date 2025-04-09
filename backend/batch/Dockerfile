FROM node:16-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for PostgreSQL client
RUN apk add --no-cache python3 make g++ postgresql-dev

# Install production dependencies with debugging
COPY package*.json ./
RUN echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    npm install --only=production

# Copy .env file if it exists
COPY .env* ./

# Copy application files
COPY . .

# Create directory for logs with proper permissions
RUN mkdir -p /app/logs && \
    mkdir -p /tmp/logs && \
    chmod -R 777 /app/logs && \
    chmod -R 777 /tmp/logs && \
    chown -R node:node /app/logs

# Create volume for persistent data
VOLUME ["/app/logs", "/tmp/logs"]

# Set proper permissions
RUN chmod +x docker-entrypoint.sh

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production \
    TZ=UTC

# Set the entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command (runs all maintenance tasks)
CMD ["run-all"]