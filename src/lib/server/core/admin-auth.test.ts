import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {isAdminAuthenticated, setAdminCookie, verifyAdminPassword} from "./admin-auth";


const cookies = vi.hoisted(() => ({ value: undefined as string | undefined, set: vi.fn() }));

vi.mock("@/env/server", () => ({ serverEnv: {
    ADMIN_PASSWORD: "test-admin-password",
    ADMIN_TOKEN_SECRET: "test-admin-signing-secret-for-unit-tests",
    ADMIN_TTL_COOKIE_MIN: 10,
} }));
vi.mock("@tanstack/react-start/server", () => ({
    getCookie: () => cookies.value,
    setCookie: cookies.set,
    deleteCookie: vi.fn(),
}));


describe("admin step-up cookies", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cookies.value = undefined;
        cookies.set.mockImplementation((_name: string, value: string) => { cookies.value = value; });
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    });

    afterEach(() => { vi.useRealTimers(); });

    it("requires the separate admin password", async () => {
        expect(await verifyAdminPassword("test-admin-password")).toBe(true);
        expect(await verifyAdminPassword("wrong-password")).toBe(false);
    });

    it("issues an HttpOnly cookie that authenticates only its user", async () => {
        await setAdminCookie(1);

        expect(cookies.set).toHaveBeenCalledWith("myListsAdminToken", expect.any(String), expect.objectContaining({
            httpOnly: true, sameSite: "lax", maxAge: 600,
        }));
        expect(await isAdminAuthenticated(1)).toBe(true);
        expect(await isAdminAuthenticated(2)).toBe(false);
    });

    it("rejects the cookie at its expiry even if the client keeps sending it", async () => {
        await setAdminCookie(1);
        vi.advanceTimersByTime(10 * 60 * 1000);

        expect(await isAdminAuthenticated(1)).toBe(false);
    });

    it("rejects changes to the user or expiry without a new signature", async () => {
        await setAdminCookie(1);
        const original = cookies.value!;

        cookies.value = original.replace(/^1:/, "2:");
        expect(await isAdminAuthenticated(2)).toBe(false);

        cookies.value = original.replace(/:\d+\./, `:${Date.now() + 60 * 60 * 1000}.`);
        expect(await isAdminAuthenticated(1)).toBe(false);
    });

    it.each([undefined, "not-a-token", "1:9999999999999.forged-signature"])("rejects a missing or forged cookie: %s", async (value) => {
        cookies.value = value;
        expect(await isAdminAuthenticated(1)).toBe(false);
    });
});
