# Multi-stage build for next-media web with Nginx

# 1) Dependencies layer for caching
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only manifest files to maximize layer cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/auth/package.json packages/auth/
COPY packages/configs/package.json packages/configs/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/

RUN pnpm install --frozen-lockfile

# 2) Builder: compile all workspaces (web uses built packages)
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=deps /app/package.json /app/package.json

# Copy full source
COPY packages ./packages
COPY apps ./apps

# Build all packages then apps
RUN pnpm run build

# 3) Runtime: Nginx serves the built web
FROM nginx:1.27-alpine AS runtime

# Copy nginx config
COPY nginx/web.conf /etc/nginx/conf.d/default.conf

# Copy built web assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


