# MyLists imports

The first release accepts current MyLists CSV exports only: version `2` for every media type.
Import and export use the single version in `src/lib/server/domain/imports/mylists-format.ts`. There are no legacy converters.
When an incompatible export change is made, bump that one version for every media type together.

Users upload one list per file, up to 5 MB and 3000 rows. Unsupported versions, missing/duplicate columns, mixed media types, and malformed CSV
are rejected. The error asks the user to re-export from Settings > Content & Lists. Invalid field values are reported per row; valid rows can
still be imported. Empty nullable values are accepted, but required progress values cannot silently become defaults.
Each row must use its media type's configured metadata provider and a valid provider ID. Matching uses that ID; a different local title
match cannot replace it, including for book editions.

Imports preserve supported list progress, ratings, favorites, and comments. Existing entries are kept unchanged and counted as completed.
Custom covers, tags, original added/updated timestamps, and activity history are not restored. The corresponding list must be enabled in
Content & Lists to appear on the user's profile.
Imports write list entries directly and do not create monthly Activity or Media Feed events. Later manual edits use normal activity tracking.

## Admin monitoring

Open **Admin > Monitoring > Imports** (`/admin/imports`) to see imports across users. Search by username or exact job ID, filter by status,
and open Details for timestamps, file errors, and paginated row issues. The page refreshes every ten seconds and has a manual Refresh button.
Both history and row-issue endpoints require the admin role and an authenticated admin session.

Processing time runs from `startedAt` to `finishedAt` (or now for an active job), excluding upload validation and queue time. Timestamps have
one-second precision. Jobs rejected before processing show "Not started". Recovery resets `startedAt`, so the duration reflects the latest
processing attempt. Completed row counts include existing list entries that were preserved.

This view uses existing import records; deleting an import job or its user also removes it from admin history. It is not a permanent audit log.

## Processing with PM2 and host cron

PM2 runs the web app. The web app validates uploads and saves jobs to SQLite; it does not launch background work inside the HTTP request.
Run the built `import-drain` CLI from host cron every two minutes, as the same OS user and with the same working directory, environment,
database, and uploads location as the PM2 app.

An idle `import-drain` invocation opens SQLite read-only and checks the indexed job statuses before loading the application. If no queued
or processing jobs exist, it exits successfully without output, service initialization, a lock subprocess, or a Redis connection. When work
exists, it closes the check connection and tries to lock the database's import queue before loading application services. A busy queue exits
successfully without output. Processing jobs are included so interrupted-job recovery still runs.
Set `DATABASE_URL` explicitly to the same database used by the web app. The lightweight check requires it and does not load application
environment defaults. Missing configuration, missing or unreadable databases, and missing tables produce a nonzero exit and an error on
stderr; they are not treated as an empty queue.
Deploy the complete generated `dist/cli` directory, including the command chunks loaded when work is found.
Install `util-linux` so `flock` is available on cron's `PATH` (`command -v flock` verifies this). The database directory must be writable by
the app user: the CLI creates `<database path>.import.lock` beside the database. Database symlinks resolve to the same lock.

Example crontab entry (replace all absolute paths for the deployment):

```cron
*/2 * * * * cd /absolute/path/to/MyLists && /absolute/path/to/bun --env-file=.env dist/cli/index.js import-drain >> /absolute/path/to/import-drain.log 2>&1
```

Manual runs use the same CLI command; locking is built in. The OS lock stays held through processing and statistics recomputation, and
releases automatically if the process exits or is killed. The lock file remains on disk; its presence does not mean an import is active.
Do not delete it while a drain is running. The database also allows only one processing job at a time.
A drain processes queued jobs one after another until the queue is empty; the two-minute interval is not a delay between jobs or rows.
Users can leave the page, and different users can queue imports while another import runs. Each user can have one active import at a time.

After a nonempty drain, the CLI recomputes user statistics. Infrastructure failures stop the command with an error instead of retrying in a
tight loop. A handled job failure records the unfinished rows as failed and allows the next job to run. Users can re-upload a corrected file
or retry after a temporary provider error; already imported entries are preserved.

After acquiring exclusive ownership, the CLI immediately requeues any interrupted processing job and its unfinished rows. It preserves
completed/failed rows and their counters. The next cron invocation can resume after a killed process without waiting for a stale timeout;
a live processor retains the lock and cannot have its job taken over. Recovery is transactional.
Creation of upload jobs is transactional, so an interrupted upload cannot leave a partially saved parsing job.

The cron entry is an operational setup step; changing this repository does not install it. Configure it before making imports available in
production. Do not configure PM2's `cron_restart` to restart the web app for this task.
When upgrading from the old drain, pause its schedule and let any existing drain exit before using the new CLI: the old process does not
hold the new database-side lock. Then run the new CLI once manually and enable the schedule. Check a small import and its admin history
after deployment to verify the production environment and cron configuration.

## Verification

Run without a production build:

```bash
bun run test src/lib/server/domain/imports src/cli src/lib/server/domain/media/tv/tv-seasons.integration.test.ts src/lib/server/domain/media/base/media.queries.bulk.test.ts
```

The import integration tests use disposable SQLite databases and actual media exporters for all six media types. They exercise successful
round trips, duplicate handling, unsupported formats, nullable data, row errors, provider/ID validation, upload rollback, simultaneous uploads
and drains, worker failures, ownership checks, the row limit, and interrupted-job recovery. External providers are stubbed; live provider
availability is outside these tests.
CLI tests also launch fresh Bun processes to verify the idle path without application configuration, database errors, help and argument
handling, missing `flock`, and real queue draining/recovery against temporary databases. A `SIGKILL` test pauses after a list insert, verifies
that a concurrent run cannot take over (including through a database symlink), then resumes immediately and checks for duplicate entries.
The CLI entrypoint lazily imports its commands; keep heavy application imports out of that entrypoint so the idle check stays small.
