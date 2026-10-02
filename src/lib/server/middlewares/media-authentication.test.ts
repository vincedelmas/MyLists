import {RoleType} from "@/lib/utils/enums";
import {describe, expect, it, vi} from "vitest";
import {mcpRequestContext} from "@/lib/server/core/mcp/tool-context";
import {MCP_READ_SCOPE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";
import {optionalMediaAuthMiddleware, requiredMediaWriteMiddleware} from "./media-authentication";


vi.mock("./authentication", () => ({ publicAuthMiddleware: {} }));

type AuthCall = (options: { context: { currentUser?: { id: number; role: RoleType }; mcpAccess?: unknown }; next: (options?: unknown) => unknown }) => unknown;
const read = optionalMediaAuthMiddleware.options.server as unknown as AuthCall;
const write = requiredMediaWriteMiddleware.options.server as unknown as AuthCall;
const next = (result?: unknown) => result;


describe("media authentication across transports", () => {
    it("preserves browser identity and ignores a client-supplied MCP identity", () => {
        const currentUser = { id: 2, role: RoleType.ADMIN };
        expect(read({ next, context: { currentUser, mcpAccess: { userId: 99 } } })).toEqual({ context: { currentUser } });
        expect(write({ next, context: { currentUser } })).toBeUndefined();
        expect(read({ next, context: { mcpAccess: { userId: 99 } } })).toEqual({ context: { currentUser: undefined } });
    });

    it("uses the verified connection identity instead of a different browser cookie", () => {
        const result = mcpRequestContext.run({ userId: 1, username: "owner", scopes: new Set([MCP_READ_SCOPE]) }, () => read({
            next, context: { currentUser: { id: 2, role: RoleType.ADMIN } },
        }));
        expect(result).toEqual({ context: { currentUser: { id: 1, role: RoleType.USER } } });
    });

    it("enforces scopes inside server functions, independently of tool registration", () => {
        expect(() => mcpRequestContext.run({ userId: 1, username: "owner", scopes: new Set() }, () => read({ next, context: {} }))).toThrow("permission to read");
        expect(() => mcpRequestContext.run({ userId: 1, username: "owner", scopes: new Set([MCP_READ_SCOPE]) }, () => write({ next, context: {} }))).toThrow("permission to modify");
        expect(mcpRequestContext.run({ userId: 1, username: "owner", scopes: new Set([MCP_READ_SCOPE, MCP_WRITE_SCOPE]) }, () => write({ next, context: {} }))).toBeUndefined();
    });

    it("isolates concurrent connections and clears identity after the request", async () => {
        const results = await Promise.all([1, 2].map(userId => mcpRequestContext.run({ userId, username: "owner", scopes: new Set([MCP_READ_SCOPE]) }, async () => {
            await Promise.resolve();
            return read({ next, context: {} });
        })));
        expect(results).toEqual([1, 2].map(id => ({ context: { currentUser: { id, role: RoleType.USER } } })));
        expect(mcpRequestContext.getStore()).toBeUndefined();
    });
});
