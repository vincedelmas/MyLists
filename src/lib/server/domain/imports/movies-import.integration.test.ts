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
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


const { ImportService } = await import("@/lib/server/domain/imports/import.service");
const { MoviesService } = await import("@/lib/server/domain/media/movies/movies.service");
const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");
const { MoviesMatcher } = await import("@/lib/server/domain/imports/matchers/movies.matcher");
const { MoviesRepository } = await import("@/lib/server/domain/media/movies/movies.repository");
const { ImportJobProcessor } = await import("@/lib/server/domain/imports/import-job.processor");
const { MediaMatcherRegistry } = await import("@/lib/server/domain/imports/matchers/media-matcher.registry");


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

    it("matches an internal movie, adds it to the user list, and completes the import job", async () => {
        const importService = new ImportService(ImportRepository);
        const moviesService = new MoviesService(new MoviesRepository());
        const matcherRegistry = new MediaMatcherRegistry();
        matcherRegistry.register(MediaType.MOVIES, MoviesMatcher.create(moviesService, { search: vi.fn() } as any));
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
});
