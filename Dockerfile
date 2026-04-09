FROM node:20-slim

WORKDIR /app

# Install frontend dependencies and build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Install server dependencies and build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/ .
RUN npm run build

# Copy frontend build to server public
RUN cp -r /app/dist /app/server/public

# Create data directory
RUN mkdir -p /app/server/data

# Copy schema.sql to dist (needed at runtime)
RUN cp -r /app/server/src/db /app/server/dist/db

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
ENV DB_PATH=/app/server/data/offerledger.db

CMD ["node", "dist/index.js"]
