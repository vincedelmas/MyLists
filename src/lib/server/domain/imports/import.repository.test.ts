import {eq} from "drizzle-orm";
import {migrate} from "drizzle-orm/libsql/migrator";
import {Client, createClient} from "@libsql/client";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, user} from "@/lib/server/database/schema";
import {drizzle, LibSQLDatabase} from "drizzle-orm/libsql";
import {ParsedImportItem} from "@/lib/types/imports.types";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");


describe("ImportRepository", () => {
    let client: Client;
    let db: LibSQLDatabase<typeof schema>;

    beforeEach(async () => {
        client = createClient({ url: "file::memory:" });
        db = drizzle(client, { schema, casing: "snake_case" });
        dbContext.db = db;

        await migrate(db, { migrationsFolder: "./drizzle" });
        await db.insert(user).values({
            id: 42,
            emailVerified: true,
            name: "import-user",
            email: "import-user@example.com",
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
        });
    });

    afterEach(() => {
        client.close();
        dbContext.db = undefined;
    });

    it("creates a parsing job", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);

        expect(job).toMatchObject({
            userId: 42,
            totalCount: 0,
            source: ImportSource.MYLISTS,
            status: ImportJobStatus.PARSING,
        });
    });

    it("inserts parsed items in batches and queues the job with parsing counters", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const items = Array.from({ length: 51 }, (_, idx) => createItem(idx + 2, {
            status: idx === 50 ? ImportItemStatus.FAILED : ImportItemStatus.QUEUED,
            statusReason: idx === 50 ? "Invalid row" : null,
        }));

        await ImportRepository.insertParsedItems(job.id, items);
        const queuedJob = await ImportRepository.markJobQueued(job.id, items.length, ImportRepository.countFailedItems(items));

        const storedItems = await db.select().from(importItems).where(eq(importItems.jobId, job.id));

        expect(storedItems).toHaveLength(51);
        expect(queuedJob).toMatchObject({
            totalCount: 51,
            failedCount: 1,
            processedCount: 1,
            status: ImportJobStatus.QUEUED,
        });
    });

    it("only queues jobs that are still parsing", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.markJobQueued(job.id, 0, 0);

        await expect(ImportRepository.markJobQueued(job.id, 0, 0)).resolves.toBeNull();
    });

    it("marks parsing failures as terminal and truncates stored errors", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);

        const failedJob = await ImportRepository.markJobFailed(job.id, "x".repeat(2_100));
        const storedJob = await db.select().from(importJobs).where(eq(importJobs.id, job.id)).get();

        expect(failedJob).toMatchObject({ status: ImportJobStatus.FAILED });
        expect(storedJob?.error).toHaveLength(2_000);
        expect(storedJob?.finishedAt).toBeTruthy();
    });
});


const createItem = (rowNumber: number, overrides: Partial<ParsedImportItem> = {}): ParsedImportItem => ({
    rowNumber,
    statusReason: null,
    releaseDate: "2024",
    externalApiId: null,
    externalApiSource: null,
    name: `Movie ${rowNumber}`,
    mediaType: MediaType.MOVIES,
    status: ImportItemStatus.QUEUED,
    payload: { status: "Completed" },
    ...overrides,
});
