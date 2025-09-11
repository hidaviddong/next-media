# Next Media

Next Media is a media management system (similar to Jellyfin, Emby, Plex).

## Tech Stack

- Monorepo managed with pnpm workspaces
- Frontend: React + Vite + TanStack Router/Query + Tailwind CSS
- Backend: Hono (Node) with base path `/api`
- Database: SQLite via Drizzle ORM
- Auth: better-auth
- UI: shadcn-ui
- Queue: bullmq
- Nginx: serves built frontend and proxies `/api` to backend
- Redis: for caching/queue (via Docker)
- Process manager: PM2 for local multi-service run

## Getting Started

Follow these steps to run the project locally:

1. Start infrastructure (Redis and Nginx) using Docker Compose

   ```bash
   docker compose up -d
   ```

2. Install dependencies at the repo root

   ```bash
   pnpm install
   ```

3. Initialize the database

   ```bash
   pnpm run db:init
   ```

4. Build and start the apps with PM2
   ```bash
   pnpm run start
   ```