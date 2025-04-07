FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy .env file if it exists
COPY .env* ./

# Copy application files
COPY . .

# Create directory for logs
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs

# Create volume for persistent data
VOLUME ["/app/logs"]

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