import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {
    games,
    gamesCompanies,
    gamesGenre,
    gamesPlatforms,
    series,
    seriesActors,
    seriesEpisodesPerSeason,
    seriesGenre,
    seriesNetwork,
} from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { GamesRepository } = await import("@/lib/server/domain/media/games/games.repository");
const { TvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");


describe("media relation deduplication", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(games).values({
            id: 6651,
            apiId: 11597,
            name: "Poly Bridge",
            imageCover: "poly-bridge.jpg",
        });
        await db.insert(series).values({
            id: 6358,
            apiId: 110492,
            name: "Series",
            duration: 45,
            totalSeasons: 2,
            totalEpisodes: 16,
            imageCover: "series.jpg",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("refreshes a game when every relation payload contains duplicates", async () => {
        const repository = new GamesRepository();
        const duplicateCompany = { name: "Dry Cactus", developer: true, publisher: true };
        const details = {
            mediaData: {
                apiId: 11597,
                name: "Poly Bridge",
                imageCover: "poly-bridge.jpg",
            },
            companiesData: [duplicateCompany, duplicateCompany],
            platformsData: [{ name: "PC" }, { name: "PC" }],
            genresData: [{ name: "Puzzle" }, { name: "Puzzle" }],
        };

        await repository.updateMediaWithDetails(details);
        await repository.storeMediaWithDetails(details);

        await expect(db.select().from(gamesCompanies).where(eq(gamesCompanies.mediaId, 6651)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(gamesPlatforms).where(eq(gamesPlatforms.mediaId, 6651)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(gamesGenre).where(eq(gamesGenre.mediaId, 6651)))
            .resolves.toHaveLength(1);
    });

    it("refreshes a series when actor and other relation payloads contain duplicates", async () => {
        const repository = new TvRepository(seriesServerDefinition);
        const details = {
            mediaData: {
                apiId: 110492,
                name: "Series",
                duration: 45,
                totalSeasons: 2,
                totalEpisodes: 16,
                imageCover: "series.jpg",
            },
            actorsData: [{ name: "Actor" }, { name: "Actor" }],
            genresData: [{ name: "Drama" }, { name: "Drama" }],
            networkData: [{ name: "Network" }, { name: "Network" }],
            seasonsData: [
                { season: 1, episodes: 8 },
                { season: 1, episodes: 8 },
            ],
        };

        await repository.updateMediaWithDetails(details);
        await repository.storeMediaWithDetails(details);

        await expect(db.select().from(seriesActors).where(eq(seriesActors.mediaId, 6358)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(seriesGenre).where(eq(seriesGenre.mediaId, 6358)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(seriesNetwork).where(eq(seriesNetwork.mediaId, 6358)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(seriesEpisodesPerSeason).where(eq(seriesEpisodesPerSeason.mediaId, 6358)))
            .resolves.toHaveLength(1);
    });
});
