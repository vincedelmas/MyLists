import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, movies, moviesList, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: <T>(action: () => T) => action(),
}));


const { ImportService } = await import("@/lib/server/domain/imports/import.service");
const { createMoviesService } = await import("@/lib/server/domain/media/movies/movies.service");
const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");
const { createMoviesMatcher } = await import("@/lib/server/domain/media/movies/movies.matcher");
const { createMoviesRepository } = await import("@/lib/server/domain/media/movies/movies.repository");
const { ImportJobProcessor } = await import("@/lib/server/domain/imports/import-job.processor");
const { MediaMatcherRegistry } = await import("@/lib/server/domain/imports/matchers/media-matcher.registry");


describe("movies import processing", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        MediaMatcherRegistry.clear();

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
        await db.insert(movies).values({
            id: 100,
            apiId: 550,
            duration: 139,
            name: "Fight Club",
            imageCover: "fight-club.jpg",
            releaseDate: "1999-10-15",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("imports Letterboxd ratings, watched films, and watchlist in order while preserving existing entries", async () => {
        await db.insert(movies).values([
            { id: 101, apiId: 680, duration: 154, name: "Pulp Fiction", imageCover: "pulp-fiction.jpg", releaseDate: "1994-09-10" },
            { id: 102, apiId: 603, duration: 136, name: "The Matrix", imageCover: "matrix.jpg", releaseDate: "1999-03-31" },
        ]);
        const importService = new ImportService(ImportRepository);
        const search = vi.fn();
        MediaMatcherRegistry.register(MediaType.MOVIES, createMoviesMatcher(
            createMoviesService(createMoviesRepository()),
            { search } as any,
            { storeFromExternal: vi.fn() } as any,
        ));
        const processor = new ImportJobProcessor(importService, MediaMatcherRegistry);
        const headers = "Date,Name,Year,Letterboxd URI";
        const fightClub = "2024-01-01,Fight Club,1999,https://boxd.it/2a9q";

        for (const [type, csv] of [
            ["ratings", `${headers},Rating\n${fightClub},3.5`],
            ["watched", `${headers}\n${fightClub}\n2024-01-01,Pulp Fiction,1994,https://boxd.it/29Pq`],
            ["watchlist", `${headers}\n${fightClub}\n2024-01-01,The Matrix,1999,https://boxd.it/2a1m`],
            ["ratings", `${headers},Rating\n${fightClub},5`],
        ] as const) {
            const job = await importService.createImportJob(42, ImportSource.LETTERBOXD, csv, type);
            expect(job.status).toBe(ImportJobStatus.QUEUED);
            await expect(processor.processNextJob()).resolves.toMatchObject({
                id: job.id, status: ImportJobStatus.COMPLETED, failedCount: 0, skippedCount: 0,
            });
        }

        expect(search).not.toHaveBeenCalled();
        const list = await db.select().from(moviesList).where(eq(moviesList.userId, 42)).orderBy(moviesList.mediaId);
        expect(list).toMatchObject([
            { mediaId: 100, status: Status.COMPLETED, rating: 7, redo: 0, total: 1 },
            { mediaId: 101, status: Status.COMPLETED, rating: null, redo: 0, total: 1 },
            { mediaId: 102, status: Status.PLAN_TO_WATCH, rating: null, redo: 0, total: 0 },
        ]);
    });

    it("resolves Letterboxd movies through TMDB and reports invalid or unmatched rows", async () => {
        const importService = new ImportService(ImportRepository);
        const search = vi.fn().mockImplementation(async (name: string) => ({
            hasNextPage: false,
            data: name === "Pulp Fiction"
                ? [{ id: "680", name, date: "1994-09-10", itemType: MediaType.MOVIES }]
                : [],
        }));
        const storeFromExternal = vi.fn(async () => {
            await db.insert(movies).values({
                id: 101, apiId: 680, duration: 154, name: "Pulp Fiction", imageCover: "pulp-fiction.jpg", releaseDate: "1994-09-10",
            });
            return 101;
        });
        MediaMatcherRegistry.register(MediaType.MOVIES, createMoviesMatcher(
            createMoviesService(createMoviesRepository()), { search } as any, { storeFromExternal } as any,
        ));
        const processor = new ImportJobProcessor(importService, MediaMatcherRegistry);
        const job = await importService.createImportJob(42, ImportSource.LETTERBOXD, [
            "Date,Name,Year,Letterboxd URI,Rating",
            "2024-01-01,Pulp Fiction,1994,https://boxd.it/29Pq,4.5",
            "2024-01-01,Unknown Movie,2024,https://boxd.it/missing,4",
            "2024-01-01,Fight Club,1999,https://boxd.it/2a9q,99",
        ].join("\n"), "ratings");

        await expect(processor.processNextJob()).resolves.toMatchObject({
            id: job.id, status: ImportJobStatus.COMPLETED_WITH_ERRORS,
            failedCount: 1, skippedCount: 1, completedCount: 1, processedCount: 3,
        });
        expect(search).toHaveBeenCalledTimes(2);
        expect(storeFromExternal).toHaveBeenCalledExactlyOnceWith("680", false);
        expect(await db.select().from(moviesList).where(eq(moviesList.userId, 42))).toMatchObject([
            { mediaId: 101, status: Status.COMPLETED, rating: 9, total: 1 },
        ]);
    });

    it("matches an internal movie, adds it to the user list, and completes the import job", async () => {
        const importService = new ImportService(ImportRepository);
        const moviesService = createMoviesService(createMoviesRepository());
        const matcherRegistry = MediaMatcherRegistry;
        matcherRegistry.register(MediaType.MOVIES, createMoviesMatcher(
            moviesService,
            { search: vi.fn() } as any,
            { storeFromExternal: vi.fn() } as any,
        ));
        const processor = new ImportJobProcessor(importService, matcherRegistry);

        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [{
            rowNumber: 2,
            name: "Fight Club",
            releaseDate: "1999",
            mediaType: MediaType.MOVIES,
            statusReason: null,
            externalApiId: "550",
            externalApiSource: ApiProviderType.TMDB,
            payload: {
                redo: 1,
                total: 2,
                rating: 9,
                favorite: true,
                status: Status.COMPLETED,
            },
            status: ImportItemStatus.QUEUED,
        }]);
        await ImportRepository.markJobQueued(job.id, 1, 0);

        await expect(processor.processNextJob()).resolves.toMatchObject({
            id: job.id,
            status: ImportJobStatus.COMPLETED,
            completedCount: 1,
            processedCount: 1,
        });

        const [storedListItem] = await db.select().from(moviesList).where(eq(moviesList.userId, 42));
        const [storedImportItem] = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));

        expect(storedListItem).toMatchObject({
            redo: 1,
            total: 2,
            userId: 42,
            mediaId: 100,
            rating: 9,
            favorite: true,
            status: Status.COMPLETED,
        });
        expect(storedImportItem).toMatchObject({
            matchedMediaId: 100,
            status: ImportItemStatus.COMPLETED,
        });
        expect(storedJob).toMatchObject({
            failedCount: 0,
            skippedCount: 0,
            completedCount: 1,
            processedCount: 1,
            status: ImportJobStatus.COMPLETED,
        });
    });

    it("settles external skipped and failed movie rows and completes the import job with errors", async () => {
        const importService = new ImportService(ImportRepository);
        const moviesService = createMoviesService(createMoviesRepository());
        const moviesProvider = {
            search: vi.fn()
                .mockResolvedValueOnce({ hasNextPage: false, data: [] })
                .mockRejectedValueOnce(new Error("TMDB unavailable")),
        };
        const matcherRegistry = MediaMatcherRegistry;
        matcherRegistry.register(MediaType.MOVIES, createMoviesMatcher(
            moviesService,
            moviesProvider as any,
            { storeFromExternal: vi.fn() } as any,
        ));
        const processor = new ImportJobProcessor(importService, matcherRegistry);

        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [
            {
                rowNumber: 2,
                name: "Missing Movie",
                releaseDate: "2024",
                mediaType: MediaType.MOVIES,
                statusReason: null,
                externalApiId: null,
                externalApiSource: null,
                payload: { redo: 0, total: 1, status: Status.COMPLETED },
                status: ImportItemStatus.QUEUED,
            },
            {
                rowNumber: 3,
                name: "Broken Movie",
                releaseDate: "2025",
                mediaType: MediaType.MOVIES,
                statusReason: null,
                externalApiId: null,
                externalApiSource: null,
                payload: { redo: 0, total: 1, status: Status.COMPLETED },
                status: ImportItemStatus.QUEUED,
            },
        ]);
        await ImportRepository.markJobQueued(job.id, 2, 0);

        await expect(processor.processNextJob()).resolves.toMatchObject({
            id: job.id,
            status: ImportJobStatus.COMPLETED_WITH_ERRORS,
            failedCount: 1,
            skippedCount: 1,
            completedCount: 0,
            processedCount: 2,
        });

        const storedListItems = await db.select().from(moviesList).where(eq(moviesList.userId, 42));
        const storedImportItems = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));
        const [skippedItem, failedItem] = storedImportItems.sort((a, b) => a.rowNumber - b.rowNumber);

        expect(moviesProvider.search).toHaveBeenCalledTimes(2);
        expect(storedListItems).toEqual([]);
        expect(skippedItem).toMatchObject({
            rowNumber: 2,
            matchedMediaId: null,
            status: ImportItemStatus.SKIPPED,
            statusReason: "Movie API match not found",
        });
        expect(failedItem).toMatchObject({
            rowNumber: 3,
            matchedMediaId: null,
            status: ImportItemStatus.FAILED,
            statusReason: "API failed for this media",
        });
        expect(storedJob).toMatchObject({
            failedCount: 1,
            skippedCount: 1,
            completedCount: 0,
            processedCount: 2,
            status: ImportJobStatus.COMPLETED_WITH_ERRORS,
        });
    });
});
