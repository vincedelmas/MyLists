import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {AchievementDifficulty, MediaType, PrivacyType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { AchievementService } = await import("./achievement.service");


describe("normalized achievement reads", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 1,
            name: "owner",
            privacy: PrivacyType.PUBLIC,
            email: "owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.profileMediaChannel).values([
            { userId: 1, kind: MediaType.SERIES, enabled: true },
            { userId: 1, kind: MediaType.MOVIES, enabled: false },
        ]);
        await db.insert(schema.achievement).values([
            achievement(10, MediaType.SERIES),
            achievement(11, MediaType.MOVIES),
        ]);
        await db.insert(schema.achievementTier).values([
            tier(20, 10),
            tier(21, 11),
        ]);
        await db.insert(schema.userAchievement).values([
            progress(30, 10, 20),
            progress(31, 11, 21),
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("publishes progress only for enabled personal media channels", async () => {
        await expect(AchievementService.getActiveMediaTypes(1)).resolves.toEqual([MediaType.SERIES]);
        await expect(AchievementService.getAchievementsDetails(1)).resolves.toEqual([
            expect.objectContaining({ id: 10, name: "series achievement", difficulty: AchievementDifficulty.BRONZE }),
        ]);
        expect((await AchievementService.getUserAchievements(1)).map(({ mediaType }) => mediaType)).toEqual([MediaType.SERIES]);
        await expect(AchievementService.getDifficultySummary(1)).resolves.toEqual([
            { count: 1, difficulty: AchievementDifficulty.BRONZE },
        ]);
        await expect(AchievementService.getUserAchievementStats(1)).resolves.toMatchObject({
            series: expect.arrayContaining([{ tier: "total", count: "1/1" }]),
            movies: expect.arrayContaining([{ tier: "total", count: "0/0" }]),
            all: expect.arrayContaining([{ tier: "total", count: "1/1" }]),
        });
    });
});


const achievement = (id: number, mediaType: MediaType) => ({
    id,
    mediaType,
    name: `${mediaType} achievement`,
    codeName: `${mediaType}_achievement`,
    description: "description",
});


const tier = (id: number, achievementId: number) => ({
    id,
    achievementId,
    difficulty: AchievementDifficulty.BRONZE,
    criteria: { count: 1 },
});


const progress = (id: number, achievementId: number, tierId: number) => ({
    id,
    userId: 1,
    achievementId,
    tierId,
    count: 1,
    progress: 100,
    completed: true,
    completedAt: "2026-03-01 00:00:00",
});
