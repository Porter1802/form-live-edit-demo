# --- Build stage ------------------------------------------------------------
# Debian (glibc) base so better-sqlite3 can use its published prebuilt binary
# instead of compiling from source. The Alpine (musl) image has no prebuilt
# binary available, which forces a native g++/SQLite compile on every build and
# fails (often OOM-killed) on resource-constrained hosts such as NAS/homelab
# boxes running Portainer.
FROM node:20-slim AS build
WORKDIR /app

# Fallback toolchain: only used if the prebuilt better-sqlite3 binary cannot be
# downloaded (e.g. GitHub releases unreachable). Lives in the build stage only,
# so it never bloats the runtime image. On the normal path the prebuilt binary
# is used and nothing here is compiled.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

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
FROM node:20-slim
WORKDIR /app

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
