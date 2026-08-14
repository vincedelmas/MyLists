import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import {MediaType, Status} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {
    series,
    seriesEpisodesPerSeason,
    seriesList,
    user,
    userMediaMonthlyActivity,
    userMediaSettings,
    userMediaUpdate,
} from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");


const completedSeriesStatusCounts = () => Object.fromEntries(
    statusUtils.byMediaType(MediaType.SERIES).map((status) => [status, status === Status.COMPLETED ? 1 : 0]),
) as Record<Status, number>;


describe("TvRepository season refresh", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    let repository: InstanceType<typeof TvRepository>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        repository = new TvRepository(seriesServerDefinition);

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(series).values({
            id: 100,
            apiId: 1000,
            name: "Returning Series",
            duration: 45,
            totalSeasons: 2,
            totalEpisodes: 16,
            imageCover: "series.jpg",
        });
        await db.insert(seriesEpisodesPerSeason).values([
            { mediaId: 100, season: 1, episodes: 8 },
            { mediaId: 100, season: 2, episodes: 8 },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("moves caught-up users to On Hold when enabled and preserves their progress metadata", async () => {
        await db.insert(user).values([
            {
                id: 42,
                emailVerified: true,
                name: "enabled-user",
                email: "enabled@example.com",
                createdAt: "2026-01-01 00:00:00",
                updatedAt: "2026-01-01 00:00:00",
            },
            {
                id: 43,
                emailVerified: true,
                name: "disabled-user",
                email: "disabled@example.com",
                createdAt: "2026-01-01 00:00:00",
                updatedAt: "2026-01-01 00:00:00",
                autoMoveCompletedTvToOnHold: false,
            },
            {
                id: 44,
                emailVerified: true,
                name: "not-caught-up-user",
                email: "not-caught-up@example.com",
                createdAt: "2026-01-01 00:00:00",
                updatedAt: "2026-01-01 00:00:00",
            },
        ]);
        await db.insert(userMediaSettings).values([42, 43, 44].map((userId) => ({
            userId,
            active: true,
            mediaType: MediaType.SERIES,
            totalEntries: 1,
            statusCounts: completedSeriesStatusCounts(),
        })));
        await db.insert(seriesList).values([
            {
                userId: 42,
                mediaId: 100,
                status: Status.COMPLETED,
                currentSeason: 2,
                currentEpisode: 8,
                redo: [1, 0],
                total: 24,
                rating: 8,
                lastUpdated: "2026-02-01 00:00:00",
            },
            {
                userId: 43,
                mediaId: 100,
                status: Status.COMPLETED,
                currentSeason: 2,
                currentEpisode: 8,
                redo: [0, 0],
                total: 16,
                lastUpdated: "2026-02-01 00:00:00",
            },
            {
                userId: 44,
                mediaId: 100,
                status: Status.COMPLETED,
                currentSeason: 2,
                currentEpisode: 7,
                redo: [0, 0],
                total: 15,
                lastUpdated: "2026-02-01 00:00:00",
            },
        ]);

        await repository.updateMediaWithDetails({
            mediaData: {
                apiId: 1000,
                name: "Returning Series",
                duration: 45,
                totalSeasons: 3,
                totalEpisodes: 26,
                imageCover: "series.jpg",
            },
            seasonsData: [
                { season: 1, episodes: 8 },
                { season: 2, episodes: 8 },
                { season: 3, episodes: 10 },
            ],
        });

        const listRows = await db.select().from(seriesList).orderBy(seriesList.userId);
        expect(listRows[0]).toMatchObject({
            userId: 42,
            status: Status.ON_HOLD,
            currentSeason: 2,
            currentEpisode: 8,
            redo: [1, 0, 0],
            total: 24,
            rating: 8,
            lastUpdated: "2026-02-01 00:00:00",
        });
        expect(listRows[1].status).toBe(Status.COMPLETED);
        expect(listRows[2].status).toBe(Status.COMPLETED);

        const settings = await db.select().from(userMediaSettings).orderBy(userMediaSettings.userId);
        for (const setting of settings) {
            expect(setting.statusCounts).toMatchObject({
                [Status.COMPLETED]: 1,
                [Status.ON_HOLD]: 0,
            });
        }
        await expect(db.select().from(userMediaUpdate)).resolves.toEqual([]);
        await expect(db.select().from(userMediaMonthlyActivity)).resolves.toEqual([]);
    });

    it("does not move completed users when only episode counts change", async () => {
        await db.insert(user).values({
            id: 42,
            emailVerified: true,
            name: "episode-correction-user",
            email: "episode-correction@example.com",
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(userMediaSettings).values({
            userId: 42,
            active: true,
            mediaType: MediaType.SERIES,
            totalEntries: 1,
            statusCounts: completedSeriesStatusCounts(),
        });
        await db.insert(seriesList).values({
            userId: 42,
            mediaId: 100,
            status: Status.COMPLETED,
            currentSeason: 2,
            currentEpisode: 8,
            redo: [0, 0],
            total: 16,
        });

        await repository.updateMediaWithDetails({
            mediaData: {
                apiId: 1000,
                name: "Returning Series",
                duration: 45,
                totalSeasons: 2,
                totalEpisodes: 18,
                imageCover: "series.jpg",
            },
            seasonsData: [
                { season: 1, episodes: 10 },
                { season: 2, episodes: 8 },
            ],
        });

        const listRow = await db.select().from(seriesList).where(eq(seriesList.userId, 42)).get();
        expect(listRow?.status).toBe(Status.COMPLETED);
    });

    it("sorts re-watched series by the sum of their seasonal counts", async () => {
        await db.insert(user).values({
            id: 42,
            emailVerified: true,
            name: "sort-user",
            email: "sort@example.com",
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(series).values({
            id: 101,
            apiId: 1001,
            name: "More Rewatched Series",
            duration: 45,
            totalSeasons: 3,
            totalEpisodes: 24,
            imageCover: "series-2.jpg",
        });
        await db.insert(seriesEpisodesPerSeason).values([
            { mediaId: 101, season: 1, episodes: 8 },
            { mediaId: 101, season: 2, episodes: 8 },
            { mediaId: 101, season: 3, episodes: 8 },
        ]);
        await db.insert(seriesList).values([
            {
                userId: 42,
                mediaId: 100,
                status: Status.COMPLETED,
                currentSeason: 2,
                currentEpisode: 8,
                redo: [2, 0],
                total: 32,
            },
            {
                userId: 42,
                mediaId: 101,
                status: Status.COMPLETED,
                currentSeason: 3,
                currentEpisode: 8,
                redo: [1, 1, 1],
                total: 48,
            },
        ]);

        const result = await repository.getMediaList(undefined, 42, { sorting: "Re-watched" });

        expect(result.items.map((item) => item.mediaId)).toEqual([101, 100]);
    });
});
