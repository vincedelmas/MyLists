import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {achievement, achievementTier, anime, animeList, user, userAchievement, userMediaActivity, userMediaSettings, userMediaUpdate} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AchievementDifficulty, MediaType, Status, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");
const { UserStatsRepository } = await import("@/lib/server/domain/user/user-stats.repository");
const { UserUpdatesRepository } = await import("@/lib/server/domain/user/user-updates.repository");
const { UserActivityRepository } = await import("@/lib/server/domain/user/user-activity.repository");
const { animeServerDefinition } = await import("@/lib/media-definitions/tv/anime/anime.definition.server");
const { AchievementsRepository } = await import("@/lib/server/domain/achievements/achievements.repository");


describe("disabled media visibility", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await seedUserData(db);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("hides disabled media everywhere without deleting it", async () => {
        const animeRepository = new TvRepository(animeServerDefinition);

        const disabledStats = await UserStatsRepository.getPreComputedStatsSummary({ userId: 42 });
        const disabledUpdates = await UserUpdatesRepository.getUserUpdates(42, 10);
        const disabledHistory = await UserUpdatesRepository.getUserUpdatesPaginated({}, 42);
        const disabledActivity = await UserActivityRepository.getPaginatedActivities(42, {
            page: 1,
            perPage: 48,
            timeBucket: "2026-04",
        });
        const disabledAchievements = await AchievementsRepository.getAchievementsDetails(42, 10);
        const disabledAchievementPage = await AchievementsRepository.getUserAchievements(42);
        const disabledCommunity = await animeRepository.getMediaCommunityActivity(undefined, 100, {});

        expect(disabledStats.preComputedStats.totalHours).toBe(8);
        expect(disabledStats.mediaTimeDistribution.map((item) => item.name)).toEqual([MediaType.MOVIES]);
        expect(disabledUpdates.map((item) => item.mediaType)).toEqual([MediaType.MOVIES]);
        expect(disabledHistory.items.map((item) => item.mediaType)).toEqual([MediaType.MOVIES]);
        expect(disabledActivity.items.map((item) => item.mediaType)).toEqual([MediaType.MOVIES]);
        expect(disabledAchievements.map((item) => item.name)).toEqual(["Movie achievement"]);
        expect([...new Set(disabledAchievementPage.map((item) => item.achievement.mediaType))]).toEqual([MediaType.MOVIES]);
        expect(disabledCommunity.total).toBe(0);

        await db
            .update(userMediaSettings)
            .set({ active: true })
            .where(and(
                eq(userMediaSettings.userId, 42),
                eq(userMediaSettings.mediaType, MediaType.ANIME),
            ));

        const enabledStats = await UserStatsRepository.getPreComputedStatsSummary({ userId: 42 });
        const enabledUpdates = await UserUpdatesRepository.getUserUpdates(42, 10);
        const enabledActivity = await UserActivityRepository.getPaginatedActivities(42, {
            page: 1,
            perPage: 48,
            timeBucket: "2026-04",
        });
        const enabledAchievements = await AchievementsRepository.getAchievementsDetails(42, 10);
        const enabledCommunity = await animeRepository.getMediaCommunityActivity(undefined, 100, {});

        expect(enabledStats.preComputedStats.totalHours).toBeCloseTo(1706 / 60);
        expect(enabledStats.mediaTimeDistribution.map((item) => item.name).sort()).toEqual([MediaType.ANIME, MediaType.MOVIES]);
        expect(enabledUpdates.map((item) => item.mediaType)).toEqual([MediaType.ANIME, MediaType.MOVIES]);
        expect(enabledActivity.items).toHaveLength(2);
        expect(enabledAchievements.map((item) => item.name)).toEqual(["Anime achievement", "Movie achievement"]);
        expect(enabledCommunity.total).toBe(1);
    });

});


async function seedUserData(db: BunSQLiteDatabase<typeof schema>) {
    await db.insert(user).values({
        id: 42,
        emailVerified: true,
        name: "visibility-user",
        privacy: "public",
        email: "visibility@example.com",
        updatedAt: "2026-01-01 00:00:00",
        createdAt: "2026-01-01 00:00:00",
    });

    await db.insert(userMediaSettings).values([
        { userId: 42, mediaType: MediaType.MOVIES, active: true, timeSpent: 480 },
        { userId: 42, mediaType: MediaType.ANIME, active: false, timeSpent: 1226 },
    ]);

    await db.insert(userMediaUpdate).values([
        {
            id: 1,
            userId: 42,
            mediaId: 10,
            mediaName: "Visible movie",
            mediaType: MediaType.MOVIES,
            updateType: UpdateType.STATUS,
            timestamp: "2026-04-01 00:00:00",
        },
        {
            id: 2,
            userId: 42,
            mediaId: 100,
            mediaName: "Hidden anime",
            mediaType: MediaType.ANIME,
            updateType: UpdateType.STATUS,
            timestamp: "2026-04-02 00:00:00",
        },
    ]);

    await db.insert(userMediaActivity).values([
        { id: 1, userId: 42, mediaId: 10, mediaType: MediaType.MOVIES, monthBucket: "2026-04", specificGained: 1 },
        { id: 2, userId: 42, mediaId: 100, mediaType: MediaType.ANIME, monthBucket: "2026-04", specificGained: 1 },
    ]);

    await db.insert(achievement).values([
        { id: 1, codeName: "movie-ach", name: "Movie achievement", description: "Movie", mediaType: MediaType.MOVIES },
        { id: 2, codeName: "anime-ach", name: "Anime achievement", description: "Anime", mediaType: MediaType.ANIME },
    ]);
    await db.insert(achievementTier).values([
        { id: 1, achievementId: 1, difficulty: AchievementDifficulty.BRONZE, criteria: { count: 1 } },
        { id: 2, achievementId: 2, difficulty: AchievementDifficulty.BRONZE, criteria: { count: 1 } },
    ]);
    await db.insert(userAchievement).values([
        { id: 1, userId: 42, achievementId: 1, tierId: 1, completed: true, completedAt: "2026-04-01 00:00:00" },
        { id: 2, userId: 42, achievementId: 2, tierId: 2, completed: true, completedAt: "2026-04-02 00:00:00" },
    ]);

    await db.insert(anime).values({
        id: 100,
        apiId: 100,
        duration: 24,
        totalSeasons: 1,
        totalEpisodes: 12,
        name: "Hidden anime",
        imageCover: "anime.jpg",
    });
    await db.insert(animeList).values({
        id: 1,
        userId: 42,
        mediaId: 100,
        currentSeason: 1,
        currentEpisode: 12,
        status: Status.COMPLETED,
    });
}
