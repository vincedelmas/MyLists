import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, movies, moviesList, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: <T>(action: () => T) => action(),
}));


const { ImportService } = await import("@/lib/server/domain/imports/import.service");
const { createMoviesService } = await import("@/lib/server/domain/media/movies/movies.service");
const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");
const { createMoviesMatcher } = await import("@/lib/server/domain/media/movies/movies.matcher");
const { createMoviesRepository } = await import("@/lib/server/domain/media/movies/movies.repository");
const { ImportJobProcessor } = await import("@/lib/server/domain/imports/import-job.processor");
const { MediaMatcherRegistry } = await import("@/lib/server/domain/imports/matchers/media-matcher.registry");
const { createMoviesIngestionService } = await import("@/lib/server/api-providers/tmdb-movies.provider");


describe("movies import processing", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        MediaMatcherRegistry.clear();

        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(user).values({
            id: 42,
            emailVerified: true,
            name: "import-user",
            email: "import-user@example.com",
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
        });
        await db.insert(movies).values({
            id: 100,
            apiId: 550,
            duration: 139,
            name: "Fight Club",
            imageCover: "fight-club.jpg",
            releaseDate: "1999-10-15",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("imports IMDb ratings before watchlist by resolving IMDb IDs to local movies and preserves existing entries", async () => {
        await db.insert(movies).values({
            id: 101, apiId: 680, duration: 154, name: "Pulp Fiction", imageCover: "pulp-fiction.jpg", releaseDate: "1994-09-10",
        });
        const importService = new ImportService(ImportRepository);
        const search = vi.fn();
        const imdbMovieIds = new Map([["tt0137523", [550]], ["tt0110912", [680]]]);
        const provider = {
            search,
            getDetails: vi.fn(),
            findMovieIdsByImdbId: vi.fn(async (imdbId: string) => imdbMovieIds.get(imdbId)!),
        };
        const repository = createMoviesRepository();
        MediaMatcherRegistry.register(MediaType.MOVIES, createMoviesMatcher(
            createMoviesService(repository), provider, createMoviesIngestionService(repository, provider),
        ));
        const processor = new ImportJobProcessor(importService, MediaMatcherRegistry);
        const ratings = await importService.createImportJob(42, ImportSource.IMDB, [
            "Const,Title,Year,Title Type,Your Rating,Date Rated,IMDb Rating",
            "tt0137523,Fight Club,1999,Movie,7,2024-01-01,8.8",
            "tt0903747,Breaking Bad,2008,TV Series,9,2024-01-01,9.5",
            "tt0110912,Pulp Fiction,1994,Movie,99,2024-01-01,8.9",
        ].join("\n"), "ratings");
        expect(ratings).toMatchObject({ totalCount: 3, processedCount: 2, skippedCount: 1, failedCount: 1 });
        await expect(processor.processNextJob()).resolves.toMatchObject({
            id: ratings.id, status: ImportJobStatus.COMPLETED_WITH_ERRORS,
            processedCount: 3, completedCount: 1, skippedCount: 1, failedCount: 1,
        });
        const issues = await db.select().from(importItems).where(eq(importItems.jobId, ratings.id)).orderBy(importItems.rowNumber);
        expect(issues[1]).toMatchObject({ status: ImportItemStatus.SKIPPED, mediaType: null, matchedMediaId: null });
        expect(issues[1].statusReason).toContain("TV Series");
        expect(issues[2].status).toBe(ImportItemStatus.FAILED);

        const watchlist = await importService.createImportJob(42, ImportSource.IMDB, [
            "Position,Created,Const,Title,Year,Title Type,Your Rating",
            "1,2024-01-01,tt0137523,Fight Club,1999,Movie,10",
            "2,2024-01-01,tt0110912,Pulp Fiction,1994,Movie,8",
        ].join("\n"), "watchlist");
        await expect(processor.processNextJob()).resolves.toMatchObject({
            id: watchlist.id, status: ImportJobStatus.COMPLETED, processedCount: 2, completedCount: 2,
        });
        expect(await db.select().from(moviesList).where(eq(moviesList.userId, 42)).orderBy(moviesList.mediaId)).toMatchObject([
            { mediaId: 100, rating: 7, status: Status.COMPLETED, total: 1, redo: 0 },
            { mediaId: 101, rating: null, status: Status.PLAN_TO_WATCH, total: 0, redo: 0 },
        ]);
        expect(search).not.toHaveBeenCalled();
        expect(provider.findMovieIdsByImdbId.mock.calls).toEqual([["tt0137523"], ["tt0137523"], ["tt0110912"]]);
        expect(provider.getDetails).not.toHaveBeenCalled();
    });

    it("imports Letterboxd ratings, watched films, and watchlist in order while preserving existing entries", async () => {
        await db.insert(movies).values([
            { id: 101, apiId: 680, duration: 154, name: "Pulp Fiction", imageCover: "pulp-fiction.jpg", releaseDate: "1994-09-10" },
            { id: 102, apiId: 603, duration: 136, name: "The Matrix", imageCover: "matrix.jpg", releaseDate: "1999-03-31" },
        ]);
        const importService = new ImportService(ImportRepository);
        const search = vi.fn();
        MediaMatcherRegistry.register(MediaType.MOVIES, createMoviesMatcher(
            createMoviesService(createMoviesRepository()),
            { search } as any,
            { storeFromExternal: vi.fn() } as any,
        ));
        const processor = new ImportJobProcessor(importService, MediaMatcherRegistry);
        const headers = "Date,Name,Year,Letterboxd URI";
        const fightClub = "2024-01-01,Fight Club,1999,https://boxd.it/2a9q";

        for (const [type, csv] of [
            ["ratings", `${headers},Rating\n${fightClub},3.5`],
            ["watched", `${headers}\n${fightClub}\n2024-01-01,Pulp Fiction,1994,https://boxd.it/29Pq`],
            ["watchlist", `${headers}\n${fightClub}\n2024-01-01,The Matrix,1999,https://boxd.it/2a1m`],
            ["ratings", `${headers},Rating\n${fightClub},5`],
        ] as const) {
            const job = await importService.createImportJob(42, ImportSource.LETTERBOXD, csv, type);
            expect(job.status).toBe(ImportJobStatus.QUEUED);
            await expect(processor.processNextJob()).resolves.toMatchObject({
                id: job.id, status: ImportJobStatus.COMPLETED, failedCount: 0, skippedCount: 0,
            });
        }

        expect(search).not.toHaveBeenCalled();
        const list = await db.select().from(moviesList).where(eq(moviesList.userId, 42)).orderBy(moviesList.mediaId);
        expect(list).toMatchObject([
            { mediaId: 100, status: Status.COMPLETED, rating: 7, redo: 0, total: 1 },
            { mediaId: 101, status: Status.COMPLETED, rating: null, redo: 0, total: 1 },
            { mediaId: 102, status: Status.PLAN_TO_WATCH, rating: null, redo: 0, total: 0 },
        ]);
    });

});
