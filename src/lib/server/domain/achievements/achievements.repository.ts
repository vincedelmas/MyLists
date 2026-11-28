import {timeRequiredForLevel} from "@/lib/utils/media/level";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import {achievement, user, userAchievement, userMediaSettings} from "@/lib/server/database/schema";
import type {AchievementCalculationRow} from "@/lib/server/domain/achievements/achievement-catalog";
import {getRaritySortValue, RARE_RARITY_THRESHOLD, RARITY_MIN_LEVEL} from "@/lib/utils/achievements";
import {and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, notInArray, or, sql} from "drizzle-orm";
import type {
    Achievement,
    AchievementMetadata,
    AchievementSeedData,
    AdminAchievementRow,
    ProfileAchievementItem,
    UnlockedAchievementToast,
    UserAchievementItem,
} from "@/lib/types/achievements.types";


const toUnlockedToast = (ach: Achievement, metadata: AchievementMetadata): UnlockedAchievementToast => ({
    metadata,
    id: ach.id,
    name: ach.name,
    icon: ach.icon,
    shape: ach.shape,
    rarity: ach.rarity,
    secret: ach.secret,
    pattern: ach.pattern,
    codeName: ach.codeName,
    category: ach.category,
    description: ach.description,
});


export class AchievementsRepository {
    static seedAchievements(definitions: readonly AchievementSeedData[]) {
        const tx = getDbClient();

        for (const def of definitions) {
            tx.insert(achievement)
                .values({
                    name: def.name,
                    icon: def.icon,
                    shape: def.shape,
                    target: def.target,
                    pattern: def.pattern,
                    codeName: def.codeName,
                    category: def.category,
                    sortOrder: def.sortOrder,
                    mediaType: def.mediaType,
                    secret: def.secret ?? false,
                    description: def.description,
                })
                .onConflictDoUpdate({
                    target: achievement.codeName,
                    set: {
                        name: def.name,
                        icon: def.icon,
                        shape: def.shape,
                        target: def.target,
                        pattern: def.pattern,
                        category: def.category,
                        mediaType: def.mediaType,
                        sortOrder: def.sortOrder,
                        secret: def.secret ?? false,
                        description: def.description,
                    },
                }).run();
        }

        const validCodeNames = definitions.map((def) => def.codeName);
        if (validCodeNames.length > 0) {
            tx.delete(achievement)
                .where(notInArray(achievement.codeName, validCodeNames))
                .run();
        }
    }

    static getAllAchievements(): Achievement[] {
        return getDbClient()
            .select()
            .from(achievement)
            .orderBy(asc(achievement.category), asc(achievement.sortOrder), asc(achievement.id))
            .all();
    }

    static getAchievementsByCategories(categories: AchievementCategory[]): Achievement[] {
        if (categories.length === 0) return [];
        return getDbClient()
            .select()
            .from(achievement)
            .where(inArray(achievement.category, categories))
            .orderBy(asc(achievement.category), asc(achievement.sortOrder), asc(achievement.id))
            .all();
    }

    static getAchievementByCodeName(codeName: string): Achievement | undefined {
        return getDbClient()
            .select()
            .from(achievement)
            .where(eq(achievement.codeName, codeName))
            .get();
    }

