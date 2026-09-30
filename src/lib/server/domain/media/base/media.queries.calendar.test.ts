import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";
import * as schema from "@/lib/server/database/schema";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));

const { createMediaQueries } = await import("./media.queries");
const { createTvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");


describe.each([moviesServerDefinition, gamesServerDefinition, seriesServerDefinition, animeServerDefinition])("$identity.mediaType release calendar", definition => {
    let sqlite: Database;
    const mediaType = definition.identity.mediaType;
    const isTv = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME;
    const today = toDateInputValue(new Date(), { timeZone: "utc" });
    const yesterday = shiftDateInputValue(today, { days: -1 });
    const endDate = shiftDateInputValue(today, { days: 7 });
    const { mediaTable, listTable } = definition.repository.tables;
    const repository = definition === seriesServerDefinition || definition === animeServerDefinition
        ? createTvRepository(definition) : createMediaQueries(definition);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `calendar-${id}`, email: `calendar-${id}@example.com`, emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }))).run();

        const dates = [yesterday, today, endDate, shiftDateInputValue(endDate, { days: 1 }), null, today, today, today, today];
        db.insert(mediaTable).values(dates.map((date, index) => ({
            id: index + 1, apiId: index + 1, name: `Calendar item ${index + 1}`, imageCover: "cover.jpg", duration: 30,
            releaseDate: date,
            ...(isTv ? { totalSeasons: 1, totalEpisodes: 12, nextEpisodeToAir: date, seasonToAir: 1, episodeToAir: 2 } : {}),
        }))).run();
        db.insert(listTable).values([1, 2, 3, 4, 5, 6, 7, 9].map(mediaId => ({
            userId: mediaId === 7 ? 2 : 1,
            mediaId,
            status: mediaId === 6 ? Status.DROPPED : mediaId === 9 ? isTv ? Status.RANDOM : Status.ON_HOLD : Status.COMPLETED,
            ...(isTv ? { currentSeason: 1, currentEpisode: 1 } : {}),
        }))).run();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("limits results to the requested range and owner, with known dates and eligible statuses", async () => {
        const items = await repository.getReleaseCalendarMedia(1, { startDate: yesterday, endDate });
        expect(items.map(item => item.mediaId)).toEqual(isTv ? [2, 3] : [1, 2, 9, 3]);
        expect(items.every(item => item.mediaType === mediaType)).toBe(true);
        if (isTv) expect(items[0]).toMatchObject({ date: today, seasonToAir: 1, episodeToAir: 2 });
    });

    it("shows past movie and game releases while leaving past episode history empty", async () => {
        const items = await repository.getReleaseCalendarMedia(1, { startDate: yesterday, endDate: yesterday });
        expect(items.map(item => item.mediaId)).toEqual(isTv ? [] : [1]);
    });
});
