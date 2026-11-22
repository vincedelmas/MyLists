import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, SocialState, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const { searchCommandPalette } = await import("./command-palette.repository");

let sqlite: Database;

beforeEach(() => {
    sqlite = new Database(":memory:");
    dbContext.db = drizzle({ client: sqlite });
    migrate(dbContext.db, { migrationsFolder: "./drizzle" });
    sqlite.run("PRAGMA foreign_keys = ON");

    dbContext.db.insert(schema.user).values([
        { id: 1, name: "alice", email: "alice@example.invalid", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        { id: 2, name: "dune_fan", email: "bob@example.invalid", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        { id: 3, name: "dune_pending", email: "carol@example.invalid", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ]).run();

    dbContext.db.insert(schema.movies).values([
        { id: 1, apiId: 101, name: "Dune: Part Two", originalName: "Dune 2", duration: 166, imageCover: "dune2.jpg" },
        { id: 2, apiId: 102, name: "The Dune Documentary", duration: 90, imageCover: "doc.jpg" },
        { id: 3, apiId: 103, name: "Spirited Away", originalName: "Sen to Chihiro", duration: 125, imageCover: "spirited.jpg" },
        { id: 4, apiId: 104, name: "Dune Untracked", duration: 100, imageCover: "untracked.jpg" },
    ]).run();

    dbContext.db.insert(schema.moviesList).values([
        { userId: 1, mediaId: 1, status: Status.COMPLETED, rating: 9, favorite: true, lastUpdated: "2026-03-01" },
        { userId: 1, mediaId: 2, status: Status.PLANNED, lastUpdated: "2026-05-01" },
        { userId: 1, mediaId: 3, status: Status.COMPLETED, rating: 10, lastUpdated: "2026-02-01" },
        { userId: 2, mediaId: 4, status: Status.COMPLETED, rating: 8, lastUpdated: "2026-06-01" },
    ]).run();

    dbContext.db.insert(schema.books).values([
        { id: 1, apiId: "gb-1", name: "Messiah", pages: 300, imageCover: "book.jpg" },
    ]).run();

    dbContext.db.insert(schema.booksList).values([
        { userId: 1, mediaId: 1, status: Status.IN_PROGRESS, customTitle: "Dune Messiah (Edition)", customPages: 320, lastUpdated: "2026-04-01" },
    ]).run();

    dbContext.db.insert(schema.collections).values([
        { id: 1, ownerId: 1, title: "Dune Universe", privacy: PrivacyType.PRIVATE },
        { id: 2, ownerId: 2, title: "Dune Public Other", privacy: PrivacyType.PUBLIC },
    ]).run();
    dbContext.db.insert(schema.collectionItems).values([
        { collectionId: 1, mediaId: 1, mediaType: MediaType.MOVIES, orderIndex: 1 },
    ]).run();

    dbContext.db.insert(schema.dynamicLists).values([
        {
            id: 1,
            userId: 1,
            spec: {
                version: 2,
                display: "grid",
                title: "Dune Watchlist",
                mediaTypes: "all",
                sort: { field: "addedAt", direction: "desc" },
                filters: {},
            },
        },
        {
            id: 2,
            userId: 2,
            spec: {
                version: 2,
                display: "grid",
                title: "Dune Other User",
                mediaTypes: "all",
                sort: { field: "addedAt", direction: "desc" },
                filters: {},
            },
        },
    ]).run();

    dbContext.db.insert(schema.followers).values([
        { followerId: 1, followedId: 2, status: SocialState.ACCEPTED },
        { followerId: 1, followedId: 3, status: SocialState.REQUESTED },
    ]).run();
});

afterEach(() => {
    sqlite.close();
    dbContext.db = undefined;
});


it("searches only the user's tracked active media, collections, dynamic lists, and accepted follows", async () => {
    const result = await searchCommandPalette(1, [MediaType.MOVIES, MediaType.BOOKS], "dune");

    expect(result.media.map(item => `${item.mediaType}:${item.name}`)).toEqual([
        "books:Dune Messiah (Edition)",
        "movies:Dune: Part Two",
        "movies:The Dune Documentary",
    ]);
    expect(result.collections).toEqual([{ id: 1, title: "Dune Universe", itemsCount: 1 }]);
    expect(result.dynamicLists).toEqual([{ id: 1, title: "Dune Watchlist" }]);
    expect(result.follows.map(item => item.name)).toEqual(["dune_fan"]);
});


it("matches original titles, respects active media types, and escapes LIKE wildcards", async () => {
    const byOriginal = await searchCommandPalette(1, [MediaType.MOVIES], "Chihiro");
    expect(byOriginal.media).toHaveLength(1);
    expect(byOriginal.media[0]).toMatchObject({ mediaId: 3, mediaType: MediaType.MOVIES, name: "Spirited Away" });

    const withoutBooks = await searchCommandPalette(1, [MediaType.MOVIES], "dune");
    expect(withoutBooks.media.every(item => item.mediaType === MediaType.MOVIES)).toBe(true);

    const wildcard = await searchCommandPalette(1, [MediaType.MOVIES, MediaType.BOOKS], "%");
    expect(wildcard).toEqual({ media: [], collections: [], dynamicLists: [], follows: [] });
});
