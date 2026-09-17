import Database from "bun:sqlite";
import {getTableName} from "drizzle-orm";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createMoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {createMoviesRepository, type MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {createTvService} from "@/lib/server/domain/media/tv/tv.service";
import {createTvRepository, type TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
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
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import type {MediaMonthlyActivityRegistry, MediaServiceRegistry, MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe.each([MediaType.MOVIES, MediaType.SERIES])("%s tracking transactions", (mediaType) => {
    let sqlite: Database;
    let tracking: MediaTrackingService;
    const action = { userId: 1, mediaId: 1, mediaType };

    const snapshot = () => ({
        movies: dbContext.db.select().from(schema.moviesList).all(),
        series: dbContext.db.select().from(schema.seriesList).all(),
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

        db.insert(schema.user).values({
            id: 1, name: "transaction-user", email: "transaction@example.com", emailVerified: true,
            createdAt: "2025-01-01 00:00:00", updatedAt: "2025-01-01 00:00:00",
        }).run();
        db.insert(schema.userMediaSettings).values({ userId: 1, mediaType, active: true }).run();
        db.insert(schema.movies).values({ id: 1, apiId: 1, name: "Movie", duration: 120, imageCover: "movie.jpg" }).run();
        db.insert(schema.series).values({ id: 1, apiId: 1, name: "Series", duration: 30, imageCover: "series.jpg", totalSeasons: 1, totalEpisodes: 8 }).run();
        db.insert(schema.seriesEpisodesPerSeason).values({ mediaId: 1, season: 1, episodes: 8 }).run();

        const definition = mediaType === MediaType.MOVIES ? moviesServerDefinition : seriesServerDefinition;
        const repository = mediaType === MediaType.MOVIES ? createMoviesRepository() : createTvRepository(seriesServerDefinition);
        const mediaService = mediaType === MediaType.MOVIES
            ? createMoviesService(repository as MoviesRepository)
            : createTvService(repository as TvRepository, seriesServerDefinition);
        const monthlyActivity = createMediaMonthlyActivity({ definition, repository });
        const activityService = new MonthlyActivityService(MonthlyActivityRepository, { get: () => monthlyActivity } as MediaMonthlyActivityRegistry);
        const statsService = new StatsService(StatsRepository, activityService, AchievementsRepository, UpdateHistoryRepository, {} as MediaStatsRegistry);
        tracking = new MediaTrackingService(
            statsService,
            activityService,
            new UpdateHistoryService(UpdateHistoryRepository),
            new NotificationsService(NotificationsRepository),
            { get: () => mediaService } as MediaServiceRegistry,
        );
    });

    afterEach(() => sqlite.close());

    if (mediaType === MediaType.SERIES) {
        it("applies each quick increment to the latest saved progress and combines the full feed range", () => {
            const continueAction = { ...action, mediaType: MediaType.SERIES };
            tracking.addMediaToList({ ...action, status: Status.WATCHING });

            expect(tracking.continueUserMedia(continueAction)).toMatchObject({ completed: false, item: { currentEpisode: 2 } });
            expect(tracking.continueUserMedia(continueAction)).toMatchObject({ completed: false, item: { currentEpisode: 3 } });

            // A details edit in another tab must become the starting point for the next click.
            tracking.updateUserMedia({ ...action, payload: { type: UpdateType.TV, currentEpisode: 7 } });
            expect(tracking.continueUserMedia(continueAction)).toEqual({ completed: true, item: null });

            const history = UpdateHistoryRepository.getUserMediaHistory(action.userId, action.mediaType, action.mediaId);
            expect(history.slice(0, 2)).toMatchObject([
                { updateType: UpdateType.STATUS, payload: { old_value: Status.WATCHING, new_value: Status.COMPLETED } },
                { updateType: UpdateType.TV, payload: { old_value: [1, 1], new_value: [1, 8] } },
            ]);
            expect(snapshot().settings[0]).toMatchObject({ totalSpecific: 8, timeSpent: 240 });

            const saved = snapshot();
            expect(tracking.continueUserMedia(continueAction)).toEqual({ completed: false, item: null });
            expect(snapshot()).toEqual(saved);
        });

        it("leaves paused, missing, and another user's media unchanged when a stale card is clicked", () => {
            const continueAction = { ...action, mediaType: MediaType.SERIES };
            tracking.addMediaToList({ ...action, status: Status.ON_HOLD });
            const saved = snapshot();

            expect(tracking.continueUserMedia(continueAction)).toEqual({ completed: false, item: null });
            expect(tracking.continueUserMedia({ ...continueAction, userId: 2 })).toEqual({ completed: false, item: null });
            expect(snapshot()).toEqual(saved);

            tracking.removeMediaFromList(action);
            const removed = snapshot();
            expect(tracking.continueUserMedia(continueAction)).toEqual({ completed: false, item: null });
            expect(snapshot()).toEqual(removed);
        });

        it("records final progress before completion with one statistics and activity contribution", () => {
            tracking.addMediaToList({ ...action, status: Status.WATCHING });
            tracking.updateUserMedia({ ...action, payload: { type: UpdateType.TV, currentEpisode: 4 } });
            const result = tracking.updateUserMedia({ ...action, payload: { type: UpdateType.TV, currentSeason: 1, currentEpisode: 8 } });

            expect(result).toMatchObject({ status: Status.COMPLETED, currentEpisode: 8, total: 8 });
            const saved = snapshot();
            expect(saved.settings[0]).toMatchObject({ totalSpecific: 8, timeSpent: 240, statusCounts: { [Status.WATCHING]: 0, [Status.COMPLETED]: 1 } });
            expect(saved.activity).toHaveLength(1);
            expect(saved.activity[0]).toMatchObject({ progressGained: 8, hadCompletion: true });
            const history = UpdateHistoryRepository.getUserMediaHistory(action.userId, action.mediaType, action.mediaId);
            expect(history).toHaveLength(3);
            expect(history.slice(0, 2)).toMatchObject([
                { updateType: UpdateType.STATUS, payload: { old_value: Status.WATCHING, new_value: Status.COMPLETED } },
                { updateType: UpdateType.TV, payload: { old_value: [1, 1], new_value: [1, 8] } },
            ]);
        });

        it("rolls back final progress as well when the completion feed entry fails", () => {
            tracking.addMediaToList({ ...action, status: Status.WATCHING });
            tracking.updateUserMedia({ ...action, payload: { type: UpdateType.TV, currentEpisode: 7 } });
            const before = snapshot();
            sqlite.exec(`CREATE TRIGGER fail_completion BEFORE INSERT ON ${getTableName(schema.userMediaUpdate)}
                WHEN NEW.update_type = 'status'
                BEGIN SELECT RAISE(ABORT, 'completion failure'); END`);

            expect(() => tracking.continueUserMedia({ ...action, mediaType: MediaType.SERIES })).toThrow();
            expect(snapshot()).toEqual(before);
        });

        it("keeps the progress and completion on the selected backlog date", () => {
            tracking.addMediaToList({ ...action, status: Status.WATCHING });
            tracking.updateUserMedia({ ...action, payload: { type: UpdateType.TV, currentEpisode: 8, loggedAt: "2025-05-20" } });
            const history = UpdateHistoryRepository.getUserMediaHistory(action.userId, action.mediaType, action.mediaId);
            expect(history).toHaveLength(2);
            expect(history.every(entry => entry.timestamp === "2025-05-20 12:00:00")).toBe(true);
            expect(snapshot().activity.find(entry => entry.monthBucket === "2025-05")).toMatchObject({ progressGained: 7, hadCompletion: true });
        });
    }

    it("commits the list, statistics, activity, and history together", () => {
        const added = tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        expect(added.status).toBe(Status.COMPLETED);
        const saved = snapshot();
        expect(saved.settings[0].totalEntries).toBe(1);
        expect(saved.statsHistory).toHaveLength(1);
        expect(saved.activity).toHaveLength(1);
        expect(saved.updates).toHaveLength(1);
        expect(saved.movies.length + saved.series.length).toBe(1);
    });

    it("rolls back every earlier write when the final history insert fails", () => {
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_history BEFORE INSERT ON ${getTableName(schema.userMediaUpdate)}
            BEGIN SELECT RAISE(ABORT, 'history failure'); END`);

        expect(() => tracking.addMediaToList({ ...action, status: Status.COMPLETED })).toThrow();
        expect(snapshot()).toEqual(before);
    });

    it("restores an existing list entry and all derived records after an update fails", () => {
        tracking.addMediaToList({ ...action, status: Status.PLAN_TO_WATCH });
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_history BEFORE INSERT ON ${getTableName(schema.userMediaUpdate)}
            BEGIN SELECT RAISE(ABORT, 'history failure'); END`);

        expect(() => tracking.updateUserMedia({ ...action, payload: { type: UpdateType.STATUS, status: Status.COMPLETED } })).toThrow();
        expect(snapshot()).toEqual(before);
    });

    it("restores the list and statistics when removing activity fails", () => {
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_activity BEFORE DELETE ON ${getTableName(schema.userMediaMonthlyActivity)}
            BEGIN SELECT RAISE(ABORT, 'activity failure'); END`);

        expect(() => tracking.removeMediaFromList(action)).toThrow();
        expect(snapshot()).toEqual(before);
    });
});
