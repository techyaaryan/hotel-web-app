# Use LTS Node.js alpine image for a lightweight footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy application source files
COPY . .

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Expose backend API port
EXPOSE 5000

# Start the Express server
CMD ["npm", "start"]
