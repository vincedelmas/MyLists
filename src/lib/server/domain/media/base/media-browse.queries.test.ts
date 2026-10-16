import {seedMediaTags} from "@/lib/server/domain/media/tag-test-utils";
import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {GamesPlatformsEnum, MediaType, PrivacyType, RoleType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {AuthorizationService, toActor} from "@/lib/server/authorization";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {createMediaQueries} from "./media.queries";
import {createMediaListQueries} from "./media-list.queries";
import {createMediaBrowseQueryParts} from "./media-browse.queries";

const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({
    get db() {
        return dbContext.db;
    }
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));


describe("collection and job media browsing", () => {
    let sqlite: Database;
    let collections: CollectionsService;
    let collectionId: number;
    const viewer = toActor({ id: 2, role: RoleType.USER });
    const movies = createMediaQueries(moviesServerDefinition);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `browse-user-${id}`, email: `browse-${id}@example.invalid`, emailVerified: true,
            privacy: PrivacyType.PRIVATE, createdAt: "2026-01-01", updatedAt: "2026-01-01",
        }))).run();
        dbContext.db.insert(schema.movies).values(Array.from({ length: 56 }, (_, index) => ({
            id: index + 1, apiId: index + 1, name: `Movie ${String(index + 1).padStart(3, "0")}`,
            originalName: index === 54 ? "Off-page original sentinel" : null,
            directorName: index < 55 ? "Test director" : "Other director",
            imageCover: `${index + 1}.jpg`, duration: 100,
            voteAverage: index === 54 ? 9 : 5,
            releaseDate: new Date(Date.UTC(2000, 0, index + 1)).toISOString(),
        }))).run();
        dbContext.db.insert(schema.moviesActors).values(Array.from({ length: 55 }, (_, index) => [
            { mediaId: index + 1, name: "Test actor" },
            { mediaId: index + 1, name: "Test actor alternate" },
        ]).flat()).run();
        dbContext.db.insert(schema.moviesGenre).values([
            { mediaId: 1, name: "Drama" }, { mediaId: 55, name: "Rare" },
            { mediaId: 55, name: "Science fiction" }, { mediaId: 56, name: "Outside source" },
        ]).run();
        dbContext.db.insert(schema.moviesList).values([
            { userId: 1, mediaId: 2, status: Status.COMPLETED, rating: 10, favorite: true },
            { userId: 1, mediaId: 55, status: Status.COMPLETED, rating: 10, favorite: true },
            { userId: 2, mediaId: 1, status: Status.COMPLETED, rating: 3, favorite: false, addedAt: "2026-06-01T00:00:00.000Z" },
            { userId: 2, mediaId: 55, status: Status.DROPPED, rating: 9, favorite: true, addedAt: "2026-01-01 00:00:00", customCover: "custom.jpg" },
        ]).run();
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 55, name: "Owner secret" }, { userId: 2, mediaId: 55, name: "Viewer tag" },
            { userId: 2, mediaId: 56, name: "Outside tag" }, { userId: 2, name: "Unassigned tag" },
        ]);
        collections = new CollectionsService(
            new AuthorizationService({ getFollowingStatus: vi.fn().mockReturnValue(null) } as unknown as SocialService),
            CollectionsRepository,
            { get: () => movies } as unknown as MediaServiceRegistry,
        );
        collectionId = collections.createCollection({
            ownerId: 1, title: "A ranked source", ordered: true, privacy: PrivacyType.PUBLIC,
            items: Array.from({ length: 55 }, (_, index) => ({ mediaType: MediaType.MOVIES, mediaId: index + 1, annotation: index === 54 ? "Keep original rank" : null })),
        });
    });

    afterEach(() => sqlite.close());

