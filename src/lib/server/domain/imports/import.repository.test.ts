import {eq, sql} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {ParsedImportItem} from "@/lib/types/imports.types";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
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
        for (const id of [42, 43, 44, 45]) {
            await db.insert(user).values({
                id,
                emailVerified: true,
                name: `import-user-${id}`,
                updatedAt: "2024-01-01 00:00:00",
                createdAt: "2024-01-01 00:00:00",
                email: `import-user-${id}@example.com`,
            });
        }
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("allows only one active job per user", async () => {
        const activeJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);

        expect(() => ImportRepository.createJob(42, ImportSource.MYLISTS)).toThrow();
        await expect(ImportRepository.findActiveJobForUser(42)).resolves.toMatchObject({
            id: activeJob.id,
            status: ImportJobStatus.PARSING,
        });

        await ImportRepository.markJobFailed(activeJob.id, "Invalid file");

        expect(ImportRepository.createJob(42, ImportSource.MYLISTS)).toMatchObject({
            userId: 42,
            status: ImportJobStatus.PARSING,
        });
    });

    it("atomically claims only the oldest queued job while no job is processing", async () => {
        const firstJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const secondJob = await ImportRepository.createJob(43, ImportSource.MYLISTS);
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

    it("requeues interrupted jobs immediately and only resets unfinished processing items", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [createItem(2), createItem(3), createItem(4)]);
        await ImportRepository.markJobQueued(job.id, 3, 0);
        await ImportRepository.claimNextQueuedJob();

        const queuedItems = await ImportRepository.getQueuedItemsForProcessingJob(job.id);
        await ImportRepository.markItemsProcessing(job.id, [queuedItems[0].id, queuedItems[1].id]);
        await ImportRepository.settleProcessingItems(job.id, [{
            itemId: queuedItems[0].id,
            matchedMediaId: 101,
            status: ImportItemStatus.COMPLETED,
        }]);
        await ImportRepository.incrementJobCounters(job.id, {
            failedCount: 0,
            skippedCount: 0,
            completedCount: 1,
            processedCount: 1,
        });

        await db
            .update(importJobs)
            .set({
                error: "Worker stopped",
                updatedAt: sql`datetime('now')`,
            })
            .where(eq(importJobs.id, job.id));

        const requeuedJobs = ImportRepository.requeueInterruptedJobs();

        expect(requeuedJobs).toHaveLength(1);
        expect(requeuedJobs[0]).toMatchObject({
            id: job.id,
            error: null,
            startedAt: null,
            status: ImportJobStatus.QUEUED,
            completedCount: 1,
            processedCount: 1,
        });

        const storedItems = await db
            .select()
            .from(importItems)
            .where(eq(importItems.jobId, job.id))
            .orderBy(importItems.rowNumber);

        expect(storedItems.map(item => item.status)).toEqual([
            ImportItemStatus.COMPLETED,
            ImportItemStatus.QUEUED,
            ImportItemStatus.QUEUED,
        ]);
    });

it("finds jobs only for their owner and counts processing and earlier queued jobs", async () => {
        const processingJob = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        const earlierQueuedJob = await ImportRepository.createJob(43, ImportSource.MYLISTS);
        const targetJob = await ImportRepository.createJob(44, ImportSource.MYLISTS);

        await ImportRepository.markJobQueued(processingJob.id, 0, 0);
        await ImportRepository.markJobQueued(earlierQueuedJob.id, 0, 0);

        const queuedTarget = await ImportRepository.markJobQueued(targetJob.id, 0, 0);
        await db.update(importJobs)
            .set({ status: ImportJobStatus.PROCESSING })
            .where(eq(importJobs.id, processingJob.id));

        await expect(ImportRepository.findJobForUser(targetJob.id, 44)).resolves.toMatchObject({ id: targetJob.id });
        await expect(ImportRepository.findJobForUser(targetJob.id, 999)).resolves.toBeUndefined();
        await expect(ImportRepository.countJobsAhead(queuedTarget)).resolves.toBe(2);
    });

it.each([ImportJobStatus.QUEUED, ImportJobStatus.FAILED])("deletes only owned %s jobs and cascades their items before a processor can claim them", async status => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [createItem(2)]);
        if (status === ImportJobStatus.QUEUED) await ImportRepository.markJobQueued(job.id, 1, 0);
        else await ImportRepository.markJobFailed(job.id, "Invalid file");

        await expect(ImportRepository.deleteQueuedOrTerminalJob(job.id, 999)).resolves.toBeNull();
        expect(await db.select().from(importItems).where(eq(importItems.jobId, job.id))).toHaveLength(1);
        await expect(ImportRepository.deleteQueuedOrTerminalJob(job.id, 42)).resolves.toEqual({ id: job.id });

        expect(await db.select().from(importJobs).where(eq(importJobs.id, job.id))).toHaveLength(0);
        expect(await db.select().from(importItems).where(eq(importItems.jobId, job.id))).toHaveLength(0);
        await expect(ImportRepository.claimNextQueuedJob()).resolves.toBeNull();
        await expect(ImportRepository.findActiveJobForUser(42)).resolves.toBeUndefined();
        expect(ImportRepository.createJob(42, ImportSource.MYLISTS)).toMatchObject({ status: ImportJobStatus.PARSING });
    });

    it("preserves a job and its rows if processing starts after the user's last status check", async () => {
        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [createItem(2)]);
        await ImportRepository.markJobQueued(job.id, 1, 0);
        await expect(ImportRepository.findJobForUser(job.id, 42)).resolves.toMatchObject({ status: ImportJobStatus.QUEUED });

        await ImportRepository.claimNextQueuedJob();
        const beforeJobs = await db.select().from(importJobs);
        const beforeItems = await db.select().from(importItems);
        await expect(ImportRepository.deleteQueuedOrTerminalJob(job.id, 42)).resolves.toBeNull();

        expect(await db.select().from(importJobs)).toEqual(beforeJobs);
        expect(await db.select().from(importItems)).toEqual(beforeItems);
        await expect(ImportRepository.findJobForUser(job.id, 42)).resolves.toMatchObject({ status: ImportJobStatus.PROCESSING });
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
