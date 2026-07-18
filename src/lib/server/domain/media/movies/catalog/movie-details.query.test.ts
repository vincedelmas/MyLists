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
    withTransaction: (action: () => Promise<unknown>) => action(),
}));

const { MovieDetailsQuery } = await import("./movie-details.query");
const { MovieCatalogReadRepository } = await import("./movie-catalog-read.repository");
const { MovieLibraryRepository } = await import("@/lib/server/domain/media/movies/library/movie-library.repository");
const { MovieLibraryService } = await import("@/lib/server/domain/media/movies/library/movie-library.service");
const { MovieCatalogAdminRepository } = await import("./movie-catalog-admin.repository");
const { MovieCatalogEditCommand } = await import("./movie-catalog-edit.command");


describe("movie details query", () => {
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

    it("serves movie metadata, collection, private state and followed state with canonical IDs", async () => {
        const repository = new MovieLibraryRepository();
        const library = new MovieLibraryService(repository);
        const viewerEntry = await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        await library.replaceRewatches({ userId: 42, catalogItemId: 1000, rewatchCount: 2 });
        await library.updateRating({ userId: 42, catalogItemId: 1000, rating: 8.5 });
        await repository.editTag({
            userId: 42,
            action: TagAction.ADD,
            name: "comfort",
            libraryEntryId: viewerEntry.id,
        });
        await library.add({ userId: 50, catalogItemId: 1000, status: Status.COMPLETED });

        const result = await new MovieDetailsQuery().getMediaAndUserDetails(42, 1000);

        expect(result?.media).toMatchObject({
            id: 1000,
            apiId: 777,
            name: "Mapped Movie",
            duration: 125,
            directorName: "Director",
            compositorName: "Composer",
            genres: [{ id: 1, name: "Drama" }],
            actors: [{ id: 1, name: "Lead" }],
            collection: [expect.objectContaining({ mediaId: 1002, mediaName: "Collection Sequel" })],
        });
        expect(result?.media.imageCover).toMatch(/movies-covers\/movie\.jpg$/);
        expect(result?.userMedia).toMatchObject({
            mediaId: 1000,
            rating: 8.5,
            watchCount: 3,
            rewatchCount: 2,
            tags: [{ name: "comfort" }],
        });
        expect(result?.followsData).toEqual([
            expect.objectContaining({
                id: 50,
                name: "followed-owner",
                userMedia: expect.objectContaining({ mediaId: 1000, status: Status.COMPLETED, watchCount: 1 }),
            }),
        ]);
        expect(result?.similarMedia).toEqual([
            expect.objectContaining({ mediaId: 1001, mediaName: "Similar Movie" }),
        ]);
    });

    it("preserves movie community audience rules and normalized watch totals", async () => {
        const library = new MovieLibraryService(new MovieLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        await library.replaceRewatches({ userId: 42, catalogItemId: 1000, rewatchCount: 1 });
        await library.add({ userId: 50, catalogItemId: 1000, status: Status.COMPLETED });
        await library.updateRating({ userId: 50, catalogItemId: 1000, rating: 9 });
        await db.insert(schema.profileMediaChannel).values({ userId: 42, kind: MediaType.MOVIES, enabled: true });
        await db.update(schema.user).set({ privacy: PrivacyType.PUBLIC }).where(eq(schema.user.id, 50));

        const reader = new MovieLibraryService();
        const anonymous = await reader.getCommunityActivity(undefined, 1000, { page: 1 });
        expect(anonymous).toMatchObject({
            total: 1,
            stats: { total: 1, completedCount: 1, totalSpecific: 1, averageRating: 9 },
        });
        expect(anonymous.items[0].userMedia.comment).toBeNull();

        const authenticated = await reader.getCommunityActivity(42, 1000, { page: 1 });
        expect(authenticated).toMatchObject({
            total: 2,
            stats: { total: 2, completedCount: 2, totalSpecific: 3, totalRedo: 1 },
        });
    });

    it("serves actor, director and compositor pages with viewer membership", async () => {
        const library = new MovieLibraryService(new MovieLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        const catalog = new MovieCatalogReadRepository();

        for (const [job, name] of [
            [JobType.ACTOR, "Lea"],
            [JobType.CREATOR, "Dire"],
            [JobType.COMPOSITOR, "Comp"],
        ] as const) {
            const result = await catalog.getMediaJobDetails(job, name, 0, 25, 42);
            expect(result).toMatchObject({
                total: 1,
                pages: 1,
                items: [expect.objectContaining({ mediaId: 1000, mediaName: "Mapped Movie", inUserList: true })],
            });
        }
    });

    it("updates manager-editable movie fields while repairing duration stats", async () => {
        const library = new MovieLibraryService(new MovieLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        const admin = new MovieCatalogEditCommand(new MovieCatalogAdminRepository());
        await admin.updateEditableFields(1000, {
            name: "Edited Movie",
            originalName: "Original edit",
            releaseDate: "2025-02-03",
            homepage: "https://example.test/movie",
            duration: 150,
            originalLanguage: "fr",
            budget: 200,
            revenue: 500,
            tagline: "Edited tagline",
            directorName: "New Director",
            synopsis: "Edited synopsis",
            lockStatus: true,
            imageCover: "https://cdn.test/movies-covers/edited.jpg",
        });

        expect(await admin.getEditableFields(1000)).toEqual({
            kind: MediaType.MOVIES,
            fields: {
                name: "Edited Movie",
                originalName: "Original edit",
                directorName: "New Director",
                releaseDate: "2025-02-03",
                duration: 150,
                synopsis: "Edited synopsis",
                budget: 200,
                revenue: 500,
                tagline: "Edited tagline",
                originalLanguage: "fr",
                lockStatus: true,
                homepage: "https://example.test/movie",
            },
        });
        expect(await db.select().from(schema.catalogItem).where(eq(schema.catalogItem.id, 1000)).get()).toMatchObject({
            imageCover: "edited.jpg",
            locked: true,
        });
        expect(await db.select().from(schema.libraryStats).where(eq(schema.libraryStats.userId, 42)).get()).toMatchObject({
            timeSpentMinutes: 150,
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
        { id: 1000, kind: MediaType.MOVIES, primaryProvider: "tmdb", primaryExternalId: "777", name: "Mapped Movie", releaseDate: "2024-01-01", imageCover: "movie.jpg" },
        { id: 1001, kind: MediaType.MOVIES, primaryProvider: "tmdb", primaryExternalId: "778", name: "Similar Movie", releaseDate: "2025-01-01", imageCover: "similar.jpg" },
        { id: 1002, kind: MediaType.MOVIES, primaryProvider: "tmdb", primaryExternalId: "779", name: "Collection Sequel", releaseDate: "2026-01-01", imageCover: "sequel.jpg" },
    ]);
    await db.insert(schema.movieDetails).values([
        { catalogItemId: 1000, durationMinutes: 125, collectionExternalId: 55, directorName: "Director", compositorName: "Composer" },
        { catalogItemId: 1001, durationMinutes: 90 },
        { catalogItemId: 1002, durationMinutes: 130, collectionExternalId: 55 },
    ]);
    await db.insert(schema.movieActor).values({ id: 1, catalogItemId: 1000, name: "Lead" });
    await db.insert(schema.catalogGenre).values({ id: 1, name: "Drama" });
    await db.insert(schema.catalogItemGenre).values([
        { catalogItemId: 1000, genreId: 1 },
        { catalogItemId: 1001, genreId: 1 },
    ]);
    await db.insert(schema.profileMediaChannel).values({ userId: 50, kind: MediaType.MOVIES, enabled: true });
    await db.insert(schema.followers).values({ followerId: 42, followedId: 50, status: SocialState.ACCEPTED });
};
