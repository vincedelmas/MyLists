import {describe, expect, it, vi} from "vitest";
import {RoleType} from "@/lib/utils/enums";
import {MCP_READ_SCOPE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";
import {createToolContext} from "@/lib/server/core/mcp/tool-context";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {registerAdminBookMergeTools} from "./admin-book-merge-tools";


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: vi.fn() }));


const registerFor = (role: RoleType, scopes = [MCP_READ_SCOPE, MCP_WRITE_SCOPE]) => {
    const registerTool = vi.fn();
    const registerPrompt = vi.fn();
    const server = { registerTool, registerPrompt } as unknown as McpServer;
    const context = createToolContext(server, {
        role,
        userId: 1,
        username: "tester",
        scopes: new Set(scopes),
    });

    registerAdminBookMergeTools(context, server);

    return {
        toolNames: registerTool.mock.calls.map(call => call[0]),
        promptNames: registerPrompt.mock.calls.map(call => call[0]),
    };
};


describe("MCP admin book merge tools", () => {
    it.each([RoleType.USER, RoleType.MANAGER])("exposes no admin tools or prompts for %s", (role) => {
        const result = registerFor(role);

        expect(result.toolNames).toEqual([]);
        expect(result.promptNames).toEqual([]);
    });

    it("exposes all admin book-grouping tools and prompt for admins with write scope", () => {
        const result = registerFor(RoleType.ADMIN);

        expect(result.toolNames).toEqual([
            "admin_get_books_for_grouping",
            "admin_propose_book_merges",
            "admin_mark_books_reviewed",
            "admin_list_book_merge_suggestions",
        ]);
        expect(result.promptNames).toEqual(["group_books_into_works"]);
    });

    it("exposes only read-only admin tools and omits the write prompt when admin has read-only consent", () => {
        const result = registerFor(RoleType.ADMIN, [MCP_READ_SCOPE]);

        expect(result.toolNames).toEqual([
            "admin_get_books_for_grouping",
            "admin_list_book_merge_suggestions",
        ]);
        expect(result.promptNames).toEqual([]);
    });
});
