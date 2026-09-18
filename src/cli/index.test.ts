import {tmpdir} from "node:os";
import Database from "bun:sqlite";
import {join, resolve} from "node:path";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {ImportJobStatus} from "@/lib/utils/enums";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
import {afterEach, beforeEach, describe, expect, it} from "vitest";


describe("CLI entry point", () => {
    let directory: string;
    let databasePath: string;
    let sqlite: Database;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "mylists-import-cli-"));
        mkdirSync(join(directory, "instance"));
        databasePath = join(directory, "instance/site.db");
        sqlite = new Database(databasePath);
        migrate(drizzle(sqlite), { migrationsFolder: resolve(import.meta.dirname, "../../drizzle") });
        sqlite.run("PRAGMA journal_mode = WAL");
        sqlite.run("PRAGMA foreign_keys = ON");
        sqlite.run("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'Import test', 'import@example.invalid', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
    });

    afterEach(() => {
        sqlite.close();
        rmSync(directory, { recursive: true, force: true });
    });

    const startCli = (args = ["import-drain"], fullEnvironment = false, overrides: Record<string, string | undefined> = {}, bunArgs: string[] = []) => {
        return Bun.spawn([process.execPath, "--no-env-file", ...bunArgs, resolve(import.meta.dirname, "index.ts"), ...args], {
            cwd: directory,
            env: {
                PATH: process.env.PATH,
                NODE_ENV: "production",
                LOG_LEVEL: "silent",
                REDIS_ENABLED: "false",
                DATABASE_URL: databasePath,
                BASE_UPLOADS_LOCATION: join(directory, "uploads"),
                ADMIN_LOG_DIR: join(directory, "logs"),
                ...(fullEnvironment ? {
                    ADMIN_PASSWORD: "ImportCliTest123!",
                    ADMIN_TOKEN_SECRET: "import-cli-test-admin-token-secret",
                    BETTER_AUTH_SECRET: "import-cli-test-auth-secret-12345678",
                } : {}),
                ...overrides,
            },
            stdout: "pipe",
            stderr: "pipe",
        });
    };

    const runCli = async (args = ["import-drain"], fullEnvironment = false, overrides: Record<string, string | undefined> = {}) => {
        const child = startCli(args, fullEnvironment, overrides);
        const [exitCode, stdout, stderr] = await Promise.all([
            child.exited,
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
        ]);
        return { exitCode, stdout, stderr };
    };

    it("shows activity repair help without an application environment or database", async () => {
        const result = await runCli(["activity-repair", "--help"], false, { DATABASE_URL: undefined });
        expect(result).toMatchObject({ exitCode: 0, stderr: "" });
        expect(result.stdout).toContain("Usage: activity-repair");
        expect(result.stdout).toContain("--evidence-only");
        expect(result.stdout).toContain("--apply [file.json]");
    });

    it("lists activity repair in the main CLI help", async () => {
        const result = await runCli(["--help"], true);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        expect(result.stdout).toContain("activity-repair [options]");
    });

    it("rejects unknown repair options without loading application services", async () => {
        const result = await runCli(["activity-repair", "--unknown-option"], false, { DATABASE_URL: undefined });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("unknown option");
        expect(result.stderr).not.toContain("Invalid environment variables");
    });

    it("exits quietly on an empty queue without loading application environment validation", async () => {
        // No application secrets are provided. Loading the full CLI would fail.
        expect(await runCli()).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });

    it("ignores terminal job history without loading application services", async () => {
        for (const status of [ImportJobStatus.COMPLETED, ImportJobStatus.COMPLETED_WITH_ERRORS, ImportJobStatus.FAILED, ImportJobStatus.CANCELLED]) {
            sqlite.run("INSERT INTO import_jobs (user_id, source, status) VALUES (1, 'mylists', ?)", [status]);
        }
        expect(await runCli()).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });

    it("exits quietly when all queued jobs are waiting for their retry time", async () => {
        sqlite.run("INSERT INTO import_jobs (user_id, source, status, next_attempt_at) VALUES (1, 'mylists', 'queued', datetime('now', '+1 day'))");
        expect(await runCli()).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    });

    it.each([undefined, ""])("reports an unconfigured DATABASE_URL (%j) clearly", async databaseUrl => {
        const result = await runCli(["import-drain"], false, { DATABASE_URL: databaseUrl });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("DATABASE_URL must be set");
    });

    it("reports a missing database without creating it", async () => {
        const missingDatabase = join(directory, "missing.db");
        const result = await runCli(["import-drain"], false, { DATABASE_URL: missingDatabase });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("Could not check the import queue");
        expect(existsSync(missingDatabase)).toBe(false);
    });

    it("reports an unmigrated database instead of treating it as an empty queue", async () => {
        const unmigratedDatabase = join(directory, "unmigrated.db");
        new Database(unmigratedDatabase).close();
        const result = await runCli(["import-drain"], false, { DATABASE_URL: unmigratedDatabase });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("Could not check the import queue");
    });

    it.each([ImportJobStatus.QUEUED, ImportJobStatus.PROCESSING, "due-retry"])("loads the real drain for a %s job, including recovery without queued jobs", async state => {
        const status = state === "due-retry" ? ImportJobStatus.QUEUED : state;
        sqlite.run("INSERT INTO movies (id, api_id, name, image_cover, duration, release_date) VALUES (100, 100, 'Import test movie', 'test.jpg', 100, '2024-01-01')");
        sqlite.run("INSERT INTO import_jobs (id, user_id, source, status, total_count) VALUES (1, 1, 'mylists', ?, 1)", [status]);
        if (state === "due-retry") sqlite.run("UPDATE import_jobs SET next_attempt_at = datetime('now', '-1 minute'), error = 'Provider paused' WHERE id = 1");
        sqlite.run(`INSERT INTO import_items (job_id, row_number, name, media_type, external_api_id, external_api_source, status, payload_json)
            VALUES (1, 2, 'Import test movie', 'movies', '100', 'tmdb', ?, ?)`,
            [status, JSON.stringify({ status: "Completed", redo: 0, total: 1, rating: 8, favorite: true, comment: "CLI test" })]);

        const result = await runCli(["import-drain"], true);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        expect(sqlite.query("SELECT status, completed_count FROM import_jobs WHERE id = 1").get())
            .toEqual({ status: ImportJobStatus.COMPLETED, completed_count: 1 });
        expect(sqlite.query("SELECT user_id, media_id, rating, comment FROM movies_list").all())
            .toEqual([{ user_id: 1, media_id: 100, rating: 8, comment: "CLI test" }]);
    });

    it("fails without flock instead of recovering jobs without exclusive ownership", async () => {
        sqlite.run("INSERT INTO import_jobs (user_id, source, status) VALUES (1, 'mylists', 'processing')");
        const result = await runCli(["import-drain"], false, { PATH: directory });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("Could not run flock");
        expect(sqlite.query("SELECT status FROM import_jobs").get()).toEqual({ status: "processing" });
    });

    it("keeps a live owner exclusive and recovers immediately after SIGKILL without duplicating its insert", async () => {
        sqlite.run("INSERT INTO movies (id, api_id, name, image_cover, duration) VALUES (100, 100, 'Crash test movie', 'test.jpg', 100)");
        sqlite.run("INSERT INTO import_jobs (id, user_id, source, status, total_count) VALUES (1, 1, 'mylists', 'queued', 1)");
        sqlite.run(`INSERT INTO import_items (job_id, row_number, name, media_type, external_api_id, external_api_source, status, payload_json)
            VALUES (1, 2, 'Crash test movie', 'movies', '100', 'tmdb', 'queued', ?)`,
        [JSON.stringify({ status: "Completed", redo: 0, total: 1, rating: 8, favorite: true, comment: "Preserve after crash" })]);

        const preload = join(directory, "pause-after-insert.ts");
        writeFileSync(preload, `
            import {ImportService} from ${JSON.stringify(resolve(import.meta.dirname, "../lib/server/domain/imports/import.service.ts"))};
            ImportService.prototype.applyItemOutcomes = async function() {
                console.log("PAUSED_AFTER_INSERT");
                setInterval(() => {}, 1000);
                return await new Promise(() => {});
            };
        `);
        const owner = startCli(["import-drain"], true, {}, ["--preload", preload]);
        const timeout = setTimeout(() => owner.kill("SIGKILL"), 10_000);
        let paused = false;

        try {
            for await (const chunk of owner.stdout) {
                if (new TextDecoder().decode(chunk).includes("PAUSED_AFTER_INSERT")) {
                    paused = true;
                    break;
                }
            }
            expect(paused).toBe(true);
            const before = sqlite.query("SELECT status, processed_count FROM import_jobs WHERE id = 1").get();
            expect(before).toEqual({ status: "processing", processed_count: 0 });
            const alias = join(directory, "alias.db");
            symlinkSync(databasePath, alias);
            expect(await runCli(["import-drain"], false, { DATABASE_URL: alias }))
                .toEqual({ exitCode: 0, stdout: "", stderr: "" });
            expect(sqlite.query("SELECT status, processed_count FROM import_jobs WHERE id = 1").get()).toEqual(before);

            owner.kill("SIGKILL");
            await owner.exited;
            const recovered = await runCli(["import-drain"], true);
            expect(recovered, recovered.stderr).toMatchObject({ exitCode: 0 });
            expect(sqlite.query("SELECT status, processed_count, completed_count FROM import_jobs WHERE id = 1").get())
                .toEqual({ status: "completed", processed_count: 1, completed_count: 1 });
            expect(sqlite.query("SELECT rating, comment FROM movies_list").all())
                .toEqual([{ rating: 8, comment: "Preserve after crash" }]);
        }
        finally {
            clearTimeout(timeout);
            if (owner.exitCode === null) owner.kill("SIGKILL");
            await owner.exited;
        }
    }, 15_000);

    it("preserves import help when the queue is empty", async () => {
        const result = await runCli(["import-drain", "--help"], true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Usage: mylists-cli import-drain");
    });

    it("does not hide invalid import arguments behind an empty queue", async () => {
        const result = await runCli(["import-drain", "--unknown-option"], true);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("unknown option");
    });

    it("keeps other CLI commands available", async () => {
        const result = await runCli(["compute-users-stats", "--help"], true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Usage: mylists-cli compute-users-stats");
        expect(result.stdout).toContain("--user-ids <values...>");
    });
});
