import Database from "bun:sqlite";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {FormattedError} from "@/lib/utils/error-classes";
import {createQueryTestSource} from "@/lib/server/domain/mcp/query-snapshot.fixture";
import {QUERY_SNAPSHOT_LIMITS} from "@/lib/server/core/mcp/config";
import {buildQuerySnapshot, QUERY_SCHEMA} from "@/lib/server/domain/mcp/query-snapshot";


const mediaTypes = ["movies", "series", "anime", "games", "books", "manga"];


describe("MCP query snapshots", () => {
    let source: Database;
    const snapshots: Database[] = [];

    beforeEach(() => {
        source = createQueryTestSource();
        source.transaction(() => {
            const addUser = source.query(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at, privacy, role)
                VALUES (?, ?, ?, 1, '2026-01-01', '2026-01-01', ?, ?)`);
            for (const [id, privacy, role] of [[1, "private", "admin"], [2, "private", "user"], [3, "private", "user"], [4, "private", "user"], [5, "public", "user"], [6, "public", "user"]] as const) {
                addUser.run(id, `user-${id}`, `secret-${id}@example.invalid`, privacy, role);
                for (const type of mediaTypes) source.run("INSERT INTO user_media_settings (user_id, media_type, active) VALUES (?, ?, ?)", [id, type, id === 6 ? 0 : 1]);
            }
            source.exec(`INSERT INTO followers (follower_id, followed_id, status) VALUES
                (1, 2, 'accepted'), (1, 3, 'requested'), (4, 1, 'accepted'), (1, 6, 'accepted')`);

            for (const type of mediaTypes) {
                const required = type === "movies" ? ", duration" : type === "series" || type === "anime" ? ", duration, total_seasons, total_episodes" : type === "books" ? ", pages" : "";
                const values = type === "movies" ? ", 120" : type === "series" || type === "anime" ? ", 24, 2, 36" : type === "books" ? ", 300" : "";
                source.exec(`INSERT INTO ${type} (id, api_id, name, image_cover${required}) VALUES
                    (10, '10', '${type} shared', 'cover.jpg'${values}),
                    (90, '90', '${type} unrelated secret', 'cover.jpg'${values}),
                    (80, '80', '${type} historical', 'cover.jpg'${values})`);

                const progress = type === "series" || type === "anime" ? ", current_season, current_episode" : type === "manga" ? ", current_chapter" : "";
                const position = type === "series" || type === "anime" ? ", 1, 3" : type === "manga" ? ", 10" : "";
                for (const id of [1, 2, 3, 4, 5, 6]) {
                    source.run(`INSERT INTO ${type}_list (id, user_id, media_id, status, rating, comment${progress}) VALUES (?, ?, ?, 'Completed', ?, ?${position})`, [id * 100, id, id === 1 || id === 2 ? 10 : 90, id === 1 ? 9 : 7, `comment-user-${id}`]);
                    source.run(`INSERT INTO ${type}_tags (user_id, media_id, name) VALUES (?, 10, ?)`, [id, `label-user-${id}`]);
                    source.run(`INSERT INTO ${type}_tags (user_id, name) VALUES (?, ?)`, [id, `unattached-user-${id}`]);
                    source.run("INSERT INTO user_media_monthly_activity (user_id, media_type, media_id, month_bucket, progress_gained, redo_gained) VALUES (?, ?, ?, '2026-01', 10, 0)", [id, type, id === 1 || id === 2 ? 10 : 90]);
                }
                source.run("INSERT INTO user_media_monthly_activity (user_id, media_type, media_id, month_bucket, progress_gained, hidden) VALUES (1, ?, 10, '2026-02', 20, 1)", [type]);
                source.run("INSERT INTO user_media_monthly_activity (user_id, media_type, media_id, month_bucket, progress_gained) VALUES (1, ?, 80, '2025-12', 1)", [type]);
                source.exec(`INSERT INTO ${type}_genre (media_id, name) VALUES (10, 'Known genre'), (80, 'Historical genre'), (90, 'Secret genre')`);
                if (type === "series" || type === "anime") {
                    source.exec(`INSERT INTO ${type}_list_seasons (list_id, season, rating, redo) VALUES (100, 1, 8, 1), (200, 2, 7, 0), (300, 1, 2, 0)`);
                    source.exec(`INSERT INTO ${type}_episodes_per_season (media_id, season, episodes) VALUES (10, 1, 12), (10, 2, 24)`);
                    source.exec(`INSERT INTO ${type}_network (media_id, name) VALUES (10, 'Known network'), (90, 'Secret network')`);
                }
                if (["movies", "series", "anime"].includes(type)) source.exec(`INSERT INTO ${type}_actors (media_id, name) VALUES (10, 'Known actor'), (80, 'Historical actor'), (90, 'Secret actor')`);
                if (type === "books" || type === "manga") source.exec(`INSERT INTO ${type}_authors (media_id, name) VALUES (10, 'Known author'), (90, 'Secret author')`);
            }
            source.exec("INSERT INTO games_companies (media_id, name, developer, publisher) VALUES (10, 'Known company', 1, 0), (10, 'Known company', 0, 1), (10, 'Known company', 1, 1)");
            source.exec("INSERT INTO games_platforms (media_id, name) VALUES (10, 'PC'), (90, 'Secret platform')");
            source.exec("UPDATE movies SET original_language = 'fr', director_name = 'Known director', compositor_name = 'Known composer', budget = 1000, revenue = 2000 WHERE id = 10");
            source.exec("UPDATE series SET created_by = 'Known creator', origin_country = 'FR', prod_status = 'Ended' WHERE id = 10");
            source.exec("UPDATE books SET language = 'fr', publishers = 'Known publisher' WHERE id = 10");
            source.exec("UPDATE manga SET chapters = 100, volumes = 10, publishers = 'Known publisher', prod_status = 'Finished' WHERE id = 10");
            source.exec("UPDATE games SET game_engine = 'Known engine', game_modes = 'Single player', player_perspective = 'Third person', hltb_main_time = 10 WHERE id = 10");
        })();
    });

    afterEach(() => {
        for (const snapshot of snapshots.splice(0)) snapshot.close();
        source.close();
    });

    const openSnapshot = (userId = 1) => {
        const result = buildQuerySnapshot(source, userId);
        const snapshot = Database.deserialize(result.data, { readonly: true });
        snapshots.push(snapshot);
        return { snapshot, result };
    };

    it("exports all six own active lists, typed progress and documented facets without account data", () => {
        const { snapshot, result } = openSnapshot();
        expect(snapshot.query("SELECT media_type FROM my_entries ORDER BY media_type").all()).toEqual([...mediaTypes].sort().map(media_type => ({ media_type })));
        expect(snapshot.query("SELECT * FROM profiles").all()).toEqual([{ profile_id: 1, username: "user-1", rating_system: "score" }]);
        expect(snapshot.query("SELECT title, rating, duration_minutes, language, budget FROM my_entries WHERE media_type = 'movies'").get()).toEqual({ title: "movies shared", rating: 9, duration_minutes: 120, language: "fr", budget: 1000 });
        expect(snapshot.query("SELECT chapter_count, volume_count, current_chapter, duration_minutes FROM my_entries WHERE media_type = 'manga'").get()).toEqual({ chapter_count: 100, volume_count: 10, current_chapter: 10, duration_minutes: null });
        expect(snapshot.query("SELECT role, name FROM media_people WHERE media_type = 'games' ORDER BY role").all()).toEqual([{ role: "developer", name: "Known company" }, { role: "publisher", name: "Known company" }]);
        expect(snapshot.query("SELECT kind, name FROM media_attributes WHERE media_type = 'series' ORDER BY kind").all()).toEqual([{ kind: "country", name: "FR" }, { kind: "network", name: "Known network" }, { kind: "production_status", name: "Ended" }]);
        expect(snapshot.query("SELECT name FROM sqlite_schema WHERE type = 'view'").all()).toEqual([{ name: "my_entries" }]);
        const tables = snapshot.query<{ name: string }, []>("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").all().map(row => row.name);
        expect(tables).toEqual(["activity", "entries", "labels", "media_attributes", "media_genres", "media_people", "profiles", "seasons"]);
        expect(() => snapshot.query("SELECT email FROM profiles").all()).toThrow();
        expect(() => snapshot.query("SELECT * FROM account").all()).toThrow();
        expect(() => snapshot.run("DELETE FROM entries")).toThrow("readonly");
        expect(result.rowCount).toBe(tables.reduce((count, table) => count + snapshot.query<{ count: number }, []>(`SELECT COUNT(*) AS count FROM ${table}`).get()!.count, 0));
        expect(result.extractionMs).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(result.snapshotAt))).toBe(false);
        expect(QUERY_SCHEMA).toContain("my_entries");
    });

    it("excludes accepted follows, pending requests, incoming followers and unrelated public profiles, even for admins", () => {
        const { snapshot } = openSnapshot();
        expect(snapshot.query("SELECT profile_id FROM profiles").all()).toEqual([{ profile_id: 1 }]);
        expect(snapshot.query("SELECT DISTINCT profile_id FROM entries").all()).toEqual([{ profile_id: 1 }]);
        expect(snapshot.query("SELECT DISTINCT comment FROM entries").all()).toEqual([{ comment: "comment-user-1" }]);
        expect(snapshot.query("SELECT DISTINCT media_id FROM media_genres ORDER BY media_id").all()).toEqual([{ media_id: 10 }, { media_id: 80 }]);
        expect(snapshot.query("SELECT name FROM media_people WHERE name LIKE '%Secret%'").all()).toEqual([]);
        expect(snapshot.query("SELECT name FROM media_attributes WHERE name LIKE '%Secret%'").all()).toEqual([]);
    });

    it("orders the documented recent-edits query chronologically across stored timestamp formats", () => {
        source.exec("UPDATE movies_list SET last_updated = '2026-01-02T01:00:00.000Z' WHERE user_id = 1 AND media_id = 10");
        source.exec("INSERT INTO movies_list (user_id, media_id, status, rating, last_updated) VALUES (1, 80, 'Completed', 9, '2026-01-02 02:00:00')");

        const { snapshot } = openSnapshot();
        const example = QUERY_SCHEMA.slice(QUERY_SCHEMA.lastIndexOf("SELECT title, rating"));
        expect(snapshot.query(example).all()).toEqual([
            { title: "movies historical", rating: 9 },
            { title: "movies shared", rating: 9 },
        ]);
    });

    it("scopes labels and seasons by their own profile, including shared-media labels", () => {
        const { snapshot } = openSnapshot();
        expect(snapshot.query("SELECT DISTINCT name FROM labels ORDER BY name").all()).toEqual([{ name: "label-user-1" }]);
        expect(snapshot.query("SELECT profile_id, season, episode_count FROM seasons WHERE media_type = 'series' ORDER BY profile_id").all()).toEqual([{ profile_id: 1, season: 1, episode_count: 12 }]);
    });

    it("excludes hidden activity while retaining visible history and catalog facets for removed entries", () => {
        const { snapshot } = openSnapshot();
        expect(snapshot.query("SELECT DISTINCT month_bucket FROM activity ORDER BY month_bucket").all()).toEqual([{ month_bucket: "2025-12" }, { month_bucket: "2026-01" }]);
        expect(snapshot.query("SELECT DISTINCT profile_id FROM activity ORDER BY profile_id").all()).toEqual([{ profile_id: 1 }]);
        expect(snapshot.query("SELECT title FROM activity WHERE media_type = 'movies' AND media_id = 80").get()).toEqual({ title: "movies historical" });
        expect(snapshot.query("SELECT * FROM entries WHERE media_id = 80").all()).toEqual([]);
        expect(snapshot.query("SELECT name FROM media_people WHERE media_type = 'movies' AND media_id = 80").all()).toEqual([{ name: "Historical actor" }]);
    });

    it("retains historical activity when its catalog metadata has been deleted", () => {
        source.exec("DELETE FROM movies_genre WHERE media_id = 80");
        source.exec("DELETE FROM movies_actors WHERE media_id = 80");
        source.exec("DELETE FROM movies WHERE id = 80");
        const { snapshot } = openSnapshot();
        expect(snapshot.query("SELECT title, progress_gained FROM activity WHERE media_type = 'movies' AND media_id = 80").get()).toEqual({ title: null, progress_gained: 1 });
        expect(snapshot.query("SELECT COUNT(*) AS count FROM my_entries").get()).toEqual({ count: 6 });
    });

    it("recomputes list activation for every snapshot without sharing another user's data", () => {
        const first = openSnapshot().snapshot;
        source.exec("UPDATE user_media_settings SET active = 0 WHERE user_id = 1 AND media_type = 'movies'");
        const next = openSnapshot().snapshot;
        expect(first.query("SELECT COUNT(*) AS count FROM my_entries").get()).toEqual({ count: 6 });
        expect(next.query("SELECT * FROM my_entries WHERE media_type = 'movies'").all()).toEqual([]);
        for (const table of ["activity", "labels", "media_genres", "media_people"]) expect(next.query(`SELECT * FROM ${table} WHERE media_type = 'movies'`).all()).toEqual([]);
        const other = openSnapshot(3).snapshot;
        expect(other.query("SELECT DISTINCT profile_id FROM entries").all()).toEqual([{ profile_id: 3 }]);
        expect(other.query("SELECT DISTINCT media_id FROM entries").all()).toEqual([{ media_id: 90 }]);
    });

    it("rejects oversized datasets instead of exporting partial rows and leaves the source transaction usable", () => {
        expect(() => buildQuerySnapshot(source, 1, { ...QUERY_SNAPSHOT_LIMITS, maxRows: 2 })).toThrow("row limit");
        expect(() => buildQuerySnapshot(source, 1, { ...QUERY_SNAPSHOT_LIMITS, maxRows: 2 })).toThrow(FormattedError);
        expect(source.inTransaction).toBe(false);
        expect(source.query("SELECT COUNT(*) AS count FROM movies_list").get()).toEqual({ count: 6 });
        expect(() => buildQuerySnapshot(source, 1, { ...QUERY_SNAPSHOT_LIMITS, maxBytes: 4096 })).toThrow("byte limit");
        expect(() => buildQuerySnapshot(source, 1, { ...QUERY_SNAPSHOT_LIMITS, maxBytes: 4096 })).toThrow(FormattedError);
        expect(openSnapshot().snapshot.query("SELECT COUNT(*) AS count FROM my_entries").get()).toEqual({ count: 6 });
    });

    it("extracts successfully through a read-only source connection", () => {
        const readOnlySource = Database.deserialize(source.serialize(), { readonly: true });
        try {
            const result = buildQuerySnapshot(readOnlySource, 1);
            const snapshot = Database.deserialize(result.data, { readonly: true });
            snapshots.push(snapshot);
            expect(snapshot.query("SELECT COUNT(*) AS count FROM entries").get()).toEqual({ count: 6 });
            expect(readOnlySource.inTransaction).toBe(false);
        }
        finally {
            readOnlySource.close();
        }
    });
});
