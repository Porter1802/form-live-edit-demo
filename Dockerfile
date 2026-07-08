# --- Build stage ------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Toolchain for compiling the better-sqlite3 native module.
RUN apk add --no-cache python3 make g++

# Install all workspace dependencies (uses the committed lockfile).
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY server/package.json ./server/package.json
RUN npm ci

# Build the frontend (into server/public) and bundle the server.
COPY . .
RUN npm run build

# Prune dev dependencies so only runtime deps are carried into the image.
RUN npm prune --omit=dev

# --- Runtime stage ----------------------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Native module needs the C++ runtime.
RUN apk add --no-cache libstdc++

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Bundled server, built SPA and the pruned production node_modules.
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/public ./server/public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server/dist/index.cjs"]
