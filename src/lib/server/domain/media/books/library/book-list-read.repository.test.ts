import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {JobType, MediaType, Status, TagAction} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { BookListReadRepository } = await import("./book-list-read.repository");
const { BookLibraryRepository } = await import("./book-library.repository");
const { BookLibraryCommands } = await import("./book-library.commands");


const ownerScope = { ownerId: 42, actorId: 50, reason: "public", mediaTypeEnabled: true } as const;


describe("book list read repository", () => {
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
        const result = await new BookListReadRepository().getMediaList(50, ownerScope, { page: 1, perPage: 2 });
        expect(result.pagination).toMatchObject({ page: 1, perPage: 2, totalItems: 3, totalPages: 2, sorting: "Title A-Z" });
        expect(result.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha", "Beta"]);
        expect(result.items[0]).toMatchObject({
            mediaId: 1000,
            mediaName: "Alpha",
            status: Status.READING,
            currentPage: 40,
            rereadCount: 2,
            totalPagesRead: 640,
            common: true,
            tags: [{ name: "comfort" }],
        });
        expect(result.items[0].imageCover).toMatch(/books-covers\/custom\.jpg$/);
    });

    it("uses stable canonical book IDs for every sort tie", async () => {
        const result = await new BookListReadRepository().getMediaList(42, ownerScope, {
            page: 1,
            perPage: 3,
            sorting: "Rating +",
        });
        expect(result.items.map(({ mediaId }) => mediaId)).toEqual([1000, 1001, 1002]);
    });

    it("serves the header from channel state and normalized 1.7-minute page totals", async () => {
        const repository = new BookListReadRepository();
        expect(await repository.getListHeader(42)).toBeUndefined();
        const library = new BookLibraryCommands(new BookLibraryRepository());
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 4 });
        expect(await repository.getListHeader(42)).toEqual({ timeSpent: 1_768 });
    });

    it("filters by language, genre, author and tag and returns represented filter values", async () => {
        const repository = new BookListReadRepository();
        expect((await repository.getMediaList(50, ownerScope, { hideCommon: true })).items
            .map(({ mediaName }) => mediaName)).toEqual(["Beta", "Gamma"]);
        const filtered = await repository.getMediaList(undefined, ownerScope, {
            genres: ["Fantasy"],
            authors: ["Author"],
            langs: ["en"],
            tags: ["comfort"],
        });
        expect(filtered.items.map(({ mediaName }) => mediaName)).toEqual(["Alpha"]);
        expect(await repository.getListFilters(ownerScope)).toEqual({
            kind: MediaType.BOOKS,
            genres: [{ name: "Fantasy" }],
            tags: [{ name: "comfort" }],
            langs: [{ name: "en" }, { name: "fr" }],
        });
        expect(await repository.getSearchListFilters(ownerScope, "Auth", JobType.CREATOR)).toEqual([{ name: "Author" }]);
    });

    it("supports empty tags while retaining canonical book IDs", async () => {
        const common = new BookLibraryRepository().common;
        await common.editTag({ userId: 42, kind: MediaType.BOOKS, action: TagAction.ADD, name: "empty-tag" });
        expect(await new BookListReadRepository().getTagsView(ownerScope, { page: 1 })).toMatchObject({
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
        { id: 1000, kind: MediaType.BOOKS, primaryProvider: "google-books", primaryExternalId: "700", name: "Alpha", releaseDate: "2020-01-01", imageCover: "alpha.jpg" },
        { id: 1001, kind: MediaType.BOOKS, primaryProvider: "google-books", primaryExternalId: "701", name: "Beta", releaseDate: "2021-01-01", imageCover: "beta.jpg" },
        { id: 1002, kind: MediaType.BOOKS, primaryProvider: "google-books", primaryExternalId: "702", name: "Gamma", releaseDate: null, imageCover: "gamma.jpg" },
    ]);
    await db.insert(schema.bookDetails).values([
        { catalogItemId: 1000, pages: 300, language: "en" },
        { catalogItemId: 1001, pages: 400, language: "fr" },
        { catalogItemId: 1002, pages: 500, language: "en" },
    ]);
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Fantasy" });
    await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: 1 });
    await db.insert(schema.bookAuthor).values([
        { catalogItemId: 1000, name: "Author" },
        { catalogItemId: 1001, name: "Other" },
    ]);

    const repository = new BookLibraryRepository();
    const library = new BookLibraryCommands(repository);
    const alpha = await library.importEntry({ userId: 42, catalogItemId: 1000, status: Status.READING, currentPage: 40, rereadCount: 2, totalPagesRead: 640, rating: 8 });
    await library.updateCustomCover({ userId: 42, catalogItemId: 1000, customCover: "custom.jpg" });
    await repository.common.editTag({ userId: 42, kind: MediaType.BOOKS, action: TagAction.ADD, name: "comfort", libraryEntryId: alpha.id });
    await library.importEntry({ userId: 42, catalogItemId: 1001, status: Status.COMPLETED, currentPage: 400, rereadCount: 0, totalPagesRead: 400, rating: 8 });
    await library.importEntry({ userId: 42, catalogItemId: 1002, status: Status.PLAN_TO_READ, currentPage: 0, rereadCount: 0, totalPagesRead: 0, rating: 8 });
    await library.importEntry({ userId: 50, catalogItemId: 1000, status: Status.READING, currentPage: 30, rereadCount: 0, totalPagesRead: 30 });
};
