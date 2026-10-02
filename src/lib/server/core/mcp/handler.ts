import {auth} from "@/lib/server/core/auth";
import {requireMcpAuth} from "@better-auth/mcp";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {getMcpAccess} from "@/lib/server/domain/mcp/mcp.repository";
import {registerMediaTools} from "@/lib/server/domain/mcp/media-tools";
import {MCP_READ_SCOPE, MCP_RESOURCE, MCP_SCOPES} from "@/lib/server/core/mcp/config";
import {createToolContext, mcpRequestContext, McpAccess} from "@/lib/server/core/mcp/tool-context";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";


export const createMyListsMcpServer = (access: McpAccess) => {
    const serverName = {
        name: "MyLists",
        version: "1.0.0",
    }

    const server = new McpServer(serverName, {
        instructions: "Manage the connected user's own media lists using the website's server functions. " +
            "Use getMediaListFilters and getMediaListSearchFilters for list filter values. Search before choosing a title; ask when titles or seasons are ambiguous. " +
            "Search result id is a provider apiId; use resolveExternalMedia to get a MyLists mediaId before postAddMediaToList. Ratings are 0–10; progress, " +
            "playtime (minutes), and repeats are absolute totals. Read current state before changing repeat counts. " +
            "Only report updates as saved when postUpdateUserMedia returns kind=saved. Account settings, entry deletion and collection operations are unavailable.",
    });

    const context = createToolContext(server, access);
    registerMediaTools(context);

    return server;
};


export const handleMcpRequest = requireMcpAuth(auth, async (request, claims) => {
    const access = getMcpAccess(claims);

    if (!access || !access.scopes.has(MCP_READ_SCOPE)) {
        return Response.json({
            id: null,
            jsonrpc: "2.0",
            error: { code: -32000, message: "Reconnect MyLists to authorize this request." },
        }, {
            status: 401,
            headers: {
                "WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${new URL("/.well-known/oauth-protected-resource", MCP_RESOURCE).href}"`,
            },
        });
    }

    const server = createMyListsMcpServer(access);
    const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: undefined,
    });

    try {
        await server.connect(transport);
        return await mcpRequestContext.run(access, () => transport.handleRequest(request));
    }
    finally {
        await server.close();
    }

}, {
    resource: MCP_RESOURCE,
    challengeScopes: MCP_SCOPES,
    requiredScopes: [MCP_READ_SCOPE],
});
