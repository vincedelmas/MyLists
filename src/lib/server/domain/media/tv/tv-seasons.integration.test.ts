import Database from "bun:sqlite";
import {eq, getTableName} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {Status, UpdateType} from "@/lib/utils/enums";
import {createTvRepository, type TvRepository} from "./tv.repository";
import {createTvService, type TvService} from "./tv.service";

import {TvImportListWriter} from "./tv-import-list.writer";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {MediaTrackingService} from "@/lib/server/domain/tracking/media-tracking.service";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";
import {MonthlyActivityRepository} from "@/lib/server/domain/tracking/monthly-activity.repository";
import {UpdateHistoryService} from "@/lib/server/domain/tracking/update-history.service";
import {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";
import type {MediaMonthlyActivityRegistry, MediaServiceRegistry, MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";
import {withTransaction} from "@/lib/server/database/async-storage";
import {convertToCsv} from "@/lib/utils/csv";
import {parseMyListsCsv} from "@/lib/server/domain/imports/parsers/mylists.parser";
import type {MatchedImportItem} from "@/lib/types/imports.types";

const context = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));

describe.each([seriesServerDefinition, animeServerDefinition])("$identity.mediaType seasonal tracking", definition => {
    let sqlite: Database;
    let repository: TvRepository;
    let service: TvService;
    let tracking: MediaTrackingService;
    const mediaType = definition.identity.mediaType;
    const { listTable, seasonStateTable, mediaTable, epsPerSeasonTable } = definition.repository.tables;
    const action = { userId: 1, mediaId: 1, mediaType };
    const read = () => context.db.select().from(listTable).where(eq(listTable.userId, 1)).get()!;
    const seasons = () => repository.getUserSeasons(1, 1);
    const update = (payload: Parameters<MediaTrackingService["updateUserMedia"]>[0]["payload"]) => tracking.updateUserMedia({ ...action, payload });
    const stats = () => context.db.select().from(schema.userMediaSettings).get()!;
    const snapshot = () => ({
        parent: read(), seasons: seasons(), stats: stats(),
        activities: context.db.select().from(schema.userMediaMonthlyActivity).all(),
        history: context.db.select().from(schema.userMediaUpdate).all(),
        statsHistory: context.db.select().from(schema.userMediaStatsHistory).all(),
    });

    beforeEach(() => {
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        context.db.insert(schema.user).values({ id: 1, name: "season-user", email: "season@example.com", emailVerified: true, createdAt: "2025-01-01", updatedAt: "2025-01-01" }).run();
        context.db.insert(schema.userMediaSettings).values({ userId: 1, mediaType, active: true }).run();
        context.db.insert(mediaTable).values({ id: 1, apiId: 1, name: "Season show", duration: 30, imageCover: "show.jpg", totalSeasons: 3, totalEpisodes: 24 }).run();
        context.db.insert(epsPerSeasonTable).values([1, 2, 3].map(season => ({ mediaId: 1, season, episodes: 8 }))).run();
        repository = createTvRepository(definition);
        service = createTvService(repository, definition);
        const monthlyActivity = createMediaMonthlyActivity({ definition, repository });
        const activityService = new MonthlyActivityService(MonthlyActivityRepository, { get: () => monthlyActivity } as MediaMonthlyActivityRegistry);
        const statsService = new StatsService(StatsRepository, activityService, AchievementsRepository, UpdateHistoryRepository, {} as MediaStatsRegistry);
        tracking = new MediaTrackingService(statsService, activityService, new UpdateHistoryService(UpdateHistoryRepository), new NotificationsService(NotificationsRepository), { get: () => service } as MediaServiceRegistry);
        tracking.addMediaToList({ ...action, status: Status.COMPLETED });
    });
    afterEach(() => sqlite.close());

    it("sets all seasons, averages individual edits to tenths, and can overwrite the same average", () => {
        const before = snapshot();
        update({ type: UpdateType.RATING, rating: 8 });
        expect(seasons().map(s => s.rating)).toEqual([8, 8, 8]);
        update({ type: UpdateType.RATING, seasonRating: { season: 1, rating: 9 } });
        expect(read().rating).toBe(8.3);
        expect(stats()).toMatchObject({ entriesRated: 1, sumEntriesRated: 8.3, averageRating: 8.3 });
        update({ type: UpdateType.RATING, seasonRating: { season: 3, rating: 7 } });
        expect(read().rating).toBe(8);
        update({ type: UpdateType.RATING, rating: 8 });
        expect(seasons().map(s => s.rating)).toEqual([8, 8, 8]);
        expect(snapshot().activities).toEqual(before.activities);
        expect(snapshot().history).toEqual(before.history);
    });

    it("counts zero as rated, excludes null, and clears all ratings without changing rewatches", () => {
        update({ type: UpdateType.REDO, seasonRedos: [{ season: 2, redo: 2 }] });
        update({ type: UpdateType.RATING, seasonRating: { season: 1, rating: 0 } });
        update({ type: UpdateType.RATING, seasonRating: { season: 3, rating: 9 } });
        expect(read()).toMatchObject({ rating: 4.5, redo: 2, total: 40 });
        update({ type: UpdateType.RATING, rating: null });
        expect(read()).toMatchObject({ rating: null, redo: 2, total: 40 });
        expect(stats()).toMatchObject({ entriesRated: 0, sumEntriesRated: 0, totalRedo: 2 });
    });

    it("preserves removed seasons, leaves new seasons unrated, and restores returning season data", () => {
        update({ type: UpdateType.RATING, rating: 6 });
        update({ type: UpdateType.RATING, seasonRating: { season: 2, rating: 9 } });
        update({ type: UpdateType.REDO, seasonRedos: [{ season: 2, redo: 2 }] });
        const refresh = (numbers: number[]) => withTransaction(() => repository.updateMediaWithDetails({
            mediaData: { apiId: 1, totalSeasons: numbers.length }, seasonsData: numbers.map(season => ({ season, episodes: 8 })),
        }));
        refresh([1, 3, 4]);
        expect(seasons()).toContainEqual({ season: 2, episodes: null, rating: 9, redo: 2 });
        expect(seasons()).toContainEqual({ season: 4, episodes: 8, rating: null, redo: 0 });
        expect(read()).toMatchObject({ rating: 6, redo: 0 });
        expect(stats()).toMatchObject({ averageRating: 6, sumEntriesRated: 6, totalRedo: 0 });
        expect(() => update({ type: UpdateType.RATING, seasonRating: { season: 2, rating: 5 } })).toThrow("no longer available");
        refresh([1, 2, 3, 4]);
        expect(read()).toMatchObject({ rating: 7, redo: 2 });
    });

    it("rolls back season writes and aggregates when statistics fail", () => {
        const before = snapshot();
        sqlite.run(`CREATE TRIGGER fail_stats BEFORE INSERT ON user_media_stats_history BEGIN SELECT RAISE(ABORT, 'stats failed'); END`);
        expect(() => update({ type: UpdateType.RATING, rating: 9 })).toThrow();
        expect(snapshot()).toEqual(before);
        expect(() => update({ type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 1 }] })).toThrow();
        expect(snapshot()).toEqual(before);
    });

