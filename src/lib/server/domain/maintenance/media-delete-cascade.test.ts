import Database from "bun:sqlite";
import {expect, it} from "vitest";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";


it("cascades detail deletion for untracked titles and preserves shared tags", () => {
    const db = new Database(":memory:");
    const details = {
        movies: ["genre", "actors", "tags"],
        series: ["genre", "actors", "network", "episodes_per_season", "tags"],
        anime: ["genre", "actors", "network", "episodes_per_season", "tags"],
        games: ["genre", "platforms", "companies", "tags"],
        books: ["genre", "authors", "tags"],
        manga: ["genre", "authors", "tags"],
    };

    try {
        migrate(drizzle({ client: db }), { migrationsFolder: "./drizzle" });
        db.run("PRAGMA foreign_keys = ON");
        db.run(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
            VALUES (1, 'owner', 'owner@example.invalid', 1, '2026-01-01', '2026-01-01')`);

        const before = new Map<string, Record<string, unknown>[]>();
        for (const [type, suffixes] of Object.entries(details)) {
            const tv = type === "series" || type === "anime";
            const mediaColumns = tv ? ", duration, total_seasons, total_episodes"
                : type === "movies" ? ", duration"
                : type === "books" ? ", pages" : "";
            const mediaValues = tv ? ", 24, 1, 12" : type === "movies" || type === "books" ? ", 100" : "";
            db.query("INSERT INTO media_tags (user_id, media_type, name) VALUES (1, ?, 'Keep this tag')").run(type);
            const { id: tagId } = db.query<{ id: number }, [string]>("SELECT id FROM media_tags WHERE media_type = ?").get(type)!;

            for (const id of [1, 2]) {
                db.query(`INSERT INTO ${type} (id, api_id, name, image_cover${mediaColumns}) VALUES (?, ?, 'Title', 'cover.jpg'${mediaValues})`).run(id, id);
                for (const suffix of suffixes) {
                    const columns = suffix === "tags" ? "user_id, tag_id"
                        : suffix === "episodes_per_season" ? "season, episodes"
                        : suffix === "companies" ? "name, publisher, developer" : "name";
                    const values = suffix === "tags" ? `1, ${tagId}`
                        : suffix === "episodes_per_season" ? "1, 12"
                        : suffix === "companies" ? "'Studio', 1, 1" : "'Shared name'";
                    db.query(`INSERT INTO ${type}_${suffix} (id, media_id, ${columns}) VALUES (?, ?, ${values})`).run(id, id);
                }
            }

            const listColumns = tv ? ", current_season, current_episode" : type === "manga" ? ", current_chapter" : "";
            const listValues = tv ? ", 1, 5" : type === "manga" ? ", 10" : "";
            db.run(`INSERT INTO ${type}_list (id, user_id, media_id, status, rating, comment${listColumns})
                VALUES (2, 1, 2, 'In Progress', 7.5, 'Keep this comment'${listValues})`);
            if (tv) db.run(`INSERT INTO ${type}_list_seasons (list_id, season, redo, rating) VALUES (2, 1, 2, 8)`);

            const tables = [
                type,
                `${type}_list`,
                ...suffixes.map(suffix => `${type}_${suffix}`),
                ...(tv ? [`${type}_list_seasons`] : []),
            ];
            for (const table of tables) {
                before.set(table, db.query<Record<string, unknown>, []>(`SELECT * FROM ${table} ORDER BY 1`).all());
            }
        }
        const tagsBefore = db.query("SELECT * FROM media_tags ORDER BY id").all();

        for (const [type, suffixes] of Object.entries(details)) {
            expect(() => db.run(`DELETE FROM ${type} WHERE id IN (1, 2)`)).toThrow("FOREIGN KEY constraint failed");
            expect(db.query(`SELECT * FROM ${type} ORDER BY id`).all()).toEqual(before.get(type));
            for (const suffix of suffixes) {
                const table = `${type}_${suffix}`;
                expect(db.query(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(before.get(table));
            }

            db.run(`DELETE FROM ${type} WHERE id = 1`);

            for (const suffix of suffixes) {
                const table = `${type}_${suffix}`;
                expect(db.query(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(before.get(table)!.filter(row => row.media_id === 2));
            }
            expect(db.query(`SELECT * FROM ${type} ORDER BY id`).all()).toEqual(before.get(type)!.filter(row => row.id === 2));
            expect(db.query(`SELECT * FROM ${type}_list ORDER BY id`).all()).toEqual(before.get(`${type}_list`));
            if (type === "series" || type === "anime") {
                expect(db.query(`SELECT * FROM ${type}_list_seasons ORDER BY list_id, season`).all()).toEqual(before.get(`${type}_list_seasons`));
            }
        }
        expect(db.query("SELECT * FROM media_tags ORDER BY id").all()).toEqual(tagsBefore);
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    }
    finally {
        db.close();
    }
});
