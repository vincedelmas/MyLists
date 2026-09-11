import {beforeEach, describe, expect, it, vi} from "vitest";
import {APIError} from "better-auth/api";
import {postDeleteUserAccount} from "./user-settings";


const mocks = vi.hoisted(() => ({
    verifyPassword: vi.fn(),
    deleteUserAccount: vi.fn(),
    clearAdminCookie: vi.fn(),
    headers: new Headers({ cookie: "session=test" }),
}));

vi.mock("@tanstack/react-start", () => ({
    createServerFn: () => {
        let validator: { parse: (data: unknown) => unknown };
        const builder = {
            middleware: () => builder,
            validator: (schema: typeof validator) => {
                validator = schema;
                return builder;
            },
            handler: (handler: (args: unknown) => unknown) => async (args: { data: unknown }) => handler({
                data: validator.parse(args.data),
                context: { currentUser: { id: 42 } },
            }),
        };
        return builder;
    },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => ({ headers: mocks.headers }) }));
vi.mock("@/lib/server/middlewares/authentication", () => ({ requiredAuthMiddleware: {} }));
vi.mock("@/lib/server/core/auth", () => ({ auth: { api: { verifyPassword: mocks.verifyPassword } } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({ services: { account: { deleteUserAccount: mocks.deleteUserAccount } } }),
}));
vi.mock("@/lib/server/core/admin-auth", () => ({ clearAdminCookie: mocks.clearAdminCookie }));
vi.mock("@/lib/server/core/images/image-saver", () => ({ saveUploadedImage: vi.fn() }));
vi.mock("@/lib/server/database/async-storage", () => ({ withTransaction: vi.fn() }));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.verifyPassword.mockResolvedValue({ status: true });
    mocks.deleteUserAccount.mockReturnValue(true);
});

describe("account deletion password verification", () => {
    it.each([undefined, {}, { currentPassword: "" }])("rejects a missing or empty password: %j", async (data) => {
        await expect(postDeleteUserAccount({ data } as Parameters<typeof postDeleteUserAccount>[0])).rejects.toThrow();
        expect(mocks.verifyPassword).not.toHaveBeenCalled();
        expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
        expect(mocks.clearAdminCookie).not.toHaveBeenCalled();
    });

    it("rejects an incorrect password without deleting the account", async () => {
        mocks.verifyPassword.mockRejectedValue(new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD" }));

        await expect(postDeleteUserAccount({ data: { currentPassword: "wrong" } }))
            .rejects.toMatchObject({ name: "ValidationError", field: "currentPassword", message: "Current password incorrect" });
        expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
        expect(mocks.clearAdminCookie).not.toHaveBeenCalled();
    });

    it("does not delete the account when verification fails unexpectedly", async () => {
        mocks.verifyPassword.mockRejectedValue(new Error("Verification unavailable"));

        await expect(postDeleteUserAccount({ data: { currentPassword: "password" } }))
            .rejects.toThrow("Verification unavailable");
        expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
        expect(mocks.clearAdminCookie).not.toHaveBeenCalled();
    });

    it("verifies the session user's password before deleting their account", async () => {
        const verification = Promise.withResolvers<{ status: boolean }>();
        mocks.verifyPassword.mockReturnValue(verification.promise);

        const deletion = postDeleteUserAccount({ data: { currentPassword: " password " } });
        expect(mocks.verifyPassword).toHaveBeenCalledWith({
            headers: mocks.headers,
            body: { password: " password " },
        });
        expect(mocks.deleteUserAccount).not.toHaveBeenCalled();

        verification.resolve({ status: true });
        await expect(deletion).resolves.toBe(true);
        expect(mocks.deleteUserAccount).toHaveBeenCalledExactlyOnceWith({ userId: 42, type: "manual" });
        expect(mocks.clearAdminCookie).toHaveBeenCalledOnce();
    });
});
