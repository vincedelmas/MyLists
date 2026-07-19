import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {JobType, MediaType, PrivacyType, SocialState, Status, TagAction} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvDetailsQuery } = await import("./tv-details.query");
const { TvLibraryRepository } = await import("@/lib/server/domain/media/tv/library/tv-library.repository");
const { TvLibraryService } = await import("@/lib/server/domain/media/tv/library/tv-library.service");
const { TvCatalogReadRepository } = await import("./tv-catalog-read.repository");
const { TvCatalogAdminRepository } = await import("./tv-catalog-admin.repository");


describe("TV details query", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await seedCatalog(db);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("serves catalog, private viewer state and followed state with catalog IDs", async () => {
        const libraryRepository = new TvLibraryRepository(MediaType.SERIES);
        const library = new TvLibraryService(MediaType.SERIES, libraryRepository);
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.WATCHING });
        await library.replaceRewatches({
            userId: 42,
            catalogItemId: 1000,
            rewatches: [{ seasonNumber: 1, count: 1 }],
        });
        await library.common.updateRating({ userId: 42, catalogItemId: 1000, rating: 8.5 });
        await library.common.editTag({
            userId: 42,
            mediaId: 1000,
            action: TagAction.ADD,
            tag: { name: "comfort" },
        });
        await library.add({ userId: 50, catalogItemId: 1000, status: Status.COMPLETED });

        const result = await new TvDetailsQuery(MediaType.SERIES).getMediaAndUserDetails(42, 1000);

        expect(result?.media).toMatchObject({
            id: 1000,
            apiId: 777,
            name: "Mapped Series",
            duration: 45,
            genres: [{ id: 1, name: "Drama" }],
            actors: [{ id: 1, name: "Lead" }],
            networks: [{ id: 1, name: "Network" }],
            seasons: [{ seasonNumber: 1, episodeCount: 10 }, { seasonNumber: 2, episodeCount: 8 }],
        });
        expect(result?.media.imageCover).toMatch(/series-covers\/series\.jpg$/);
        expect(result?.userMedia).toMatchObject({
            mediaId: 1000,
            rating: 8.5,
            watchedEpisodes: 1,
            rewatches: [{ seasonNumber: 1, count: 1 }],
            tags: [{ name: "comfort" }],
        });
        expect(result?.followsData).toEqual([
            expect.objectContaining({
                id: 50,
                name: "followed-owner",
                userMedia: expect.objectContaining({ mediaId: 1000, status: Status.COMPLETED, watchedEpisodes: 18 }),
            }),
        ]);
        expect(result?.similarMedia).toEqual([
            expect.objectContaining({ mediaId: 1001, mediaName: "Similar Series" }),
        ]);
    });

    it("does not expose viewer library state to an anonymous detail request", async () => {
        const library = new TvLibraryService(MediaType.SERIES, new TvLibraryRepository(MediaType.SERIES));
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.WATCHING });

        const result = await new TvDetailsQuery(MediaType.SERIES).getMediaAndUserDetails(undefined, 1000);
        expect(result?.userMedia).toBeNull();
        expect(result?.followsData).toEqual([]);
    });

    it("preserves the community audience rules while aggregating normalized TV progress", async () => {
        const library = new TvLibraryService(MediaType.SERIES, new TvLibraryRepository(MediaType.SERIES));
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.WATCHING });
        await library.add({ userId: 50, catalogItemId: 1000, status: Status.COMPLETED });
        await library.common.updateRating({ userId: 50, catalogItemId: 1000, rating: 9 });
        await db.insert(schema.profileMediaChannel).values({ userId: 42, kind: MediaType.SERIES, enabled: true });
        await db.update(schema.user).set({ privacy: PrivacyType.PUBLIC }).where(eq(schema.user.id, 50));

        const reader = new TvLibraryService(MediaType.SERIES);
        const anonymous = await reader.getCommunityActivity(undefined, 1000, { page: 1 });
        expect(anonymous).toMatchObject({
            total: 1,
            stats: { total: 1, completedCount: 1, totalSpecific: 18, averageRating: 9 },
        });
        expect(anonymous.items[0].userMedia.comment).toBeNull();

        const authenticated = await reader.getCommunityActivity(42, 1000, { page: 1 });
        expect(authenticated).toMatchObject({
            total: 2,
            stats: { total: 2, completedCount: 1, totalSpecific: 19 },
        });
    });

    it("serves public TV job pages with viewer list membership", async () => {
        const library = new TvLibraryService(MediaType.SERIES, new TvLibraryRepository(MediaType.SERIES));
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.WATCHING });

        const result = await new TvCatalogReadRepository(MediaType.SERIES)
            .getMediaJobDetails(JobType.ACTOR, "Lea", 0, 25, 42);

        expect(result).toMatchObject({
            total: 1,
            pages: 1,
            items: [expect.objectContaining({ mediaId: 1000, mediaName: "Mapped Series", inUserList: true })],
        });
    });

    it("updates the exact manager-editable TV catalog fields", async () => {
        const admin = new TvCatalogAdminRepository(MediaType.SERIES);
        await admin.updateEditableFields(1000, {
            name: "Edited Series",
            originalName: "Original edit",
            releaseDate: "2025-01-02",
            lastAirDate: "2026-03-04",
            homepage: "https://example.test/show",
            createdBy: "Creator",
            duration: 52,
            originCountry: "FR",
            prodStatus: "Ended",
            synopsis: "Edited synopsis",
            lockStatus: true,
            imageCover: "https://cdn.test/series-covers/edited.jpg",
        });

        expect(await admin.getEditableFields(1000)).toEqual({
            kind: MediaType.SERIES,
            fields: {
                name: "Edited Series",
                originalName: "Original edit",
                releaseDate: "2025-01-02",
                lastAirDate: "2026-03-04",
                homepage: "https://example.test/show",
                createdBy: "Creator",
                duration: 52,
                originCountry: "FR",
                prodStatus: "Ended",
                synopsis: "Edited synopsis",
                lockStatus: true,
            },
        });
        expect(await db.select().from(schema.catalogItem).where(eq(schema.catalogItem.id, 1000)).get()).toMatchObject({
            imageCover: "edited.jpg",
            locked: true,
        });
    });
});


