import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {JobType, MediaType, PrivacyType, SocialState, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { BookLibraryRepository } = await import("@/lib/server/domain/media/books/library/book-library.repository");
const { BookDetailsQuery } = await import("./book-details.query");
const { BookCatalogReadRepository } = await import("./book-catalog-read.repository");
const { BookLibraryService } = await import("@/lib/server/domain/media/books/library/book-library.service");


describe("book details query", () => {
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
            { id: 1000, kind: MediaType.BOOKS, primaryProvider: "google-books", primaryExternalId: "volume-777", name: "Book", imageCover: "book.jpg", releaseDate: "2025-01-01" },
            {
                id: 1001,
                kind: MediaType.BOOKS,
                primaryProvider: "google-books",
                primaryExternalId: "volume-778",
                name: "Sequel",
                imageCover: "sequel.jpg",
                releaseDate: "2026-01-01"
            },
        ]);
        await db.insert(schema.bookDetails).values([
            { catalogItemId: 1000, pages: 300, language: "en", publisher: "Publisher" },
            { catalogItemId: 1001, pages: 400, language: "en", publisher: "Publisher" },
        ]);
        await db.insert(schema.catalogGenre).values({ id: 1, name: "Fantasy" });
        await db.insert(schema.catalogItemGenre).values([
            { catalogItemId: 1000, genreId: 1 },
            { catalogItemId: 1001, genreId: 1 },
        ]);
        await db.insert(schema.bookAuthor).values([
            { catalogItemId: 1000, name: "Author" },
            { catalogItemId: 1001, name: "Author" },
        ]);

        const library = new BookLibraryService(new BookLibraryRepository());
        await library.importEntry({ userId: 42, catalogItemId: 1000, status: Status.READING, currentPage: 120, rereadCount: 0, totalPagesRead: 120, rating: 9 });
        await library.importEntry({ userId: 43, catalogItemId: 1000, status: Status.COMPLETED, currentPage: 300, rereadCount: 2, totalPagesRead: 900, favorite: true });
        await library.importEntry({ userId: 44, catalogItemId: 1000, status: Status.READING, currentPage: 200, rereadCount: 1, totalPagesRead: 500 });
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 1 });
        await library.synchronizeProfileChannel({ userId: 43, enabled: true, views: 2 });
        await library.synchronizeProfileChannel({ userId: 44, enabled: true, views: 3 });
        await db.insert(schema.followers).values({ followerId: 42, followedId: 43, status: SocialState.ACCEPTED });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("returns catalog, viewer, follow, author-job and similar-book contracts", async () => {
        const query = new BookDetailsQuery();
        const result = await query.getMediaAndUserDetails(42, 1000);
        expect(result).toMatchObject({
            media: {
                id: 1000,
                apiId: "volume-777",
                name: "Book",
                pages: 300,
                language: "en",
                publishers: "Publisher",
                providerData: { name: "GoogleBooks", url: "https://books.google.com/books?id=volume-777" },
                authors: [expect.objectContaining({ name: "Author" })],
            },
            userMedia: expect.objectContaining({ mediaId: 1000, currentPage: 120, rereadCount: 0, totalPagesRead: 120, rating: 9 }),
            followsData: [expect.objectContaining({ id: 43, userMedia: expect.objectContaining({ currentPage: 300, rereadCount: 2, totalPagesRead: 900 }) })],
            similarMedia: [expect.objectContaining({ mediaId: 1001, mediaName: "Sequel" })],
        });
        expect(await new BookCatalogReadRepository().getMediaJobDetails(JobType.CREATOR, "Author", 0, 24, 42)).toMatchObject({
            total: 2,
            items: expect.arrayContaining([expect.objectContaining({ mediaId: 1000, inUserList: true })]),
        });
    });

    it("returns the existing local Google Books search contract from normalized catalog rows", async () => {
        await expect(new BookCatalogReadRepository().searchByName("book"))
            .resolves.toEqual([expect.objectContaining({
                id: "volume-777",
                name: "Book",
                image: expect.stringContaining("/books-covers/book.jpg"),
                date: "2025-01-01",
                itemType: MediaType.BOOKS,
            })]);
    });

    it("uses stored historical totals and the existing public/restricted community audience", async () => {
        const reader = new BookLibraryService();
        const community = await reader.getCommunityActivity(42, 1000, { page: 1, perPage: 8 });
        expect(community).toMatchObject({
            total: 2,
            stats: { totalRedo: 2, totalSpecific: 1_020, completedCount: 1, likedCount: 1 },
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
