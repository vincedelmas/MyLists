import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ActivityRepository} from "@/lib/server/domain/activity/activity.repository";
import {ActivityKind, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { MovieLibraryRepository } = await import("./movie-library.repository");
const { MovieLibraryService } = await import("./movie-library.service");
const { MovieStatsRepository } = await import("./movie-stats.repository");


describe("movie library service", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 42,
            name: "movie-owner",
            email: "movie-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.catalogItem).values({
            id: 1000,
            kind: MediaType.MOVIES,
            primaryProvider: "tmdb",
            primaryExternalId: "777",
            name: "Movie",
            imageCover: "movie.jpg",
        });
        await db.insert(schema.movieDetails).values({ catalogItemId: 1000, durationMinutes: 100 });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps status, watch count, stats, activity and history in one movie transition", async () => {
        const library = new MovieLibraryService(new MovieLibraryRepository());
        const added = await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        expect(added.progress).toEqual({ status: Status.COMPLETED, watchCount: 1 });

        const rewatched = await library.replaceRewatches({ userId: 42, catalogItemId: 1000, rewatchCount: 2 });
        expect(rewatched.progress).toEqual({ status: Status.COMPLETED, watchCount: 3 });
        await library.updateRating({ userId: 42, catalogItemId: 1000, rating: 9 });

        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({
                kind: MediaType.MOVIES,
                timeSpentMinutes: 300,
                totalEntries: 1,
                totalRedo: 2,
                totalSpecific: 3,
                entriesRated: 1,
                ratingSum: 9,
            }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 3, completed: true, redo: true }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toEqual([
            expect.objectContaining({ updateType: UpdateType.STATUS, payload: { oldValue: null, newValue: Status.COMPLETED } }),
            expect.objectContaining({ updateType: UpdateType.REDO, payload: { oldValue: 0, newValue: 2 } }),
        ]);

        const planned = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.PLAN_TO_WATCH });
        expect(planned.progress).toEqual({ status: Status.PLAN_TO_WATCH, watchCount: 0 });
        expect(await db.select().from(schema.libraryStats).where(eq(schema.libraryStats.userId, 42))).toEqual([
            expect.objectContaining({ timeSpentMinutes: 0, totalRedo: 0, totalSpecific: 0 }),
        ]);
    });

    it("normalizes imported stale totals from the movie's status and redo count", async () => {
        const library = new MovieLibraryService(new MovieLibraryRepository());
        const imported = await library.importEntry({
            userId: 42,
            catalogItemId: 1000,
            status: Status.COMPLETED,
            rewatchCount: 7,
            rating: 8,
        });

        expect(imported.progress).toEqual({ status: Status.COMPLETED, watchCount: 8 });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ totalRedo: 7, totalSpecific: 8, timeSpentMinutes: 800 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([]);
        expect(await db.select().from(schema.libraryChange)).toEqual([]);
    });

    it("serves normalized movie activity and advanced statistics through explicit scopes", async () => {
        await db.update(schema.catalogItem).set({ releaseDate: "2024-04-05" }).where(eq(schema.catalogItem.id, 1000));
        await db.update(schema.movieDetails).set({
            originalLanguage: "en",
            budget: 50,
            revenue: 125,
            directorName: "Director",
        }).where(eq(schema.movieDetails.catalogItemId, 1000));
        await db.insert(schema.movieActor).values({ catalogItemId: 1000, name: "Actor" });
        await db.insert(schema.catalogGenre).values({ name: "Drama" });
        const genre = db.select().from(schema.catalogGenre).get();
        await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: genre!.id });

        const repository = new MovieLibraryRepository();
        const library = new MovieLibraryService(repository);
        const entry = await library.importEntry({
            userId: 42,
            catalogItemId: 1000,
            status: Status.COMPLETED,
            rewatchCount: 1,
            rating: 8,
            comment: "Good",
            favorite: true,
        });
        await repository.editTag({
            userId: 42,
            action: TagAction.ADD,
            name: "comfort",
            libraryEntryId: entry.id,
        });
        await library.replaceRewatches({ userId: 42, catalogItemId: 1000, rewatchCount: 2, loggedAt: "2026-06-02" });
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 4 });

        const access = { ownerId: 42, actorId: 42, reason: "owner", mediaTypeEnabled: true } as const;
        const activity = ActivityRepository;
        expect(await activity.getStatsActivities(access, [MediaType.MOVIES], "2026-06")).toEqual([
            { mediaId: 1000, mediaType: MediaType.MOVIES, specificGained: 1 },
        ]);
        expect(await activity.getPaginatedActivities(access, {
            timeBucket: "2026-06",
            activityKind: ActivityKind.REDO,
            mediaIdsByType: { [MediaType.MOVIES]: [1000] },
        })).toMatchObject({
            total: 1,
            items: [expect.objectContaining({ mediaId: 1000, isRedo: true })],
        });
        expect(await activity.getActivityStatsByMonth({ userId: 42, startMonth: "2026-01" })).toEqual([
            { mediaId: 1000, mediaType: MediaType.MOVIES, monthBucket: "2026-06", specificGained: 1 },
        ]);

        const stats = MovieStatsRepository;
        const scope = { type: "library", access } as const;
        expect(await stats.getAggregatedMediaStats(scope)).toMatchObject({
            totalEntries: 1,
            totalRedo: 2,
            totalSpecific: 3,
            timeSpentHours: 5,
            totalRated: 1,
            avgRated: 8,
        });
        expect(await stats.getAdvancedMediaStats(scope, 8)).toMatchObject({
            totalTags: 1,
            avgDuration: 100,
            durationDistrib: [{ name: "90", value: 1 }],
            totalBudget: 50,
            totalRevenue: 125,
            releaseDates: [{ name: 2020, value: 1 }],
            genresStats: [],
            actorsStats: [],
            directorsStats: [],
            langsStats: [],
            ratings: expect.arrayContaining([{ name: "8.0", value: 1 }]),
        });
    });
});
