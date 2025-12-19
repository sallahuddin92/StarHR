FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build:api || true

# Expose port
EXPOSE 3001

# Start the API server
CMD ["npm", "run", "dev:api"]
