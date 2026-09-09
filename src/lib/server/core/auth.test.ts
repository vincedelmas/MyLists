import Database from "bun:sqlite";
import {createLocalAccountIssuer} from "better-auth/db";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/env/server", () => ({
    serverEnv: {
        LOG_LEVEL: "silent",
        UPLOADS_DIR_NAME: "static",
        BETTER_AUTH_SECRET: "auth-test-secret-for-isolated-database",
    },
}));


describe("authentication user updates", () => {
    let sqlite: Database;
    let auth: typeof import("./auth").auth;
    let cookie: string;

    beforeAll(async () => {
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
        dbContext.db.update(schema.user).set({ name: "reviewuser" }).run();
    });

    afterAll(() => sqlite.close());

    const updateUser = (body: Record<string, unknown>) => auth.handler(new Request("http://localhost:3000/api/auth/update-user", {
        method: "POST",
        headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify(body),
    }));

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
    });
});