    static getUserCompletedAchievementIds(userId: number): Set<number> {
        const rows = getDbClient()
            .select({ achievementId: userAchievement.achievementId })
            .from(userAchievement)
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.completed, true)))
            .all();

        return new Set(rows.map((r) => r.achievementId));
    }

    static getActiveMediaTypesForUser(userId: number): MediaType[] {
        return getDbClient()
            .select({ mediaType: userMediaSettings.mediaType })
            .from(userMediaSettings)
            .where(and(eq(userMediaSettings.userId, userId), eq(userMediaSettings.active, true)))
            .all()
            .map((row) => row.mediaType);
    }

    static getUserAchievements(userId: number): UserAchievementItem[] {
        const activeMediaTypes = this.getActiveMediaTypesForUser(userId);

        const visibilityCondition = activeMediaTypes.length > 0
            ? or(isNull(achievement.mediaType), inArray(achievement.mediaType, activeMediaTypes))
            : isNull(achievement.mediaType);

        const rows = getDbClient()
            .select({
                achievement,
                progress: userAchievement,
            }).from(achievement)
            .leftJoin(userAchievement, and(eq(userAchievement.achievementId, achievement.id), eq(userAchievement.userId, userId)))
            .where(visibilityCondition)
            .orderBy(asc(achievement.category), asc(achievement.sortOrder), asc(achievement.id))
            .all();

        return rows.map(({ achievement: ach, progress }) => ({
            ...ach,
            count: progress?.count ?? 0,
            progress: progress?.progress ?? 0,
            metadata: progress?.metadata ?? null,
            completed: progress?.completed ?? false,
            completedAt: progress?.completedAt ?? null,
        }));
    }

    static getUserProgressMap(userId: number): Map<number, { completed: boolean; count: number; progress: number; completedAt: string | null }> {
        const rows = getDbClient()
            .select({
                count: userAchievement.count,
                progress: userAchievement.progress,
                completed: userAchievement.completed,
                completedAt: userAchievement.completedAt,
                achievementId: userAchievement.achievementId,
            }).from(userAchievement)
            .where(eq(userAchievement.userId, userId))
            .all();

        return new Map(rows.map((row) => [row.achievementId, row]));
    }

    static getUnlockedAchievementsForProfile(userId: number): ProfileAchievementItem[] {
        const activeMediaTypes = this.getActiveMediaTypesForUser(userId);

        const visibilityCondition = activeMediaTypes.length > 0
            ? or(isNull(achievement.mediaType), inArray(achievement.mediaType, activeMediaTypes))
            : isNull(achievement.mediaType);

        return getDbClient()
            .select({
                id: achievement.id,
                name: achievement.name,
                icon: achievement.icon,
                shape: achievement.shape,
                secret: achievement.secret,
                rarity: achievement.rarity,
                pattern: achievement.pattern,
                codeName: achievement.codeName,
                category: achievement.category,
                mediaType: achievement.mediaType,
                metadata: userAchievement.metadata,
                description: achievement.description,
                completedAt: userAchievement.completedAt,
            }).from(userAchievement)
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .where(and(
                visibilityCondition,
                eq(userAchievement.userId, userId),
                eq(userAchievement.completed, true),
            )).orderBy(desc(userAchievement.completedAt), asc(achievement.id))
            .all()
            .map((row) => ({ ...row, completedAt: row.completedAt! }));
    }

    static countUnlockedAndRareAchievements(userId?: number): { unlocked: number; rare: number } {
        const db = getDbClient();

        if (userId !== undefined) {
            const activeMediaTypes = this.getActiveMediaTypesForUser(userId);

            const visibilityCondition = activeMediaTypes.length > 0
                ? or(isNull(achievement.mediaType), inArray(achievement.mediaType, activeMediaTypes))
                : isNull(achievement.mediaType);

            const unlocked = db
                .select({ count: count() })
                .from(userAchievement)
                .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
                .where(and(
                    eq(userAchievement.userId, userId),
                    eq(userAchievement.completed, true),
                    visibilityCondition,
                )).get()?.count ?? 0;

            const rare = db
                .select({ count: count() })
                .from(userAchievement)
                .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
                .where(and(
                    visibilityCondition,
                    gt(achievement.rarity, 0),
                    eq(userAchievement.userId, userId),
                    eq(userAchievement.completed, true),
                    lt(achievement.rarity, RARE_RARITY_THRESHOLD),
                )).get()?.count ?? 0;

            return { unlocked, rare };
        }

        const activeMediaCondition = sql`(
            ${achievement.mediaType} IS NULL
            OR EXISTS (
                SELECT 1 FROM ${userMediaSettings} ums
                WHERE ums.user_id = ${userAchievement.userId}
                  AND ums.media_type = ${achievement.mediaType}
                  AND ums.active = 1
            )
        )`;

        const unlocked = db
            .select({ count: count() })
            .from(userAchievement)
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .where(and(eq(userAchievement.completed, true), activeMediaCondition))
            .get()?.count ?? 0;

        const rare = db
            .select({ count: count() })
            .from(userAchievement)
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .where(and(
                activeMediaCondition,
                gt(achievement.rarity, 0),
                eq(userAchievement.completed, true),
                lt(achievement.rarity, RARE_RARITY_THRESHOLD),
            )).get()?.count ?? 0;

        return { unlocked, rare };
    }

    static upsertAchievementProgress(ach: Achievement, rows: AchievementCalculationRow[], scopedUserId?: number): UnlockedAchievementToast[] {
        const db = getDbClient();
        const now = sql`datetime('now')`;

        const existingRows = db
            .select({
                userId: userAchievement.userId,
                completed: userAchievement.completed,
            }).from(userAchievement)
            .where(and(
                eq(userAchievement.achievementId, ach.id),
                scopedUserId !== undefined ? eq(userAchievement.userId, scopedUserId) : undefined,
            )).all();

        const seenUsers = new Set<number>();
        const newlyUnlocked: UnlockedAchievementToast[] = [];
        const existingByUser = new Map(existingRows.map((row) => [row.userId, row.completed]));

        for (const row of rows) {
            if (scopedUserId !== undefined && row.userId !== scopedUserId) continue;
            seenUsers.add(row.userId);

            // Permanent unlock: once earned, never overwrite completedAt, progress, or snapshot metadata.
            if (existingByUser.get(row.userId)) continue;

            const safeValue = Math.max(0, Number(row.value) || 0);

            const completed = safeValue >= ach.target;
            const metadata: AchievementMetadata = row.label ? { label: row.label } : null;
            const progress = completed ? 100 : Math.min(100, (safeValue * 100) / ach.target);

            db.insert(userAchievement)
                .values({
                    progress,
                    metadata,
                    completed,
                    count: safeValue,
                    userId: row.userId,
                    achievementId: ach.id,
                    lastCalculatedAt: now as unknown as string,
                    completedAt: completed ? (now as unknown as string) : null,
                }).onConflictDoUpdate({
                target: [userAchievement.userId, userAchievement.achievementId],
                set: {
                    lastCalculatedAt: excludedLastCalculated(),
                    completed: sql`CASE WHEN ${userAchievement.completed} = 1 THEN 1 ELSE excluded.completed END`,
                    count: sql`CASE WHEN ${userAchievement.completed} = 1 THEN ${userAchievement.count} ELSE excluded.count END`,
                    progress: sql`CASE WHEN ${userAchievement.completed} = 1 THEN ${userAchievement.progress} ELSE excluded.progress END`,
                    metadata: sql`CASE WHEN ${userAchievement.completed} = 1 THEN ${userAchievement.metadata} ELSE excluded.metadata END`,
                    completedAt: sql`CASE WHEN ${userAchievement.completed} = 1 THEN ${userAchievement.completedAt} ELSE excluded.completed_at END`,
                },
            }).run();

            if (completed) {
                newlyUnlocked.push(toUnlockedToast(ach, metadata));
            }
        }

        // Reset locked rows whose value dropped to 0 (no longer returned by calculation)
        const lockedToZero = existingRows
            .filter((row) => !row.completed && !seenUsers.has(row.userId))
            .map((row) => row.userId);

        if (lockedToZero.length > 0) {
            db.update(userAchievement)
                .set({
                    count: 0,
                    progress: 0,
                    metadata: null,
                    lastCalculatedAt: now as unknown as string,
                }).where(and(
                eq(userAchievement.achievementId, ach.id),
                eq(userAchievement.completed, false),
                inArray(userAchievement.userId, lockedToZero),
            )).run();
        }

        return newlyUnlocked;
    }

    static unlockEventAchievement(userId: number, ach: Achievement, metadata: AchievementMetadata = null): UnlockedAchievementToast | null {
        const db = getDbClient();

        const existing = db
            .select({ completed: userAchievement.completed })
            .from(userAchievement)
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.achievementId, ach.id)))
            .get();

        if (existing?.completed) return null;

        const now = sql`datetime('now')`;

        db.insert(userAchievement)
            .values({
                userId,
                metadata,
                progress: 100,
                completed: true,
                count: ach.target,
                achievementId: ach.id,
                completedAt: now as unknown as string,
                lastCalculatedAt: now as unknown as string,
            })
            .onConflictDoUpdate({
                target: [userAchievement.userId, userAchievement.achievementId],
                set: {
                    progress: 100,
                    completed: true,
                    count: ach.target,
                    lastCalculatedAt: excludedLastCalculated(),
                    metadata: sql`COALESCE(${userAchievement.metadata}, excluded.metadata)`,
                    completedAt: sql`COALESCE(${userAchievement.completedAt}, datetime('now'))`,
                },
            }).run();

        return toUnlockedToast(ach, metadata);
    }

    private static getEligibleRarityStats() {
        const db = getDbClient();
        const minTimeMinutes = timeRequiredForLevel(RARITY_MIN_LEVEL);

        const eligibleGlobalUsers = db
            .select({ userId: user.id })
            .from(user)
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, user.id),
                eq(userMediaSettings.active, true),
            )).where(eq(user.emailVerified, true))
            .groupBy(user.id)
            .having(sql`COALESCE(SUM(${userMediaSettings.timeSpent}), 0) >= ${minTimeMinutes}`)
            .as("eligible_global_users");

        const eligibleGlobalCount = db
            .select({ count: count() })
            .from(eligibleGlobalUsers)
            .get()?.count ?? 0;

        const eligibleUsersByMedia = new Map(
            db.select({
                count: count(),
                mediaType: userMediaSettings.mediaType,
            }).from(userMediaSettings)
                .innerJoin(user, eq(userMediaSettings.userId, user.id))
                .where(and(
                    eq(userMediaSettings.active, true),
                    gte(userMediaSettings.timeSpent, minTimeMinutes),
                    eq(user.emailVerified, true),
                )).groupBy(userMediaSettings.mediaType)
                .all()
                .map((row) => [row.mediaType, row.count]),
        );

        const unlockedByAchievement = new Map<number, number>();

        const globalCompletedRows = db
            .select({
                count: count(),
                achievementId: userAchievement.achievementId,
            }).from(userAchievement)
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(eligibleGlobalUsers, eq(userAchievement.userId, eligibleGlobalUsers.userId))
            .where(and(eq(userAchievement.completed, true), isNull(achievement.mediaType)))
            .groupBy(userAchievement.achievementId)
            .all();

        for (const row of globalCompletedRows) {
            unlockedByAchievement.set(row.achievementId, row.count);
        }

        const mediaCompletedRows = db
            .select({
                count: count(),
                achievementId: userAchievement.achievementId,
            }).from(userAchievement)
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .innerJoin(user, eq(userAchievement.userId, user.id))
            .innerJoin(userMediaSettings, and(
                eq(userMediaSettings.userId, userAchievement.userId),
                eq(userMediaSettings.mediaType, achievement.mediaType),
                eq(userMediaSettings.active, true),
                gte(userMediaSettings.timeSpent, minTimeMinutes),
            )).where(and(
                eq(userAchievement.completed, true),
                eq(user.emailVerified, true),
            )).groupBy(userAchievement.achievementId)
            .all();

        for (const row of mediaCompletedRows) {
            unlockedByAchievement.set(row.achievementId, row.count);
        }

        return { eligibleGlobalCount, eligibleUsersByMedia, unlockedByAchievement };
    }

    static calculateAllAchievementsRarity() {
        const db = getDbClient();

        const allAchievements = this.getAllAchievements();
        const { eligibleGlobalCount, eligibleUsersByMedia, unlockedByAchievement } = this.getEligibleRarityStats();

        for (const ach of allAchievements) {
            const eligibleUsers = ach.mediaType
                ? (eligibleUsersByMedia.get(ach.mediaType) ?? 0)
                : eligibleGlobalCount;

            if (eligibleUsers === 0) {
                db.update(achievement).set({ rarity: null }).where(eq(achievement.id, ach.id)).run();
                continue;
            }

            const completedCount = unlockedByAchievement.get(ach.id) ?? 0;
            const rarity = Math.min(100, Number(((100 * completedCount) / eligibleUsers).toFixed(2)));

            db.update(achievement)
                .set({ rarity })
                .where(eq(achievement.id, ach.id))
                .run();
        }
    }

    static getAdminAchievementsOverview(): AdminAchievementRow[] {
        const { eligibleGlobalCount, eligibleUsersByMedia, unlockedByAchievement } = this.getEligibleRarityStats();

        return this.getAllAchievements().map((ach) => ({
            ...ach,
            unlockedCount: unlockedByAchievement.get(ach.id) ?? 0,
            eligibleUsers: ach.mediaType ? (eligibleUsersByMedia.get(ach.mediaType) ?? 0) : eligibleGlobalCount,
        }));
    }

    static getRecentUnlockedAchievements(userId: number, since?: string, limit = 3): {
        totalNew: number;
        serverNow: string;
        items: UnlockedAchievementToast[];
    } {
        const db = getDbClient();

        const serverNow = db.get<{ now: string }>(sql`SELECT datetime('now') AS now`)!.now;
        if (!since) return { serverNow, totalNew: 0, items: [] };

        const activeMediaTypes = this.getActiveMediaTypesForUser(userId);
        const visibilityCondition = activeMediaTypes.length > 0
            ? or(isNull(achievement.mediaType), inArray(achievement.mediaType, activeMediaTypes))
            : isNull(achievement.mediaType);

        const rows = db
            .select({
                achievement,
                metadata: userAchievement.metadata,
                completedAt: userAchievement.completedAt,
            }).from(userAchievement)
            .innerJoin(achievement, eq(userAchievement.achievementId, achievement.id))
            .where(and(
                visibilityCondition,
                eq(userAchievement.userId, userId),
                eq(userAchievement.completed, true),
                gt(userAchievement.completedAt, since),
            )).all();

        const sorted = rows.sort((a, b) =>
            getRaritySortValue(a.achievement.rarity) - getRaritySortValue(b.achievement.rarity)
            || (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
        );

        return {
            serverNow,
            totalNew: sorted.length,
            items: sorted.slice(0, limit).map((row) => toUnlockedToast(row.achievement, row.metadata ?? null)),
        };
    }
}


function excludedLastCalculated() {
    return sql`excluded.last_calculated_at`;
}
