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
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import type {MediaMonthlyActivityRegistry, MediaServiceRegistry, MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("movie time clamping after duration corrections", () => {
    let sqlite: Database;
    let repository: ReturnType<typeof createMoviesRepository>;
    let service: ReturnType<typeof createMoviesService>;
    let tracking: MediaTrackingService;
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
        const statsService = new StatsService(StatsRepository, activityService, AchievementsRepository, UpdateHistoryRepository, {} as MediaStatsRegistry);
        tracking = new MediaTrackingService(
            statsService,
            activityService,
            new UpdateHistoryService(UpdateHistoryRepository),
            new NotificationsService(NotificationsRepository),
            { get: () => service } as MediaServiceRegistry,
        );
    });

    afterEach(() => sqlite.close());

    it.each(["edit", "refresh"])("leaves user statistics untouched during a metadata %s", async source => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.REDO, redo: 2 } });
        tracking.addMediaToList({ ...action, userId: 2, status: Status.COMPLETED });
        tracking.addMediaToList({ ...action, userId: 3, status: Status.PLAN_TO_WATCH });
        const before = snapshot();

        if (source === "edit") {
            await service.updateMediaEditableFields(1, { duration: 120 });
        }
        else {
            const ingestion = createMediaIngestionService({
                repository,
                provider: {
                    search: vi.fn(),
                    getDetails: async () => ({ mediaData: { ...repository.findById(1)!, duration: 120 } }),
                },
            });
            await ingestion.refreshFromExternal(1);
        }

        expect(repository.findById(1)?.duration).toBe(120);
        expect(snapshot()).toEqual(before);
    });

    it.each([1, 2])("removes the last movie with stale time for user %i, including an inactive list", async userId => {
        tracking.addMediaToList({ ...action, userId, status: Status.COMPLETED });
        await service.updateMediaEditableFields(1, { duration: 120 });
        expect(settingsFor(userId).timeSpent).toBe(90);

        tracking.removeMediaFromList({ ...action, userId });

        expect(dbContext.db.select().from(schema.moviesList).all()).toEqual([]);
        expect(settingsFor(userId))
            .toMatchObject({ timeSpent: 0, totalEntries: 0, totalRedo: 0, totalSpecific: 0 });
    });

    it("clamps time until maintenance without changing other users or media types", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.addMediaToList({ ...action, mediaId: 2, status: Status.COMPLETED });
        tracking.updateUserMedia({ ...action, mediaId: 2, payload: { type: UpdateType.REDO, redo: 2 } });
        tracking.addMediaToList({ ...action, userId: 2, status: Status.COMPLETED });
        tracking.addMediaToList({ ...action, userId: 3, status: Status.PLAN_TO_WATCH });
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

    it("allows moving a completed movie back to plan when its time is stale", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        await service.updateMediaEditableFields(1, { duration: 120 });

        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.STATUS, status: Status.PLAN_TO_WATCH } });

        expect(settingsFor()).toMatchObject({
            timeSpent: 0, totalEntries: 1, totalSpecific: 0,
            statusCounts: { [Status.COMPLETED]: 0, [Status.PLAN_TO_WATCH]: 1 },
        });
        expect(repository.findUserMedia(1, 1)).toMatchObject({ status: Status.PLAN_TO_WATCH, total: 0 });
    });

    it("clamps time when reducing rewatches and lets maintenance restore the remaining watch time", async () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.REDO, redo: 2 } });
        await service.updateMediaEditableFields(1, { duration: 180 });
        expect(settingsFor().timeSpent).toBe(270);

        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.REDO, redo: 0 } });

        expect(settingsFor()).toMatchObject({ timeSpent: 0, totalSpecific: 1, totalRedo: 0 });
        expect(repository.findUserMedia(1, 1)).toMatchObject({ total: 1, redo: 0 });

        withTransaction(() => StatsRepository.updateAllUsersPreComputedStats(MediaType.MOVIES, createMoviesStatistics().computeAllUsersStats()));

        expect(settingsFor().timeSpent).toBe(180);
    });

    it.each([
        { duration: 60, otherMovie: false, expectedTime: 30, remainingTime: 0 },
        { duration: 120, otherMovie: true, expectedTime: 30, remainingTime: 60 },
        { duration: 150, otherMovie: true, expectedTime: 0, remainingTime: 60 },
    ])("leaves nonnegative totals to maintenance after a $duration-minute correction", async ({ duration, otherMovie, expectedTime, remainingTime }) => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        if (otherMovie) tracking.addMediaToList({ ...action, mediaId: 2, status: Status.COMPLETED });
        await service.updateMediaEditableFields(1, { duration });

        tracking.removeMediaFromList(action);

        expect(settingsFor().timeSpent).toBe(expectedTime);

        withTransaction(() => StatsRepository.updateAllUsersPreComputedStats(MediaType.MOVIES, createMoviesStatistics().computeAllUsersStats()));

        expect(settingsFor().timeSpent).toBe(remainingTime);
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
        sqlite.exec(`CREATE TRIGGER fail_stats BEFORE INSERT ON ${getTableName(schema.userMediaStatsHistory)}
            BEGIN SELECT RAISE(ABORT, 'statistics failure'); END`);

        expect(() => tracking.removeMediaFromList(action)).toThrow();

        expect(snapshot()).toEqual(before);
    });
});
