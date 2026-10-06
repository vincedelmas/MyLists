import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {JobType, MediaType, PrivacyType, RoleType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {AuthorizationService, toActor} from "@/lib/server/authorization";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {createMediaQueries} from "./media.queries";
import {createMediaListQueries} from "./media-list.queries";


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
        dbContext.db.insert(schema.moviesTags).values([
            { userId: 1, mediaId: 55, name: "Owner secret" }, { userId: 2, mediaId: 55, name: "Viewer tag" },
            { userId: 2, mediaId: 56, name: "Outside tag" }, { userId: 2, name: "Unassigned tag" },
        ]).run();
        collections = new CollectionsService(
            new AuthorizationService({ getFollowingStatus: vi.fn().mockReturnValue(null) } as unknown as SocialService),
            CollectionsRepository,
            { get: () => movies } as unknown as MediaServiceRegistry,
        );
        collectionId = collections.createCollection({
            ownerId: 1, mediaType: MediaType.MOVIES, title: "A ranked source", ordered: true, privacy: PrivacyType.PUBLIC,
            items: Array.from({ length: 55 }, (_, index) => ({ mediaId: index + 1, annotation: index === 54 ? "Keep original rank" : null })),
        });
    });

    afterEach(() => sqlite.close());

    it("searches and filters the full collection before pagination while retaining ranks and annotations", async () => {
        const first = await collections.getCollectionDetails(collectionId, "read", viewer);
        expect(first).toMatchObject({ total: 55, pages: 3, page: 1, perPage: 24 });
        expect(first.items).toHaveLength(24);
        const original = await collections.getCollectionDetails(collectionId, "read", viewer, { search: "original sentinel" });
        expect(original).toMatchObject({ total: 1, pages: 1, items: [{ mediaId: 55, orderIndex: 55, annotation: "Keep original rank" }] });
        const genre = await collections.getCollectionDetails(collectionId, "read", viewer, { genres: ["Rare", "Science fiction"] });
        expect(genre.total).toBe(1);
        expect(genre.items[0].mediaId).toBe(55);
        const sorted = await collections.getCollectionDetails(collectionId, "read", viewer, { sorting: "title_desc" });
        expect(sorted.items[0]).toMatchObject({ mediaId: 55, orderIndex: 55, annotation: "Keep original rank" });
    });

    it("uses the viewer's tracking data for collection filters and never the collection owner's", async () => {
        const completed = await collections.getCollectionDetails(collectionId, "read", viewer, { status: Status.COMPLETED });
        expect(completed.items.map(item => item.mediaId)).toEqual([1]);
        const favorite = await collections.getCollectionDetails(collectionId, "read", viewer, { favorite: true, minRating: 8, tags: ["Viewer tag"] });
        expect(favorite.items).toMatchObject([{ mediaId: 55, status: Status.DROPPED, rating: 9, favorite: true }]);
        const foreignTag = await collections.getCollectionDetails(collectionId, "read", viewer, { tags: ["Owner secret"] });
        expect(foreignTag.total).toBe(0);
        const out = await collections.getCollectionDetails(collectionId, "read", viewer, { library: "out" });
        expect(out.total).toBe(53);
        expect(out.items[0]).toMatchObject({ mediaId: 2, inUserList: false, status: null, rating: null, favorite: null });
    });

    it("keeps job results distinct and finds matching media beyond the first page", async () => {
        const first = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", {});
        expect(first).toMatchObject({ total: 55, pages: 3, page: 1, perPage: 24 });
        expect(first.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
        const original = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { search: "original sentinel" });
        expect(original).toMatchObject({ total: 1, items: [{ mediaId: 55 }] });
        const director = await movies.getMediaJobDetails(JobType.CREATOR, "Test director", { search: "original sentinel" });
        expect(director).toMatchObject({ total: 1, items: [{ mediaId: 55 }] });
        const page = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { page: 3 });
        expect(page.items.map(item => item.mediaId)).toEqual([49, 50, 51, 52, 53, 54, 55]);
    });

    it("sorts collection tracking data by viewer ratings and mixed-format added dates with nulls last", async () => {
        const highest = await collections.getCollectionDetails(collectionId, "read", viewer, { sorting: "rating_highest" });
        expect(highest.items.slice(0, 3).map(item => [item.mediaId, item.rating])).toEqual([[55, 9], [1, 3], [2, null]]);
        expect(highest.items[0].mediaCover).toBe("https://mylists.example.invalid/static/movies-covers/custom.jpg");
        const lowest = await collections.getCollectionDetails(collectionId, "read", viewer, { sorting: "rating_lowest" });
        expect(lowest.items.slice(0, 3).map(item => item.mediaId)).toEqual([1, 55, 2]);
        const oldest = await collections.getCollectionDetails(collectionId, "read", viewer, { sorting: "added_oldest" });
        expect(oldest.items.slice(0, 3).map(item => item.mediaId)).toEqual([55, 1, 2]);
        const tracked = await collections.getCollectionDetails(collectionId, "read", viewer, { library: "in", tags: ["Viewer tag"], status: Status.DROPPED });
        expect(tracked).toMatchObject({ total: 1, items: [{ mediaId: 55, rating: 9, status: Status.DROPPED }] });
    });

    it("returns job catalogue data with only the viewer's membership and the original cover", async () => {
        const tracked = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { library: "in" }, 2);
        expect(tracked.total).toBe(2);
        expect(tracked.items.map(item => item.mediaId)).toEqual([1, 55]);
        expect(tracked.items.every(item => item.inUserList)).toBe(true);
        expect(Object.keys(tracked.items[1]).sort()).toEqual([
            "imageCover", "inUserList", "mediaId", "mediaName", "releaseDate",
        ]);
        expect(tracked.items[1].imageCover).toBe("https://mylists.example.invalid/static/movies-covers/55.jpg");
        const untracked = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { library: "out" }, 2);
        expect(untracked.total).toBe(53);
        expect(untracked.items[0]).toMatchObject({ mediaId: 2, inUserList: false });
        const guest = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", {});
        expect(guest.items.every(item => !item.inUserList)).toBe(true);
        await expect(movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { library: "out" })).rejects.toThrow("Sign in");
    });

    it("shares catalogue sorting with the list and orders before pagination", async () => {
        const collection = await collections.getCollectionDetails(collectionId, "read", viewer, { sorting: "provider_rating_highest" });
        const job = await movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { sorting: "provider_rating_highest" });
        const list = await createMediaListQueries(moviesServerDefinition.repository).getMediaList(undefined, 1, { sorting: "TMDB Rating +" });
        expect(collection.items[0].mediaId).toBe(55);
        expect(job.items[0].mediaId).toBe(55);
        expect(list.items.map(item => item.mediaId)).toEqual([55, 2]);
        expect(list.pagination.availableSorting).toContain("TMDB Rating +");
        await expect(movies.getMediaJobDetails(JobType.ACTOR, "Test actor", { sorting: "pages_highest" }))
            .rejects.toThrow("not available");
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
