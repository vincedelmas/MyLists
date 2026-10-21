import path from "node:path";
import {tmpdir} from "node:os";
import {eq, ne} from "drizzle-orm";
import Database from "bun:sqlite";
import {Readable} from "node:stream";
import {EventEmitter} from "node:events";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {RoleType} from "@/lib/utils/enums";
import {MCP_READ_SCOPE, MCP_RESOURCE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";


const mailMocks = vi.hoisted(() => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
const imageMocks = vi.hoisted(() => ({
    lookup: vi.fn(),
    httpsGet: vi.fn(),
    env: { BASE_UPLOADS_LOCATION: "" },
}));


vi.mock("@/lib/server/core/mail-sender", () => ({ sendEmail: mailMocks.sendEmail }));
vi.mock("@/lib/server/core/admin-auth", () => ({ clearAdminCookie: vi.fn() }));
vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/env/server", () => ({
    serverEnv: {
        get BASE_UPLOADS_LOCATION() { return imageMocks.env.BASE_UPLOADS_LOCATION; },
        LOG_LEVEL: "silent",
        ADMIN_MAIL_USERNAME: "mail@example.com",
        ADMIN_MAIL_PASSWORD: "test-mail-password",
        UPLOADS_DIR_NAME: "static",
        GITHUB_CLIENT_ID: "github-test-client",
        GITHUB_CLIENT_SECRET: "github-test-secret",
        GOOGLE_CLIENT_ID: "google-test-client",
        GOOGLE_CLIENT_SECRET: "google-test-secret",
        BETTER_AUTH_SECRET: "auth-test-secret-for-isolated-database",
    },
}));
vi.mock("node:dns/promises", () => ({ lookup: imageMocks.lookup }));
vi.mock("node:https", () => ({ get: imageMocks.httpsGet }));


