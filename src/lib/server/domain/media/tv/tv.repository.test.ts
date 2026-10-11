import Database from "bun:sqlite";
import {eq, getTableName, sql} from "drizzle-orm";
import {Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {series, seriesEpisodesPerSeason, seriesList, user} from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/db", () => ({
    get db() {
        return dbContext.db;
    },
}));

const { createTvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");
const { createMediaIngestionService } = await import("@/lib/server/api-providers/media-ingestion.service");

describe.each([seriesServerDefinition, animeServerDefinition])("$identity.mediaType repository", definition => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    const repository = createTvRepository(definition);
    const { mediaTable, listTable, epsPerSeasonTable } = definition.repository.tables;

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

it("filters next calendar episodes by range, owner and eligible status", async () => {
        const today = toDateInputValue(new Date(), { timeZone: "utc" });
        const yesterday = shiftDateInputValue(today, { days: -1 });
        const endDate = shiftDateInputValue(today, { days: 7 });
        const dates = [today, endDate, yesterday, shiftDateInputValue(endDate, { days: 1 }), null, today, today, today, today];
        db.insert(user).values({
            id: 2, name: "other-user", email: "other@example.com", emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }).run();
        db.update(mediaTable).set({ nextEpisodeToAir: today, seasonToAir: 1, episodeToAir: 2 }).where(eq(mediaTable.id, 1)).run();
        db.insert(mediaTable).values(dates.slice(1).map((date, index) => ({
            id: index + 2, apiId: index + 2, name: `Calendar show ${index + 2}`, duration: 30,
            totalSeasons: 1, totalEpisodes: 12, imageCover: "show.jpg", nextEpisodeToAir: date, seasonToAir: 1, episodeToAir: 2,
        }))).run();
        db.insert(listTable).values([2, 3, 4, 5, 6, 7, 8].map(mediaId => ({
            mediaId, userId: mediaId === 8 ? 2 : 1, currentSeason: 1, currentEpisode: 1,
            status: mediaId === 6 ? Status.DROPPED : mediaId === 7 ? Status.RANDOM : Status.COMPLETED,
        }))).run();

        const items = await repository.getReleaseCalendarMedia(1, { startDate: yesterday, endDate });
        expect(items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(items.every(item => item.mediaType === definition.identity.mediaType)).toBe(true);
        expect(items[0]).toMatchObject({ date: today, seasonToAir: 1, episodeToAir: 2 });
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

});
