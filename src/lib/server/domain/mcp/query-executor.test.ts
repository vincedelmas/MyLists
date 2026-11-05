import Database from "bun:sqlite";
import {describe, expect, it} from "vitest";
import {validateQuerySql} from "@/lib/server/domain/mcp/sql-query/query-validation";
import {executeSnapshotQuery} from "@/lib/server/domain/mcp/sql-query/query-executor";
import queryProcessSource from "@/lib/server/domain/mcp/sql-query/query-process.js?raw";
import {QUERY_LIMITS} from "@/lib/utils/mcp/query-limits";


const createSnapshot = (count = 3, title = "Movie") => {
    using db = new Database(":memory:");
    db.run("CREATE TABLE entries(media_id INTEGER PRIMARY KEY, title TEXT, rating REAL)");
    const insert = db.prepare("INSERT INTO entries VALUES (?, ?, ?)");
    db.transaction(() => {
        for (let id = 1; id <= count; id++) insert.run(id, title, id % 10);
    })();
    insert.finalize();
    return db.serialize();
};


describe("isolated insight query execution", () => {
    it("executes bound CTE analytics and preserves positional columns", async () => {
        const result = await executeSnapshotQuery(createSnapshot(), {
            sql: validateQuerySql("WITH rated AS (SELECT * FROM entries WHERE rating >= $rating) SELECT count(*) AS count, avg(rating) AS average FROM rated"),
            parameters: { rating: 2 },
        });

        expect(result).toMatchObject({ columns: ["count", "average"], rows: [[2, 2.5]], truncated: false });
        expect(result.queryMs).toBeGreaterThanOrEqual(0);
        expect(await executeSnapshotQuery(createSnapshot(), { sql: "SELECT rating AS '2', title AS '1' FROM entries WHERE media_id = 1" }))
            .toMatchObject({ columns: ["2", "1"], rows: [[1, "Movie"]] });
    });

    it("enforces read-only storage even when SQL validation is bypassed", async () => {
        const snapshot = createSnapshot();
        await expect(executeSnapshotQuery(snapshot, { sql: "DELETE FROM entries" })).rejects.toThrow("readonly");
        expect(await executeSnapshotQuery(snapshot, { sql: "SELECT count(*) AS count FROM entries" })).toMatchObject({ rows: [[3]] });
    });

    it("bounds returned rows and distinguishes exact-size results from truncation", async () => {
        const snapshot = createSnapshot();
        expect(await executeSnapshotQuery(snapshot, { sql: "SELECT media_id FROM entries ORDER BY media_id", maxRows: 2 }))
            .toMatchObject({ columns: ["media_id"], rows: [[1], [2]], truncated: true });
        expect(await executeSnapshotQuery(snapshot, { sql: "SELECT media_id FROM entries ORDER BY media_id", maxRows: 3 }))
            .toMatchObject({ rows: [[1], [2], [3]], truncated: false });
    });

    it("caps UTF-8 response bytes and reports oversized individual rows", async () => {
        const result = await executeSnapshotQuery(createSnapshot(10, "é".repeat(50_000)), { sql: "SELECT title FROM entries" });
        expect(result.truncated).toBe(true);
        expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(QUERY_LIMITS.maxResponseBytes);
        expect(result.rows).toHaveLength(2);

        await expect(executeSnapshotQuery(createSnapshot(1, "é".repeat(150_000)), { sql: "SELECT title FROM entries" }))
            .rejects.toThrow("result row exceeds");
    });

    it("rejects missing bindings, duplicate columns and oversized parameters", async () => {
        const snapshot = createSnapshot();
        await expect(executeSnapshotQuery(snapshot, { sql: "SELECT $missing" })).rejects.toThrow();
        await expect(executeSnapshotQuery(snapshot, { sql: "SELECT 1 AS value, 2 AS value" })).rejects.toThrow("distinct aliases");
        await expect(executeSnapshotQuery(snapshot, { sql: "SELECT $value", parameters: { value: "x".repeat(QUERY_LIMITS.maxParameterBytes) } }))
            .rejects.toThrow("parameters exceed");
    });

    it("kills an expensive query while the server event loop remains responsive", async () => {
        const startedAt = performance.now();
        let responsive = false;
        const heartbeat = setTimeout(() => {
            responsive = true;
        }, 25);
        try {
            await expect(executeSnapshotQuery(createSnapshot(), {
                sql: validateQuerySql("WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers) SELECT sum(n) FROM numbers"),
            }, 150)).rejects.toThrow("execution time limit");
            expect(responsive).toBe(true);
            expect(performance.now() - startedAt).toBeLessThan(2_000);
            expect(await executeSnapshotQuery(createSnapshot(), { sql: "SELECT count(*) AS count FROM entries" })).toMatchObject({ rows: [[3]] });
        }
        finally {
            clearTimeout(heartbeat);
        }
    });

    it("stops SQLite allocations that exceed the per-process heap budget", async () => {
        const snapshot = createSnapshot();
        const bytes = QUERY_LIMITS.sqliteHeapBytes + 32 * 1024 * 1024;
        const input = {
            sql: validateQuerySql("SELECT length(randomblob($bytes)) AS size"),
            parameters: { bytes },
        };

        // Run the identical worker and allocation with a larger cap first. Returning
        // only the length avoids hitting the response-size or binary-value limits.
        const control = Bun.spawn([process.execPath, "--no-env-file", "--eval", queryProcessSource], {
            stdout: "pipe",
            stderr: "pipe",
            env: { TZ: "UTC" },
            stdin: new Blob([JSON.stringify({
                ...input,
                maxRows: QUERY_LIMITS.defaultRows,
                maxResponseBytes: QUERY_LIMITS.maxResponseBytes,
                sqliteHeapBytes: bytes * 2,
            }) + "\n", Buffer.from(snapshot)]),
        });
        const output = await new Response(control.stdout).json();
        expect(await control.exited).toBe(0);
        expect(output).toMatchObject({ columns: ["size"], rows: [[bytes]], truncated: false });

        await expect(executeSnapshotQuery(snapshot, input)).rejects.toThrow("out of memory");
        expect(await executeSnapshotQuery(snapshot, { sql: "SELECT count(*) AS count FROM entries" }))
            .toMatchObject({ rows: [[3]] });
    });
});
