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

# DEBUG: List the dist folder to ensure compilation worked
RUN ls -R dist/

# Expose port (Cloud Run sets PORT env var)
EXPOSE 3000

# Start server
CMD ["npm", "start"]
