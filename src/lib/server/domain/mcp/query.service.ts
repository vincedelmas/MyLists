import Database from "bun:sqlite";
import {serverEnv} from "@/env/server";
import {FormattedError} from "@/lib/utils/error-classes";
import {QUERY_LIMITS} from "@/lib/server/core/mcp/config";
import {validateQuerySql} from "@/lib/server/domain/mcp/query-validation";
import {buildQuerySnapshot} from "@/lib/server/domain/mcp/query-snapshot";
import {executeSnapshotQuery, type QueryParameters} from "@/lib/server/domain/mcp/query-executor";


type QueryInput = {
    sql: string;
    userId: number;
    maxRows: number;
    parameters?: QueryParameters;
}


const activeQueries = new Set<number>();


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
