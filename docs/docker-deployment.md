# Docker Deployment

MyLists ships a single Docker image for the app. The image runs the Bun web server by default and also contains the built CLI for one-off commands and scheduled maintenance.

The image does not include Redis, a scheduler, or a reverse proxy. In production, provide those from your platform when you need them.

## Build

Create the Docker env file:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` with real secrets and API keys.

Build the image:

```bash
docker build \
  --build-arg VITE_BASE_URL=http://localhost:3000 \
  --build-arg VITE_CONTACT_MAIL= \
  --build-arg VITE_PUBLIC_POSTHOG_KEY= \
  --build-arg VITE_PUBLIC_POSTHOG_HOST= \
  --build-arg VITE_PUBLIC_POSTHOG_UI_HOST= \
  -t mylists-app .
```

Public `VITE_*` values are embedded in the client build. Rebuild the image after changing them. For public production, set `VITE_BASE_URL` to the public HTTPS origin, for example:

```env
VITE_BASE_URL=https://example.com
```

## Run

Run the app with persistent mounts for SQLite and images:

```bash
docker run -d \
  --name mylists \
  --env-file .env.docker \
  -p 127.0.0.1:3000:3000 \
  -v mylists-db:/app/instance \
  -v mylists-uploads:/app/storage/images \
  mylists-app
```

Open:

```text
http://localhost:3000
```

The app listens on `PORT`, which defaults to `3000`.

## Persistent Data

Use persistent storage for these paths:

```text
/app/instance
/app/storage/images
```

Default Docker env values:

```env
UPLOADS_DIR_NAME=images
DATABASE_URL=./instance/site.db
BASE_UPLOADS_LOCATION=/app/storage/images
```

- `/app/instance` contains the SQLite database and WAL/SHM files.
- `/app/storage/images` contains uploaded and downloaded images.

Do not store either path only inside the container filesystem in prod.

## Redis

Redis is optional. When Redis is disabled, the app uses in-memory cache and in-memory rate limiting inside each app process.

Enable Redis when you want shared cache/rate limits across restarts or multiple app containers:

```env
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
```

API monitoring in the admin dashboard is Redis-backed. Without Redis, outbound API calls are not recorded into the monitoring rollups and the live Redis counters show zero/null
data.

## Maintenance

The image does not run cron. Use Dokploy cron, host cron, systemd timers, Kubernetes CronJob, or another scheduler.

Run the maintenance task with the same image, env, and persistent mounts as the app:

```bash
docker run --rm \
  --env-file .env.docker \
  -v mylists-db:/app/instance \
  -v mylists-uploads:/app/storage/images \
  mylists-app \
  bun dist/cli/index.js maintenance --json
```

A typical schedule is once per day, for example 03:00 AM UTC.

## CLI Usage

Use the built CLI in the image:

```bash
docker run --rm --env-file .env.docker mylists-app bun dist/cli/index.js --help
```

Examples that need database/uploads access should include the same volumes as the app:

```bash
docker run --rm \
  --env-file .env.docker \
  -v mylists-db:/app/instance \
  -v mylists-uploads:/app/storage/images \
  mylists-app \
  bun dist/cli/index.js seed-achievements
```

```bash
docker run --rm \
  --env-file .env.docker \
  -v mylists-db:/app/instance \
  -v mylists-uploads:/app/storage/images \
  mylists-app \
  bun dist/cli/index.js calculate-achievements
```

## Creating A Local Admin User

For localhost deployments, email verification and OAuth sign-up may be unavailable or unnecessary. Use the CLI to create a verified user directly:

```bash
docker run --rm \
  --env-file .env.docker \
  -v mylists-db:/app/instance \
  -v mylists-uploads:/app/storage/images \
  mylists-app \
  bun dist/cli/index.js create-user \
    --email admin@example.com \
    --password "change-me-strong-password" \
    --username admin \
    --role admin
```

The available roles are `user`, `manager`, and `admin`.

## Database Initialization

For a new SQLite volume, initialize the database from the same Docker image after the app has the correct env and volumes attached:

```bash
docker run --rm \
  --env-file .env.docker \
  -v mylists-db:/app/instance \
  -v mylists-uploads:/app/storage/images \
  mylists-app \
  bun run new:db:docker
```

or in the container, run the same command as a one-off job:

```bash
bun run new:db:docker
```

This runs Drizzle schema push, seeds achievements, and calculates achievements against the mounted `/app/instance` SQLite volume.

## Public Deployment

Put the app behind your platform reverse proxy or your own TLS proxy.
Forward these headers from your proxy:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

If your proxy serves static files directly, map `/${UPLOADS_DIR_NAME}/` to the same data stored in `/app/storage/images`. Otherwise, let the app serve images itself.

## Optional PostHog

PostHog is fully optional. Leave these blank to disable analytics:

```env
VITE_PUBLIC_POSTHOG_KEY=
VITE_PUBLIC_POSTHOG_HOST=
VITE_PUBLIC_POSTHOG_UI_HOST=
```

If `VITE_PUBLIC_POSTHOG_KEY` is empty, the app does not mount `PostHogProvider` and does not identify users.

## Existing Production Data

Copy existing SQLite files into the database volume and existing image folders into the uploads volume. Example restore from local backup folders:

```bash
docker run --rm -v mylists-db:/data -v "$PWD/backups/mylists-db:/backup" alpine sh -c "cp -a /backup/. /data/"
docker run --rm -v mylists-uploads:/data -v "$PWD/backups/mylists-uploads:/backup" alpine sh -c "cp -a /backup/. /data/"
```

## Operations

View logs:

```bash
docker logs -f mylists
```

Restart the app:

```bash
docker restart mylists
```

Stop without deleting database or images:

```bash
docker stop mylists
docker rm mylists
```

Do not delete the Docker volumes unless you intentionally want to delete the SQLite database and uploaded images.
