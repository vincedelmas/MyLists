import Database from "bun:sqlite";
import {eq, sql} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {convertToCsv} from "@/lib/utils/csv";
import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";
import {setupMediaModule} from "@/lib/server/core/container/media.module";
import {setupImportModule} from "@/lib/server/core/container/import.module";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {ImportRepository} from "./import.repository";
import {drainImportJobs} from "./import-drain";
import {MYLISTS_FORMAT_ERROR} from "./mylists-format";
import {MediaMatcherRegistry} from "./matchers/media-matcher.registry";


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

        await expect(drainImportJobs(imports.importProcessor)).resolves.toEqual({ processedJobs: 1, failedJobs: 0 });
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

    it("rejects old, missing and mixed versions without queuing rows or blocking the next upload", async () => {
        for (const formatVersion of ["", "0", "1", "3", "99"]) {
            const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS,
                convertToCsv([exported, { ...exported, formatVersion }]));
            expect(job).toMatchObject({ status: ImportJobStatus.FAILED, error: MYLISTS_FORMAT_ERROR, totalCount: 0 });
            expect(context.db.select().from(schema.importItems).where(eq(schema.importItems.jobId, job.id)).all()).toEqual([]);
        }
        const { comment: _comment, ...missingColumn } = exported;
        const failed = await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([missingColumn]));
        expect(failed.error).toBe(MYLISTS_FORMAT_ERROR);
        expect(await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported])))
            .toMatchObject({ status: ImportJobStatus.QUEUED });
    });

    it("accepts empty nullable fields from an actual export", async () => {
        context.db.update(listTable).set({ rating: null, favorite: null, comment: null }).run();
        context.db.update(mediaTable).set({ releaseDate: null }).run();
        if (mediaType === MediaType.BOOKS) {
            context.db.update(schema.booksList).set({ actualPage: null }).run();
        }
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            const seasons = mediaType === MediaType.SERIES ? schema.seriesListSeasons : schema.animeListSeasons;
            context.db.update(seasons).set({ rating: null }).run();
        }
        const [row] = (await mediaModule.services[mediaType].downloadMediaListAsCSV(42))!;
        const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([row]));
        expect(job.failedCount).toBe(0);
        await drainImportJobs(imports.importProcessor);
        expect((await mediaModule.services[mediaType].downloadMediaListAsCSV(43))![0])
            .toEqual({ ...row, id: expect.any(Number), userId: 43 });
    });

    it("imports valid rows and exposes invalid rows with their field and row number", async () => {
        const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS,
            convertToCsv([exported, { ...exported, status: "invalid status" }]));
        expect(job).toMatchObject({ status: ImportJobStatus.QUEUED, failedCount: 1, processedCount: 1 });
        await drainImportJobs(imports.importProcessor);
        const { job: finished } = await imports.imports.getImportJob(43, job.id);
        expect(finished).toMatchObject({ status: ImportJobStatus.COMPLETED_WITH_ERRORS, failedCount: 1, completedCount: 1, processedCount: 2 });
        const issues = await imports.imports.getImportIssues(43, job.id, 1, 25);
        expect(issues.items).toHaveLength(1);
        expect(issues.items[0]).toMatchObject({ rowNumber: 3, status: ImportItemStatus.FAILED, statusReason: expect.stringContaining("status") });
        expect((await mediaModule.services[mediaType].downloadMediaListAsCSV(43))!).toHaveLength(1);
        await expect(imports.imports.getImportIssues(44, job.id)).rejects.toBeDefined();
    });

    it("finishes an entirely invalid file and allows a corrected upload", async () => {
        const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS,
            convertToCsv([{ ...exported, status: "invalid status" }]));
        await drainImportJobs(imports.importProcessor);
        expect((await imports.imports.getImportJob(43, job.id)).job).toMatchObject({
            status: ImportJobStatus.COMPLETED_WITH_ERRORS, completedCount: 0, failedCount: 1, processedCount: 1,
        });
        expect(await mediaModule.services[mediaType].downloadMediaListAsCSV(43)).toEqual([]);
        expect(await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported])))
            .toMatchObject({ status: ImportJobStatus.QUEUED });
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

    it("settles unfinished rows after a processor crash and continues to the next user's job", async () => {
        const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported]));
        const nextJob = await imports.imports.createImportJob(44, ImportSource.MYLISTS, convertToCsv([exported]));
        vi.spyOn(imports.imports, "getQueuedItemsByMediaType").mockRejectedValueOnce(new Error("Simulated worker failure"));
        await expect(drainImportJobs(imports.importProcessor)).resolves.toEqual({ failedJobs: 1, processedJobs: 1 });
        expect((await imports.imports.getImportJob(43, job.id)).job).toMatchObject({ status: ImportJobStatus.FAILED, failedCount: 1, processedCount: 1 });
        expect((await imports.imports.getImportIssues(43, job.id)).items[0]).toMatchObject({ status: ImportItemStatus.FAILED, statusReason: expect.stringContaining("Please try importing") });
        expect((await imports.imports.getImportJob(44, nextJob.id)).job.status).toBe(ImportJobStatus.COMPLETED);
    });

    if (mediaType === MediaType.MOVIES) {
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

        it("processes the maximum 3000 rows without duplicate entries or incorrect counters", async () => {
            const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS,
                convertToCsv(Array.from({ length: 3000 }, () => exported)));
            await drainImportJobs(imports.importProcessor);
            expect((await imports.imports.getImportJob(43, job.id)).job).toMatchObject({
                status: ImportJobStatus.COMPLETED, totalCount: 3000, processedCount: 3000, completedCount: 3000,
            });
            expect(await mediaModule.services.movies.downloadMediaListAsCSV(43)).toHaveLength(1);
        });

        it("recovers an interrupted import after list insertion without overwriting data or double-counting", async () => {
            const job = await imports.imports.createImportJob(43, ImportSource.MYLISTS, convertToCsv([exported]));
            const crash = new Error("Simulated interruption after list insertion");
            vi.spyOn(imports.imports, "applyItemOutcomes").mockRejectedValueOnce(crash);
            vi.spyOn(imports.imports, "markProcessingJobFailed").mockRejectedValueOnce(crash);
            await expect(drainImportJobs(imports.importProcessor)).rejects.toBe(crash);
            expect(await mediaModule.services.movies.downloadMediaListAsCSV(43)).toHaveLength(1);
            expect((await imports.imports.getImportJob(43, job.id)).job.status).toBe(ImportJobStatus.PROCESSING);

            context.db.update(schema.importJobs).set({ updatedAt: sql`datetime('now', '-7 hours')` })
                .where(eq(schema.importJobs.id, job.id)).run();
            await drainImportJobs(imports.importProcessor);
            expect((await imports.imports.getImportJob(43, job.id)).job).toMatchObject({
                status: ImportJobStatus.COMPLETED, completedCount: 1, processedCount: 1,
            });
            expect((await mediaModule.services.movies.downloadMediaListAsCSV(43))![0])
                .toEqual({ ...exported, id: expect.any(Number), userId: 43 });
        });
    }
});
