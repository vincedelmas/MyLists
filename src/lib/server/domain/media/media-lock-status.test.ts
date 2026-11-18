import {relations} from "@/lib/server/database/relations";
import Database from "bun:sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {type SQLiteBunDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


const dbContext = vi.hoisted(() => ({ db: undefined as SQLiteBunDatabase<typeof relations> | undefined }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));

const { createMoviesRepository } = await import("./movies/movies.repository");
const { createGamesRepository } = await import("./games/games.repository");
const { createMangaRepository } = await import("./manga/manga.repository");
const { createTvRepository } = await import("./tv/tv.repository");

const repositories = {
    movies: createMoviesRepository(),
    games: createGamesRepository(),
    manga: createMangaRepository(),
    series: createTvRepository(seriesServerDefinition),
    anime: createTvRepository(animeServerDefinition),
};


describe("media lock defaults", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle({ client: sqlite, relations });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each([
        ["movies", ", duration", ", 120"],
        ["games", "", ""],
        ["manga", "", ""],
        ["books", ", pages", ", 250"],
        ["series", ", duration, total_seasons, total_episodes", ", 45, 1, 10"],
        ["anime", ", duration, total_seasons, total_episodes", ", 24, 1, 12"],
    ] as const)("defaults imported %s to unlocked", async (kind, columns, values) => {
        // Provider imports omit lock_status. Once stale, these rows must be eligible for refresh.
        sqlite.run(`INSERT INTO ${kind} (id, api_id, name, image_cover, last_api_update${columns})
            VALUES (1, 1, 'Imported title', 'cover.jpg', '2000-01-01 00:00:00'${values}),
                   (2, 2, 'Fresh title', 'cover.jpg', CURRENT_TIMESTAMP${values})`);
        expect(sqlite.query(`SELECT lock_status FROM ${kind} WHERE id = 1`).get()).toEqual({ lock_status: 0 });
        expect(() => sqlite.run(`UPDATE ${kind} SET lock_status = NULL WHERE id = 1`)).toThrow(/NOT NULL/);
        if (kind !== "books") {
            const candidates = await repositories[kind].getMediaIdsToBeRefreshed([1, 2]);
            expect(candidates).toEqual([1]);
        }
    });
});
