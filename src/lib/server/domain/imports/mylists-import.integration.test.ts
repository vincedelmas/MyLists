import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {convertToCsv} from "@/lib/utils/csv";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {setupMediaModule} from "@/lib/server/core/container/media.module";
import {setupImportModule} from "@/lib/server/core/container/import.module";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {ImportRepository} from "./import.repository";
import {drainImportJobs} from "./import-drain";
import {MYLISTS_FORMAT_ERROR} from "./mylists-format";
import {MediaMatcherRegistry} from "./matchers/media-matcher.registry";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";
import {ImportJobProcessor} from "./import-job.processor";
import {ImportService} from "./import.service";


const context = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

// Exercise the real transaction implementation against a disposable database.
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));


describe.each(Object.values(MediaType))("current MyLists %s export/import", mediaType => {
    let sqlite: Database;
    let mediaModule: ReturnType<typeof setupMediaModule>;
    let imports: ReturnType<typeof setupImportModule>["services"];
    let exported: Record<string, any>;
    let externalCall: ReturnType<typeof vi.fn>;
    const { mediaTable, listTable } = getServerMediaDefinition(mediaType).repository.tables;

    beforeEach(async () => {
        MediaMatcherRegistry.clear();
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        context.db.insert(schema.user).values([42, 43, 44].map(id => ({
            id, name: `import-user-${id}`, email: `import-${id}@example.com`, emailVerified: true,
            createdAt: "2024-01-01 00:00:00", updatedAt: "2024-01-01 00:00:00",
        }))).run();

        context.db.insert(mediaTable).values({
            id: 100, apiId: mediaType === MediaType.BOOKS ? "book-100" : 100,
            name: 'A title, with "quotes" and é', imageCover: "test.jpg", releaseDate: "2024-01-01",
            duration: 100, totalSeasons: 1, totalEpisodes: 8, pages: 200, chapters: 40,
        } as any).run();

        context.db.insert(listTable).values({
            id: 10, userId: 42, mediaId: 100, status: Status.COMPLETED,
            rating: 8, favorite: true, comment: 'First line, "quoted"\nSecond line: 日本語',
            redo: 1, total: mediaType === MediaType.BOOKS ? 400 : mediaType === MediaType.MANGA ? 80
                : mediaType === MediaType.MOVIES ? 2 : 16,
            currentSeason: 1, currentEpisode: 8, actualPage: 200, currentChapter: 40,
            playtime: 120, platform: "PC",
        } as any).run();

        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            const episodes = mediaType === MediaType.SERIES ? schema.seriesEpisodesPerSeason : schema.animeEpisodesPerSeason;
            const seasons = mediaType === MediaType.SERIES ? schema.seriesListSeasons : schema.animeListSeasons;
            context.db.insert(episodes).values({ mediaId: 100, season: 1, episodes: 8 }).run();
            context.db.insert(seasons).values({ listId: 10, season: 1, redo: 1, rating: 8 }).run();
        }

        mediaModule = setupMediaModule();
        externalCall = vi.fn().mockRejectedValue(new Error("Provider unavailable"));
        const provider = { search: externalCall, storeFromExternal: externalCall, storeBatchFromExternal: externalCall };
        imports = setupImportModule(mediaModule, {
            registries: { externalProviders: { get: () => provider }, ingestionServices: { get: () => provider } },
        } as any).services;
        [exported] = (await mediaModule.services[mediaType].downloadMediaListAsCSV(42))!;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        sqlite.close();
    });

    it("exports, uploads, processes and re-exports list data without overwriting existing entries", async () => {
        expect(exported.formatVersion).toBe("2");
        const csv = convertToCsv([exported, exported]);
        const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS, csv);
        expect(job).toMatchObject({ status: ImportJobStatus.QUEUED, totalCount: 2, failedCount: 0 });

        await expect(drainImportJobs(imports.importProcessor)).resolves.toEqual({ processedJobs: 1, failedJobs: 0, userIds: [43] });
        const { job: finished } = await imports.imports.getImportJob(43, job.id);
        expect(finished).toMatchObject({ status: ImportJobStatus.COMPLETED, completedCount: 2, processedCount: 2 });

        const restored = (await mediaModule.services[mediaType].downloadMediaListAsCSV(43))!;
        expect(restored).toHaveLength(1);
        expect(restored[0]).toEqual({ ...exported, id: expect.any(Number), userId: 43 });
        expect(externalCall).not.toHaveBeenCalled();

        const changed = { ...exported, rating: 1, comment: "Must not overwrite" };
        await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([changed]));
        await drainImportJobs(imports.importProcessor);
        expect(await mediaModule.services[mediaType].downloadMediaListAsCSV(43)).toEqual(restored);
        expect((await mediaModule.services[mediaType].downloadMediaListAsCSV(42))![0]).toEqual(exported);
    });

    if (mediaType === MediaType.MOVIES) {
        it("preserves local matches during a provider pause, processes other jobs, and resumes unfinished rows", async () => {
            const error = new ProviderRequestError("Provider paused", {
                provider: "test-provider", statusCode: 429, kind: "quota", retryAt: Date.now() + 86_400_000,
            });
            externalCall.mockRejectedValue(error);
            const paused = await imports.imports.createImportJob(43, ImportSource.MYLISTS,
                convertToCsv([exported, { ...exported, externalApiId: "101" }]));
            const other = await imports.imports.createImportJob(44, ImportSource.MYLISTS, convertToCsv([exported]));

            await expect(drainImportJobs(imports.importProcessor)).resolves.toEqual({ processedJobs: 2, failedJobs: 0, userIds: [43, 44] });
            expect(externalCall).toHaveBeenCalledOnce();
            const pausedJob = (await imports.imports.getImportJob(43, paused.id)).job;
            expect(pausedJob).toMatchObject({ status: ImportJobStatus.QUEUED, completedCount: 1, failedCount: 0, error: "Provider paused" });
            expect(pausedJob.nextAttemptAt).toBeTruthy();
            expect((await imports.imports.getImportJob(44, other.id)).job.status).toBe(ImportJobStatus.COMPLETED);
            expect(context.db.select().from(schema.importItems).where(eq(schema.importItems.jobId, paused.id)).all().map(row => row.status))
                .toEqual([ImportItemStatus.COMPLETED, ImportItemStatus.QUEUED]);

            // A fresh processor must respect the persisted pause, including during crash recovery.
            const resumedProcessor = new ImportJobProcessor(new ImportService(ImportRepository), MediaMatcherRegistry);
            await resumedProcessor.requeueInterruptedJobs();
            await expect(resumedProcessor.processNextJob()).resolves.toBeNull();
            context.db.update(schema.importJobs).set({ nextAttemptAt: "2000-01-01 00:00:00" }).where(eq(schema.importJobs.id, paused.id)).run();
            externalCall.mockResolvedValue(100);

            await expect(resumedProcessor.processNextJob()).resolves.toMatchObject({
                id: paused.id, status: ImportJobStatus.COMPLETED, completedCount: 2, error: null, nextAttemptAt: null,
            });
            expect(externalCall).toHaveBeenCalledTimes(2);
            expect(context.db.select().from(listTable).where(eq(listTable.userId, 43)).all()).toHaveLength(1);
        });

        it("imports and retries without creating Activity or Media Feed entries or changing existing history", async () => {
            context.db.insert(schema.userMediaMonthlyActivity).values({
                userId: 43, mediaId: 99, mediaType, monthBucket: "2024-01",
                progressGained: 1, hadCompletion: true, redoGained: 0,
            }).run();
            context.db.insert(schema.userMediaUpdate).values({
                userId: 43, mediaId: 99, mediaType, mediaName: "Existing manual activity", updateType: UpdateType.STATUS,
                payload: { old_value: null, new_value: Status.COMPLETED },
            }).run();
            const activitiesBefore = context.db.select().from(schema.userMediaMonthlyActivity).all();
            const feedBefore = context.db.select().from(schema.userMediaUpdate).all();

            for (let attempt = 0; attempt < 2; attempt++) {
                const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported]));
                await drainImportJobs(imports.importProcessor);
                expect((await imports.imports.getImportJob(43, job.id)).job.status).toBe(ImportJobStatus.COMPLETED);
                expect((await mediaModule.services[mediaType].downloadMediaListAsCSV(43))!).toHaveLength(1);
                expect(context.db.select().from(schema.userMediaMonthlyActivity).all()).toEqual(activitiesBefore);
                expect(context.db.select().from(schema.userMediaUpdate).all()).toEqual(feedBefore);
            }
        });

        it("rolls back the whole upload if saving its rows fails", async () => {
            const insert = ImportRepository.insertParsedItems;
            vi.spyOn(ImportRepository, "insertParsedItems").mockImplementation((jobId, items) => {
                insert(jobId, items);
                throw new Error("Simulated database failure after insert");
            });
            await expect(imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported])))
                .rejects.toThrow("The import could not be saved. Please try again.");
            expect(context.db.select().from(schema.importJobs).all()).toEqual([]);
            expect(context.db.select().from(schema.importItems).all()).toEqual([]);
        });

        it("accepts only one simultaneous upload per user and rolls back the rejected upload", async () => {
            const csv = convertToCsv([exported]);
            const results = await Promise.allSettled([
                imports.imports.createImportJob(43, ImportSource.MYLISTS, csv),
                imports.imports.createImportJob(43, ImportSource.MYLISTS, csv),
            ]);
            expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
            const rejected = results.find(result => result.status === "rejected");
            expect(rejected?.reason.message).toBe("You already have an import in progress. Wait for it to finish before starting another.");
            expect(context.db.select().from(schema.importJobs).all()).toHaveLength(1);
            expect(context.db.select().from(schema.importItems).all()).toHaveLength(1);
        });

        it("serializes simultaneous drains without importing jobs twice", async () => {
            const csv = convertToCsv([exported]);
            const jobs = await Promise.all([43, 44].map(userId => imports.imports.createImportJob(userId, ImportSource.MYLISTS, csv)));
            const results = await Promise.all([
                drainImportJobs(imports.importProcessor),
                drainImportJobs(imports.importProcessor),
            ]);
            expect(results.reduce((total, result) => total + result.processedJobs, 0)).toBe(2);
            for (const job of jobs) {
                expect((await imports.imports.getImportJob(job.userId, job.id)).job).toMatchObject({
                    status: ImportJobStatus.COMPLETED, completedCount: 1, processedCount: 1,
                });
                expect(await mediaModule.services.movies.downloadMediaListAsCSV(job.userId)).toHaveLength(1);
            }
        });

