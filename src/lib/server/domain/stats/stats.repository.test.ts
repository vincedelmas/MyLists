import Database from "bun:sqlite";
import {and, eq, getTableName} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {withTransaction} from "@/lib/server/database/async-storage";
import {createMoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {createMoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {createMoviesStatistics} from "@/lib/server/domain/media/movies/movies.statistics";
import {MediaTrackingService} from "@/lib/server/domain/tracking/media-tracking.service";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";
import {MonthlyActivityRepository} from "@/lib/server/domain/tracking/monthly-activity.repository";
import {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";

import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import type {MediaMonthlyActivityRegistry, MediaServiceRegistry, MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("precomputed media statistics", () => {
    let sqlite: Database;
    let repository: ReturnType<typeof createMoviesRepository>;
    let service: ReturnType<typeof createMoviesService>;
    let tracking: MediaTrackingService;
    let statsService: StatsService;
    const action = { userId: 1, mediaId: 1, mediaType: MediaType.MOVIES };

    const settingsFor = (userId = 1) => dbContext.db.select().from(schema.userMediaSettings).where(and(
        eq(schema.userMediaSettings.userId, userId),
        eq(schema.userMediaSettings.mediaType, MediaType.MOVIES),
    )).get()!;

    const snapshot = () => ({
        movies: dbContext.db.select().from(schema.moviesList).all(),
        settings: dbContext.db.select().from(schema.userMediaSettings).all(),
        statsHistory: dbContext.db.select().from(schema.userMediaStatsHistory).all(),
        activity: dbContext.db.select().from(schema.userMediaMonthlyActivity).all(),
        updates: dbContext.db.select().from(schema.userMediaUpdate).all(),
    });

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values([1, 2, 3].map(id => ({
            id, name: `duration-user-${id}`, email: `duration-${id}@example.com`, emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }))).run();
        db.insert(schema.userMediaSettings).values([1, 2, 3].map(userId => ({
            userId, mediaType: MediaType.MOVIES, active: userId !== 2,
        }))).run();
        db.insert(schema.movies).values([
            { id: 1, apiId: 1, name: "Corrected movie", duration: 90, imageCover: "movie.jpg" },
            { id: 2, apiId: 2, name: "Other movie", duration: 60, imageCover: "other.jpg" },
        ]).run();

        repository = createMoviesRepository();
        service = createMoviesService(repository);
        const monthlyActivity = createMediaMonthlyActivity({ definition: moviesServerDefinition, repository });
        const activityService = new MonthlyActivityService(MonthlyActivityRepository, { get: () => monthlyActivity } as MediaMonthlyActivityRegistry);
        statsService = new StatsService(StatsRepository, activityService, AchievementsRepository, UpdateHistoryRepository, {
            get: () => ({ computeTotalTags: () => 0 }),
        } as unknown as MediaStatsRegistry);
        tracking = new MediaTrackingService(
            statsService,
            activityService,
            new UpdateHistoryService(UpdateHistoryRepository),
            new NotificationsService(NotificationsRepository),
            { get: () => service } as MediaServiceRegistry,
        );
    });

    afterEach(() => sqlite.close());

it("clamps time until maintenance without changing other users or media types", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.addMediaToList({ ...action, mediaId: 2, status: Status.COMPLETED });
        tracking.updateUserMedia({ ...action, mediaId: 2, payload: { type: UpdateType.REDO, redo: 2 } });
        tracking.addMediaToList({ ...action, userId: 2, status: Status.COMPLETED });
        tracking.addMediaToList({ ...action, userId: 3, status: Status.PLANNED });
        dbContext.db.insert(schema.userMediaSettings).values({
            userId: 1, mediaType: MediaType.BOOKS, active: true, timeSpent: 170,
        }).run();
        const beforeOtherUser = settingsFor(2);

        await service.updateMediaEditableFields(1, { duration: 360 });
        expect(settingsFor().timeSpent).toBe(270);

        tracking.removeMediaFromList(action);

        expect(settingsFor()).toMatchObject({ timeSpent: 0, totalEntries: 1, totalSpecific: 3, totalRedo: 2 });
        expect(settingsFor(2)).toEqual(beforeOtherUser);
        expect(settingsFor(3).timeSpent).toBe(0);
        expect(dbContext.db.select().from(schema.userMediaSettings)
            .where(eq(schema.userMediaSettings.mediaType, MediaType.BOOKS)).get()?.timeSpent).toBe(170);
        expect(dbContext.db.select().from(schema.userMediaStatsHistory).all().at(-1)).toMatchObject({
            userId: 1, mediaId: 1, timeSpent: 0, totalEntries: 1, totalSpecific: 3, totalRedo: 2,
        });

        const beforeHistory = snapshot().statsHistory;
        withTransaction(() => StatsRepository.updateAllUsersPreComputedStats(MediaType.MOVIES, createMoviesStatistics().computeAllUsersStats()));

        expect(settingsFor().timeSpent).toBe(180);
        expect(snapshot().statsHistory).toEqual(beforeHistory);
    });

    it("excludes planned entries from profile and platform rating coverage", async () => {
        for (const setting of [
            { userId: 1, totalEntries: 4, entriesRated: 1, sumEntriesRated: 8, statusCounts: { [Status.PLANNED]: 2, [Status.COMPLETED]: 2 } },
            { userId: 2, totalEntries: 20, entriesRated: 20, sumEntriesRated: 140, statusCounts: { [Status.COMPLETED]: 20 } },
            { userId: 3, totalEntries: 3, entriesRated: 2, sumEntriesRated: 14, statusCounts: { [Status.PLANNED]: 1, [Status.COMPLETED]: 2 } },
        ]) {
            dbContext.db.update(schema.userMediaSettings).set({ ...setting, statusCounts: setting.statusCounts as Record<Status, number> })
                .where(and(eq(schema.userMediaSettings.userId, setting.userId), eq(schema.userMediaSettings.mediaType, MediaType.MOVIES))).run();
        }
        dbContext.db.insert(schema.userMediaSettings).values({
            userId: 1, mediaType: MediaType.BOOKS, active: true, totalEntries: 3, entriesRated: 1, sumEntriesRated: 9,
            statusCounts: { [Status.IN_PROGRESS]: 1, [Status.ON_HOLD]: 2 } as Record<Status, number>,
        }).run();

        const perMedia = await statsService.userPerMediaSummaryStats(1);
        expect(perMedia.find(item => item.mediaType === MediaType.MOVIES)).toMatchObject({ totalEntries: 4, totalNoPlan: 2, percentRated: 50 });
        expect(perMedia.find(item => item.mediaType === MediaType.BOOKS)).toMatchObject({ totalEntries: 3, totalNoPlan: 3 });
        expect(await statsService.userPreComputedStatsSummary(1)).toMatchObject({ totalEntries: 7, totalEntriesNoPlan: 5, percentRated: 40 });

        const platform = await statsService.platformAdvancedStatsSummary();
        expect(platform).toMatchObject({ totalEntries: 10, totalEntriesNoPlan: 7, totalRated: 4 });
        expect(platform.percentRated).toBeCloseTo(400 / 7);
        expect(platform.mediaBreakdown.find(item => item.mediaType === MediaType.MOVIES)).toMatchObject({ totalEntries: 7, totalEntriesNoPlan: 4, ratingCoverage: 75 });
        expect(platform.mediaBreakdown.find(item => item.mediaType === MediaType.BOOKS)).toMatchObject({ totalEntries: 3, totalEntriesNoPlan: 3 });
        expect(await statsService.userPreComputedStatsSummary(99)).toMatchObject({ totalEntries: 0, totalEntriesNoPlan: 0, percentRated: null });

        dbContext.db.update(schema.userMediaSettings).set({
            entriesRated: 0, sumEntriesRated: 0, statusCounts: { [Status.PLANNED]: 3 } as Record<Status, number>,
        }).where(eq(schema.userMediaSettings.userId, 3)).run();
        expect(await statsService.userPreComputedStatsSummary(3)).toMatchObject({ totalEntries: 3, totalEntriesNoPlan: 0, percentRated: null });
    });

    it("keeps rating coverage undefined when a rated title is moved back to planned", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.RATING, rating: 8 } });
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.STATUS, status: Status.PLANNED } });

        expect(settingsFor()).toMatchObject({ totalEntries: 1, entriesRated: 1, statusCounts: { [Status.PLANNED]: 1 } });
        expect(await statsService.userPerMediaSummaryStats(1)).toMatchObject([
            { mediaType: MediaType.MOVIES, totalNoPlan: 0, percentRated: null },
        ]);
        expect(await statsService.userPreComputedStatsSummary(1)).toMatchObject({ totalEntriesNoPlan: 0, percentRated: null });
    });

    it("does not write statistics snapshots when changing existing comment text", () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.COMMENT, comment: "First comment" } });
        const before = snapshot();

        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.COMMENT, comment: "Edited comment" } });

        expect(repository.findUserMedia(1, 1)?.comment).toBe("Edited comment");
        expect(snapshot().settings).toEqual(before.settings);
        expect(snapshot().statsHistory).toEqual(before.statsHistory);

        withTransaction(() => StatsRepository.updateUserPreComputedStatsWithDelta(1, MediaType.MOVIES, 1, {
            entriesRated: 0, sumEntriesRated: 0, statusCounts: { [Status.COMPLETED]: 0 },
        }));
        expect(snapshot().statsHistory).toEqual(before.statsHistory);
    });

    it("returns finite status percentages after removing the last list entry", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.removeMediaFromList(action);

        expect((await statsService.userPerMediaSummaryStats(1))[0]).toMatchObject({
            noData: true, totalEntries: 0,
            statusList: [{ status: Status.COMPLETED, count: 0, percent: 0 }],
        });
    });

    it("clamps time for other media types while keeping nonnegative constraints on other counters", () => {
        dbContext.db.insert(schema.userMediaSettings).values({
            userId: 1, mediaType: MediaType.BOOKS, active: true,
        }).run();

        withTransaction(() => StatsRepository.updateUserPreComputedStatsWithDelta(1, MediaType.BOOKS, 1, {
            timeSpent: -1,
        }));
        expect(dbContext.db.select().from(schema.userMediaSettings)
            .where(eq(schema.userMediaSettings.mediaType, MediaType.BOOKS)).get()?.timeSpent).toBe(0);

        const before = snapshot();
        expect(() => withTransaction(() => StatsRepository.updateUserPreComputedStatsWithDelta(1, MediaType.MOVIES, 1, {
            totalEntries: -1,
        }))).toThrow();

        expect(snapshot()).toEqual(before);
    });

    it("rolls back the list change and clamp if saving the statistics snapshot fails", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        await service.updateMediaEditableFields(1, { duration: 120 });
        const before = snapshot();
        sqlite.run(`CREATE TRIGGER fail_stats BEFORE INSERT ON ${getTableName(schema.userMediaStatsHistory)}
            BEGIN SELECT RAISE(ABORT, 'statistics failure'); END`);

        expect(() => tracking.removeMediaFromList(action)).toThrow();

        expect(snapshot()).toEqual(before);
    });
});
