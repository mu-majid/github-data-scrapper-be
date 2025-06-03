# Use Node.js 22 Alpine for smaller image size
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R backend:nodejs logs

RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "app.js"]