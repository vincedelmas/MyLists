import Database from "bun:sqlite";
import {serverEnv} from "@/env/server";
import {FormattedError} from "@/lib/utils/error-classes";
import {validateQuerySql} from "@/lib/server/domain/mcp/sql-query/query-validation";
import {buildQuerySnapshot} from "@/lib/server/domain/mcp/sql-query/query-snapshot";
import {executeSnapshotQuery, type QueryParameters} from "@/lib/server/domain/mcp/sql-query/query-executor";


type QueryInput = {
    sql: string;
    userId: number;
    maxRows: number;
    parameters?: QueryParameters;
}


const activeQueries = new Set<number>();


export const MAX_QUERY_SQL_LENGTH = 20_000;


export const QUERY_LIMITS = {
    maxRows: 1_000,
    defaultRows: 200,
    timeoutMs: 5_000,
    maxConcurrentQueries: 4,
    maxResponseBytes: 256 * 1024,
    maxParameterBytes: 64 * 1024,
    sqliteHeapBytes: 128 * 1024 * 1024,
} as const;


export const QUERY_SNAPSHOT_LIMITS = {
    maxRows: 100_000,
    maxBytes: 32 * 1024 * 1024,
};


export const runMyListsQuery = async (input: QueryInput) => {
    const startedAt = performance.now();
    const sql = validateQuerySql(input.sql);

    if (activeQueries.has(input.userId) || activeQueries.size >= QUERY_LIMITS.maxConcurrentQueries) {
        throw new FormattedError("An insight query is already running or the query service is busy. Try again shortly.");
    }

    activeQueries.add(input.userId);

    try {
        using source = new Database(serverEnv.DATABASE_URL, { readonly: true });
        source.run("PRAGMA busy_timeout = 1000");

        const snapshot = buildQuerySnapshot(source, input.userId);
        const result = await executeSnapshotQuery(snapshot.data, { ...input, sql });

        return {
            rows: result.rows,
            columns: result.columns,
            truncated: result.truncated,
            snapshotAt: snapshot.snapshotAt,
            snapshotRows: snapshot.rowCount,
            snapshotBytes: snapshot.data.byteLength,
            timings: {
                queryMs: result.queryMs,
                snapshotMs: snapshot.extractionMs,
                totalMs: performance.now() - startedAt,
            },
        };
    }
    finally {
        activeQueries.delete(input.userId);
    }
};
