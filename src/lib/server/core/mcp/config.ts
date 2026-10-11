import {clientEnv} from "@/env/client";


export const MCP_READ_SCOPE = "mylists:read";

export const MCP_WRITE_SCOPE = "mylists:write";

export const MCP_SCOPES = [MCP_READ_SCOPE, MCP_WRITE_SCOPE, "offline_access"];

export const MCP_RESOURCE = new URL("/api/mcp", clientEnv.VITE_BASE_URL).href;
