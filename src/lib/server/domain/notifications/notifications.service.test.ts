import {and, eq, ne, sql} from "drizzle-orm";
import {createTvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import Database from "bun:sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {NotificationsService} from "./notifications.service";
import {NotificationsRepository} from "./notifications.repository";


const context = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));

describe("notifications", () => {
    let sqlite: Database;
    const service = new NotificationsService(NotificationsRepository);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        context.db.insert(schema.user).values({
            id: 1, name: "user", email: "user@example.com", emailVerified: true,
            createdAt: "2025-01-01 00:00:00", updatedAt: "2025-01-01 00:00:00",
        }).run();
    });

    afterEach(() => sqlite.close());

    it.each([MediaType.MOVIES, MediaType.SERIES])("avoids duplicates from overlapping %s runs and preserves new releases", async (mediaType) => {
        const release = {
            userId: 1, mediaId: 1, mediaName: "Media", imageCover: "cover.jpg", status: Status.PLAN_TO_WATCH,
            date: "2026-09-10", seasonToAir: 1, episodeToAir: 1, lastEpisode: 8,
        };

        await Promise.all([
            service.createMediaNotifications(mediaType, [release]),
            service.createMediaNotifications(mediaType, [release]),
        ]);
        expect(context.db.select().from(schema.mediaNotifications).all()).toHaveLength(1);

        await service.createMediaNotifications(mediaType, [{ ...release, date: "2026-09-17", episodeToAir: 2 }]);
        expect(context.db.select().from(schema.mediaNotifications).all()).toHaveLength(2);

        // SQLite timestamps have second precision; multiple releases can share a timestamp.
        context.db.update(schema.mediaNotifications).set({ createdAt: "2026-09-07 12:00:00" }).run();
        await service.createMediaNotifications(mediaType, [{ ...release, date: "2026-09-17", episodeToAir: 2 }]);
        expect(context.db.select().from(schema.mediaNotifications).all()).toHaveLength(2);
    });
});


describe.each([MediaType.SERIES, MediaType.ANIME, MediaType.MOVIES])("%s release notification preferences", mediaType => {
    let sqlite: Database;
    const definition = mediaType === MediaType.SERIES ? seriesServerDefinition : animeServerDefinition;
    const { mediaTable, listTable } = mediaType === MediaType.MOVIES
        ? moviesServerDefinition.repository.tables : definition.repository.tables;
    const repository = mediaType === MediaType.MOVIES
        ? createMediaQueries(moviesServerDefinition) : createTvRepository(definition);

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
        if (mediaType === MediaType.MOVIES) {
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
