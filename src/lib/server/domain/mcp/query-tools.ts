import {QUERY_LIMITS} from "@/lib/server/core/mcp/config";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {QUERY_SCHEMA} from "@/lib/server/domain/mcp/query-snapshot";
import {runMyListsQuery} from "@/lib/server/domain/mcp/query.service";
import {myListsQueryInputSchema} from "@/lib/server/domain/mcp/tool-schemas";


export const registerQueryTools = ({ register, userId }: ToolContext) => {
    const description = [
        "Query the connected user's own media data and catalog metadata with read-only SQLite.",
        "Call action=schema first, then action=sql with one SELECT (CTEs allowed).",
        "Bind $name as parameters={name:value}.",
        `maxRows defaults to ${QUERY_LIMITS.defaultRows} (maximum ${QUERY_LIMITS.maxRows}).`,
        "Rows are arrays in columns order; truncated means the result is incomplete.",
    ].join(", ");

    register("query_mylists", {
        description: description,
        inputSchema: myListsQueryInputSchema,
    }, ({ action, sql, parameters, maxRows }) => {
        if (action === "schema") {
            return { schema: QUERY_SCHEMA };
        }

        return runMyListsQuery({
            userId,
            sql: sql!,
            parameters,
            maxRows: maxRows ?? QUERY_LIMITS.defaultRows,
        });
    });
};
