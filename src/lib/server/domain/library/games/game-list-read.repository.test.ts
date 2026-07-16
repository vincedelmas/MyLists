import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {JobType, MediaType, Status, TagAction} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { GameListReadRepository } = await import("./game-list-read.repository");
const { GameLibraryRepository } = await import("./game-library.repository");
const { GameLibraryService } = await import("./game-library.service");


const ownerScope = { ownerId: 42, actorId: 50, reason: "public", mediaTypeEnabled: true } as const;


describe("v2 game list read repository", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await seedList(db);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("hydrates playtime, selected platform, tags, covers and common items", async () => {
        const result = await new GameListReadRepository().getMediaList(50, ownerScope, { page: 1, perPage: 2 });
        expect(result.pagination).toMatchObject({ page: 1, perPage: 2, totalItems: 3, totalPages: 2, sorting: "Playtime +" });
        expect(result.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha", "Beta"]);
        expect(result.items[0]).toMatchObject({
            mediaId: 1000,
            mediaName: "Alpha",
            status: Status.PLAYING,
            playtime: 600,
            platform: "PC",
            common: true,
            tags: [{ name: "comfort" }],
        });
        expect(result.items[0].imageCover).toMatch(/games-covers\/custom\.jpg$/);
    });

    it("uses stable canonical game IDs for every sort tie", async () => {
        const result = await new GameListReadRepository().getMediaList(42, ownerScope, {
            page: 1,
            perPage: 3,
            sorting: "Rating +",
        });
        expect(result.items.map(({ mediaId }) => mediaId)).toEqual([1000, 1001, 1002]);
    });

    it("serves the public list header from channel state and normalized playtime stats", async () => {
        const repository = new GameListReadRepository();
        expect(await repository.getListHeader(42)).toBeUndefined();
        const library = new GameLibraryService(new GameLibraryRepository());
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 4 });
        expect(await repository.getListHeader(42)).toEqual({ timeSpent: 720 });
    });

    it("filters by selected platform and game company without confusing provider platforms", async () => {
        const repository = new GameListReadRepository();
        expect((await repository.getMediaList(50, ownerScope, { hideCommon: true })).items
            .map(({ mediaName }) => mediaName)).toEqual(["Beta", "Gamma"]);
        const filtered = await repository.getMediaList(undefined, ownerScope, {
            genres: ["Role-playing"],
            companies: ["Studio"],
            platforms: ["PC"],
            tags: ["comfort"],
        });
        expect(filtered.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha"]);
    });

    it("returns owner-represented platforms, genres, tags and developer search values", async () => {
        const repository = new GameListReadRepository();
        expect(await repository.getListFilters(ownerScope)).toEqual({
            genres: [{ name: "Role-playing" }],
            tags: [{ name: "comfort" }],
            platforms: [{ name: "PC" }, { name: "Switch" }],
        });
        expect(await repository.getSearchListFilters(ownerScope, "Stu", JobType.CREATOR)).toEqual([{ name: "Studio" }]);
        expect(await repository.getSearchListFilters(ownerScope, "Pub", JobType.PUBLISHER)).toEqual([{ name: "Publisher" }]);
    });

    it("supports empty tags and retains canonical IDs in upcoming game reads", async () => {
        const common = new GameLibraryRepository().common;
        await common.editTag({ userId: 42, kind: MediaType.GAMES, action: TagAction.ADD, name: "empty-tag" });
        const repository = new GameListReadRepository();
        expect(await repository.getTagsView(ownerScope, { page: 1 })).toMatchObject({
            total: 2,
            items: expect.arrayContaining([
                expect.objectContaining({ tagName: "comfort", totalCount: 1 }),
                expect.objectContaining({ tagName: "empty-tag", totalCount: 0 }),
            ]),
        });
        expect(await repository.getUpcomingMedia(ownerScope)).toEqual([
            expect.objectContaining({ mediaId: 1002, userId: 42, mediaName: "Gamma", date: "2099-01-02" }),
        ]);
    });
});


const seedList = async (db: BunSQLiteDatabase<typeof schema>) => {
    await db.insert(schema.user).values([
        { id: 42, name: "owner", email: "owner@example.com", emailVerified: true, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00" },
        { id: 50, name: "viewer", email: "viewer@example.com", emailVerified: true, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00" },
    ]);
    await db.insert(schema.catalogItem).values([
        { id: 1000, kind: MediaType.GAMES, primaryProvider: "igdb", primaryExternalId: "700", name: "Alpha", releaseDate: "2020-01-01", imageCover: "alpha.jpg" },
        { id: 1001, kind: MediaType.GAMES, primaryProvider: "igdb", primaryExternalId: "701", name: "Beta", releaseDate: "2021-01-01", imageCover: "beta.jpg" },
        { id: 1002, kind: MediaType.GAMES, primaryProvider: "igdb", primaryExternalId: "702", name: "Gamma", releaseDate: "2099-01-02", imageCover: "gamma.jpg" },
    ]);
    await db.insert(schema.gameDetails).values([
        { catalogItemId: 1000, voteAverage: 9 },
        { catalogItemId: 1001, voteAverage: 8 },
        { catalogItemId: 1002, voteAverage: 7 },
    ]);
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Role-playing" });
    await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: 1 });
    await db.insert(schema.gameCompany).values([
        { catalogItemId: 1000, name: "Studio", developer: true },
        { catalogItemId: 1001, name: "Publisher", publisher: true },
    ]);

    const repository = new GameLibraryRepository();
    const library = new GameLibraryService(repository);
    const alpha = await library.importEntry({ userId: 42, catalogItemId: 1000, status: Status.PLAYING, playtime: 600, platform: "PC", rating: 8 });
    await library.updateCustomCover({ userId: 42, catalogItemId: 1000, customCover: "custom.jpg" });
    await repository.common.editTag({ userId: 42, kind: MediaType.GAMES, action: TagAction.ADD, name: "comfort", libraryEntryId: alpha.id });
    await library.importEntry({ userId: 42, catalogItemId: 1001, status: Status.COMPLETED, playtime: 120, platform: "Switch", rating: 8 });
    await library.importEntry({ userId: 42, catalogItemId: 1002, status: Status.PLAN_TO_PLAY, playtime: 0, platform: null, rating: 8 });
    await library.importEntry({ userId: 50, catalogItemId: 1000, status: Status.PLAYING, playtime: 30, platform: "PC" });
};
