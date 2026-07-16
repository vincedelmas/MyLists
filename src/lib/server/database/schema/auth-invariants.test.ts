import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import * as schema from "@/lib/server/database/schema";


describe("identity database invariants", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(db, { migrationsFolder: "./drizzle" });
    });

    afterEach(() => sqlite.close());

    it("enforces the exact username identity used by routes atomically", async () => {
        await db.insert(schema.user).values(account(1, "RouteName"));

        await expect(db.insert(schema.user).values(account(2, "RouteName")))
            .rejects.toThrow(/UNIQUE constraint failed: user\.name/);
        await expect(db.insert(schema.user).values(account(3, "routename")))
            .resolves.toBeDefined();
    });
});


const account = (id: number, name: string) => ({
    id,
    name,
    email: `${id}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
