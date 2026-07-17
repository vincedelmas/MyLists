import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, libraryEntry, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


const { ImportService } = await import("@/lib/server/domain/imports/import.service");
const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");
const { createMoviesMatcher } = await import("@/lib/server/domain/media/movies/imports/movies.matcher");
const { ImportJobProcessor } = await import("@/lib/server/domain/imports/import-job.processor");
const { MovieLibraryCommands } = await import("@/lib/server/domain/media/movies/library/movie-library.commands");
const { MovieCatalogIngestionRepository } = await import("@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.repository");


describe("movies import processing", () => {
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
        await db.insert(schema.catalogItem).values({
            id: 1000, kind: MediaType.MOVIES, primaryProvider: ApiProviderType.TMDB,
            primaryExternalId: "550", name: "Fight Club", imageCover: "fight-club.jpg",
        });
        await db.insert(schema.movieDetails).values({ catalogItemId: 1000, durationMinutes: 139 });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("matches an internal movie, adds it to the user list, and completes the import job", async () => {
        const importService = new ImportService(ImportRepository);
        const matcher = createMoviesMatcher(
            new MovieCatalogIngestionRepository(),
            { search: { search: vi.fn() } } as any,
            { storeFromExternal: vi.fn() } as any,
            new MovieLibraryCommands(),
        );
        const processor = new ImportJobProcessor(importService, { get: () => matcher });

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

        const storedListItem = await db.select({
            userId: schema.libraryEntry.userId,
            catalogItemId: schema.libraryEntry.catalogItemId,
            rating: schema.libraryEntry.rating,
            favorite: schema.libraryEntry.favorite,
            status: schema.libraryEntry.status,
            watchCount: schema.movieProgress.watchCount,
        }).from(schema.libraryEntry).innerJoin(
            schema.movieProgress, eq(schema.movieProgress.libraryEntryId, schema.libraryEntry.id),
        ).where(eq(schema.libraryEntry.userId, 42)).get();
        const [storedImportItem] = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));

        expect(storedListItem).toMatchObject({
            watchCount: 2,
            userId: 42,
            catalogItemId: 1000,
            rating: 9,
            favorite: true,
            status: Status.COMPLETED,
        });
        expect(storedImportItem).toMatchObject({
            matchedMediaId: 1000,
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
        const moviesProvider = {
            search: {
                search: vi.fn()
                    .mockResolvedValueOnce({ hasNextPage: false, data: [] })
                    .mockRejectedValueOnce(new Error("TMDB unavailable")),
            },
        };
        const matcher = createMoviesMatcher(
            new MovieCatalogIngestionRepository(),
            moviesProvider as any,
            { storeFromExternal: vi.fn() } as any,
            new MovieLibraryCommands(),
        );
        const processor = new ImportJobProcessor(importService, { get: () => matcher });

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

        const storedListItems = await db.select().from(libraryEntry).where(eq(libraryEntry.userId, 42));
        const storedImportItems = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));
        const [skippedItem, failedItem] = storedImportItems.sort((a, b) => a.rowNumber - b.rowNumber);

        expect(moviesProvider.search.search).toHaveBeenCalledTimes(2);
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
