import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {ParsedImportItem} from "@/lib/types/imports.types";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");


describe("ImportRepository", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
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
        sqlite.close();
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

    it("atomically claims only the oldest queued job while no job is processing", async () => {
        const firstJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const secondJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.markJobQueued(firstJob.id, 0, 0);
        await ImportRepository.markJobQueued(secondJob.id, 0, 0);

        const claimedJob = await ImportRepository.claimNextQueuedJob();

        expect(claimedJob).toMatchObject({
            id: firstJob.id,
            status: ImportJobStatus.PROCESSING,
        });

        expect(claimedJob?.startedAt).toBeTruthy();
        await expect(ImportRepository.claimNextQueuedJob()).resolves.toBeNull();

        await db
            .update(importJobs)
            .set({ status: ImportJobStatus.COMPLETED })
            .where(eq(importJobs.id, firstJob.id));

        await expect(ImportRepository.claimNextQueuedJob()).resolves.toMatchObject({
            id: secondJob.id,
            status: ImportJobStatus.PROCESSING,
        });
    });

    it("loads only queued items from a processing job in deterministic media and row order", async () => {
        const processingJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const waitingJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);

        await ImportRepository.insertParsedItems(processingJob.id, [
            createItem(4, { mediaType: MediaType.MOVIES }),
            createItem(2, { mediaType: MediaType.SERIES, status: ImportItemStatus.FAILED }),
            createItem(3, { mediaType: MediaType.GAMES }),
        ]);

        await ImportRepository.insertParsedItems(waitingJob.id, [
            createItem(2, { mediaType: MediaType.BOOKS }),
        ]);

        await ImportRepository.markJobQueued(processingJob.id, 3, 1);
        await ImportRepository.markJobQueued(waitingJob.id, 1, 0);
        await ImportRepository.claimNextQueuedJob();

        const items = await ImportRepository.getQueuedItemsForProcessingJob(processingJob.id);

        expect(items.map(item => [item.mediaType, item.rowNumber])).toEqual([[MediaType.GAMES, 3], [MediaType.MOVIES, 4]]);
        await expect(ImportRepository.getQueuedItemsForProcessingJob(waitingJob.id)).resolves.toEqual([]);
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

    it("finds jobs only for their owner and counts processing and earlier queued jobs", async () => {
        const processingJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const earlierQueuedJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const targetJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);

        await ImportRepository.markJobQueued(processingJob.id, 0, 0);
        await ImportRepository.markJobQueued(earlierQueuedJob.id, 0, 0);

        const queuedTarget = await ImportRepository.markJobQueued(targetJob.id, 0, 0);
        await db.update(importJobs)
            .set({ status: ImportJobStatus.PROCESSING })
            .where(eq(importJobs.id, processingJob.id));

        await expect(ImportRepository.findJobForUser(targetJob.id, 42)).resolves.toMatchObject({ id: targetJob.id });
        await expect(ImportRepository.findJobForUser(targetJob.id, 999)).resolves.toBeUndefined();
        await expect(ImportRepository.countJobsAhead(queuedTarget)).resolves.toBe(2);
    });

    it("returns only failed and skipped items ordered by CSV row with bounded pagination", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [
            createItem(4, { status: ImportItemStatus.SKIPPED, statusReason: "Ambiguous" }),
            createItem(2, { status: ImportItemStatus.FAILED, statusReason: "Invalid date" }),
            createItem(3, { status: ImportItemStatus.COMPLETED }),
        ]);

        const result = await ImportRepository.getIssueItems(job.id, 1, 1);

        expect(result).toMatchObject({ page: 1, perPage: 1, pages: 2, total: 2 });
        expect(result.items).toEqual([
            expect.objectContaining({
                rowNumber: 2,
                statusReason: "Invalid date",
                status: ImportItemStatus.FAILED,
            }),
        ]);
    });

    it("deletes only owned terminal jobs and cascades their items", async () => {
        const finishedJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const queuedJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);

        await ImportRepository.insertParsedItems(finishedJob.id, [createItem(2)]);
        await ImportRepository.markJobFailed(finishedJob.id, "Invalid file");
        await ImportRepository.markJobQueued(queuedJob.id, 0, 0);

        await expect(ImportRepository.deleteTerminalJob(queuedJob.id, 42)).resolves.toBeNull();
        await expect(ImportRepository.deleteTerminalJob(finishedJob.id, 999)).resolves.toBeNull();
        await expect(ImportRepository.deleteTerminalJob(finishedJob.id, 42)).resolves.toEqual({ id: finishedJob.id });

        expect(await db.select().from(importJobs).where(eq(importJobs.id, finishedJob.id))).toHaveLength(0);
        expect(await db.select().from(importItems).where(eq(importItems.jobId, finishedJob.id))).toHaveLength(0);
        expect(await db.select().from(importJobs).where(eq(importJobs.id, queuedJob.id))).toHaveLength(1);
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
