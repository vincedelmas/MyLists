import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { TvCatalogRefreshCandidatesQuery } = await import("../../tv/catalog/tv-catalog-refresh-candidates.query");
const { MovieCatalogRefreshCandidatesQuery } = await import("../../movies/catalog/movie-catalog-refresh-candidates.query");
const { GameCatalogRefreshCandidatesQuery } = await import("../../games/catalog/game-catalog-refresh-candidates.query");
const { MangaCatalogRefreshCandidatesQuery } = await import("../../manga/catalog/manga-catalog-refresh-candidates.query");


describe("normalized catalog refresh candidates", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let tv: InstanceType<typeof TvCatalogRefreshCandidatesQuery>;
    let movies: InstanceType<typeof MovieCatalogRefreshCandidatesQuery>;
    let games: InstanceType<typeof GameCatalogRefreshCandidatesQuery>;
    let manga: InstanceType<typeof MangaCatalogRefreshCandidatesQuery>;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        tv = new TvCatalogRefreshCandidatesQuery(MediaType.SERIES);
        movies = new MovieCatalogRefreshCandidatesQuery();
        games = new GameCatalogRefreshCandidatesQuery();
        manga = new MangaCatalogRefreshCandidatesQuery();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps the TV changed-feed and aired-episode rules separate", async () => {
        await db.insert(schema.catalogItem).values([
            catalog(1, MediaType.SERIES, { lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(2, MediaType.SERIES, { lastProviderUpdate: "2999-01-01 00:00:00" }),
            catalog(3, MediaType.SERIES, { lastProviderUpdate: "2999-01-01 00:00:00" }),
            catalog(4, MediaType.SERIES, { lastProviderUpdate: "2000-01-01 00:00:00", locked: true }),
            catalog(5, MediaType.ANIME, { lastProviderUpdate: "2000-01-01 00:00:00" }),
        ]);
        await db.insert(schema.tvDetails).values([
            { catalogItemId: 1 },
            { catalogItemId: 2 },
            { catalogItemId: 3, nextEpisodeAirDate: "2000-01-01" },
            { catalogItemId: 4, nextEpisodeAirDate: "2000-01-01" },
            { catalogItemId: 5 },
        ]);

        await expect(tv.getCandidateApiIds([1, 2, 4, 5]))
            .resolves.toEqual(expect.arrayContaining([1, 3]));
        await expect(tv.getCandidateApiIds([1, 2, 4, 5]))
            .resolves.toHaveLength(2);
    });

    it("applies the concrete movie, game, and manga freshness windows", async () => {
        await db.insert(schema.catalogItem).values([
            catalog(10, MediaType.MOVIES, { releaseDate: "2999-01-01", lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(11, MediaType.MOVIES, { releaseDate: "2000-01-01", lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(12, MediaType.GAMES, { releaseDate: null, lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(13, MediaType.GAMES, { releaseDate: "2000-01-01", lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(14, MediaType.MANGA, { releaseDate: "2000-01-01", lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(15, MediaType.MANGA, { releaseDate: "2000-01-01", lastProviderUpdate: "2000-01-01 00:00:00" }),
            catalog(16, MediaType.MANGA, { releaseDate: "2999-01-01", lastProviderUpdate: "2999-01-01 00:00:00" }),
        ]);
        await db.insert(schema.mangaDetails).values([
            { catalogItemId: 14, productionStatus: "Publishing" },
            { catalogItemId: 15, productionStatus: "Finished" },
            { catalogItemId: 16, productionStatus: "Publishing" },
        ]);

        await expect(movies.getCandidateApiIds()).resolves.toEqual([10]);
        await expect(games.getCandidateApiIds()).resolves.toEqual([12]);
        await expect(manga.getCandidateApiIds()).resolves.toEqual([14]);
    });
});


const catalog = (id: number, kind: MediaType, overrides: Partial<typeof schema.catalogItem.$inferInsert> = {}) => {
    return ({
        id,
        kind,
        primaryProvider: providerFor(kind),
        primaryExternalId: String(id),
        name: `${kind}-${id}`,
        imageCover: `${id}.jpg`,
        ...overrides,
    });
}


const providerFor = (kind: MediaType) => {
    if (kind === MediaType.GAMES) return "igdb" as const;
    if (kind === MediaType.MANGA) return "jikan" as const;
    if (kind === MediaType.BOOKS) return "google-books" as const;
    return "tmdb" as const;
};
