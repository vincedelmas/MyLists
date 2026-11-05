import {QUERY_LIMITS} from "@/lib/utils/mcp/query-limits";
import {myListsQueryInputSchema} from "@/lib/schemas/tool-schemas";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {QUERY_SCHEMA} from "@/lib/server/domain/mcp/sql-query/query-schema";
import {runMyListsQuery} from "@/lib/server/domain/mcp/sql-query/query.service";


export const registerQueryTools = ({ register, userId }: ToolContext) => {
    register("query_mylists", {
        inputSchema: myListsQueryInputSchema,
        description: [
            "Query the connected user's own media data and catalog metadata with read-only SQLite.",
            "Call action=schema first, then action=sql with one SELECT (CTEs allowed).",
            "Bind $name as parameters={name:value}.",
            `maxRows defaults to ${QUERY_LIMITS.defaultRows} (maximum ${QUERY_LIMITS.maxRows}).`,
            "Rows are arrays in columns order; truncated means the result is incomplete.",
        ].join(", "),
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
