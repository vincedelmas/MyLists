import Database from "bun:sqlite";
import {readMigrationFiles} from "drizzle-orm/migrator";
import * as schema from "@/lib/server/database/schema";
import {type BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


const dbContext = vi.hoisted(() => ({ db: undefined as BunSQLiteDatabase<typeof schema> | undefined }));
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
const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
const lockMigrationIndex = migrations.findIndex(m => m.sql.some(s => s.includes("new_lock_status")));


describe("media lock defaults", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        sqlite.transaction(() => {
            for (const migration of migrations.slice(0, lockMigrationIndex)) {
                for (const statement of migration.sql) sqlite.exec(statement);
            }
        })();
        sqlite.exec("PRAGMA foreign_keys=ON");
        sqlite.exec(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
            VALUES (1, 'Reader', 'reader@example.com', 1, '2025-01-01', '2025-01-01')`);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each([
        ["movies", ", duration", ", 120", "", ""],
        ["games", "", "", "", ""],
        ["manga", "", "", ", current_chapter", ", 5"],
        ["books", ", pages", ", 250", "", ""],
        ["series", ", duration, total_seasons, total_episodes", ", 45, 1, 10", ", current_season, current_episode", ", 1, 5"],
        ["anime", ", duration, total_seasons, total_episodes", ", 24, 1, 12", ", current_season, current_episode", ", 1, 5"],
    ] as const)("repairs existing locks and defaults new %s to unlocked without losing related data", async (kind, columns, values, listColumns, listValues) => {
        for (const [id, lockStatus] of [[1, "NULL"], [2, "0"], [3, "1"]]) {
            sqlite.exec(`INSERT INTO ${kind} (id, api_id, name, image_cover, lock_status, last_api_update${columns})
                VALUES (${id}, ${id}, 'Title ${id}', 'cover.jpg', ${lockStatus}, '2000-01-01 00:00:00'${values})`);
        }
        sqlite.exec(`INSERT INTO ${kind}_genre (media_id, name) VALUES (1, 'Drama')`);
        sqlite.exec(`INSERT INTO ${kind}_list (id, user_id, media_id, status, rating${listColumns})
            VALUES (1, 1, 1, 'Completed', 8.5${listValues})`);
        if (kind === "series" || kind === "anime") {
            sqlite.exec(`INSERT INTO ${kind}_list_seasons (list_id, season, redo, rating) VALUES (1, 1, 2, 8.5)`);
        }
        const mediaBefore = sqlite.prepare<Record<string, unknown>, []>(`SELECT * FROM ${kind} ORDER BY id`).all();
        const listBefore = sqlite.query(`SELECT * FROM ${kind}_list`).all();
        const genresBefore = sqlite.query(`SELECT * FROM ${kind}_genre`).all();

        sqlite.transaction(() => {
            for (const statement of migrations[lockMigrationIndex].sql) sqlite.exec(statement);
        })();

        expect(sqlite.prepare(`SELECT * FROM ${kind} ORDER BY id`).all())
            .toEqual(mediaBefore.map(row => ({ ...row, lock_status: row.lock_status ?? 0 })));
        expect(sqlite.query(`SELECT * FROM ${kind}_list`).all()).toEqual(listBefore);
        expect(sqlite.query(`SELECT * FROM ${kind}_genre`).all()).toEqual(genresBefore);
        if (kind === "series" || kind === "anime") {
            expect(sqlite.query(`SELECT * FROM ${kind}_list_seasons`).all())
                .toEqual([{ list_id: 1, season: 1, redo: 2, rating: 8.5 }]);
        }
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);

        // Provider imports omit lock_status. Once stale, these rows must be eligible for refresh.
        sqlite.exec(`INSERT INTO ${kind} (id, api_id, name, image_cover, last_api_update${columns})
            VALUES (4, 4, 'Imported title', 'cover.jpg', '2000-01-01 00:00:00'${values}),
                   (5, 5, 'Fresh title', 'cover.jpg', CURRENT_TIMESTAMP${values})`);
        expect(sqlite.query(`SELECT lock_status FROM ${kind} WHERE id = 4`).get()).toEqual({ lock_status: 0 });
        expect(() => sqlite.exec(`UPDATE ${kind} SET lock_status = NULL WHERE id = 4`)).toThrow(/NOT NULL/);
        if (kind !== "books") {
            const candidates = await repositories[kind].getMediaIdsToBeRefreshed([1, 2, 3, 4, 5]);
            expect(candidates.sort((a, b) => a - b)).toEqual([1, 2, 4]);
        }
    });
});
