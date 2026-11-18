import {relations} from "@/lib/server/database/relations";
import Database from "bun:sqlite";
import {and, eq, gt, inArray, sql} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type SQLiteBunDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";
import {AchievementsRepository} from "./achievements.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as SQLiteBunDatabase<typeof relations> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("achievement progress", () => {
    let sqlite: Database;

    const progressFor = (tierId: number, userId = 1) => dbContext.db.select().from(schema.userAchievement)
        .where(and(eq(schema.userAchievement.tierId, tierId), eq(schema.userAchievement.userId, userId))).get()!;

    const calculationFor = (mediaType: MediaType) => dbContext.db.select({
        userId: schema.userMediaSettings.userId,
        value: sql<number>`${schema.userMediaSettings.totalEntries}`.as("value"),
    }).from(schema.userMediaSettings)
        .where(and(eq(schema.userMediaSettings.mediaType, mediaType), gt(schema.userMediaSettings.totalEntries, 0)))
        .as("calculation");

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle({ client: sqlite, relations });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `player-${id}`, email: `player-${id}@example.invalid`, emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }))).run();
        db.insert(schema.userMediaSettings).values([
            { userId: 1, mediaType: MediaType.MOVIES, active: true, totalEntries: 4 },
            { userId: 2, mediaType: MediaType.MOVIES, active: true, totalEntries: 1 },
            { userId: 1, mediaType: MediaType.BOOKS, active: true, totalEntries: 2 },
        ]).run();
        db.insert(schema.achievement).values([
            { id: 10, name: "Movie fan", description: "Finish movies", codeName: "movie-fan", mediaType: MediaType.MOVIES },
            { id: 20, name: "Book fan", description: "Finish books", codeName: "book-fan", mediaType: MediaType.BOOKS },
        ]).run();
        db.insert(schema.achievementTier).values([
            { id: 101, achievementId: 10, difficulty: AchievementDifficulty.BRONZE, criteria: { count: 2 } },
            { id: 102, achievementId: 10, difficulty: AchievementDifficulty.PLATINUM, criteria: { count: 4 } },
            { id: 201, achievementId: 20, difficulty: AchievementDifficulty.BRONZE, criteria: { count: 2 } },
        ]).run();
    });

    afterEach(() => sqlite.close());

    it("updates the right tiers and clears progress when a user no longer qualifies", async () => {
        const [movies, books] = await AchievementsRepository.getAllAchievements();
        await AchievementsRepository.upsertAchievementProgress(movies, calculationFor(MediaType.MOVIES));
        await AchievementsRepository.upsertAchievementProgress(books, calculationFor(MediaType.BOOKS));

        expect(progressFor(101)).toMatchObject({ count: 4, progress: 100, completed: true });
        expect(progressFor(102)).toMatchObject({ count: 4, progress: 100, completed: true });
        expect(progressFor(101, 2)).toMatchObject({ count: 1, progress: 50, completed: false, completedAt: null });
        const bookProgress = progressFor(201);
        const otherUserProgress = progressFor(101, 2);
        const completedAt = "2026-03-01 12:00:00";
        dbContext.db.update(schema.userAchievement).set({ completedAt })
            .where(and(eq(schema.userAchievement.userId, 1), inArray(schema.userAchievement.tierId, [101, 102]))).run();
        await AchievementsRepository.upsertAchievementProgress(movies, calculationFor(MediaType.MOVIES));
        expect(progressFor(102).completedAt).toBe(completedAt);

        dbContext.db.update(schema.userMediaSettings).set({ totalEntries: 2 }).where(and(
            eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MOVIES),
        )).run();
        await AchievementsRepository.upsertAchievementProgress(movies, calculationFor(MediaType.MOVIES));
        expect(progressFor(101)).toMatchObject({ count: 2, progress: 100, completed: true, completedAt });
        expect(progressFor(102)).toMatchObject({ count: 2, progress: 50, completed: false, completedAt: null });

        dbContext.db.update(schema.userMediaSettings).set({ totalEntries: 0 }).where(and(
            eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MOVIES),
        )).run();
        await AchievementsRepository.upsertAchievementProgress(movies, calculationFor(MediaType.MOVIES));
        for (const tierId of [101, 102]) {
            expect(progressFor(tierId)).toMatchObject({ count: 0, progress: 0, completed: false, completedAt: null });
        }
        expect(progressFor(201)).toEqual(bookProgress);
        expect(progressFor(101, 2)).toEqual({ ...otherUserProgress, lastCalculatedAt: expect.any(String) });
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });

    it("finds achievement names and counts each achievement at its highest completed tier", async () => {
        const [movies, books] = await AchievementsRepository.getAllAchievements();
        await AchievementsRepository.upsertAchievementProgress(movies, calculationFor(MediaType.MOVIES));
        await AchievementsRepository.upsertAchievementProgress(books, calculationFor(MediaType.BOOKS));

        expect(await AchievementsRepository.countPlatinumAchievements(1)).toBe(1);
        expect(await AchievementsRepository.countPlatinumAchievements(2)).toBe(0);
        expect(await AchievementsRepository.getAchievementsDetails(1)).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 10, name: "Movie fan", difficulty: AchievementDifficulty.PLATINUM }),
            expect.objectContaining({ id: 20, name: "Book fan", difficulty: AchievementDifficulty.BRONZE }),
        ]));
        const stats = await AchievementsRepository.getUserAchievementStats(1);
        expect(stats.completedResult).toEqual([
            { mediaType: MediaType.BOOKS, count: 1, difficulty: AchievementDifficulty.BRONZE },
            { mediaType: MediaType.MOVIES, count: 1, difficulty: AchievementDifficulty.PLATINUM },
        ]);
        expect(stats.totalAchievementsResult).toEqual([
            { mediaType: MediaType.BOOKS, total: 1 },
            { mediaType: MediaType.MOVIES, total: 1 },
        ]);
        expect(await AchievementsRepository.getUserAchievementStats(2)).toMatchObject({ completedResult: [] });
    });
});
