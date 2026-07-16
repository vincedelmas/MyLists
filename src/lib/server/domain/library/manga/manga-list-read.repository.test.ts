import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {JobType, MediaType, Status, TagAction} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { MangaListReadRepository } = await import("./manga-list-read.repository");
const { MangaLibraryRepository } = await import("./manga-library.repository");
const { MangaLibraryService } = await import("./manga-library.service");


const ownerScope = { ownerId: 42, actorId: 50, reason: "public", mediaTypeEnabled: true } as const;


describe("v2 manga list read repository", () => {
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

    it("hydrates exact historical progress, tags, covers and common items", async () => {
        const result = await new MangaListReadRepository().getMediaList(50, ownerScope, { page: 1, perPage: 2 });
        expect(result.pagination).toMatchObject({ page: 1, perPage: 2, totalItems: 3, totalPages: 2, sorting: "Title A-Z" });
        expect(result.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha", "Beta"]);
        expect(result.items[0]).toMatchObject({
            mediaId: 1000,
            mediaName: "Alpha",
            status: Status.READING,
            currentChapter: 40,
            redo: 2,
            total: 640,
            common: true,
            tags: [{ name: "comfort" }],
        });
        expect(result.items[0].imageCover).toMatch(/manga-covers\/custom\.jpg$/);
    });

    it("uses stable canonical manga IDs for every sort tie", async () => {
        const result = await new MangaListReadRepository().getMediaList(42, ownerScope, {
            page: 1,
            perPage: 3,
            sorting: "Rating +",
        });
        expect(result.items.map(({ mediaId }) => mediaId)).toEqual([1000, 1001, 1002]);
    });

    it("serves the header from channel state and normalized seven-minute chapter totals", async () => {
        const repository = new MangaListReadRepository();
        expect(await repository.getListHeader(42)).toBeUndefined();
        const library = new MangaLibraryService(new MangaLibraryRepository());
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 4 });
        expect(await repository.getListHeader(42)).toEqual({ timeSpent: 7_280 });
    });

    it("filters by publisher, genre, author and tag and returns represented filter values", async () => {
        const repository = new MangaListReadRepository();
        expect((await repository.getMediaList(50, ownerScope, { hideCommon: true })).items
            .map(({ mediaName }) => mediaName)).toEqual(["Beta", "Gamma"]);
        const filtered = await repository.getMediaList(undefined, ownerScope, {
            genres: ["Fantasy"],
            authors: ["Author"],
            publishers: ["Publisher"],
            tags: ["comfort"],
        });
        expect(filtered.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha"]);
        expect(await repository.getListFilters(ownerScope)).toEqual({
            genres: [{ name: "Fantasy" }],
            tags: [{ name: "comfort" }],
        });
        expect(await repository.getSearchListFilters(ownerScope, "Auth", JobType.CREATOR)).toEqual([{ name: "Author" }]);
        expect(await repository.getSearchListFilters(ownerScope, "Publish", JobType.PUBLISHER)).toEqual([
            { name: "Publisher" },
            { name: "Other Publisher" },
        ]);
    });

    it("supports empty tags while retaining canonical manga IDs", async () => {
        const common = new MangaLibraryRepository().common;
        await common.editTag({ userId: 42, kind: MediaType.MANGA, action: TagAction.ADD, name: "empty-tag" });
        expect(await new MangaListReadRepository().getTagsView(ownerScope, { page: 1 })).toMatchObject({
            total: 2,
            items: expect.arrayContaining([
                expect.objectContaining({ tagName: "comfort", totalCount: 1, medias: [expect.objectContaining({ mediaId: 1000 })] }),
                expect.objectContaining({ tagName: "empty-tag", totalCount: 0 }),
            ]),
        });
    });
});


const seedList = async (db: BunSQLiteDatabase<typeof schema>) => {
    await db.insert(schema.user).values([
        { id: 42, name: "owner", email: "owner@example.com", emailVerified: true, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00" },
        { id: 50, name: "viewer", email: "viewer@example.com", emailVerified: true, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00" },
    ]);
    await db.insert(schema.catalogItem).values([
        { id: 1000, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "700", name: "Alpha", releaseDate: "2020-01-01", imageCover: "alpha.jpg" },
        { id: 1001, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "701", name: "Beta", releaseDate: "2021-01-01", imageCover: "beta.jpg" },
        { id: 1002, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "702", name: "Gamma", releaseDate: null, imageCover: "gamma.jpg" },
    ]);
    await db.insert(schema.mangaDetails).values([
        { catalogItemId: 1000, chapters: 300, publisher: "Publisher" },
        { catalogItemId: 1001, chapters: 400, publisher: "Other Publisher" },
        { catalogItemId: 1002, chapters: null, publisher: "Publisher" },
    ]);
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Fantasy" });
    await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: 1 });
    await db.insert(schema.mangaAuthor).values([
        { catalogItemId: 1000, name: "Author" },
        { catalogItemId: 1001, name: "Other" },
    ]);

    const repository = new MangaLibraryRepository();
    const library = new MangaLibraryService(repository);
    const alpha = await library.importEntry({ userId: 42, catalogItemId: 1000, status: Status.READING, currentChapter: 40, rereadCount: 2, totalChaptersRead: 640, rating: 8 });
    await library.updateCustomCover({ userId: 42, catalogItemId: 1000, customCover: "custom.jpg" });
    await repository.common.editTag({ userId: 42, kind: MediaType.MANGA, action: TagAction.ADD, name: "comfort", libraryEntryId: alpha.id });
    await library.importEntry({ userId: 42, catalogItemId: 1001, status: Status.COMPLETED, currentChapter: 400, rereadCount: 0, totalChaptersRead: 400, rating: 8 });
    await library.importEntry({ userId: 42, catalogItemId: 1002, status: Status.PLAN_TO_READ, currentChapter: 0, rereadCount: 0, totalChaptersRead: 0, rating: 8 });
    await library.importEntry({ userId: 50, catalogItemId: 1000, status: Status.READING, currentChapter: 30, rereadCount: 0, totalChaptersRead: 30 });
};
