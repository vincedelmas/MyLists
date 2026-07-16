import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {JobType, MediaType, PrivacyType, SocialState, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { GameLibraryRepository } = await import("@/lib/server/domain/library/games/game-library.repository");
const { GameLibraryService } = await import("@/lib/server/domain/library/games/game-library.service");
const { GameDetailsReadService } = await import("./game-details-read.service");


describe("v2 game detail reads", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([
            user(42, "viewer", PrivacyType.PUBLIC),
            user(43, "followed", PrivacyType.RESTRICTED),
            user(44, "private-owner", PrivacyType.PRIVATE),
        ]);
        await db.insert(schema.catalogItem).values([
            { id: 1000, kind: MediaType.GAMES, primaryProvider: "igdb", primaryExternalId: "777", name: "Game", imageCover: "game.jpg", releaseDate: "2025-01-01" },
            { id: 1001, kind: MediaType.GAMES, primaryProvider: "igdb", primaryExternalId: "778", name: "Sequel", imageCover: "sequel.jpg", releaseDate: "2026-01-01" },
        ]);
        await db.insert(schema.gameDetails).values([
            { catalogItemId: 1000, collectionExternalId: 12, gameEngine: "Engine", igdbUrl: "https://igdb.test/game", hltbMainHours: 20 },
            { catalogItemId: 1001, collectionExternalId: 12 },
        ]);
        await db.insert(schema.catalogGenre).values({ id: 1, name: "Role-playing" });
        await db.insert(schema.catalogItemGenre).values([
            { catalogItemId: 1000, genreId: 1 },
            { catalogItemId: 1001, genreId: 1 },
        ]);
        await db.insert(schema.gamePlatform).values({ catalogItemId: 1000, name: "PC (Microsoft Windows)" });
        await db.insert(schema.gameCompany).values({ catalogItemId: 1000, name: "Studio", developer: true, publisher: true });

        const library = new GameLibraryService(new GameLibraryRepository());
        await library.importEntry({ userId: 42, catalogItemId: 1000, status: Status.PLAYING, playtime: 600, platform: "PC", rating: 9 });
        await library.importEntry({ userId: 43, catalogItemId: 1000, status: Status.COMPLETED, playtime: 1_200, platform: "PC", favorite: true });
        await library.importEntry({ userId: 44, catalogItemId: 1000, status: Status.ENDLESS, playtime: 3_000, platform: null });
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 1 });
        await library.synchronizeProfileChannel({ userId: 43, enabled: true, views: 2 });
        await library.synchronizeProfileChannel({ userId: 44, enabled: true, views: 3 });
        await db.insert(schema.followers).values({ followerId: 42, followedId: 43, status: SocialState.ACCEPTED });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("returns the complete catalog, viewer, follow, collection and compatible-platform contracts", async () => {
        const reader = new GameDetailsReadService();
        const result = await reader.getMediaAndUserDetails(42, 1000);
        expect(result).toMatchObject({
            media: {
                id: 1000,
                apiId: 777,
                name: "Game",
                gameEngine: "Engine",
                hltbMainTime: 20,
                providerData: { name: "IGDB", url: "https://igdb.test/game" },
                collection: [expect.objectContaining({ mediaId: 1001, mediaName: "Sequel" })],
                companies: [expect.objectContaining({ name: "Studio", developer: true, publisher: true })],
            },
            userMedia: expect.objectContaining({ mediaId: 1000, playtime: 600, platform: "PC", rating: 9 }),
            followsData: [expect.objectContaining({ id: 43, userMedia: expect.objectContaining({ playtime: 1_200 }) })],
            similarMedia: [expect.objectContaining({ mediaId: 1001, mediaName: "Sequel" })],
        });
        expect(await reader.getCompatiblePlatforms(1000)).toEqual([{ name: "PC" }]);
        expect(await reader.getMediaJobDetails(JobType.CREATOR, "Studio", { page: 1, perPage: 24 }, 42)).toMatchObject({
            total: 1,
            items: [expect.objectContaining({ mediaId: 1000, inUserList: true })],
        });
    });

    it("keeps private accounts out of community rows while retaining restricted rows for members", async () => {
        const reader = new GameDetailsReadService();
        const community = await reader.getCommunityActivity(42, 1000, { page: 1, perPage: 8 });
        expect(community).toMatchObject({
            total: 2,
            stats: { totalPlaytime: 1_800, completedCount: 1, likedCount: 1 },
        });
        expect(community.items.map(({ id }) => id).sort()).toEqual([42, 43]);

        const anonymous = await reader.getCommunityActivity(undefined, 1000, { page: 1, perPage: 8 });
        expect(anonymous.items.map(({ id }) => id)).toEqual([42]);
    });
});


const user = (id: number, name: string, privacy: PrivacyType) => ({
    id,
    name,
    privacy,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
