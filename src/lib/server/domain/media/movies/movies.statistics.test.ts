import Database from "bun:sqlite";
import {MediaType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {movies, moviesActors, moviesGenre, moviesList, moviesTags, user, userMediaSettings} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {type BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { createMoviesStatistics } = await import("@/lib/server/domain/media/movies/movies.statistics");


describe("MoviesStatistics", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await seedStatisticsData(db);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("computes the pre-computed totals owned by the statistics component", async () => {
        const stats = (await createMoviesStatistics().computeAllUsersStats())
            .find(({ userId }) => userId === 1);

        expect(stats).toMatchObject({
            userId: 1,
            timeSpent: 480,
            totalRedo: 1,
            totalEntries: 3,
            entriesRated: 2,
            totalSpecific: 4,
            averageRating: 7,
            sumEntriesRated: 14,
            entriesFavorites: 1,
            entriesCommented: 1,
            statusCounts: {
                [Status.COMPLETED]: 3,
            },
        });
    });

    it("combines common and movie-specific advanced statistics", async () => {
        const stats = await createMoviesStatistics().calculateAdvancedMediaStats(7, 1);

        expect(stats.totalTags).toBe(1);
        expect(stats.avgDuration).toBe(120);
        expect(stats.totalBudget).toBe(60);
        expect(stats.totalRevenue).toBe(120);
        expect(stats.ratings.find(({ name }) => name === "6.0")?.value).toBe(1);
        expect(stats.ratings.find(({ name }) => name === "8.0")?.value).toBe(1);
        expect(stats.releaseDates).toEqual([
            { start: 1990, endExclusive: 2000, value: 1 },
            { start: 2000, endExclusive: 2010, value: 2 },
        ]);
        expect(stats.durationDistrib).toEqual([
            { start: 90, endExclusive: 120, value: 1 },
            { start: 120, endExclusive: 150, value: 1 },
            { start: 150, endExclusive: 180, value: 1 },
        ]);
        expect(stats.genresStats[0]).toMatchObject({ name: "Drama" });
        expect(stats.actorsStats[0]).toMatchObject({ name: "Shared Actor" });
        expect(stats.directorsStats[0]).toMatchObject({ name: "Shared Director" });
        expect(stats.langsStats[0]).toMatchObject({ name: "en" });
    });

    it("excludes inactive movie lists from platform statistics", async () => {
        const stats = await createMoviesStatistics().calculateAdvancedMediaStats(7);

        expect(stats.totalTags).toBe(1);
        expect(stats.avgDuration).toBe(120);
        expect(stats.totalBudget).toBe(60);
        expect(stats.totalRevenue).toBe(120);
        expect(stats.ratings.find(({ name }) => name === "10.0")?.value).toBe(0);
        expect(stats.releaseDates).toEqual([
            { start: 1990, endExclusive: 2000, value: 1 },
            { start: 2000, endExclusive: 2010, value: 2 },
        ]);
        expect(stats.durationDistrib).toEqual([
            { start: 90, endExclusive: 120, value: 1 },
            { start: 120, endExclusive: 150, value: 1 },
            { start: 150, endExclusive: 180, value: 1 },
        ]);
        expect(stats.genresStats.some(({ name }) => name === "Hidden Genre")).toBe(false);
        expect(stats.actorsStats.some(({ name }) => name === "Hidden Actor")).toBe(false);
        expect(stats.directorsStats.some(({ name }) => name === "Hidden Director")).toBe(false);
        expect(stats.langsStats.some(({ name }) => name === "fr")).toBe(false);
    });
});


async function seedStatisticsData(db: BunSQLiteDatabase<typeof schema>) {
    await db.insert(user).values({
        id: 1,
        name: "stats-user",
        email: "stats@example.com",
        emailVerified: true,
        createdAt: "2026-01-01 00:00:00",
        updatedAt: "2026-01-01 00:00:00",
    });
    await db.insert(user).values({
        id: 2,
        name: "inactive-stats-user",
        email: "inactive-stats@example.com",
        emailVerified: true,
        createdAt: "2026-01-01 00:00:00",
        updatedAt: "2026-01-01 00:00:00",
    });
    await db.insert(userMediaSettings).values([
        { userId: 1, mediaType: MediaType.MOVIES, active: true },
        { userId: 2, mediaType: MediaType.MOVIES, active: false },
    ]);

    await db.insert(movies).values([
        movieRow(1, "First", "1999-01-01", 120, 10, 20),
        movieRow(2, "Second", "2005-01-01", 90, 20, 40),
        movieRow(3, "Third", "2008-01-01", 150, 30, 60),
        {
            ...movieRow(4, "Hidden", "2015-01-01", 300, 1000, 2000),
            originalLanguage: "fr",
            directorName: "Hidden Director",
        },
    ]);

    await db.insert(moviesList).values([
        { id: 1, userId: 1, mediaId: 1, status: Status.COMPLETED, total: 2, redo: 1, rating: 8, favorite: true, comment: "Great" },
        { id: 2, userId: 1, mediaId: 2, status: Status.COMPLETED, total: 1, redo: 0, rating: 6 },
        { id: 3, userId: 1, mediaId: 3, status: Status.COMPLETED, total: 1, redo: 0 },
        { id: 4, userId: 2, mediaId: 4, status: Status.COMPLETED, total: 1, redo: 0, rating: 10 },
    ]);

    await db.insert(moviesGenre).values([
        ...[1, 2, 3].map((mediaId) => ({ id: mediaId, mediaId, name: "Drama" })),
        { id: 4, mediaId: 4, name: "Hidden Genre" },
    ]);
    await db.insert(moviesActors).values([
        ...[1, 2, 3].map((mediaId) => ({ id: mediaId, mediaId, name: "Shared Actor" })),
        { id: 4, mediaId: 4, name: "Hidden Actor" },
    ]);
    await db.insert(moviesTags).values([
        { id: 1, userId: 1, mediaId: 1, name: "favorite" },
        { id: 2, userId: 1, mediaId: 2, name: "favorite" },
        { id: 3, userId: 2, mediaId: 4, name: "hidden" },
    ]);
}


function movieRow(id: number, name: string, releaseDate: string, duration: number, budget: number, revenue: number) {
    return {
        id,
        name,
        releaseDate,
        duration,
        budget,
        revenue,
        apiId: id,
        imageCover: `${name}.jpg`,
        originalLanguage: "en",
        directorName: "Shared Director",
    };
}
