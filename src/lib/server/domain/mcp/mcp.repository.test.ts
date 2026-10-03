import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MCP_READ_SCOPE, MCP_RESOURCE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";
import {getMcpAccess, revokeMcpConnection} from "./mcp.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));


describe("MCP live authorization", () => {
    let sqlite: Database;
    const scopes = [MCP_READ_SCOPE, MCP_WRITE_SCOPE, "offline_access"];
    const claims = { sub: "1", sid: "1", client_id: "assistant", scope: scopes.join(" "), mylistsIssuedAt: 100 };

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `user${id}`, email: `user${id}@example.invalid`, emailVerified: true,
            createdAt: "2026-01-01", updatedAt: "2026-01-01",
        }))).run();
        dbContext.db.insert(schema.session).values([1, 2].map(id => ({
            id, userId: id, token: `session${id}`, createdAt: new Date(), updatedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
        }))).run();
        dbContext.db.insert(schema.oauthClient).values(["assistant", "other-assistant"].map(clientId => ({
            clientId, redirectUris: ["https://assistant.example.invalid/callback"],
        }))).run();
        dbContext.db.insert(schema.oauthConsent).values([
            { userId: 1, clientId: "assistant" },
            { userId: 2, clientId: "assistant" },
            { userId: 1, clientId: "other-assistant" },
        ].map(grant => ({ ...grant, scopes, resources: [MCP_RESOURCE], createdAt: new Date(), updatedAt: new Date() }))).run();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        sqlite.close();
    });

    it("intersects token scopes with current consent", () => {
        dbContext.db.update(schema.oauthConsent).set({ scopes: [MCP_READ_SCOPE] }).where(eq(schema.oauthConsent.userId, 1)).run();

        expect(getMcpAccess(claims)).toEqual({ userId: 1, username: "user1", scopes: new Set([MCP_READ_SCOPE]) });
    });

    it.each(["expired session", "wrong session owner", "disabled client", "different resource"])("rejects %s", reason => {
        if (reason === "expired session") dbContext.db.update(schema.session).set({ expiresAt: new Date(0) }).run();
        if (reason === "wrong session owner") dbContext.db.update(schema.session).set({ userId: 2 }).run();
        if (reason === "disabled client") dbContext.db.update(schema.oauthClient).set({ disabled: true }).run();
        if (reason === "different resource") dbContext.db.update(schema.oauthConsent).set({ resources: ["https://other.example.invalid/mcp"] }).run();

        expect(getMcpAccess(claims)).toBeNull();
    });

    it("revokes only the chosen grant and prevents old JWTs from reviving after reconnect", () => {
        for (const [index, grant] of [{ userId: 1, clientId: "assistant" }, { userId: 2, clientId: "assistant" }, { userId: 1, clientId: "other-assistant" }].entries()) {
            const token = { ...grant, token: `token${index}`, scopes, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) };
            dbContext.db.insert(schema.oauthAccessToken).values(token).run();
            dbContext.db.insert(schema.oauthRefreshToken).values(token).run();
        }
        vi.spyOn(Date, "now").mockReturnValue(200);

        revokeMcpConnection(1, "assistant");

        expect(dbContext.db.select().from(schema.oauthAccessToken).all().map(row => row.token)).toEqual(["token1", "token2"]);
        expect(dbContext.db.select().from(schema.oauthRefreshToken).all().map(row => row.token)).toEqual(["token1", "token2"]);
        expect(dbContext.db.select().from(schema.oauthConsent).all()).toHaveLength(2);
        expect(getMcpAccess(claims)).toBeNull();
        dbContext.db.insert(schema.oauthConsent).values({ userId: 1, clientId: "assistant", scopes, resources: [MCP_RESOURCE], createdAt: new Date(), updatedAt: new Date() }).run();
        expect(getMcpAccess(claims)).toBeNull();
        expect(getMcpAccess({ ...claims, mylistsIssuedAt: 200 })).toBeNull();
        expect(getMcpAccess({ ...claims, mylistsIssuedAt: 201 })).not.toBeNull();
    });

    it("invalidates pending authorization codes without deleting another user's or client's codes or account verifications", () => {
        const authorizationCode = { type: "authorization_code", userId: "1", query: { client_id: "assistant" } };
        const values = [
            authorizationCode,
            { ...authorizationCode, userId: 1 },
            { ...authorizationCode, userId: "2" },
            { ...authorizationCode, query: { client_id: "other-assistant" } },
            { ...authorizationCode, type: "email_verification" },
            "password-reset-data",
        ];
        dbContext.db.insert(schema.verification).values(values.map((value, index) => ({
            identifier: `verification${index}`, value: typeof value === "string" ? value : JSON.stringify(value),
            expiresAt: new Date(Date.now() + 60_000),
        }))).run();

        revokeMcpConnection(1, "assistant");

        expect(dbContext.db.select().from(schema.verification).all().map(row => row.identifier))
            .toEqual(["verification2", "verification3", "verification4", "verification5"]);
    });
});
