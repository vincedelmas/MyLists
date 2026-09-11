import Database from "bun:sqlite";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {describe, expect, it} from "vitest";

const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
const seasonalIndex = migrations.findIndex(m => m.sql.some(s => s.includes("series_season_migration")));
const ratingCleanupIndex = migrations.findIndex(m => m.sql.some(s => s.includes("Remove ratings copied to seasons the user has not reached")));

describe("TV season-state migration", () => {
    it("preserves legacy ratings, ordered rewatches and unavailable rewatch data for both TV categories", () => {
        const db = new Database(":memory:");
        try {
            db.transaction(() => {
                for (const migration of migrations.slice(0, seasonalIndex)) {
                    for (const statement of migration.sql) db.exec(statement);
                }
            })();
            db.exec(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'migrating', 'migration@example.com', 1, '2025-01-01', '2025-01-01')`);
            for (const kind of ["series", "anime"]) {
                db.exec(`INSERT INTO ${kind} (id, api_id, name, image_cover, duration, total_seasons, total_episodes) VALUES (1, 1, 'Show', 'show.jpg', 30, 2, 16)`);
                // Array positions historically follow sorted metadata, even for non-consecutive numbers.
                db.exec(`INSERT INTO ${kind}_episodes_per_season (media_id, season, episodes) VALUES (1, 1, 8), (1, 3, 8)`);
                db.exec(`INSERT INTO ${kind}_list (id, user_id, media_id, status, current_season, current_episode, total, redo, rating) VALUES (1, 1, 1, 'Completed', 3, 8, 40, '[1,2]', 8.5)`);
                db.exec(`INSERT INTO ${kind} (id, api_id, name, image_cover, duration, total_seasons, total_episodes) VALUES (2, 2, 'Shrunk show', 'show.jpg', 30, 1, 8)`);
                db.exec(`INSERT INTO ${kind}_episodes_per_season (media_id, season, episodes) VALUES (2, 1, 8)`);
                db.exec(`INSERT INTO ${kind}_list (id, user_id, media_id, status, current_season, current_episode, total, redo, rating) VALUES (2, 1, 2, 'Completed', 1, 8, 8, '[0,2]', 0)`);
            }
            for (const kind of ["series", "anime"]) {
                for (const [id, rating] of [[3, "NULL"], [4, "8.25"]]) {
                    db.exec(`INSERT INTO ${kind} (id, api_id, name, image_cover, duration, total_seasons, total_episodes)
                        VALUES (${id}, ${id}, 'Rated show', 'show.jpg', 30, 1, 8)`);
                    db.exec(`INSERT INTO ${kind}_episodes_per_season (media_id, season, episodes) VALUES (${id}, 1, 8)`);
                    db.exec(`INSERT INTO ${kind}_list (id, user_id, media_id, status, current_season, current_episode, total, redo, rating)
                        VALUES (${id}, 1, ${id}, 'Completed', 1, 8, 8, '[0]', ${rating})`);
                }
                db.exec(`INSERT INTO user_media_settings (user_id, media_type, active) VALUES (1, '${kind}', 1)`);
            }
            db.exec("PRAGMA foreign_keys=ON");
            db.transaction(() => { for (const statement of migrations[seasonalIndex].sql) db.exec(statement); })();
            for (const kind of ["series", "anime"]) {
                expect(db.query(`SELECT season, redo, rating FROM ${kind}_list_seasons WHERE list_id = 1 ORDER BY season`).all()).toEqual([
                    { season: 1, redo: 1, rating: 8.5 }, { season: 3, redo: 2, rating: 8.5 },
                ]);
                expect(db.query(`SELECT redo, rating, total FROM ${kind}_list WHERE id = 1`).get()).toEqual({ redo: 3, rating: 8.5, total: 40 });
                expect(db.query(`SELECT season, redo, rating FROM ${kind}_list_seasons WHERE list_id = 2 ORDER BY season`).all()).toEqual([
                    { season: 1, redo: 0, rating: 0 }, { season: 2, redo: 2, rating: null },
                ]);
                expect(db.query(`SELECT redo FROM ${kind}_list WHERE id = 2`).get()).toEqual({ redo: 0 });
                expect(db.query(`SELECT rating FROM ${kind}_list WHERE id = 3`).get()).toEqual({ rating: null });
                expect(db.query(`SELECT rating FROM ${kind}_list WHERE id = 4`).get()).toEqual({ rating: 8.3 });
                expect(db.query(`SELECT rating FROM ${kind}_list_seasons WHERE list_id = 4`).get()).toEqual({ rating: 8.25 });
                expect(db.query(`SELECT entries_rated, sum_entries_rated, total_redo FROM user_media_settings WHERE media_type = '${kind}'`).get())
                    .toEqual({ entries_rated: 3, sum_entries_rated: 16.8, total_redo: 3 });
                expect(() => db.exec(`UPDATE ${kind}_list_seasons SET redo = 101 WHERE list_id = 1`)).toThrow();
                expect(() => db.exec(`UPDATE ${kind}_list_seasons SET rating = 11 WHERE list_id = 1`)).toThrow();
            }
            expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally { db.close(); }
    });
});

describe.each(["series", "anime"])("%s unwatched season rating migration", kind => {
    it("clears the legacy backfill beyond progress, preserves rewatches and refreshes rating statistics", () => {
        const scenarios = [
            { status: "Dropped", season: 2, episode: 10, redo: [0, 0, 0, 0], rating: 6, expected: [6, 6, null, null], average: 6 },
            { status: "Watching", season: 1, episode: 1, redo: [0, 0, 0, 0], rating: 8, expected: [8, null, null, null], average: 8 },
            { status: "On Hold", season: 2, episode: 0, redo: [0, 0, 0, 0], rating: 7, expected: [7, null, null, null], average: 7 },
            { status: "Completed", season: 4, episode: 12, redo: [0, 0, 0, 0], rating: 8.25, expected: [8.25, 8.25, 8.25, 8.25], average: 8.3 },
            { status: "Plan to Watch", season: 1, episode: 0, redo: [0, 0, 0, 0], rating: 9, expected: [null, null, null, null], average: null },
            { status: "Random", season: 1, episode: 0, redo: [0, 0, 0, 0], rating: 9, expected: [null, null, null, null], average: null },
            { status: "Watching", season: 2, episode: 1, redo: [0, 0, 0, 0], rating: 0, expected: [0, 0, null, null], average: 0 },
            { status: "Dropped", season: 2, episode: 10, redo: [0, 0, 0, 0], rating: null, expected: [null, null, null, null], average: null },
            { status: "Watching", season: 1, episode: 5, redo: [0, 0, 2, 0], rating: 7, expected: [7, null, 7, null], average: 7 },
            { status: "On Hold", season: 2, episode: 0, redo: [0, 1, 0, 0], rating: 6.5, expected: [6.5, 6.5, null, null], average: 6.5 },
        ];
        const db = new Database(":memory:");
        try {
            db.transaction(() => {
                for (const migration of migrations.slice(0, seasonalIndex)) {
                    for (const statement of migration.sql) db.exec(statement);
                }
            })();
            db.exec(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES
                (1, 'migrating', 'migration@example.com', 1, '2025-01-01', '2025-01-01'),
                (2, 'unwatched', 'unwatched@example.com', 1, '2025-01-01', '2025-01-01')`);
            for (const [index, scenario] of scenarios.entries()) {
                const id = index + 1;
                db.query(`INSERT INTO ${kind} (id, api_id, name, image_cover, duration, total_seasons, total_episodes)
                    VALUES (?, ?, 'Show', 'show.jpg', 30, 4, 48)`).run(id, id);
                db.query(`INSERT INTO ${kind}_episodes_per_season (media_id, season, episodes)
                    VALUES (?, 1, 12), (?, 2, 12), (?, 3, 12), (?, 4, 12)`).run(id, id, id, id);
                const total = (scenario.season - 1) * 12 + scenario.episode + scenario.redo.reduce((sum, redo) => sum + redo * 12, 0);
                db.query(`INSERT INTO ${kind}_list (id, user_id, media_id, status, current_season, current_episode, total, redo, rating)
                    VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`).run(id, id, scenario.status, scenario.season, scenario.episode, total, JSON.stringify(scenario.redo), scenario.rating);
            }
            db.exec(`INSERT INTO ${kind}_list (id, user_id, media_id, status, current_season, current_episode, redo, rating)
                VALUES (100, 2, 1, 'Plan to Watch', 1, 0, '[0,0,0,0]', 9)`);
            db.exec(`INSERT INTO user_media_settings (user_id, media_type, active) VALUES (1, '${kind}', 1), (2, '${kind}', 1), (1, 'movies', 1)`);
            db.exec("PRAGMA foreign_keys=ON");
            db.transaction(() => {
                for (const migration of migrations.slice(seasonalIndex, ratingCleanupIndex)) {
                    for (const statement of migration.sql) db.exec(statement);
                }
            })();
            const listsBefore = db.query<Record<string, unknown>, []>(`SELECT * FROM ${kind}_list ORDER BY id`).all();
            const movieStatsBefore = db.query("SELECT * FROM user_media_settings WHERE media_type = 'movies'").get();

            db.transaction(() => { for (const statement of migrations[ratingCleanupIndex].sql) db.exec(statement); })();

            for (const [index, scenario] of scenarios.entries()) {
                const id = index + 1;
                expect(db.query(`SELECT season, redo, rating FROM ${kind}_list_seasons WHERE list_id = ? ORDER BY season`).all(id))
                    .toEqual(scenario.expected.map((rating, position) => ({ season: position + 1, redo: scenario.redo[position], rating })));
                expect(db.query(`SELECT * FROM ${kind}_list WHERE id = ?`).get(id))
                    .toEqual({ ...listsBefore[index], rating: scenario.average });
            }
            expect(db.query(`SELECT * FROM ${kind}_list WHERE id = 100`).get()).toEqual({ ...listsBefore.at(-1), rating: null });
            expect(db.query(`SELECT COUNT(rating) AS rated FROM ${kind}_list_seasons WHERE list_id = 100`).get()).toEqual({ rated: 0 });
            expect(db.query(`SELECT entries_rated, sum_entries_rated, total_redo FROM user_media_settings WHERE user_id = 1 AND media_type = ?`).get(kind))
                .toEqual({ entries_rated: 7, sum_entries_rated: 42.8, total_redo: 3 });
            expect(db.query<{ average_rating: number }, [string]>(`SELECT average_rating FROM user_media_settings WHERE user_id = 1 AND media_type = ?`).get(kind)!.average_rating)
                .toBeCloseTo(42.8 / 7);
            expect(db.query(`SELECT entries_rated, sum_entries_rated, average_rating FROM user_media_settings WHERE user_id = 2 AND media_type = ?`).get(kind))
                .toEqual({ entries_rated: 0, sum_entries_rated: 0, average_rating: null });
            expect(db.query("SELECT * FROM user_media_settings WHERE media_type = 'movies'").get()).toEqual(movieStatsBefore);
            expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally { db.close(); }
    });

    it.each([
        { first: 6, second: 8.1, previous: 8, expected: 7.1 },
        { first: 8.1, second: 8.2, previous: 8.8, expected: 8.1 },
    ])("averages $first and $second by season number and excludes unavailable seasons", scenario => {
        const db = new Database(":memory:");
        try {
            db.transaction(() => {
                for (const migration of migrations.slice(0, ratingCleanupIndex)) {
                    for (const statement of migration.sql) db.exec(statement);
                }
            })();
            db.exec("PRAGMA foreign_keys=ON");
            db.exec(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
                VALUES (1, 'migrating', 'migration@example.com', 1, '2025-01-01', '2025-01-01')`);
            db.exec(`INSERT INTO ${kind} (id, api_id, name, image_cover, duration, total_seasons, total_episodes)
                VALUES (1, 1, 'Changed seasons', 'show.jpg', 30, 3, 36)`);
            db.exec(`INSERT INTO ${kind}_episodes_per_season (media_id, season, episodes) VALUES (1, 1, 12), (1, 3, 12), (1, 5, 12)`);
            db.exec(`INSERT INTO ${kind}_list (id, user_id, media_id, status, current_season, current_episode, total, rating)
                VALUES (1, 1, 1, 'Dropped', 3, 2, 14, ${scenario.previous})`);
            db.exec(`INSERT INTO ${kind}_list_seasons (list_id, season, redo, rating)
                VALUES (1, 1, 0, ${scenario.first}), (1, 3, 0, ${scenario.second}), (1, 5, 0, 10), (1, 7, 1, 10)`);
            db.exec(`INSERT INTO user_media_settings (user_id, media_type, active, entries_rated, sum_entries_rated, average_rating)
                VALUES (1, '${kind}', 1, 1, ${scenario.previous}, ${scenario.previous})`);

            db.transaction(() => { for (const statement of migrations[ratingCleanupIndex].sql) db.exec(statement); })();

            expect(db.query(`SELECT season, redo, rating FROM ${kind}_list_seasons ORDER BY season`).all()).toEqual([
                { season: 1, redo: 0, rating: scenario.first }, { season: 3, redo: 0, rating: scenario.second },
                { season: 5, redo: 0, rating: null }, { season: 7, redo: 1, rating: 10 },
            ]);
            expect(db.query(`SELECT rating FROM ${kind}_list WHERE id = 1`).get()).toEqual({ rating: scenario.expected });
            expect(db.query("SELECT entries_rated, sum_entries_rated, average_rating FROM user_media_settings").get())
                .toEqual({ entries_rated: 1, sum_entries_rated: scenario.expected, average_rating: scenario.expected });
            expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally { db.close(); }
    });
});