const seedCatalog = async (db: BunSQLiteDatabase<typeof schema>) => {
    await db.insert(schema.user).values([
        {
            id: 42,
            name: "viewer",
            email: "viewer@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        },
        {
            id: 50,
            name: "followed-owner",
            email: "followed@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        },
    ]);
    await db.insert(schema.catalogItem).values([
        {
            id: 1000,
            kind: MediaType.SERIES,
            primaryProvider: "tmdb",
            primaryExternalId: "777",
            name: "Mapped Series",
            imageCover: "series.jpg",
        },
        {
            id: 1001,
            kind: MediaType.SERIES,
            primaryProvider: "tmdb",
            primaryExternalId: "778",
            name: "Similar Series",
            imageCover: "similar.jpg",
        },
    ]);
    await db.insert(schema.tvDetails).values([
        { catalogItemId: 1000, episodeDurationMinutes: 45, totalSeasons: 2, totalEpisodes: 18 },
        { catalogItemId: 1001, episodeDurationMinutes: 50, totalSeasons: 1, totalEpisodes: 6 },
    ]);
    await db.insert(schema.tvSeason).values([
        { catalogItemId: 1000, seasonNumber: 1, episodeCount: 10 },
        { catalogItemId: 1000, seasonNumber: 2, episodeCount: 8 },
        { catalogItemId: 1001, seasonNumber: 1, episodeCount: 6 },
    ]);
    await db.insert(schema.tvActor).values({ catalogItemId: 1000, name: "Lead" });
    await db.insert(schema.tvNetwork).values({ catalogItemId: 1000, name: "Network" });
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Drama" });
    await db.insert(schema.catalogItemGenre).values([
        { catalogItemId: 1000, genreId: 1 },
        { catalogItemId: 1001, genreId: 1 },
    ]);
    await db.insert(schema.profileMediaChannel).values({ userId: 50, kind: MediaType.SERIES, enabled: true });
    await db.insert(schema.followers).values({ followerId: 42, followedId: 50, status: SocialState.ACCEPTED });
};