it("uses the viewer's tracking data for collection filters and never the collection owner's", async () => {
        const completed = await collections.getCollectionDetails(collectionId, "read", viewer, { status: Status.COMPLETED });
        expect(completed.items.map(item => item.mediaId)).toEqual([1]);
        const favorite = await collections.getCollectionDetails(collectionId, "read", viewer, { favorite: true, minRating: 8, tags: ["Viewer tag"] });
        expect(favorite.items).toMatchObject([{ mediaId: 55, status: Status.DROPPED, rating: 9, favorite: true }]);
        const nonFavorites = await collections.getCollectionDetails(collectionId, "read", viewer, { favorite: false });
        expect(nonFavorites.total).toBe(54);
        expect(nonFavorites.items.some(item => item.mediaId === 1 && item.favorite === false)).toBe(true);
        expect(nonFavorites.items.some(item => item.mediaId === 2 && !item.inUserList)).toBe(true);
        expect(nonFavorites.items.every(item => item.favorite !== true)).toBe(true);
        const foreignTag = await collections.getCollectionDetails(collectionId, "read", viewer, { tags: ["Owner secret"] });
        expect(foreignTag.total).toBe(0);
        const out = await collections.getCollectionDetails(collectionId, "read", viewer, { library: "out" });
        expect(out.total).toBe(53);
        expect(out.items[0]).toMatchObject({ mediaId: 2, inUserList: false, status: null, rating: null, favorite: null });
    });

    it("shares metadata facets with lists before pagination and lazily exposes source-scoped options", async () => {
        dbContext.db.insert(schema.moviesActors).values([
            { mediaId: 55, name: "Rare actor" }, { mediaId: 56, name: "Outside actor" }, { mediaId: 2, name: "Untracked actor" },
        ]).run();
        const filters: MediaBrowseFilters = { mediaFilters: { movies: { actors: ["Rare actor"], directors: ["Test director"] } } };
        const result = await collections.getCollectionDetails(collectionId, "read", viewer, filters);
        expect(result).toMatchObject({ total: 1, items: [{ mediaId: 55, orderIndex: 55 }], filterOptions: { mediaFilters: {} } });
        const ordinary = await createMediaListQueries(moviesServerDefinition.repository).getMediaList(undefined, 2, filters.mediaFilters!.movies!);
        expect(ordinary.items.map(item => item.mediaId)).toEqual([55]);

        const before = CollectionsRepository.getCollectionById(collectionId)!.viewCount;
        const options = await collections.getCollectionDetails(collectionId, "read", toActor(), {}, true);
        expect(options.filterOptions).not.toHaveProperty("mediaFilters.movies.actors");
        const search = { collectionId, mediaType: MediaType.MOVIES, field: "actors" as const, query: "actor" };
        expect(collections.searchCollectionFilters(search, toActor())).toEqual([
            { name: "Rare actor" }, { name: "Test actor" }, { name: "Test actor alternate" }, { name: "Untracked actor" },
        ]);
        expect(collections.searchCollectionFilters({ ...search, query: "Untracked", library: "out" }, viewer)).toEqual([{ name: "Untracked actor" }]);
        expect(collections.searchCollectionFilters({ ...search, query: "Untracked", library: "in" }, viewer)).toEqual([]);
        expect(options.filterOptions.genres).toEqual(["Drama", "Rare", "Science fiction"]);
        expect(options.filterOptions.tags).toEqual([]);
        expect(CollectionsRepository.getCollectionById(collectionId)!.viewCount).toBe(before);
        expect(() => createMediaBrowseQueryParts(getServerMediaDefinition(MediaType.GAMES), {
            mediaFilters: { games: { platforms: [GamesPlatformsEnum.PC] } },
        })).toThrow("Sign in");
    });

it("filters stored viewer comments without reading the collection owner's comments", async () => {
        dbContext.db.update(schema.moviesList).set({ comment: "Owner comment" }).where(eq(schema.moviesList.userId, 1)).run();
        dbContext.db.update(schema.moviesList).set({ comment: "Viewer comment" })
            .where(and(eq(schema.moviesList.userId, 2), eq(schema.moviesList.mediaId, 1))).run();
        const result = await collections.getCollectionDetails(collectionId, "read", viewer, { comment: true });
        expect(result.total).toBe(1);
        expect(result.items[0].mediaId).toBe(1);
        await expect(collections.getCollectionDetails(collectionId, "read", toActor(), { comment: true })).rejects.toThrow("Sign in");
    });

    it("allows guest catalogue filters but rejects personal filters and sorting", async () => {
        const guest = toActor();
        const catalog = await collections.getCollectionDetails(collectionId, "read", guest, { genres: ["Rare"], sorting: "title_desc", tags: [] });
        expect(catalog.total).toBe(1);
        const personal: MediaBrowseFilters[] = [
            { library: "out" }, { status: Status.COMPLETED }, { favorite: false }, { tags: ["Viewer tag"] },
            { minRating: 0 }, { sorting: "rating_highest" }, { sorting: "added_oldest" },
        ];
        for (const filters of personal) {
            await expect(collections.getCollectionDetails(collectionId, "read", guest, filters)).rejects.toThrow("Sign in");
        }
    });

it("keeps private collection authorization ahead of filtered item loading", async () => {
        dbContext.db.update(schema.collections).set({ privacy: PrivacyType.PRIVATE }).where(eq(schema.collections.id, collectionId)).run();
        const before = CollectionsRepository.getCollectionById(collectionId)!.viewCount;
        await expect(collections.getCollectionDetails(collectionId, "read", viewer, { search: "original sentinel" }))
            .rejects.toMatchObject({ name: "UnauthorizedError", type: "private" });
        expect(CollectionsRepository.getCollectionById(collectionId)!.viewCount).toBe(before);
    });
});
