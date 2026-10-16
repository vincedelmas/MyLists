import {tmpdir} from "node:os";
import Database from "bun:sqlite";
import {join, resolve} from "node:path";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from "node:fs";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {applyActivityRepairs, auditActivityRepair} from "./activity-repair";


describe("historical activity repair", () => {
    let directory: string;
    let databasePath: string;
    let db: Database;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "mylists-activity-repair-"));
        databasePath = join(directory, "site.db");
        db = new Database(databasePath);
        migrate(drizzle(db), { migrationsFolder: "./drizzle" });
        db.run("PRAGMA journal_mode = WAL");
        db.run("PRAGMA foreign_keys = ON");
        db.run("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'reader', 'reader@example.invalid', 1, '2025-01-01', '2025-01-01'), (2, 'another-reader', 'other@example.invalid', 1, '2025-01-01', '2025-01-01')");
    });

    afterEach(() => {
        db.close();
        rmSync(directory, { recursive: true, force: true });
    });

    const snapshot = (type: MediaType, mediaId: number, timestamp: string, progress: number, redo = 0, entries = 2, statuses = { Reading: entries } as Record<string, number>) => {
        db.run(`INSERT INTO user_media_stats_history
            (user_id, media_type, media_id, timestamp, total_specific, time_spent, total_redo, total_entries, active, status_counts)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [type, mediaId, timestamp, type === "games" ? 0 : progress, type === "games" ? progress : 0, redo, entries, JSON.stringify(statuses)]);
    };

    const seedCase = (type: MediaType = MediaType.BOOKS, current = 100, peak = 120, peakRedo = 0) => {
        const extras = {
            books: { media: ", pages", values: ", 1000", list: ", actual_page, total", listValues: `, ${current}, ${current}` },
            manga: { media: "", values: "", list: ", current_chapter, total", listValues: `, ${current}, ${current}` },
            games: { media: "", values: "", list: ", playtime", listValues: `, ${current}` },
            movies: { media: ", duration", values: ", 100", list: ", total", listValues: `, ${current}` },
            anime: { media: ", duration, total_seasons, total_episodes", values: ", 25, 1, 1000", list: ", current_season, current_episode, total", listValues: `, 1, ${current}, ${current}` },
            series: { media: ", duration, total_seasons, total_episodes", values: ", 25, 1, 1000", list: ", current_season, current_episode, total", listValues: `, 1, ${current}, ${current}` },
        }[type];
        db.run(`INSERT INTO ${type} (id, api_id, name, image_cover${extras.media}) VALUES (1, 1, 'Repair title', 'cover.jpg'${extras.values})`);
        db.run(`INSERT INTO ${type}_list (user_id, media_id, status${extras.list}) VALUES (1, 1, 'Reading'${extras.listValues})`);

        snapshot(type, 2, "2026-05-01 08:00:00", 1000, 0, 1);
        snapshot(type, 1, "2026-05-01 09:00:00", 1000);
        snapshot(type, 1, "2026-05-02 10:00:00", 1000 + peak, peakRedo);
        snapshot(type, 1, "2026-05-02 10:01:00", 1000 + current);

        db.run(`INSERT INTO user_media_update (user_id, media_id, media_type, media_name, update_type, payload, timestamp)
            VALUES (1, 1, ?, 'Repair title', 'status', '{"old_value":null,"new_value":"Reading"}', '2026-05-01 09:00:00'),
                (1, 1, ?, 'Repair title', ?, ?, '2026-05-02 10:01:00')`,
        [type, type, type === "games" ? "playtime" : type === "manga" ? "chapter" : type === "books" ? "page" : "redo", JSON.stringify({ old_value: 0, new_value: current })]);
        db.run(`INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, redo_gained, last_activity_at)
            VALUES (1, 1, ?, '2026-05', ?, ?, '2026-05-02 10:00:00')`, [type, peak, peakRedo]);
    };

    const activity = () => db.query("SELECT * FROM user_media_monthly_activity ORDER BY id").all();
    const report = () => auditActivityRepair(db).entries;
    const omitAddition = () => {
        db.run("DELETE FROM user_media_stats_history WHERE id = 2");
        db.run("UPDATE user_media_stats_history SET total_entries = 2, status_counts = '{\"Reading\":2}' WHERE id = 1");
        db.run("DELETE FROM user_media_update WHERE update_type = 'status'");
    };
    const seedCompletionUndo = (type: MediaType = MediaType.MOVIES, seconds = 203) => {
        const planning = type === MediaType.GAMES ? "Plan to Play" : type === MediaType.BOOKS || type === MediaType.MANGA ? "Plan to Read" : "Plan to Watch";
        const peak = type === MediaType.GAMES ? 0 : type === MediaType.MOVIES ? 1 : 120;
        const completedAt = "2026-06-28 20:59:35";
        const undoneAt = new Date(Date.parse("2026-06-28T20:59:35Z") + seconds * 1000).toISOString().slice(0, 19).replace("T", " ");
        seedCase(type, 0, peak);
        db.run(`UPDATE ${type}_list SET status = ?`, [planning]);
        db.run("UPDATE user_media_stats_history SET status_counts = ? WHERE id IN (2, 4)", [JSON.stringify({ Reading: 1, [planning]: 1 })]);
        db.run("UPDATE user_media_stats_history SET status_counts = ?, timestamp = ? WHERE id = 3", [JSON.stringify({ Reading: 1, Completed: 1 }), completedAt]);
        db.run("UPDATE user_media_stats_history SET timestamp = ? WHERE id = 4", [undoneAt]);
        db.run("UPDATE user_media_update SET payload = ? WHERE id = 1", [JSON.stringify({ old_value: null, new_value: planning })]);
        db.run("UPDATE user_media_update SET update_type = 'status', payload = ?, timestamp = ? WHERE id = 2", [JSON.stringify({ old_value: "Completed", new_value: planning }), undoneAt]);
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2026-06', last_activity_at = '2026-06-28T20:59:35.613Z', had_completion = 1");
    };
    const runCli = async (args: string[]) => {
        const child = Bun.spawn([process.execPath, "--no-env-file", resolve("src/cli/index.ts"), "activity-repair", ...args], {
            cwd: directory,
            env: { PATH: process.env.PATH, DATABASE_URL: databasePath },
            stdout: "pipe", stderr: "pipe",
        });
        const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
        return { exitCode, stdout, stderr };
    };

    it.each(Object.values(MediaType))("reconstructs merged same-month corrections for %s without writing", type => {
        const [current, peak, redo] = type === "movies" ? [1, 2, 1] : [100, 120, 0];
        seedCase(type, current, peak, redo);
        const before = activity();
        const readonly = new Database(databasePath, { readonly: true });
        try {
            const result = readonly.transaction(() => auditActivityRepair(readonly))();
            expect(result.entries).toHaveLength(1);
            expect(result.entries[0]).toMatchObject({
                id: `${type}:1:1`, username: "reader", title: "Repair title", disposition: "proposal", reasons: [],
                changes: [{ before: { progressGained: peak, redoGained: redo }, after: { progressGained: current, redoGained: 0 } }],
            });
            expect(activity()).toEqual(before);
        }
        finally { readonly.close(); }
    });

    it("repairs the existing 64-episode anime's 15-to-1 rewatch correction without its original addition", async () => {
        seedCase(MediaType.ANIME, 128, 960, 15);
        omitAddition();
        db.run("UPDATE anime SET total_episodes = 64");
        db.run("UPDATE anime_list SET current_episode = 64, redo = 1, status = 'Completed'");
        db.run("UPDATE user_media_stats_history SET timestamp = '2026-07-16 13:17:04' WHERE id = 3");
        db.run("UPDATE user_media_stats_history SET total_specific = 1064, total_redo = 1, timestamp = '2026-07-16 13:18:14' WHERE id = 4");
        db.run("UPDATE user_media_update SET timestamp = '2026-07-16 13:18:14', payload = '{\"old_value\":15,\"new_value\":1}'");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2026-07', redo_gained = 1, last_activity_at = '2026-07-16T13:17:04.148Z'");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", reasons: [], openingBalance: { progress: 64, redo: 0 },
            changes: [{ before: { progressGained: 960, redoGained: 1 }, after: { progressGained: 64, redoGained: 1 } }],
        });
        expect(reviewed[0].notes.join(" ")).toContain("legacy boolean");
        const printed = await runCli(["--username", "reader", "--media-type", "anime"]);
        expect(printed.exitCode).toBe(0);
        expect(printed.stdout).toContain("PROPOSAL: anime:1:1");
        expect(printed.stdout).toContain("Existing progress before retained snapshots (inferred): 64 episodes; redo 0");
        expect(printed.stdout).toContain("960 episodes → 64 episodes, redo 1 → 1");
        applyActivityRepairs(db, reviewed, ["anime:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ progress_gained: 64, redo_gained: 1, last_activity_at: "2026-07-16T13:17:04.148Z" }]);
        expect(db.query("SELECT total, redo FROM anime_list").get()).toEqual({ total: 128, redo: 1 });
        expect(() => applyActivityRepairs(db, reviewed, ["anime:1:1"], vi.fn())).toThrow("already applied");
    });

    it("cancels the original month's completion across midnight and preserves a later month's completion", () => {
        seedCompletionUndo();
        db.run("UPDATE user_media_stats_history SET timestamp = '2026-06-30 23:59:00' WHERE id = 3");
        db.run("UPDATE user_media_stats_history SET timestamp = '2026-07-01 00:02:23' WHERE id = 4");
        db.run("UPDATE user_media_update SET timestamp = '2026-07-01 00:02:23' WHERE id = 2");
        db.run("UPDATE user_media_monthly_activity SET last_activity_at = '2026-06-30T23:59:00Z'");
        snapshot(MediaType.MOVIES, 1, "2026-07-02 12:00:00", 1001);
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Completed\":1}' WHERE id = 5");
        db.run("UPDATE movies_list SET total = 1, status = 'Completed'");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, had_completion) VALUES (1, 1, 'movies', '2026-07', 1, 1)");
        const july = activity()[1];
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ before: { monthBucket: "2026-06", hadCompletion: true }, after: null }] });
        expect(reviewed[0].changes).toHaveLength(1);
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toEqual([july]);
    });

    it.each([
        300,
        301,
    ])("uses exact undo evidence within five minutes and the ceiling otherwise (%s seconds)", seconds => {
        seedCompletionUndo(MediaType.MOVIES, seconds);
        const entry = report()[0];
        expect(entry).toMatchObject({ disposition: "proposal", changes: [{ after: null }] });
        expect(entry.repairKind).toBe(seconds >= 0 && seconds <= 300 ? "history" : "ceiling");
        if (entry.repairKind === "ceiling") expect(entry.historyIssues.join(" ")).toContain("planning-status reset");
    });

    it("rechecks the exact user's list and rejects orphan cleanup if the title was re-added", () => {
        seedCase();
        db.run("UPDATE books_list SET user_id = 2");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", repairKind: "orphan" });
        db.run("UPDATE books_list SET user_id = 1");
        const before = activity();
        const backup = vi.fn();
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1"], backup)).toThrow("changed");
        expect(backup).not.toHaveBeenCalled();
        expect(activity()).toEqual(before);
    });

    it("does not treat missing media metadata as a missing list entry", () => {
        seedCase();
        db.run("PRAGMA foreign_keys = OFF");
        db.run("DELETE FROM books");
        expect(report()[0]).toMatchObject({ currentProgress: 100, repairKind: "history", changes: [{ after: { progressGained: 100 } }] });
    });

    it("carries the excess forward through the earliest months and reports the estimated allocation", async () => {
        seedCase(MediaType.BOOKS, 150, 100);
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        db.run("UPDATE user_media_monthly_activity SET hidden = 1");
        db.run(`INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, had_completion)
            VALUES (1, 1, 'books', '2026-04', 100, 1), (1, 1, 'books', '2026-06', 100, 0)`);
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", repairKind: "ceiling",
            changes: [{ before: { monthBucket: "2026-04" }, after: null }, { before: { monthBucket: "2026-05" }, after: { progressGained: 50, hidden: true } }],
            allocations: [{ source: "earliest", monthBucket: "2026-04", progressRemoved: 100 }, { source: "earliest", monthBucket: "2026-05", progressRemoved: 50 }],
        });
        const printed = await runCli([]);
        expect(printed.exitCode).toBe(0);
        expect(printed.stdout).toContain("Repair kind: list ceiling correction");
        expect(printed.stdout).toContain("Proposed activity across all months: 150 pages; redo 0");
        expect(printed.stdout).toContain("Allocation — earliest recorded month: 2026-04: subtract 100 pages");
        expect(printed.stdout).toContain("History limitation (does not block the ceiling correction): Update history is missing");
        expect(printed.stdout).not.toContain("Evidence checks:");
        applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ month_bucket: "2026-05", progress_gained: 50, hidden: 1 }, { month_bucket: "2026-06", progress_gained: 100 }]);
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn())).toThrow("already applied");
    });

    it("caps progress and redo independently when they were recorded in different months", () => {
        seedCase(MediaType.MOVIES, 3, 0, 2);
        db.run("UPDATE movies_list SET redo = 1");
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        db.run(`INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, redo_gained, had_completion)
            VALUES (1, 1, 'movies', '2026-04', 3, 0, 1), (1, 1, 'movies', '2026-06', 4, 1, 1)`);
        const reviewed = report();
        expect(reviewed[0].allocations).toMatchObject([
            { monthBucket: "2026-04", progressRemoved: 3, redoRemoved: 0 },
            { monthBucket: "2026-05", progressRemoved: 0, redoRemoved: 2 },
            { monthBucket: "2026-06", progressRemoved: 1, redoRemoved: 0 },
        ]);
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ month_bucket: "2026-06", progress_gained: 3, redo_gained: 1, had_completion: 1 }]);
    });

    it.each([
        "UPDATE user_media_monthly_activity SET hidden = 1",
        "UPDATE books_list SET last_updated = '2026-05-03 00:00:00'",
        "UPDATE user_media_update SET payload = '{\"old_value\":20,\"new_value\":100}' WHERE update_type = 'page'",
        "UPDATE user_media_stats_history SET timestamp = '2026-05-02 10:00:01' WHERE id = 3",
    ])("rejects a stale report after source data changes: %s", sql => {
        seedCase();
        const reviewed = report();
        db.run(sql);
        const before = activity();
        const backup = vi.fn();
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1"], backup)).toThrow("changed");
        expect(backup).not.toHaveBeenCalled();
        expect(activity()).toEqual(before);
    });

    it("rejects edited proposals, unknown IDs, duplicate IDs and empty selections", () => {
        seedCase();
        const reviewed = report();
        reviewed[0].changes[0].after!.progressGained = 1;
        const before = activity();
        for (const ids of [["books:1:1"], ["books:9:9"], ["books:1:1", "books:1:1"], []]) {
            expect(() => applyActivityRepairs(db, reviewed, ids, vi.fn())).toThrow();
        }
        expect(activity()).toEqual(before);
    });

    it("applies only selected titles and cannot apply a correction twice", () => {
        seedCase();
        seedCase(MediaType.GAMES);
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (2, 1, 'books', '2026-05', 999)");
        const reviewed = report();
        const unaffected = db.query("SELECT * FROM user_media_monthly_activity WHERE user_id = 2 OR media_type = 'games'").all();
        const historyBefore = db.query("SELECT * FROM user_media_stats_history").all();
        const listBefore = db.query("SELECT * FROM books_list").all();
        applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
        expect(db.query("SELECT progress_gained FROM user_media_monthly_activity WHERE user_id = 1 AND media_type = 'books'").get()).toEqual({ progress_gained: 100 });
        expect(db.query("SELECT * FROM user_media_monthly_activity WHERE user_id = 2 OR media_type = 'games'").all()).toEqual(unaffected);
        expect(db.query("SELECT * FROM user_media_stats_history").all()).toEqual(historyBefore);
        expect(db.query("SELECT * FROM books_list").all()).toEqual(listBefore);
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn())).toThrow("already applied");
    });

    it("rolls back the batch on a write failure, and does not write if backup fails", () => {
        seedCase();
        seedCase(MediaType.GAMES);
        const reviewed = report();
        const before = activity();
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1"], () => { throw new Error("backup failed"); })).toThrow("backup failed");
        expect(activity()).toEqual(before);
        db.run("CREATE TRIGGER fail_repair BEFORE UPDATE ON user_media_monthly_activity WHEN OLD.media_type = 'games' BEGIN SELECT RAISE(ABORT, 'write failed'); END");
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1", "games:1:1"], vi.fn())).toThrow("write failed");
        expect(activity()).toEqual(before);
    });

    it("CLI directly applies all evidence-only repairs without a report or IDs, backs up, and can be rerun", async () => {
        seedCase();
        seedCase(MediaType.GAMES);
        seedCase(MediaType.MANGA);
        db.run("DELETE FROM games_list");
        db.run("DELETE FROM user_media_update WHERE media_type = 'manga'");
        db.run("DELETE FROM user_media_stats_history WHERE media_type = 'manga'");
        const before = activity();
        const snapshots = db.query("SELECT * FROM user_media_stats_history").all();
        const result = await runCli(["--evidence-only", "--apply"]);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        expect(result.stdout).toContain("APPLIED: books:1:1");
        expect(result.stdout).toContain("APPLIED: games:1:1");
        expect(result.stdout).not.toContain("APPLIED: manga:1:1");
        expect(result.stdout).toContain("Username: @reader");
        expect(result.stdout).toContain("120 pages → 100 pages");
        expect(result.stdout).toContain("Evidence-only selection: 1 other candidates excluded");
        expect(activity()).toMatchObject([
            { media_type: "books", progress_gained: 100 },
            { media_type: "manga", progress_gained: 120 },
        ]);
        expect(db.query("SELECT * FROM user_media_stats_history").all()).toEqual(snapshots);
        expect(readdirSync(directory).some(file => file.endsWith(".json"))).toBe(false);

        const backupDirectory = join(directory, "activity-repair-backups");
        const files = readdirSync(backupDirectory);
        expect(files).toHaveLength(1);
        const backup = new Database(join(backupDirectory, files[0]), { readonly: true });
        try {
            expect(backup.query("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
            expect(backup.query("SELECT * FROM user_media_monthly_activity ORDER BY id").all()).toEqual(before);
        }
        finally { backup.close(); }

        const after = activity();
        const repeated = await runCli(["--evidence-only", "--apply"]);
        expect(repeated, repeated.stderr).toMatchObject({ exitCode: 0 });
        expect(repeated.stdout).toContain("No evidence-only repairs to apply. Database unchanged.");
        expect(activity()).toEqual(after);
        expect(readdirSync(backupDirectory).filter(file => file.endsWith(".db"))).toEqual(files);
    });

    it("CLI direct repair respects username and media type filters", async () => {
        seedCase();
        seedCase(MediaType.GAMES);
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (2, 1, 'books', '2026-05', 999)");
        const unaffected = db.query("SELECT * FROM user_media_monthly_activity WHERE user_id = 2 OR media_type = 'games'").all();
        const result = await runCli(["--evidence-only", "--apply", "--username", "reader", "--media-type", "books"]);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        expect(db.query("SELECT progress_gained FROM user_media_monthly_activity WHERE user_id = 1 AND media_type = 'books'").get()).toEqual({ progress_gained: 100 });
        expect(db.query("SELECT * FROM user_media_monthly_activity WHERE user_id = 2 OR media_type = 'games'").all()).toEqual(unaffected);
    });

    it("CLI requires a reviewed selection and backs up committed WAL contents before applying", async () => {
        seedCase();
        const output = join(directory, "review.json");
        expect((await runCli(["--output", output])).exitCode).toBe(0);
        expect((await runCli(["--apply", output])).exitCode).toBe(1);
        expect(activity()).toMatchObject([{ progress_gained: 120 }]);
        const result = await runCli(["--apply", output, "--select", "books:1:1"]);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        expect(result.stdout).toContain("APPLIED ACTIVITY REPAIRS");
        expect(result.stdout).toContain("120 pages → 100 pages");
        expect(activity()).toMatchObject([{ progress_gained: 100 }]);

        const backupDirectory = join(directory, "activity-repair-backups");
        const files = readdirSync(backupDirectory);
        expect(files).toHaveLength(1);
        const backup = new Database(join(backupDirectory, files[0]), { readonly: true });
        try {
            expect(backup.query("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
            expect(backup.query("SELECT progress_gained FROM user_media_monthly_activity").get()).toEqual({ progress_gained: 120 });
            expect(backup.query("SELECT COUNT(*) count FROM user_media_stats_history").get()).toEqual({ count: 4 });
        }
        finally { backup.close(); }
        expect((await runCli(["--apply", output, "--select", "books:1:1"])).exitCode).toBe(1);
    });

    it("CLI rejects a different database and never creates a missing database", async () => {
        seedCase();
        const output = join(directory, "review.json");
        await runCli(["--output", output]);
        const saved = JSON.parse(readFileSync(output, "utf8"));
        saved.databasePath = join(directory, "another.db");
        writeFileSync(output, JSON.stringify(saved));
        const result = await runCli(["--apply", output, "--select", "books:1:1"]);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("different database");
        const missing = join(directory, "missing.db");
        expect((await runCli(["--db", missing])).exitCode).toBe(1);
        expect(existsSync(missing)).toBe(false);
        expect(activity()).toMatchObject([{ progress_gained: 120 }]);
    });
});
