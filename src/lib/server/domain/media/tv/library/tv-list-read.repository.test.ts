import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {JobType, MediaType, Status, TagAction} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvListReadRepository } = await import("./tv-list-read.repository");
const { TvLibraryRepository } = await import("./tv-library.repository");
const { TvLibraryCommands } = await import("./tv-library.commands");


const ownerScope = {
    ownerId: 42,
    actorId: 50,
    reason: "public",
    mediaTypeEnabled: true,
} as const;


describe("TV list read repository", () => {
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

    it("hydrates the current list contract with normalized progress, tags, covers and common items", async () => {
        const repository = new TvListReadRepository(MediaType.SERIES);
        const result = await repository.getMediaList(50, ownerScope, { page: 1, perPage: 2 });

        expect(result.pagination).toMatchObject({ page: 1, perPage: 2, totalItems: 3, totalPages: 2, sorting: "Title A-Z" });
        expect(result.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha", "Beta"]);
        expect(result.items[0]).toMatchObject({
            mediaId: 1000,
            mediaName: "Alpha",
            currentSeason: 1,
            currentEpisode: 10,
            watchedEpisodes: 10,
            rewatches: [{ seasonNumber: 1, count: 1 }],
            common: true,
            tags: [{ name: "comfort" }],
            seasons: [{ seasonNumber: 1, episodeCount: 10 }],
        });
        expect(result.items[0].imageCover).toMatch(/series-covers\/custom\.jpg$/);
    });

    it("sorts rewatched entries from normalized per-season counts", async () => {
        const library = new TvLibraryCommands(new TvLibraryRepository());
        await library.replaceRewatches({ userId: 42, catalogItemId: 1001, rewatches: [{ seasonNumber: 1, count: 2 }] });

        const result = await new TvListReadRepository(MediaType.SERIES).getMediaList(42, ownerScope, {
            page: 1,
            perPage: 3,
            sorting: "Re-watched",
        });

        expect(result.items.map(({ mediaName, rewatches }) => [
            mediaName,
            rewatches.reduce((total, item) => total + item.count, 0),
        ])).toEqual([
            ["Beta", 2],
            ["Alpha", 1],
            ["Gamma", 0],
        ]);
    });

    it("serves the public list header from the channel and normalized stats", async () => {
        const repository = new TvListReadRepository(MediaType.SERIES);
        expect(await repository.getListHeader(42)).toBeUndefined();

        const library = new TvLibraryCommands(new TvLibraryRepository());
        await library.synchronizeProfileChannel({ userId: 42, kind: MediaType.SERIES, enabled: true, views: 4 });
        expect(await repository.getListHeader(42)).toEqual({ timeSpent: 924 });

        await library.synchronizeProfileChannel({ userId: 42, kind: MediaType.SERIES, enabled: false, views: 4 });
        expect(await repository.getListHeader(42)).toBeUndefined();
    });

    it("applies TV-specific and common filters without leaking another viewer's common rows", async () => {
        const repository = new TvListReadRepository(MediaType.SERIES);

        const hiddenCommon = await repository.getMediaList(50, ownerScope, { hideCommon: true });
        expect(hiddenCommon.items.map(({ mediaName }) => mediaName)).toEqual(["Beta", "Gamma"]);

        const relational = await repository.getMediaList(undefined, ownerScope, {
            genres: ["Drama"],
            actors: ["Lead"],
            networks: ["Network"],
            langs: ["US"],
            tags: ["comfort"],
        });
        expect(relational.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha"]);
    });

    it("returns only filter values represented in this owner's TV list", async () => {
        const filters = await new TvListReadRepository(MediaType.SERIES).getListFilters(ownerScope);
        expect(filters).toEqual({
            kind: MediaType.SERIES,
            genres: [{ name: "Drama" }],
            tags: [{ name: "comfort" }],
            langs: [{ name: "JP" }, { name: "US" }],
        });
    });

    it("supports dynamic TV filter searches and empty tags created from the tags page", async () => {
        const libraryRepository = new TvLibraryRepository();
        await libraryRepository.editTag({
            userId: 42,
            kind: MediaType.SERIES,
            action: TagAction.ADD,
            name: "empty-tag",
        });
        const repository = new TvListReadRepository(MediaType.SERIES);

        expect(await repository.getSearchListFilters(ownerScope, "Le", JobType.ACTOR)).toEqual([{ name: "Lead" }]);
        expect(await repository.getSearchListFilters(ownerScope, "Net", JobType.PLATFORM)).toEqual([{ name: "Network" }]);
        expect(await repository.getSearchListFilters(ownerScope, "reat", JobType.CREATOR)).toEqual([{ name: "Creator" }]);

        const tags = await repository.getTagsView(ownerScope, { page: 1 });
        expect(tags).toMatchObject({ total: 2, exactMatch: false, pages: 1 });
        expect(tags.items).toEqual(expect.arrayContaining([
            expect.objectContaining({ tagName: "comfort", totalCount: 1, medias: [expect.objectContaining({ mediaId: 1000 })] }),
            expect.objectContaining({ tagName: "empty-tag", totalCount: 0, medias: [] }),
        ]));

        expect(await repository.getTagsView(ownerScope, { page: 1, search: "EMPTY-TAG" })).toMatchObject({
            total: 1,
            exactMatch: true,
        });
    });

    it("uses canonical catalog IDs when reading upcoming episodes", async () => {
        await db.update(schema.tvDetails)
            .set({ nextEpisodeAirDate: "2099-01-02", nextEpisodeSeason: 2, nextEpisodeNumber: 3 })
            .where(eq(schema.tvDetails.catalogItemId, 1000));

        const items = await new TvListReadRepository(MediaType.SERIES).getUpcomingMedia(ownerScope);
        expect(items).toEqual([
            expect.objectContaining({
                mediaId: 1000,
                userId: 42,
                mediaName: "Alpha",
                date: "2099-01-02",
                seasonToAir: 2,
                episodeToAir: 3,
                lastEpisode: 10,
            }),
        ]);
    });
});


const seedList = async (db: BunSQLiteDatabase<typeof schema>) => {
    await db.insert(schema.user).values([
        { id: 42, name: "owner", email: "owner@example.com", emailVerified: true, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00" },
        { id: 50, name: "viewer", email: "viewer@example.com", emailVerified: true, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00" },
    ]);
    await db.insert(schema.catalogItem).values([
        { id: 1000, kind: MediaType.SERIES, primaryProvider: "tmdb", primaryExternalId: "700", name: "Alpha", imageCover: "alpha.jpg" },
        { id: 1001, kind: MediaType.SERIES, primaryProvider: "tmdb", primaryExternalId: "701", name: "Beta", imageCover: "beta.jpg" },
        { id: 1002, kind: MediaType.SERIES, primaryProvider: "tmdb", primaryExternalId: "702", name: "Gamma", imageCover: "gamma.jpg" },
    ]);
    await db.insert(schema.tvDetails).values([
        { catalogItemId: 1000, episodeDurationMinutes: 45, totalSeasons: 1, totalEpisodes: 10, originCountry: "US", createdBy: "Creator", voteAverage: 9 },
        { catalogItemId: 1001, episodeDurationMinutes: 24, totalSeasons: 1, totalEpisodes: 12, originCountry: "JP", voteAverage: 8 },
        { catalogItemId: 1002, episodeDurationMinutes: 50, totalSeasons: 1, totalEpisodes: 6, originCountry: "US", voteAverage: 7 },
    ]);
    await db.insert(schema.tvSeason).values([
        { catalogItemId: 1000, seasonNumber: 1, episodeCount: 10 },
        { catalogItemId: 1001, seasonNumber: 1, episodeCount: 12 },
        { catalogItemId: 1002, seasonNumber: 1, episodeCount: 6 },
    ]);
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Drama" });
    await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: 1 });
    await db.insert(schema.tvActor).values({ catalogItemId: 1000, name: "Lead" });
    await db.insert(schema.tvNetwork).values({ catalogItemId: 1000, name: "Network" });

    const repository = new TvLibraryRepository();
    const library = new TvLibraryCommands(repository);
    const alpha = await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
    await library.replaceRewatches({ userId: 42, catalogItemId: 1000, rewatches: [{ seasonNumber: 1, count: 1 }] });
    await library.updateCustomCover({ userId: 42, catalogItemId: 1000, customCover: "custom.jpg" });
    await repository.editTag({ userId: 42, kind: MediaType.SERIES, action: TagAction.ADD, name: "comfort", libraryEntryId: alpha.id });
    await library.add({ userId: 42, catalogItemId: 1001, status: Status.WATCHING });
    await library.add({ userId: 42, catalogItemId: 1002, status: Status.PLAN_TO_WATCH });
    await library.add({ userId: 50, catalogItemId: 1000, status: Status.WATCHING });
};
