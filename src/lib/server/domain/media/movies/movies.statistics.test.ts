import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Status} from "@/lib/utils/enums";
import {movies, moviesActors, moviesGenre, moviesList, moviesTags, user} from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const {createMoviesStatistics} = await import("@/lib/server/domain/media/movies/movies.statistics");


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
        const [stats] = await createMoviesStatistics().computeAllUsersStats();

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
            { name: 1990, value: 1 },
            { name: 2000, value: 2 },
        ]);
        expect(stats.durationDistrib).toEqual([
            { name: "90", value: 1 },
            { name: "120", value: 1 },
            { name: "150", value: 1 },
        ]);
        expect(stats.genresStats[0]).toMatchObject({ name: "Drama" });
        expect(stats.actorsStats[0]).toMatchObject({ name: "Shared Actor" });
        expect(stats.directorsStats[0]).toMatchObject({ name: "Shared Director" });
        expect(stats.langsStats[0]).toMatchObject({ name: "en" });
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

    await db.insert(movies).values([
        movieRow(1, "First", "1999-01-01", 120, 10, 20),
        movieRow(2, "Second", "2005-01-01", 90, 20, 40),
        movieRow(3, "Third", "2008-01-01", 150, 30, 60),
    ]);

    await db.insert(moviesList).values([
        { id: 1, userId: 1, mediaId: 1, status: Status.COMPLETED, total: 2, redo: 1, rating: 8, favorite: true, comment: "Great" },
        { id: 2, userId: 1, mediaId: 2, status: Status.COMPLETED, total: 1, redo: 0, rating: 6 },
        { id: 3, userId: 1, mediaId: 3, status: Status.COMPLETED, total: 1, redo: 0 },
    ]);

    await db.insert(moviesGenre).values([1, 2, 3].map((mediaId) => ({ id: mediaId, mediaId, name: "Drama" })));
    await db.insert(moviesActors).values([1, 2, 3].map((mediaId) => ({ id: mediaId, mediaId, name: "Shared Actor" })));
    await db.insert(moviesTags).values([
        { id: 1, userId: 1, mediaId: 1, name: "favorite" },
        { id: 2, userId: 1, mediaId: 2, name: "favorite" },
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
