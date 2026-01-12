# Use Node 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (Cloud Run sets PORT env var, defaults to 8080 usually)
EXPOSE 8080

# Start server
CMD ["npm", "start"]
