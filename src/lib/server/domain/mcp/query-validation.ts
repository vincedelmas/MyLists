import {FormattedError} from "@/lib/utils/error-classes";
import {MAX_QUERY_SQL_LENGTH} from "@/lib/server/core/mcp/config";
import {parseStmt, traverse, type ParseStmtResult} from "sqlite3-parser";


const QUERY_BLOCKED_FUNCTIONS = ["load_extension", "readfile", "writefile"] as const;


const blockedFunctions = new Set<string>(QUERY_BLOCKED_FUNCTIONS);


const rejectFileAccess = (name: string) => {
    if (blockedFunctions.has(name.toLowerCase())) {
        throw new FormattedError(`Function ${name} is unavailable in analytics queries.`);
    }
};


export function validateQuerySql(sql: string): string {
    if (sql.length > MAX_QUERY_SQL_LENGTH) {
        throw new FormattedError(`SQL must contain at most ${MAX_QUERY_SQL_LENGTH} characters.`);
    }
    if (sql.includes("\0")) {
        throw new FormattedError("SQL cannot contain null characters.");
    }

    let result: ParseStmtResult;
    try {
        result = parseStmt(sql);
    }
    catch {
        throw new FormattedError("SQL could not be parsed. Use a single SQLite SELECT statement.");
    }

    if (result.status === "error") {
        throw new FormattedError(`Invalid SQLite query: ${result.errors[0].message}`);
    }

    if (result.root.type !== "SelectStmt" || result.root.body.select.type !== "SelectFrom") {
        throw new FormattedError("Only a single SELECT statement is allowed.");
    }

    // Snapshot enforces ownership. Let SQLite resolve tables and CTEs;
    // keep only restrictions that prevent access outside the snapshot.
    traverse(result.root, {
        nodes: {
            FunctionCallExpr(node) {
                rejectFileAccess(node.name.name);
            },
            FunctionCallStarExpr(node) {
                rejectFileAccess(node.name.name);
            },
            VariableExpr(node) {
                if (!/^\$[A-Za-z_][A-Za-z0-9_]*$/.test(node.name)) {
                    throw new FormattedError("Use named SQL parameters such as $rating; supply their values in parameters.");
                }
            },
        },
    });

    return sql;
}