describe("authentication", () => {
    let sqlite: Database;
    let auth: typeof import("./auth").auth;
    let cookie: string;
    let userId: number;

    beforeAll(async () => {
        imageMocks.env.BASE_UPLOADS_LOCATION = await mkdtemp(path.join(tmpdir(), "mylists-auth-avatar-test-"));
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        ({ auth } = await import("./auth"));
        const context = await auth.$context;
        // Better Auth skips origin checks by default in tests; exercise production checks here.
        context.skipOriginCheck = false;
        const user = await context.internalAdapter.createUser({
            name: "reviewuser",
            email: "review@example.com",
            emailVerified: true,
        }, { method: "admin" });
        userId = Number(user.id);
        await context.internalAdapter.linkAccount({
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: await context.password.hash("test-password"),
        });

        const login = await auth.api.signInEmail({
            body: { email: "review@example.com", password: "test-password" },
            returnHeaders: true,
        });
        cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        mailMocks.sendEmail.mockClear();
        dbContext.db.update(schema.user).set({ email: "review@example.com", emailVerified: true })
            .where(eq(schema.user.id, userId)).run();
        dbContext.db.delete(schema.user).where(ne(schema.user.email, "review@example.com")).run();
        dbContext.db.update(schema.user).set({ name: "reviewuser", role: RoleType.USER }).run();
        imageMocks.lookup.mockReset().mockResolvedValue([{ address: "93.184.215.14", family: 4 }]);
        imageMocks.httpsGet.mockReset().mockImplementation((_options, callback) => {
            const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64");
            const response = Object.assign(Readable.from([png]), { statusCode: 200, headers: {} });
            queueMicrotask(() => callback(response));
            return new EventEmitter();
        });
    });

    afterAll(async () => {
        sqlite.close();
        await rm(imageMocks.env.BASE_UPLOADS_LOCATION, { recursive: true, force: true });
    });

    const updateUser = (body: Record<string, unknown>) => auth.handler(new Request("http://localhost:3000/api/auth/update-user", {
        method: "POST",
        headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify(body),
    }));

    // The phone reaches the LAN address while auth and MCP retain a localhost canonical URL.
    const signInNative = (headers: Record<string, string> = {}, password = "test-password") => auth.handler(new Request("http://192.168.1.10:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "expo-origin": "mylists://", "content-type": "application/json", ...headers },
        body: JSON.stringify({ email: "review@example.com", password, rememberMe: true }),
    }));

    it("issues, restores, and revokes a native session over LAN with a localhost canonical URL", async () => {
        const login = await signInNative();
        expect(login.status).toBe(200);
        expect(await login.json()).toMatchObject({ user: { email: "review@example.com" } });
        const sessionCookie = login.headers.getSetCookie().find(value => value.startsWith("mylists.session_token="))!;
        expect(sessionCookie).toMatch(/Max-Age=\d+/i);
        const nativeCookie = sessionCookie.split(";")[0];

        const restored = await auth.handler(new Request("http://192.168.1.10:3000/api/auth/get-session?disableCookieCache=true", {
            headers: { cookie: nativeCookie, "expo-origin": "mylists://" },
        }));
        expect(restored.status).toBe(200);
        expect(await restored.json()).toMatchObject({ user: { email: "review@example.com" } });

        const logout = await auth.handler(new Request("http://192.168.1.10:3000/api/auth/sign-out", {
            method: "POST",
            headers: { cookie: nativeCookie, "expo-origin": "mylists://", "content-type": "application/json" },
            body: "{}",
        }));
        expect(logout.status).toBe(200);
        expect(await auth.api.getSession({ headers: new Headers({ cookie: nativeCookie }), query: { disableCookieCache: true } })).toBeNull();
    });

    it.each<Record<string, string>>([
        { "expo-origin": "untrusted://" },
        { origin: "https://untrusted.example", "expo-origin": "mylists://" },
    ])("rejects untrusted native/browser origins without issuing a session: %j", async (headers) => {
        const response = await signInNative(headers);
        expect(response.status).toBe(403);
        expect(response.headers.getSetCookie().some(value => value.startsWith("mylists.session_token="))).toBe(false);
    });

    it("rejects incorrect credentials from the native client", async () => {
        const response = await signInNative({}, "incorrect-password");
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({ code: "INVALID_EMAIL_OR_PASSWORD" });
    });

    it("restores cookie sessions without signing JWTs or changing unreadable MCP keys", async () => {
        const context = await auth.$context;
        const unreadableKey = await context.adapter.create({
            model: "jwks",
            data: {
                alg: "EdDSA",
                crv: "Ed25519",
                publicKey: "{}",
                privateKey: JSON.stringify("unreadable-encrypted-key"),
                createdAt: new Date(Date.now() + 60_000),
            },
        });

        try {
            const response = await auth.handler(new Request("http://192.168.1.10:3000/api/auth/get-session?disableCookieCache=true", {
                headers: { cookie, "expo-origin": "mylists://" },
            }));

            expect(response.status).toBe(200);
            expect(await response.json()).toMatchObject({ user: { email: "review@example.com" } });
            expect(response.headers.has("set-auth-jwt")).toBe(false);
            expect(await context.adapter.findOne({ model: "jwks", where: [{ field: "id", value: unreadableKey.id }] }))
                .toMatchObject({ privateKey: JSON.stringify("unreadable-encrypted-key") });
        }
        finally {
            await context.adapter.delete({ model: "jwks", where: [{ field: "id", value: unreadableKey.id }] });
        }
    });

    it("does not expose the standalone token endpoint alongside the MCP OAuth provider", async () => {
        const response = await auth.handler(new Request("http://localhost:3000/api/auth/token", { headers: { cookie } }));
        expect(response.status).toBe(404);
    });

    it("requires email verification for native sign-in", async () => {
        dbContext.db.update(schema.user).set({ emailVerified: false }).where(eq(schema.user.id, userId)).run();
        const response = await signInNative();
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    });

    const signInOAuth = async (providerId: "github" | "google", image?: string) => {
        const context = await auth.$context;
        const provider = context.socialProviders.find(provider => provider.id === providerId)!;
        vi.spyOn(provider, "validateAuthorizationCode").mockResolvedValue({ accessToken: "test-access-token" });
        vi.spyOn(provider, "getUserInfo").mockResolvedValue({
            user: { name: "avataruser", email: "avatar@example.com", emailVerified: true, image },
            data: { id: 123456, sub: "123456" },
        });

        const login = await auth.api.signInSocial({
            body: { provider: providerId, callbackURL: "http://localhost:3000/", disableRedirect: true },
            returnHeaders: true,
        });
        const params = new URLSearchParams({
            code: "test-code",
            state: new URL(login.response.url!).searchParams.get("state")!,
        });
        const response = await auth.handler(new Request(`http://localhost:3000/api/auth/callback/${providerId}?${params}`, {
            headers: { cookie: login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") },
        }));

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("http://localhost:3000/");
        return dbContext.db.select().from(schema.user).where(ne(schema.user.email, "review@example.com")).get()!;
    };

    it("requires approval at the current address before verifying the new address", async () => {
        const response = await auth.handler(new Request("http://localhost:3000/api/auth/change-email", {
            method: "POST",
            headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" },
            body: JSON.stringify({ newEmail: "new@example.com" }),
        }));

        expect(response.status).toBe(200);
        expect(mailMocks.sendEmail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            to: "review@example.com",
            newEmail: "new@example.com",
            template: "changeEmail",
        }));
        expect(dbContext.db.select().from(schema.user).where(eq(schema.user.id, userId)).get()?.email)
            .toBe("review@example.com");

        const approval = await auth.handler(new Request(mailMocks.sendEmail.mock.calls[0][0].link));
        expect(approval.status).toBe(302);
        expect(mailMocks.sendEmail).toHaveBeenCalledTimes(2);
        expect(mailMocks.sendEmail.mock.calls[1][0]).toMatchObject({ to: "new@example.com", template: "register" });
        expect(dbContext.db.select().from(schema.user).where(eq(schema.user.id, userId)).get()?.email)
            .toBe("review@example.com");

        const verification = await auth.handler(new Request(mailMocks.sendEmail.mock.calls[1][0].link));
        expect(verification.status).toBe(302);
        expect(dbContext.db.select().from(schema.user).where(eq(schema.user.id, userId)).get())
            .toMatchObject({ email: "new@example.com", emailVerified: true });
    });

    it("prevents unverified accounts from bypassing current-address approval", async () => {
        dbContext.db.update(schema.user).set({ emailVerified: false }).where(eq(schema.user.id, userId)).run();

        const response = await auth.handler(new Request("http://localhost:3000/api/auth/change-email", {
            method: "POST",
            headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" },
            body: JSON.stringify({ newEmail: "new@example.com" }),
        }));

        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
        expect(mailMocks.sendEmail).not.toHaveBeenCalled();
        expect(dbContext.db.select().from(schema.user).where(eq(schema.user.id, userId)).get()?.email)
            .toBe("review@example.com");
    });

    it.each(["", "   ", "ab", "a".repeat(16), "invalid/name", null, 123])("rejects invalid username %j without changing the account", async (name) => {
        const response = await updateUser({ name });

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: "INVALID_USERNAME" });
        expect(dbContext.db.select({ name: schema.user.name }).from(schema.user).get()?.name).toBe("reviewuser");
    });

    it("trims and saves a valid username", async () => {
        const response = await updateUser({ name: "  Valid_Name-1  " });

        expect(response.status).toBe(200);
        expect(dbContext.db.select({ name: schema.user.name }).from(schema.user).get()?.name).toBe("Valid_Name-1");
    });

    it("allows updates that omit the username", async () => {
        const response = await updateUser({ image: "avatar.jpg" });

        expect(response.status).toBe(200);
        expect(dbContext.db.select({ name: schema.user.name }).from(schema.user).get()?.name).toBe("reviewuser");
        expect(imageMocks.httpsGet).not.toHaveBeenCalled();
    });

    it.each([RoleType.MANAGER, RoleType.ADMIN])("does not allow self-promotion to %s through account updates", async (role) => {
        const response = await updateUser({ name: "reviewuser", role });

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: "FIELD_NOT_ALLOWED" });
        expect(dbContext.db.select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.id, userId)).get()?.role)
            .toBe(RoleType.USER);
    });

    it.each([RoleType.USER, RoleType.MANAGER, RoleType.ADMIN])("does not accept an MCP bearer token as a browser session for a %s", async (role) => {
        dbContext.db.update(schema.user).set({ role }).where(eq(schema.user.id, userId)).run();
        const { token } = await auth.api.signJWT({ body: { payload: {
            sub: String(userId),
            aud: MCP_RESOURCE,
            client_id: "test-assistant",
            scope: `${MCP_READ_SCOPE} ${MCP_WRITE_SCOPE}`,
            role,
        } } });
        const headers = new Headers({ authorization: `Bearer ${token}` });

        expect(await auth.api.getSession({ headers, query: { disableCookieCache: true } })).toBeNull();

        const response = await auth.handler(new Request("http://localhost:3000/api/auth/update-user", {
            method: "POST",
            headers: { authorization: `Bearer ${token}`, origin: "http://localhost:3000", "content-type": "application/json" },
            body: JSON.stringify({ name: "reviewuser", role: RoleType.ADMIN }),
        }));
        expect(response.status).toBe(401);
        expect(dbContext.db.select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.id, userId)).get()?.role)
            .toBe(role);
    });

    it.each([
        ["github", "https://avatars.githubusercontent.com/u/123456?v=4"],
        ["google", "https://lh3.googleusercontent.com/a/avatar=s96-c"],
    ] as const)("downloads the %s avatar before storing its local filename", async (provider, imageUrl) => {
        const user = await signInOAuth(provider, imageUrl);
        const stored = sqlite.query<{ image: string }, [number]>("SELECT image FROM user WHERE id = ?").get(user.id)!;

        expect(stored.image).toMatch(/^[a-f0-9]{32}\.jpg$/);
        expect(user.image).toBe(`http://localhost:3000/static/profile-covers/${stored.image}`);
        const saved = await readFile(path.join(imageMocks.env.BASE_UPLOADS_LOCATION, "profile-covers", stored.image));
        expect(saved.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
        expect(await new Bun.Image(saved).metadata()).toMatchObject({ width: 300, height: 300 });
        const url = new URL(imageUrl);
        expect(imageMocks.httpsGet).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            servername: url.hostname,
            path: `${url.pathname}${url.search}`,
        }), expect.any(Function));
    });

    it("allows OAuth signup without an avatar", async () => {
        const user = await signInOAuth("github");

        expect(user.image).toBeNull();
        expect(imageMocks.httpsGet).not.toHaveBeenCalled();
    });

    it("allows OAuth signup without storing a broken URL when the avatar download fails", async () => {
        imageMocks.httpsGet.mockImplementationOnce(() => {
            const request = new EventEmitter();
            queueMicrotask(() => request.emit("error", new Error("Avatar download failed")));
            return request;
        });

        const user = await signInOAuth("github", "https://avatars.githubusercontent.com/u/123456?v=4");

        expect(user.image).toBeNull();
    });
});
