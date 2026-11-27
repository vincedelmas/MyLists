import {logger} from "@/lib/server/core/logger";
import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import type {MediaRegistry} from "@/lib/server/domain/media/media.registries";
import {PROFILE_MAX_PINNED_ACHIEVEMENTS} from "@/lib/types/profile-custom.types";
import {isRareAchievement, ULTRA_RARE_RARITY_THRESHOLD} from "@/lib/utils/achievements";
import {AchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {createAppAchievementCatalogs} from "@/lib/server/domain/achievements/app-achievements.catalog";
import type {
    Achievement,
    AchievementMetadata,
    ProfileAchievementsShowcase,
    UnlockedAchievementToast,
    UserAchievementItem,
} from "@/lib/types/achievements.types";


export class AchievementsService {
    private readonly catalogsByCategory: Map<AchievementCategory, AchievementCatalog>;

    constructor(
        private repository: typeof AchievementsRepository,
        mediaAchievementsRegistry: MediaRegistry<Record<MediaType, AchievementCatalog>>,
    ) {
        this.catalogsByCategory = new Map<AchievementCategory, AchievementCatalog>();

        for (const mediaType of Object.values(MediaType)) {
            const catalog = mediaAchievementsRegistry.get(mediaType);
            this.catalogsByCategory.set(catalog.category, catalog);
        }

        for (const catalog of createAppAchievementCatalogs()) {
            this.catalogsByCategory.set(catalog.category, catalog);
        }
    }

    // --- Seeding & Batch Calculation ------------------------------------------

    seedAllAchievements() {
        const definitions = [...this.catalogsByCategory.values()].flatMap((catalog) => catalog.definitions);
        withTransaction(() => {
            this.repository.seedAchievements(definitions);
        });
        return definitions.length;
    }

    getAllCatalogCategories(): AchievementCategory[] {
        return [...this.catalogsByCategory.keys()];
    }

    calculateCategory(category: AchievementCategory) {
        const catalog = this.catalogsByCategory.get(category);
        if (!catalog) return { processed: 0, total: 0 };

        const achievements = this.repository.getAchievementsByCategories([category]);
        let processed = 0;

        for (const ach of achievements) {
            if (!catalog.hasCalculation(ach.codeName)) continue;

            const rows = catalog.calculate(ach.codeName);
            if (!rows) continue;

            withTransaction(() => this.repository.upsertAchievementProgress(ach, rows));
            processed += 1;
        }

        return { processed, total: achievements.length };
    }

    calculateAllAchievementsRarity() {
        withTransaction(() => this.repository.calculateAllAchievementsRarity());
    }

    // --- Real-Time Single-User Evaluation & Event Unlocks ---------------------

    evaluateUserCategories(userId: number, categories: AchievementCategory[]): UnlockedAchievementToast[] {
        if (categories.length === 0) return [];

        try {
            const uniqueCategories = [...new Set(categories)];
            const achievements = this.repository.getAchievementsByCategories(uniqueCategories);
            if (achievements.length === 0) return [];

            const alreadyCompletedIds = this.repository.getUserCompletedAchievementIds(userId);
            const newlyUnlocked: UnlockedAchievementToast[] = [];

            withTransaction(() => {
                for (const ach of achievements) {
                    if (alreadyCompletedIds.has(ach.id)) continue;

                    const catalog = this.catalogsByCategory.get(ach.category);
                    if (!catalog || !catalog.hasCalculation(ach.codeName)) continue;

                    const rows = catalog.calculate(ach.codeName, userId);
                    if (!rows) continue;

                    const unlocked = this.repository.upsertAchievementProgress(ach, rows, userId);
                    newlyUnlocked.push(...unlocked);
                }
            });

            return newlyUnlocked;
        }
        catch (err) {
            logger.warn({ err, userId, categories }, "Failed to evaluate user achievements");
            return [];
        }
    }

    evaluateUserAll(userId: number): UnlockedAchievementToast[] {
        return this.evaluateUserCategories(userId, this.getAllCatalogCategories());
    }

    unlockEventAchievement(userId: number, codeName: string, metadata: AchievementMetadata = null): UnlockedAchievementToast | null {
        try {
            const ach = this.repository.getAchievementByCodeName(codeName);
            if (!ach) return null;

            return withTransaction(() => this.repository.unlockEventAchievement(userId, ach, metadata));
        }
        catch (err) {
            logger.warn({ err, userId, codeName }, "Failed to unlock event achievement");
            return null;
        }
    }

    // --- Queries & View Models ------------------------------------------------

    getAdminAchievementsOverview() {
        return this.repository.getAdminAchievementsOverview();
    }

    getProfileShowcase(userId: number, pinnedCodeNames: string[] = []): ProfileAchievementsShowcase {
        const allItems = this.repository.getUserAchievements(userId);
        const unlockedItems = this.repository.getUnlockedAchievementsForProfile(userId);
        const perfectCategories = computePerfectCategories(allItems);

        const unlockedByCode = new Map(unlockedItems.map((item) => [item.codeName, item]));
        const pinnedItems = pinnedCodeNames
            .map((code) => unlockedByCode.get(code))
            .filter((item): item is NonNullable<typeof item> => item !== undefined)
            .slice(0, PROFILE_MAX_PINNED_ACHIEVEMENTS);

        const rarestItems = [...unlockedItems]
            .sort((a, b) => (a.rarity ?? 100) - (b.rarity ?? 100) || b.completedAt.localeCompare(a.completedAt))
            .slice(0, PROFILE_MAX_PINNED_ACHIEVEMENTS);

        return {
            perfectCategories,
            totalAvailable: allItems.length,
            totalUnlocked: unlockedItems.length,
            recent: unlockedItems.slice(0, 3),
            mode: pinnedItems.length > 0 ? "pinned" : "rarest",
            items: pinnedItems.length > 0 ? pinnedItems : rarestItems,
            rareUnlocked: unlockedItems.filter((item) => isRareAchievement(item.rarity)).length,
        };
    }

    getUserAchievementsPageData(targetUserId: number, viewerUserId?: number, pinnedCodeNames: string[] = []) {
        const items = this.repository.getUserAchievements(targetUserId);
        const perfectCategories = computePerfectCategories(items);

        const unlocked = items.filter((item) => item.completed);
        const rareUnlocked = unlocked.filter((item) => isRareAchievement(item.rarity)).length;

        const ultraRareUnlocked = unlocked.filter((item) => item.rarity !== null && item.rarity > 0
            && item.rarity < ULTRA_RARE_RARITY_THRESHOLD).length;

        const rarestUnlocked = [...unlocked]
            .sort((a, b) => (a.rarity ?? 100) - (b.rarity ?? 100))[0] ?? null;

        const viewerProgressMap = viewerUserId && viewerUserId !== targetUserId
            ? this.repository.getUserProgressMap(viewerUserId)
            : null;

        const itemsWithComparison = items.map((item) => {
            const viewerEntry = viewerProgressMap?.get(item.id);
            return {
                ...item,
                viewerProgress: viewerProgressMap
                    ? {
                        completed: viewerEntry?.completed ?? false,
                        count: viewerEntry?.count ?? 0,
                        progress: viewerEntry?.progress ?? 0,
                        completedAt: viewerEntry?.completedAt ?? null,
                    }
                    : null,
            };
        });

        return {
            pinnedCodeNames,
            items: itemsWithComparison,
            summary: {
                rareUnlocked,
                ultraRareUnlocked,
                perfectCategories,
                totalAvailable: items.length,
                totalUnlocked: unlocked.length,
                completionPercent: items.length > 0 ? (unlocked.length / items.length) * 100 : 0,
                rarestUnlocked: rarestUnlocked
                    ? {
                        id: rarestUnlocked.id,
                        icon: rarestUnlocked.icon,
                        name: rarestUnlocked.name,
                        shape: rarestUnlocked.shape,
                        rarity: rarestUnlocked.rarity,
                        pattern: rarestUnlocked.pattern,
                        category: rarestUnlocked.category,
                    }
                    : null,
            },
        };
    }

    getAchievementCatalogMap(): ReadonlyMap<AchievementCategory, AchievementCatalog> {
        return this.catalogsByCategory;
    }

    getAllAchievements(): Achievement[] {
        return this.repository.getAllAchievements();
    }
}


function computePerfectCategories(items: UserAchievementItem[]): AchievementCategory[] {
    const countsByCategory = new Map<AchievementCategory, { total: number; unlocked: number }>();

    for (const item of items) {
        const current = countsByCategory.get(item.category) ?? { total: 0, unlocked: 0 };
        current.total += 1;

        if (item.completed) current.unlocked += 1;
        countsByCategory.set(item.category, current);
    }

    const perfected: AchievementCategory[] = [];
    for (const [category, stats] of countsByCategory.entries()) {
        if (stats.total > 0 && stats.unlocked === stats.total) {
            perfected.push(category);
        }
    }

    return perfected;
}
