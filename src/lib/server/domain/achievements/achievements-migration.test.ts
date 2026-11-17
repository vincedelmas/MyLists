import Database from "bun:sqlite";
import {expect, it} from "vitest";
import {readMigrationFiles} from "drizzle-orm/migrator";


it.each([false, true])("keeps achievement progress when removing the extra ID (foreign keys: %s)", foreignKeys => {
    const db = new Database(":memory:");
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
    const index = migrations.findIndex(migration => migration.sql.some(statement =>
        statement.includes("CREATE INDEX `ix_user_achievement_tier_user`"),
    ));

    try {
        expect(index).toBeGreaterThan(0);
        db.transaction(() => {
            for (const migration of migrations.slice(0, index)) {
                for (const statement of migration.sql) db.run(statement);
            }
        })();
        db.run(`PRAGMA foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
        db.run(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
            VALUES (1, 'player', 'player@example.invalid', 1, '2026-01-01', '2026-01-01')`);
        db.run(`INSERT INTO achievement (id, name, description, code_name, media_type)
            VALUES (10, 'Movie fan', 'Finish movies', 'movie-fan', 'movies'),
                (20, 'Book fan', 'Finish books', 'book-fan', 'books')`);
        db.run(`INSERT INTO achievement_tier (id, achievement_id, difficulty, criteria)
            VALUES (101, 10, 'bronze', '{"count":2}'),
                (102, 10, 'platinum', '{"count":4}'),
                (201, 20, 'bronze', '{"count":2}')`);
        db.run(`INSERT INTO user_achievement
            (id, user_id, achievement_id, tier_id, progress, count, completed, completed_at, last_calculated_at)
            VALUES (5, 1, 10, 101, 100, 2, 1, '2026-03-01 12:00:00', '2026-03-02 12:00:00'),
                (8, 1, 10, 102, 50, 2, 0, NULL, '2026-03-02 12:00:00'),
                (9, 1, 20, 201, NULL, NULL, NULL, NULL, NULL)`);

        const progressBefore = db.query<Record<string, unknown>, []>("SELECT * FROM user_achievement ORDER BY id")
            .all().map(({ achievement_id: _achievementId, ...row }) => row);
        const achievementsBefore = db.query("SELECT * FROM achievement ORDER BY id").all();
        const tiersBefore = db.query("SELECT * FROM achievement_tier ORDER BY id").all();

        db.transaction(() => {
            for (const statement of migrations[index].sql) db.run(statement);
        })();

        expect(db.query("SELECT * FROM user_achievement ORDER BY id").all()).toEqual(progressBefore);
        expect(db.query("SELECT * FROM achievement ORDER BY id").all()).toEqual(achievementsBefore);
        expect(db.query("SELECT * FROM achievement_tier ORDER BY id").all()).toEqual(tiersBefore);
        expect(db.query<{ name: string }, []>("PRAGMA table_info(user_achievement)").all()
            .some(column => column.name === "achievement_id")).toBe(false);
        expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: Number(foreignKeys) });
        db.run("PRAGMA foreign_keys = ON");

        expect(() => db.run("INSERT INTO user_achievement (user_id, tier_id) VALUES (1, 999)"))
            .toThrow("FOREIGN KEY constraint failed");
        expect(() => db.run("INSERT INTO user_achievement (user_id, tier_id) VALUES (1, 101)"))
            .toThrow("UNIQUE constraint failed");
        expect(() => db.run("UPDATE user_achievement SET progress = 101 WHERE id = 5"))
            .toThrow("CHECK constraint failed");

        db.run("DELETE FROM achievement_tier WHERE id = 102");
        expect(db.query("SELECT * FROM user_achievement ORDER BY id").all())
            .toEqual(progressBefore.filter(row => row.tier_id !== 102));
        db.run("DELETE FROM achievement WHERE id = 10");
        expect(db.query("SELECT * FROM user_achievement ORDER BY id").all())
            .toEqual(progressBefore.filter(row => row.tier_id === 201));
        db.run("DELETE FROM user WHERE id = 1");
        expect(db.query("SELECT * FROM user_achievement").all()).toEqual([]);
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    }
    finally {
        db.close();
    }
});