it("validates every targeted season and scopes edits to the owner", () => {
        const before = snapshot();
        expect(() => update({ type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 2 }, { season: 99, redo: 1 }] })).toThrow("Invalid season");
        expect(snapshot()).toEqual(before);
        expect(() => tracking.updateUserMedia({ ...action, userId: 2, payload: { type: UpdateType.RATING, rating: 10 } })).toThrow("not in your list");
        expect(repository.getUserSeasons(2, 1)).toEqual([]);
        expect(snapshot()).toEqual(before);
    });

    it("round-trips seasonal CSV data and preserves existing entries on import conflict", async () => {
        update({ type: UpdateType.RATING, seasonRating: { season: 1, rating: 8.5 } });
        update({ type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 100 }, { season: 3, redo: 2 }] });
        const original = seasons();
        const exported = (await service.downloadMediaListAsCSV(1))!;
        expect(exported[0].formatVersion).toBe("2");
        expect(exported[0].firstWatchProgress).toBe(24);
        const parsed = parseMyListsCsv(convertToCsv(exported));
        expect(parsed.failedCount).toBe(0);
        const writer = new TvImportListWriter(service);
        const item = { ...parsed.items[0], id: 1, jobId: 1, mediaType, matchedMediaId: 1, statusReason: null } as MatchedImportItem["item"];
        update({ type: UpdateType.RATING, rating: 10 });
        await writer.addMatchedItems(1, [{ item, mediaId: 1 }]);
        expect(read().rating).toBe(10);
        tracking.removeMediaFromList(action);
        await writer.addMatchedItems(1, [{ item, mediaId: 1 }]);
        expect(seasons()).toEqual(original);
        expect(read()).toMatchObject({ rating: 8.5, redo: 102, total: 840 });
    });

    it("rolls back the parent import when seasonal insertion fails", async () => {
        tracking.removeMediaFromList(action);
        sqlite.run(`CREATE TRIGGER fail_season BEFORE INSERT ON ${getTableName(seasonStateTable)} BEGIN SELECT RAISE(ABORT, 'season failed'); END`);
        await expect(service.bulkInsertUserMedia([{ userId: 1, mediaId: 1, status: Status.COMPLETED, currentSeason: 3, currentEpisode: 8,
            seasons: [1, 2, 3].map(season => ({ season, rating: 8, redo: 0 })),
        }])).rejects.toThrow();
        expect(context.db.select().from(listTable).all()).toEqual([]);
    });
});
