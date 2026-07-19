import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {JobType, MediaType, Status, TagAction} from "@/lib/utils/enums";
import {eq} from "drizzle-orm";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { createMovieLibrary } = await import("./movie-library");


const ownerScope = {
    ownerId: 42,
    actorId: 50,
    reason: "public",
    mediaTypeEnabled: true,
} as const;


describe("movie library lists", () => {
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

    it("hydrates canonical movie progress, tags, covers and common items", async () => {
        const result = await createMovieLibrary().getMediaList(50, ownerScope, { page: 1, perPage: 2 });
        expect(result.pagination).toMatchObject({ page: 1, perPage: 2, totalItems: 3, totalPages: 2, sorting: "Title A-Z" });
        expect(result.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha", "Beta"]);
        expect(result.items[0]).toMatchObject({
            mediaId: 1000,
            mediaName: "Alpha",
            status: Status.COMPLETED,
            watchCount: 2,
            rewatchCount: 1,
            common: true,
            tags: [{ name: "comfort" }],
        });
        expect(result.items[0].imageCover).toMatch(/movies-covers\/custom\.jpg$/);
    });

    it("sorts by canonical rewatches with stable movie IDs", async () => {
        const library = createMovieLibrary();
        await library.replaceRewatches({ userId: 42, catalogItemId: 1001, rewatchCount: 2 });
        const result = await library.getMediaList(42, ownerScope, {
            page: 1,
            perPage: 3,
            sorting: "Re-Watched",
        });
        expect(result.items.map(({ mediaName, rewatchCount }) => [mediaName, rewatchCount])).toEqual([
            ["Beta", 2],
            ["Alpha", 1],
            ["Gamma", 0],
        ]);
    });

    it("serves the intentional public header from channel state and normalized stats", async () => {
        const library = createMovieLibrary();
        expect(await library.common.getListHeader(42)).toBeUndefined();
        await library.common.synchronizeProfileChannel({ userId: 42, enabled: true, views: 4 });
        expect(await library.common.getListHeader(42)).toEqual({ timeSpent: 290 });
        await library.common.synchronizeProfileChannel({ userId: 42, enabled: false, views: 4 });
        expect(await library.common.getListHeader(42)).toBeUndefined();
    });

    it("applies movie-specific filters and hide-common at the authorized list boundary", async () => {
        const library = createMovieLibrary();
        const hiddenCommon = await library.getMediaList(50, ownerScope, { hideCommon: true });
        expect(hiddenCommon.items.map(({ mediaName }) => mediaName)).toEqual(["Beta", "Gamma"]);

        const relational = await library.getMediaList(undefined, ownerScope, {
            genres: ["Drama"],
            actors: ["Lead"],
            directors: ["Director"],
            langs: ["en"],
            tags: ["comfort"],
        });
        expect(relational.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha"]);
    });

    it("returns only filter/search values represented in the owner's movie list", async () => {
        const library = createMovieLibrary();
        expect(await library.getListFilters(ownerScope)).toEqual({
            kind: MediaType.MOVIES,
            genres: [{ name: "Drama" }],
            tags: [{ name: "comfort" }],
            langs: [{ name: "en" }, { name: "fr" }],
        });
        expect(await library.getSearchListFilters(ownerScope, "Le", JobType.ACTOR)).toEqual([{ name: "Lead" }]);
        expect(await library.getSearchListFilters(ownerScope, "Dire", JobType.CREATOR)).toEqual([{ name: "Director" }]);
    });

    it("supports linked and empty tags without exposing list data outside the supplied scope", async () => {
        const library = createMovieLibrary();
        await library.common.editTag({
            userId: 42,
            action: TagAction.ADD,
            tag: { name: "empty-tag" },
        });
        const tags = await library.common.getTagsView(ownerScope, { page: 1 });
        expect(tags).toMatchObject({ total: 2, exactMatch: false, pages: 1 });
        expect(tags.items).toEqual(expect.arrayContaining([
            expect.objectContaining({ tagName: "comfort", totalCount: 1, medias: [expect.objectContaining({ mediaId: 1000 })] }),
            expect.objectContaining({ tagName: "empty-tag", totalCount: 0, medias: [] }),
        ]));
        expect(await library.common.getTagsView(ownerScope, { page: 1, search: "EMPTY-TAG" })).toMatchObject({
            total: 1,
            exactMatch: true,
        });
    });

    it("uses canonical movie IDs in upcoming reads", async () => {
        const items = await createMovieLibrary().upcoming(ownerScope.ownerId);
        expect(items).toEqual([
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
        { id: 1000, kind: MediaType.MOVIES, primaryProvider: "tmdb", primaryExternalId: "700", name: "Alpha", releaseDate: "2020-01-01", imageCover: "alpha.jpg" },
        { id: 1001, kind: MediaType.MOVIES, primaryProvider: "tmdb", primaryExternalId: "701", name: "Beta", releaseDate: "2021-01-01", imageCover: "beta.jpg" },
        { id: 1002, kind: MediaType.MOVIES, primaryProvider: "tmdb", primaryExternalId: "702", name: "Gamma", releaseDate: "2099-01-02", imageCover: "gamma.jpg" },
    ]);
    await db.insert(schema.movieDetails).values([
        { catalogItemId: 1000, durationMinutes: 100, originalLanguage: "en", directorName: "Director", voteAverage: 9 },
        { catalogItemId: 1001, durationMinutes: 90, originalLanguage: "fr", voteAverage: 8 },
        { catalogItemId: 1002, durationMinutes: 80, originalLanguage: "en", voteAverage: 7 },
    ]);
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Drama" });
    await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: 1 });
    await db.insert(schema.movieActor).values({ catalogItemId: 1000, name: "Lead" });

    const library = createMovieLibrary();
    const alpha = await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
    await library.replaceRewatches({ userId: 42, catalogItemId: 1000, rewatchCount: 1 });
    await db.update(schema.libraryEntry).set({ customCover: "custom.jpg" }).where(eq(schema.libraryEntry.id, alpha.id));
    await library.common.editTag({
        userId: 42,
        mediaId: 1000,
        action: TagAction.ADD,
        tag: { name: "comfort" },
    });
    await library.add({ userId: 42, catalogItemId: 1001, status: Status.COMPLETED });
    await library.add({ userId: 42, catalogItemId: 1002, status: Status.PLAN_TO_WATCH });
    await library.add({ userId: 50, catalogItemId: 1000, status: Status.COMPLETED });
};
