import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {achievement, achievementTier, anime, animeList, user, userAchievement, userMediaMonthlyActivity, userMediaSettings, userMediaUpdate} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AchievementDifficulty, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");
const { StatsRepository } = await import("@/lib/server/domain/stats/stats.repository");
const { updateHistoryRepository } = await import("@/lib/server/domain/tracking/update-history.repository");
const { createTasteSimilarityRepository } = await import("@/lib/server/domain/social/taste-similarity.repository");
const { defineTasteSimilarityCatalog } = await import("@/lib/server/domain/social/taste-similarity-catalog");
const { monthlyActivityRepository } = await import("@/lib/server/domain/tracking/monthly-activity.repository");
const { animeServerDefinition } = await import("@/lib/media-definitions/tv/anime/anime.definition.server");
const { achievementsRepository } = await import("@/lib/server/domain/achievements/achievements.repository");
const animeTasteSimilarityCatalog = defineTasteSimilarityCatalog(animeServerDefinition);
const tasteSimilarityRepository = createTasteSimilarityRepository({
    get: () => animeTasteSimilarityCatalog,
});


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

        const disabledStats = await StatsRepository.getPreComputedStatsSummary({ userId: 42 });
        const disabledUpdates = await updateHistoryRepository.getUserUpdates(42, 10);
        const disabledHistory = await updateHistoryRepository.getUserUpdatesPaginated({}, 42);
        const disabledActivity = await monthlyActivityRepository.getPaginatedMonthlyActivities(42, {
            page: 1,
            perPage: 48,
            startMonth: "2026-04",
            endMonth: "2026-04",
        });
        const disabledAchievements = await achievementsRepository.getAchievementsDetails(42, 10);
        const disabledAchievementPage = await achievementsRepository.getUserAchievements(42);
        const disabledCommunity = await animeRepository.getMediaCommunityActivity(toActor(), 100, {});
        const disabledTasteAggregates = await tasteSimilarityRepository.findCandidateAggregates(43, [MediaType.ANIME]);
        const disabledSharedFavorites = await tasteSimilarityRepository.getSharedFavMedia(43, [42], [MediaType.ANIME]);
        const [disabledCandidate] = await tasteSimilarityRepository.getCandidateProfiles([42], 43);

        expect(disabledStats.preComputedStats.totalHours).toBe(8);
        expect(disabledStats.mediaTimeDistribution.map((item) => item.name)).toEqual([MediaType.MOVIES]);
        expect(disabledUpdates.map((item) => item.mediaType)).toEqual([MediaType.MOVIES]);
        expect(disabledHistory.items.map((item) => item.mediaType)).toEqual([MediaType.MOVIES]);
        expect(disabledActivity.items.map((item) => item.mediaType)).toEqual([MediaType.MOVIES]);
        expect(disabledAchievements.map((item) => item.name)).toEqual(["Movie achievement"]);
        expect([...new Set(disabledAchievementPage.map((item) => item.achievement.mediaType))]).toEqual([MediaType.MOVIES]);
        expect(disabledCommunity.items.map(({ id }) => id)).toEqual([43]);
        expect(disabledTasteAggregates).toEqual([]);
        expect(disabledSharedFavorites).toEqual([]);
        expect(disabledCandidate.totalRatings).toBe(3);

        await db
            .update(userMediaSettings)
            .set({ active: true })
            .where(and(
                eq(userMediaSettings.userId, 42),
                eq(userMediaSettings.mediaType, MediaType.ANIME),
            ));

        const enabledStats = await StatsRepository.getPreComputedStatsSummary({ userId: 42 });
        const enabledUpdates = await updateHistoryRepository.getUserUpdates(42, 10);
        const enabledActivity = await monthlyActivityRepository.getPaginatedMonthlyActivities(42, {
            page: 1,
            perPage: 48,
            startMonth: "2026-04",
            endMonth: "2026-04",
        });
        const enabledAchievements = await achievementsRepository.getAchievementsDetails(42, 10);
        const enabledCommunity = await animeRepository.getMediaCommunityActivity(toActor(), 100, {});
        const enabledTasteAggregates = await tasteSimilarityRepository.findCandidateAggregates(43, [MediaType.ANIME]);
        const enabledSharedFavorites = await tasteSimilarityRepository.getSharedFavMedia(43, [42], [MediaType.ANIME]);
        const [enabledCandidate] = await tasteSimilarityRepository.getCandidateProfiles([42], 43);

        expect(enabledStats.preComputedStats.totalHours).toBeCloseTo(1706 / 60);
        expect(enabledStats.mediaTimeDistribution.map((item) => item.name).sort()).toEqual([MediaType.ANIME, MediaType.MOVIES]);
        expect(enabledUpdates.map((item) => item.mediaType)).toEqual([MediaType.ANIME, MediaType.MOVIES]);
        expect(enabledActivity.items).toHaveLength(2);
        expect(enabledAchievements.map((item) => item.name)).toEqual(["Anime achievement", "Movie achievement"]);
        expect(enabledCommunity.items.map(({ id }) => id).sort()).toEqual([42, 43]);
        expect(enabledTasteAggregates).toMatchObject([{
            count: 1,
            candidateId: 42,
            mediaType: MediaType.ANIME,
        }]);
        expect(enabledSharedFavorites).toMatchObject([{
            name: "Hidden anime",
            mediaId: 100,
            candidateId: 42,
            mediaType: MediaType.ANIME,
        }]);
        expect(enabledCandidate.totalRatings).toBe(15);
    });

    it("keeps every profile in the Hall of Fame while redacting inactive media time", async () => {
        await db
            .update(user)
            .set({ privacy: "private" })
            .where(eq(user.id, 42));

        const hallOfFame = await StatsRepository.userHallOfFameData({});
        const privateUser = hallOfFame.rankedUsers.find(({ id }) => id === 42);
        const settings = hallOfFame.userSettingsMap.get(42);

        expect(privateUser).toBeDefined();
        expect(privateUser?.privacy).toBe("private");
        expect(settings).toEqual(expect.arrayContaining([
            expect.objectContaining({ mediaType: MediaType.MOVIES, active: true, timeSpent: 480 }),
            expect.objectContaining({ mediaType: MediaType.ANIME, active: false, timeSpent: 0 }),
        ]));
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
    await db.insert(user).values({
        id: 43,
        emailVerified: true,
        name: "taste-viewer",
        privacy: "public",
        email: "taste-viewer@example.com",
        updatedAt: "2026-01-01 00:00:00",
        createdAt: "2026-01-01 00:00:00",
    });

    await db.insert(userMediaSettings).values([
        { userId: 42, mediaType: MediaType.MOVIES, active: true, timeSpent: 480, entriesRated: 3 },
        { userId: 42, mediaType: MediaType.ANIME, active: false, timeSpent: 1226, entriesRated: 12 },
        { userId: 43, mediaType: MediaType.ANIME, active: true, entriesRated: 1 },
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

    await db.insert(userMediaMonthlyActivity).values([
        { id: 1, userId: 42, mediaId: 10, mediaType: MediaType.MOVIES, monthBucket: "2026-04", progressGained: 1 },
        { id: 2, userId: 42, mediaId: 100, mediaType: MediaType.ANIME, monthBucket: "2026-04", progressGained: 1 },
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
        rating: 9,
        favorite: true,
        currentSeason: 1,
        currentEpisode: 12,
        status: Status.COMPLETED,
    });
    await db.insert(animeList).values({
        id: 2,
        userId: 43,
        mediaId: 100,
        rating: 9,
        favorite: true,
        currentSeason: 1,
        currentEpisode: 12,
        status: Status.COMPLETED,
    });
}
