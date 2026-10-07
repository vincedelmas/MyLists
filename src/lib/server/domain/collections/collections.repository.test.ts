import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, PrivacyType, RoleType, Status} from "@/lib/utils/enums";
import {AuthorizationService, toActor} from "@/lib/server/authorization";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {AdminRepository} from "@/lib/server/domain/admin/admin.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));


describe("collection media references", () => {
    let sqlite: Database;
    let service: CollectionsService;
    const actor = toActor({ id: 1, role: RoleType.USER });
    const collectionData = {
        ownerId: 1,
        title: "Favorites",
        description: "My favorite movies",
        ordered: true,
        privacy: PrivacyType.PUBLIC,
    };

    const snapshot = () => ({
        collections: dbContext.db.select().from(schema.collections).all(),
        items: dbContext.db.select().from(schema.collectionItems).all(),
    });

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `collection-user-${id}`, email: `collection-${id}@example.com`, emailVerified: true,
            privacy: PrivacyType.PUBLIC, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }))).run();
        const media = { id: 1, apiId: 101, name: "Known media", imageCover: "cover.jpg" };
        db.insert(schema.movies).values([1, 2, 3].map(id => ({
            ...media, id, apiId: 100 + id, name: `Movie ${id}`, duration: 90,
        }))).run();
        db.insert(schema.series).values({ ...media, name: "Series 1", duration: 30, totalSeasons: 1, totalEpisodes: 10 }).run();
        db.insert(schema.anime).values({ ...media, name: "Anime 1", duration: 24, totalSeasons: 1, totalEpisodes: 12 }).run();
        db.insert(schema.books).values({ ...media, name: "Book 1", apiId: "book-101", pages: 200 }).run();
        db.insert(schema.manga).values({ ...media, name: "Manga 1", chapters: 10 }).run();
        db.insert(schema.games).values([{ ...media, name: "Game 1" }, { ...media, id: 77, apiId: 177 }]).run();

        const mediaRegistry = {
            get: (mediaType: MediaType) => createMediaQueries(getServerMediaDefinition(mediaType)),
        } as unknown as MediaServiceRegistry;
        service = new CollectionsService(
            new AuthorizationService({} as SocialService),
            CollectionsRepository,
            mediaRegistry,
        );
    });

    afterEach(() => sqlite.close());

    it.each(Object.values(MediaType))("accepts existing %s IDs and rejects unknown IDs without creating a partial collection", async mediaType => {
        const collectionId = service.createCollection({ ...collectionData, items: [{ mediaType, mediaId: 1 }] });
        const before = snapshot();

        expect(() => service.createCollection({
            ...collectionData, items: [{ mediaType, mediaId: 1 }, { mediaType, mediaId: 999 }],
        })).toThrow(FormattedError);
        expect(snapshot()).toEqual(before);

        const result = await service.getCollectionDetails(collectionId, "read", actor);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({ mediaType, mediaId: 1, orderIndex: 1 });
    });

    it("rejects an ID that exists only in a different media type", () => {
        expect(() => service.createCollection({
            ...collectionData, items: [{ mediaType: MediaType.MOVIES, mediaId: 77 }],
        })).toThrow(FormattedError);

        expect(snapshot()).toEqual({ collections: [], items: [] });
    });

    it("preserves collection details, order, and annotations when an edit contains an unknown ID", () => {
        const collectionId = service.createCollection({
            ...collectionData, items: [{ mediaType: MediaType.MOVIES, mediaId: 1, annotation: "Keep me" }, { mediaType: MediaType.MOVIES, mediaId: 2 }],
        });
        const before = snapshot();

        expect(() => service.updateCollection({
            actor, collectionId, title: "Changed title", description: "Changed description",
            ordered: false, privacy: PrivacyType.PRIVATE,
            items: [{ mediaType: MediaType.MOVIES, mediaId: 2, annotation: "Changed annotation" }, { mediaType: MediaType.MOVIES, mediaId: 999 }],
        })).toThrow(FormattedError);

        expect(snapshot()).toEqual(before);
    });

    it("rejects adding an unknown item to an existing collection", () => {
        const collectionId = service.createCollection({ ...collectionData, items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }] });
        const before = snapshot();

        expect(() => service.addMediaToCollection({
            actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 999,
        })).toThrow(FormattedError);

        expect(snapshot()).toEqual(before);
    });

    it("rejects copying legacy invalid references without creating a copy or incrementing its counter", () => {
        const collectionId = service.createCollection({ ...collectionData, items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }] });
        dbContext.db.insert(schema.collectionItems).values({
            collectionId, mediaId: 999, mediaType: MediaType.MOVIES, orderIndex: 2,
        }).run();
        const before = snapshot();

        expect(() => service.copyCollection(collectionId, toActor({ id: 2, role: RoleType.USER }))).toThrow(FormattedError);

        expect(snapshot()).toEqual(before);
    });

    it("keeps valid items readable and editable while preserving deduplication, ordering, and annotations", async () => {
        const collectionId = service.createCollection({
            ...collectionData,
            items: [{ mediaType: MediaType.MOVIES, mediaId: 2, annotation: "Second first" }, { mediaType: MediaType.MOVIES, mediaId: 1 }, { mediaType: MediaType.MOVIES, mediaId: 2, annotation: "Duplicate" }],
        });
        expect(CollectionsRepository.getCollectionItems(collectionId)).toMatchObject([
            { mediaType: MediaType.MOVIES, mediaId: 2, orderIndex: 1, annotation: "Second first" },
            { mediaType: MediaType.MOVIES, mediaId: 1, orderIndex: 2, annotation: null },
        ]);

        service.updateCollection({
            actor, collectionId, title: "Updated favorites", ordered: true, privacy: PrivacyType.PUBLIC,
            items: [{ mediaType: MediaType.MOVIES, mediaId: 1, annotation: "First now" }, { mediaType: MediaType.MOVIES, mediaId: 2 }, { mediaType: MediaType.MOVIES, mediaId: 1 }],
        });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 1 });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 3 });

        for (const mode of ["read", "edit"] as const) {
            const result = await service.getCollectionDetails(collectionId, mode, actor);
            expect(result.items).toMatchObject([
                { mediaType: MediaType.MOVIES, mediaId: 1, mediaName: "Movie 1", orderIndex: 1, annotation: "First now" },
                { mediaType: MediaType.MOVIES, mediaId: 2, mediaName: "Movie 2", orderIndex: 2, annotation: null },
                { mediaType: MediaType.MOVIES, mediaId: 3, mediaName: "Movie 3", orderIndex: 3, annotation: null },
            ]);
        }

        const copy = service.copyCollection(collectionId, toActor({ id: 2, role: RoleType.USER }));
        expect(CollectionsRepository.getCollectionById(copy.id)).toMatchObject({ ownerId: 2, privacy: PrivacyType.PRIVATE });
        expect(CollectionsRepository.getCollectionItems(copy.id)).toMatchObject([
            { mediaType: MediaType.MOVIES, mediaId: 1, orderIndex: 1, annotation: "First now" },
            { mediaType: MediaType.MOVIES, mediaId: 2, orderIndex: 2, annotation: null },
            { mediaType: MediaType.MOVIES, mediaId: 3, orderIndex: 3, annotation: null },
        ]);
        expect(CollectionsRepository.getCollectionById(collectionId)?.copiedCount).toBe(1);
    });

    it("keeps same-ID media distinct through creation, editing, copying, additions and removals", async () => {
        const types = Object.values(MediaType);
        const collectionId = service.createCollection({
            ...collectionData,
            items: [
                ...types.map(mediaType => ({ mediaType, mediaId: 1, annotation: `Original ${mediaType}` })),
                { mediaType: MediaType.MOVIES, mediaId: 1, annotation: "Discard duplicate" },
            ],
        });
        expect(CollectionsRepository.getCollectionById(collectionId)).toMatchObject({ itemsCount: 6 });
        expect(CollectionsRepository.getCollectionById(collectionId)!.mediaTypes).toEqual(expect.arrayContaining(types));
        for (const mode of ["read", "edit"] as const) {
            const result = await service.getCollectionDetails(collectionId, mode, actor);
            expect(result.total).toBe(6);
            expect(result.items.map(item => [item.mediaType, item.mediaId, item.annotation])).toEqual(
                types.map(type => [type, 1, `Original ${type}`]),
            );
            expect(new Set(result.items.map(item => item.mediaName)).size).toBe(6);
            expect(result.items.every(item => item.mediaCover.includes(`${item.mediaType}-covers/`))).toBe(true);
        }

        service.updateCollection({
            actor, collectionId, title: "A mixed universe", ordered: true, privacy: PrivacyType.PUBLIC,
            items: [...types].reverse().map(mediaType => ({ mediaType, mediaId: 1, annotation: `Updated ${mediaType}` })),
        });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 1 });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 2 });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.GAMES, mediaId: 77 });
        service.removeMediaFromCollection({ actor, collectionId, mediaType: MediaType.BOOKS, mediaId: 1 });
        const remaining = CollectionsRepository.getCollectionItems(collectionId);
        expect(remaining).toHaveLength(7);
        expect(remaining.some(item => item.mediaType === MediaType.MOVIES && item.mediaId === 1)).toBe(true);
        expect(remaining.some(item => item.mediaType === MediaType.BOOKS && item.mediaId === 1)).toBe(false);
        expect(CollectionsRepository.getCollectionById(collectionId)!.mediaTypes).not.toContain(MediaType.BOOKS);

        const copy = service.copyCollection(collectionId, toActor({ id: 2, role: RoleType.USER }));
        expect(CollectionsRepository.getCollectionById(copy.id)).toMatchObject({ ownerId: 2, itemsCount: 7, privacy: PrivacyType.PRIVATE });
        expect(CollectionsRepository.getCollectionItems(copy.id).map(({ mediaId, mediaType, orderIndex, annotation }) => ({ mediaId, mediaType, orderIndex, annotation })))
            .toEqual(remaining.map(({ mediaId, mediaType, orderIndex, annotation }) => ({ mediaId, mediaType, orderIndex, annotation })));
        expect(CollectionsRepository.getCollectionById(collectionId)!.copiedCount).toBe(1);
    });

    it("validates every media type before replacing existing mixed collection data", () => {
        const collectionId = service.createCollection({
            ...collectionData,
            items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }, { mediaType: MediaType.BOOKS, mediaId: 1, annotation: "Book note" }],
        });
        const before = snapshot();
        const items = [{ mediaType: MediaType.MOVIES, mediaId: 2 }, { mediaType: MediaType.BOOKS, mediaId: 77 }];
        expect(() => service.createCollection({ ...collectionData, items })).toThrow(FormattedError);
        expect(snapshot()).toEqual(before);
        expect(() => service.updateCollection({
            actor, collectionId, title: "Do not save", description: "Do not save", ordered: false,
            privacy: PrivacyType.PRIVATE, items,
        })).toThrow(FormattedError);
        expect(snapshot()).toEqual(before);
    });

    it("uses typed memberships, contains-type discovery and ordered typed previews without duplicating collections", async () => {
        const mixedId = service.createCollection({
            ...collectionData, title: "Mixed universe",
            items: [
                { mediaType: MediaType.MOVIES, mediaId: 1 }, { mediaType: MediaType.BOOKS, mediaId: 1 },
                { mediaType: MediaType.MOVIES, mediaId: 2 }, { mediaType: MediaType.GAMES, mediaId: 1 },
                { mediaType: MediaType.MANGA, mediaId: 1 },
            ],
        });
        const moviesId = service.createCollection({ ...collectionData, items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }] });
        const privateId = service.createCollection({
            ...collectionData, privacy: PrivacyType.PRIVATE, items: [{ mediaType: MediaType.BOOKS, mediaId: 1 }],
        });
        const memberships = await service.getUserCollectionMemberships(1, 1, MediaType.BOOKS);
        expect(memberships.map(({ id, hasMedia }) => ({ id, hasMedia }))).toEqual(expect.arrayContaining([
            { id: mixedId, hasMedia: true }, { id: moviesId, hasMedia: false }, { id: privateId, hasMedia: true },
        ]));
        expect(memberships).toHaveLength(3);

        const anonymous = toActor();
        const books = await service.getPublicCollections({ mediaType: MediaType.BOOKS }, anonymous);
        expect(books.total).toBe(1);
        expect(books.items[0]).toMatchObject({ id: mixedId, itemsCount: 5 });
        expect(books.items[0].previews).toMatchObject([
            { mediaType: MediaType.MOVIES, mediaId: 1, mediaName: "Movie 1" },
            { mediaType: MediaType.BOOKS, mediaId: 1, mediaName: "Book 1" },
            { mediaType: MediaType.MOVIES, mediaId: 2, mediaName: "Movie 2" },
            { mediaType: MediaType.GAMES, mediaId: 1, mediaName: "Game 1" },
        ]);
        expect(books.items[0].previews).toHaveLength(4);
        expect(books.items[0].mediaTypes).toEqual(expect.arrayContaining([MediaType.MOVIES, MediaType.BOOKS, MediaType.GAMES, MediaType.MANGA]));
        const movies = await service.getPublicCollections({ mediaType: MediaType.MOVIES }, anonymous);
        expect(movies.total).toBe(2);
        expect(new Set(movies.items.map(item => item.id)).size).toBe(2);
        const profile = await service.getPaginatedUserCollections(1, { mediaType: MediaType.BOOKS }, anonymous);
        expect(profile).toMatchObject({ total: 1, items: [{ id: mixedId }] });
        const owner = await service.getUserCollections(1, actor, MediaType.BOOKS);
        expect(owner.map(item => item.id)).toEqual(expect.arrayContaining([mixedId, privateId]));
        expect(owner).toHaveLength(2);
        const community = await service.getMediaCommunityCollections(1, MediaType.BOOKS, anonymous);
        expect(community.map(item => item.id)).toEqual([mixedId]);
        expect((await service.getMediaCommunityCollections(2, MediaType.BOOKS, anonymous))).toEqual([]);

        const overview = await AdminRepository.getCollectionsOverview();
        expect(overview.collectionsPerMediaType).toEqual(expect.arrayContaining([
            { mediaType: MediaType.MOVIES, count: 2 }, { mediaType: MediaType.BOOKS, count: 2 },
            { mediaType: MediaType.GAMES, count: 1 }, { mediaType: MediaType.MANGA, count: 1 },
        ]));
        const adminPage = await AdminRepository.getPaginatedCollectionsForAdmin({ search: "Mixed universe" });
        expect(adminPage).toMatchObject({ total: 1, items: [{ id: mixedId, itemsCount: 5 }] });
        expect(adminPage.items[0].mediaTypes).toEqual(books.items[0].mediaTypes);
    });

    it("globally sorts, searches and paginates mixed results while preserving collection ranks", async () => {
        const entries = Array.from({ length: 32 }, (_, index) => ({
            id: 10 + Math.floor(index / 2),
            mediaType: index % 2 === 0 ? MediaType.MOVIES : MediaType.BOOKS,
            name: `Entry ${String(index + 1).padStart(2, "0")}`,
            releaseDate: index === 31 ? null : index % 2 === 0
                ? `${2000 + index}-01-01 00:00:00` : `${2000 + index}-01-01T00:00:00.000Z`,
        }));
        dbContext.db.insert(schema.movies).values(entries.filter(item => item.mediaType === MediaType.MOVIES).map(({ mediaType: _, ...item }) => ({
            ...item, apiId: 100 + item.id, duration: 90, imageCover: "movie.jpg",
        }))).run();
        dbContext.db.insert(schema.books).values(entries.filter(item => item.mediaType === MediaType.BOOKS).map(({ mediaType: _, ...item }) => ({
            ...item, apiId: `book-${item.id}`, pages: 200, imageCover: "book.jpg",
        }))).run();
        const collectionId = service.createCollection({
            ...collectionData,
            items: [...entries].reverse().map(item => ({ mediaType: item.mediaType, mediaId: item.id, annotation: `Note ${item.name}` })),
        });
        const first = await service.getCollectionDetails(collectionId, "read", toActor());
        expect(first).toMatchObject({ total: 32, pages: 2, page: 1, perPage: 24 });
        expect(first.items.map(item => item.mediaName)).toEqual([...entries].reverse().slice(0, 24).map(item => item.name));
        const second = await service.getCollectionDetails(collectionId, "read", toActor(), { page: 2 });
        expect(second.items.map(item => item.orderIndex)).toEqual([25, 26, 27, 28, 29, 30, 31, 32]);
        const sorted = await service.getCollectionDetails(collectionId, "read", toActor(), { sorting: "title_asc" });
        expect(sorted.items.map(item => item.mediaName)).toEqual(entries.slice(0, 24).map(item => item.name));
        const sortedSecond = await service.getCollectionDetails(collectionId, "read", toActor(), { sorting: "title_asc", page: 2 });
        expect(sortedSecond.items.map(item => item.mediaName)).toEqual(entries.slice(24).map(item => item.name));
        const found = await service.getCollectionDetails(collectionId, "read", toActor(), { search: "Entry 01" });
        expect(found).toMatchObject({ total: 1, items: [{ mediaType: MediaType.MOVIES, mediaId: 10, orderIndex: 32, annotation: "Note Entry 01" }] });
        const latest = await service.getCollectionDetails(collectionId, "read", toActor(), { sorting: "release_newest" });
        expect(latest.items[0].mediaName).toBe("Entry 31");
        const oldest = await service.getCollectionDetails(collectionId, "read", toActor(), { sorting: "release_oldest", page: 2 });
        expect(oldest.items.at(-1)!.mediaName).toBe("Entry 32");
        const books = await service.getCollectionDetails(collectionId, "read", toActor(), { mediaType: MediaType.BOOKS, sorting: "title_asc" });
        expect(books.total).toBe(16);
        expect(books.items.every(item => item.mediaType === MediaType.BOOKS)).toBe(true);
        expect(books.filterOptions.mediaTypes).toEqual(expect.arrayContaining([MediaType.MOVIES, MediaType.BOOKS]));
        const absent = await service.getCollectionDetails(collectionId, "read", toActor(), { mediaType: MediaType.MANGA });
        expect(absent).toMatchObject({ total: 0, items: [], pages: 0 });
    });

    it("joins tracking membership by media type and viewer, including same numeric IDs", async () => {
        const collectionId = service.createCollection({
            ...collectionData,
            items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }, { mediaType: MediaType.BOOKS, mediaId: 1 }, { mediaType: MediaType.GAMES, mediaId: 1 }],
        });
        dbContext.db.insert(schema.moviesList).values({ userId: 2, mediaId: 1, status: Status.COMPLETED, rating: 9, customCover: "viewer.jpg" }).run();
        dbContext.db.insert(schema.booksList).values({ userId: 1, mediaId: 1, status: Status.COMPLETED, rating: 10, customCover: "owner-private.jpg" }).run();
        const viewer = toActor({ id: 2, role: RoleType.USER });
        const tracked = await service.getCollectionDetails(collectionId, "read", viewer, { library: "in" });
        expect(tracked).toMatchObject({ total: 1, items: [{ mediaType: MediaType.MOVIES, mediaId: 1, inUserList: true, rating: 9 }] });
        expect(tracked.items[0].mediaCover).toBe("https://mylists.example.invalid/static/movies-covers/viewer.jpg");
        const untracked = await service.getCollectionDetails(collectionId, "read", viewer, { library: "out" });
        expect(untracked.total).toBe(2);
        expect(untracked.items.map(item => item.mediaType)).toEqual([MediaType.BOOKS, MediaType.GAMES]);
        expect(untracked.items.every(item => item.status === null && item.rating === null && !item.inUserList)).toBe(true);
        expect(untracked.items[0].mediaCover).not.toContain("owner-private");
        await expect(service.getCollectionDetails(collectionId, "read", toActor(), { library: "in" })).rejects.toThrow("Sign in");
    });

    it("only accepts sort options shared by the selected contents and supports narrowing to a media type", async () => {
        dbContext.db.update(schema.movies).set({ voteAverage: 9 }).where(eq(schema.movies.id, 2)).run();
        const collectionId = service.createCollection({
            ...collectionData,
            items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }, { mediaType: MediaType.BOOKS, mediaId: 1 }, { mediaType: MediaType.MOVIES, mediaId: 2 }],
        });
        await expect(service.getCollectionDetails(collectionId, "read", toActor(), { sorting: "provider_rating_highest" }))
            .rejects.toThrow("not available");
        const movies = await service.getCollectionDetails(collectionId, "read", toActor(), { mediaType: MediaType.MOVIES, sorting: "provider_rating_highest" });
        expect(movies.items.map(item => item.mediaId)).toEqual([2, 1]);
        const books = await service.getCollectionDetails(collectionId, "read", toActor(), { mediaType: MediaType.BOOKS, sorting: "pages_highest" });
        expect(books).toMatchObject({ total: 1, items: [{ mediaType: MediaType.BOOKS, mediaId: 1 }] });
    });
});