it("paginates admin history across users, filters jobs and reports processing duration without queue time", async () => {
            const jobs = context.db.insert(schema.importJobs).values([
                { userId: 42, status: ImportJobStatus.COMPLETED, startedAt: "2024-01-01 00:02:00", finishedAt: "2024-01-01 00:03:05" },
                { userId: 43, status: ImportJobStatus.FAILED, error: MYLISTS_FORMAT_ERROR, finishedAt: "2024-01-01 00:00:01" },
                { userId: 44, status: ImportJobStatus.QUEUED },
            ].map(job => ({ ...job, source: ImportSource.MYLISTS, createdAt: "2024-01-01 00:00:00" }))).returning().all();

            const first = await imports.imports.getJobsForAdmin({ perPage: 2 });
            expect(first).toMatchObject({ total: 3, pages: 2, page: 1 });
            expect(first.items.map(job => job.id)).toEqual([jobs[2].id, jobs[1].id]);
            expect(first.items.map(job => job.processingDurationMs)).toEqual([null, null]);
            expect(first.items[1].error).toBe(MYLISTS_FORMAT_ERROR);

            const second = await imports.imports.getJobsForAdmin({ perPage: 2, page: 2 });
            expect(second.items).toHaveLength(1);
            expect(second.items[0]).toMatchObject({ username: "import-user-42", processingDurationMs: 65_000 });
            expect((await imports.imports.getJobsForAdmin({ status: ImportJobStatus.QUEUED })).items.map(job => job.id)).toEqual([jobs[2].id]);
            expect((await imports.imports.getJobsForAdmin({ search: "user-43" })).items.map(job => job.id)).toEqual([jobs[1].id]);
            expect((await imports.imports.getJobsForAdmin({ search: String(jobs[0].id) })).items.map(job => job.id)).toEqual([jobs[0].id]);
            expect((await imports.imports.getJobsForAdmin({ search: "user-43", status: ImportJobStatus.COMPLETED })).total).toBe(0);
            expect((await imports.imports.getJobsForAdmin({ search: "' OR 1=1 --" })).total).toBe(0);
        });

