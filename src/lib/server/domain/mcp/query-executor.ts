import queryProcessSource from "./query-process.js?raw";
import {FormattedError} from "@/lib/utils/error-classes";
import {QUERY_LIMITS} from "@/lib/server/core/mcp/config";


export type QueryParameters = Record<string, string | number | null>;


type SnapshotInput = {
    sql: string;
    maxRows?: number,
    parameters?: QueryParameters;
};


export type QueryResult = {
    queryMs: number;
    columns: string[];
    truncated: boolean;
    rows: (string | number | null)[][];
};


// SQL already validated, this process never receives DB path
export const executeSnapshotQuery = async (snapshot: Uint8Array, input: SnapshotInput, timeoutMs: number = QUERY_LIMITS.timeoutMs): Promise<QueryResult> => {
    const parameters = input.parameters ?? {};
    if (Buffer.byteLength(JSON.stringify(parameters)) > QUERY_LIMITS.maxParameterBytes) {
        throw new FormattedError("Query parameters exceed 64 KiB. Use smaller parameter values.");
    }

    const request = JSON.stringify({
        parameters,
        sql: input.sql,
        sqliteHeapBytes: QUERY_LIMITS.sqliteHeapBytes,
        maxResponseBytes: QUERY_LIMITS.maxResponseBytes,
        maxRows: input.maxRows ?? QUERY_LIMITS.defaultRows,
    });

    const child = Bun.spawn([process.execPath, "--no-env-file", "--eval", queryProcessSource], {
        stdout: "pipe",
        stderr: "ignore",
        env: { TZ: "UTC" },
        stdin: new Blob([request + "\n", Buffer.from(snapshot)]),
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
    }, timeoutMs);

    try {
        const [output, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);

        if (timedOut) {
            throw new FormattedError("The insight query exceeded its execution time limit. Simplify the query and try again.");
        }

        if (exitCode !== 0 || !output) {
            throw new FormattedError("The insight query could not complete within its resource limits. Simplify the query and try again.");
        }

        const result: QueryResult | { error: string } = JSON.parse(output);
        if ("error" in result) {
            throw new FormattedError(`Query could not run: ${result.error}`);
        }

        return result;
    }
    finally {
        clearTimeout(timeout);

        child.kill();
        await child.exited;
    }
};
