import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type SQLiteBunDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AchievementCategory, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {AchievementsRepository} from "./achievements.repository";
import {AchievementsService} from "./achievements.service";
import {setupMediaModule} from "@/lib/server/core/container/media.module";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as SQLiteBunDatabase }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("flat achievements & permanent unlocks", () => {
    let sqlite: Database;

    const progressFor = (achievementId: number, userId = 1) => dbContext.db
        .select()
        .from(schema.userAchievement)
        .where(and(
            eq(schema.userAchievement.achievementId, achievementId),
            eq(schema.userAchievement.userId, userId),
        ))
        .get();

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle({ client: sqlite });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values([1, 2, 3, 4].map((id) => ({
            id,
            name: `player-${id}`,
            email: `player-${id}@example.invalid`,
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        }))).run();

        db.insert(schema.userMediaSettings).values([
            // Users 1 & 2: Level 5+ in movies (timeSpent >= 600)
            { userId: 1, mediaType: MediaType.MOVIES, active: true, totalEntries: 4, timeSpent: 900 },
            { userId: 2, mediaType: MediaType.MOVIES, active: true, totalEntries: 6, timeSpent: 650 },
            // User 3: Level 5+ globally via books, but movies disabled
            { userId: 3, mediaType: MediaType.MOVIES, active: false, totalEntries: 0, timeSpent: 0 },
            { userId: 3, mediaType: MediaType.BOOKS, active: true, totalEntries: 5, timeSpent: 700 },
            // User 4: drive-by account below Level 5 (1 movie, 120 min) — excluded from rarity pools
            { userId: 4, mediaType: MediaType.MOVIES, active: true, totalEntries: 1, timeSpent: 120 },
            { userId: 1, mediaType: MediaType.BOOKS, active: true, totalEntries: 2, timeSpent: 300 },
        ]).run();

        AchievementsRepository.seedAchievements([
            {
                codeName: "movies_director_4",
                name: "Director Devotee",
                description: "Finish 4 movies by one director",
                category: AchievementCategory.MOVIES,
                mediaType: MediaType.MOVIES,
                icon: "clapperboard",
                shape: "hex",
                pattern: "rays",
                target: 4,
                sortOrder: 1,
            },
            {
                codeName: "secret_privacy_policy",
                name: "Wait, Someone Actually Read It?",
                description: "Visit privacy policy",
                category: AchievementCategory.SECRETS,
                mediaType: null,
                icon: "secret-book",
                shape: "diamond",
                pattern: "rings",
                secret: true,
                target: 1,
                sortOrder: 1,
            },
        ]);
    });

    afterEach(() => sqlite.close());

    it("tracks progress while locked, unlocks permanently with frozen metadata, and resets dropped locked rows", () => {
        const ach = AchievementsRepository.getAchievementByCodeName("movies_director_4")!;

        // Initial partial progress for user 1 and 2
        const firstPass = AchievementsRepository.upsertAchievementProgress(ach, [
            { userId: 1, value: 2, label: "Denis Villeneuve" },
            { userId: 2, value: 1, label: "Greta Gerwig" },
        ]);
        expect(firstPass).toEqual([]);
        expect(progressFor(ach.id, 1)).toMatchObject({
            count: 2,
            progress: 50,
            completed: false,
            completedAt: null,
            metadata: { label: "Denis Villeneuve" },
        });

        // User 1 crosses target -> unlocks permanently; user 2 drops to 0 -> resets
        const secondPass = AchievementsRepository.upsertAchievementProgress(ach, [
            { userId: 1, value: 4, label: "Christopher Nolan" },
        ]);
        expect(secondPass).toHaveLength(1);
        expect(secondPass[0]).toMatchObject({
            codeName: "movies_director_4",
            metadata: { label: "Christopher Nolan" },
        });
        expect(progressFor(ach.id, 1)).toMatchObject({
            count: 4,
            progress: 100,
            completed: true,
            metadata: { label: "Christopher Nolan" },
        });
        expect(progressFor(ach.id, 2)).toMatchObject({
            count: 0,
            progress: 0,
            completed: false,
            metadata: null,
        });

        // Freeze custom completedAt and verify subsequent lower/empty evaluations NEVER revoke or overwrite metadata
        const originalCompletedAt = "2026-03-01 12:00:00";
        dbContext.db.update(schema.userAchievement)
            .set({ completedAt: originalCompletedAt })
            .where(and(eq(schema.userAchievement.userId, 1), eq(schema.userAchievement.achievementId, ach.id)))
            .run();

        const thirdPass = AchievementsRepository.upsertAchievementProgress(ach, []);
        expect(thirdPass).toEqual([]);
        expect(progressFor(ach.id, 1)).toMatchObject({
            count: 4,
            progress: 100,
            completed: true,
            completedAt: originalCompletedAt,
            metadata: { label: "Christopher Nolan" },
        });
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });

    it("unlocks event achievements idempotently and computes rarity against eligible active users", () => {
        const movieAch = AchievementsRepository.getAchievementByCodeName("movies_director_4")!;
        const secretAch = AchievementsRepository.getAchievementByCodeName("secret_privacy_policy")!;

        // User 1 unlocks movie achievement (2 eligible Lvl 5+ movie users: 1 & 2; user 3 inactive, user 4 < Lvl 5 -> 50%)
        AchievementsRepository.upsertAchievementProgress(movieAch, [
            { userId: 1, value: 4, label: "Nolan" },
            { userId: 4, value: 4, label: "Nolan" },
        ]);

        // User 1 unlocks secret achievement twice -> only first call returns a toast (3 eligible Lvl 5+ users: 1, 2, 3 -> 33.33%)
        const firstUnlock = AchievementsRepository.unlockEventAchievement(1, secretAch);
        const secondUnlock = AchievementsRepository.unlockEventAchievement(1, secretAch);
        // Drive-by user 4 also unlocks secret, but should not inflate rarity pool
        AchievementsRepository.unlockEventAchievement(4, secretAch);

        expect(firstUnlock).toMatchObject({ codeName: "secret_privacy_policy", secret: true });
        expect(secondUnlock).toBeNull();

        AchievementsRepository.calculateAllAchievementsRarity();

        const refreshedMovie = AchievementsRepository.getAchievementByCodeName("movies_director_4")!;
        const refreshedSecret = AchievementsRepository.getAchievementByCodeName("secret_privacy_policy")!;

        expect(refreshedMovie.rarity).toBe(50);
        expect(refreshedSecret.rarity).toBeCloseTo(33.33, 2);

        const stats = AchievementsRepository.countUnlockedAndRareAchievements(1);
        expect(stats).toEqual({ unlocked: 2, rare: 0 });
    });

    it("seeds the full catalog and runs every state evaluator without SQL errors", () => {
        const mediaModule = setupMediaModule();
        const service = new AchievementsService(AchievementsRepository, mediaModule.registries.mediaAchievements);

        const totalSeeded = service.seedAllAchievements();
        expect(totalSeeded).toBeGreaterThanOrEqual(90);

        // Add sample records to exercise live single-user unlocks + metadata
        dbContext.db.insert(schema.movies).values({
            id: 10,
            apiId: 10,
            name: "Interstellar",
            duration: 169,
            directorName: "Christopher Nolan",
            originalLanguage: "en",
            releaseDate: "2014-11-05",
            imageCover: "interstellar.jpg",
        }).run();
        dbContext.db.insert(schema.moviesList).values({
            id: 10,
            userId: 1,
            mediaId: 10,
            status: Status.COMPLETED,
            rating: 2,
            comment: "Too loud in IMAX",
        }).run();

        const unlocked = service.evaluateUserCategories(1, [
            AchievementCategory.MOVIES,
            AchievementCategory.SECRETS,
        ]);
        const unlockedCodes = unlocked.map((item) => item.codeName);
        expect(unlockedCodes).toContain("movies_first");
        expect(unlockedCodes).toContain("secret_harsh_critic");

        // Re-running evaluation should not re-emit already unlocked achievements
        const secondEval = service.evaluateUserCategories(1, [
            AchievementCategory.MOVIES,
            AchievementCategory.SECRETS,
        ]);
        expect(secondEval).toEqual([]);

        // Execute every single category batch evaluator + rarity recalculation
        for (const category of service.getAllCatalogCategories()) {
            service.calculateCategory(category);
        }
        service.calculateAllAchievementsRarity();

        const pageData = service.getUserAchievementsPageData(1, 2);
        expect(pageData.summary.totalUnlocked).toBeGreaterThanOrEqual(2);
        expect(pageData.items.every((item) => item.viewerProgress !== null)).toBe(true);
    });

    it("prefers positive rarity over 0% for rarest trophy/showcase, excludes disabled media from secrets, and avoids backlog false positives", () => {
        const mediaModule = setupMediaModule();
        const service = new AchievementsService(AchievementsRepository, mediaModule.registries.mediaAchievements);
        service.seedAllAchievements();

        // Add an old movie completed on day 1 and edited 2 years later -> must NOT unlock secret_backlog_slayer
        dbContext.db.insert(schema.movies).values([
            {
                id: 20,
                apiId: 20,
                name: "Day One Movie",
                duration: 120,
                releaseDate: "2026-05-01",
                imageCover: "m20.jpg",
            },
            {
                id: 21,
                apiId: 21,
                name: "Backlog Movie",
                duration: 110,
                releaseDate: "2020-01-01",
                imageCover: "m21.jpg",
            },
        ]).run();

        dbContext.db.insert(schema.moviesList).values([
            {
                id: 20,
                userId: 1,
                mediaId: 20,
                status: Status.COMPLETED,
                rating: 10,
                favorite: true,
                redo: 3,
                comment: "Absolute cinema",
                addedAt: "2024-01-01 10:00:00",
                lastUpdated: "2026-05-02 10:00:00",
            },
            // User 3 has Movies DISABLED: must NOT unlock secret_harsh_critic
            {
                id: 21,
                userId: 3,
                mediaId: 21,
                status: Status.COMPLETED,
                rating: 1,
                comment: "Terrible",
                addedAt: "2024-01-01 10:00:00",
                lastUpdated: "2026-05-02 10:00:00",
            },
        ]).run();

        dbContext.db.insert(schema.userMediaUpdate).values({
            userId: 1,
            mediaId: 20,
            mediaName: "Day One Movie",
            mediaType: MediaType.MOVIES,
            updateType: UpdateType.STATUS,
            payload: { old_value: null, new_value: Status.COMPLETED },
            timestamp: "2026-05-02 18:00:00",
        }).run();

        const user1Unlocks = service.evaluateUserCategories(1, [AchievementCategory.MOVIES, AchievementCategory.SECRETS]).map((a) => a.codeName);
        expect(user1Unlocks).toContain("secret_love_letter");
        expect(user1Unlocks).toContain("secret_superfan");
        expect(user1Unlocks).toContain("secret_day_one");
        expect(user1Unlocks).not.toContain("secret_backlog_slayer");

        const user3Unlocks = service.evaluateUserCategories(3, [AchievementCategory.SECRETS]).map((a) => a.codeName);
        expect(user3Unlocks).not.toContain("secret_harsh_critic");

        // Now complete a title that actually transitioned from Planned -> Completed after 365+ days
        dbContext.db.insert(schema.moviesList).values({
            id: 22,
            userId: 1,
            mediaId: 21,
            status: Status.COMPLETED,
            addedAt: "2024-01-01 10:00:00",
            lastUpdated: "2026-05-02 10:00:00",
        }).run();
        dbContext.db.insert(schema.userMediaUpdate).values({
            userId: 1,
            mediaId: 21,
            mediaName: "Backlog Movie",
            mediaType: MediaType.MOVIES,
            updateType: UpdateType.STATUS,
            payload: { old_value: Status.PLANNED, new_value: Status.COMPLETED },
            timestamp: "2026-05-02 10:00:00",
        }).run();

        const backlogUnlock = service.evaluateUserCategories(1, [AchievementCategory.SECRETS]);
        expect(backlogUnlock.map((a) => a.codeName)).toContain("secret_backlog_slayer");
        expect(backlogUnlock.find((a) => a.codeName === "secret_backlog_slayer")?.metadata).toEqual({ label: "Backlog Movie" });

        // Set one unlocked achievement to rarity 0% and another to 1.5% -> 1.5% MUST win as rarest
        dbContext.db.update(schema.achievement).set({ rarity: 0 }).where(eq(schema.achievement.codeName, "secret_superfan")).run();
        dbContext.db.update(schema.achievement).set({ rarity: 1.5 }).where(eq(schema.achievement.codeName, "secret_day_one")).run();
        dbContext.db.update(schema.achievement).set({ rarity: 25 }).where(eq(schema.achievement.codeName, "secret_love_letter")).run();

        const pageData = service.getUserAchievementsPageData(1, undefined, ["secret_day_one", "nonexistent_disabled"]);
        expect(pageData.summary.rarestUnlocked?.name).toBe("Day One Fan");
        expect(pageData.pinnedCodeNames).toEqual(["secret_day_one"]);

        const showcase = service.getProfileShowcase(1, []);
        expect(showcase.items[0]?.codeName).toBe("secret_day_one");
    });
});
