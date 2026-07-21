import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, series, seriesEpisodesPerSeason, seriesList, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";
import {createTvMatcher} from "@/lib/server/domain/imports/matchers/tv.matcher";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {TvService} from "@/lib/server/domain/media/tv/tv.service";
import {seriesDefinition} from "@/lib/server/domain/media/tv/series/series.definition";
import {ApiProviderType, ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";


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
        await db.insert(series).values({
            id: 100,
            apiId: 136315,
            name: "The Bear",
            imageCover: "the-bear.jpg",
            releaseDate: "2022-06-23",
            duration: 30,
            totalSeasons: 2,
            totalEpisodes: 18,
        });
        await db.insert(seriesEpisodesPerSeason).values([
            { mediaId: 100, season: 1, episodes: 8 },
            { mediaId: 100, season: 2, episodes: 10 },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("matches an internal series and adds it to the user list", async () => {
        const importService = new ImportService(ImportRepository);
        const seriesService = new TvService(
            new TvRepository(seriesDefinition.repository, seriesDefinition.attribution),
            seriesDefinition.service,
        );
        const matcherRegistry = MediaMatcherRegistry;
        matcherRegistry.register(MediaType.SERIES, createTvMatcher(MediaType.SERIES, seriesService, {} as any, {} as any));
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

        const [storedListItem] = await db.select().from(seriesList).where(eq(seriesList.userId, 42));
        const [storedImportItem] = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));

        expect(storedListItem).toMatchObject({
            userId: 42,
            mediaId: 100,
            rating: 8,
            status: Status.COMPLETED,
            currentSeason: 2,
            currentEpisode: 10,
            total: 18,
            redo2: [0, 0],
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
