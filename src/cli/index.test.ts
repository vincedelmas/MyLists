import {tmpdir} from "node:os";
import Database from "bun:sqlite";
import {join, resolve} from "node:path";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {ImportJobStatus} from "@/lib/utils/enums";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {existsSync, mkdirSync, mkdtempSync, rmSync} from "node:fs";
import {afterEach, beforeEach, describe, expect, it} from "vitest";


describe("CLI import queue preflight", () => {
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

    const runCli = async (args = ["import-drain"], fullEnvironment = false, overrides: Record<string, string> = {}) => {
        const child = Bun.spawn([process.execPath, "--no-env-file", resolve(import.meta.dirname, "index.ts"), ...args], {
            cwd: directory,
            env: {
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
        const [exitCode, stdout, stderr] = await Promise.all([
            child.exited,
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
        ]);
        return { exitCode, stdout, stderr };
    };

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

    it.each([ImportJobStatus.QUEUED, ImportJobStatus.PROCESSING])("loads the real drain for a %s job, including recovery without queued jobs", async status => {
        sqlite.run("INSERT INTO movies (id, api_id, name, image_cover, duration, release_date) VALUES (100, 100, 'Import test movie', 'test.jpg', 100, '2024-01-01')");
        sqlite.run("INSERT INTO import_jobs (id, user_id, source, status, total_count, updated_at) VALUES (1, 1, 'mylists', ?, 1, datetime('now', '-7 hours'))", [status]);
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
        const result = await runCli(["compute-all-users-stats", "--help"], true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Usage: mylists-cli compute-all-users-stats");
    });
});
