import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {SocialState} from "@/lib/utils/enums";


describe("follow database invariants", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(schema.user).values([
            { id: 1, name: "one", email: "one@example.com", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
            { id: 2, name: "two", email: "two@example.com", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]);
    });

    afterEach(() => sqlite.close());

    it("rejects self-follows and duplicate relationships in the database", async () => {
        await expect(db.insert(schema.followers).values({ followerId: 1, followedId: 1 })).rejects.toThrow();

        await db.insert(schema.followers).values({
            followerId: 1,
            followedId: 2,
            status: SocialState.REQUESTED,
        });
        await expect(db.insert(schema.followers).values({
            followerId: 1,
            followedId: 2,
            status: SocialState.ACCEPTED,
        })).rejects.toThrow();

        expect(await db.select().from(schema.followers)).toEqual([
            { followerId: 1, followedId: 2, status: SocialState.REQUESTED },
        ]);
    });
});

