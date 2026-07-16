import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import {UpsertTvWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvCatalogIngestionRepository } = await import("./tv-catalog-ingestion.repository");
const { TvLibraryRepository } = await import("@/lib/server/domain/library/tv/tv-library.repository");
const { TvLibraryService } = await import("@/lib/server/domain/library/tv/tv-library.service");


describe("v2 TV ingestion adapter", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(schema.user).values({
            id: 42,
            name: "catalog-user",
            email: "catalog-user@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("reuses the retained provider pipeline with global, kind-scoped catalog identity", async () => {
        const seriesProvider = provider(MediaType.SERIES, details({ name: "Series", apiId: 777 }));
        const animeProvider = provider(MediaType.ANIME, details({ name: "Anime", apiId: 777 }));
        const seriesIngestion = createMediaIngestionService({
            provider: seriesProvider,
            repository: new TvCatalogIngestionRepository(MediaType.SERIES),
        });
        const animeIngestion = createMediaIngestionService({
            provider: animeProvider,
            repository: new TvCatalogIngestionRepository(MediaType.ANIME),
        });

        const seriesId = await seriesIngestion.storeFromExternal(777);
        expect(await seriesIngestion.storeFromExternal(777)).toBe(seriesId);
        const animeId = await animeIngestion.storeFromExternal(777);

        expect(animeId).not.toBe(seriesId);
        expect(seriesProvider.details.getDetails).toHaveBeenCalledTimes(1);
        expect(animeProvider.details.getDetails).toHaveBeenCalledTimes(1);
        expect(await db.select().from(schema.catalogItem)).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: seriesId, kind: MediaType.SERIES, primaryExternalId: "777" }),
            expect.objectContaining({ id: animeId, kind: MediaType.ANIME, primaryExternalId: "777" }),
        ]));
    });

    it("reconciles user progress, rewatches and stats when refreshed season metadata changes", async () => {
        const initial = details({ name: "Changing Series", apiId: 888, duration: 45 });
        const externalProvider = provider(MediaType.SERIES, initial);
        const catalogRepository = new TvCatalogIngestionRepository(MediaType.SERIES);
        const ingestion = createMediaIngestionService({ provider: externalProvider, repository: catalogRepository });
        const catalogItemId = await ingestion.storeFromExternal(888);

        const library = new TvLibraryService(new TvLibraryRepository());
        await library.add({ userId: 42, catalogItemId, status: Status.COMPLETED });
        await library.replaceRewatches({
            userId: 42,
            catalogItemId,
            rewatches: [{ seasonNumber: 2, count: 1 }],
        });

        externalProvider.details.getDetails = vi.fn(async () => details({
            name: "Changing Series",
            apiId: 888,
            duration: 50,
            seasons: [{ season: 1, episodes: 10 }],
        }));
        await ingestion.refreshFromExternal(888);

        const entry = await new TvLibraryRepository().findEntry(42, catalogItemId);
        expect(entry?.progress).toEqual({
            status: Status.COMPLETED,
            currentSeason: 1,
            currentEpisode: 10,
            watchedEpisodes: 10,
            rewatches: [],
        });
        expect(entry?.episodeDurationMinutes).toBe(50);

        const [stats] = await db.select().from(schema.libraryStats);
        expect(stats).toMatchObject({ totalEntries: 1, totalSpecific: 10, totalRedo: 0, timeSpentMinutes: 500 });
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 28 }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toHaveLength(2);
    });
});


const provider = (mediaType: typeof MediaType.SERIES | typeof MediaType.ANIME, transformed: UpsertTvWithDetails) => ({
    source: "tmdb" as const,
    mediaType,
    search: { search: vi.fn() },
    details: { getDetails: vi.fn(async () => transformed) },
}) satisfies ExternalMediaProvider<UpsertTvWithDetails>;


const details = ({
    apiId,
    name,
    duration = 45,
    seasons = [{ season: 1, episodes: 12 }, { season: 2, episodes: 8 }],
}: {
    apiId: number;
    name: string;
    duration?: number;
    seasons?: { season: number; episodes: number }[];
}): UpsertTvWithDetails => ({
    mediaData: {
        apiId,
        name,
        duration,
        imageCover: "series.jpg",
        totalSeasons: seasons.length,
        totalEpisodes: seasons.reduce((total, season) => total + season.episodes, 0),
    },
    seasonsData: seasons,
    actorsData: [{ name: "Actor" }],
    networkData: [{ name: "Network" }],
    genresData: [{ name: "Drama" }],
});
