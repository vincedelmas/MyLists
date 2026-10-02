import z from "zod";
import {and, eq} from "drizzle-orm";
import {logger} from "@/lib/server/core/logger";
import type {MediaType} from "@/lib/utils/enums";
import {isNotFound} from "@tanstack/react-router";
import {AsyncLocalStorage} from "node:async_hooks";
import {userMediaSettings} from "@/lib/server/database/schema";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {MCP_READ_SCOPE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";
import type {ToolAnnotations, CallToolResult} from "@modelcontextprotocol/sdk/types.js";
import {ActivityCorrectionRequired} from "@/lib/server/domain/tracking/monthly-activity.service";


export type McpAccess = {
    userId: number;
    username: string;
    scopes: Set<string>;
};


type RegisterOptions<T extends z.ZodObject> = {
    inputSchema: T;
    write?: boolean;
    description: string;
    annotations?: ToolAnnotations;
}


export const mcpRequestContext = new AsyncLocalStorage<McpAccess>();


const toolErrorMessage = (error: unknown) => {
    if (error instanceof z.ZodError) {
        return error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    }

    if (error instanceof FormattedError) {
        return error.message;
    }

    if (error instanceof UnauthorizedError) {
        return "You do not have access to this media.";
    }

    if (isNotFound(error)) {
        return "Media not found.";
    }

    if (error instanceof ActivityCorrectionRequired) {
        return "This change needs an activity correction. Review it on MyLists.";
    }
};


export const createToolContext = (server: McpServer, access: McpAccess) => {
    return {
        userId: access.userId,
        username: access.username,

        register<T extends z.ZodObject>(name: string, options: RegisterOptions<T>, action: (input: z.output<T>) => unknown) {
            const { write = false, annotations, ...config } = options;
            if (!access.scopes.has(write ? MCP_WRITE_SCOPE : MCP_READ_SCOPE)) return;

            const callTool = async (input: Record<string, unknown>): Promise<CallToolResult> => {
                try {
                    const { mediaType } = input as { mediaType?: MediaType };

                    if (mediaType) {
                        const settings = getDbClient()
                            .select({ active: userMediaSettings.active })
                            .from(userMediaSettings)
                            .where(and(
                                eq(userMediaSettings.mediaType, mediaType),
                                eq(userMediaSettings.userId, access.userId),
                            )).get();

                        if (!settings?.active) {
                            throw new FormattedError("Enable this media list in MyLists settings first.");
                        }
                    }

                    const data = {
                        result: (await action(input as z.output<T>)) ?? null,
                    };

                    return {
                        structuredContent: data,
                        content: [{ type: "text", text: JSON.stringify(data) }],
                    };
                }
                catch (error) {
                    const message = toolErrorMessage(error);
                    if (!message) {
                        logger.error({ err: error, userId: access.userId, tool: name }, "MCP tool failed");
                    }

                    return {
                        isError: true,
                        content: [{ type: "text", text: message ?? "MyLists could not complete this operation. Please try again." }],
                    };
                }
            };

            server.registerTool<z.ZodObject, z.ZodObject>(name, {
                ...config,
                annotations: {
                    readOnlyHint: !write,
                    idempotentHint: true,
                    openWorldHint: false,
                    destructiveHint: false,
                    ...annotations,
                },
            }, callTool);
        },
    };
}


export type ToolContext = ReturnType<typeof createToolContext>;
