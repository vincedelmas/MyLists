import z from "zod";
import {describe, expect, it, vi} from "vitest";
import {createToolContext} from "./tool-context";
import {MCP_READ_SCOPE, MCP_WRITE_SCOPE} from "./config";
import {FormattedError} from "@/lib/utils/error-classes";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {CallToolResult} from "@modelcontextprotocol/sdk/types.js";


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: vi.fn() }));
vi.mock("@/lib/server/domain/tracking/monthly-activity.service", () => ({ ActivityCorrectionRequired: class extends Error {} }));


const createRegistry = (scopes = [MCP_READ_SCOPE, MCP_WRITE_SCOPE]) => {
    const registerTool = vi.fn((_name: string, _config: unknown, action: (input: Record<string, unknown>) => Promise<CallToolResult>) => action);
    const context = createToolContext({ registerTool } as unknown as McpServer, {
        userId: 1,
        username: "owner",
        scopes: new Set(scopes),
    });

    return { context, registerTool };
};


const toolOptions = { inputSchema: z.object({}), description: "Update the connected user's media." };


describe("MCP tool results", () => {
    it("returns a JSON-serializable success result for functions with no return value", async () => {
        const { context, registerTool } = createRegistry();
        context.register("edit_media_tag", { ...toolOptions, write: true }, async () => {});

        const result = await registerTool.mock.results[0].value({});

        expect(result).toEqual({
            structuredContent: { result: null },
            content: [{ type: "text", text: '{"result":null}' }],
        });
        expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
    });

    it.each([{ kind: "saved", userMedia: { rating: 8 } }, false, 0, ""])("preserves an existing result: %j", async (value) => {
        const { context, registerTool } = createRegistry();
        context.register("update_media", { ...toolOptions, write: true }, async () => value);

        const result = await registerTool.mock.results[0].value({});

        expect(result).toEqual({
            structuredContent: { result: value },
            content: [{ type: "text", text: JSON.stringify({ result: value }) }],
        });
    });

    it("returns actionable errors instead of reporting a successful update", async () => {
        const { context, registerTool } = createRegistry();
        context.register("update_media", { ...toolOptions, write: true }, () => {
            throw new FormattedError("This movie is not in your list.");
        });

        expect(await registerTool.mock.results[0].value({})).toEqual({
            isError: true,
            content: [{ type: "text", text: "This movie is not in your list." }],
        });
    });

    it("exposes only read tools when the connection has read-only consent", () => {
        const { context, registerTool } = createRegistry([MCP_READ_SCOPE]);
        context.register("media_details", toolOptions, () => ({ mediaId: 1 }));
        context.register("update_media", { ...toolOptions, write: true }, () => {});

        expect(registerTool).toHaveBeenCalledTimes(1);
        expect(registerTool.mock.calls[0][0]).toBe("media_details");
    });
});
