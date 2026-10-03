import {tmpdir} from "node:os";
import {join} from "node:path";
import {mkdtemp, rm} from "node:fs/promises";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {runMyListsQuery} from "./query.service";
import {QUERY_LIMITS} from "./query-limits";
import {executeSnapshotQuery, type SnapshotQueryResult} from "./query-executor";
import {createQueryTestSource} from "./query-snapshot.fixture";


const { env } = vi.hoisted(() => ({ env: { DATABASE_URL: "" } }));
vi.mock("@/env/server", () => ({ serverEnv: env }));
vi.mock("./query-executor", () => ({ executeSnapshotQuery: vi.fn() }));


const result: SnapshotQueryResult = { columns: ["count"], rows: [[0]], truncated: false, queryMs: 1 };
const input = { userId: 1, sql: "SELECT count(*) AS count FROM entries", maxRows: 200 };


describe("MCP insight query service", () => {
    let directory: string;
    let databasePath: string;

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), "mylists-query-service-"));
        databasePath = join(directory, "source.db");
        using source = createQueryTestSource();
        await Bun.write(databasePath, source.serialize());
    });

    beforeEach(() => {
        env.DATABASE_URL = databasePath;
        vi.mocked(executeSnapshotQuery).mockReset().mockResolvedValue(result);
    });

    afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

    it("validates SQL before opening the source and returns snapshot timings", async () => {
        env.DATABASE_URL = join(directory, "absent.db");
        await expect(runMyListsQuery({ ...input, sql: "DELETE FROM entries" })).rejects.toThrow("SELECT");
        expect(executeSnapshotQuery).not.toHaveBeenCalled();
        env.DATABASE_URL = databasePath;

        expect(await runMyListsQuery(input)).toMatchObject({
            columns: ["count"], rows: [[0]], truncated: false,
            snapshotRows: 0, timings: { queryMs: 1 },
        });
    });

    it("prevents overlapping queries for one user and releases the slot afterward", async () => {
        let finish!: (value: SnapshotQueryResult) => void;
        vi.mocked(executeSnapshotQuery).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const pending = runMyListsQuery(input);
        try {
            await expect(runMyListsQuery(input)).rejects.toThrow("already running");
            expect(executeSnapshotQuery).toHaveBeenCalledTimes(1);
        }
        finally {
            finish(result);
            await pending;
        }
        await expect(runMyListsQuery(input)).resolves.toMatchObject({ rows: [[0]] });
    });

    it("bounds concurrent subprocesses across users", async () => {
        const finish: (() => void)[] = [];
        vi.mocked(executeSnapshotQuery).mockImplementation(() => new Promise(resolve => {
            finish.push(() => resolve(result));
        }));
        const pending = Array.from({ length: QUERY_LIMITS.maxConcurrentQueries }, (_, index) => runMyListsQuery({ ...input, userId: index + 1 }));
        try {
            await expect(runMyListsQuery({ ...input, userId: 100 })).rejects.toThrow("busy");
            expect(executeSnapshotQuery).toHaveBeenCalledTimes(QUERY_LIMITS.maxConcurrentQueries);
        }
        finally {
            finish.forEach(resolve => resolve());
            await Promise.all(pending);
        }
    });

    it("releases concurrency slots on source and execution failures", async () => {
        env.DATABASE_URL = join(directory, "absent.db");
        await expect(runMyListsQuery(input)).rejects.toThrow();
        env.DATABASE_URL = databasePath;
        vi.mocked(executeSnapshotQuery).mockRejectedValueOnce(new Error("execution failed"));
        await expect(runMyListsQuery(input)).rejects.toThrow("execution failed");
        await expect(runMyListsQuery(input)).resolves.toMatchObject({ rows: [[0]] });
    });
});
