import {RoleType} from "@/lib/utils/enums";
import {auth} from "@/lib/server/core/auth";
import {requireMcpAuth} from "@better-auth/mcp";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {getMcpAccess} from "@/lib/server/domain/mcp/mcp.repository";
import {registerMediaTools} from "@/lib/server/domain/mcp/tools/media-tools";
import {registerQueryTools} from "@/lib/server/domain/mcp/tools/query-tools";
import {MCP_READ_SCOPE, MCP_RESOURCE, MCP_SCOPES} from "@/lib/server/core/mcp/config";
import {createToolContext, mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {registerDynamicListTools} from "@/lib/server/domain/mcp/tools/dynamic-list-tools";
import {registerAdminBookMergeTools} from "@/lib/server/domain/mcp/tools/admin-book-merge-tools";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";


export const handleMcpRequest = requireMcpAuth(auth, async (request, accessTokenClaims) => {
    const access = getMcpAccess(accessTokenClaims);

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

    const isAdmin = access.role === RoleType.ADMIN;
    const instructions = [
        "Read and update the connected user's own media lists.",
        "Use query_mylists for SQL analysis.",
        "Use dynamic_list_schema and preview_dynamic_list to design dynamic lists; create_dynamic_list saves their rules.",
        "Search before selecting a title, ask the user to resolve ambiguous titles or seasons.",
        "Read the current entry before updating it.",
        ...(isAdmin
            ? ["Admin book-grouping tools are available to review catalog books and stage Work merge suggestions for the admin UI."]
            : []),
    ];

    const server = new McpServer({ name: "MyLists", version: "1.0.0" }, {
        instructions: instructions.join(", "),
    });

    const context = createToolContext(server, access);

    registerMediaTools(context);
    registerQueryTools(context);
    registerDynamicListTools(context);

    if (isAdmin) {
        registerAdminBookMergeTools(context, server);
    }

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
