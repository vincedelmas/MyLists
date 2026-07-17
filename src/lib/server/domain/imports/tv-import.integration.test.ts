import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";
import {createTvMatcher} from "@/lib/server/domain/imports/matchers/tv.matcher";
import {ApiProviderType, ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";
import {TvLibraryCommands} from "@/lib/server/domain/library/tv/tv-library.commands";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


describe("TV import processing", () => {
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
        await db.insert(schema.catalogItem).values({
            id: 1000, kind: MediaType.SERIES, primaryProvider: ApiProviderType.TMDB,
            primaryExternalId: "136315", name: "The Bear", imageCover: "the-bear.jpg",
        });
        await db.insert(schema.tvDetails).values({
            catalogItemId: 1000, episodeDurationMinutes: 30, totalSeasons: 2, totalEpisodes: 18,
        });
        await db.insert(schema.tvSeason).values([
            { catalogItemId: 1000, seasonNumber: 1, episodeCount: 8 },
            { catalogItemId: 1000, seasonNumber: 2, episodeCount: 10 },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("matches an internal series and adds it to the user list", async () => {
        const importService = new ImportService(ImportRepository);
        const matcherRegistry = MediaMatcherRegistry;
        matcherRegistry.register(MediaType.SERIES, createTvMatcher(
            MediaType.SERIES, new TvCatalogIngestionRepository(MediaType.SERIES), {} as any, {} as any, new TvLibraryCommands(),
        ));
        const processor = new ImportJobProcessor(importService, matcherRegistry);

        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [{
            rowNumber: 2,
            name: "The Bear",
            releaseDate: "2022",
            mediaType: MediaType.SERIES,
            statusReason: null,
            externalApiId: "136315",
            externalApiSource: ApiProviderType.TMDB,
            payload: {
                rating: 8,
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
            status: schema.libraryEntry.status,
            currentSeason: schema.tvProgress.currentSeason,
            currentEpisode: schema.tvProgress.currentEpisode,
            watchedEpisodes: schema.tvProgress.watchedEpisodes,
        }).from(schema.libraryEntry).innerJoin(
            schema.tvProgress, eq(schema.tvProgress.libraryEntryId, schema.libraryEntry.id),
        ).where(eq(schema.libraryEntry.userId, 42)).get();
        const [storedImportItem] = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));

        expect(storedListItem).toMatchObject({
            userId: 42,
            catalogItemId: 1000,
            rating: 8,
            status: Status.COMPLETED,
            currentSeason: 2,
            currentEpisode: 10,
            watchedEpisodes: 18,
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
});
