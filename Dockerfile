# Stage 1: Base image using lightweight Alpine Linux
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Install build dependencies if needed
COPY package*.json ./

# Install application dependencies (omit devDependencies in production)
RUN npm install --omit=dev

# Copy application source code and assets
COPY . .

# Ensure logs directory exists and has write permissions
RUN mkdir -p logs && chmod -R 777 logs

# Expose Web Server port (Question 5: Port forwarding)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Run Node.js web server
CMD ["node", "src/server.js"]

