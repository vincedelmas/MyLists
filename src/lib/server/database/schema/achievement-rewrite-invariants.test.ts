import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";


describe("achievement rewrite invariants", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 1,
            name: "user",
            email: "user@example.com",
            emailVerified: true,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
        });
        await db.insert(schema.achievement).values({
            id: 10,
            name: "Achievement",
            codeName: "test_achievement",
            description: "Test",
            mediaType: MediaType.MOVIES,
        });
        await db.insert(schema.achievementTier).values({
            id: 20,
            achievementId: 10,
            difficulty: AchievementDifficulty.BRONZE,
            criteria: { count: 1 },
        });
    });

    afterEach(() => sqlite.close());

    it("enforces one valid progress row per user, achievement and tier", async () => {
        await db.insert(schema.userAchievement).values({
            id: 30,
            userId: 1,
            achievementId: 10,
            tierId: 20,
            count: 1,
            progress: 100,
            completed: true,
        });
        await expect(db.insert(schema.userAchievement).values({
            id: 31,
            userId: 1,
            achievementId: 10,
            tierId: 20,
        })).rejects.toThrow();
        await expect(db.insert(schema.userAchievement).values({
            id: 32,
            userId: 1,
            achievementId: 10,
            tierId: 20,
            count: -1,
        })).rejects.toThrow();
        await expect(db.insert(schema.userAchievement).values({
            id: 33,
            userId: 1,
            achievementId: 10,
            tierId: 20,
            progress: 101,
        })).rejects.toThrow();

        await db.delete(schema.achievementTier);
        expect(await db.select().from(schema.userAchievement)).toEqual([]);
    });
});
