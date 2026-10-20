import Database from "bun:sqlite";
import {and, eq, ne, sql} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {createMediaQueries} from "./media.queries";
import {createTvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createGamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {createGamesService} from "@/lib/server/domain/media/games/games.service";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {createMediaNotificationsTask} from "@/lib/server/tasks/definitions/create-media-notifications.task";
import type {TaskContext} from "@/lib/server/tasks/task-context";


const context = vi.hoisted(() => ({
    db: undefined as unknown as BunSQLiteDatabase<typeof schema>,
    getContainer: vi.fn(),
}));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));
vi.mock("@/lib/server/core/container", () => ({ getContainer: context.getContainer }));


describe.each([MediaType.SERIES, MediaType.ANIME, MediaType.MOVIES, MediaType.GAMES])("%s release notification preferences", mediaType => {
    let sqlite: Database;
    const definition = mediaType === MediaType.SERIES ? seriesServerDefinition : animeServerDefinition;
    const { mediaTable, listTable } = mediaType === MediaType.GAMES ? gamesServerDefinition.repository.tables
        : mediaType === MediaType.MOVIES ? moviesServerDefinition.repository.tables : definition.repository.tables;
    const repository = mediaType === MediaType.GAMES ? createGamesRepository()
        : mediaType === MediaType.MOVIES ? createMediaQueries(moviesServerDefinition) : createTvRepository(definition);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        for (const id of [1, 2]) {
            context.db.insert(schema.user).values({
                id, name: `user${id}`, email: `user${id}@example.com`, emailVerified: true,
                createdAt: "2025-01-01", updatedAt: "2025-01-01",
            }).run();
            context.db.insert(schema.userMediaSettings).values(ALL_MEDIA_TYPES.map(mediaType => ({
                userId: id, mediaType, active: true,
            }))).run();
        }
        const date = sql<string>`date('now', '+1 day')`;
        if (mediaType === MediaType.GAMES) {
            context.db.insert(schema.games).values({ id: 1, apiId: 1, name: "Game", imageCover: "game.jpg", releaseDate: date }).run();
            context.db.insert(schema.gamesList).values([1, 2].map(userId => ({ userId, mediaId: 1, status: Status.PLAN_TO_PLAY }))).run();
        }
        else if (mediaType === MediaType.MOVIES) {
            context.db.insert(schema.movies).values({ id: 1, apiId: 1, name: "Movie", imageCover: "movie.jpg", duration: 90, releaseDate: date }).run();
            context.db.insert(schema.moviesList).values([1, 2].map(userId => ({ userId, mediaId: 1, status: Status.PLAN_TO_WATCH }))).run();
        }
        else {
            context.db.insert(definition.repository.tables.mediaTable).values({
                id: 1, apiId: 1, name: "Show", imageCover: "show.jpg", duration: 30,
                totalSeasons: 1, totalEpisodes: 10, seasonToAir: 1, episodeToAir: 1, nextEpisodeToAir: date,
            }).run();
            context.db.insert(definition.repository.tables.listTable).values([1, 2].map(userId => ({
                userId, mediaId: 1, status: Status.PLAN_TO_WATCH, currentSeason: 1, currentEpisode: 0,
            }))).run();
        }
    });

    afterEach(() => sqlite.close());

    it("creates release notifications through the notification task without duplicates", async () => {
        context.getContainer.mockResolvedValue({
            registries: { mediaService: { get: (type: MediaType) => type === mediaType ? repository : { getUpcomingMedia: async () => [] } } },
            services: { notifications: new NotificationsService(NotificationsRepository) },
        });
        const taskContext: TaskContext = {
            taskId: "notifications-test", taskName: "create-media-notifications", triggeredBy: "cron/cli",
            increment: vi.fn(), metric: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn(),
            step: async (_name, fn) => fn(),
        };
        await createMediaNotificationsTask.handler(taskContext, {});
        await createMediaNotificationsTask.handler(taskContext, {});
        const notifications = context.db.select().from(schema.mediaNotifications).all();
        expect(notifications).toHaveLength(2);
        expect(notifications.map(notification => notification.mediaType)).toEqual([mediaType, mediaType]);
    });

    it("does not generate notifications for inactive media types", async () => {
        context.db.update(schema.userMediaSettings).set({ active: false }).where(eq(schema.userMediaSettings.mediaType, mediaType)).run();
        expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(0);
        expect(await repository.getUpcomingMedia(1)).toHaveLength(1);
    });

    it.runIf(mediaType === MediaType.GAMES || mediaType === MediaType.MOVIES)("requires a release date within the next seven days", async () => {
        for (const releaseDate of [null, sql<string>`date('now', '-1 day')`, sql<string>`date('now', '+8 days')`]) {
            context.db.update(mediaTable).set({ releaseDate }).run();
            expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(0);
        }
        context.db.update(mediaTable).set({ releaseDate: sql<string>`date('now', '+7 days')` }).run();
        expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(2);
    });

    it.runIf(mediaType === MediaType.GAMES)("saves a title preference only for its owner", async () => {
        const service = createGamesService(createGamesRepository());
        service.updateUserMediaNotifications(1, 1, false);
        expect((await repository.getUpcomingMedia(undefined, true)).map(item => item.userId)).toEqual([2]);
        expect(() => service.updateUserMediaNotifications(3, 1, false)).toThrow("Media not in your list");
        service.updateUserMediaNotifications(1, 1, true);
        expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(2);
    });

    it("saves independent media-type preferences for the authenticated user", async () => {
        const notifications = Object.fromEntries(ALL_MEDIA_TYPES.map(type => [type, type !== mediaType])) as Record<MediaType, boolean>;
        StatsRepository.updateUserMediaListSettings(1, { [MediaType.ANIME]: false }, notifications);
        const settings = context.db.select().from(schema.userMediaSettings).where(eq(schema.userMediaSettings.userId, 1)).all();
        for (const setting of settings) {
            expect(setting.releaseNotificationsEnabled).toBe(setting.mediaType !== mediaType);
            expect(setting.active).toBe(setting.mediaType !== MediaType.ANIME);
        }
        expect((await repository.getUpcomingMedia(undefined, true)).map(item => item.userId)).toEqual([2]);
    });

    it("defaults to enabled and combines per-type and per-title preferences without hiding calendar entries", async () => {
        expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(2);
        context.db.update(listTable).set({ releaseNotificationsEnabled: false }).where(eq(listTable.userId, 1)).run();
        expect((await repository.getUpcomingMedia(undefined, true)).map(item => item.userId)).toEqual([2]);
        context.db.update(schema.userMediaSettings).set({ releaseNotificationsEnabled: false }).where(and(
            eq(schema.userMediaSettings.userId, 2), ne(schema.userMediaSettings.mediaType, mediaType),
        )).run();
        expect((await repository.getUpcomingMedia(undefined, true)).map(item => item.userId)).toEqual([2]);
        context.db.update(schema.userMediaSettings).set({ releaseNotificationsEnabled: false }).where(and(
            eq(schema.userMediaSettings.userId, 2), eq(schema.userMediaSettings.mediaType, mediaType),
        )).run();
        expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(0);
        expect(await repository.getUpcomingMedia(1)).toHaveLength(1);
        const tomorrow = context.db.select({ date: sql<string>`date('now', '+1 day')` }).from(mediaTable).get()!.date;
        expect(await repository.getReleaseCalendarMedia(1, { startDate: tomorrow, endDate: tomorrow })).toHaveLength(1);
        context.db.update(schema.userMediaSettings).set({ releaseNotificationsEnabled: true }).run();
        expect((await repository.getUpcomingMedia(undefined, true)).map(item => item.userId)).toEqual([2]);
        context.db.update(listTable).set({ releaseNotificationsEnabled: true }).where(eq(listTable.userId, 1)).run();
        expect(await repository.getUpcomingMedia(undefined, true)).toHaveLength(2);
    });
});
