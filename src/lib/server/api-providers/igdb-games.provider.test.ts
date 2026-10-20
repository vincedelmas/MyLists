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
const { saveImageFromUrl } = await import("@/lib/server/core/images/image-saver");

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

    it.each(["import", "individual refresh", "bulk refresh"])("saves landscape artwork and exposes its CDN URL during %s", async (mode) => {
        const details: IgdbGameDetails = {
            ...gameDetails,
            id: mode === "import" ? 456 : gameDetails.id,
            artworks: [
                { image_id: "portrait", width: 600, height: 900 },
                { image_id: "square", width: 900, height: 900 },
                { image_id: "landscape", width: 1920, height: 1080 },
            ],
        };
        igdb.getGameDetails.mockResolvedValue(details);
        igdb.getGamesDetails.mockResolvedValue([details]);

        if (mode === "import") {
            await ingestion.storeFromExternal(details.id);
        }
        else if (mode === "individual refresh") {
            await ingestion.refreshFromExternal(details.id);
        }
        else {
            for await (const result of ingestion.bulkRefresh()) {
                expect(result.state).toBe("fulfilled");
            }
        }

        const game = db.select().from(schema.games).where(eq(schema.games.apiId, details.id)).get()!;
        expect(game.backdropImageId).toBe("landscape");
        const media = await createGamesRepository().findAllAssociatedDetails(game.id);
        expect(media?.providerData?.backdropUrl).toBe("https://images.igdb.com/igdb/image/upload/t_1080p/landscape.jpg");
        expect(saveImageFromUrl).toHaveBeenCalledTimes(1);
    });

    it.each([undefined, [{ image_id: "portrait", width: 600, height: 900 }]])("keeps the backdrop unavailable without landscape artwork (%j)", async (artworks) => {
        igdb.getGameDetails.mockResolvedValueOnce({ ...gameDetails, artworks });

        await ingestion.refreshFromExternal(gameDetails.id);

        const game = db.select().from(schema.games).where(eq(schema.games.apiId, gameDetails.id)).get()!;
        expect(game.backdropImageId).toBeNull();
        const media = await createGamesRepository().findAllAssociatedDetails(game.id);
        expect(media?.providerData?.backdropUrl).toBeNull();
    });

    it.each(["refresh", "edit"])("preserves HLTB changes saved by a %s while a background lookup is pending", async (mode) => {
        db.update(schema.games).set({ hltbMainTime: null, hltbMainAndExtraTime: null, hltbTotalCompleteTime: null })
            .where(eq(schema.games.apiId, 123)).run();
        const game = db.select().from(schema.games).where(eq(schema.games.apiId, 123)).get()!;
        let finishLookup!: (data: Awaited<ReturnType<HltbApi["search"]>>) => void;
        hltb.search.mockImplementationOnce(() => new Promise(resolve => { finishLookup = resolve; }));
        const lookup = ingestion.checkMissingHltb(game.id);

        if (mode === "refresh") {
            await ingestion.refreshFromExternal(123);
        }
        else {
            db.update(schema.games).set({ hltbMainTime: 42 }).where(eq(schema.games.id, game.id)).run();
        }
        const before = db.select().from(schema.games).where(eq(schema.games.id, game.id)).get()!;
        finishLookup({ name: game.name, mainStory: null, mainExtra: null, completionist: null });

        await expect(lookup).resolves.toMatchObject({
            hltbMainTime: before.hltbMainTime,
            hltbLastCheckedAt: before.hltbLastCheckedAt,
        });
        expect(db.select().from(schema.games).where(eq(schema.games.id, game.id)).get()).toEqual(before);
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

    it.each(["individual", "bulk"])("preserves the existing cover when a download fails during %s refresh", async (mode) => {
        vi.mocked(saveImageFromUrl).mockResolvedValueOnce("default.jpg");

        if (mode === "bulk") {
            const results = [];
            for await (const result of ingestion.bulkRefresh()) results.push(result);
            expect(results).toEqual([{ apiId: 123, state: "fulfilled", reason: undefined }]);
        }
        else {
            await expect(ingestion.refreshFromExternal(123)).resolves.toBe(true);
        }

        expect(db.select().from(schema.games).where(eq(schema.games.apiId, 123)).get()).toMatchObject({
            name: "Updated game",
            synopsis: "Updated synopsis",
            imageCover: expect.stringMatching(/\/original\.jpg$/),
        });
    });

});
