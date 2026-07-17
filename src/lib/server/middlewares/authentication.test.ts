import {beforeEach, describe, expect, it, vi} from "vitest";
import {RoleType} from "@/lib/utils/enums";


const adminState = vi.hoisted(() => ({ authenticated: false }));
vi.mock("@/lib/utils/admin-token", () => ({
    isAdminAuthenticated: vi.fn(async () => adminState.authenticated),
}));
vi.mock("@/lib/server/core/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/server/core/container", () => ({ getContainer: vi.fn() }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: vi.fn() } }));

const {
    requiredAuthMiddleware,
    requiredAuthAndManagerRoleMiddleware,
    requiredAuthAndAdminRoleMiddleware,
    requiredAuthAndAdminTokenMiddleware,
} = await import("./authentication");


describe("authentication and role middleware", () => {
    beforeEach(() => {
        adminState.authenticated = false;
    });

    it("redirects an anonymous request and continues a signed-in request", async () => {
        await expect(runServer(requiredAuthMiddleware, {})).rejects.toMatchObject({ options: { to: "/login" } });
        await expect(runServer(requiredAuthMiddleware, { currentUser: user(RoleType.USER) })).resolves.toEqual({ ok: true });
    });

    it("allows manager and administrator catalog routes while hiding them from ordinary users", async () => {
        await expect(runServer(requiredAuthAndManagerRoleMiddleware, { currentUser: user(RoleType.USER) }))
            .rejects.toBeDefined();
        await expect(runServer(requiredAuthAndManagerRoleMiddleware, { currentUser: user(RoleType.MANAGER) }))
            .resolves.toEqual({ ok: true });
        await expect(runServer(requiredAuthAndManagerRoleMiddleware, { currentUser: user(RoleType.ADMIN) }))
            .resolves.toEqual({ ok: true });
    });

    it("requires administrator role and a valid shared step-up token", async () => {
        await expect(runServer(requiredAuthAndAdminRoleMiddleware, { currentUser: user(RoleType.MANAGER) }))
            .rejects.toBeDefined();
        await expect(runServer(requiredAuthAndAdminRoleMiddleware, { currentUser: user(RoleType.ADMIN) }))
            .resolves.toEqual({ ok: true });

        await expect(runServer(requiredAuthAndAdminTokenMiddleware, { currentUser: user(RoleType.ADMIN) }))
            .rejects.toMatchObject({ options: { to: "/admin" } });
        adminState.authenticated = true;
        await expect(runServer(requiredAuthAndAdminTokenMiddleware, { currentUser: user(RoleType.ADMIN) }))
            .resolves.toEqual({ ok: true });
    });
});


const user = (role: RoleType) => ({ id: 7, role });

type MiddlewareLike = { options: { server?: unknown } };
type MiddlewareServer = (input: {
    next: (options?: unknown) => Promise<{ ok: true }>;
    context: Record<string, unknown>;
}) => Promise<unknown>;

const runServer = (middleware: MiddlewareLike, context: Record<string, unknown>) => {
    if (typeof middleware.options.server !== "function") throw new Error("Middleware has no server handler.");
    const server = middleware.options.server as MiddlewareServer;
    return server({ next: async () => ({ ok: true }), context });
};
