# Docker Compose Deployment

The Compose setup runs the services owned by MyLists.

Default services:

- `app`: Bun runtime running `server.ts`
- `redis`: Redis with AOF persistence
- `maintenance`: cron container running the maintenance CLI daily at 03:00 UTC
- `tooling`: opt-in CLI/database tooling image, enabled only with the `tools` profile

## Local Start

Create the Docker env file:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` with real secrets and API keys, then start:

```bash
docker compose --env-file .env.docker up -d --build
```

Open:

```text
http://localhost:3000
```

The app binds to `127.0.0.1:${APP_PORT:-3000}` by default, so it is local-only and not exposed publicly.
Change `APP_PORT` if port `3000` is already used.

If you change `APP_PORT`, also update `VITE_BASE_URL` to the same browser URL and rebuild, for example:

```env
APP_PORT=3001
VITE_BASE_URL=http://localhost:3001
```

Public `VITE_*` values are embedded in the client build. Rebuild after changing them:

```bash
docker compose --env-file .env.docker up -d --build app maintenance
```

## First Database Init

For a new local Docker volume, initialize the SQLite database before using the app:

```bash
docker compose --env-file .env.docker up -d redis
docker compose --env-file .env.docker --profile tools run --rm tooling bun run new:db:docker
docker compose --env-file .env.docker up -d
```

This runs Drizzle schema push, seeds achievements, and calculates achievements against the mounted `mylists-db` volume.

Do not use `bun run new:db` inside Docker.
That local-dev script reads `.env`, but Docker uses `.env.docker` through Compose env injection.

The `tooling` service is separate from the app runtime image because database init needs dev tooling such as `drizzle-kit`.
The normal `app` and `maintenance` containers use the production runtime image.

## CLI Usage In Docker

Use the built CLI in the image:

```bash
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js --help
```

Examples:

```bash
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js maintenance --json
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js seed-achievements
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js calculate-achievements
```

## Creating A Local Admin User

For localhost deployments, email verification and OAuth sign-up may be unavailable or unnecessary.
Use the CLI to create a verified user directly:

```bash
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js create-user \
  --email admin@example.com \
  --password "change-me-strong-password" \
  --username admin \
  --role admin
```

This creates a password-login account with `emailVerified: true`.
The available roles are `user`, `manager`, and `admin`.

## Images And Uploads

The app serves uploaded and downloaded images itself at `/${UPLOADS_DIR_NAME}/`,
so a reverse proxy is not required for local use.

Default Docker paths:

```env
UPLOADS_DIR_NAME=images
BASE_UPLOADS_LOCATION=/app/storage/images
```

Persistent data lives in Docker volumes:

- `mylists-db`: SQLite database and WAL/SHM files at `/app/instance`
- `mylists-uploads`: downloaded and uploaded images at `/app/storage/images`
- `redis-data`: Redis AOF data

## Maintenance Cron

The `maintenance` service runs cron in the foreground and installs the cron file baked into the image at `docker/cron/mylists`.
The schedule is:

```cron
0 3 * * * root . /etc/cron.env; cd /app && bun dist/cli/index.js maintenance --json >> /proc/1/fd/1 2>> /proc/1/fd/2
```

That means it runs every day at 03:00 AM UTC.
The service writes the Compose environment into `/etc/cron.env` before starting cron so the CLI receives the same env as the app.

Run the task manually:

```bash
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js maintenance --json
```

## Public Deployment

For a public deployment, keep this Compose stack behind your own reverse proxy/TLS solution.
Common choices are Caddy, Traefik, nginx, Apache, Cloudflare Tunnel, or a host-level load balancer.

The app listens inside Compose at:

```text
http://app:3000
```

From the Docker host, the default bind is:

```text
http://127.0.0.1:3000
```

Forward these headers from your proxy:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

For public use, set `VITE_BASE_URL` to the public HTTPS origin and rebuild:

```env
VITE_BASE_URL=https://mylists.example.com
```

If your proxy serves static files directly, map `/${UPLOADS_DIR_NAME}/` to the same data stored in the `mylists-uploads` volume.
Otherwise, let the app serve images itself.

## Optional PostHog

PostHog is fully optional. Leave these blank to disable analytics:

```env
VITE_PUBLIC_POSTHOG_KEY=
VITE_PUBLIC_POSTHOG_HOST=
VITE_PUBLIC_POSTHOG_UI_HOST=
```

If `VITE_PUBLIC_POSTHOG_KEY` is empty, the app does not mount `PostHogProvider` and does not identify users.
If you want a PostHog reverse proxy, configure it in your own proxy layer and point `VITE_PUBLIC_POSTHOG_HOST` to that URL.

## Existing Prod Data

Copy existing SQLite files into the `mylists-db` volume and existing image folders into `mylists-uploads`.
Example restore from local backup folders:

```bash
docker run --rm -v mylists_mylists-db:/data -v "$PWD/backups/mylists-db:/backup" alpine sh -c "cp -a /backup/. /data/"
docker run --rm -v mylists_mylists-uploads:/data -v "$PWD/backups/mylists-uploads:/backup" alpine sh -c "cp -a /backup/. /data/"
```

## Operations

View logs:

```bash
docker compose --env-file .env.docker logs -f app maintenance redis
```

Restart the app:

```bash
docker compose --env-file .env.docker restart app
```

Stop without deleting database or images:

```bash
docker compose --env-file .env.docker down
```

Do not add `-v` to `down` unless you intentionally want to delete Docker volumes containing the SQLite database, uploads, and Redis data.
