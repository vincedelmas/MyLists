import {clientEnv} from "@/env/client";


export const MCP_READ_SCOPE = "mylists:read";

export const MCP_WRITE_SCOPE = "mylists:write";

export const MCP_SCOPES = [MCP_READ_SCOPE, MCP_WRITE_SCOPE, "offline_access"];

export const MCP_RESOURCE = new URL("/api/mcp", clientEnv.VITE_BASE_URL).href;


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
