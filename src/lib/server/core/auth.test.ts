import path from "node:path";
import {tmpdir} from "node:os";
import {ne} from "drizzle-orm";
import Database from "bun:sqlite";
import {Readable} from "node:stream";
import {EventEmitter} from "node:events";
import {createLocalAccountIssuer} from "better-auth/db";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
const imageMocks = vi.hoisted(() => ({
    lookup: vi.fn(),
    httpsGet: vi.fn(),
    env: { BASE_UPLOADS_LOCATION: "" },
}));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/env/server", () => ({
    serverEnv: {
        get BASE_UPLOADS_LOCATION() { return imageMocks.env.BASE_UPLOADS_LOCATION; },
        LOG_LEVEL: "silent",
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

    beforeAll(async () => {
        imageMocks.env.BASE_UPLOADS_LOCATION = await mkdtemp(path.join(tmpdir(), "mylists-auth-avatar-test-"));
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        ({ auth } = await import("./auth"));
        const context = await auth.$context;
        const user = await context.internalAdapter.createUser({
            name: "reviewuser",
            email: "review@example.com",
            emailVerified: true,
        }, { method: "admin" });
        await context.internalAdapter.linkAccount({
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            issuer: createLocalAccountIssuer("credential"),
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
        dbContext.db.delete(schema.user).where(ne(schema.user.email, "review@example.com")).run();
        dbContext.db.update(schema.user).set({ name: "reviewuser" }).run();
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
