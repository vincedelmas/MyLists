import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import {TvCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {TvMediaType} from "@/lib/types/media-kind.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: () => Promise<unknown>) => action(),
}));


const { TvCatalogIngestionRepository } = await import("./tv-catalog-ingestion.repository");
const { TvCatalogIngestionCommand } = await import("./tv-catalog-ingestion.command");
const { TvLibraryRepository } = await import("@/lib/server/domain/library/tv/tv-library.repository");
const { TvLibraryCommands } = await import("@/lib/server/domain/library/tv/tv-library.commands");


describe("TV catalog ingestion command", () => {
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
            catalog: new TvCatalogIngestionCommand(new TvCatalogIngestionRepository(MediaType.SERIES)),
        });
        const animeIngestion = createMediaIngestionService({
            provider: animeProvider,
            catalog: new TvCatalogIngestionCommand(new TvCatalogIngestionRepository(MediaType.ANIME)),
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
        const ingestion = createMediaIngestionService({
            provider: externalProvider,
            catalog: new TvCatalogIngestionCommand(catalogRepository),
        });
        const catalogItemId = await ingestion.storeFromExternal(888);

        const library = new TvLibraryCommands(new TvLibraryRepository());
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
            seasons: [{ seasonNumber: 1, episodeCount: 10 }],
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


const provider = (mediaType: TvMediaType, transformed: TvCatalogSnapshot) => ({
    source: "tmdb" as const,
    mediaType,
    search: { search: vi.fn() },
    details: { getDetails: vi.fn(async () => transformed) },
}) satisfies ExternalMediaProvider<TvCatalogSnapshot>;


const details = ({
                     apiId,
                     name,
                     duration = 45,
                     seasons = [{ seasonNumber: 1, episodeCount: 12 }, { seasonNumber: 2, episodeCount: 8 }],
                 }: {
    apiId: number;
    name: string;
    duration?: number;
    seasons?: { seasonNumber: number; episodeCount: number }[];
}): TvCatalogSnapshot => ({
    apiId,
    name,
    durationMinutes: duration,
    imageCover: "series.jpg",
    totalSeasons: seasons.length,
    totalEpisodes: seasons.reduce((total, season) => total + season.episodeCount, 0),
    seasons,
    actors: ["Actor"],
    networks: ["Network"],
    genres: ["Drama"],
});
