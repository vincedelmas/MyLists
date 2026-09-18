import {tmpdir} from "node:os";
import Database from "bun:sqlite";
import {join, resolve} from "node:path";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from "node:fs";
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
    const seedAnimeStatusSequence = () => {
        seedCase(MediaType.ANIME, 64, 192);
        db.run("UPDATE anime_list SET status = 'Completed'");
        db.run("DELETE FROM user_media_stats_history");
        for (const [time, status, progress] of [
            ["21:02:24", "Plan to Watch", 0],
            ["21:02:33", "Completed", 64],
            ["21:04:26", "Watching", 64],
            ["21:04:38", "Completed", 64],
            ["21:04:43", "On Hold", 64],
            ["21:04:45", "Plan to Watch", 0],
            ["21:04:47", "Completed", 64],
            ["21:04:49", "Plan to Watch", 0],
            ["21:04:51", "Watching", 0],
            ["21:04:56", "On Hold", 0],
            ["21:04:57", "Completed", 64],
        ] as const) snapshot(MediaType.ANIME, 1, `2026-08-18 ${time}`, progress, 0, 1, { [status]: 1 });
        db.run("DELETE FROM user_media_update");
        db.run(`INSERT INTO user_media_update (user_id, media_id, media_type, media_name, update_type, payload, timestamp)
            VALUES (1, 1, 'anime', 'Repair title', 'status', '{"old_value":"On Hold","new_value":"Completed"}', '2026-08-18 21:04:57')`);
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2026-08', had_completion = 1, last_activity_at = '2026-08-18T21:04:57.326Z'");
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

    it("differences list snapshots before grouping by title", () => {
        seedCase();
        db.run("UPDATE user_media_stats_history SET id = 5, total_specific = 1300 WHERE id = 4");
        db.run(`INSERT INTO user_media_stats_history
            (id, user_id, media_id, media_type, timestamp, total_specific, total_entries, active, status_counts)
            VALUES (4, 1, 2, 'books', '2026-05-02 10:00:30', 1320, 2, 1, '{"Reading":2}')`);
        expect(report()[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 100 } }] });
        expect(report()[0].evidence.at(-1)?.progressDelta).toBe(-20);
    });

    it.each([false, true])("deletes reversed rereads when the list has no remaining consumption (completion=%s)", completion => {
        seedCase(MediaType.BOOKS, 0, 356, 1);
        db.run("UPDATE user_media_monthly_activity SET hidden = 1, had_completion = ?", [Number(completion)]);
        const reviewed = report();
        const backup = vi.fn();
        applyActivityRepairs(db, reviewed, ["books:1:1"], backup);
        expect(backup).toHaveBeenCalledOnce();
        expect(activity()).toEqual([]);
    });

    it("recovers multiple reversals merged out of game update history", () => {
        seedCase(MediaType.GAMES, 180000, 180000);
        db.run("DELETE FROM user_media_stats_history WHERE id >= 4");
        snapshot(MediaType.GAMES, 1, "2026-05-02 10:01:00", 1000);
        snapshot(MediaType.GAMES, 1, "2026-05-03 10:00:00", 481000);
        snapshot(MediaType.GAMES, 1, "2026-05-03 10:01:00", 1000);
        snapshot(MediaType.GAMES, 1, "2026-05-04 10:00:00", 181000);
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 840000");
        expect(report()[0]).toMatchObject({ disposition: "proposal", changes: [{ before: { progressGained: 840000 }, after: { progressGained: 180000 } }] });
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

    it("repairs a closed month on an existing book while leaving earlier activity without snapshots untouched", () => {
        seedCase(MediaType.BOOKS, 300, 120);
        omitAddition();
        db.run("UPDATE user_media_stats_history SET total_specific = 1100 WHERE id = 4");
        db.run("UPDATE user_media_update SET payload = '{\"old_value\":320,\"new_value\":300}'");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (1, 1, 'books', '2026-04', 200)");
        const earlier = db.query("SELECT * FROM user_media_monthly_activity WHERE month_bucket = '2026-04'").get();
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", openingBalance: { progress: 200, redo: 0 } });
        expect(reviewed[0].changes).toHaveLength(1);
        expect(reviewed[0].changes[0]).toMatchObject({ before: { monthBucket: "2026-05", progressGained: 120 }, after: { progressGained: 100 } });
        applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
        expect(db.query("SELECT * FROM user_media_monthly_activity WHERE month_bucket = '2026-04'").get()).toEqual(earlier);
    });

    it.each(["progress", "redo"])("preserves an already corrected %s counter while repairing the other", counter => {
        seedCase(MediaType.MOVIES, 2, 4, 3);
        db.run("UPDATE movies_list SET redo = 1");
        db.run("UPDATE user_media_stats_history SET total_redo = 1 WHERE id = 4");
        db.run("UPDATE user_media_stats_history SET timestamp = replace(timestamp, '2026-05', '2026-08')");
        db.run("UPDATE user_media_update SET timestamp = replace(timestamp, '2026-05', '2026-08')");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2026-08', progress_gained = ?, redo_gained = ?", [counter === "progress" ? 2 : 4, counter === "redo" ? 1 : 3]);
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 2, redoGained: 1 } }] });
        expect(reviewed[0].notes.join(" ")).toContain(`${counter} already matches the corrected result and is preserved`);
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ progress_gained: 2, redo_gained: 1 }]);
    });

    it("preserves a legacy redo flag already below the list ceiling", () => {
        seedCase(MediaType.MOVIES, 4, 5, 4);
        db.run("UPDATE movies_list SET redo = 3");
        db.run("UPDATE user_media_stats_history SET total_redo = 3 WHERE id = 4");
        db.run("UPDATE user_media_monthly_activity SET redo_gained = 1");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 4, redoGained: 1 } }] });
        expect(reviewed[0].notes.join(" ")).toContain("legacy boolean representation; the reconstructed count is 3");
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ progress_gained: 4, redo_gained: 1 }]);
    });

    it("reconciles a legacy redo flag followed by counted additions in the same month", () => {
        seedCase(MediaType.MOVIES, 4, 5, 4);
        db.run("UPDATE movies_list SET redo = 5, total = 6");
        db.run("UPDATE user_media_stats_history SET total_redo = 3 WHERE id = 4");
        db.run("UPDATE user_media_stats_history SET timestamp = replace(timestamp, '2026-05', '2026-07')");
        db.run("UPDATE user_media_update SET timestamp = replace(timestamp, '2026-05', '2026-07')");
        snapshot(MediaType.MOVIES, 1, "2026-07-25 12:00:00", 1006, 5);
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2026-07', progress_gained = 7, redo_gained = 3");
        expect(report()[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 6, redoGained: 3 } }] });
    });

    it("does not interpret a later arbitrary redo count as a legacy boolean", () => {
        seedCase(MediaType.MOVIES, 4, 5, 4);
        db.run("UPDATE movies_list SET redo = 3");
        db.run("UPDATE user_media_stats_history SET total_redo = 3 WHERE id = 4");
        db.run("UPDATE user_media_stats_history SET timestamp = replace(timestamp, '2026-05', '2026-08')");
        db.run("UPDATE user_media_update SET timestamp = replace(timestamp, '2026-05', '2026-08')");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2026-08', redo_gained = 1");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: 4, redoGained: 1 } }] });
        expect(report()[0].historyIssues.join(" ")).toContain("possible manual edits");
    });

    it("uses the list ceiling for a first observed status reset on an old title", () => {
        seedCase();
        omitAddition();
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Plan to Read\":1}' WHERE id >= 3");
        expect(report()[0].historyIssues.join(" ")).toContain("planning-status reset");
        expect(report()[0]).toMatchObject({ repairKind: "ceiling", changes: [{ after: { progressGained: 100 } }] });
    });

    it.each(Object.values(MediaType))("undoes a completion exactly reversed after 203 seconds for %s, including its completion flag", async type => {
        seedCompletionUndo(type);
        const before = activity();
        const listBefore = db.query(`SELECT * FROM ${type}_list`).all();
        const historyBefore = db.query("SELECT * FROM user_media_update").all();
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", reasons: [], recordedCompletions: 1,
            changes: [{ before: { hadCompletion: true, monthBucket: "2026-06" }, after: null }],
        });
        expect(reviewed[0].notes.join(" ")).toContain("completion was exactly reversed after 203 seconds");
        if (type === MediaType.MOVIES) {
            const printed = await runCli([]);
            expect(printed.exitCode).toBe(0);
            expect(printed.stdout).toContain("PROPOSAL: movies:1:1");
            expect(printed.stdout).toContain("1 viewing → 0 viewings, redo 0 → 0, completion true → false [DELETE EMPTY ROW]");
            expect(printed.stdout).toContain("completion=true → false");
        }
        expect(activity()).toEqual(before);
        applyActivityRepairs(db, reviewed, [`${type}:1:1`], vi.fn());
        expect(activity()).toEqual([]);
        expect(db.query(`SELECT * FROM ${type}_list`).all()).toEqual(listBefore);
        expect(db.query("SELECT * FROM user_media_update").all()).toEqual(historyBefore);
        expect(() => applyActivityRepairs(db, reviewed, [`${type}:1:1`], vi.fn())).toThrow("already applied");
    });

    it("finds a cancelled completion even when its viewing count was already corrected", () => {
        seedCompletionUndo();
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 0");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ before: { progressGained: 0, hadCompletion: true }, after: null }] });
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toEqual([]);
    });

    it("repairs the 192-to-64 anime status-edit sequence while preserving the final completion", async () => {
        seedAnimeStatusSequence();
        const before = activity()[0] as Record<string, unknown>;
        const listBefore = db.query("SELECT * FROM anime_list").all();
        const historyBefore = db.query("SELECT * FROM user_media_update").all();
        const snapshotsBefore = db.query("SELECT * FROM user_media_stats_history").all();
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", repairKind: "history", reasons: [],
            changes: [{ before: { progressGained: 192, hadCompletion: true }, after: { progressGained: 64, hadCompletion: true } }],
        });
        expect(reviewed[0].notes.join(" ")).toContain("132 seconds across 5 edits");
        expect(reviewed[0].notes.join(" ")).toContain("2 seconds across 2 edits");
        const printed = await runCli([]);
        expect(printed.exitCode).toBe(0);
        expect(printed.stdout).toContain("192 episodes → 64 episodes");
        expect(printed.stdout).toContain("completion=true,");
        expect(activity()).toEqual([before]);
        applyActivityRepairs(db, reviewed, ["anime:1:1"], vi.fn());
        expect(activity()).toEqual([{ ...before, progress_gained: 64 }]);
        expect(db.query("SELECT * FROM anime_list").all()).toEqual(listBefore);
        expect(db.query("SELECT * FROM user_media_update").all()).toEqual(historyBefore);
        expect(db.query("SELECT * FROM user_media_stats_history").all()).toEqual(snapshotsBefore);
        expect(() => applyActivityRepairs(db, reviewed, ["anime:1:1"], vi.fn())).toThrow("already applied");
    });

    it.each([
        ["more than five minutes overall", "UPDATE user_media_stats_history SET timestamp = '2026-08-18 20:59:44' WHERE timestamp = '2026-08-18 21:02:33'"],
        ["out-of-order timestamps", "UPDATE user_media_stats_history SET timestamp = '2026-08-18 21:04:44' WHERE timestamp = '2026-08-18 21:04:26'"],
        ["list baseline changes", "UPDATE user_media_stats_history SET total_entries = 2 WHERE timestamp = '2026-08-18 21:04:38'"],
        ["non-unit status changes", "UPDATE user_media_stats_history SET status_counts = '{\"Completed\":2}' WHERE timestamp = '2026-08-18 21:04:38'"],
    ])("uses the ceiling instead of an exact status undo with %s", (_name, sql) => {
        seedAnimeStatusSequence();
        db.run(sql);
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: 64, hadCompletion: true } }] });
        expect(report()[0].notes.join(" ")).not.toContain("132 seconds across 5 edits");
    });

    it("requires a status sequence to restore progress exactly, even when later completions can be undone", () => {
        seedAnimeStatusSequence();
        db.run("UPDATE user_media_stats_history SET total_specific = total_specific + 1 WHERE timestamp >= '2026-08-18 21:04:45'");
        db.run("UPDATE anime_list SET total = 65, current_episode = 65");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: 65, hadCompletion: true } }] });
    });

    it("clears the completion flag when the entire intermediate-status sequence was undone", () => {
        seedAnimeStatusSequence();
        db.run("DELETE FROM user_media_stats_history WHERE timestamp > '2026-08-18 21:04:45'");
        db.run("UPDATE user_media_update SET timestamp = '2026-08-18 21:04:45', payload = '{\"old_value\":\"On Hold\",\"new_value\":\"Plan to Watch\"}'");
        db.run("UPDATE anime_list SET total = 0, current_episode = 0, status = 'Plan to Watch'");
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 64");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ after: null }] });
        applyActivityRepairs(db, reviewed, ["anime:1:1"], vi.fn());
        expect(activity()).toEqual([]);
    });

    it.each([0, 1])("requires intermediate redo edits to be fully undone (remaining redo: %s)", remainingRedo => {
        seedCompletionUndo();
        db.run("UPDATE user_media_stats_history SET id = 5, total_redo = ? WHERE id = 4", [remainingRedo]);
        db.run(`INSERT INTO user_media_stats_history (id, user_id, media_id, media_type, timestamp, total_specific, total_redo, total_entries, active, status_counts)
            VALUES (4, 1, 1, 'movies', '2026-06-28 21:00:00', 1002, 1, 2, 1, '{"Reading":1,"Completed":1}')`);
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 2, redo_gained = 1");
        db.run("UPDATE movies_list SET redo = ?", [remainingRedo]);
        const reviewed = report();
        expect(reviewed[0].disposition).toBe("proposal");
        expect(reviewed[0].repairKind).toBe(remainingRedo === 0 ? "history" : "ceiling");
        if (remainingRedo === 0) {
            expect(reviewed[0].changes).toMatchObject([{ after: null }]);
            applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
            expect(activity()).toEqual([]);
        }
        else expect(reviewed[0].changes).toMatchObject([{ after: { progressGained: 0, redoGained: 1 } }]);
    });

    it("recognizes progress restored separately just after undoing the completion status", () => {
        seedCompletionUndo(MediaType.ANIME);
        db.run("UPDATE anime_list SET status = 'Watching'");
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Watching\":1}' WHERE id IN (2, 4)");
        db.run("UPDATE user_media_stats_history SET total_specific = 1120 WHERE id = 4");
        snapshot(MediaType.ANIME, 1, "2026-06-28 21:03:00", 1000, 0, 2, { Reading: 1, Watching: 1 });
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ after: null }] });
        expect(reviewed[0].notes.join(" ")).toContain("205 seconds across 3 edits");
        applyActivityRepairs(db, reviewed, ["anime:1:1"], vi.fn());
        expect(activity()).toEqual([]);
    });

    it("recognizes the same title's completion undo while other titles change the overall status totals", () => {
        seedCompletionUndo();
        db.run("UPDATE user_media_stats_history SET total_entries = 15");
        db.run("UPDATE user_media_stats_history SET total_entries = 14, status_counts = '{\"Completed\":7,\"Plan to Watch\":7}' WHERE id = 1");
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Completed\":7,\"Plan to Watch\":8}' WHERE id = 2");
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Completed\":8,\"Plan to Watch\":7}' WHERE id = 3");
        db.run("UPDATE user_media_stats_history SET id = 8, total_specific = 1004, status_counts = '{\"Completed\":11,\"Plan to Watch\":4}' WHERE id = 4");
        for (let offset = 1; offset <= 4; offset++) {
            db.run(`INSERT INTO user_media_stats_history (id, user_id, media_id, media_type, timestamp, total_specific, total_entries, active, status_counts)
                VALUES (?, 1, ?, 'movies', '2026-06-28 21:00:00', ?, 15, 1, ?)`,
            [3 + offset, 1 + offset, 1001 + offset, JSON.stringify({ Completed: 8 + offset, "Plan to Watch": 7 - offset })]);
        }
        expect(report()[0]).toMatchObject({ disposition: "proposal", reasons: [], changes: [{ after: null }] });
        expect(report()[0].notes.join(" ")).toContain("Snapshots #3 and #8: completion was exactly reversed after 203 seconds");
    });

    it("clears a cancelled completion while preserving later reading, visibility and the activity date", () => {
        seedCompletionUndo(MediaType.BOOKS);
        snapshot(MediaType.BOOKS, 1, "2026-06-29 12:00:00", 1010);
        db.run("UPDATE books_list SET actual_page = 10, total = 10, status = 'Reading'");
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 130, hidden = 1, last_activity_at = '2026-06-29T12:00:00Z'");
        const before = activity()[0] as Record<string, unknown>;
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 10, hadCompletion: false, hidden: true } }] });
        applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
        expect(activity()).toEqual([{ ...before, progress_gained: 10, had_completion: 0 }]);
    });

    it.each([false, true])("handles repeated quick completion mistakes and preserves a later genuine completion (%s)", completedAgain => {
        seedCompletionUndo();
        snapshot(MediaType.MOVIES, 1, "2026-06-28 21:03:00", 1001);
        snapshot(MediaType.MOVIES, 1, "2026-06-28 21:03:02", 1000);
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Completed\":1}' WHERE id = 5");
        db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Plan to Watch\":1}' WHERE id = 6");
        if (completedAgain) {
            snapshot(MediaType.MOVIES, 1, "2026-06-28 21:03:04", 1001);
            db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Completed\":1}' WHERE id = 7");
            db.run("UPDATE movies_list SET total = 1, status = 'Completed'");
        }
        db.run("UPDATE user_media_monthly_activity SET progress_gained = ?", [completedAgain ? 3 : 2]);
        const reviewed = report();
        expect(reviewed[0].disposition).toBe("proposal");
        expect(reviewed[0].changes[0].after).toEqual(completedAgain ? expect.objectContaining({ progressGained: 1, hadCompletion: true }) : null);
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toEqual(completedAgain ? [expect.objectContaining({ progress_gained: 1, had_completion: 1 })] : []);
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

    it.each([0, 300, 301, 86400, -1])("uses exact undo evidence within five minutes and the ceiling otherwise (%s seconds)", seconds => {
        seedCompletionUndo(MediaType.MOVIES, seconds);
        const entry = report()[0];
        expect(entry).toMatchObject({ disposition: "proposal", changes: [{ after: null }] });
        expect(entry.repairKind).toBe(seconds >= 0 && seconds <= 300 ? "history" : "ceiling");
        if (entry.repairKind === "ceiling") expect(entry.historyIssues.join(" ")).toContain("planning-status reset");
    });

    it.each(["different status", "different progress", "non-unit status changes", "missing history"])("falls back to the ceiling instead of asserting an exact undo with %s", mismatch => {
        seedCompletionUndo(MediaType.ANIME);
        if (mismatch === "different status") {
            db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Random\":1}' WHERE id = 4");
            db.run("UPDATE anime_list SET status = 'Random'");
        }
        else if (mismatch === "different progress") {
            db.run("UPDATE user_media_stats_history SET total_specific = 1001 WHERE id = 4");
            db.run("UPDATE anime_list SET total = 1");
        }
        else if (mismatch === "non-unit status changes") {
            db.run("UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Plan to Watch\":2}' WHERE id IN (2, 4)");
        }
        else db.run("DELETE FROM user_media_update");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling" });
        expect(report()[0].changes[0].after).toEqual(mismatch === "different progress" ? expect.objectContaining({ progressGained: 1 }) : null);
    });

    it.each([
        ["planning reset", "UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"Plan to Read\":1}' WHERE id = 4", "planning-status reset"],
        ["changed status", "UPDATE user_media_stats_history SET status_counts = '{\"Reading\":1,\"On Hold\":1}' WHERE id = 4", "also changes status"],
        ["missing baseline", "DELETE FROM user_media_stats_history WHERE id = 1", "baseline"],
        ["removed/re-added title", "UPDATE user_media_stats_history SET total_entries = 3 WHERE id = 4", "removal, re-addition"],
        ["manual activity edit", "UPDATE user_media_monthly_activity SET progress_gained = 110", "possible manual edits"],
        ["unrecorded recalculation", "UPDATE user_media_stats_history SET total_specific = 1101 WHERE id = 4", "current list totals"],
        ["deleted history", "DELETE FROM user_media_update", "history is missing"],
        ["backdated history", "UPDATE user_media_update SET timestamp = '2026-04-01 12:00:00' WHERE update_type = 'page'", "backdated or incomplete"],
        ["malformed month", "UPDATE user_media_monthly_activity SET month_bucket = '8-11'", "malformed month"],
        ["malformed snapshot date", "UPDATE user_media_stats_history SET timestamp = 'invalid' WHERE id = 4", "malformed timestamp"],
    ])("reports %s as a history limitation while enforcing the ceiling", (_name, sql, reason) => {
        seedCase();
        db.run(sql);
        const entry = report()[0];
        expect(entry).toMatchObject({ disposition: "proposal", repairKind: "ceiling", reasons: [], changes: [{ after: { progressGained: 100 } }] });
        expect(entry.historyIssues.join(" ")).toContain(reason);
        const backup = vi.fn();
        applyActivityRepairs(db, [entry], [entry.id], backup);
        expect(backup).toHaveBeenCalledOnce();
        expect(activity()).toMatchObject([{ progress_gained: 100 }]);
    });

    it.each(Object.values(MediaType))("proposes deleting orphaned %s activity without snapshots or update history", type => {
        seedCase(type);
        db.run(`DELETE FROM ${type}_list WHERE user_id = 1`);
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        db.run("UPDATE user_media_monthly_activity SET hidden = 1, had_completion = 1, redo_gained = 2");
        db.run(`INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained)
            VALUES (1, 1, ?, '2026-06', 0), (2, 1, ?, '2026-05', 999)`, [type, type]);
        const before = activity();
        const reviewed = report();
        const entry = reviewed.find(item => item.id === `${type}:1:1`)!;
        expect(entry).toMatchObject({ disposition: "proposal", repairKind: "orphan", reasons: [], currentProgress: null });
        expect(entry.changes).toHaveLength(2);
        expect(entry.changes.every(change => change.after === null)).toBe(true);
        expect(entry.notes.join(" ")).toContain("Snapshot reconstruction is not required");
        expect(activity()).toEqual(before);
        applyActivityRepairs(db, reviewed, [entry.id], vi.fn());
        expect(activity()).toEqual(before.filter(row => (row as { user_id: number }).user_id === 2));
        expect(() => applyActivityRepairs(db, reviewed, [entry.id], vi.fn())).toThrow("already applied");
    });

    it("labels an empty orphaned game row for deletion even when its metadata is gone", async () => {
        seedCase(MediaType.GAMES);
        db.run("DELETE FROM games_list");
        db.run("DELETE FROM games");
        db.run("DELETE FROM user_media_update");
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 0");
        const printed = await runCli([]);
        expect(printed.exitCode).toBe(0);
        expect(printed.stdout).toContain("PROPOSAL: games:1:1");
        expect(printed.stdout).toContain("[DELETE ORPHANED ROW]");
        expect(printed.stdout).toContain("Repair kind: orphaned activity cleanup");
        expect(printed.stdout).not.toContain("snapshot deltas have preceding list baselines");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ before: { progressGained: 0, hadCompletion: false }, after: null }] });
        applyActivityRepairs(db, reviewed, ["games:1:1"], vi.fn());
        expect(activity()).toEqual([]);
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

    it.each(["2026-05", "2018-07"])("assigns a later correction to the sole recorded month %s", month => {
        seedCase();
        db.run("UPDATE user_media_stats_history SET timestamp = '2026-06-01 10:01:00' WHERE id = 4");
        db.run("UPDATE user_media_update SET timestamp = '2026-06-01 10:01:00' WHERE update_type = 'page'");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = ?, last_activity_at = ?", [month, `${month}-02 10:00:00`]);
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", reasons: [], changes: [{ after: { monthBucket: month, progressGained: 100 } }] });
        expect(reviewed[0].notes.join(" ")).toContain(`sole recorded activity month, ${month}`);
        applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ month_bucket: month, progress_gained: 100, last_activity_at: `${month}-02 10:00:00` }]);
    });

    it("repairs 500-to-100 game hours assigned to 2018 using a zero baseline and later edits", async () => {
        seedCase(MediaType.GAMES, 6000, 30000);
        db.run("DELETE FROM user_media_stats_history");
        snapshot(MediaType.GAMES, 1, "2026-04-30 17:58:06", 0, 0, 1);
        snapshot(MediaType.GAMES, 2, "2026-04-30 17:59:08", 0);
        snapshot(MediaType.GAMES, 1, "2026-04-30 17:59:09", 0);
        snapshot(MediaType.GAMES, 1, "2026-04-30 17:59:18", 30000);
        snapshot(MediaType.GAMES, 2, "2026-08-16 14:36:50", 1060080, 0, 46);
        snapshot(MediaType.GAMES, 1, "2026-08-16 14:36:57", 1036080, 0, 46);
        db.run("UPDATE games_list SET status = 'Dropped'");
        db.run("DELETE FROM user_media_update");
        db.run(`INSERT INTO user_media_update (user_id, media_id, media_type, media_name, update_type, payload, timestamp)
            VALUES (1, 1, 'games', 'Repair title', 'playtime', '{"old_value":0,"new_value":30000}', '2026-04-30 17:59:18'),
                (1, 1, 'games', 'Repair title', 'playtime', '{"old_value":30000,"new_value":6000}', '2026-08-16 14:36:57')`);
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2018-07', last_activity_at = '2018-07-28T12:00:00.000Z'");
        const before = activity()[0] as Record<string, unknown>;
        const historyBefore = db.query("SELECT * FROM user_media_update").all();
        const snapshotsBefore = db.query("SELECT * FROM user_media_stats_history").all();
        const listBefore = db.query("SELECT * FROM games_list").all();
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", reasons: [], openingBalance: null,
            changes: [{ before: { monthBucket: "2018-07", progressGained: 30000 }, after: { monthBucket: "2018-07", progressGained: 6000 } }],
        });
        expect(reviewed[0].notes.join(" ")).toContain("zero progress and redo");
        expect(reviewed[0].notes.join(" ")).toContain("Snapshot edits occurred in 2026-04, 2026-08");
        const printed = await runCli(["--username", "reader", "--media-type", "games"]);
        expect(printed.exitCode).toBe(0);
        expect(printed.stdout).toContain("PROPOSAL: games:1:1");
        expect(printed.stdout).toContain("2018-07: 500 hours (30,000 minutes) → 100 hours (6,000 minutes)");
        expect(printed.stdout).toContain("Feed/update timestamps are preserved");
        expect(activity()).toEqual([before]);
        applyActivityRepairs(db, reviewed, ["games:1:1"], vi.fn());
        expect(activity()).toEqual([{ ...before, progress_gained: 6000 }]);
        expect(db.query("SELECT * FROM user_media_update").all()).toEqual(historyBefore);
        expect(db.query("SELECT * FROM user_media_stats_history").all()).toEqual(snapshotsBefore);
        expect(db.query("SELECT * FROM games_list").all()).toEqual(listBefore);
        expect(() => applyActivityRepairs(db, reviewed, ["games:1:1"], vi.fn())).toThrow("already applied");
    });

    it.each(["total_specific", "total_redo"])("does not use an unknown nonzero %s as a zero baseline", column => {
        seedCase();
        db.run("DELETE FROM user_media_stats_history WHERE id = 1");
        db.run("UPDATE user_media_stats_history SET total_specific = total_specific - 1000");
        db.run(`UPDATE user_media_stats_history SET ${column} = 1 WHERE id = 2`);
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: 100 } }], allocations: [{ source: "earliest" }] });
        expect(report()[0].historyIssues.join(" ")).toContain("no preceding baseline");
    });

    it("uses the earliest month when snapshots disagree with the current list totals", () => {
        seedCase();
        db.run("DELETE FROM user_media_stats_history WHERE id = 1");
        db.run("UPDATE user_media_stats_history SET total_specific = total_specific - 1000");
        db.run("UPDATE books_list SET total = 101, actual_page = 101");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: 101 } }], allocations: [{ source: "earliest" }] });
        expect(report()[0].historyIssues.join(" ")).toContain("current list totals");
    });

    it("does not fund an earlier reversal with later additions to a moved month", () => {
        seedCase();
        db.run("UPDATE user_media_stats_history SET total_specific = 980 WHERE id = 3");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2018-07'");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: 100 } }], allocations: [{ source: "earliest" }] });
        expect(report()[0].historyIssues.join(" ")).toContain("exceeds the observed additions");
    });

    it("reconciles legacy redo flags from several months combined into one recorded month", () => {
        seedCase(MediaType.MOVIES, 4, 5, 4);
        db.run("UPDATE movies_list SET total = 6, redo = 5");
        db.run("UPDATE user_media_stats_history SET total_redo = 3 WHERE id = 4");
        snapshot(MediaType.MOVIES, 1, "2026-06-25 12:00:00", 1006, 5);
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '2018-07', progress_gained = 7, redo_gained = 2");
        expect(report()[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { monthBucket: "2018-07", progressGained: 6, redoGained: 2 } }] });
        expect(report()[0].notes.join(" ")).toContain("legacy boolean representation");
    });

    it("subtracts from the earliest month when the historical source is ambiguous", () => {
        seedCase();
        omitAddition();
        db.run("UPDATE user_media_stats_history SET timestamp = '2026-06-01 10:01:00' WHERE id = 4");
        db.run("UPDATE user_media_update SET timestamp = '2026-06-01 10:01:00' WHERE update_type = 'page'");
        db.run("UPDATE books_list SET total = 300, actual_page = 300");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (1, 1, 'books', '2026-04', 200)");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ before: { monthBucket: "2026-04" }, after: { progressGained: 180 } }], allocations: [{ source: "earliest", monthBucket: "2026-04", progressRemoved: 20 }] });
        expect(report()[0].historyIssues.join(" ")).toContain("earlier months");
    });

    it("repairs 400 → 5 → 500 game hours using the balance available before the later August addition", async () => {
        seedCase(MediaType.GAMES, 30000, 24000);
        db.run("UPDATE user_media_stats_history SET timestamp = '2026-05-05 12:11:16' WHERE id = 3");
        db.run("UPDATE user_media_stats_history SET time_spent = 1300, timestamp = '2026-08-16 14:33:32' WHERE id = 4");
        snapshot(MediaType.GAMES, 1, "2026-08-16 14:34:44", 31000);
        db.run("UPDATE games_list SET status = 'On Hold'");
        db.run("DELETE FROM user_media_update");
        db.run(`INSERT INTO user_media_update (user_id, media_id, media_type, media_name, update_type, payload, timestamp)
            VALUES (1, 1, 'games', 'Repair title', 'playtime', '{"old_value":0,"new_value":24000}', '2026-05-05 12:11:16'),
                (1, 1, 'games', 'Repair title', 'playtime', '{"old_value":300,"new_value":30000}', '2026-08-16 14:34:44')`);
        db.run("UPDATE user_media_monthly_activity SET last_activity_at = '2026-05-05T12:11:18.830Z', hidden = 1");
        db.run(`INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, last_activity_at)
            VALUES (1, 1, 'games', '2026-08', 29700, '2026-08-16T14:34:44.528Z')`);
        const before = activity() as Record<string, unknown>[];
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", reasons: [], openingBalance: null,
            changes: [{ before: { monthBucket: "2026-05", progressGained: 24000 }, after: { monthBucket: "2026-05", progressGained: 300 } }],
        });
        expect(reviewed[0].changes).toHaveLength(1);
        expect(reviewed[0].notes.join(" ")).toContain("only one available source month, 2026-05");
        const printed = await runCli(["--username", "reader", "--media-type", "games"]);
        expect(printed.exitCode).toBe(0);
        expect(printed.stdout).toContain("PROPOSAL: games:1:1");
        expect(printed.stdout).toContain("2026-05: 400 hours (24,000 minutes) → 5 hours (300 minutes)");
        expect(printed.stdout).toContain("495 hours (29,700 minutes); redo 0 [unchanged]");
        expect(activity()).toEqual(before);
        applyActivityRepairs(db, reviewed, ["games:1:1"], vi.fn());
        expect(activity()).toEqual([{ ...before[0], progress_gained: 300 }, before[1]]);
        expect(db.query("SELECT playtime FROM games_list").get()).toEqual({ playtime: 30000 });
        expect(() => applyActivityRepairs(db, reviewed, ["games:1:1"], vi.fn())).toThrow("already applied");
    });

    it.each([100, 200])("uses several earlier sources only if a %s-page reversal consumes their entire balance", removed => {
        seedCase(MediaType.BOOKS, 250 - removed, 120);
        db.run("DELETE FROM user_media_stats_history WHERE id = 4");
        snapshot(MediaType.BOOKS, 1, "2026-06-01 10:00:00", 1200);
        snapshot(MediaType.BOOKS, 1, "2026-07-01 10:00:00", 1200 - removed);
        snapshot(MediaType.BOOKS, 1, "2026-08-01 10:00:00", 1250 - removed);
        db.run("UPDATE user_media_update SET timestamp = '2026-07-01 10:00:00' WHERE update_type = 'page'");
        db.run(`INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, had_completion)
            VALUES (1, 1, 'books', '2026-06', 80, 1), (1, 1, 'books', '2026-08', 50, 0)`);
        const reviewed = report();
        if (removed === 100) {
            expect(reviewed[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ before: { monthBucket: "2026-05" }, after: { progressGained: 20 } }], allocations: [{ source: "earliest", progressRemoved: 100 }] });
            expect(reviewed[0].historyIssues.join(" ")).toContain("progress source is ambiguous");
        }
        else {
            expect(reviewed[0]).toMatchObject({ disposition: "proposal", reasons: [], changes: [
                { before: { monthBucket: "2026-05" }, after: null },
                { before: { monthBucket: "2026-06" }, after: { progressGained: 0, hadCompletion: true } },
            ] });
            expect(reviewed[0].changes).toHaveLength(2);
            expect(reviewed[0].notes.join(" ")).toContain("consumes all available balances in 2026-05, 2026-06");
            applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
            expect(activity()).toMatchObject([{ month_bucket: "2026-06", progress_gained: 0 }, { month_bucket: "2026-08", progress_gained: 50 }]);
        }
    });

    it.each(["moved source", "manual later counter"])("uses the ceiling for cross-month repairs with a %s", mismatch => {
        seedCase(MediaType.BOOKS, 150, 120);
        db.run("UPDATE user_media_stats_history SET total_specific = 1100, timestamp = '2026-06-01 10:00:00' WHERE id = 4");
        snapshot(MediaType.BOOKS, 1, "2026-07-01 10:00:00", 1150);
        db.run("UPDATE user_media_update SET timestamp = '2026-06-01 10:00:00' WHERE update_type = 'page'");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (1, 1, 'books', '2026-07', ?)", [mismatch === "manual later counter" ? 51 : 50]);
        if (mismatch === "moved source") db.run("UPDATE user_media_monthly_activity SET month_bucket = '2018-07' WHERE month_bucket = '2026-05'");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: { progressGained: mismatch === "moved source" ? 100 : 99 } }] });
        expect(report()[0].historyIssues.join(" ")).toContain(mismatch === "moved source" ? "no reconstructed additions" : "possible manual edits");
    });

    it.each(["progress", "redo"])("does not let the other counter's unique sources hide an ambiguous %s reversal", counter => {
        const current = counter === "progress" ? 1 : 0;
        const redo = counter === "redo" ? 1 : 0;
        seedCase(MediaType.MOVIES, current, 5, 4);
        db.run("UPDATE movies_list SET redo = ?", [redo]);
        db.run("DELETE FROM user_media_stats_history WHERE id = 4");
        snapshot(MediaType.MOVIES, 1, "2026-06-01 10:00:00", 1007, 5);
        snapshot(MediaType.MOVIES, 1, "2026-07-01 10:00:00", 1000 + current, redo);
        db.run("UPDATE user_media_update SET timestamp = '2026-07-01 10:00:00' WHERE update_type = 'redo'");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained, redo_gained) VALUES (1, 1, 'movies', '2026-06', 2, 1)");
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling" });
        expect(reviewed[0].historyIssues.join(" ")).toContain(`${counter} source is ambiguous`);
        const fallback = reviewed[0].allocations.filter(item => item.source === "earliest");
        expect(fallback[0]).toMatchObject({ monthBucket: "2026-05", [counter === "progress" ? "progressRemoved" : "redoRemoved"]: counter === "progress" ? 5 : 4 });
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(db.query("SELECT SUM(progress_gained) progress, SUM(redo_gained) redo FROM user_media_monthly_activity").get()).toEqual({ progress: current, redo });
    });

    it("does not flag corrected totals but still reports malformed months", () => {
        seedCase();
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 100");
        expect(report()).toEqual([]);
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '8-11'");
        expect(report()[0].reasons.join(" ")).toContain("malformed month");
    });

    it.each(Object.values(MediaType))("leaves %s activity below the list total unchanged even when snapshots suggest more", type => {
        seedCase(type, 100, 50);
        const before = activity();
        expect(report()).toEqual([]);
        expect(activity()).toEqual(before);
    });

    it("preserves progress below its ceiling when only redo is excessive", () => {
        seedCase(MediaType.MOVIES, 10, 3, 4);
        const reviewed = report();
        expect(reviewed[0]).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 3, redoGained: 0 } }] });
        applyActivityRepairs(db, reviewed, ["movies:1:1"], vi.fn());
        expect(activity()).toMatchObject([{ progress_gained: 3, redo_gained: 0 }]);
    });

    it.each([true, false])("uses a later month supported by snapshots, otherwise the earliest month (snapshots: %s)", retainedSnapshots => {
        seedCase();
        omitAddition();
        db.run("UPDATE books_list SET total = 150, actual_page = 150");
        db.run("DELETE FROM user_media_update");
        if (!retainedSnapshots) db.run("DELETE FROM user_media_stats_history");
        db.run("UPDATE user_media_monthly_activity SET hidden = 1");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (1, 1, 'books', '2026-04', 50)");
        const before = activity() as Record<string, unknown>[];
        const reviewed = report();
        const month = retainedSnapshots ? "2026-05" : "2026-04";
        expect(reviewed[0]).toMatchObject({
            disposition: "proposal", repairKind: "ceiling", reasons: [],
            changes: [{ before: { monthBucket: month }, after: { progressGained: retainedSnapshots ? 100 : 30 } }],
            allocations: [{ monthBucket: month, source: retainedSnapshots ? "snapshots" : "earliest", progressRemoved: 20, redoRemoved: 0 }],
        });
        expect(activity()).toEqual(before);
        applyActivityRepairs(db, reviewed, ["books:1:1"], vi.fn());
        expect(activity()).toEqual(before.map(row => row.month_bucket === month ? { ...row, progress_gained: retainedSnapshots ? 100 : 30 } : row));
        expect(report()).toEqual([]);
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

    it.each(["Completed", "On Hold"])("handles zero game hours with the current status %s", status => {
        seedCase(MediaType.GAMES, 0, 600);
        db.run("UPDATE games_list SET status = ?", [status]);
        db.run("UPDATE user_media_monthly_activity SET had_completion = 1");
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        const reviewed = report();
        expect(reviewed[0].changes[0].after).toEqual(status === "Completed" ? expect.objectContaining({ progressGained: 0, hadCompletion: true }) : null);
        applyActivityRepairs(db, reviewed, ["games:1:1"], vi.fn());
        expect(report()).toEqual([]);
    });

    it("clears a zero-progress planning completion without retained history", () => {
        seedCompletionUndo();
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 0");
        expect(report()[0]).toMatchObject({ disposition: "proposal", repairKind: "ceiling", changes: [{ after: null }] });
    });

    it("orders legacy malformed month keys by their activity dates without rewriting them", () => {
        seedCase(MediaType.BOOKS, 100, 100);
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = '8-11', last_activity_at = '0008-11-30T12:00:00.000Z'");
        db.run("INSERT INTO user_media_monthly_activity (user_id, media_id, media_type, month_bucket, progress_gained) VALUES (1, 1, 'books', '2026-04', 50)");
        expect(report()[0]).toMatchObject({ disposition: "proposal", allocations: [{ source: "earliest", monthBucket: "8-11", progressRemoved: 50 }], changes: [{ after: { monthBucket: "8-11", progressGained: 50, lastActivityAt: "0008-11-30T12:00:00.000Z" } }] });
    });

    it("discloses row creation order when neither month nor activity date can establish chronology", () => {
        seedCase();
        db.run("DELETE FROM user_media_update");
        db.run("DELETE FROM user_media_stats_history");
        db.run("UPDATE user_media_monthly_activity SET month_bucket = 'unknown', last_activity_at = 'invalid'");
        const entry = report()[0];
        expect(entry).toMatchObject({ disposition: "proposal", changes: [{ after: { progressGained: 100, monthBucket: "unknown", lastActivityAt: "invalid" } }] });
        expect(entry.notes.join(" ")).toContain("row creation order");
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

    it("validates the whole selection before backup or mutation", () => {
        seedCase();
        seedCase(MediaType.GAMES);
        const reviewed = report();
        db.run("UPDATE games_list SET playtime = 99");
        const before = activity();
        const backup = vi.fn();
        expect(() => applyActivityRepairs(db, reviewed, ["books:1:1", "games:1:1"], backup)).toThrow("changed");
        expect(backup).not.toHaveBeenCalled();
        expect(activity()).toEqual(before);
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

    it("CLI saves a read-only review with usernames, evidence and exact game units", async () => {
        seedCase();
        seedCase(MediaType.GAMES, 180000, 840000);
        const before = activity();
        const output = join(directory, "review.json");
        const result = await runCli(["--username", "reader", "--output", output]);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        expect(result.stdout).toContain("DRY RUN");
        const text = readFileSync(join(directory, "review.txt"), "utf8");
        expect(text).toContain("Username: @reader (user #1)");
        expect(text).toContain("Repair title (games #1)");
        expect(text).toContain("14,000 hours (840,000 minutes) → 3,000 hours (180,000 minutes)");
        expect(text).toContain("snapshot #");
        expect(text).toContain("hidden=false");
        expect(JSON.parse(readFileSync(output, "utf8")).entries).toHaveLength(2);
        expect(statSync(output).mode & 0o777).toBe(0o600);
        expect(activity()).toEqual(before);
        expect(existsSync(join(directory, "activity-repair-backups"))).toBe(false);
        expect((await runCli(["--output", output])).exitCode).toBe(1);
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

    it.each(["backup", "write"])("CLI direct repair leaves the whole batch unchanged on a %s failure", async failure => {
        seedCase();
        seedCase(MediaType.GAMES);
        const before = activity();
        if (failure === "backup") {
            writeFileSync(join(directory, "activity-repair-backups"), "Block backup directory creation");
        }
        else {
            db.run("CREATE TRIGGER fail_repair BEFORE UPDATE ON user_media_monthly_activity WHEN OLD.media_type = 'games' BEGIN SELECT RAISE(ABORT, 'write failed'); END");
        }
        const result = await runCli(["--evidence-only", "--apply"]);
        expect(result).toMatchObject({ exitCode: 1 });
        expect(activity()).toEqual(before);
    });

    it.each([
        ["--apply"],
        ["--select", "books:1:1"],
        ["--evidence-only", "--apply", "--select", "books:1:1"],
        ["--evidence-only", "--apply", "--output", "unused.json"],
    ])("CLI rejects incompatible direct repair arguments %j", async (...args) => {
        seedCase();
        const before = activity();
        expect((await runCli(args)).exitCode).toBe(1);
        expect(activity()).toEqual(before);
        expect(existsSync(join(directory, "activity-repair-backups"))).toBe(false);
    });

    it("CLI evidence-only reports preserve applicable history and orphan proposals while excluding estimated corrections", async () => {
        seedCase();
        seedCase(MediaType.GAMES);
        seedCase(MediaType.MANGA);
        db.run("DELETE FROM games_list");
        db.run("DELETE FROM user_media_update WHERE media_type = 'manga'");
        db.run("DELETE FROM user_media_stats_history WHERE media_type = 'manga'");
        const before = activity();
        const expected = report().filter(entry => entry.id === "books:1:1" || entry.id === "games:1:1");
        const output = join(directory, "evidence-only.json");
        const result = await runCli(["--evidence-only", "--output", output]);
        expect(result, result.stderr).toMatchObject({ exitCode: 0 });
        const saved = JSON.parse(readFileSync(output, "utf8"));
        expect(saved).toMatchObject({ evidenceOnly: true, excludedCandidates: 1, scannedTitles: 3 });
        expect(saved.entries).toEqual(expected);
        expect(saved.entries.map((entry: { repairKind: string }) => entry.repairKind).sort()).toEqual(["history", "orphan"]);
        const readable = readFileSync(join(directory, "evidence-only.txt"), "utf8");
        expect(readable).toContain("Evidence-only selection: 1 other candidates excluded");
        expect(readable).toContain("No estimated list ceiling corrections are included.");
        expect(readable).not.toContain("manga:1:1");
        expect(activity()).toEqual(before);

        const excluded = await runCli(["--apply", output, "--select", "books:1:1,manga:1:1"]);
        expect(excluded).toMatchObject({ exitCode: 1 });
        expect(excluded.stderr).toContain("not eligible");
        expect((await runCli(["--apply", output, "--select", "books:1:1", "--evidence-only"])).exitCode).toBe(1);
        expect(activity()).toEqual(before);
        expect(existsSync(join(directory, "activity-repair-backups"))).toBe(false);

        const applied = await runCli(["--apply", output, "--select", "books:1:1,games:1:1"]);
        expect(applied, applied.stderr).toMatchObject({ exitCode: 0 });
        expect(activity()).toMatchObject([
            { media_type: "books", progress_gained: 100 },
            { media_type: "manga", progress_gained: 120 },
        ]);
        expect(readdirSync(join(directory, "activity-repair-backups"))).toHaveLength(1);
    });

    it("CLI rejects an evidence-only plan when activity changes after the audit", async () => {
        seedCase();
        const output = join(directory, "evidence-only.json");
        expect((await runCli(["--evidence-only", "--output", output])).exitCode).toBe(0);
        db.run("UPDATE user_media_monthly_activity SET progress_gained = 119");
        const before = activity();
        const result = await runCli(["--apply", output, "--select", "books:1:1"]);
        expect(result).toMatchObject({ exitCode: 1 });
        expect(result.stderr).toContain("changed");
        expect(activity()).toEqual(before);
        expect(existsSync(join(directory, "activity-repair-backups"))).toBe(false);
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
