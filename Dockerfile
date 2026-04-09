FROM node:20-slim AS build

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Build frontend ──
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig*.json eslint.config.js ./
COPY public/ public/
COPY src/ src/
RUN npm run build

# ── Build server ──
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src/ src/
RUN npm run build

# ── Production image ──
FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy server build + dependencies
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/package.json ./

# Copy schema.sql (needed at runtime)
COPY --from=build /app/server/src/db ./dist/db

# Copy frontend build as static files
COPY --from=build /app/dist ./public

# Create data directory
RUN mkdir -p /app/server/data

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production
ENV DB_PATH=/app/server/data/offerledger.db

CMD ["node", "dist/index.js"]
