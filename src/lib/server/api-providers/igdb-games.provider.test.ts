import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {type BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {HltbApi} from "@/lib/server/api-providers/api/hltb.api";
import type {IgdbApi} from "@/lib/server/api-providers/api/igdb.api";
import type {IgdbGameDetails} from "@/lib/types/provider.types";


const dbContext = vi.hoisted(() => ({ db: undefined as BunSQLiteDatabase<typeof schema> | undefined }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/lib/server/core/images/image-saver", () => ({ saveImageFromUrl: vi.fn().mockResolvedValue("game.jpg") }));

const { createGamesRepository } = await import("@/lib/server/domain/media/games/games.repository");
const { createGamesIngestionService, createIgdbGamesProvider } = await import("./igdb-games.provider");

const igdb = {
    search: vi.fn<IgdbApi["search"]>(),
    getAdvancedSearchOptions: vi.fn<IgdbApi["getAdvancedSearchOptions"]>(),
    getGameDetails: vi.fn<IgdbApi["getGameDetails"]>(),
    getGamesDetails: vi.fn<IgdbApi["getGamesDetails"]>(),
    getGamesCollectionIds: vi.fn<IgdbApi["getGamesCollectionIds"]>(),
    getTrendingGames: vi.fn<IgdbApi["getTrendingGames"]>(),
    refreshAccessToken: vi.fn<IgdbApi["refreshAccessToken"]>(),
    fetchNewIgdbToken: vi.fn<IgdbApi["fetchNewIgdbToken"]>(),
};
const hltb = { search: vi.fn<HltbApi["search"]>() };
const ingestion = createGamesIngestionService(hltb, createGamesRepository(), createIgdbGamesProvider(igdb));
const gameDetails: IgdbGameDetails = {
    id: 123,
    name: "Updated game",
    url: "https://www.igdb.com/games/test-game",
    summary: "Updated synopsis",
    cover: { id: 1, image_id: "cover" },
};


describe("IGDB game ingestion", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(() => {
        vi.clearAllMocks();
        igdb.getGameDetails.mockResolvedValue(gameDetails);
        igdb.getGamesDetails.mockResolvedValue([gameDetails]);
        hltb.search.mockResolvedValue({ name: gameDetails.name, mainStory: "12.5", mainExtra: "24", completionist: "36" });

        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        db.insert(schema.games).values({
            apiId: 123,
            name: "Original game",
            imageCover: "original.jpg",
            lastApiUpdate: "2000-01-01 00:00:00",
            hltbMainTime: 10,
            hltbMainAndExtraTime: 20,
            hltbTotalCompleteTime: 30,
        }).run();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("preserves completion times while bulk refreshing IGDB metadata", async () => {
        const results = [];
        for await (const result of ingestion.bulkRefresh()) results.push(result);

        expect(results).toEqual([{ apiId: 123, state: "fulfilled", reason: undefined }]);
        expect(igdb.getGamesDetails).toHaveBeenCalledWith([123]);
        expect(hltb.search).not.toHaveBeenCalled();
        const updated = db.select().from(schema.games).where(eq(schema.games.apiId, 123)).get();
        expect(updated).toMatchObject({
            name: "Updated game",
            synopsis: "Updated synopsis",
            hltbMainTime: 10,
            hltbMainAndExtraTime: 20,
            hltbTotalCompleteTime: 30,
        });
        expect(updated?.lastApiUpdate).not.toBe("2000-01-01 00:00:00");
    });

    it("saves fresh HowLongToBeat times during an individual refresh", async () => {
        await expect(ingestion.refreshFromExternal(123)).resolves.toBe(true);

        expect(hltb.search).toHaveBeenCalledWith("Updated game");
        expect(db.select().from(schema.games).where(eq(schema.games.apiId, 123)).get()).toMatchObject({
            hltbMainTime: 12.5,
            hltbMainAndExtraTime: 24,
            hltbTotalCompleteTime: 36,
        });
    });

    it("stores unknown completion times as null when bulk importing a new game", async () => {
        igdb.getGamesDetails.mockResolvedValueOnce([{ ...gameDetails, id: 124 }]);

        const stored = await ingestion.storeBatchFromExternal([124]);

        expect(stored.has("124")).toBe(true);
        expect(hltb.search).not.toHaveBeenCalled();
        expect(db.select().from(schema.games).where(eq(schema.games.apiId, 124)).get()).toMatchObject({
            name: "Updated game",
            hltbMainTime: null,
            hltbMainAndExtraTime: null,
            hltbTotalCompleteTime: null,
        });
    });
});
