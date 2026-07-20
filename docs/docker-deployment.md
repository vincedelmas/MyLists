# Docker Deployment

MyLists ships a Docker Compose setup with the app and Redis. The app image runs the Bun web server by default and also contains the built CLI for one-off commands and scheduled
maintenance.

The Compose setup does not include a scheduler or reverse proxy. In production, provide those from your platform when you need them.

## Build

Create the Docker env file:

```bash
cp .env.docker.example .env.docker
```

Set real values for `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, and `BETTER_AUTH_SECRET`. API keys, OAuth providers, mail delivery, PostHog, and LLM enrichment are optional.

Build the app image:

```bash
docker compose --env-file .env.docker build
```

Public `VITE_*` values are embedded in the client build. Rebuild the image after changing them. For public production, set `VITE_BASE_URL` to the public HTTPS origin, for example:

```env
VITE_BASE_URL=https://example.com
```

## Run

Run the app and Redis with persistent volumes:

```bash
docker compose --env-file .env.docker up -d --build
```

Open:

```text
http://localhost:3000
```

The app listens on `PORT`, which defaults to `3000`.

## Persistent Data

Compose creates persistent volumes for these paths:

```text
/app/instance
/app/storage/images
/data
```

Default Docker env values:

```env
UPLOADS_DIR_NAME=images
DATABASE_URL=./instance/site.db
BASE_UPLOADS_LOCATION=/app/storage/images
```

- `/app/instance` contains the SQLite database and WAL/SHM files.
- `/app/storage/images` contains uploaded and downloaded images.
- `/data` contains Redis append-only data.

Do not store these paths only inside the container filesystem in prod.

## Redis

Compose starts Redis by default, and the Docker env example enables it:

```env
REDIS_ENABLED=true
REDIS_URL=redis://redis:6379
```

When Redis is disabled, the app uses in-memory cache and in-memory rate limiting inside each app process.

API monitoring in the admin dashboard is Redis-backed. Without Redis, outbound API calls are not recorded into the monitoring rollups and the live Redis counters show zero/null
data.

## Import Drain

Imports are processed by the built CLI. The web app only creates queued import jobs; it does not start a worker process. Run the import drain on a schedule with the same image,
env, and persistent mounts as the app:

```bash
flock -n /tmp/mylists-import-drain.lock bun dist/cli/index.js import-drain
```

For Docker Compose:

```bash
flock -n /tmp/mylists-import-drain.lock docker compose --env-file .env.docker run --rm app bun dist/cli/index.js import-drain
```

A typical schedule is every 2 minutes for example. The `flock` lock skips a new run when the previous drain is still active. The database also only allows one import job to be in
`PROCESSING` at a time.

## Maintenance

The image does not run cron. Use Dokploy cron, host cron, Kubernetes CronJob, or another scheduler. Run the maintenance task with the same image, env, and persistent mounts as the
app:

```bash
docker compose --env-file .env.docker run --rm app \
  bun dist/cli/index.js maintenance --json
```

A typical schedule is once per day, for example, 03:00 AM UTC.

## CLI Usage

Use the built CLI in the image:

```bash
docker compose --env-file .env.docker run --rm app bun dist/cli/index.js --help
```

Examples run with the same database/uploads volumes as the app:

```bash
docker compose --env-file .env.docker run --rm app \
  bun dist/cli/index.js seed-achievements
```

```bash
docker compose --env-file .env.docker run --rm app \
  bun dist/cli/index.js calculate-achievements
```

## Creating A Local Admin User

For localhost deployments, email verification and OAuth sign-up may be unavailable or unnecessary. Use the CLI to create a verified user directly:

```bash
docker compose --env-file .env.docker run --rm app \
  bun dist/cli/index.js create-user \
    --email admin@example.com \
    --password "change-me-strong-password" \
    --username admin \
    --role admin
```

The available roles are `user`, `manager`, and `admin`.

## Database Initialization

For a new SQLite volume, initialize the database from the app service after it has the correct env and volumes attached:

```bash
docker compose --env-file .env.docker run --rm app bun run new:db:docker
```

This runs Drizzle schema push, seeds achievements, and calculates achievements against the mounted `/app/instance` SQLite volume.

## Public Deployment

Put the app behind your platform reverse proxy or your own TLS proxy. Forward these headers from your proxy:

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

## Optional Integrations

Missing optional integration credentials do not stop the container:

- Without mail credentials, create verified users with the CLI. Email registration, password reset, email changes, and inactive-account email maintenance are disabled.
- TMDB and IGDB credentials enable their respective external media providers. Missing credentials produce a clear error when that provider is used.
- GitHub and Google OAuth providers are enabled independently when both values in their credential pair are set.
- LLM book genre enrichment is skipped when `LLM_API_KEY` is empty.

For paired credentials, leave both values empty or set both. Partial pairs fail validation with the missing variable name.

## Existing Production Data

Copy existing SQLite files into the database volume and existing image folders into the uploads volume. Example restore from local backup folders:

```bash
docker compose --env-file .env.docker run --rm --no-deps \
  -v "$PWD/backups/mylists-db:/backup:ro" \
  app sh -c "cp -a /backup/. /app/instance/"

docker compose --env-file .env.docker run --rm --no-deps \
  -v "$PWD/backups/mylists-uploads:/backup:ro" \
  app sh -c "cp -a /backup/. /app/storage/images/"
```

## Operations

View logs:

```bash
docker compose logs -f app
```

The app writes structured JSON logs to stdout in prod. Dev logs are pretty-printed in the terminal. In Docker, read them with `docker compose logs`.

The admin Runtime Logs page does not make the app write log files. It only reads existing files from `ADMIN_LOG_DIR`, which defaults to `~/.pm2/logs`. For PM2 deployments, point
`ADMIN_LOG_DIR` at the directory where PM2 writes the app output logs, for example:

```env
ADMIN_LOG_DIR=/home/deploy/.pm2/logs
```

In local dev, no file log is written by the app; use the terminal output instead. In Docker, leave `ADMIN_LOG_DIR` unset unless you mount a directory containing log files that the
admin dashboard should read.

Restart the app:

```bash
docker compose restart app
```

Stop without deleting database or images:

```bash
docker compose down
```

Do not run `docker compose down -v` or delete the Docker volumes unless you intentionally want to delete the SQLite database, uploaded images, and Redis data.