it("shows row issues for the selected admin job across users without mixing jobs", async () => {
            const invalidCsv = convertToCsv([{ ...exported, status: "invalid status" }]);
            const first = await imports.imports.createImportJob(43, ImportSource.MYLISTS, invalidCsv);
            const second = await imports.imports.createImportJob(44, ImportSource.MYLISTS, invalidCsv);
            const firstIssues = await imports.imports.getIssuesForAdmin(first.id);
            const secondIssues = await imports.imports.getIssuesForAdmin(second.id);
            expect(firstIssues).toMatchObject({ total: 1, pages: 1 });
            expect(firstIssues.items[0]).toMatchObject({ rowNumber: 2, statusReason: expect.stringContaining("Allowed statuses: Completed, Plan to Watch") });
            expect(firstIssues.items[0].id).not.toBe(secondIssues.items[0].id);
        });

        it("recovers an interrupted import after list insertion without overwriting data or double-counting", async () => {
            const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported]));
            const crash = new Error("Simulated interruption after list insertion");
            vi.spyOn(imports.imports, "applyItemOutcomes").mockRejectedValueOnce(crash);
            vi.spyOn(imports.imports, "markProcessingJobFailed").mockRejectedValueOnce(crash);
            await expect(drainImportJobs(imports.importProcessor)).rejects.toBe(crash);
            expect(await mediaModule.services.movies.downloadMediaListAsCSV(43)).toHaveLength(1);
            expect((await imports.imports.getImportJob(43, job.id)).job.status).toBe(ImportJobStatus.PROCESSING);

            imports.importProcessor.requeueInterruptedJobs();
            await drainImportJobs(imports.importProcessor);
            expect((await imports.imports.getImportJob(43, job.id)).job).toMatchObject({
                status: ImportJobStatus.COMPLETED, completedCount: 1, processedCount: 1,
            });
            expect((await mediaModule.services.movies.downloadMediaListAsCSV(43))![0])
                .toEqual({ ...exported, id: expect.any(Number), userId: 43 });
        });
    }
});
