import {eq, getTableName, sql} from "drizzle-orm";
import Database from "bun:sqlite";
import {MediaType, Status} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
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


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


const { createTvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");
const { createTvService } = await import("@/lib/server/domain/media/tv/tv.service");
const { createMediaIngestionService } = await import("@/lib/server/api-providers/media-ingestion.service");


const completedSeriesStatusCounts = () => Object.fromEntries(
    getMediaDefinition(MediaType.SERIES).statuses.map((status) => [status, status === Status.COMPLETED ? 1 : 0]),
) as Record<Status, number>;


describe.each([seriesServerDefinition, animeServerDefinition])("$identity.mediaType finale notifications", definition => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    const { mediaTable, listTable, epsPerSeasonTable } = definition.repository.tables;
    const repository = createTvRepository(definition);
    const notifications = new NotificationsService(NotificationsRepository);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(user).values({
            id: 1, name: "finale-user", email: "finale@example.com", emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }).run();
        db.insert(mediaTable).values({
            id: 1, apiId: 1, name: "Uneven seasons", duration: 30, imageCover: "show.jpg",
            totalSeasons: 2, totalEpisodes: 18, nextEpisodeToAir: sql`date('now')`,
        }).run();
        db.insert(epsPerSeasonTable).values([
            { mediaId: 1, season: 1, episodes: 10 },
            { mediaId: 1, season: 2, episodes: 8 },
        ]).run();
        db.insert(listTable).values({
            userId: 1, mediaId: 1, status: Status.WATCHING, currentSeason: 1, currentEpisode: 1,
        }).run();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each([
        { season: 2, episode: 8, lastEpisode: 8, isSeasonFinale: true },
        { season: 2, episode: 7, lastEpisode: 8, isSeasonFinale: false },
        { season: 1, episode: 10, lastEpisode: 10, isSeasonFinale: true },
        { season: 3, episode: 10, lastEpisode: null, isSeasonFinale: false },
        { season: null, episode: null, lastEpisode: null, isSeasonFinale: false },
    ])("uses season $season episode $episode for the finale flag", async ({ season, episode, lastEpisode, isSeasonFinale }) => {
        db.update(mediaTable).set({ seasonToAir: season, episodeToAir: episode }).where(eq(mediaTable.id, 1)).run();

        const upcoming = await repository.getUpcomingMedia(undefined, true);
        expect(upcoming).toEqual([expect.objectContaining({ mediaId: 1, seasonToAir: season, episodeToAir: episode, lastEpisode })]);

        await notifications.createMediaNotifications(definition.identity.mediaType, upcoming);
        expect(db.select().from(schema.mediaNotifications).all()).toEqual([
            expect.objectContaining({ mediaId: 1, season, episode, isSeasonFinale }),
        ]);
    });
});


describe("TvRepository season refresh", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    let repository: ReturnType<typeof createTvRepository>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        repository = createTvRepository(seriesServerDefinition);

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

    it("rolls back metadata, user progress, and season replacement when ingestion fails", async () => {
        db.insert(user).values({
            id: 42, name: "refresh-user", email: "refresh@example.com", emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }).run();
        db.insert(seriesList).values({
            userId: 42, mediaId: 100, status: Status.COMPLETED,
            currentSeason: 2, currentEpisode: 8, redo: 0, total: 16,
        }).run();
        const beforeMedia = db.select().from(series).all();
        const beforeList = db.select().from(seriesList).all();
        const beforeSeasons = db.select().from(seriesEpisodesPerSeason).all();
        sqlite.exec(`CREATE TRIGGER fail_seasons BEFORE INSERT ON ${getTableName(seriesEpisodesPerSeason)}
            BEGIN SELECT RAISE(ABORT, 'season failure'); END`);

        const ingestion = createMediaIngestionService({
            repository,
            provider: {
                search: vi.fn(),
                getDetails: async () => {
                    expect(sqlite.inTransaction).toBe(false);
                    await Promise.resolve();
                    return {
                        mediaData: { ...beforeMedia[0], name: "Updated title", totalSeasons: 3 },
                        seasonsData: [
                            { season: 1, episodes: 8 },
                            { season: 2, episodes: 8 },
                            { season: 3, episodes: 10 },
                        ],
                    };
                },
            },
        });

        await expect(ingestion.refreshFromExternal(1000)).rejects.toThrow();
        expect(db.select().from(series).all()).toEqual(beforeMedia);
        expect(db.select().from(seriesList).all()).toEqual(beforeList);
        expect(db.select().from(seriesEpisodesPerSeason).all()).toEqual(beforeSeasons);
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
                redo: 1,
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
                redo: 0,
                total: 16,
                lastUpdated: "2026-02-01 00:00:00",
            },
            {
                userId: 44,
                mediaId: 100,
                status: Status.COMPLETED,
                currentSeason: 2,
                currentEpisode: 7,
                redo: 0,
                total: 15,
                lastUpdated: "2026-02-01 00:00:00",
            },
        ]);

        for (const row of db.select().from(seriesList).all()) {
            db.insert(schema.seriesListSeasons).values(repository.getMediaEpsPerSeason(row.mediaId).map((s, index) => ({
                listId: row.id, season: s.season, redo: index === 0 ? row.redo : 0, rating: row.rating,
            }))).run();
        }

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
            redo: 1,
            total: 24,
            rating: 8,
            lastUpdated: "2026-02-01 00:00:00",
        });
        expect(listRows[1].status).toBe(Status.COMPLETED);
        expect(listRows[2].status).toBe(Status.COMPLETED);

        const settings = await db.select().from(userMediaSettings).orderBy(userMediaSettings.userId);
        expect(settings[0].statusCounts).toMatchObject({ [Status.COMPLETED]: 0, [Status.ON_HOLD]: 1 });
        for (const setting of settings.slice(1)) {
            expect(setting.statusCounts).toMatchObject({ [Status.COMPLETED]: 1, [Status.ON_HOLD]: 0 });
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
            redo: 0,
            total: 16,
        });

        for (const row of db.select().from(seriesList).all()) {
            db.insert(schema.seriesListSeasons).values(repository.getMediaEpsPerSeason(row.mediaId).map((s, index) => ({
                listId: row.id, season: s.season, redo: index === 0 ? row.redo : 0, rating: row.rating,
            }))).run();
        }

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
                redo: 2,
                total: 32,
            },
            {
                userId: 42,
                mediaId: 101,
                status: Status.COMPLETED,
                currentSeason: 3,
                currentEpisode: 8,
                redo: 3,
                total: 48,
            },
        ]);

        const service = createTvService(repository, seriesServerDefinition);
        const result = await service.getMediaList(undefined, 42, { sorting: "Re-watched" });

        expect(result.items.map((item) => item.mediaId)).toEqual([101, 100]);
    });
});
