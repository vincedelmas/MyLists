import Database from "bun:sqlite";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {expect, it} from "vitest";
import {dynamicListSpecSchema} from "@/lib/schemas/dynamic-lists.schema";

it("unifies stored media statuses, sums counts, and preserves progress and user text", () => {
    const db = new Database(":memory:");
    const legacy = ["Plan to Watch", "Plan to Read", "Plan to Play", "Watching", "Reading", "Playing", "Completed"];
    const expected = ["Planned", "Planned", "Planned", "In Progress", "In Progress", "In Progress", "Completed"];
    try {
        for (const kind of ["movies", "series", "anime", "books", "manga", "games"]) {
            db.run(`CREATE TABLE ${kind}_list (status TEXT, progress INTEGER)`);
            for (const status of legacy) db.query(`INSERT INTO ${kind}_list VALUES (?, 12)`).run(status);
        }
        for (const table of ["user_media_settings", "user_media_stats_history"]) {
            db.run(`CREATE TABLE ${table} (status_counts TEXT)`);
            db.query(`INSERT INTO ${table} VALUES (?)`).run(JSON.stringify({ Watching: 2, Reading: 3, Playing: 4, "In Progress": 1, "Plan to Watch": 5, "Plan to Play": 6, "Plan to Read": 7, Completed: 8 }));
            db.run(`INSERT INTO ${table} VALUES ('{}')`);
        }
        db.run("CREATE TABLE user_media_update (update_type TEXT, payload TEXT)");
        db.run(`INSERT INTO user_media_update VALUES ('status', '{"old_value":"Plan to Watch","new_value":"Watching"}'), ('comment', '{"old_value":"Reading","new_value":"Playing"}'), ('status', '{"old_value":null,"new_value":"Completed"}')`);
        db.run("CREATE TABLE import_items (payload_json TEXT)");
        db.run(`INSERT INTO import_items VALUES ('{"status":"Playing","comment":"Watching","playtime":123}')`);
        db.run("CREATE TABLE smart_views (spec TEXT)");
        db.run(`INSERT INTO smart_views VALUES ('{"filters":{"statuses":["Watching","Reading","Completed","Plan to Watch","Plan to Read"],"search":"Watching"}}'), ('{"filters":{"statusGroup":"planned"}}')`);

        const migration = readMigrationFiles({ migrationsFolder: "./drizzle" }).find(m => m.sql.some(statement => statement.includes("CREATE TEMP TABLE media_status_names")))!;
        db.transaction(() => { for (const statement of migration.sql) db.run(statement); })();

        for (const kind of ["movies", "series", "anime", "books", "manga", "games"]) {
            expect(db.query(`SELECT * FROM ${kind}_list`).all()).toEqual(expected.map(status => ({ status, progress: 12 })));
        }
        for (const table of ["user_media_settings", "user_media_stats_history"]) {
            const rows = db.query<{ status_counts: string }, []>(`SELECT * FROM ${table}`).all();
            expect(JSON.parse(rows[0].status_counts)).toEqual({ "In Progress": 10, Planned: 18, Completed: 8 });
            expect(JSON.parse(rows[1].status_counts)).toEqual({});
        }
        expect(db.query<{ payload: string }, []>("SELECT payload FROM user_media_update").all().map(row => JSON.parse(row.payload))).toEqual([
            { old_value: "Planned", new_value: "In Progress" },
            { old_value: "Reading", new_value: "Playing" },
            { old_value: null, new_value: "Completed" },
        ]);
        expect(JSON.parse(db.query<{ payload_json: string }, []>("SELECT * FROM import_items").get()!.payload_json)).toEqual({ status: "In Progress", comment: "Watching", playtime: 123 });
        expect(db.query<{ spec: string }, []>("SELECT * FROM smart_views").all().map(row => JSON.parse(row.spec))).toEqual([
            { filters: { statuses: ["In Progress", "Completed", "Planned"], search: "Watching" } },
            { filters: { statusGroup: "planned" } },
        ]);
    }
    finally {
        db.close();
    }
});

it("migrates legacy dynamic lists through both status migrations into valid current specs", () => {
    const db = new Database(":memory:");
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
    const statusMigrationIndex = migrations.findIndex(m => m.sql.some(statement => statement.includes("CREATE TEMP TABLE media_status_names")));
    const base = { version: 2, display: "grid", mediaTypes: "all", sort: { field: "addedAt", direction: "asc" }, title: "Keep this title" };
    try {
        db.transaction(() => {
            for (const migration of migrations.slice(0, statusMigrationIndex)) {
                for (const statement of migration.sql) db.run(statement);
            }
        })();
        db.run("PRAGMA foreign_keys = ON");
        db.run("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'owner', 'owner@example.invalid', 1, '2026-01-01', '2026-01-01')");
        const groups = { planned: "Planned", in_progress: "In Progress", completed: "Completed", on_hold: "On Hold", dropped: "Dropped" };
        const filters = [
            ...Object.keys(groups).map(statusGroup => ({ statusGroup, minRating: 7 })),
            { statusGroup: "completed", statuses: ["Plan to Watch", "Completed"] },
            { statusGroup: "planned", statuses: ["Completed"] },
            { statusGroup: "in_progress", statuses: ["Watching", "Reading", "Playing", "Completed"] },
            { statuses: ["Watching", "Reading", "Playing", "Completed"] },
            {},
        ];
        const insert = db.query("INSERT INTO smart_views (user_id, spec) VALUES (1, ?)");
        for (const filter of filters) insert.run(JSON.stringify({ ...base, filters: filter }));

        db.transaction(() => {
            for (const migration of migrations.slice(statusMigrationIndex, statusMigrationIndex + 2)) {
                for (const statement of migration.sql) db.run(statement);
            }
        })();
        const specs = db.query<{ spec: string }, []>("SELECT spec FROM smart_views ORDER BY id").all()
            .map(row => dynamicListSpecSchema.parse(JSON.parse(row.spec)));
        expect(specs).toEqual([
            ...Object.values(groups).map(status => ({ ...base, filters: { statuses: [status], minRating: 7 } })),
            { ...base, filters: { statuses: ["Completed"] } },
            { ...base, filters: { statuses: [] } },
            { ...base, filters: { statuses: ["In Progress"] } },
            { ...base, filters: { statuses: ["In Progress", "Completed"] } },
            { ...base, filters: {} },
        ]);
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    }
    finally {
        db.close();
    }
});
